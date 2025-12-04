/* ============================================================
   eHomerShine Admin Panel — FINAL VERSION (Responsive + Stable)
   ============================================================ */

const BACKEND_BASE_DEFAULT = "https://ehomershine-backend-deba1-13.onrender.com";
const BACKEND_BASE_KEY = "ehs_backend_base_v1";
const ADMIN_HEADER_KEY = "ehs_admin_header_v1";

const BACKEND_BASE = localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT;

const UPLOAD_ENDPOINT = BACKEND_BASE + "/api/upload";
const PRODUCTS_ENDPOINT = BACKEND_BASE + "/api/products";

const DEFAULT_X_ADMIN_SECRET = "mySuperAdmin4090";
const X_ADMIN_SECRET = localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_X_ADMIN_SECRET;

const ADMIN_PASSWORD_CLIENT = "debaadmin4090"; // Frontend-only password


/* ============================
   HELPERS
============================ */
const $ = s => document.querySelector(s);
const $all = s => Array.from(document.querySelectorAll(s));

const toast = (msg, kind = "info") => {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.right = "18px";
  el.style.bottom = "18px";
  el.style.padding = "10px 14px";
  el.style.borderRadius = "10px";
  el.style.zIndex = "9999";
  el.style.background = kind === "error" ? "#ff6b6b" : "#57e39b";
  el.style.color = "#021217";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};


/* ============================
   LOGIN SYSTEM
============================ */
const loginOverlay = $("#loginOverlay");
const loginBtn = $("#loginBtn");
const loginError = $("#loginError");
const adminPassInput = $("#adminPassword");

function showLogin() {
  loginOverlay.style.display = "flex";
}
function hideLogin() {
  loginOverlay.style.display = "none";
}

loginBtn.addEventListener("click", () => {
  const v = adminPassInput.value.trim();
  if (v === ADMIN_PASSWORD_CLIENT) {
    hideLogin();
    initOnce();
  } else {
    loginError.textContent = "Incorrect password";
    setTimeout(() => (loginError.textContent = ""), 2500);
  }
});

showLogin();


/* ============================
    NAVIGATION
============================ */
$all(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    $all(".nav-item").forEach(n => n.classList.remove("active"));
    btn.classList.add("active");

    const panel = btn.dataset.panel;

    $all(".panel").forEach(p => {
      p.hidden = p.dataset.panel !== panel;
    });

    if (panel === "products") renderProductsTable();
  });
});


/* ============================
   THEME TOGGLE
============================ */
$("#themeToggle")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("light-theme");
});


/* ============================
   FILE UPLOAD + DROPZONE
============================ */
const dropzone = $("#dropzone");
const fileInput = $("#fileInput");
const filePreview = $("#filePreview");
const clearBtn = $("#clearFiles");
const uploadBtn = $("#uploadBtn");
const uploadStatus = $("#uploadStatus");
const recentList = $("#recentList");

let stagedFiles = []; // { file, base64, name, size, type, progress }

function formatSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  if (["zip", "rar"].includes(ext)) return "🗜️";
  if (["mp4", "mov", "webm"].includes(ext)) return "🎞️";
  if (["html", "htm"].includes(ext)) return "🌐";
  return "📄";
}

function renderFiles() {
  if (!filePreview) return;

  filePreview.innerHTML = "";

  if (!stagedFiles.length) {
    filePreview.innerHTML = `<div class="muted">No files selected</div>`;
    return;
  }

  stagedFiles.forEach((f, i) => {
    const el = document.createElement("div");
    el.className = "file-item";
    el.innerHTML = `
      <div class="file-thumb">${getFileIcon(f.name)}</div>
      <div class="file-meta">
        <div class="name">${escapeHtml(f.name)}</div>
        <div class="sub">${formatSize(f.size)} • ${f.type}</div>
        <div class="progress"><i style="width:${f.progress || 0}%"></i></div>
      </div>
      <button class="btn ghost remove" data-idx="${i}">Remove</button>
    `;
    filePreview.appendChild(el);
  });

  $all(".remove").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = Number(e.target.dataset.idx);
      stagedFiles.splice(i, 1);
      renderFiles();
    });
  });
}

async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  for (const file of files) {
    if (file.size > 200 * 1024 * 1024) {
      toast("File too large: " + file.name, "error");
      continue;
    }

    const base64 = await toBase64(file);
    stagedFiles.push({
      file,
      base64: base64.split(",")[1],
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0
    });
  }
  renderFiles();
}

/* Drag & drop */
if (dropzone) {
  ["dragenter", "dragover"].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(ev => {
    dropzone.addEventListener(ev, () => dropzone.classList.remove("dragover"));
  });

  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  });
}

fileInput.addEventListener("change", e => {
  handleFiles(Array.from(e.target.files));
});

clearBtn.addEventListener("click", () => {
  stagedFiles = [];
  renderFiles();
});


