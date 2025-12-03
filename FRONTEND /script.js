/* script.js
   Full interactive behavior:
   - Theme toggle + persistence
   - Render demo product list
   - Search/filter/sort
   - Product modal + gallery
   - Cart drawer + simple cart operations
   - Checkout handling + success modal
   - Chat widget toggles and simple messages
   - Front-end Auth UI injection (no backend)
*/

/* ---------- UTILITIES ---------- */
const q = sel => document.querySelector(sel);
const qAll = sel => Array.from(document.querySelectorAll(sel));
const formatCurrency = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/* ---------- THEME ---------- */
const themeToggle = q('#themeToggle');
const body = document.body;
const THEMES = { LIGHT: 'light-theme', DARK: 'dark-theme' };

function applySavedTheme() {
  const saved = localStorage.getItem('ec_theme') || THEMES.LIGHT;
  body.classList.remove(THEMES.LIGHT, THEMES.DARK);
  body.classList.add(saved);
}
applySavedTheme();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    body.classList.toggle(THEMES.DARK);
    body.classList.toggle(THEMES.LIGHT);
    const active = body.classList.contains(THEMES.DARK) ? THEMES.DARK : THEMES.LIGHT;
    localStorage.setItem('ec_theme', active);
  });
}

/* ---------- SAMPLE PRODUCTS (replace with API when ready) ---------- */
const products = [
  {
    id: 'p1',
    title: 'Starlit Proposal',
    price: 1499,
    oldPrice: 2499,
    tags: ['proposal', 'animations', 'landing'],
    category: 'proposal',
    thumbnail: 'https://via.placeholder.com/640x400/FFE5EC/FFB6C1?text=Starlit+Proposal',
    gallery: [
      'https://via.placeholder.com/1200x800/FFE5EC/FFB6C1?text=Proposal+1',
      'https://via.placeholder.com/1200x800/FFD6E8/FFB6C1?text=Proposal+2'
    ],
    includes: ['HTML/CSS/JS', 'Animated timeline', 'Responsive layout'],
    demoUrl: '#'
  },
  {
    id: 'p2',
    title: 'Anniversary Forever',
    price: 999,
    oldPrice: 1299,
    tags: ['anniversary', 'components'],
    category: 'anniversary',
    thumbnail: 'https://via.placeholder.com/640x400/FFF0F5/E6B8FF?text=Anniversary',
    gallery: [
      'https://via.placeholder.com/1200x800/FFF0F5/E6B8FF?text=Anniv+1',
      'https://via.placeholder.com/1200x800/FFE5EC/FFD6E8?text=Anniv+2'
    ],
    includes: ['Templates', 'Customizable hero', 'Icons & SVGs'],
    demoUrl: '#'
  },
  {
    id: 'p3',
    title: 'Birthday Wishes Landing',
    price: 699,
    oldPrice: 999,
    tags: ['birthday', 'landing'],
    category: 'birthday',
    thumbnail: 'https://via.placeholder.com/640x400/FFDAB9/FFB6C1?text=Birthday',
    gallery: [
      'https://via.placeholder.com/1200x800/FFDAB9/FFB6C1?text=Birthday+1'
    ],
    includes: ['Modern layout', 'Quick customizations'],
    demoUrl: '#'
  },
  {
    id: 'p4',
    title: 'Sorry — I Love You',
    price: 499,
    oldPrice: 799,
    tags: ['apology', 'components'],
    category: 'apology',
    thumbnail: 'https://via.placeholder.com/640x400/FFE5F0/D4A5A5?text=Apology',
    gallery: [
      'https://via.placeholder.com/1200x800/FFE5F0/D4A5A5?text=Sorry+1'
    ],
    includes: ['Gentle animations', 'Text variants'],
    demoUrl: '#'
  },
  {
    id: 'p5',
    title: 'Full-Stack Romantic Kit',
    price: 3499,
    oldPrice: 4999,
    tags: ['fullstack', 'landing'],
    category: 'fullstack',
    thumbnail: 'https://via.placeholder.com/640x400/E6B8FF/ffffff?text=Full+Stack',
    gallery: [
      'https://via.placeholder.com/1200x800/E6B8FF/ffffff?text=Fullstack+1',
      'https://via.placeholder.com/1200x800/FFD6E8/FFE5EC?text=Fullstack+2'
    ],
    includes: ['React+Next starter', 'Serverless functions', 'Deploy guide'],
    demoUrl: '#'
  }
];

