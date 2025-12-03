// BACKEND/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const uploadRoutes = require('./upload');
const downloadRoutes = require('./download');
const productsRoutes = require('./products'); // <-- matches your file BACKEND/products.js

const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS from your frontend origin(s)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret', 'Authorization']
}));

// Increase body parser limits to accept large base64 uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
// Note: each file's routes are defined with local paths (e.g. in products.js routes use '/products' etc).
app.use('/api/upload', uploadRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api', productsRoutes); // productsRoutes already defines /products and /products/:id etc

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ehomershine backend up', environment: process.env.NODE_ENV || 'development' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});