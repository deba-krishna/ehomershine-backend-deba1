// admin.js
// Update these two values before use:
const ADMIN_PASSWORD = "debaadmin4090";         // UI password (client-side convenience)
const BACKEND_UPLOAD_URL = "http://localhost:3000/api/upload"; // your backend upload endpoint
const X_ADMIN_SECRET = "mySuperAdmin4090"; // this header is required by backend

// ---- helpers ----
const $ = sel => document.querySelector(sel);
const $all = sel => Array.from(document.querySelectorAll(sel));

/* ---------- AUTH ---------- */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

function showLogin() {
  loginOverlay.style.display = 'flex';
}
function hideLogin() {
  loginOverlay.style.display = 'none';
}

loginBtn.addEventListener('click', () => {
  const val = document.getElementById('adminPassword').value.trim();
  if (val === ADMIN_PASSWORD) {
    hideLogin();
    initOnce();
  } else {
    loginError.textContent = 'Incorrect password';
    setTimeout(()=> loginError.textContent = '', 2500);
  }
});

// show overlay on load
showLogin();

/* ---------- UI: Navigation ---------- */
$all('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $all('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');
    const panel = btn.dataset.panel;
    $all('.panel').forEach(p => p.hidden = (p.dataset.panel !== panel));
  });
});

/* ---------- DROPZONE + FILES ---------- */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const clearBtn = document.getElementById('clearFiles');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');

let stagedFiles = []; // {file, base64, name, size, type}

function formatSize(n){ if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/(1024*1024)).toFixed(2)+' MB'; }

