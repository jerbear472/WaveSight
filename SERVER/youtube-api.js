const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = process.env.PORT || 5003;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️ Supabase not configured, using mock data');
}

// Trend categories for classification
const TREND_CATEGORIES = {
  'AI': ['artificial intelligence', 'AI', 'machine learning', 'ChatGPT', 'GPT', 'LLM', 'neural', 'deep learning'],
  'Crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'NFT', 'defi', 'trading', 'cryptocurrency'],
  'Gaming': ['gaming', 'esports', 'twitch', 'steam', 'xbox', 'playstation', 'nintendo', 'fps', 'mmo'],
  'Technology': ['tech', 'apple', 'google', 'microsoft', 'samsung', 'iphone', 'android', 'software'],
  'Entertainment': ['movie', 'tv show', 'netflix', 'music', 'celebrity', 'hollywood', 'concert', 'festival'],
  'News': ['news', 'politics', 'election', 'breaking', 'urgent', 'government', 'economy', 'world'],
  'Sports': ['football', 'basketball', 'soccer', 'nfl', 'nba', 'olympics', 'sports', 'championship'],
  'Science': ['science', 'research', 'space', 'nasa', 'medicine', 'climate', 'physics', 'biology'],
  'Business': ['business', 'stock', 'market', 'finance', 'startup', 'investment', 'economy', 'company'],
  'Lifestyle': ['lifestyle', 'health', 'fitness', 'food', 'travel', 'fashion', 'beauty', 'wellness']
};

// Utility function to categorize content
function categorizeContent(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();
  
  for (const [category, keywords] of Object.entries(TREND_CATEGORIES)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
}

// Utility function to calculate wave score
function calculateWaveScore(video) {
  const stats = video.statistics || {};
  const snippet = video.snippet || {};
  
  const viewCount = parseInt(stats.viewCount || 0);
  const likeCount = parseInt(stats.likeCount || 0);
  const commentCount = parseInt(stats.commentCount || 0);
  
  // Calculate engagement rate
  const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;
  
  // Calculate recency boost (newer videos get higher scores)
  const publishedAt = new Date(snippet.publishedAt || Date.now());
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  const recencyBoost = Math.max(0, 1 - (hoursAgo / 168)); // Boost for videos less than 1 week old
  
  // Calculate views per hour
  const viewsPerHour = hoursAgo > 0 ? viewCount / hoursAgo : viewCount;
  
  // Normalize factors (0-1 scale)
  const normalizedViews = Math.min(viewCount / 1000000, 1); // Cap at 1M views
  const normalizedEngagement = Math.min(engagementRate * 1000, 1); // Scale engagement
  const normalizedVelocity = Math.min(viewsPerHour / 10000, 1); // Scale velocity
  
  // Weighted wave score (0-100)
  const waveScore = (
    normalizedViews * 0.4 +
    normalizedEngagement * 0.3 +
    normalizedVelocity * 0.2 +
    recencyBoost * 0.1
  ) * 100;
  
  return Math.round(Math.max(10, Math.min(95, waveScore)));
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      youtube: YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY',
      supabase: supabase !== null
    }
  });
});

// Get configuration
app.get('/api/config', (req, res) => {
  res.json({
    supabase: {
      url: SUPABASE_URL !== 'YOUR_SUPABASE_URL' ? SUPABASE_URL : null,
      anonKey: SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' ? SUPABASE_ANON_KEY : null
    }
  });
});