/* ---------- RENDER PRODUCTS ---------- */
const productGrid = q('#productGrid');
const searchInput = q('#searchInput');
const sortSelect = q('#sortSelect');
const chips = qAll('.chip');

let currentCategory = 'all';
let currentQuery = '';
let currentSort = 'featured';

function renderProducts(list = products) {
  if (!productGrid) return;
  productGrid.innerHTML = '';
  if (!list.length) {
    productGrid.innerHTML = `<p style="padding:20px;color:var(--color-text-secondary)">No templates found.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('data-id', p.id);
    card.innerHTML = `
      <div class="product-badge">${p.tags[0] ? p.tags[0] : ''}</div>
      <img class="product-thumbnail" src="${p.thumbnail}" alt="${p.title}">
      <div class="product-info">
        <div class="product-title">${p.title}</div>
        <div class="product-tags">${p.tags.map(t => `<span class="product-tag">${t}</span>`).join('')}</div>
        <div class="product-price-group">
          <div class="product-price">${formatCurrency(p.price)}</div>
          <div class="product-old-price">${p.oldPrice ? formatCurrency(p.oldPrice) : ''}</div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openProductModal(p.id));
    frag.appendChild(card);
  });
  productGrid.appendChild(frag);
}

/* ---------- FILTER / SEARCH / SORT ---------- */
function applyFilters() {
  let list = products.slice();

  // Category
  if (currentCategory !== 'all') {
    list = list.filter(p => p.category === currentCategory || p.tags.includes(currentCategory));
  }

  // Search
  if (currentQuery.trim()) {
    const qlow = currentQuery.trim().toLowerCase();
    list = list.filter(p => (p.title + ' ' + p.tags.join(' ') + ' ' + p.includes.join(' ')).toLowerCase().includes(qlow));
  }

  // Sort
  if (currentSort === 'price-low') list.sort((a, b) => a.price - b.price);
  else if (currentSort === 'price-high') list.sort((a, b) => b.price - a.price);
  else if (currentSort === 'newest') list = list; // demo data not timestamped

  renderProducts(list);
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    currentQuery = e.target.value;
    applyFilters();
  });
}
if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });
}
if (chips && chips.length) {
  chips.forEach(ch => {
    ch.addEventListener('click', () => {
      chips.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
      ch.classList.add('active');
      ch.setAttribute('aria-selected', 'true');
      currentCategory = ch.dataset.category || 'all';
      applyFilters();
    });
  });
}

/* ---------- PRODUCT MODAL ---------- */
const productModal = q('#productModal');
const modalMainImage = q('#modalMainImage');
const modalThumbnails = q('#modalThumbnails');
const modalTitle = q('#modalTitle');
const modalPrice = q('#modalPrice');
const modalOldPrice = q('#modalOldPrice');
const modalTags = q('#modalTags');
const modalIncludes = q('#modalIncludes');

let currentProduct = null;
let currentImageIndex = 0;

function openProductModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;
  currentImageIndex = 0;
  if (modalTitle) modalTitle.textContent = p.title;
  if (modalPrice) modalPrice.textContent = formatCurrency(p.price);
  if (modalOldPrice) modalOldPrice.textContent = p.oldPrice ? formatCurrency(p.oldPrice) : '';
  if (modalTags) modalTags.innerHTML = p.tags.map(t => `<span class="tag">${t}</span>`).join('');
  if (modalIncludes) modalIncludes.innerHTML = p.includes.map(i => `<li>${i}</li>`).join('');
  renderModalGallery(p.gallery);
  if (productModal) productModal.classList.add('active');
}

