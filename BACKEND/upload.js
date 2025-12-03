// BACKEND/upload.js
// Secure product upload API for admin panel — uploads files to Supabase Storage
// and creates product entry in the database.

const express = require("express");
const router = express.Router();
const supabase = require("./supabase"); // admin client
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BUCKET = "files"; // Your Supabase bucket name

//--------------------------------------------
// ADMIN AUTH MIDDLEWARE
//--------------------------------------------
router.use("/upload", (req, res, next) => {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized: Invalid admin token" });
  }
  next();
});

//--------------------------------------------
// MIME TYPE DETECTOR
//--------------------------------------------
function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    zip: "application/zip",
    pdf: "application/pdf",
    txt: "text/plain",
    html: "text/html",
    json: "application/json",
  };
  
  return types[ext] || "application/octet-stream";
}

//--------------------------------------------
// MAIN UPLOAD ROUTE
//--------------------------------------------
router.post("/upload", async (req, res) => {
  try {
    const { title, price, old_price, category, description, files } = req.body;
    
    if (!title || !price || !category || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const uploadedFiles = [];
    
    //--------------------------------------------
    // UPLOAD EACH FILE TO SUPABASE STORAGE
    //--------------------------------------------
    for (const file of files) {
      const { filename, base64 } = file;
      
      if (!filename || !base64) continue;
      
      const fileBuffer = Buffer.from(base64, "base64");
      const mimeType = getMimeType(filename);
      
      // Store file under products/<timestamp>/
      const filePath = `products/${Date.now()}-${filename}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });
      
      if (uploadError) {
        console.error("Upload Error:", uploadError);
        return res.status(500).json({ error: "Upload failed", details: uploadError.message });
      }
      
      const { data: publicURL } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);
      
      uploadedFiles.push({
        filename,
        url: publicURL.publicUrl,
        path: filePath,
        mimeType,
      });
    }
    
    //--------------------------------------------
    // INSERT PRODUCT INTO DATABASE
    //--------------------------------------------
    const { data, error } = await supabase
      .from("products")
      .insert({
        title,
        price,
        old_price,
        category,
        description,
        thumbnail: uploadedFiles[0]?.url || null, // First uploaded file as preview
        files: uploadedFiles,
      })
      .select();
    
    if (error) {
      console.error("DB Insert Error:", error);
      return res.status(500).json({ error: "Failed to save product", details: error.message });
    }
    
    return res.json({
      success: true,
      message: "Product uploaded successfully",
      product: data[0],
    });
  } catch (err) {
    console.error("Server Upload Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;