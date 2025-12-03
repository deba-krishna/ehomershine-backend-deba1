// BACKEND/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const uploadRoutes = require('./upload');
const downloadRoutes = require('./download');
// If your file is named product.js use './product'
// If it's products.js use './products'
const productsRoutes = require('./product');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS from your frontend origin(s)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Mount API routes under /api
app.use('/api/upload', uploadRoutes); // upload routes listen under /api/upload
app.use('/api/download', downloadRoutes); // download routes listen under /api/download
app.use('/api/products', productsRoutes); // products routes listen under /api/products

// basic root / health
app.get('/', (req, res) => {
  res.json({ status: 'ehomershine backend up', environment: process.env.NODE_ENV || 'development' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});