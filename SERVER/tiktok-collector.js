// TikTok Research API Data Collector
// Fetches video data, metrics, and viral trends from TikTok Research API

const fetch = require('node-fetch');
const { tiktokAuth } = require('./tiktok-auth');

class TikTokDataCollector {
  constructor() {
    this.baseUrl = 'https://open.tiktokapis.com';
    this.rateLimits = {
      videoQuery: { requests: 1000, window: 86400 }, // 1000/day
      comments: { requests: 1000, window: 86400 },    // 1000/day
      userInfo: { requests: 1000, window: 86400 }     // 1000/day
    };
    this.requestCounts = new Map();
    
    console.log('🎵 TikTok Data Collector initialized');
  }

  // Initialize collector (ensure auth is ready)
  async init() {
    try {
      const authInitialized = await tiktokAuth.init();
      if (!authInitialized) {
        console.log('⚠️ TikTok Data Collector running in demo mode (no auth)');
        return false;
      }
      
      console.log('✅ TikTok Data Collector ready with authentication');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize TikTok Data Collector:', error);
      return false;
    }
  }

  // Check rate limits before making requests
  checkRateLimit(endpoint) {
    const now = Date.now();
    const windowStart = now - (this.rateLimits[endpoint].window * 1000);
    
    // Clean old requests from tracking
    if (this.requestCounts.has(endpoint)) {
      this.requestCounts.set(endpoint, 
        this.requestCounts.get(endpoint).filter(time => time > windowStart)
      );
    } else {
      this.requestCounts.set(endpoint, []);
    }
    
    const currentRequests = this.requestCounts.get(endpoint).length;
    const limit = this.rateLimits[endpoint].requests;
    
    if (currentRequests >= limit) {
      throw new Error(`Rate limit exceeded for ${endpoint}: ${currentRequests}/${limit} requests`);
    }
    
    return { allowed: true, remaining: limit - currentRequests };
  }

  // Track API request
  trackRequest(endpoint) {
    if (!this.requestCounts.has(endpoint)) {
      this.requestCounts.set(endpoint, []);
    }
    this.requestCounts.get(endpoint).push(Date.now());
  }

