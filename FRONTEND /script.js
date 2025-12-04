import { loadProducts, getProducts } from "./products-table.js";

/* ---------- UTILITIES ---------- */
const q = sel => document.querySelector(sel);
const qAll = sel => Array.from(document.querySelectorAll(sel));
const formatCurrency = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* ---------- THEME ---------- */
const themeToggle = q("#themeToggle");
const body = document.body;
const THEMES = { LIGHT: "light-theme", DARK: "dark-theme" };

function applySavedTheme() {
  const saved = localStorage.getItem("ec_theme") || THEMES.LIGHT;
  body.classList.remove(THEMES.LIGHT, THEMES.DARK);
  body.classList.add(saved);
}
applySavedTheme();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    body.classList.toggle(THEMES.DARK);
    body.classList.toggle(THEMES.LIGHT);
    const active = body.classList.contains(THEMES.DARK)
      ? THEMES.DARK
      : THEMES.LIGHT;
    localStorage.setItem("ec_theme", active);
  });
}

/* ---------- PRODUCT DISPLAY ---------- */
let currentCategory = "all";
let currentQuery = "";
let currentSort = "featured";

const productGrid = q("#productGrid");
const searchInput = q("#searchInput");
const sortSelect = q("#sortSelect");
const chips = qAll(".chip");

function renderProducts(list = []) {
  if (!productGrid) return;

  productGrid.innerHTML = "";

  if (!list.length) {
    productGrid.innerHTML =
      `<p style="padding:20px;color:var(--color-text-secondary)">No templates found.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = p._id;

    const thumb = p.thumbnail || p.thumbnailUrl || "";
    const gallery = p.gallery || [];

    card.innerHTML = `
      <div class="product-badge">${p.tags?.[0] || ""}</div>
      <img class="product-thumbnail" src="${thumb}" alt="${p.title}">
      <div class="product-info">
        <div class="product-title">${p.title}</div>
        <div class="product-tags">
          ${(p.tags || []).map(t => `<span class="product-tag">${t}</span>`).join("")}
        </div>
        <div class="product-price-group">
          <div class="product-price">${formatCurrency(p.price)}</div>
          <div class="product-old-price">
            ${p.oldPrice ? formatCurrency(p.oldPrice) : ""}
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openProductModal(p._id));
    frag.appendChild(card);
  });

  productGrid.appendChild(frag);
}

function applyFilters() {
  let list = getProducts().slice();

  if (currentCategory !== "all") {
    list = list.filter(
      p => p.category === currentCategory || (p.tags || []).includes(currentCategory)
    );
  }

  if (currentQuery.trim()) {
    const qlow = currentQuery.toLowerCase();
    list = list.filter((p) =>
      (p.title + " " + (p.tags || []).join(" ") + " " + (p.includes || []).join(" "))
        .toLowerCase()
        .includes(qlow)
    );
  }

  if (currentSort === "price-low") list.sort((a, b) => a.price - b.price);
  else if (currentSort === "price-high") list.sort((a, b) => b.price - a.price);

  renderProducts(list);
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentQuery = e.target.value;
    applyFilters();
  });
}

if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    applyFilters();
  });
}

if (chips.length) {
  chips.forEach((ch) => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      ch.classList.add("active");
      currentCategory = ch.dataset.category || "all";
      applyFilters();
    });
  });
}

/* ---------- PRODUCT MODAL ---------- */
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
  const p = getProducts().find((x) => x._id === id);
  if (!p) return;

  currentProduct = p;
  currentImageIndex = 0;

  modalTitle.textContent = p.title;
  modalPrice.textContent = formatCurrency(p.price);
  modalOldPrice.textContent = p.oldPrice ? formatCurrency(p.oldPrice) : "";
  modalTags.innerHTML = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
  modalIncludes.innerHTML = (p.includes || []).map(i => `<li>${i}</li>`).join("");

  renderModalGallery(p.gallery || []);

  productModal.classList.add("active");
}

function renderModalGallery(photos = []) {
  modalThumbnails.innerHTML = "";
  if (!photos.length) {
    modalMainImage.src = currentProduct.thumbnail;
    return;
  }

  modalMainImage.src = photos[0];

  photos.forEach((src, idx) => {
    const img = document.createElement("img");
    img.src = src;
    if (idx === 0) img.classList.add("active");

    img.addEventListener("click", () => {
      modalThumbnails.querySelectorAll("img").forEach(i => i.classList.remove("active"));
      img.classList.add("active");
      modalMainImage.src = src;
      currentImageIndex = idx;
    });

    modalThumbnails.appendChild(img);
  });
}

