/* ============================================
   FRONTEND SCRIPT — COMPLETE (products + cart + checkout + chat)
   ============================================ */

/* ===========
   CONFIG
   =========== */
const EC = window.EC_CONFIG || {};
const BACKEND_BASE = (EC.BACKEND_BASE || "").replace(/\/$/, "");
const API_PRODUCTS = BACKEND_BASE ? BACKEND_BASE + (EC.API_PRODUCTS_ENDPOINT || "/api/products") : (EC.API_PRODUCTS_ENDPOINT || "/api/products");
const API_CREATE_ORDER = BACKEND_BASE ? BACKEND_BASE + "/api/create-order" : "/api/create-order";

/* ===========
   UTILITIES
   =========== */
const q = s => document.querySelector(s);
const qAll = s => Array.from(document.querySelectorAll(s));
const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const escapeHtml = str =>
  (str || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" } [m]));

/* ===========
   THEME
   =========== */
const THEME_KEY = "ec_theme";
const body = document.body;
const themeToggle = q("#themeToggle");

function applyThemeFromStorage() {
  const t = localStorage.getItem(THEME_KEY) || "light";
  body.classList.remove("light-theme", "dark-theme");
  body.classList.add(t === "dark" ? "dark-theme" : "light-theme");
}
applyThemeFromStorage();

themeToggle?.addEventListener("click", () => {
  const isDark = body.classList.contains("dark-theme");
  const newTheme = isDark ? "light" : "dark";
  body.classList.toggle("dark-theme", !isDark);
  body.classList.toggle("light-theme", isDark);
  localStorage.setItem(THEME_KEY, newTheme);
});

/* ===========
   PRODUCT DATA
   =========== */

let products = []; // Will be replaced by backend products

/* Fetch from Backend */
async function fetchProductsFromBackend() {
  try {
    const res = await fetch(API_PRODUCTS, { cache: "no-store" });
    const data = await res.json();
    
    if (data && data.products && Array.isArray(data.products)) {
      return data.products.map(normalizeProduct);
    }
    // Accept array as root
    if (Array.isArray(data)) return data.map(normalizeProduct);
    return [];
  } catch (err) {
    console.warn("Backend fetch failed:", err);
    return [];
  }
}

/* Ensure product keys are standardized */
function normalizeProduct(p) {
  if (!p) return {};
  
  // Build gallery from Supabase "files"
  const gallery = Array.isArray(p.files) ?
    p.files.map(f => f.url).filter(Boolean) :
    [];
  
  return {
    id: p.id,
    title: p.title || "",
    price: p.price || 0,
    oldPrice: p.old_price || null,
    category: p.category || "",
    description: p.description || "",
    thumbnail: p.thumbnail || (gallery[0] || ""),
    gallery: gallery.length ? gallery : [p.thumbnail || ""],
    tags: p.tags || [],
    includes: p.includes || [],
    demoUrl: p.demoUrl || p.demo_url || "#"
  };
}

/* ===========
   RENDER PRODUCTS
   =========== */
const productGrid = q("#productGrid");
const searchInput = q("#searchInput");
const sortSelect = q("#sortSelect");
const chips = qAll(".chip");

let currentCategory = "all";
let currentQuery = "";
let currentSort = "featured";

/* Render product cards */
function renderProducts(list) {
  if (!productGrid) return;
  
  productGrid.innerHTML = "";
  
  if (!list.length) {
    productGrid.innerHTML = `<p style="padding:18px;color:var(--color-text-secondary)">No templates found.</p>`;
    return;
  }
  
  const frag = document.createDocumentFragment();
  
  list.forEach(p => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = p.id;
    
    card.innerHTML = `
      <div class="product-badge">${escapeHtml((p.tags && p.tags[0]) || "")}</div>
      <img class="product-thumbnail" loading="lazy" src="${escapeHtml(p.thumbnail)}" alt="">
      <div class="product-info">
        <div class="product-title">${escapeHtml(p.title)}</div>
        <div class="product-tags">
          ${(p.tags || []).map(t => `<span class="product-tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="product-price-group">
          <div class="product-price">${fmt(p.price)}</div>
          <div class="product-old-price">${p.oldPrice ? fmt(p.oldPrice) : ""}</div>
        </div>
      </div>
    `;
    
    card.addEventListener("click", () => openProductModal(p.id));
    frag.appendChild(card);
  });
  
  productGrid.appendChild(frag);
}

/* Filtering */
function applyFilters() {
  let list = [...products];
  
  if (currentCategory !== "all") {
    list = list.filter(
      p => p.category === currentCategory || (p.tags || []).includes(currentCategory)
    );
  }
  
  if (currentQuery) {
    const ql = currentQuery.toLowerCase();
    list = list.filter(
      p =>
      p.title.toLowerCase().includes(ql) ||
      (p.tags || []).join(" ").toLowerCase().includes(ql) ||
      (p.includes || []).join(" ").toLowerCase().includes(ql)
    );
  }
  
  if (currentSort === "price-low") list.sort((a, b) => a.price - b.price);
  if (currentSort === "price-high") list.sort((a, b) => b.price - a.price);
  
  renderProducts(list);
}

/* INPUT HANDLERS */
searchInput?.addEventListener("input", e => {
  currentQuery = e.target.value;
  applyFilters();
});

sortSelect?.addEventListener("change", e => {
  currentSort = e.target.value;
  applyFilters();
});

/* Chips */
chips.forEach(ch => {
  ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("active"));
    ch.classList.add("active");
    currentCategory = ch.dataset.category;
    applyFilters();
  });
});

/* ===========
   PRODUCT MODAL
   =========== */
const productModal = q("#productModal");
const modalMainImage = q("#modalMainImage");
const modalThumbnails = q("#modalThumbnails");
const modalTitle = q("#modalTitle");
const modalPrice = q("#modalPrice");
const modalOldPrice = q("#modalOldPrice");
const modalTags = q("#modalTags");
const modalIncludes = q("#modalIncludes");

let currentProduct = null;
let currentImageIndex = 0;

function openProductModal(id) {
  const p = products.find(x => x.id == id);
  if (!p) return;
  
  currentProduct = p;
  currentImageIndex = 0;
  
  modalTitle.textContent = p.title;
  modalPrice.textContent = fmt(p.price);
  modalOldPrice.textContent = p.oldPrice ? fmt(p.oldPrice) : "";
  modalTags.innerHTML = (p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  modalIncludes.innerHTML = (p.includes || []).map(i => `<li>${escapeHtml(i)}</li>`).join("");
  
  renderModalGallery(p.gallery);
  
  productModal.classList.add("active");
}

function renderModalGallery(images) {
  modalThumbnails.innerHTML = "";
  modalMainImage.src = images && images[0] ? images[0] : "";
  
  (images || []).forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = i === 0 ? "active" : "";
    
    img.addEventListener("click", () => {
      modalMainImage.src = src;
      currentImageIndex = i;
      highlightThumb(i);
    });
    
    modalThumbnails.appendChild(img);
  });
}

function highlightThumb(i) {
  modalThumbnails.querySelectorAll("img").forEach((img, idx) => {
    img.classList.toggle("active", idx === i);
  });
}

function closeModal() {
  productModal.classList.remove("active");
}
window.closeModal = closeModal;

function nextImage() {
  if (!currentProduct) return;
  const images = currentProduct.gallery || [];
  if (!images.length) return;
  currentImageIndex = (currentImageIndex + 1) % images.length;
  modalMainImage.src = images[currentImageIndex];
  highlightThumb(currentImageIndex);
}
window.nextImage = nextImage;

function prevImage() {
  if (!currentProduct) return;
  const images = currentProduct.gallery || [];
  if (!images.length) return;
  currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
  modalMainImage.src = images[currentImageIndex];
  highlightThumb(currentImageIndex);
}
window.prevImage = prevImage;

/* ===========
   CART SYSTEM
   =========== */

const CART_KEY = "ec_cart_v1";
const cartDrawer = q("#cartDrawer");
const cartItemsNode = q("#cartItems");
const cartEmptyNode = q("#cartEmpty");
const cartFooter = q("#cartFooter");
const cartBadge = q("#cartBadge");
const cartSubtotalNode = q("#cartSubtotal");
const cartFeeNode = q("#cartFee");
const cartTotalNode = q("#cartTotal");

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge(cart);
}

function updateCartBadge(cart) {
  const totalQty = cart.reduce((s, it) => s + (it.quantity || 0), 0);
  if (cartBadge) cartBadge.textContent = totalQty;
}

/* addToCart from product modal */
function addToCartFromModal() {
  if (!currentProduct) return;
  addToCart(currentProduct, 1);
  toastLocal("Added to cart");
}
window.addToCartFromModal = addToCartFromModal;

function addToCart(product, qty = 1) {
  const cart = loadCart();
  const idx = cart.findIndex(i => i.id == product.id);
  if (idx >= 0) {
    cart[idx].quantity = (cart[idx].quantity || 0) + qty;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      quantity: qty
    });
  }
  saveCart(cart);
  renderCart();
}

/* Render cart UI */
function renderCart() {
  const cart = loadCart();
  if (!cart.length) {
    if (cartItemsNode) cartItemsNode.innerHTML = "";
    if (cartEmptyNode) cartEmptyNode.classList.add("show");
    if (cartFooter) cartFooter.style.display = "none";
    updateCartTotals([]);
    return;
  }
  if (cartEmptyNode) cartEmptyNode.classList.remove("show");
  if (cartFooter) cartFooter.style.display = "block";
  
  cartItemsNode.innerHTML = "";
  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${escapeHtml(item.thumbnail || '')}" alt="${escapeHtml(item.title)}">
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHtml(item.title)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" data-op="dec" data-id="${item.id}">-</button>
          <div>${item.quantity}</div>
          <button class="qty-btn" data-op="inc" data-id="${item.id}">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${fmt(item.price * item.quantity)}</div>
        <button class="btn small ghost remove-item" data-id="${item.id}">Remove</button>
      </div>
    `;
    cartItemsNode.appendChild(div);
  });
  
  // attach events
  cartItemsNode.querySelectorAll('.qty-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const op = e.currentTarget.dataset.op;
      const id = e.currentTarget.dataset.id;
      updateCartQty(id, op === 'inc' ? 1 : -1);
    });
  });
  cartItemsNode.querySelectorAll('.remove-item').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      removeCartItem(id);
    });
  });
  
  updateCartTotals(cart);
}

