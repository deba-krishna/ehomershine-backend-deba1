// BACKEND/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// route files (ensure these exist in BACKEND/)
const uploadRoutes = require('./upload'); // handles POST /api/upload
const downloadRoutes = require('./download'); // handles GET /api/download/:productId
const productsRoutes = require('./product'); // handles /api/products

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - set FRONTEND_ORIGIN to your frontend URL in production
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret', 'Authorization']
}));

// Increase payload limits for file uploads encoded in base64
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// mount API routes under /api
app.use('/api', uploadRoutes);
app.use('/api', downloadRoutes);
app.use('/api', productsRoutes);

// health check root
app.get('/', (req, res) => {
  res.json({ status: 'ehomershine backend up', environment: process.env.NODE_ENV || 'development' });
});

// start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});