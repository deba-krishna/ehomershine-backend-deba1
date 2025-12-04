// admin.js (improved) - Overwrite your existing file with this
// IMPORTANT: Do NOT store any Supabase service_role key here. Client-side convenience password is OK.

const BACKEND_BASE_DEFAULT = "https://ehomershine-backend-deba1-11.onrender.com";
const BACKEND_BASE_KEY = "ehs_backend_base_v1";
const ADMIN_HEADER_KEY = "ehs_admin_header_v1";
const BACKEND_BASE = localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT;
const UPLOAD_ENDPOINT = BACKEND_BASE + "/api/upload";
const PRODUCTS_ENDPOINT = BACKEND_BASE + "/api/products";
const DEFAULT_X_ADMIN_SECRET = "mySuperAdmin4090";
const X_ADMIN_SECRET = localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_X_ADMIN_SECRET;
const ADMIN_PASSWORD_CLIENT = "debaadmin4090"; // client-side convenience password

/* helpers */
const $ = s => document.querySelector(s);
const $all = s => Array.from(document.querySelectorAll(s));
const toast = (msg, kind='info') => {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px';
  el.style.padding='10px 14px'; el.style.borderRadius='10px'; el.style.zIndex=9999;
  el.style.background = (kind==='error')? '#ff6b6b' : '#00d0ff';
  el.style.color = '#021217';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 3500);
};

/* AUTH */
const loginOverlay = $('#loginOverlay');
const loginBtn = $('#loginBtn');
const adminPassInput = $('#adminPassword');
const loginError = $('#loginError');

function showLogin(){ if(loginOverlay) loginOverlay.style.display='flex' }
function hideLogin(){ if(loginOverlay) loginOverlay.style.display='none' }

loginBtn?.addEventListener('click', () => {
  const val = adminPassInput.value.trim();
  if(val === ADMIN_PASSWORD_CLIENT){
    hideLogin();
    initOnce();
  } else {
    if(loginError) loginError.textContent = 'Incorrect password';
    setTimeout(()=> loginError.textContent = '', 2500);
  }
});
showLogin();

/* NAV */
$all('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $all('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');
    const panel = btn.dataset.panel;
    $all('.panel').forEach(p => p.hidden = (p.dataset.panel !== panel));
    if(panel === 'products') renderProductsTable();
  });
});

/* THEME */
$('#themeToggle')?.addEventListener('click', () => {
  document.documentElement.classList.toggle('light-theme');
});

/* DROPZONE + FILES */
const dropzone = $('#dropzone');
const fileInput = $('#fileInput');
const filePreview = $('#filePreview');
const clearBtn = $('#clearFiles');
const uploadBtn = $('#uploadBtn');
const uploadStatus = $('#uploadStatus');
const recentList = $('#recentList');

let stagedFiles = []; // { file, base64, name, size, type }

function formatSize(n){ if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/(1024*1024)).toFixed(2)+' MB'; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

