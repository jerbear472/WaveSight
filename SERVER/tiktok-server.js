// TikTok Research API Server
// Express server for TikTok data collection and viral trend analysis

const express = require('express');
const cors = require('cors');
const { tiktokCollector } = require('./tiktok-collector');
const { viralAnalyzer } = require('./viral-trend-analyzer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.TIKTOK_SERVER_PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase (if configured)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('✅ TikTok Server connected to Supabase');
} else {
  console.warn('⚠️ Supabase not configured for TikTok server');
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const collectorHealth = await tiktokCollector.healthCheck();
    
    res.json({
      status: 'healthy',
      service: 'tiktok-server',
      port: PORT,
      timestamp: new Date().toISOString(),
      components: {
        collector: collectorHealth,
        analyzer: { status: 'ready' },
        database: supabase ? 'connected' : 'not_configured'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Fetch trending TikTok videos
app.get('/api/tiktok-trending', async (req, res) => {
  try {
    const {
      category = 'viral',
      limit = 50,
      include_analysis = 'true'
    } = req.query;

    console.log(`🎵 Fetching TikTok trending content: ${category}`);

    const result = await tiktokCollector.fetchTrendingByCategory(category, parseInt(limit));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        data: []
      });
    }

    let responseData = result.videos;

    // Include viral analysis if requested
    if (include_analysis === 'true' && result.videos.length > 0) {
      console.log('📊 Running viral analysis on TikTok videos...');
      const analysis = viralAnalyzer.analyzeBatch(result.videos);
      
      // Merge analysis results with video data
      responseData = result.videos.map(video => {
        const videoAnalysis = analysis.results.find(
          r => r.video_id === (video.id || video.video_id)
        );
        
        return {
          ...video,
          analysis: videoAnalysis || null
        };
      });

      // Store in database if available
      if (supabase) {
        await storeTikTokData(result.videos, analysis.results);
      }
    }

    res.json({
      success: true,
      data: responseData,
      metadata: {
        category,
        total_fetched: result.videos.length,
        has_analysis: include_analysis === 'true',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching TikTok trending:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// Fetch viral content across multiple categories
app.get('/api/tiktok-viral', async (req, res) => {
  try {
    const {
      categories = 'viral,trending,music,dance,comedy',
      limit = 20
    } = req.query;

    const categoryList = categories.split(',');
    
    console.log(`🔥 Fetching viral TikTok content across categories: ${categoryList.join(', ')}`);

    const result = await tiktokCollector.fetchViralContent({
      categories: categoryList,
      limit: parseInt(limit)
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to fetch viral content',
        data: []
      });
    }

    // Run viral analysis on all videos
    console.log('📊 Analyzing viral potential...');
    const analysis = viralAnalyzer.analyzeBatch(result.videos);
    
    // Get top viral trends
    const topViral = viralAnalyzer.getTopViralTrends(analysis, 20);

    // Store in database
    if (supabase) {
      await storeTikTokData(result.videos, analysis.results);
    }

    res.json({
      success: true,
      data: {
        videos: result.videos,
        analysis: analysis.results,
        top_viral: topViral,
        summary: analysis.summary
      },
      metadata: {
        categories: categoryList,
        total_fetched: result.totalFetched,
        unique_videos: result.uniqueCount,
        viral_detected: topViral.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching viral TikTok content:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// Get video comments for engagement analysis
app.get('/api/tiktok-comments/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { limit = 50 } = req.query;

    console.log(`💬 Fetching comments for TikTok video: ${videoId}`);

    const result = await tiktokCollector.getVideoComments(videoId, {
      max_count: parseInt(limit)
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        data: []
      });
    }

    // Store comments in database
    if (supabase && result.comments.length > 0) {
      await storeComments(videoId, result.comments);
    }

    res.json({
      success: true,
      data: result.comments,
      metadata: {
        video_id: videoId,
        comment_count: result.comments.length,
        has_more: result.has_more,
        cursor: result.cursor,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Error fetching comments for ${req.params.videoId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// Analyze specific video for viral potential
app.post('/api/tiktok-analyze', async (req, res) => {
  try {
    const { video_data, previous_metrics } = req.body;

    if (!video_data) {
      return res.status(400).json({
        success: false,
        error: 'video_data is required'
      });
    }

    console.log(`🔍 Analyzing TikTok video: ${video_data.id || video_data.video_id}`);

    const analysis = viralAnalyzer.analyzeVideo(video_data, previous_metrics);

    if (!analysis) {
      return res.status(400).json({
        success: false,
        error: 'Failed to analyze video'
      });
    }

    // Store analysis in database
    if (supabase) {
      await storeAnalysis([analysis]);
    }

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error analyzing TikTok video:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get viral trends from database
app.get('/api/tiktok-trends', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const {
      limit = 50,
      category,
      min_viral_score = 70,
      hours_back = 24
    } = req.query;

    let query = supabase
      .from('current_viral_trends')
      .select('*')
      .gte('viral_score', parseFloat(min_viral_score))
      .gte('collected_at', new Date(Date.now() - hours_back * 60 * 60 * 1000).toISOString())
      .order('viral_score', { ascending: false })
      .limit(parseInt(limit));

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      metadata: {
        limit: parseInt(limit),
        category: category || 'all',
        min_viral_score: parseFloat(min_viral_score),
        hours_back: parseInt(hours_back),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching trends from database:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// Store TikTok data in Supabase
async function storeTikTokData(videos, analyses) {
  if (!supabase) return;

  try {
    // Store videos
    const videoData = videos.map(video => ({
      video_id: video.id || video.video_id,
      username: video.username,
      create_time: new Date(video.create_time * 1000),
      region_code: video.region_code,
      video_description: video.video_description,
      music_id: video.music_id,
      hashtag_names: video.hashtag_names || []
    }));

    const { error: videoError } = await supabase
      .from('tiktok_videos')
      .upsert(videoData, { onConflict: 'video_id' });

    if (videoError) {
      console.error('❌ Error storing TikTok videos:', videoError);
    }

    // Store analyses if provided
    if (analyses && analyses.length > 0) {
      await storeAnalysis(analyses);
    }

    console.log(`✅ Stored ${videoData.length} TikTok videos in database`);
  } catch (error) {
    console.error('❌ Error in storeTikTokData:', error);
  }
}

// Store viral analysis results
async function storeAnalysis(analyses) {
  if (!supabase) return;

  try {
    const viralTrendsData = analyses.map(analysis => ({
      video_id: analysis.video_id,
      trend_type: analysis.category,
      viral_score: analysis.viral_score,
      peak_prediction: analysis.prediction,
      growth_metrics: analysis.growth,
      viral_factors: analysis.prediction.factors,
      hashtags: analysis.metadata.hashtags,
      region_code: analysis.metadata.region,
      category: analysis.metadata.category || 'general'
    }));

    const { error } = await supabase
      .from('tiktok_viral_trends')
      .upsert(viralTrendsData, { onConflict: 'video_id' });

    if (error) {
      console.error('❌ Error storing viral trends:', error);
    } else {
      console.log(`✅ Stored ${viralTrendsData.length} viral trend analyses`);
    }
  } catch (error) {
    console.error('❌ Error in storeAnalysis:', error);
  }
}

// Store comments data
async function storeComments(videoId, comments) {
  if (!supabase) return;

  try {
    const commentData = comments.map(comment => ({
      video_id: videoId,
      comment_id: comment.id,
      comment_text: comment.text,
      username: comment.username,
      like_count: comment.like_count || 0,
      create_time: new Date(comment.create_time * 1000)
    }));

    const { error } = await supabase
      .from('tiktok_comments')
      .upsert(commentData, { onConflict: 'comment_id' });

    if (error) {
      console.error('❌ Error storing comments:', error);
    } else {
      console.log(`✅ Stored ${commentData.length} comments`);
    }
  } catch (error) {
    console.error('❌ Error in storeComments:', error);
  }
}

// Initialize server
async function startServer() {
  try {
    // Initialize TikTok collector
    const initialized = await tiktokCollector.init();
    
    if (initialized) {
      console.log('✅ TikTok collector initialized successfully');
    } else {
      console.warn('⚠️ TikTok collector running in demo mode');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🎵 TikTok API Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 Trending endpoint: http://localhost:${PORT}/api/tiktok-trending`);
      console.log(`🔥 Viral endpoint: http://localhost:${PORT}/api/tiktok-viral`);
    });

  } catch (error) {
    console.error('❌ Failed to start TikTok server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down TikTok server...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;