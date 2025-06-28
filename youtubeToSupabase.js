
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Configuration
const YOUTUBE_API_KEY = 'AIzaSyArP42EedqSSuYhKBA5fsPQPSdGyWxFtc4';
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// YouTube API functions
async function fetchYouTubeVideos(query = 'trending', maxResults = 50) {
  try {
    console.log(`🔍 Fetching YouTube data for query: "${query}" (max ${maxResults} results)`);

    // First, get search results
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=relevance&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`YouTube Search API error: ${searchResponse.status} - ${searchResponse.statusText}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log('⚠️ No YouTube videos found for query');
      return [];
    }

    console.log(`📋 Found ${searchData.items.length} videos, fetching detailed statistics...`);

    // Get video IDs for detailed stats
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    
    // Fetch detailed video statistics
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    
    const statsResponse = await fetch(statsUrl);
    const statsData = statsResponse.ok ? await statsResponse.json() : { items: [] };
    
    // Merge search data with statistics
    const enrichedData = searchData.items.map(item => {
      const stats = statsData.items?.find(stat => stat.id === item.id.videoId);
      return {
        ...item,
        statistics: stats?.statistics || {}
      };
    });
    
    console.log(`✅ Successfully fetched ${enrichedData.length} YouTube videos with statistics`);
    return enrichedData;
    
  } catch (error) {
    console.error('❌ Error fetching YouTube data:', error);
    throw error;
  }
}

function processYouTubeDataForSupabase(youtubeData) {
  return youtubeData.map(item => {
    const stats = item.statistics || {};
    const snippet = item.snippet;
    
    // Calculate trend score based on engagement
    const viewCount = parseInt(stats.viewCount) || 0;
    const likeCount = parseInt(stats.likeCount) || 0;
    const commentCount = parseInt(stats.commentCount) || 0;
    
    // Simple trend score calculation (0-100)
    const engagementRatio = viewCount > 0 ? (likeCount + commentCount) / viewCount * 1000 : 0;
    const trendScore = Math.min(100, Math.max(0, Math.floor(engagementRatio * 10) + 50));
    
    // Categorize content
    const title = snippet.title.toLowerCase();
    let category = 'General';
    if (title.includes('ai') || title.includes('artificial intelligence')) category = 'AI';
    else if (title.includes('crypto') || title.includes('blockchain')) category = 'Crypto';
    else if (title.includes('tech') || title.includes('technology')) category = 'Technology';
    else if (title.includes('gaming') || title.includes('game')) category = 'Gaming';

    return {
      video_id: item.id.videoId,
      title: snippet.title,
      description: snippet.description?.substring(0, 1000) || '',
      published_at: snippet.publishedAt,
      channel_id: snippet.channelId,
      channel_title: snippet.channelTitle,
      thumbnail_default: snippet.thumbnails?.default?.url || '',
      thumbnail_medium: snippet.thumbnails?.medium?.url || '',
      thumbnail_high: snippet.thumbnails?.high?.url || '',
      view_count: viewCount,
      like_count: likeCount,
      comment_count: commentCount,
      trend_category: category,
      trend_score: trendScore
    };
  });
}

async function saveDataToSupabase(processedData) {
  try {
    console.log(`💾 Saving ${processedData.length} videos to Supabase...`);
    
    const { data, error } = await supabase
      .from('youtube_trends')
      .upsert(processedData, { 
        onConflict: 'video_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('❌ Error saving YouTube data to Supabase:', error);
      throw error;
    }

    console.log('✅ YouTube data saved to Supabase successfully!');
    console.log(`📊 Saved ${data?.length || processedData.length} videos to youtube_trends table`);
    return data;
  } catch (error) {
    console.error('❌ Error in saveDataToSupabase:', error);
    throw error;
  }
}

// API Routes
app.get('/api/fetch-youtube', async (req, res) => {
  try {
    const query = req.query.q || 'trending tech AI blockchain crypto';
    const maxResults = parseInt(req.query.maxResults) || 25;
    
    console.log('🚀 API: Fetching YouTube data...');
    
    // Fetch YouTube data
    const youtubeData = await fetchYouTubeVideos(query, maxResults);
    
    if (youtubeData.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No YouTube data found',
        data: []
      });
    }
    
    // Process for Supabase
    const processedData = processYouTubeDataForSupabase(youtubeData);
    
    // Save to Supabase
    const savedData = await saveDataToSupabase(processedData);
    
    res.json({
      success: true,
      message: `Successfully fetched and saved ${processedData.length} videos`,
      data: savedData || processedData,
      count: processedData.length
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

app.get('/api/youtube-data', async (req, res) => {
  try {
    console.log('📥 API: Fetching YouTube data from Supabase...');
    
    const { data, error } = await supabase
      .from('youtube_trends')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('❌ API Error fetching from Supabase:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    youtube_api: YOUTUBE_API_KEY ? 'Configured' : 'Missing',
    supabase: SUPABASE_URL ? 'Configured' : 'Missing'
  });
});

// Serve static files from root directory
app.use(express.static('.'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 YouTube API: ${YOUTUBE_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🗄️  Supabase: ${SUPABASE_URL ? 'Configured' : 'Missing'}`);
  console.log('📡 API endpoints:');
  console.log(`   - GET /api/fetch-youtube?q=search_term&maxResults=25`);
  console.log(`   - GET /api/youtube-data`);
  console.log(`   - GET /api/health`);
});
