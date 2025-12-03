// BACKEND/download.js
// Generates secure signed URLs for purchased product files.

const express = require("express");
const router = express.Router();
const supabase = require("./supabase");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Signed URL active time: 2 hours (7200 seconds)
const EXPIRES_IN = 60 * 60 * 2;

/**
 * GET /api/download/:productId
 * Returns signed URLs for every file in the product.
 */
router.get("/download/:productId", async (req, res) => {
    try {
        const productId = req.params.productId;
        
        if (!productId) {
            return res.status(400).json({ error: "Missing product ID" });
        }
        
        // Fetch product from database
        const { data: product, error: dbError } = await supabase
            .from("products")
            .select("id, title, files")
            .eq("id", productId)
            .single();
        
        if (dbError || !product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        if (!product.files || product.files.length === 0) {
            return res.status(404).json({ error: "No files attached to this product" });
        }
        
        const BUCKET = "files";
        const signedUrls = [];
        
        for (const file of product.files) {
            const filePath = file.path; // Stored in DB from upload.js
            
            if (!filePath) continue;
            
            const { data: signed, error: signedError } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(filePath, EXPIRES_IN);
            
            if (signedError) {
                console.error("Signed URL creation error:", signedError);
                continue;
            }
            
            signedUrls.push({
                filename: file.filename,
                url: signed.signedUrl,
                expiresIn: EXPIRES_IN
            });
        }
        
        if (signedUrls.length === 0) {
            return res.status(500).json({ error: "Unable to generate download links" });
        }
        
        return res.json({
            success: true,
            productId: product.id,
            title: product.title,
            downloads: signedUrls
        });
        
    } catch (err) {
        console.error("Download error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;