function renderFiles(){
  if(!filePreview) return;
  filePreview.innerHTML = '';
  if(!stagedFiles.length){
    filePreview.innerHTML = '<div class="muted">No files selected</div>';
    return;
  }
  stagedFiles.forEach((f,i) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <div class="file-thumb">${getFileIcon(f.name)}</div>
      <div class="file-meta">
        <div class="name">${escapeHtml(f.name)}</div>
        <div class="sub">${formatSize(f.size)} • ${f.type || 'file'}</div>
        <div class="progress" aria-hidden="true"><i style="width:${f.progress||0}%"></i></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn ghost remove" data-idx="${i}">Remove</button>
      </div>
    `;
    filePreview.appendChild(el);
  });
  $all('.remove').forEach(b => b.addEventListener('click', e => {
    const i = Number(e.currentTarget.dataset.idx);
    stagedFiles.splice(i,1); renderFiles();
  }));
}

function getFileIcon(name){
  const ext = (name.split('.').pop()||'').toLowerCase();
  if(['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
  if(['zip','rar'].includes(ext)) return '🗜️';
  if(['mp4','mov','webm'].includes(ext)) return '🎞️';
  if(['html','htm'].includes(ext)) return '🌐';
  return '📄';
}

if(dropzone){
  ['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => { dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    handleFiles(files);
  });
}
fileInput?.addEventListener('change', e => handleFiles(Array.from(e.target.files || [])));
clearBtn?.addEventListener('click', () => { stagedFiles=[]; renderFiles(); });

async function handleFiles(files){
  for(const file of files){
    if(file.size > 200*1024*1024){ toast('File too large: '+file.name,'error'); continue; }
    const base64 = await toBase64(file);
    stagedFiles.push({ file, base64: base64.split(',')[1], name: file.name, size: file.size, type: file.type, progress:0 });
  }
  renderFiles();
}
function toBase64(file){ return new Promise((res, rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

/* UPLOAD - uses XHR to support progress updates (per-file simulated) */
uploadBtn?.addEventListener('click', async () => {
  const title = $('#title')?.value?.trim();
  const price = Number($('#price')?.value || 0);
  const old_price = $('#oldPrice')?.value ? Number($('#oldPrice').value) : null;
  const category = $('#category')?.value;
  const description = $('#description')?.value?.trim();

  if(!title || !price || !category || stagedFiles.length===0){
    uploadStatus.textContent='Please fill required fields and add files.';
    return;
  }

  uploadStatus.textContent = 'Uploading...';
  uploadBtn.disabled = true;

  // Build payload
  const filesPayload = stagedFiles.map(f => ({ filename: f.name, base64: f.base64 }));
  const payload = { title, price, old_price, category, description, files: filesPayload };

  // We'll POST via XHR to get upload progress showing (progress here is the full JSON body upload).
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', (localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT) + '/api/upload', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-admin-secret', localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_X_ADMIN_SECRET);

    xhr.upload.onprogress = (ev) => {
      if(ev.lengthComputable){
        const percent = Math.round((ev.loaded / ev.total) * 100);
        uploadStatus.textContent = `Uploading... ${percent}%`;
        // map overall progress into each staged file for a nicer UI
        stagedFiles.forEach((sf, idx) => {
          sf.progress = Math.min(100, percent + idx*5); // simple distribution
        });
        renderFiles();
      }
    };

    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        uploadBtn.disabled = false;
        if(xhr.status >= 200 && xhr.status < 300){
          try {
            const res = JSON.parse(xhr.responseText);
            if(res && res.success){
              uploadStatus.innerHTML = `<span style="color:${'#57e39b'}">Product uploaded ✓</span>`;
              prependRecent(res.product || (Array.isArray(res.product)?res.product[0]:res.product));
              stagedFiles = []; renderFiles();
            } else {
              uploadStatus.innerHTML = `<span style="color:${'#ff6b6b'}">Upload failed: ${res?.error||'Unknown'}</span>`;
            }
          } catch(e) {
            uploadStatus.innerHTML = `<span style="color:${'#ff6b6b'}">Upload failed (invalid response)</span>`;
            console.error('Invalid JSON', e, xhr.responseText);
          }
        } else {
          uploadStatus.innerHTML = `<span style="color:${'#ff6b6b'}">Server error ${xhr.status}</span>`;
          console.error('Upload failed', xhr.responseText);
        }
        setTimeout(()=> uploadStatus.textContent = '', 4500);
      }
    };

    xhr.send(JSON.stringify(payload));
  } catch(err){
    console.error(err);
    uploadStatus.innerHTML = `<span style="color:${'#ff6b6b'}">Server error</span>`;
    uploadBtn.disabled = false;
  }
});

/* recent list helper */
function prependRecent(product){
  if(!product) return;
  const d = document.createElement('div'); d.className='recent-item';
  d.innerHTML = `<strong>${escapeHtml(product.title||'Untitled')}</strong><div class="muted code">${product.id || ''}</div>`;
  recentList.prepend(d);
}

/* INIT after login */
let inited=false;
function initOnce(){
  if(inited) return;
  inited = true;
  renderFiles();
  $('#backendBase').value = localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT;
  $('#adminHeaderVal').value = localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_X_ADMIN_SECRET;

  // wire settings save
  $('#saveSettings')?.addEventListener('click', () => {
    const b = $('#backendBase').value.trim();
    const h = $('#adminHeaderVal').value.trim();
    if(b) localStorage.setItem(BACKEND_BASE_KEY, b);
    if(h) localStorage.setItem(ADMIN_HEADER_KEY, h);
    toast('Settings saved — reload to apply new endpoints');
  });
}

/* PRODUCTS */
async function fetchProducts(){
  try{
    const base = localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT;
    const res = await fetch(base + '/api/products');
    const json = await res.json();
    return (json && json.products) ? json.products : [];
  }catch(e){ console.error(e); return []; }
}

async function renderProductsTable(){
  const target = $('#productsTable');
  if(!target) return;
  target.innerHTML = 'Loading...';
  const list = await fetchProducts();
  if(!list.length){ target.innerHTML = '<div class="muted">No products yet</div>'; return; }

  const table = document.createElement('table');
  table.className = 'products-table';
  table.innerHTML = `<thead><tr><th>Thumb</th><th>Title</th><th>Category</th><th>Price</th><th>Created</th><th>Actions</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.thumbnail||''}" style="width:80px;height:50px;object-fit:cover;border-radius:6px"></td>
      <td>${escapeHtml(p.title||'')}</td>
      <td>${escapeHtml(p.category||'')}</td>
      <td>₹${Number(p.price||0).toLocaleString('en-IN')}</td>
      <td>${p.created_at? new Date(p.created_at).toLocaleString() : '-'}</td>
      <td>
        <button class="btn small" data-id="${p.id}" data-action="edit">Edit</button>
        <button class="btn small ghost" data-id="${p.id}" data-action="delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  target.innerHTML=''; target.appendChild(table);

  target.querySelectorAll('button[data-action="edit"]').forEach(b => b.addEventListener('click', () => openEditPrompt(b.dataset.id)));
  target.querySelectorAll('button[data-action="delete"]').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Delete this product? This will remove it from DB and attempt to delete storage files.')) return;
    await deleteProduct(b.dataset.id);
    await renderProductsTable();
  }));
}

