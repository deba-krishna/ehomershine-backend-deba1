// BACKEND/download.js
// Generates signed download URLs for product files

const express = require("express");
const router = express.Router();
const path = require("path");
const supabase = require("./supabase");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BUCKET = process.env.SUPABASE_BUCKET || "files";

/* ============================================================
   GET /api/download/:productId
   Returns signed download URLs for all files of a product
============================================================ */
router.get("/download/:productId", async (req, res) => {
    try {
        const productId = req.params.productId;
        
        // 1) Fetch product record
        const { data: product, error } = await supabase
            .from("products")
            .select("id, title, files")
            .eq("id", productId)
            .single();
        
        if (error || !product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        if (!product.files || !Array.isArray(product.files)) {
            return res.status(400).json({ error: "No files found for this product" });
        }
        
        // 2) Generate signed URLs for each file path
        const signedFiles = [];
        
        for (const file of product.files) {
            if (!file.path) continue;
            
            const { data: signed, error: signedErr } =
            await supabase.storage.from(BUCKET).createSignedUrl(file.path, 60 * 60 * 2); // 2 hours
            
            if (signedErr) {
                console.error("Signed URL error:", signedErr);
                continue;
            }
            
            signedFiles.push({
                name: file.filename || "file",
                url: signed.signedUrl,
            });
        }
        
        return res.json({
            productId,
            title: product.title,
            files: signedFiles,
        });
        
    } catch (err) {
        console.error("Download error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/* ============================================================
   OPTIONAL:
   Admin-only endpoint to list all files stored in bucket
   GET /api/admin/list-files
============================================================ */
router.get("/admin/list-files", (req, res) => {
    const header = req.headers["x-admin-secret"];
    if (!header || header !== ADMIN_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    
    supabase.storage
        .from(BUCKET)
        .list("", { recursive: true })
        .then(({ data, error }) => {
            if (error) return res.status(500).json({ error: "Listing failed" });
            res.json({ files: data });
        });
});

module.exports = router;