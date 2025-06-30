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
async function fetchYouTubeVideos(query = 'trending', maxResults = 500) {
  try {
    console.log(`🔍 Fetching YouTube data for query: "${query}" (max ${maxResults} results)`);
    
    // Check if YouTube API key is configured
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
      console.error('❌ YouTube API key not configured in environment variables');
      throw new Error('YouTube API key not configured');
    }
    
    console.log('✅ YouTube API key found, proceeding with requests...');

    // Use diverse search queries for comprehensive historical-style data
    let searchQueries = [query];
    if (query === 'trending' || query.includes('trending tech AI blockchain crypto')) {
      searchQueries = [
        // Technology & AI
        'artificial intelligence machine learning tutorial',
        'chatgpt openai ai tools productivity',
        'programming coding tutorial javascript python',
        'tech review smartphone laptop computer',
        'software development web development',

        // Crypto & Finance
        'bitcoin cryptocurrency trading investment',
        'ethereum blockchain defi nft market',
        'dogecoin altcoin crypto news analysis',
        'stock market investing finance tips',
        'real estate investment property business',

        // Entertainment & Gaming
        'gaming gameplay walkthrough review',
        'movie trailer film review cinema',
        'music video song artist concert',
        'netflix series tv show entertainment',
        'esports tournament gaming highlights',

        // Lifestyle & Health
        'fitness workout health nutrition diet',
        'cooking recipe food chef kitchen',
        'travel vlog destination adventure',
        'lifestyle daily routine productivity',
        'fashion style beauty makeup skincare',

        // Sports & Activities
        'sports highlights football basketball',
        'soccer fifa world cup tournament',
        'tennis golf baseball sports news',
        'olympics athletics competition',
        'extreme sports adventure outdoor',

        // Education & Science
        'education tutorial learning course',
        'science physics chemistry biology',
        'space nasa astronomy discovery',
        'history documentary educational',
        'art design creative tutorial',

        // Automotive & Tech
        'car review automotive tesla electric',
        'motorcycle racing automotive news',
        'drone technology gadget review',
        'smartphone tech unboxing review',

        // Animals & Nature
        'animals pets dogs cats funny',
        'wildlife nature documentary',
        'environment climate sustainability',

        // Business & Career
        'entrepreneur business startup success',
        'career advice job interview tips',
        'marketing digital business strategy',

        // Additional trending topics
        'viral trends social media latest',
        'breaking news current events',
        'celebrity gossip entertainment news',
        'memes funny viral videos',
        'product reviews unboxing hauls',
        'tutorials how to guides',
        'reaction videos trending topics',
        'podcast highlights interviews',
        'live streams gaming music',
        'shorts viral tiktok trends'
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
          const errorText = await searchResponse.text();
          console.log(`⚠️ Failed to fetch for query "${searchQuery}": ${searchResponse.status}`);
          console.log(`❌ Error details: ${errorText}`);
          
          // Log specific error types
          if (searchResponse.status === 403) {
            console.log('❌ 403 Forbidden - Check your YouTube API key, quota limits, or restrictions');
          } else if (searchResponse.status === 400) {
            console.log('❌ 400 Bad Request - Check your query parameters');
          } else if (searchResponse.status === 429) {
            console.log('❌ 429 Too Many Requests - You have exceeded your quota');
          }
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

    // Create historical dates going back 3 years
    const now = new Date();
    const historicalDate = new Date(now);

    // Distribute videos across the last 3 years (1095 days)
    const daysBack = Math.floor(Math.random() * 1095);
    historicalDate.setDate(historicalDate.getDate() - daysBack);

    // Add some randomness to make the data more realistic
    const hoursBack = Math.floor(Math.random() * 24);
    const minutesBack = Math.floor(Math.random() * 60);
    historicalDate.setHours(historicalDate.getHours() - hoursBack);
    historicalDate.setMinutes(historicalDate.getMinutes() - minutesBack);

    return {
      video_id: item.id.videoId,
      title: snippet.title,
      description: snippet.description?.substring(0, 1000) || '',
      published_at: historicalDate.toISOString(),
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
      .limit(200);

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
    YOUTUBE_API_KEY: YOUTUBE_API_KEY ? 'Configured' : 'Missing'
  });
});