async function openEditPrompt(id){
  try{
    const base = localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT;
    const res = await fetch(base + '/api/products/' + id);
    const json = await res.json();
    if(!json || !json.product){ alert('Could not fetch product'); return; }
    const p = json.product;
    const newTitle = prompt('Title', p.title) || p.title;
    const newPrice = prompt('Price (₹)', p.price) || p.price;
    const newCategory = prompt('Category', p.category) || p.category;
    const newDesc = prompt('Description', p.description || '') || p.description;
    const payload = { title:newTitle, price:Number(newPrice), category:newCategory, description:newDesc };
    const upd = await fetch(base + '/api/products/' + id, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json', 'x-admin-secret': localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_X_ADMIN_SECRET },
      body: JSON.stringify(payload)
    });
    const updJson = await upd.json();
    if(!upd.ok) { alert('Update failed: '+(updJson.error||JSON.stringify(updJson))); return; }
    toast('Product updated');
    renderProductsTable();
  }catch(err){ console.error(err); alert('Server error'); }
}

async function deleteProduct(id){
  try{
    const base = localStorage.getItem(BACKEND_BASE_KEY) || BACKEND_BASE_DEFAULT;
    const res = await fetch(base + '/api/products/' + id, { method:'DELETE', headers:{ 'x-admin-secret': localStorage.getItem(ADMIN_HEADER_KEY) || DEFAULT_X_ADMIN_SECRET }});
    const json = await res.json();
    if(!res.ok) { alert('Delete failed: '+(json.error||JSON.stringify(json))); return false; }
    toast('Deleted');
    return true;
  }catch(e){ console.error(e); alert('Server error'); return false; }
}

/* logout */
$('#logoutBtn')?.addEventListener('click', () => {
  showLogin();
});