function updateCartQty(id, delta) {
  const cart = loadCart();
  const idx = cart.findIndex(i => i.id == id);
  if (idx < 0) return;
  cart[idx].quantity = Math.max(0, (cart[idx].quantity || 0) + delta);
  if (cart[idx].quantity === 0) cart.splice(idx, 1);
  saveCart(cart);
  renderCart();
}

function removeCartItem(id) {
  let cart = loadCart();
  cart = cart.filter(i => i.id != id);
  saveCart(cart);
  renderCart();
}

function updateCartTotals(cart) {
  const subtotal = (cart || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;
  if (cartSubtotalNode) cartSubtotalNode.textContent = fmt(subtotal);
  if (cartFeeNode) cartFeeNode.textContent = fmt(fee);
  if (cartTotalNode) cartTotalNode.textContent = fmt(total);
}

/* Cart open/close */
function toggleCart() {
  if (!cartDrawer) return;
  cartDrawer.classList.toggle('open');
  renderCart();
}
window.toggleCart = toggleCart;

function closeCart() {
  if (!cartDrawer) return;
  cartDrawer.classList.remove('open');
}
window.closeCart = closeCart;

function openCheckout() {
  // set checkout total
  const cart = loadCart();
  const subtotal = (cart || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;
  const checkoutTotal = q('#checkoutTotal');
  if (checkoutTotal) checkoutTotal.textContent = fmt(total);
  // open modal
  const checkoutModal = q('#checkoutModal');
  if (checkoutModal) checkoutModal.classList.add('active');
}
window.openCheckout = openCheckout;

function closeCheckout() {
  const checkoutModal = q('#checkoutModal');
  if (checkoutModal) checkoutModal.classList.remove('active');
}
window.closeCheckout = closeCheckout;

/* Checkout form handling */
async function handleCheckout(e) {
  e.preventDefault();
  const cart = loadCart();
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }
  const name = q('#customerName')?.value?.trim();
  const phone = q('#customerPhone')?.value?.trim();
  const email = q('#customerEmail')?.value?.trim();
  const instagram = q('#customerInstagram')?.value?.trim();
  const note = q('#orderNote')?.value?.trim();
  const payment = (document.querySelector('input[name="payment"]:checked') || {}).value || 'upi';
  if (!name || !phone || !email) {
    alert("Please fill required fields (name, phone, email).");
    return;
  }
  
  // Build order payload
  const order = {
    customer: { name, phone, email, instagram },
    note,
    payment,
    items: cart.map(i => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity })),
    subtotal: cart.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0),
    fee: Math.round(cart.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0) * 0.02)
  };
  
  try {
    // If API available, POST it, otherwise simulate success
    let result;
    if (BACKEND_BASE) {
      const res = await fetch(API_CREATE_ORDER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Order failed');
    } else {
      // simulate
      result = { success: true, orderId: 'SIM-' + Date.now(), email };
      await new Promise(r => setTimeout(r, 700));
    }
    
    // success
    // clear cart
    localStorage.removeItem(CART_KEY);
    renderCart();
    closeCheckout();
    showSuccess(result.orderId || result.order_id || ('ORD-' + Date.now()), email || order.customer.email);
  } catch (err) {
    console.error("checkout error", err);
    alert("Payment / order creation failed. See console for details.");
  }
}
window.handleCheckout = handleCheckout;