function renderModalGallery(photos = []) {
  if (!modalThumbnails || !modalMainImage) return;
  modalThumbnails.innerHTML = '';
  if (!photos || !photos.length) {
    modalMainImage.src = currentProduct.thumbnail;
    return;
  }
  modalMainImage.src = photos[0];
  photos.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${currentProduct.title} preview ${idx + 1}`;
    if (idx === 0) img.classList.add('active');
    img.addEventListener('click', () => {
      modalThumbnails.querySelectorAll('img').forEach(i => i.classList.remove('active'));
      img.classList.add('active');
      modalMainImage.src = src;
      currentImageIndex = idx;
    });
    modalThumbnails.appendChild(img);
  });
}

function closeModal() {
  if (productModal) productModal.classList.remove('active');
}
window.closeModal = closeModal;

function prevImage() {
  if (!currentProduct) return;
  const photos = currentProduct.gallery.length ? currentProduct.gallery : [currentProduct.thumbnail];
  currentImageIndex = (currentImageIndex - 1 + photos.length) % photos.length;
  if (modalMainImage) modalMainImage.src = photos[currentImageIndex];
  highlightThumb(currentImageIndex);
}
window.prevImage = prevImage;

function nextImage() {
  if (!currentProduct) return;
  const photos = currentProduct.gallery.length ? currentProduct.gallery : [currentProduct.thumbnail];
  currentImageIndex = (currentImageIndex + 1) % photos.length;
  if (modalMainImage) modalMainImage.src = photos[currentImageIndex];
  highlightThumb(currentImageIndex);
}
window.nextImage = nextImage;

function highlightThumb(i) {
  if (!modalThumbnails) return;
  modalThumbnails.querySelectorAll('img').forEach((img, idx) => {
    img.classList.toggle('active', idx === i);
  });
}

if (productModal) {
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeModal();
  });
}

/* ---------- CART ---------- */
const cartDrawer = q('#cartDrawer');
const cartButton = q('#cartButton');
const cartBadge = q('#cartBadge');
const cartItemsEl = q('#cartItems');
const cartEmptyEl = q('#cartEmpty');
const cartSubtotalEl = q('#cartSubtotal');
const cartFeeEl = q('#cartFee');
const cartTotalEl = q('#cartTotal');

let cart = JSON.parse(localStorage.getItem('ec_cart') || '[]');

function saveCart() { localStorage.setItem('ec_cart', JSON.stringify(cart)); }

function toggleCart() {
  if (!cartDrawer) return;
  cartDrawer.classList.toggle('open');
}
window.toggleCart = toggleCart;

if (cartButton) cartButton.addEventListener('click', toggleCart);

function addToCartFromModal() {
  if (!currentProduct) return;
  addToCart(currentProduct.id, 1);
  closeModal();
  if (cartDrawer) cartDrawer.classList.add('open');
}
window.addToCartFromModal = addToCartFromModal;

function addToCart(productId, qty = 1) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  const existing = cart.find(c => c.id === productId);
  if (existing) existing.qty += qty;
  else cart.push({ id: productId, qty });
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.id !== productId);
  saveCart();
  renderCart();
}

function changeQty(productId, delta) {
  const item = cart.find(c => c.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function renderCart() {
  if (!cartItemsEl) return;
  cartItemsEl.innerHTML = '';
  if (!cart.length) {
    if (cartEmptyEl) cartEmptyEl.classList.add('show');
    cartFooterVisibility(false);
  } else {
    if (cartEmptyEl) cartEmptyEl.classList.remove('show');
    cartFooterVisibility(true);
    cart.forEach(ci => {
      const prod = products.find(p => p.id === ci.id);
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${prod.thumbnail}" alt="${prod.title}">
        <div class="cart-item-info">
          <div class="cart-item-title">${prod.title}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-action="-">-</button>
            <div>${ci.qty}</div>
            <button class="qty-btn" data-action="+">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800">${formatCurrency(prod.price * ci.qty)}</div>
          <button class="qty-btn" style="margin-top:8px">✕</button>
        </div>
      `;
      const minus = div.querySelector('[data-action="-"]');
      const plus = div.querySelector('[data-action="+"]');
      if (minus) minus.addEventListener('click', () => changeQty(ci.id, -1));
      if (plus) plus.addEventListener('click', () => changeQty(ci.id, +1));
      const removeBtn = div.querySelectorAll('.qty-btn')[2];
      if (removeBtn) removeBtn.addEventListener('click', () => removeFromCart(ci.id));
      cartItemsEl.appendChild(div);
    });
  }

  const subtotal = cart.reduce((s, ci) => {
    const p = products.find(x => x.id === ci.id);
    return s + (p.price * ci.qty);
  }, 0);
  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;

  if (cartSubtotalEl) cartSubtotalEl.textContent = formatCurrency(subtotal);
  if (cartFeeEl) cartFeeEl.textContent = formatCurrency(fee);
  if (cartTotalEl) cartTotalEl.textContent = formatCurrency(total);
  if (cartBadge) cartBadge.textContent = cart.reduce((s, ci) => s + ci.qty, 0);
}
function cartFooterVisibility(show) {
  const f = q('#cartFooter');
  if (!f) return;
  f.style.display = show ? 'block' : 'none';
}

renderCart();