/* ============================
   UPLOAD PRODUCT
============================ */
uploadBtn.addEventListener("click", async () => {
  const title = $("#title")?.value.trim();
  const price = Number($("#price")?.value || 0);
  const old_price = $("#oldPrice")?.value ? Number($("#oldPrice").value) : null;
  const category = $("#category")?.value;
  const description = $("#description")?.value.trim();

  if (!title || !price || !category || stagedFiles.length === 0) {
    uploadStatus.textContent = "Please fill required fields and add files.";
    return;
  }

  uploadStatus.textContent = "Uploading...";
  uploadBtn.disabled = true;

  const payload = {
    title,
    price,
    old_price,
    category,
    description,
    files: stagedFiles.map(f => ({
      filename: f.name,
      base64: f.base64
    }))
  };

  try {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", UPLOAD_ENDPOINT, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("x-admin-secret", X_ADMIN_SECRET);

    xhr.upload.onprogress = ev => {
      if (ev.lengthComputable) {
        const percent = Math.round((ev.loaded / ev.total) * 100);
        uploadStatus.textContent = `Uploading ${percent}%`;

        stagedFiles.forEach((sf, idx) => {
          sf.progress = Math.min(100, percent + idx * 4);
        });

        renderFiles();
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        uploadBtn.disabled = false;

        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);

          if (res.success) {
            uploadStatus.innerHTML = `<span style="color:#57e39b">Product uploaded ✓</span>`;
            prependRecent(res.product);
            stagedFiles = [];
            renderFiles();
          } else {
            uploadStatus.innerHTML = `<span style="color:#ff6b6b">${res.error}</span>`;
          }
        } else {
          uploadStatus.innerHTML = `<span style="color:#ff6b6b">Server error: ${xhr.status}</span>`;
        }

        setTimeout(() => (uploadStatus.textContent = ""), 4000);
      }
    };

    xhr.send(JSON.stringify(payload));
  } catch (err) {
    uploadStatus.textContent = "Server error";
    uploadBtn.disabled = false;
  }
});


function prependRecent(product) {
  if (!product) return;

  const el = document.createElement("div");
  el.className = "recent-item";
  el.innerHTML = `<strong>${escapeHtml(product.title)}</strong>
                  <div class="muted code">${product.id}</div>`;
  recentList.prepend(el);
}


/* ============================
   SETTINGS SAVE
============================ */
$("#saveSettings").addEventListener("click", () => {
  const base = $("#backendBase").value.trim();
  const header = $("#adminHeaderVal").value.trim();

  if (base) localStorage.setItem(BACKEND_BASE_KEY, base);
  if (header) localStorage.setItem(ADMIN_HEADER_KEY, header);

  toast("Settings saved.");
});


/* ============================
   FETCH PRODUCTS
============================ */
async function fetchProducts() {
  try {
    const res = await fetch(PRODUCTS_ENDPOINT);
    const json = await res.json();
    return json.products || [];
  } catch (e) {
    return [];
  }
}


/* ============================
   RENDER PRODUCTS TABLE
============================ */
async function renderProductsTable() {
  const target = $("#productsTable");
  if (!target) return;

  target.innerHTML = "Loading...";

  const list = await fetchProducts();

  if (!list.length) {
    target.innerHTML = `<div class="muted">No products found</div>`;
    return;
  }

  const table = document.createElement("table");
  table.className = "products-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Thumb</th>
        <th>Title</th>
        <th>Category</th>
        <th>Price</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");

  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${p.thumbnail}" style="width:80px;height:50px;object-fit:cover;border-radius:6px"></td>
      <td>${escapeHtml(p.title)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>₹${Number(p.price).toLocaleString("en-IN")}</td>
      <td>${p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
      <td>
        <button class="btn small" data-id="${p.id}" data-action="edit">Edit</button>
        <button class="btn small ghost" data-id="${p.id}" data-action="delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  target.innerHTML = "";
  target.appendChild(table);

  // Edit
  target.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener("click", () => openEditPrompt(btn.dataset.id));
  });

  // Delete
  target.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this product?")) return;
      await deleteProduct(btn.dataset.id);
      renderProductsTable();
    });
  });
}


/* ============================
   EDIT PRODUCT
============================ */
async function openEditPrompt(id) {
  try {
    const res = await fetch(`${PRODUCTS_ENDPOINT}/${id}`);
    const json = await res.json();
    const p = json.product;
    if (!p) return alert("Unable to load product");

    const newTitle = prompt("Title", p.title) || p.title;
    const newPrice = Number(prompt("Price", p.price)) || p.price;
    const newCat = prompt("Category", p.category) || p.category;
    const newDesc = prompt("Description", p.description) || p.description;

    const body = { title: newTitle, price: newPrice, category: newCat, description: newDesc };

    const upd = await fetch(`${PRODUCTS_ENDPOINT}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": X_ADMIN_SECRET
      },
      body: JSON.stringify(body)
    });

    const updJson = await upd.json();

    if (!upd.ok) return alert("Failed: " + updJson.error);

    toast("Product updated");
    renderProductsTable();
  } catch (e) {
    alert("Server error");
  }
}


/* ============================
   DELETE PRODUCT
============================ */
async function deleteProduct(id) {
  try {
    const res = await fetch(`${PRODUCTS_ENDPOINT}/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": X_ADMIN_SECRET }
    });
    const json = await res.json();

    if (!res.ok) {
      alert("Delete failed: " + json.error);
      return false;
    }

    toast("Deleted");
    return true;
  } catch (e) {
    alert("Server error");
    return false;
  }
}


/* ============================
   LOGOUT
============================ */
$("#logoutBtn").addEventListener("click", showLogin);


/* ============================
   INIT
============================ */
function initOnce() {
  $("#backendBase").value = BACKEND_BASE;
  $("#adminHeaderVal").value = X_ADMIN_SECRET;
  renderFiles();
}