// Fetch trending YouTube data
app.get('/api/youtube-trending', async (req, res) => {
  try {
    console.log('🔍 Fetching YouTube trending data...');
    
    if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
      // Return mock data if no API key
      const mockData = generateMockTrendingData();
      return res.json({
        success: true,
        data: mockData,
        message: 'Using mock data - configure YOUTUBE_API_KEY for real data'
      });
    }

    const maxResults = req.query.maxResults || 50;
    const regionCode = req.query.regionCode || 'US';
    
    // Search for trending content with multiple queries
    const searchQueries = [
      'trending today',
      'viral video',
      'breaking news',
      'AI artificial intelligence',
      'cryptocurrency bitcoin',
      'gaming esports',
      'technology innovation'
    ];
    
    let allVideos = [];
    
    for (const query of searchQueries.slice(0, 3)) { // Limit to avoid quota issues
      try {
        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            order: 'relevance',
            maxResults: Math.floor(maxResults / 3),
            publishedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            key: YOUTUBE_API_KEY
          }
        });
        
        if (searchResponse.data && searchResponse.data.items) {
          allVideos.push(...searchResponse.data.items);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch for query "${query}":`, error.message);
      }
    }
    
    // Remove duplicates
    const uniqueVideos = allVideos.filter((video, index, self) => 
      index === self.findIndex(v => v.id.videoId === video.id.videoId)
    );
    
    // Get detailed statistics for videos
    if (uniqueVideos.length > 0) {
      const videoIds = uniqueVideos.slice(0, 50).map(video => video.id.videoId);
      
      try {
        const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'statistics,contentDetails',
            id: videoIds.join(','),
            key: YOUTUBE_API_KEY
          }
        });
        
        if (statsResponse.data && statsResponse.data.items) {
          const statsMap = {};
          statsResponse.data.items.forEach(item => {
            statsMap[item.id] = item;
          });
          
          // Merge statistics with video data
          uniqueVideos.forEach(video => {
            const videoId = video.id.videoId;
            if (statsMap[videoId]) {
              video.statistics = statsMap[videoId].statistics;
              video.contentDetails = statsMap[videoId].contentDetails;
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch video statistics:', error.message);
      }
    }
    
    // Process and format the data
    const processedVideos = uniqueVideos.map(video => {
      const snippet = video.snippet;
      const stats = video.statistics || {};
      const category = categorizeContent(snippet.title, snippet.description);
      const waveScore = calculateWaveScore(video);
      
      return {
        id: video.id.videoId,
        title: snippet.title,
        description: snippet.description || '',
        channel_title: snippet.channelTitle,
        published_at: snippet.publishedAt,
        thumbnail_url: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
        view_count: parseInt(stats.viewCount || 0),
        like_count: parseInt(stats.likeCount || 0),
        comment_count: parseInt(stats.commentCount || 0),
        trend_category: category,
        wave_score: waveScore,
        engagement_rate: stats.viewCount > 0 ? ((parseInt(stats.likeCount || 0) + parseInt(stats.commentCount || 0)) / parseInt(stats.viewCount)) * 100 : 0,
        platform_origin: 'youtube',
        created_at: new Date().toISOString()
      };
    }).filter(video => video.view_count > 1000); // Filter out low-view videos
    
    // Sort by wave score
    processedVideos.sort((a, b) => b.wave_score - a.wave_score);
    
    // Store in Supabase if available
    if (supabase && processedVideos.length > 0) {
      try {
        const { error } = await supabase
          .from('youtube_trending_data')
          .upsert(processedVideos, { onConflict: 'id' });
          
        if (error) {
          console.warn('⚠️ Failed to store in Supabase:', error.message);
        } else {
          console.log(`✅ Stored ${processedVideos.length} videos in Supabase`);
        }
      } catch (error) {
        console.warn('⚠️ Supabase storage error:', error.message);
      }
    }
    
    console.log(`✅ Fetched ${processedVideos.length} trending videos`);
    
    res.json({
      success: true,
      data: processedVideos,
      count: processedVideos.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching YouTube data:', error);
    
    // Return mock data as fallback
    const mockData = generateMockTrendingData();
    res.json({
      success: false,
      data: mockData,
      error: error.message,
      message: 'Using mock data due to API error'
    });
  }
});

// Get trending data from Supabase
app.get('/api/trending-data', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        success: false,
        message: 'Supabase not configured',
        data: generateMockTrendingData()
      });
    }
    
    const hours = req.query.hours || 24;
    const limit = req.query.limit || 100;
    const category = req.query.category;
    
    let query = supabase
      .from('youtube_trending_data')
      .select('*')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('wave_score', { ascending: false })
      .limit(limit);
    
    if (category && category !== 'all') {
      query = query.eq('trend_category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error fetching from Supabase:', error);
    res.json({
      success: false,
      data: generateMockTrendingData(),
      error: error.message
    });
  }
});

// Generate mock trending data
function generateMockTrendingData() {
  const categories = Object.keys(TREND_CATEGORIES);
  const mockTitles = [
    'Breaking: AI Breakthrough Changes Everything',
    'Viral TikTok Dance Takes Over Internet',
    'Crypto Market Explodes as Bitcoin Hits New High',
    'Gaming Tournament Sets New Viewership Record',
    'Tech Giant Announces Revolutionary Product',
    'Celebrity Scandal Rocks Entertainment Industry',
    'Sports Upset of the Century Shocks Fans',
    'Scientific Discovery Could Change Medicine',
    'Startup Raises $100M in Record Funding Round',
    'Lifestyle Trend Goes Viral on Social Media'
  ];
  
  return Array.from({ length: 30 }, (_, i) => {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const baseViews = Math.floor(Math.random() * 2000000) + 100000;
    const publishedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    return {
      id: `mock_${i}_${Date.now()}`,
      title: mockTitles[i % mockTitles.length] + ` #${i + 1}`,
      description: `This is a trending ${category.toLowerCase()} video that's gaining massive popularity...`,
      channel_title: `${category} Channel ${Math.floor(Math.random() * 100)}`,
      published_at: publishedAt.toISOString(),
      thumbnail_url: `https://picsum.photos/320/180?random=${i}`,
      view_count: baseViews,
      like_count: Math.floor(baseViews * (0.01 + Math.random() * 0.05)),
      comment_count: Math.floor(baseViews * (0.001 + Math.random() * 0.01)),
      trend_category: category,
      wave_score: Math.floor(Math.random() * 60) + 30,
      engagement_rate: Math.random() * 5 + 1,
      platform_origin: 'youtube',
      created_at: new Date().toISOString()
    };
  });
}

// Start server
app.listen(port, () => {
  console.log(`🚀 YouTube API Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🔗 Trending data: http://localhost:${port}/api/youtube-trending`);
  
  if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
    console.log('⚠️ Set YOUTUBE_API_KEY environment variable for real data');
  }
  
  if (!supabase) {
    console.log('⚠️ Set SUPABASE_URL and SUPABASE_ANON_KEY for database storage');
  }
});

module.exports = app;