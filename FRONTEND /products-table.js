/* products-table.js
   Loads real products from your backend API
   and provides them to script.js
*/

// Your backend URL (update ONLY if Render changes)
const API_BASE = "https://ehomershine-backend-deba1-13.onrender.com/api";

let PRODUCT_CACHE = [];

/* ---------------------------
   Fetch all products from backend
--------------------------- */
export async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) {
      console.error("Failed to fetch products:", res.status);
      return [];
    }
    
    const { products } = await res.json();
    
    // Convert backend format → frontend format
    PRODUCT_CACHE = products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      oldPrice: p.old_price || "",
      tags: p.tags || [],
      category: p.category || "general",
      thumbnail: p.thumbnail_url || "",
      gallery: p.gallery_urls || [],
      includes: p.includes || [],
      demoUrl: p.demo_url || "#"
    }));
    
    return PRODUCT_CACHE;
    
  } catch (err) {
    console.error("Error loading products:", err);
    return [];
  }
}

/* ---------------------------
   Get cached products
--------------------------- */
export function getProducts() {
  return PRODUCT_CACHE;
}