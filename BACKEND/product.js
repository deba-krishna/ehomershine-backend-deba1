// BACKEND/product.js
// CRUD for products (list, get single, update, delete)

const express = require("express");
const router = express.Router();
const path = require("path");
const supabase = require("./supabase");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Admin security middleware
function requireAdmin(req, res, next) {
  const header = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET) {
    return res.status(500).json({ error: "Server missing ADMIN_SECRET" });
  }
  if (!header || header !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized: invalid admin secret" });
  }
  next();
}

/* ============================================================
   GET /api/products
   Return all products
============================================================ */
router.get("/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("DB list error:", error);
      return res.status(500).json({ error: "Failed to fetch products" });
    }
    
    return res.json({ products: data || [] });
  } catch (err) {
    console.error("Products list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
   GET /api/products/:id
   Return one product
============================================================ */
router.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    return res.json({ product: data });
  } catch (err) {
    console.error("Single product fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
   PUT /api/products/:id
   Update product (admin only)
============================================================ */
router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    
    const payload = {};
    
    if (body.title !== undefined) payload.title = body.title.trim();
    if (body.price !== undefined) payload.price = Number(body.price);
    if (body.old_price !== undefined) payload.old_price = Number(body.old_price);
    if (body.category !== undefined) payload.category = body.category.trim();
    if (body.description !== undefined) payload.description = body.description.trim();
    
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      console.error("Product update error:", error);
      return res
        .status(500)
        .json({ error: "Failed to update product", detail: error.message });
    }
    
    return res.json({ success: true, product: data });
  } catch (err) {
    console.error("Update exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
   DELETE /api/products/:id
   Admin delete product
============================================================ */
router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get product first
    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("id, files")
      .eq("id", id)
      .single();
    
    if (fetchErr || !product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Remove files from bucket
    const BUCKET = process.env.SUPABASE_BUCKET || "files";
    if (Array.isArray(product.files)) {
      for (const f of product.files) {
        if (f.path) {
          await supabase.storage.from(BUCKET).remove([f.path]);
        }
      }
    }
    
    // Delete product row
    const { error } = await supabase.from("products").delete().eq("id", id);
    
    if (error) {
      console.error("DB delete error:", error);
      return res.status(500).json({ error: "Failed to delete product" });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;