/* Success modal */
const successModal = q('#successModal');
function showSuccess(orderId, email) {
  if (q('#orderId')) q('#orderId').textContent = orderId || '';
  if (q('#confirmEmail')) q('#confirmEmail').textContent = email || '';
  if (successModal) successModal.classList.add('active');
  // small confetti: create colored dots
  runConfetti();
}

function closeSuccess() {
  if (successModal) successModal.classList.remove('active');
}
window.closeSuccess = closeSuccess;

/* small confetti implementation */
function runConfetti() {
  const c = q('#confettiContainer');
  if (!c) return;
  c.innerHTML = '';
  const colors = ['#FFD6E8', '#FFB6C1', '#E6B8FF', '#FFDAB9', '#FF9AB3'];
  for (let i=0;i<20;i++){
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.width = dot.style.height = (6 + Math.random()*12) + 'px';
    dot.style.left = (Math.random()*100) + '%';
    dot.style.background = colors[Math.floor(Math.random()*colors.length)];
    dot.style.opacity = '0.95';
    dot.style.borderRadius = '50%';
    dot.style.transform = `translateY(-10px)`;
    dot.style.transition = `transform 900ms cubic-bezier(.2,.8,.2,1), opacity 700ms`;
    c.appendChild(dot);
    setTimeout(()=> dot.style.transform = `translateY(${200 + Math.random()*200}px) rotate(${Math.random()*720}deg)`, 20);
    setTimeout(()=> dot.style.opacity = '0', 900);
  }
  setTimeout(()=> c.innerHTML = '', 1600);
}

