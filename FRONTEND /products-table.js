// products-table.js
// Admin Product Management (List, Edit, Delete)

(function() {
  
  const CONFIG = window.EC_CONFIG || {};
  const BACKEND_BASE = (CONFIG.BACKEND_BASE || "").replace(/\/$/, "");
  const PRODUCTS_PATH = CONFIG.API_PRODUCTS_ENDPOINT || "/api/products";
  const PRODUCTS_URL = BACKEND_BASE ? BACKEND_BASE + PRODUCTS_PATH : PRODUCTS_PATH;
  
  const ADMIN_HEADER_KEY = "ehs_admin_header_v1";
  const DEFAULT_ADMIN_SECRET = "mySuperAdmin4090";
  
  /* ------------------
     HELPERS
  -------------------*/
  const $ = s => document.querySelector(s);
  
  const toast = (msg, kind = "info") => {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = `
      position:fixed;right:18px;bottom:18px;padding:10px 14px;
      border-radius:8px;z-index:9999;
      background:${kind === "error" ? "#ff6b6b" : "#57e39b"};
      color:#021217;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };
  
  const escapeHtml = s =>
    (s || "").toString().replace(/[&<>"']/g, m =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } [m])
    );
  
  const formatCurrency = n =>
    "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  
  /* ------------------
     FETCH PRODUCTS
  -------------------*/
  async function fetchProducts() {
    try {
      const res = await fetch(PRODUCTS_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.products)) return json.products;
      
      return [];
    } catch (err) {
      console.error("fetchProducts →", err);
      toast("Error loading products", "error");
      return [];
    }
  }
  
  /* ------------------
     BUILD TABLE
  -------------------*/
  function buildTable(products) {
    const container = $("#productsTable");
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!products.length) {
      container.innerHTML = '<div class="muted">No products yet</div>';
      return;
    }
    
    const wrap = document.createElement("div");
    wrap.style.overflowX = "auto";
    
    const table = document.createElement("table");
    table.className = "products-table";
    
    table.innerHTML = `
      <thead>
        <tr>
          <th>Thumb</th>
          <th>Title</th>
          <th>Category</th>
          <th>Tags</th>
          <th>Price</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
    `;
    
    const tbody = document.createElement("tbody");
    
    products.forEach(p => {
      const tr = document.createElement("tr");
      
      const tags = (p.tags || [])
        .map(t => `<span class="muted tag-inline">${escapeHtml(t)}</span>`)
        .join(" ");
      
      tr.innerHTML = `
        <td>
          <img src="${escapeHtml(p.thumbnail || "")}"
               style="width:84px;height:54px;object-fit:cover;border-radius:6px"
               alt="${escapeHtml(p.title)}">
        </td>
        <td>${escapeHtml(p.title || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>${tags}</td>
        <td>${formatCurrency(p.price)}</td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
        <td>
          <button class="btn small" data-action="edit" data-id="${escapeHtml(p.id)}">Edit</button>
          <button class="btn small ghost" data-action="delete" data-id="${escapeHtml(p.id)}">Delete</button>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
    
    // Edit buttons
    container.querySelectorAll("[data-action='edit']").forEach(btn =>
      btn.addEventListener("click", () => openEditPrompt(btn.dataset.id))
    );
    
    // Delete buttons
    container.querySelectorAll("[data-action='delete']").forEach(btn =>
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this product?")) return;
        const ok = await deleteProduct(btn.dataset.id);
        if (ok) {
          toast("Deleted");
          loadAndRender();
        }
      })
    );
  }
  
  /* ------------------
     EDIT PRODUCT
  -------------------*/
  async function openEditPrompt(id) {
    try {
      const url = BACKEND_BASE + "/api/products/" + id;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed initial fetch");
      
      const json = await res.json();
      const p = json.product || json;
      if (!p) return alert("Unable to load product");
      
      function ask(label, old) {
        const v = prompt(label, old);
        if (v === null) return old; // Cancel → keep old
        if (v.trim() === "") return old; // Empty → keep old
        return v;
      }
      
      const newTitle = ask("Title", p.title);
      const newPrice = Number(ask("Price (₹)", p.price));
      const newCategory = ask("Category", p.category);
      const newDesc = ask("Description", p.description || "");
      
      const payload = {
        title: newTitle,
        price: newPrice,
        category: newCategory,
        description: newDesc
      };
      
      let updateJson = null;
      let updateRes = null;
      
      try {
        updateRes = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_ADMIN_SECRET
          },
          body: JSON.stringify(payload)
        });
        updateJson = await updateRes.json().catch(() => ({}));
      } catch (e) {
        toast("Server error updating item", "error");
        return;
      }
      
      if (!updateRes.ok) {
        alert("Update failed: " + (updateJson.error || "Unknown error"));
        return;
      }
      
      toast("Updated successfully");
      loadAndRender();
      
    } catch (err) {
      console.error("edit error →", err);
      alert("Error updating the product (see console)");
    }
  }
  
  /* ------------------
     DELETE PRODUCT
  -------------------*/
  async function deleteProduct(id) {
    try {
      const url = BACKEND_BASE + "/api/products/" + id;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "x-admin-secret": localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_ADMIN_SECRET
        }
      });
      
      let json = {};
      try { json = await res.json(); } catch (e) {}
      
      if (!res.ok) {
        alert("Delete failed: " + (json.error || "Unknown error"));
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("delete error →", err);
      alert("Server error while deleting");
      return false;
    }
  }
  
  /* ------------------
     INITIAL LOAD
  -------------------*/
  async function loadAndRender() {
    const target = $("#productsTable");
    if (!target) return;
    
    target.innerHTML = "Loading...";
    const list = await fetchProducts();
    buildTable(list);
  }
  
  window.reloadProductsTable = loadAndRender;
  
  document.addEventListener("DOMContentLoaded", () => {
    if ($("#productsTable")) loadAndRender();
  });
  
})();