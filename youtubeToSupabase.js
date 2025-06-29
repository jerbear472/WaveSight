
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Configuration - using environment variables from secrets
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// YouTube API functions
async function fetchYouTubeVideos(query = 'trending', maxResults = 50) {
  try {
    console.log(`🔍 Fetching YouTube data for query: "${query}" (max ${maxResults} results)`);

    // Use diverse search queries if default query is used
    let searchQueries = [query];
    if (query === 'trending' || query.includes('trending tech AI blockchain crypto')) {
      searchQueries = [
        'sports highlights football basketball soccer',
        'health fitness workout nutrition wellness',
        'cooking food recipes chef kitchen',
        'travel adventure destinations vacation',
        'music trending songs artists concert',
        'movies trailers reviews netflix',
        'gaming esports streamers twitch',
        'fashion style beauty makeup skincare',
        'education tutorials learning course',
        'science physics space nasa discovery',
        'lifestyle vlog daily routine productivity',
        'art design creative drawing painting',
        'automotive car tesla electric vehicle',
        'pets dogs cats animals funny cute',
        'real estate property house investment'
      ];
    }

    let allVideos = [];
    const videosPerQuery = Math.ceil(maxResults / searchQueries.length);

    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔍 Searching for: "${searchQuery}"`);
        
        // First, get search results
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&order=relevance&maxResults=${videosPerQuery}&key=${YOUTUBE_API_KEY}`;
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          console.log(`⚠️ Failed to fetch for query "${searchQuery}": ${searchResponse.status}`);
          continue;
        }
        
        const searchData = await searchResponse.json();
        
        if (searchData.items && searchData.items.length > 0) {
          allVideos.push(...searchData.items);
          console.log(`📋 Found ${searchData.items.length} videos for "${searchQuery}"`);
        }
      } catch (queryError) {
        console.log(`⚠️ Error with query "${searchQuery}":`, queryError.message);
        continue;
      }
    }
    
    if (allVideos.length === 0) {
      console.log('⚠️ No YouTube videos found for any query');
      return [];
    }

    console.log(`📋 Total found ${allVideos.length} videos, fetching detailed statistics...`);

    // Get video IDs for detailed stats (limit to avoid URL length issues)
    const videoIds = allVideos.slice(0, 50).map(item => item.id.videoId).join(',');
    
    // Fetch detailed video statistics
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    
    const statsResponse = await fetch(statsUrl);
    const statsData = statsResponse.ok ? await statsResponse.json() : { items: [] };
    
    // Merge search data with statistics
    const enrichedData = allVideos.slice(0, 50).map(item => {
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
    
    // Comprehensive categorization
    const title = snippet.title.toLowerCase();
    const description = (snippet.description || '').toLowerCase();
    const content = title + ' ' + description;
    
    let category = 'General';
    
    // Define comprehensive keyword categories
    const categories = {
      'Sports': ['sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis', 'golf', 'nfl', 'nba', 'fifa', 'olympics', 'athlete', 'team', 'match', 'game', 'score', 'championship', 'league', 'player', 'coach'],
      'Health & Fitness': ['health', 'fitness', 'workout', 'exercise', 'diet', 'nutrition', 'wellness', 'yoga', 'meditation', 'gym', 'weight', 'muscle', 'cardio', 'running', 'training', 'healthy', 'doctor', 'medical'],
      'Food & Cooking': ['food', 'cooking', 'recipe', 'chef', 'kitchen', 'meal', 'dinner', 'lunch', 'breakfast', 'baking', 'restaurant', 'ingredients', 'taste', 'delicious', 'easy recipe', 'how to cook'],
      'Travel': ['travel', 'vacation', 'trip', 'destination', 'adventure', 'explore', 'journey', 'visit', 'tourist', 'city', 'country', 'hotel', 'flight', 'backpack', 'culture', 'guide'],
      'Music': ['music', 'song', 'artist', 'album', 'concert', 'band', 'singer', 'guitar', 'piano', 'drums', 'lyrics', 'remix', 'cover', 'live', 'studio', 'melody'],
      'Movies & TV': ['movie', 'film', 'series', 'tv show', 'netflix', 'review', 'trailer', 'actor', 'actress', 'cinema', 'director', 'episode', 'season', 'streaming', 'drama', 'comedy'],
      'Gaming': ['gaming', 'game', 'gamer', 'esports', 'streamer', 'twitch', 'minecraft', 'fortnite', 'valorant', 'league of legends', 'console', 'pc gaming', 'mobile game', 'gameplay'],
      'Fashion': ['fashion', 'style', 'outfit', 'clothing', 'makeup', 'beauty', 'skincare', 'haul', 'trends', 'designer', 'model', 'runway', 'accessories', 'jewelry'],
      'Education': ['education', 'learning', 'course', 'tutorial', 'study', 'school', 'university', 'skill', 'lesson', 'teach', 'professor', 'class', 'knowledge', 'academic'],
      'Science': ['science', 'physics', 'chemistry', 'biology', 'space', 'nasa', 'research', 'discovery', 'experiment', 'laboratory', 'scientist', 'theory', 'evolution'],
      'AI Tools': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'claude', 'midjourney', 'gpt', 'deep learning', 'neural network', 'automation'],
      'Crypto': ['crypto', 'bitcoin', 'ethereum', 'cryptocurrency', 'trading', 'nft', 'dogecoin', 'altcoin', 'binance', 'defi', 'mining', 'wallet', 'investment'],
      'Blockchain': ['blockchain', 'web3', 'smart contract', 'decentralized', 'solana', 'polygon', 'cardano', 'chainlink', 'dapp', 'protocol'],
      'Programming': ['programming', 'coding', 'developer', 'software', 'javascript', 'python', 'react', 'html', 'css', 'node', 'github', 'tutorial'],
      'Finance': ['finance', 'investing', 'stocks', 'money', 'business', 'entrepreneur', 'passive income', 'real estate', 'bank', 'economy', 'market'],
      'Lifestyle': ['lifestyle', 'vlog', 'daily', 'routine', 'minimalism', 'productivity', 'self improvement', 'motivation', 'habits', 'morning routine'],
      'Art & Design': ['art', 'design', 'creative', 'drawing', 'painting', 'graphic', 'artist', 'portfolio', 'illustration', 'digital art', 'photoshop'],
      'Automotive': ['car', 'automotive', 'vehicle', 'tesla', 'electric car', 'racing', 'motorcycle', 'driving', 'auto', 'engine', 'review'],
      'Pets': ['pets', 'dog', 'cat', 'animal', 'puppy', 'kitten', 'pet care', 'veterinary', 'training', 'cute', 'funny animals'],
      'Politics': ['politics', 'election', 'government', 'policy', 'news', 'debate', 'vote', 'democracy', 'president', 'congress'],
      'Psychology': ['psychology', 'mental health', 'therapy', 'mindset', 'behavior', 'motivation', 'anxiety', 'depression', 'self help'],
      'Environment': ['climate', 'environment', 'sustainability', 'green', 'renewable', 'eco', 'carbon', 'nature', 'conservation', 'recycling'],
      'Real Estate': ['real estate', 'property', 'house', 'apartment', 'rent', 'buy', 'investment', 'mortgage', 'home', 'market'],
      'Parenting': ['parenting', 'kids', 'children', 'baby', 'family', 'mom', 'dad', 'pregnancy', 'childcare', 'toddler']
    };
    
    // Find the best matching category
    let maxMatches = 0;
    for (const [categoryName, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        category = categoryName;
      }
    }

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
    const query = req.query.q || 'trending';
    const maxResults = parseInt(req.query.maxResults) || 50;
    
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

// Config endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    YOUTUBE_API_KEY: YOUTUBE_API_KEY
  });
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