/* ---------- CHECKOUT ---------- */
const checkoutModal = q('#checkoutModal');
const checkoutForm = q('#checkoutForm');
const checkoutTotalEl = q('#checkoutTotal');
function openCheckout() {
  const subtotal = cart.reduce((s, ci) => {
    const p = products.find(x => x.id === ci.id);
    return s + (p.price * ci.qty);
  }, 0);
  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;
  if (checkoutTotalEl) checkoutTotalEl.textContent = formatCurrency(total);
  if (checkoutModal) checkoutModal.classList.add('active');
}
window.openCheckout = openCheckout;

function closeCheckout() {
  if (checkoutModal) checkoutModal.classList.remove('active');
}
window.closeCheckout = closeCheckout;

function handleCheckout(e) {
  e.preventDefault();
  if (!cart.length) {
    alert('Your cart is empty.');
    return;
  }

  const name = q('#customerName') ? q('#customerName').value : '';
  const email = q('#customerEmail') ? q('#customerEmail').value : '';

  const orderId = 'EC' + Math.floor(Math.random() * 900000 + 100000);
  if (q('#orderId')) q('#orderId').textContent = orderId;
  if (q('#confirmEmail')) q('#confirmEmail').textContent = email;
  if (checkoutModal) checkoutModal.classList.remove('active');
  if (q('#successModal')) q('#successModal').classList.add('active');

  cart = [];
  saveCart();
  renderCart();
  runConfetti();
  if (checkoutForm) checkoutForm.reset();
}
window.handleCheckout = handleCheckout;

/* Close success modal */
function closeSuccess() {
  if (q('#successModal')) q('#successModal').classList.remove('active');
}
window.closeSuccess = closeSuccess;

/* ---------- SIMPLE CONFETTI ---------- */
function runConfetti() {
  const cont = q('#confettiContainer');
  if (!cont) return;
  cont.innerHTML = '';
  const colors = ['#FFB6C1', '#FFD6E8', '#E6B8FF', '#FFDAB9', '#FF6B9D'];
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = '8px';
    el.style.height = '14px';
    el.style.left = (Math.random() * 80 + 10) + '%';
    el.style.top = '-10px';
    el.style.background = colors[i % colors.length];
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.style.opacity = '0.95';
    el.style.borderRadius = '3px';
    cont.appendChild(el);
    const fall = el.animate([
      { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(${200 + Math.random() * 120}px) rotate(${Math.random() * 720}deg)`, opacity: 0.9 }
    ], { duration: 1200 + Math.random() * 800, easing: 'cubic-bezier(.2,.8,.2,1)' });
    fall.onfinish = () => el.remove();
  }
}

/* ---------- CHAT ---------- */
const chatBox = q('#chatBox');
function toggleChat() {
  if (!chatBox) return;
  chatBox.classList.toggle('open');
}
window.toggleChat = toggleChat;

function openChat() {
  if (!chatBox) return;
  chatBox.classList.add('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const input = chatBox.querySelector('#chatInput');
  if (input) input.focus();
}
window.openChat = openChat;

function sendMessage() {
  const input = q('#chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const messages = q('#chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-message sent';
  div.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
  messages.appendChild(div);
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  setTimeout(() => {
    const reply = document.createElement('div');
    reply.className = 'chat-message received';
    reply.innerHTML = `<div class="message-content">Thanks for that! I'll get back to you shortly ✨</div>`;
    messages.appendChild(reply);
    messages.scrollTop = messages.scrollHeight;
  }, 800);
}
window.sendMessage = sendMessage;

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ---------- SMALL UX: close dialogs with Escape ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeCheckout();
    closeSuccess();
    if (cartDrawer && cartDrawer.classList.contains('open')) cartDrawer.classList.remove('open');
  }
});

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  renderCart();
});

/* ----------------------------
   Auth UI & behavior (injects controls + modals)
   ---------------------------- */