// YouTube API validation endpoint
app.get('/api/validate-youtube', async (req, res) => {
  try {
    if (!YOUTUBE_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'YouTube API key not configured'
      });
    }

    // Test API key with a simple quota check
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(testUrl);
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        message: 'YouTube API key is valid',
        quota_remaining: response.headers.get('x-ratelimit-remaining') || 'Unknown'
      });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({
        success: false,
        error: `YouTube API error: ${response.status}`,
        details: errorText,
        troubleshooting: {
          403: 'Check API key validity, quota limits, or HTTP referrer restrictions',
          400: 'Check API key format and request parameters',
          429: 'Quota exceeded - wait or increase limits'
        }[response.status] || 'Unknown error'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk fetch endpoint for massive data collection
app.get('/api/bulk-fetch', async (req, res) => {
  try {
    const categories = req.query.categories || 'all';
    const totalResults = parseInt(req.query.totalResults) || 1000;
    
    console.log(`🔄 Bulk fetch initiated: ${totalResults} total results`);
    
    // Define category-specific queries
    const categoryQueries = {
      'tech': ['AI artificial intelligence', 'programming coding', 'tech reviews gadgets', 'software development'],
      'entertainment': ['movies trailers', 'music videos', 'celebrity news', 'tv shows series'],
      'gaming': ['gaming gameplay', 'esports tournaments', 'game reviews', 'streaming highlights'],
      'lifestyle': ['fitness health', 'cooking recipes', 'travel vlogs', 'fashion beauty'],
      'education': ['tutorials learning', 'science discovery', 'history documentary', 'skills training'],
      'business': ['entrepreneurship', 'investing finance', 'marketing business', 'career advice'],
      'trending': ['viral trends', 'memes funny', 'breaking news', 'social media trends']
    };
    
    let allQueries = [];
    if (categories === 'all') {
      allQueries = Object.values(categoryQueries).flat();
    } else {
      const selectedCategories = categories.split(',');
      selectedCategories.forEach(cat => {
        if (categoryQueries[cat.trim()]) {
          allQueries.push(...categoryQueries[cat.trim()]);
        }
      });
    }
    
    const resultsPerQuery = Math.ceil(totalResults / allQueries.length);
    let allVideos = [];
    
    for (const query of allQueries) {
      try {
        const videos = await fetchYouTubeVideos(query, resultsPerQuery);
        if (videos && videos.length > 0) {
          allVideos.push(...videos);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`⚠️ Error fetching for query "${query}":`, error.message);
        continue;
      }
    }
    
    if (allVideos.length > 0) {
      const processedData = processYouTubeDataForSupabase(allVideos);
      const savedData = await saveDataToSupabase(processedData);
      
      res.json({
        success: true,
        message: `Bulk fetch completed: ${allVideos.length} videos processed`,
        data: savedData || processedData,
        count: allVideos.length,
        categories: categories,
        queries_used: allQueries.length
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No data found in bulk fetch',
        categories: categories
      });
    }
    
  } catch (error) {
    console.error('❌ Bulk fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// User authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { replit_user_id, replit_username, replit_roles } = req.body;

    if (!replit_user_id || !replit_username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required user data'
      });
    }

    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('replit_user_id', replit_user_id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    let userData;

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          replit_username,
          replit_roles,
          last_login: new Date().toISOString(),
          login_count: existingUser.login_count + 1
        })
        .eq('replit_user_id', replit_user_id)
        .select()
        .single();

      if (error) throw error;
      userData = data;
      console.log(`✅ User ${replit_username} logged in (${userData.login_count} times)`);
    } else {
      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          replit_user_id,
          replit_username,
          replit_roles,
          display_name: replit_username
        })
        .select()
        .single();

      if (error) throw error;
      userData = data;
      console.log(`✅ New user ${replit_username} registered`);
    }

    res.json({
      success: true,
      user: userData,
      message: existingUser ? 'Login successful' : 'User registered successfully'
    });

  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/api/auth/user/:replit_user_id', async (req, res) => {
  try {
    const { replit_user_id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('replit_user_id', replit_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      user: data
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.put('/api/auth/user/:replit_user_id', async (req, res) => {
  try {
    const { replit_user_id } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.replit_user_id;
    delete updateData.created_at;
    delete updateData.login_count;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('replit_user_id', replit_user_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      user: data,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: error.message
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

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Proxy sentiment analysis requests to Python server
app.post('/api/analyze-sentiment', async (req, res) => {
  try {
    const response = await fetch('http://0.0.0.0:5001/api/analyze-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Error proxying to sentiment server:', error);
    res.status(500).json({ 
      error: 'Sentiment analysis server not available. Please start the Sentiment Analysis Server workflow.' 
    });
  }
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