window.closeModal = () => productModal.classList.remove("active");

/* ---------- CART ---------- */
const cartDrawer = q("#cartDrawer");
const cartButton = q("#cartButton");
const cartBadge = q("#cartBadge");
const cartItemsEl = q("#cartItems");
const cartEmptyEl = q("#cartEmpty");
const cartSubtotalEl = q("#cartSubtotal");
const cartFeeEl = q("#cartFee");
const cartTotalEl = q("#cartTotal");

let cart = JSON.parse(localStorage.getItem("ec_cart") || "[]");

function saveCart() {
  localStorage.setItem("ec_cart", JSON.stringify(cart));
}

window.toggleCart = () => cartDrawer.classList.toggle("open");

if (cartButton) cartButton.addEventListener("click", window.toggleCart);

window.addToCartFromModal = () => {
  if (!currentProduct) return;
  addToCart(currentProduct._id);
  cartDrawer.classList.add("open");
};

function addToCart(id) {
  const existing = cart.find((c) => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ id, qty: 1 });

  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  saveCart();
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find((c) => c.id === id);
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function renderCart() {
  cartItemsEl.innerHTML = "";

  if (!cart.length) {
    cartEmptyEl.classList.add("show");
    q("#cartFooter").style.display = "none";
  } else {
    cartEmptyEl.classList.remove("show");
    q("#cartFooter").style.display = "block";

    cart.forEach((ci) => {
      const prod = getProducts().find((p) => p._id === ci.id);
      if (!prod) return;

      const div = document.createElement("div");
      div.className = "cart-item";

      div.innerHTML = `
        <img src="${prod.thumbnail}" />
        <div class="cart-item-info">
          <div class="cart-item-title">${prod.title}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-minus>-</button>
            <div>${ci.qty}</div>
            <button class="qty-btn" data-plus>+</button>
          </div>
        </div>
        <div style="text-align:right">
          <strong>${formatCurrency(prod.price * ci.qty)}</strong>
          <button class="qty-btn remove-btn">✕</button>
        </div>
      `;

      div.querySelector("[data-minus]").addEventListener("click", () =>
        changeQty(ci.id, -1)
      );
      div.querySelector("[data-plus]").addEventListener("click", () =>
        changeQty(ci.id, 1)
      );
      div.querySelector(".remove-btn").addEventListener("click", () =>
        removeFromCart(ci.id)
      );

      cartItemsEl.appendChild(div);
    });
  }

  const subtotal = cart.reduce((sum, ci) => {
    const prod = getProducts().find((p) => p._id === ci.id);
    return sum + prod.price * ci.qty;
  }, 0);

  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;

  cartSubtotalEl.textContent = formatCurrency(subtotal);
  cartFeeEl.textContent = formatCurrency(fee);
  cartTotalEl.textContent = formatCurrency(total);
  cartBadge.textContent = cart.reduce((s, c) => s + c.qty, 0);
}

/* ---------- CHECKOUT ---------- */
const checkoutModal = q("#checkoutModal");

window.openCheckout = () => {
  const subtotal = cart.reduce((s, ci) => {
    const p = getProducts().find((x) => x._id === ci.id);
    return s + p.price * ci.qty;
  }, 0);

  const fee = Math.round(subtotal * 0.02);
  const total = subtotal + fee;

  q("#checkoutTotal").textContent = formatCurrency(total);
  checkoutModal.classList.add("active");
};

window.closeCheckout = () => checkoutModal.classList.remove("active");

window.handleCheckout = (e) => {
  e.preventDefault();
  if (!cart.length) return alert("Your cart is empty.");

  q("#orderId").textContent =
    "EC" + Math.floor(Math.random() * 900000 + 100000);
  q("#confirmEmail").textContent = q("#customerEmail").value;

  checkoutModal.classList.remove("active");
  q("#successModal").classList.add("active");

  cart = [];
  saveCart();
  renderCart();
};

/* ---------- SUCCESS MODAL ---------- */
window.closeSuccess = () =>
  q("#successModal").classList.remove("active");

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();      // ⬅️ fetch backend products
  renderProducts(getProducts());
  renderCart();
});