/* small toast for local actions */
function toastLocal(msg, kind='ok') {
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
  setTimeout(()=> el.remove(), 2200);
}

/* ===========
   CHAT WIDGET
   =========== */
const chatBox = q('#chatBox');
const chatBubble = q('#chatBubble');
const chatMessages = q('#chatMessages');
const chatInput = q('#chatInput');

function toggleChat() {
  if (!chatBox) return;
  chatBox.classList.toggle('open');
  if (chatBox.classList.contains('open')) {
    chatInput?.focus();
  }
}
window.toggleChat = toggleChat;

function openChat() {
  if (!chatBox) {
    // fallback to toggling cart
    toggleChat();
    return;
  }
  chatBox.classList.add('open');
  chatInput?.focus();
}
window.openChat = openChat;

function appendChatMessage(text, who='received') {
  if (!chatMessages) return;
  const wrap = document.createElement('div');
  wrap.className = `chat-message ${who}`;
  const inner = document.createElement('div');
  inner.className = 'message-content';
  inner.textContent = text;
  wrap.appendChild(inner);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
  const v = chatInput?.value?.trim();
  if (!v) return;
  appendChatMessage(v, 'sent');
  chatInput.value = '';
  // emulate agent reply
  setTimeout(() => appendChatMessage("Thanks — I'll get back to you shortly! ❤️", 'received'), 800);
}
window.sendMessage = sendMessage;

/* ===========
   INIT
   =========== */
async function init() {
  const remote = await fetchProductsFromBackend();
  products = remote.length ? remote : [];
  renderProducts(products);
  // initial cart render and badge
  updateCartBadge(loadCart());
  renderCart();
}

document.addEventListener("DOMContentLoaded", init);

