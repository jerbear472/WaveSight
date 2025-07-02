
// index.js - Full Feature Elegant Server for WaveSight
// Replit Compatible | Modular Structure | Supabase Integrated

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Env Variables
const { YOUTUBE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache Setup
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    time: new Date().toISOString(),
    youtube_api: !!YOUTUBE_API_KEY,
    supabase: !!SUPABASE_URL
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
});

