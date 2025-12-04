// BACKEND/supabase.js
// Server-side Supabase admin client (service role). For server-only usage.

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE env vars. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env or Render env.');
  process.exit(1);
}

// create admin client — do NOT expose this file / key to the browser
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = supabaseAdmin;