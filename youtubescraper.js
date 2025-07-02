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

// === MODULE: YOUTUBE FETCHER ===
async function fetchYouTubeVideos(query = 'trending', maxResults = 20) {
  const cacheKey = `${query}_${maxResults}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=relevance&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(`YouTube API Error: ${data.error?.message}`);

  apiCache.set(cacheKey, { timestamp: Date.now(), data });
  return data.items || [];
}

// === MODULE: CATEGORIZATION ===
const CATEGORY_KEYWORDS = {
  'AI Tools': ['ai', 'chatgpt', 'openai', 'machine learning'],
  'Crypto': ['bitcoin', 'crypto', 'ethereum', 'blockchain'],
  'Gaming': ['game', 'gaming', 'esports', 'twitch'],
  'Music': ['music', 'song', 'artist', 'concert'],
  'Fitness': ['fitness', 'health', 'workout', 'diet'],
  'Fashion': ['fashion', 'style', 'makeup'],
  'Education': ['education', 'tutorial', 'learn', 'course'],
  'Finance': ['finance', 'stock', 'investing'],
  'Entertainment': ['movie', 'tv', 'celebrity', 'trailer'],
  'General': []
};

function categorize(title = '', description = '') {
  const content = `${title} ${description}`.toLowerCase();
  let best = 'General', score = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(k => content.includes(k)).length;
    if (matches > score) [best, score] = [cat, matches];
  }
  return best;
}

// === MODULE: TREND SCORE CALCULATION ===
function calculateTrendScore(views, likes, comments) {
  const engagement = (likes + comments) / Math.max(views, 1);
  return Math.round(Math.min(100, 50 + engagement * 1000));
}

// === MODULE: HISTORICAL VARIANT GENERATOR ===
function generateVariants(item, count = 5) {
  const variants = [];
  const baseViews = Math.max(parseInt(item.statistics?.viewCount) || 10000, 1000);
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 900);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const growth = 0.2 + i * 0.15;
    const views = Math.floor(baseViews * growth);
    const likes = Math.floor(views * 0.05);
    const comments = Math.floor(views * 0.01);
    variants.push({
      video_id: `${item.id.videoId}_v${i}`,
      title: item.snippet.title,
      description: item.snippet.description,
      published_at: date.toISOString(),
      channel_id: item.snippet.channelId,
      channel_title: item.snippet.channelTitle,
      view_count: views,
      like_count: likes,
      comment_count: comments,
      trend_score: calculateTrendScore(views, likes, comments),
      trend_category: categorize(item.snippet.title, item.snippet.description)
    });
  }
  return variants;
}

// === MODULE: SUPABASE INSERT ===
async function saveToSupabase(records) {
  const { data, error } = await supabase
    .from('youtube_trends')
    .upsert(records, { onConflict: 'video_id' })
    .select();
  if (error) throw error;
  return data;
}

// === MODULE: INSIGHT BUILDER ===
function buildInsights(videos) {
  const grouped = {};
  for (const v of videos) {
    if (!grouped[v.trend_category]) grouped[v.trend_category] = [];
    grouped[v.trend_category].push(v);
  }
  return Object.entries(grouped).map(([category, vids]) => {
    const totalViews = vids.reduce((s, v) => s + v.view_count, 0);
    const totalLikes = vids.reduce((s, v) => s + v.like_count, 0);
    const totalComments = vids.reduce((s, v) => s + v.comment_count, 0);
    const avgScore = vids.reduce((s, v) => s + v.trend_score, 0) / vids.length;
    return {
      trend_name: category,
      category,
      total_videos: vids.length,
      total_reach: totalViews,
      engagement_rate: ((totalLikes + totalComments) / Math.max(totalViews, 1) * 100).toFixed(2),
      trend_score: Math.round(avgScore),
      top_video_title: vids[0]?.title,
      analysis_date: new Date().toISOString()
    };
  });
}

async function saveInsights(insights) {
  const { error } = await supabase.from('trend_insights').upsert(insights, { onConflict: 'trend_name,analysis_date' });
  if (error) throw error;
}

// === ROUTES ===
app.get('/api/fetch-youtube', async (req, res) => {
  try {
    const q = req.query.q || 'trending';
    const raw = await fetchYouTubeVideos(q, 10);
    const enriched = raw.flatMap(video => generateVariants(video, 5));
    const saved = await saveToSupabase(enriched);
    res.json({ success: true, saved_count: saved.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/trend-insights', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('youtube_trends')
      .select('*')
      .gte('published_at', new Date(Date.now() - 7 * 86400000).toISOString());
    if (error) throw error;
    const insights = buildInsights(data);
    await saveInsights(insights);
    res.json({ success: true, insights });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
