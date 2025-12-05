// server.js
// Express server with Supabase + product routes

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

/* ---------------------
   CORS
--------------------- */
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));

/* ---------------------
   SUPABASE CONNECTION
--------------------- */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("❌ Missing Supabase env vars!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ---------------------
   MULTER (FILE UPLOAD)
--------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }
});

const UPLOAD_BUCKET = process.env.SUPABASE_BUCKET_UPLOADS || "orders-uploads";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "your_admin_secret";

/* ---------------------
   HEALTH CHECK
--------------------- */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API Running" });
});

/* ---------------------
   PRODUCT ROUTES
--------------------- */
const productRoutes = require("./product");
app.use("/api", productRoutes);

/* ---------------------
   UPLOAD IMAGE
--------------------- */
app.post("/api/orders/upload-image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 9);
    const safe = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `orders/${ts}-${rand}-${safe}`;
    
    const { data, error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const { data: publicData } = supabase.storage
      .from(UPLOAD_BUCKET)
      .getPublicUrl(path);
    
    return res.json({ success: true, fileUrl: publicData.publicUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------
   CREATE ORDER
--------------------- */
app.post("/api/orders/create", async (req, res) => {
  try {
    const body = req.body || {};
    
    const payload = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      note: body.note,
      items: body.items || [],
      reference_images: body.referenceImages || [],
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from("orders").insert([payload]);
    
    if (error) return res.status(500).json({ error: "Failed to create order" });
    
    res.json({ success: true, order: data[0] });
    
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------
   START SERVER
--------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🔥 Server running on port ${PORT}`)
);