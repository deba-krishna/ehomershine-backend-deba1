// BACKEND/products.js
// Admin-protected product management routes for listing / editing / deleting products

const express = require('express');
const router = express.Router();
const supabase = require('./supabase');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/* --------------------------------------------------
   PUBLIC ROUTES
-------------------------------------------------- */

// Public: List all products (frontend + admin)
router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, title, price, old_price, category, description, thumbnail, files, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Products list error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    
    return res.json({ success: true, products: data });
  } catch (err) {
    console.error('Products GET error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Public: fetch single product
router.get('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    return res.json({ success: true, product: data });
  } catch (err) {
    console.error('Product fetch error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* --------------------------------------------------
   ADMIN MIDDLEWARE
-------------------------------------------------- */

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: invalid admin secret' });
  }
  next();
}

/* --------------------------------------------------
   ADMIN: UPDATE PRODUCT
-------------------------------------------------- */

router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    
    const allowed = ['title', 'price', 'old_price', 'category', 'description', 'thumbnail', 'files'];
    const updateData = {};
    
    allowed.forEach(key => {
      if (payload[key] !== undefined) updateData[key] = payload[key];
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Product update error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }
    
    return res.json({ success: true, product: data[0] });
  } catch (err) {
    console.error('Products PUT error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* --------------------------------------------------
   ADMIN: DELETE PRODUCT
-------------------------------------------------- */

router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Fetch product to get file URLs
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, files')
      .eq('id', id)
      .single();
    
    if (fetchErr || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Parse file storage paths from public URLs
    let storagePaths = [];
    
    if (Array.isArray(product.files)) {
      storagePaths = product.files
        .map(f => f?.url?.split('/object/public/files/')[1])
        .filter(Boolean); // remove undefined/null
    }
    
    // Delete files from storage
    if (storagePaths.length > 0) {
      const { error: removeErr } = await supabase
        .storage
        .from('files')
        .remove(storagePaths);
      
      if (removeErr) {
        console.warn('Warning: Could not remove some files:', removeErr);
        // Continue DB deletion anyway
      }
    }
    
    // Delete DB product
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Product delete error:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    
    return res.json({ success: true, deleted: data.length });
  } catch (err) {
    console.error('Products DELETE error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;