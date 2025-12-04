// BACKEND/supabase.js
// Secure Supabase admin client (service_role key)
// IMPORTANT: This file must NEVER be exposed to frontend.

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safety check — prevents server from running with missing env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("\n❌ ERROR: Missing Supabase environment variables.\n");
  console.error("Ensure `.env` or Render Environment has:");
  console.error("  SUPABASE_URL=");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=\n");
  process.exit(1);
}

// Create secure admin client
// DO NOT enable auth session persistence on backend for security
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = supabase;