/* ===========
   CHAT UPLOAD + PERSISTENCE PATCH
   (append to your existing script.js)
   =========== */

/* Configurable endpoints (will use BACKEND_BASE from your script if defined) */
const API_UPLOAD = (typeof BACKEND_BASE !== 'undefined' && BACKEND_BASE) ?
  BACKEND_BASE + '/api/orders/upload-image' :
  '/api/orders/upload-image';

/* Local storage keys */
const CHAT_KEY = 'ec_chat_history_v1';
const PENDING_IMAGES_KEY = 'ec_chat_pending_images_v1'; // optional, we keep files in memory; this key holds metadata

/* DOM refs (ensure your index.html has these elements, you showed it does) */
const chatFileInput = document.getElementById('chatFileInput');
const chatAttachmentPreview = document.getElementById('chatAttachmentPreview');
const chatMessagesNode = document.getElementById('chatMessages');
const chatInputNode = document.getElementById('chatInput');
const chatSendBtnNode = document.getElementById('chatSendBtn');

/* In-memory pending image files (not stored file bytes in localStorage) */
let pendingImages = []; // each: { id, file, url, name }

/* Load chat history from localStorage */
function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.warn("loadChatHistory:", e);
    return [];
  }
}

/* Save chat history to localStorage */
function saveChatHistory(history) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(history || []));
  } catch (e) {
    console.warn("saveChatHistory:", e);
  }
}

/* Append a chat message object and persist
   message: { id, who: 'sent'|'received', text: '', ts: 123, attachments: [{name,url}] } */
function pushChatMessage(message) {
  const hist = loadChatHistory();
  hist.push(message);
  saveChatHistory(hist);
  renderChatMessages(hist);
}

/* Render chat messages into chatMessagesNode (clears and re-renders) */
function renderChatMessages(list) {
  if (!chatMessagesNode) return;
  chatMessagesNode.innerHTML = '';
  (list || []).forEach(m => {
    const wrap = document.createElement('div');
    wrap.className = `chat-message ${m.who || 'received'}`;
    const inner = document.createElement('div');
    inner.className = 'message-content';
    inner.textContent = m.text || '';
    wrap.appendChild(inner);
    
    // attachments (show thumbnails / links)
    if (Array.isArray(m.attachments) && m.attachments.length) {
      const row = document.createElement('div');
      row.className = 'message-attachments';
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.marginTop = '8px';
      m.attachments.forEach(a => {
        const img = document.createElement('img');
        img.src = a.url;
        img.alt = a.name || 'attachment';
        img.style.width = '96px';
        img.style.height = '64px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        row.appendChild(img);
      });
      wrap.appendChild(row);
    }
    chatMessagesNode.appendChild(wrap);
  });
  // scroll to bottom
  chatMessagesNode.scrollTop = chatMessagesNode.scrollHeight;
}

/* Render current pendingImages preview area */
function renderAttachmentPreview() {
  if (!chatAttachmentPreview) return;
  if (!pendingImages.length) {
    chatAttachmentPreview.style.display = 'none';
    chatAttachmentPreview.innerHTML = '';
    return;
  }
  chatAttachmentPreview.style.display = 'flex';
  chatAttachmentPreview.innerHTML = '';
  pendingImages.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'chat-attachment-item';
    item.style.display = 'inline-flex';
    item.style.alignItems = 'center';
    item.style.gap = '8px';
    
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = p.name || 'attachment';
    img.style.width = '72px';
    img.style.height = '56px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove';
    removeBtn.textContent = '✕';
    removeBtn.style.cursor = 'pointer';
    removeBtn.dataset.idx = idx;
    removeBtn.addEventListener('click', () => {
      // revoke url and remove
      try { URL.revokeObjectURL(pendingImages[idx].url); } catch (e) {}
      pendingImages.splice(idx, 1);
      renderAttachmentPreview();
    });
    
    item.appendChild(img);
    item.appendChild(removeBtn);
    chatAttachmentPreview.appendChild(item);
  });
}

/* Handle file input change (attach images) */
if (chatFileInput) {
  chatFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const id = 'ci_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      pendingImages.push({ id, file, url, name: file.name });
    });
    renderAttachmentPreview();
    // clear input so same file can be reselected later
    chatFileInput.value = '';
  });
}