function renderFiles(){
  filePreview.innerHTML = '';
  if(!stagedFiles.length){
    filePreview.innerHTML = '<div class="muted">No files selected</div>';
    return;
  }
  stagedFiles.forEach((f, idx) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <div class="file-thumb">${getFileIcon(f.name)}</div>
      <div class="file-meta">
        <div class="name">${escapeHtml(f.name)}</div>
        <div class="sub">${formatSize(f.size)} • ${f.type || 'file'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn ghost remove" data-idx="${idx}">Remove</button>
      </div>
    `;
    filePreview.appendChild(el);
  });

  // remove handlers
  $all('.remove').forEach(b => b.addEventListener('click', e => {
    const i = Number(e.currentTarget.dataset.idx);
    stagedFiles.splice(i,1);
    renderFiles();
  }));
}

function getFileIcon(name){
  const ext = (name.split('.').pop() || '').toLowerCase();
  if(['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
  if(['zip','rar'].includes(ext)) return '🗜️';
  if(['mp4','mov','webm'].includes(ext)) return '🎞️';
  if(['html','htm'].includes(ext)) return '🌐';
  if(['svg'].includes(ext)) return '🔷';
  return '📄';
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

/* drag/drop */
['dragenter','dragover'].forEach(ev => {
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
});
['dragleave','drop'].forEach(ev => {
  dropzone.addEventListener(ev, (e) => { dropzone.classList.remove('dragover'); });
});
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files || []);
  handleFiles(files);
});

/* file input */
fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));

/* handle files */
async function handleFiles(files){
  for(const file of files){
    // simple size cap 60MB per file
    if(file.size > 60*1024*1024){
      alert('File too large: '+file.name);
      continue;
    }
    const base64 = await toBase64(file);
    stagedFiles.push({ file, base64: base64.split(',')[1], name: file.name, size: file.size, type: file.type });
  }
  renderFiles();
}

/* clear */
clearBtn.addEventListener('click', () => {
  stagedFiles = [];
  renderFiles();
});

/* convert */
function toBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- UPLOAD ---------- */
uploadBtn.addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const price = Number(document.getElementById('price').value);
  const old_price = Number(document.getElementById('oldPrice').value) || null;
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();

  if(!title || !price || !category || stagedFiles.length===0){
    uploadStatus.textContent = 'Please fill required fields and add files.';
    return;
  }

  uploadStatus.textContent = 'Preparing files...';
  uploadBtn.disabled = true;

  const payloadFiles = stagedFiles.map(f => ({ filename: f.name, base64: f.base64 }));

  const payload = { title, price, old_price, category, description, files: payloadFiles };

  try {
    const res = await fetch(BACKEND_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': X_ADMIN_SECRET
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data && data.success){
      uploadStatus.innerHTML = '<span style="color:var(--success)">Product uploaded ✓</span>';
      // add to recent
      prependRecent(data.product);
      stagedFiles = [];
      renderFiles();
    } else {
      uploadStatus.innerHTML = '<span style="color:var(--danger)">Upload failed: '+(data.error||'Unknown')+'</span>';
    }
  } catch(err){
    console.error(err);
    uploadStatus.innerHTML = '<span style="color:var(--danger)">Server error</span>';
  } finally {
    uploadBtn.disabled = false;
    setTimeout(()=> uploadStatus.textContent = '', 6000);
  }
});

/* recent list manip */
function prependRecent(product){
  const recentList = document.getElementById('recentList');
  const d = document.createElement('div');
  d.className = 'recent-item';
  d.innerHTML = `<strong>${escapeHtml(product.title||'Untitled')}</strong><div class="muted code">${product.id || ''}</div>`;
  recentList.prepend(d);
}

/* init once after login */
let inited = false;
function initOnce(){
  if(inited) return;
  inited = true;
  renderFiles();
  // optionally fetch recent products from backend (if you implement /api/products)
  // fetchRecent();
}

/* leftover utilities */
document.getElementById('logoutBtn').addEventListener('click', () => {
  showLogin();
  // clear session if any
});

/* quickSearch (placeholder) */
document.getElementById('quickSearch').addEventListener('input', (e) => {
  // implement search later connecting to /api/products
});
/* --------- PRODUCTS TABLE: fetch / render / edit / delete --------- */

const PRODUCTS_API = BACKEND_UPLOAD_URL.replace('/upload', '') + '/products';
// If BACKEND_UPLOAD_URL == http://localhost:3000/api/upload -> PRODUCTS_API -> http://localhost:3000/api/products

async function fetchProducts() {
  try {
    const res = await fetch(PRODUCTS_API);
    const json = await res.json();
    if (json && json.success) return json.products;
    console.warn('Products fetch error', json);
    return [];
  } catch (err) {
    console.error('Fetch products failed', err);
    return [];
  }
}

async function renderProductsTable() {
  const panel = document.getElementById('panel-products');
  const target = document.getElementById('productsTable');
  target.innerHTML = 'Loading...';
  const products = await fetchProducts();
  if (!products.length) {
    target.innerHTML = '<div class="muted">No products yet</div>';
    return;
  }
  
  // Build table
  const table = document.createElement('table');
  table.className = 'products-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Thumbnail</th><th>Title</th><th>Category</th><th>Price</th><th>Created</th><th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.thumbnail || ''}" style="width:80px;height:50px;object-fit:cover;border-radius:6px"></td>
      <td>${escapeHtml(p.title || '')}</td>
      <td>${escapeHtml(p.category || '')}</td>
      <td>₹${Number(p.price||0).toLocaleString('en-IN')}</td>
      <td>${p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
      <td>
        <button class="btn small" data-id="${p.id}" data-action="edit">Edit</button>
        <button class="btn small ghost" data-id="${p.id}" data-action="delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  target.innerHTML = '';
  target.appendChild(table);
  
  // Attach actions
  target.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      openEditProduct(id);
    });
  });
  target.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      if (!confirm('Delete this product? This will remove it from DB and attempt to delete storage files.')) return;
      await deleteProduct(id);
      await renderProductsTable();
    });
  });
}

/* Edit product - opens a prompt modal (simple) */
async function openEditProduct(id) {
  // fetch latest product
  const res = await fetch(PRODUCTS_API + '/' + id);
  const json = await res.json();
  if (!json || !json.success) { alert('Could not load product'); return; }
  const p = json.product;
  // Simple prompt-based editor (quick)
  const newTitle = prompt('Title', p.title) || p.title;
  const newPrice = prompt('Price (₹)', p.price) || p.price;
  const newCategory = prompt('Category', p.category) || p.category;
  const newDesc = prompt('Description', p.description || '') || p.description;
  
  const payload = { title: newTitle, price: Number(newPrice), category: newCategory, description: newDesc };
  const updRes = await fetch(PRODUCTS_API + '/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': X_ADMIN_SECRET },
    body: JSON.stringify(payload)
  });
  const updJson = await updRes.json();
  if (updJson && updJson.success) {
    alert('Updated');
    await renderProductsTable();
  } else {
    alert('Update failed: ' + (updJson.error || 'Unknown'));
  }
}

async function deleteProduct(id) {
  try {
    const res = await fetch(PRODUCTS_API + '/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-secret': X_ADMIN_SECRET }
    });
    const json = await res.json();
    if (json && json.success) {
      return true;
    } else {
      alert('Delete failed: ' + (json.error || 'Unknown'));
      return false;
    }
  } catch (err) {
    console.error('Delete error', err);
    alert('Server error while deleting');
    return false;
  }
}

/* Hook: when Products panel becomes visible, render table */
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', async (e) => {
    const panel = n.dataset.panel;
    if (panel === 'products') {
      // render products table
      await renderProductsTable();
      // show panel is handled by nav code
    }
  });
});