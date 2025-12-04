// BACKEND/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

const uploadRouter = require("./upload");
const productsRouter = require("./product");
const downloadRouter = require("./download");

const app = express();

/* ------------------------------
   CORS — SAFE FOR PRODUCTION
------------------------------ */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-admin-secret"],
  })
);

app.use(bodyParser.json({ limit: "250mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "250mb" }));

/* ------------------------------
   HEALTH CHECK
------------------------------ */
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "eHomerShine backend running" });
});

/* ------------------------------
   API ROUTES
------------------------------ */
app.use("/api/upload", uploadRouter);
app.use("/api/products", productsRouter);
app.use("/api/download", downloadRouter);

/* ------------------------------
   ERROR HANDLER
------------------------------ */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

/* ------------------------------
   START SERVER
------------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✔ Backend running on port ${PORT}`);
});