  // Query trending videos by hashtags and keywords
  async queryTrendingVideos(options = {}) {
    const {
      query = {},
      max_count = 100,
      cursor = 0,
      search_id = null
    } = options;

    try {
      // Rate limit check
      this.checkRateLimit('videoQuery');
      
      const authHeader = await tiktokAuth.getAuthHeader();
      
      const requestBody = {
        query: {
          and: [
            // Default query for viral content
            {
              operation: "IN",
              field_name: "region_code",
              field_values: ["US", "GB", "CA", "AU"] // English-speaking regions
            },
            ...(query.and || [])
          ],
          or: query.or || [],
          not: query.not || []
        },
        max_count: Math.min(max_count, 100), // API limit is 100
        cursor: cursor,
        start_date: this.getDateDaysAgo(7), // Last 7 days
        end_date: this.getCurrentDate(),
        ...(search_id && { search_id })
      };

      console.log(`🔍 Querying TikTok videos: ${JSON.stringify(requestBody.query)}`);

      const response = await fetch(`${this.baseUrl}/v2/research/video/query/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${data.error?.message || data.error || 'Unknown error'}`);
      }

      this.trackRequest('videoQuery');
      
      console.log(`✅ Retrieved ${data.data?.videos?.length || 0} TikTok videos`);
      
      return {
        success: true,
        videos: data.data?.videos || [],
        has_more: data.data?.has_more || false,
        cursor: data.data?.cursor || 0,
        search_id: data.data?.search_id,
        total_count: data.data?.videos?.length || 0
      };

    } catch (error) {
      console.error('❌ Failed to query TikTok videos:', error);
      return {
        success: false,
        error: error.message,
        videos: []
      };
    }
  }

  // Get video comments for engagement analysis
  async getVideoComments(videoId, options = {}) {
    const {
      max_count = 50,
      cursor = 0
    } = options;

    try {
      this.checkRateLimit('comments');
      
      const authHeader = await tiktokAuth.getAuthHeader();
      
      const requestBody = {
        video_id: videoId,
        max_count: Math.min(max_count, 50), // API limit
        cursor: cursor
      };

      const response = await fetch(`${this.baseUrl}/v2/research/video/comment/list/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${data.error?.message || 'Unknown error'}`);
      }

      this.trackRequest('comments');
      
      return {
        success: true,
        comments: data.data?.comments || [],
        has_more: data.data?.has_more || false,
        cursor: data.data?.cursor || 0
      };

    } catch (error) {
      console.error(`❌ Failed to get comments for video ${videoId}:`, error);
      return {
        success: false,
        error: error.message,
        comments: []
      };
    }
  }

  // Get user information for creator context
  async getUserInfo(username) {
    try {
      this.checkRateLimit('userInfo');
      
      const authHeader = await tiktokAuth.getAuthHeader();
      
      const requestBody = {
        username: username
      };

      const response = await fetch(`${this.baseUrl}/v2/research/user/info/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${data.error?.message || 'Unknown error'}`);
      }

      this.trackRequest('userInfo');
      
      return {
        success: true,
        user: data.data?.user || null
      };

    } catch (error) {
      console.error(`❌ Failed to get user info for ${username}:`, error);
      return {
        success: false,
        error: error.message,
        user: null
      };
    }
  }

  // Fetch trending videos by category
  async fetchTrendingByCategory(category, limit = 50) {
    const categoryQueries = {
      viral: {
        and: [
          {
            operation: "GTE",
            field_name: "view_count", 
            field_values: [1000000] // 1M+ views
          }
        ]
      },
      music: {
        and: [
          {
            operation: "IN",
            field_name: "hashtag_name",
            field_values: ["music", "song", "singing", "dance", "musicvideo"]
          }
        ]
      },
      dance: {
        and: [
          {
            operation: "IN", 
            field_name: "hashtag_name",
            field_values: ["dance", "dancing", "choreography", "dancechallenge"]
          }
        ]
      },
      comedy: {
        and: [
          {
            operation: "IN",
            field_name: "hashtag_name", 
            field_values: ["funny", "comedy", "humor", "meme", "hilarious"]
          }
        ]
      },
      beauty: {
        and: [
          {
            operation: "IN",
            field_name: "hashtag_name",
            field_values: ["beauty", "makeup", "skincare", "tutorial", "grwm"]
          }
        ]
      },
      food: {
        and: [
          {
            operation: "IN",
            field_name: "hashtag_name",
            field_values: ["food", "cooking", "recipe", "foodie", "asmr"]
          }
        ]
      },
      lifestyle: {
        and: [
          {
            operation: "IN",
            field_name: "hashtag_name",
            field_values: ["lifestyle", "vlog", "dayinmylife", "routine", "selfcare"]
          }
        ]
      },
      trending: {
        and: [
          {
            operation: "GTE",
            field_name: "like_count",
            field_values: [50000] // 50k+ likes
          }
        ]
      }
    };

    const query = categoryQueries[category] || categoryQueries.trending;
    
    try {
      const result = await this.queryTrendingVideos({
        query,
        max_count: limit
      });
      
      if (result.success) {
        // Add category metadata
        result.videos = result.videos.map(video => ({
          ...video,
          trend_category: category,
          fetch_timestamp: new Date().toISOString(),
          platform: 'tiktok'
        }));
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch ${category} trends:`, error);
      return {
        success: false,
        error: error.message,
        videos: []
      };
    }
  }

  // Comprehensive viral content detection
  async fetchViralContent(options = {}) {
    const {
      categories = ['viral', 'trending', 'music', 'dance', 'comedy'],
      limit = 20
    } = options;

    console.log('🔥 Fetching viral TikTok content across categories...');
    
    const results = [];
    
    for (const category of categories) {
      try {
        console.log(`📱 Fetching ${category} TikTok trends...`);
        const categoryResult = await this.fetchTrendingByCategory(category, limit);
        
        if (categoryResult.success && categoryResult.videos.length > 0) {
          results.push(...categoryResult.videos);
          console.log(`✅ ${category}: ${categoryResult.videos.length} videos`);
        }
        
        // Small delay between category requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch ${category} trends:`, error.message);
      }
    }

    // Remove duplicates and sort by engagement
    const uniqueVideos = this.deduplicateVideos(results);
    const sortedVideos = uniqueVideos.sort((a, b) => {
      const aScore = (a.view_count || 0) + (a.like_count || 0) * 2;
      const bScore = (b.view_count || 0) + (b.like_count || 0) * 2;
      return bScore - aScore;
    });

    console.log(`🎵 Total viral TikTok content: ${sortedVideos.length} unique videos`);
    
    return {
      success: true,
      videos: sortedVideos,
      totalFetched: results.length,
      uniqueCount: sortedVideos.length,
      categories: categories
    };
  }

  // Remove duplicate videos
  deduplicateVideos(videos) {
    const seen = new Set();
    return videos.filter(video => {
      const id = video.id || video.video_id;
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  // Utility: Get date N days ago in YYYYMMDD format
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  // Utility: Get current date in YYYYMMDD format
  getCurrentDate() {
    return new Date().toISOString().split('T')[0].replace(/-/g, '');
  }

  // Health check
  async healthCheck() {
    try {
      const authHealth = await tiktokAuth.healthCheck();
      
      const rateLimitStatus = {};
      for (const [endpoint, limits] of Object.entries(this.rateLimits)) {
        try {
          const status = this.checkRateLimit(endpoint);
          rateLimitStatus[endpoint] = {
            remaining: status.remaining,
            limit: limits.requests
          };
        } catch (error) {
          rateLimitStatus[endpoint] = {
            error: error.message,
            limit: limits.requests
          };
        }
      }
      
      return {
        status: authHealth.status === 'healthy' ? 'healthy' : 'warning',
        auth: authHealth,
        rateLimits: rateLimitStatus,
        collector: 'ready'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const tiktokCollector = new TikTokDataCollector();

module.exports = {
  TikTokDataCollector,
  tiktokCollector
};