(function () {
  const USER_KEY = 'ec_user';

  function createAuthControls() {
    if (document.getElementById('authControls')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'authControls';
    wrapper.className = 'auth-controls';

    const loginBtn = document.createElement('button');
    loginBtn.className = 'auth-btn';
    loginBtn.textContent = 'Log in';
    loginBtn.addEventListener('click', showLoginModal);

    const signupBtn = document.createElement('button');
    signupBtn.className = 'auth-btn primary';
    signupBtn.textContent = 'Sign up';
    signupBtn.addEventListener('click', showSignupModal);

    const avatarWrap = document.createElement('div');
    avatarWrap.style.position = 'relative';
    avatarWrap.style.display = 'inline-flex';
    avatarWrap.style.alignItems = 'center';

    const avatar = document.createElement('button');
    avatar.className = 'account-avatar';
    avatar.setAttribute('aria-haspopup', 'true');
    avatar.setAttribute('aria-expanded', 'false');

    const menu = document.createElement('div');
    menu.className = 'account-menu';
    menu.id = 'accountMenu';

    const profileBtn = document.createElement('button');
    profileBtn.type = 'button';
    profileBtn.textContent = 'My Account';
    profileBtn.addEventListener('click', () => alert('Profile area — integrate with backend to show details.'));

    const ordersBtn = document.createElement('button');
    ordersBtn.type = 'button';
    ordersBtn.textContent = 'Orders';
    ordersBtn.addEventListener('click', () => alert('Orders — integrate with backend to list purchases.'));

    const signoutBtn = document.createElement('button');
    signoutBtn.type = 'button';
    signoutBtn.textContent = 'Sign out';
    signoutBtn.addEventListener('click', () => {
      localStorage.removeItem(USER_KEY);
      updateAuthUI();
      menu.classList.remove('open');
    });

    menu.appendChild(profileBtn);
    menu.appendChild(ordersBtn);
    menu.appendChild(signoutBtn);

    avatarWrap.appendChild(avatar);
    avatarWrap.appendChild(menu);

    avatar.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      avatar.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!avatarWrap.contains(e.target)) {
        menu.classList.remove('open');
        avatar.setAttribute('aria-expanded', 'false');
      }
    });

    wrapper.appendChild(loginBtn);
    wrapper.appendChild(signupBtn);
    wrapper.appendChild(avatarWrap);

    document.body.appendChild(wrapper);
    updateAuthUI();
  }

  function ensureAuthModals() {
    if (document.getElementById('loginModal')) return;

    const loginModal = document.createElement('div');
    loginModal.id = 'loginModal';
    loginModal.className = 'modal-backdrop auth-modal';
    loginModal.setAttribute('role', 'dialog');
    loginModal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="closeLoginModal()" aria-label="Close">×</button>
        <h2 style="margin-bottom:6px">Welcome back</h2>
        <p style="color:var(--color-text-secondary);margin-bottom:12px">Log in to access your templates and orders.</p>
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" type="email" required placeholder="you@email.com">
          </div>
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input id="loginPassword" type="password" required placeholder="••••••••">
          </div>
          <button class="btn btn-primary" type="submit">Log in</button>
        </form>
        <div class="auth-footer">Don't have an account? <button id="toSignupFromLogin" style="background:none;border:none;color:var(--color-accent-primary);font-weight:700;cursor:pointer">Sign up</button></div>
      </div>
    `;
    document.body.appendChild(loginModal);

    const signupModal = document.createElement('div');
    signupModal.id = 'signupModal';
    signupModal.className = 'modal-backdrop auth-modal';
    signupModal.setAttribute('role', 'dialog');
    signupModal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="closeSignupModal()" aria-label="Close">×</button>
        <h2 style="margin-bottom:6px">Create account</h2>
        <p style="color:var(--color-text-secondary);margin-bottom:12px">Sign up to save customizations and orders.</p>
        <form id="signupForm" class="auth-form">
          <div class="form-group">
            <label for="signupName">Full name</label>
            <input id="signupName" type="text" required placeholder="Your name">
          </div>
          <div class="form-group">
            <label for="signupEmail">Email</label>
            <input id="signupEmail" type="email" required placeholder="you@email.com">
          </div>
          <div class="form-group">
            <label for="signupPassword">Password</label>
            <input id="signupPassword" type="password" required placeholder="Choose a password">
          </div>
          <button class="btn btn-primary" type="submit">Create account</button>
        </form>
        <div class="auth-footer">Already have an account? <button id="toLoginFromSignup" style="background:none;border:none;color:var(--color-accent-primary);font-weight:700;cursor:pointer">Log in</button></div>
      </div>
    `;
    document.body.appendChild(signupModal);

    window.closeLoginModal = () => loginModal.classList.remove('active');
    window.closeSignupModal = () => signupModal.classList.remove('active');

    loginModal.querySelector('#toSignupFromLogin').addEventListener('click', () => {
      loginModal.classList.remove('active');
      signupModal.classList.add('active');
      setTimeout(() => signupModal.querySelector('#signupName').focus(), 60);
    });
    signupModal.querySelector('#toLoginFromSignup').addEventListener('click', () => {
      signupModal.classList.remove('active');
      loginModal.classList.add('active');
      setTimeout(() => loginModal.querySelector('#loginEmail').focus(), 60);
    });

    loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });
    signupModal.addEventListener('click', (e) => { if (e.target === signupModal) closeSignupModal(); });

    loginModal.querySelector('#loginForm').addEventListener('submit', handleLogin);
    signupModal.querySelector('#signupForm').addEventListener('submit', handleSignup);
  }

  function showLoginModal() {
    ensureAuthModals();
    document.getElementById('loginModal').classList.add('active');
    setTimeout(() => document.getElementById('loginEmail').focus(), 60);
  }
  window.showLoginModal = showLoginModal;

  function showSignupModal() {
    ensureAuthModals();
    document.getElementById('signupModal').classList.add('active');
    setTimeout(() => document.getElementById('signupName').focus(), 60);
  }
  window.showSignupModal = showSignupModal;

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!email || !pass) return alert('Please fill email and password');
    const user = { name: email.split('@')[0], email, created: Date.now() };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    document.getElementById('loginModal').classList.remove('active');
    updateAuthUI();
  }
  window.handleLogin = handleLogin;

  function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPassword').value.trim();
    if (!name || !email || !pass) return alert('Please complete the form');
    const user = { name, email, created: Date.now() };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    document.getElementById('signupModal').classList.remove('active');
    updateAuthUI();
  }
  window.handleSignup = handleSignup;

  function updateAuthUI() {
    ensureAuthModals();
    createAuthControls();
    const userRaw = localStorage.getItem(USER_KEY);
    const isLoggedIn = !!userRaw;
    const wrapper = document.getElementById('authControls');
    if (!wrapper) return;
    const loginBtn = wrapper.querySelector('.auth-btn:not(.primary)');
    const signupBtn = wrapper.querySelector('.auth-btn.primary');
    const avatar = wrapper.querySelector('.account-avatar');
    const menu = wrapper.querySelector('.account-menu');

    if (isLoggedIn) {
      const user = JSON.parse(userRaw);
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (avatar) {
        avatar.style.display = 'inline-flex';
        const initials = (user.name || user.email || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
        avatar.textContent = initials;
        avatar.setAttribute('aria-label', `Account of ${user.name || user.email}`);
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (signupBtn) signupBtn.style.display = 'inline-block';
      if (avatar) avatar.style.display = 'none';
      if (menu) menu.classList.remove('open');
    }
  }

  window.getCurrentUser = function () {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  };

  document.addEventListener('DOMContentLoaded', () => {
    createAuthControls();
    ensureAuthModals();
    updateAuthUI();
  });
})();
/* -------------------------
   Chat: history, timestamps, typing indicator
   Append to script.js
   ------------------------- */