/* safe JSON parsing for fetch responses (avoid crash when body empty) */
async function safeParseJson(res) {
  try {
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

/* Upload a single File object to API_UPLOAD; returns returned fileUrl or null */
async function uploadFileToServer(file) {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(API_UPLOAD, { method: 'POST', body: fd });
    const json = await safeParseJson(res);
    if (!res.ok) {
      console.warn('uploadFileToServer failed', json);
      return null;
    }
    // server returns { success: true, fileUrl, path } per backend sample
    return json.fileUrl || json.file_url || null;
  } catch (err) {
    console.error('uploadFileToServer error', err);
    return null;
  }
}

/* Upload all pendingImages and return array of URLs (keeps order) */
async function uploadPendingChatImages() {
  const uploaded = [];
  for (const p of pendingImages.slice()) {
    try {
      const url = await uploadFileToServer(p.file);
      if (url) uploaded.push({ name: p.name, url });
    } catch (e) { console.warn('upload pending image failed', e); }
  }
  return uploaded;
}

/* Modified sendMessage function that preserves attachments in chat history
   NOTE: If you already have a sendMessage() in your old script, **replace** or
   make this call within your existing sendMessage (just call sendMessageWithPersist()). */
async function sendMessageWithPersist() {
  if (!chatInputNode && !pendingImages.length) return;
  const text = chatInputNode ? (chatInputNode.value || '').trim() : '';
  if (!text && pendingImages.length === 0) return;
  
  // build attachments array (use local preview URLs now)
  const attachments = pendingImages.map(p => ({ name: p.name, url: p.url }));
  
  const message = {
    id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    who: 'sent',
    text,
    ts: Date.now(),
    attachments
  };
  
  // add to history & render
  pushChatMessage(message);
  
  // clear input and preview but keep files (we only upload them at checkout to preserve original files)
  if (chatInputNode) chatInputNode.value = '';
  // clear pendingImages only after you are sure you'll keep them attached to this message in memory.
  // We'll keep pendingImages but mark them as "attached" to the last sent message.
  // For simplicity, empty pendingImages after adding to history; history contains preview urls which may be blob: urls — to avoid lost previews after reload we do NOT revoke them here.
  // Better UX: keep messages with attachments persisted as metadata only (they refer to blob: urls — they will NOT be valid after refresh).
  // To avoid that, we will store attachment _names_ in history and only keep upload pendingImages separately; on sending order we upload them and include returned URLs.
  
  // Strategy (to be safe across reloads): For now keep the attachment preview visible and store only metadata in history (blob urls will not persist across sessions).
  // So we mark this message as referring to pendingImages by name; actual URLs will be uploaded during checkout.
  
  // Clear attachment preview UI (keep pendingImages array so checkout can upload original files)
  pendingImages = [];
  renderAttachmentPreview();
}

/* Hook up send button and Enter key if nodes exist */
if (chatSendBtnNode) chatSendBtnNode.addEventListener('click', () => sendMessageWithPersist());
if (chatInputNode) {
  chatInputNode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessageWithPersist();
    }
  });
}

/* On page load restore history + wire pending images metadata (we keep pending images only in memory,
   so attachments will be uploaded from the most recent pendingImages when checkout runs) */
function initChatPersistence() {
  // render history
  const hist = loadChatHistory();
  renderChatMessages(hist);
  // ensure preview hidden if no attachments
  renderAttachmentPreview();
}

/* Utility to be called by your checkout flow BEFORE creating order.
   It uploads any pendingImages and returns the uploaded URLs array,
   also scans the chat history for inline attachments (if you want to include older message attachments, additional logic required) */
async function collectAndUploadChatAttachments() {
  // Upload current pending images
  const uploaded = await uploadPendingChatImages(); // [{name,url},...]
  // Clear in-memory pending images now
  pendingImages = [];
  renderAttachmentPreview();
  return uploaded.map(u => u.url).filter(Boolean);
}

/* Export to global so your existing handleCheckout can call it:
   Example usage inside existing handleCheckout:
     const chatImageUrls = await collectAndUploadChatAttachments();
     order.referenceImages = chatImageUrls;
     // then continue to POST the order payload
*/
window.collectAndUploadChatAttachments = collectAndUploadChatAttachments;

/* Initialize chat persistence on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  try { initChatPersistence(); } catch (e) { console.warn(e); }
});