// BACKEND/upload.js
// Secure product upload API for admin panel — uploads files to Supabase Storage
// Accepts either JSON (base64) or multipart/form-data file uploads.

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const supabase = require("./supabase");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BUCKET = process.env.SUPABASE_BUCKET || "files";
const TMP_DIR = path.resolve(__dirname, "../tmp_uploads");

// ensure tmp dir exists (used by multer fallback)
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// multer: fallback for browser form uploads (not required if admin UI sends base64)
const upload = multer({ dest: TMP_DIR, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB cap

/* ---------------------------
   Helpers
--------------------------- */
function getMimeType(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    mp4: "video/mp4", mp3: "audio/mpeg", zip: "application/zip",
    pdf: "application/pdf", txt: "text/plain", html: "text/html",
    json: "application/json",
  };
  return map[ext] || "application/octet-stream";
}

function buildPublicUrl(supabaseUrl, bucket, filePath) {
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(filePath)}`;
}

function requireAdmin(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET) {
    console.warn("ADMIN_SECRET not set in environment — rejecting admin calls");
    return res.status(500).json({ error: "Server misconfiguration: ADMIN_SECRET not set" });
  }
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized: invalid admin secret" });
  }
  next();
}

/* ---------------------------
   Upload route
   POST / (mounted under /api/upload)
--------------------------- */
router.post("/", requireAdmin, upload.any(), async (req, res) => {
  try {
    const body = req.body || {};
    const title = (body.title || "").toString().trim();
    const price = Number(body.price || 0);
    const old_price = body.old_price ? Number(body.old_price) : null;
    const category = (body.category || "").toString().trim();
    const description = (body.description || "").toString().trim();

    const incomingFiles = [];

    // A) JSON base64 files (common for admin UI)
    if (body.files) {
      let parsedFiles = [];
      if (typeof body.files === "string") {
        try { parsedFiles = JSON.parse(body.files); } catch (e) { parsedFiles = []; }
      } else parsedFiles = body.files;

      if (Array.isArray(parsedFiles)) {
        for (const f of parsedFiles) {
          if (!f || !f.filename || !f.base64) continue;
          const buffer = Buffer.from(f.base64, "base64");
          incomingFiles.push({
            filename: f.filename,
            buffer,
            mimeType: getMimeType(f.filename)
          });
        }
      }
    }

    // B) multer files (multipart/form-data)
    if (Array.isArray(req.files) && req.files.length > 0) {
      for (const mf of req.files) {
        try {
          const buffer = fs.readFileSync(mf.path);
          incomingFiles.push({
            filename: mf.originalname || mf.filename || mf.path.split(path.sep).pop(),
            buffer,
            mimeType: mf.mimetype || getMimeType(mf.originalname)
          });
        } catch (e) {
          console.warn("Could not read multer file:", mf.path, e);
        } finally {
          try { fs.unlinkSync(mf.path); } catch (e) {}
        }
      }
    }

    // validate
    if (!title || !price || !category || incomingFiles.length === 0) {
      return res.status(400).json({ error: "Missing required fields. Required: title, price (>0), category, files" });
    }

    const uploadedFiles = [];
    const SUPABASE_URL = process.env.SUPABASE_URL || null;

    for (const f of incomingFiles) {
      const safeName = (f.filename || "file").replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const uniqName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
      const filePath = `products/${uniqName}`;

      // Upload buffer to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, f.buffer, {
          contentType: f.mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase upload error for", f.filename, uploadError);
        return res.status(500).json({ error: "Failed to upload file to storage", detail: uploadError.message || uploadError });
      }

      // Attempt to get public URL
      let publicUrl = null;
      try {
        const publicObj = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        if (publicObj && publicObj.data && (publicObj.data.publicUrl || publicObj.data.publicURL)) {
          publicUrl = publicObj.data.publicUrl || publicObj.data.publicURL;
        } else if (publicObj && (publicObj.publicUrl || publicObj.publicURL)) {
          publicUrl = publicObj.publicUrl || publicObj.publicURL;
        } else {
          publicUrl = buildPublicUrl(SUPABASE_URL, BUCKET, filePath);
        }
      } catch (e) {
        publicUrl = buildPublicUrl(SUPABASE_URL, BUCKET, filePath);
      }

      uploadedFiles.push({
        filename: f.filename,
        url: publicUrl,
        path: filePath,
        mimeType: f.mimeType
      });
    }

    // Insert product row in DB
    const { data, error } = await supabase
      .from("products")
      .insert({
        title,
        price,
        old_price,
        category,
        description,
        thumbnail: uploadedFiles[0]?.url || null,
        files: uploadedFiles
      })
      .select();

    if (error) {
      console.error("DB insert error:", error);
      return res.status(500).json({ error: "Failed to save product in database", detail: error.message || error });
    }

    return res.json({
      success: true,
      product: data && data[0] ? data[0] : null
    });

  } catch (err) {
    console.error("Upload route error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message || err });
  }
});

module.exports = router;