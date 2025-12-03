// BACKEND/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const uploadRoutes = require('./upload');
const downloadRoutes = require('./download');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS from your frontend origin(s)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-secret']
}));

app.use(bodyParser.json({ limit: '50mb' }));

// Mount API routes under /api
app.use('/api', uploadRoutes);
app.use('/api', downloadRoutes);

// health check
app.get('/', (req, res) => {
  res.json({ status: 'ehomershine backend up', environment: process.env.NODE_ENV || 'development' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
const productsRoutes = require('./products');
// ...
app.use('/api', uploadRoutes);
app.use('/api', downloadRoutes);
app.use('/api', productsRoutes);