(function() {
  const CHAT_KEY = 'ec_chat_history_v1';
  const TYPING_TIMEOUT = 1400; // ms - how long "typing" shows

  // helper to get messages container
  const messagesEl = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.querySelector('.chat-send-btn');

  // load history from localStorage
  function loadChatHistory() {
    if (!messagesEl) return;
    const raw = localStorage.getItem(CHAT_KEY);
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch(e) { list = []; }
    messagesEl.innerHTML = '';
    list.forEach(m => appendMessageDOM(m, false));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // save message to storage
  function saveMessage(msgObj) {
    const raw = localStorage.getItem(CHAT_KEY);
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch(e) { list = []; }
    list.push(msgObj);
    localStorage.setItem(CHAT_KEY, JSON.stringify(list));
  }

  // clear history helper (optional)
  window.clearChatHistory = function() {
    localStorage.removeItem(CHAT_KEY);
    if (messagesEl) messagesEl.innerHTML = '';
  };

  // build DOM node for message
  function appendMessageDOM(msg, persist = true) {
    if (!messagesEl) return;
    const el = document.createElement('div');
    el.className = 'chat-message ' + (msg.from === 'me' ? 'sent' : 'received');
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = escapeHtml(msg.text);

    // timestamp
    const ts = document.createElement('span');
    ts.className = 'timestamp';
    ts.textContent = formatTimestamp(msg.ts);
    content.appendChild(ts);

    el.appendChild(content);
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (persist) saveMessage(msg);
  }

  // format timestamp
  function formatTimestamp(ts) {
    const d = new Date(ts || Date.now());
    // show time only if today, else show date
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }

  // show typing indicator
  let typingEl = null;
  let typingTimer = null;
  function showTyping() {
    if (!messagesEl) return;
    if (!typingEl) {
      typingEl = document.createElement('div');
      typingEl.className = 'chat-message received';
      const wrap = document.createElement('div');
      wrap.className = 'message-content';
      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
      wrap.appendChild(indicator);
      typingEl.appendChild(wrap);
      messagesEl.appendChild(typingEl);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(hideTyping, TYPING_TIMEOUT);
  }

  function hideTyping() {
    if (typingEl && messagesEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  // improved sendMessage: persist & show ts
  const originalSend = window.sendMessage;
  window.sendMessage = function() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    updateSendBtnState();
    const msgObj = { from: 'me', text, ts: Date.now() };
    appendMessageDOM(msgObj, true);

    // simulate remote typing + reply
    setTimeout(() => {
      showTyping();
    }, 200);

    setTimeout(() => {
      hideTyping();
      const reply = { from: 'them', text: "Thanks — I'll respond shortly ✨", ts: Date.now() };
      appendMessageDOM(reply, true);
    }, 1200);
  };

  // enable/disable send button
  function updateSendBtnState() {
    if (!sendBtn || !chatInput) return;
    if (chatInput.value.trim()) {
      sendBtn.removeAttribute('disabled');
    } else {
      sendBtn.setAttribute('disabled', 'true');
    }
  }
  if (chatInput) {
    chatInput.addEventListener('input', updateSendBtnState);
    // enter to send (ctrl+enter for newline)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const btn = document.querySelector('.chat-send-btn');
        if (btn && !btn.hasAttribute('disabled')) btn.click();
      }
    });
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    updateSendBtnState();
  });

})();
/* -----------------------------
   Chat file upload support
   (append to script.js)
   ----------------------------- */

