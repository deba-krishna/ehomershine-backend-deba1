// product.js — CRUD for products

const express = require("express");
const router = express.Router();
const path = require("path");
const supabase = require("./supabase");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/* ------------------------------
   ADMIN AUTH MIDDLEWARE
------------------------------ */
function requireAdmin(req, res, next) {
  const header = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET)
    return res.status(500).json({ error: "Missing ADMIN_SECRET" });
  
  if (!header || header !== ADMIN_SECRET)
    return res.status(401).json({ error: "Unauthorized" });
  
  next();
}

/* ------------------------------
   GET /api/products
------------------------------ */
router.get("/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    
    return res.json({ products: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------
   GET /api/products/:id
------------------------------ */
router.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error || !data)
      return res.status(404).json({ error: "Product not found" });
    
    return res.json({ product: data });
    
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------
   UPDATE PRODUCT
------------------------------ */
router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    
    const updateData = {};
    
    if (body.title) updateData.title = body.title;
    if (body.price) updateData.price = Number(body.price);
    if (body.old_price) updateData.old_price = Number(body.old_price);
    if (body.category) updateData.category = body.category;
    if (body.description) updateData.description = body.description;
    
    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    return res.json({ success: true, product: data });
    
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------
   DELETE PRODUCT
------------------------------ */
router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    
    if (error) return res.status(500).json({ error: error.message });
    
    return res.json({ success: true });
    
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;