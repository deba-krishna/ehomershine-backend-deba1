/* ============================================
   FRONTEND SCRIPT — FIXED + BACKEND READY
   ============================================ */

/* ===========
   CONFIG
   =========== */
const EC = window.EC_CONFIG || {};
const BACKEND_BASE = EC.BACKEND_BASE || "";
const API_PRODUCTS = BACKEND_BASE + (EC.API_PRODUCTS_ENDPOINT || "/api/products");

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
    thumbnail: p.thumbnail,
    gallery: gallery.length ? gallery : [p.thumbnail],
    tags: p.tags || [],
    includes: p.includes || []
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
  modalMainImage.src = images[0];
  
  images.forEach((src, i) => {
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
  const images = currentProduct.gallery;
  currentImageIndex = (currentImageIndex + 1) % images.length;
  modalMainImage.src = images[currentImageIndex];
  highlightThumb(currentImageIndex);
}
window.nextImage = nextImage;

function prevImage() {
  const images = currentProduct.gallery;
  currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
  modalMainImage.src = images[currentImageIndex];
  highlightThumb(currentImageIndex);
}
window.prevImage = prevImage;

/* ===========
   CART SYSTEM (unchanged)
   =========== */
/* — YOUR CART CODE REMAINS EXACTLY SAME —
   It is long and correct, so I am not repeating it here.
   No changes were required.
*/

/* ===========
   INIT
   =========== */
async function init() {
  const remote = await fetchProductsFromBackend();
  products = remote.length ? remote : [];
  
  renderProducts(products);
}

document.addEventListener("DOMContentLoaded", init);