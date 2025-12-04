// products-table.js
// Admin table for listing / editing / deleting products
// IMPORTANT: Works with backend product.js (server-side)

(function() {
  
  const CONFIG = window.EC_CONFIG || {};
  const BACKEND_BASE = (CONFIG.BACKEND_BASE || '').replace(/\/$/, '');
  const PRODUCTS_PATH = CONFIG.API_PRODUCTS_ENDPOINT || '/api/products';
  const PRODUCTS_URL = BACKEND_BASE ? BACKEND_BASE + PRODUCTS_PATH : PRODUCTS_PATH;
  
  const ADMIN_HEADER_KEY = 'ehs_admin_header_v1';
  const DEFAULT_ADMIN_SECRET = 'mySuperAdmin4090';
  
  /* Helpers */
  const $ = s => document.querySelector(s);
  const $all = s => Array.from(document.querySelectorAll(s));
  
  const toast = (msg, kind = 'info') => {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '18px';
    el.style.bottom = '18px';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.zIndex = 9999;
    el.style.background = kind === 'error' ? '#ff6b6b' : '#57e39b';
    el.style.color = '#021217';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };
  
  const escapeHtml = s =>
    (s || '').toString().replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } [m])
    );
  
  const formatCurrency = n =>
    '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  
  /* ==========================
       FETCH PRODUCTS
     ========================== */
  async function fetchProducts() {
    try {
      const res = await fetch(PRODUCTS_URL);
      if (!res.ok) throw new Error("Server error: " + res.status);
      
      const json = await res.json();
      
      // Accept both formats: {products:[...]} or [...]
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.products)) return json.products;
      
      return [];
    } catch (err) {
      console.error("fetchProducts error →", err);
      toast("Could not load products (check console)", "error");
      return [];
    }
  }
  
  /* ==========================
       BUILD TABLE
     ========================== */
  function buildTable(products) {
    const container = $('#productsTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!products.length) {
      container.innerHTML = '<div class="muted">No products yet</div>';
      return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.style.overflowX = 'auto'; // Mobile fix
    
    const table = document.createElement('table');
    table.className = 'products-table';
    
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
    
    const tbody = document.createElement('tbody');
    
    products.forEach(p => {
      const tr = document.createElement('tr');
      
      const tags = (p.tags || [])
        .map(t => `<span class="muted tag-inline">${escapeHtml(t)}</span>`)
        .join(' ');
      
      tr.innerHTML = `
        <td>
          <img src="${escapeHtml(p.thumbnail || '')}"
               style="width:84px;height:54px;object-fit:cover;border-radius:6px"
               alt="${escapeHtml(p.title)}">
        </td>
        <td>${escapeHtml(p.title || '')}</td>
        <td>${escapeHtml(p.category || '')}</td>
        <td>${tags}</td>
        <td>${formatCurrency(p.price)}</td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
        <td>
          <button class="btn small" data-action="edit" data-id="${escapeHtml(p.id)}">Edit</button>
          <button class="btn small ghost" data-action="delete" data-id="${escapeHtml(p.id)}">Delete</button>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
    
    // ACTIONS
    container.querySelectorAll('[data-action="edit"]').forEach(b =>
      b.addEventListener('click', () => openEditPrompt(b.dataset.id))
    );
    
    container.querySelectorAll('[data-action="delete"]').forEach(b =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        const ok = await deleteProduct(b.dataset.id);
        if (ok) {
          toast('Deleted');
          loadAndRender();
        }
      })
    );
  }
  
  /* ==========================
       EDIT PRODUCT
     ========================== */
  async function openEditPrompt(id) {
    try {
      const url = BACKEND_BASE + '/api/products/' + id;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      
      const json = await res.json();
      const p = json.product || json;
      if (!p) return alert("Unable to load product data");
      
      const newTitle = prompt("Title", p.title) || p.title;
      const newPrice = Number(prompt("Price (₹)", p.price) || p.price);
      const newCategory = prompt("Category", p.category) || p.category;
      const newDesc = prompt("Description", p.description || '') || p.description;
      
      const payload = {
        title: newTitle,
        price: newPrice,
        category: newCategory,
        description: newDesc
      };
      
      const updateRes = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_ADMIN_SECRET
        },
        body: JSON.stringify(payload)
      });
      
      const updateJson = await updateRes.json();
      
      if (!updateRes.ok) {
        alert('Update failed: ' + (updateJson.error || JSON.stringify(updateJson)));
        return;
      }
      
      toast('Updated successfully');
      loadAndRender();
      
    } catch (err) {
      console.error("edit error →", err);
      alert("Error updating the product (see console)");
    }
  }
  
  /* ==========================
       DELETE PRODUCT
     ========================== */
  async function deleteProduct(id) {
    try {
      const url = BACKEND_BASE + '/api/products/' + id;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-admin-secret': localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_ADMIN_SECRET
        }
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        alert('Delete failed: ' + (json.error || JSON.stringify(json)));
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("delete error →", err);
      alert("Server error while deleting");
      return false;
    }
  }
  
  /* ==========================
       INITIAL LOADER
     ========================== */
  async function loadAndRender() {
    const target = $('#productsTable');
    if (!target) return;
    target.innerHTML = 'Loading...';
    
    const list = await fetchProducts();
    buildTable(list);
  }
  
  // Expose for refresh button
  window.reloadProductsTable = loadAndRender;
  
  document.addEventListener('DOMContentLoaded', () => {
    if ($('#productsTable')) loadAndRender();
  });
  
})();