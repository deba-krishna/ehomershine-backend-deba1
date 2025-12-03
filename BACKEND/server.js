// BACKEND/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const uploadRoutes = require('./upload');
const downloadRoutes = require('./download');
const productsRoutes = require('./product'); // ← Correct file name

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ROUTES
app.use('/api/upload', uploadRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/products', productsRoutes);

// ROOT
app.get('/', (req, res) => {
  res.json({ status: 'ehomershine backend up' });
});

// START
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});