(function() {
  // ---------- CONFIG ----------
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // images only
  // If you have a server endpoint that accepts file uploads and returns { url: 'https://...' },
  // set it here. Otherwise leave null to use data-URLs (demo-only).
  const SERVER_UPLOAD_URL = null; // e.g. '/api/upload' or 'https://example.com/upload'
  
  // ---------- DOM ----------
  const chatBox = document.querySelector('.chat-box');
  const chatInputContainer = document.querySelector('.chat-input-container');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.querySelector('.chat-send-btn');
  
  if (!chatInputContainer || !chatMessages) return; // nothing to do
  
  // add hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = ALLOWED_MIME.join(',');
  fileInput.style.display = 'none';
  fileInput.id = 'chatFileInput';
  
  // attach button
  const attachWrap = document.createElement('div');
  attachWrap.className = 'chat-input-attach';
  const attachBtn = document.createElement('button');
  attachBtn.type = 'button';
  attachBtn.className = 'attach-btn';
  attachBtn.title = 'Attach image';
  attachBtn.innerHTML = '📎';
  attachWrap.appendChild(attachBtn);
  
  // insert attachWrap before the input (if possible)
  chatInputContainer.insertBefore(attachWrap, chatInputContainer.firstChild);
  document.body.appendChild(fileInput);
  
  // drag overlay
  const dragOverlay = document.createElement('div');
  dragOverlay.className = 'chat-drag-overlay';
  dragOverlay.textContent = 'Drop to attach';
  if (chatBox) chatBox.appendChild(dragOverlay);
  
  // small helpers
  function humanFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, e)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][e];
  }
  
  // show validation error
  function showUploadError(msg) {
    alert(msg);
  }
  
  // create a file message DOM & save to storage
  function appendFileMessage(fileMeta, from = 'me', persist = true) {
    // build DOM node
    const el = document.createElement('div');
    el.className = 'chat-message file ' + (from === 'me' ? 'sent' : 'received');
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // image preview if image
    if (fileMeta.mime && fileMeta.mime.startsWith('image/') && fileMeta.url) {
      const img = document.createElement('img');
      img.className = 'file-thumb';
      img.src = fileMeta.url;
      img.alt = fileMeta.name;
      content.appendChild(img);
    }
    
    const meta = document.createElement('div');
    meta.className = 'chat-file-meta';
    const nameEl = document.createElement('div');
    nameEl.className = 'file-name';
    nameEl.textContent = fileMeta.name;
    const sizeEl = document.createElement('div');
    sizeEl.className = 'file-size';
    sizeEl.textContent = `${humanFileSize(fileMeta.size)} • ${fileMeta.mime || ''}`;
    
    meta.appendChild(nameEl);
    meta.appendChild(sizeEl);
    
    // optional caption (we use message input as caption if filled)
    if (fileMeta.caption) {
      const caption = document.createElement('div');
      caption.className = 'file-caption';
      caption.textContent = fileMeta.caption;
      caption.style.marginTop = '8px';
      meta.appendChild(caption);
    }
    
    // timestamp
    const ts = document.createElement('span');
    ts.className = 'timestamp';
    ts.textContent = (new Date(fileMeta.ts || Date.now())).toLocaleString();
    meta.appendChild(ts);
    
    content.appendChild(meta);
    el.appendChild(content);
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // persist
    if (persist) {
      try {
        const raw = localStorage.getItem('ec_chat_history_v1');
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ from, type: 'file', file: fileMeta, ts: fileMeta.ts || Date.now() });
        localStorage.setItem('ec_chat_history_v1', JSON.stringify(arr));
      } catch (e) {
        console.warn('Could not persist file to localStorage', e);
      }
    }
  }
  
  // when a file is selected (or dropped)
  async function handleFile(file) {
    if (!file) return;
    // validate
    if (!ALLOWED_MIME.includes(file.type)) {
      return showUploadError('Unsupported file type. Please attach a JPEG/PNG/GIF/WebP image.');
    }
    if (file.size > MAX_FILE_SIZE) {
      return showUploadError('File too large. Max: ' + humanFileSize(MAX_FILE_SIZE));
    }
    
    // optional caption from input
    const captionText = chatInput && chatInput.value.trim() ? chatInput.value.trim() : '';
    
    // show a temporary "uploading" preview (small grey box)
    const placeholder = { name: file.name, size: file.size, mime: file.type, url: '', ts: Date.now(), caption: captionText };
    appendFileMessage(placeholder, 'me', false);
    
    // try server upload if configured
    if (SERVER_UPLOAD_URL) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(SERVER_UPLOAD_URL, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const json = await res.json();
        const fileUrl = json && json.url ? json.url : null;
        if (!fileUrl) throw new Error('No url returned from upload API');
        
        // update the last placeholder with actual url and persist
        // remove last placeholder DOM node (naive: last child)
        chatMessages.removeChild(chatMessages.lastChild);
        const meta = { name: file.name, size: file.size, mime: file.type, url: fileUrl, ts: Date.now(), caption: captionText };
        appendFileMessage(meta, 'me', true);
      } catch (err) {
        // remove placeholder and show error
        chatMessages.removeChild(chatMessages.lastChild);
        showUploadError('Upload failed. Please try again.');
        console.error(err);
      }
    } else {
      // no server — convert to data URL (warning heavy)
      const reader = new FileReader();
      reader.onload = function(ev) {
        // remove placeholder
        chatMessages.removeChild(chatMessages.lastChild);
        const url = ev.target.result;
        const meta = { name: file.name, size: file.size, mime: file.type, url, ts: Date.now(), caption: captionText };
        appendFileMessage(meta, 'me', true);
      };
      reader.onerror = function() {
        chatMessages.removeChild(chatMessages.lastChild);
        showUploadError('Could not read file.');
      };
      reader.readAsDataURL(file);
    }
    
    // clear caption input if any
    if (chatInput) chatInput.value = '';
    // update send button state if applicable
    if (sendBtn) sendBtn.setAttribute('disabled', 'true');
  }
  
  // file input change
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
    // clear input so selecting same file again triggers change
    fileInput.value = '';
  });
  
  // attach button triggers file input
  attachBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });
  
  // drag & drop
  let dragCounter = 0;
  ['dragenter', 'dragover'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const hasFile = e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
      if (!hasFile) return;
      e.preventDefault();
      dragCounter++;
      if (chatBox) chatBox.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const hasFile = e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
      if (!hasFile) return;
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0 && chatBox) chatBox.classList.remove('drag-over');
    });
  });
  
  // handle drop specifically on chatBox
  if (chatBox) {
    chatBox.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      const f = e.dataTransfer.files[0];
      handleFile(f);
    });
  }
  
  // load existing file messages (leave text messages to previous loader)
  // we will only render file messages that the main loader might have missed
  function renderExistingFiles() {
    try {
      const raw = localStorage.getItem('ec_chat_history_v1');
      if (!raw) return;
      const arr = JSON.parse(raw);
      // append file messages only if not already present in DOM
      const existingFileCount = chatMessages.querySelectorAll('.chat-message.file').length;
      const fileMsgs = arr.filter(m => m.type === 'file');
      // quick heuristic: if DOM has fewer file nodes than stored, append missing
      if (fileMsgs.length > existingFileCount) {
        fileMsgs.forEach(m => appendFileMessage(m.file, m.from || 'them', false));
      }
    } catch (e) {
      // ignore
    }
  }
  
  // on load render file messages after page ready
  document.addEventListener('DOMContentLoaded', () => {
    renderExistingFiles();
  });
  
})();