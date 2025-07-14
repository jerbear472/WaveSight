// TikTok Integration Server for WaveSight
// Provides TikTok Research API endpoints for the dashboard

const express = require('express');
const cors = require('cors');
const { tiktokAuth } = require('./tiktok-auth');
const { tiktokCollector } = require('./tiktok-collector');
const { viralAnalyzer } = require('./viral-trend-analyzer');
const { tiktokDatabase } = require('./tiktok-database');

const app = express();
const port = process.env.TIKTOK_PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
let servicesInitialized = false;

async function initializeServices() {
  if (servicesInitialized) return true;

  try {
    console.log('🔄 Initializing TikTok services...');
    
    // Initialize auth service
    const authInitialized = await tiktokAuth.init();
    
    // Initialize data collector
    const collectorInitialized = await tiktokCollector.init();
    
    // Test database connection
    const dbHealth = await tiktokDatabase.healthCheck();
    
    servicesInitialized = true;
    
    console.log('✅ TikTok services initialized');
    console.log(`   - Auth: ${authInitialized ? 'Ready' : 'Demo mode'}`);
    console.log(`   - Collector: ${collectorInitialized ? 'Ready' : 'Demo mode'}`);
    console.log(`   - Database: ${dbHealth.status}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize TikTok services:', error);
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const authHealth = await tiktokAuth.healthCheck();
    const collectorHealth = await tiktokCollector.healthCheck();
    const analyzerHealth = await viralAnalyzer.healthCheck();
    const dbHealth = await tiktokDatabase.healthCheck();
    
    const overallStatus = [authHealth, collectorHealth, analyzerHealth, dbHealth]
      .every(h => h.status === 'healthy') ? 'healthy' : 'warning';
    
    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        auth: authHealth,
        collector: collectorHealth,
        analyzer: analyzerHealth,
        database: dbHealth
      },
      server: {
        port: port,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get viral TikTok content with analysis
app.get('/api/viral-content', async (req, res) => {
  try {
    await initializeServices();
    
    const {
      categories = 'viral,trending,music,dance,comedy',
      limit = 50,
      timeWindow = 24
    } = req.query;
    
    const categoryArray = categories.split(',').map(c => c.trim());
    
    console.log(`🔍 Fetching TikTok viral content: ${categoryArray.join(', ')}`);
    
    // Run viral trend analysis
    const analysisResult = await viralAnalyzer.analyzeViralTrends({
      categories: categoryArray,
      limit: parseInt(limit),
      timeWindow: parseInt(timeWindow)
    });
    
    if (!analysisResult.success) {
      throw new Error(analysisResult.error);
    }
    
    // Store results in database if connected
    if (tiktokDatabase.isConnected) {
      const storageResult = await tiktokDatabase.storeAnalysisResults(analysisResult);
      if (storageResult.success) {
        console.log('💾 Analysis results stored in database');
      }
    }
    
    // Generate alerts for high viral potential
    const alerts = viralAnalyzer.generateViralAlerts(analysisResult);
    
    // Format response for dashboard
    const response = {
      success: true,
      data: {
        trends: analysisResult.trends.map(trend => ({
          id: trend.id || trend.video_id,
          title: trend.video_description || `TikTok by @${trend.username}`,
          description: trend.video_description,
          platform: 'tiktok',
          username: trend.username,
          displayName: trend.display_name,
          view_count: trend.view_count,
          like_count: trend.like_count,
          comment_count: trend.comment_count,
          share_count: trend.share_count,
          hashtags: trend.hashtag_names || [],
          category: trend.trend_category,
          viralScore: trend.viralScore,
          growthMetrics: trend.growthMetrics,
          prediction: trend.trendPrediction,
          create_time: trend.create_time,
          region_code: trend.region_code,
          music_id: trend.music_id
        })),
        summary: {
          totalAnalyzed: analysisResult.totalAnalyzed,
          viralCandidates: analysisResult.viralCandidates,
          categories: categoryArray,
          timeWindow: parseInt(timeWindow)
        },
        alerts: alerts,
        metadata: analysisResult.analysisMetadata
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Failed to fetch viral content:', error);
    
    // Return demo data on error
    res.json({
      success: false,
      error: error.message,
      data: {
        trends: generateDemoTikTokData(),
        summary: {
          totalAnalyzed: 10,
          viralCandidates: 3,
          categories: ['demo'],
          timeWindow: 24
        },
        alerts: [],
        metadata: {
          demo: true,
          timestamp: new Date().toISOString()
        }
      }
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

// Generate demo TikTok data for testing
function generateDemoTikTokData() {
  const demoHashtags = [
    ['fyp', 'viral', 'trending'],
    ['dance', 'choreography', 'trending'],
    ['music', 'song', 'viral'],
    ['comedy', 'funny', 'humor'],
    ['beauty', 'makeup', 'tutorial']
  ];
  
  const demoUsernames = ['tiktok_star', 'viral_creator', 'trend_setter', 'content_king', 'viral_queen'];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `demo_${i + 1}`,
    title: `Demo TikTok Video ${i + 1}`,
    description: `This is a demo TikTok video for testing purposes`,
    platform: 'tiktok',
    username: demoUsernames[i % demoUsernames.length],
    displayName: `Demo User ${i + 1}`,
    view_count: Math.floor(Math.random() * 10000000) + 100000,
    like_count: Math.floor(Math.random() * 500000) + 5000,
    comment_count: Math.floor(Math.random() * 50000) + 500,
    share_count: Math.floor(Math.random() * 25000) + 250,
    hashtags: demoHashtags[i % demoHashtags.length],
    category: ['viral', 'music', 'dance', 'comedy', 'beauty'][i % 5],
    viralScore: Math.floor(Math.random() * 40) + 60, // 60-100 for demo
    create_time: Math.floor(Date.now() / 1000) - (Math.random() * 86400 * 3), // Last 3 days
    region_code: 'US'
  }));
}

// Automatic analysis scheduling
let analysisInterval = null;

function startAutomaticAnalysis() {
  if (analysisInterval) return;
  
  // Run analysis every 30 minutes
  analysisInterval = setInterval(async () => {
    try {
      console.log('⏰ Running scheduled TikTok analysis...');
      
      const analysisResult = await viralAnalyzer.analyzeViralTrends({
        categories: ['viral', 'trending', 'music', 'dance', 'comedy'],
        limit: 100,
        timeWindow: 24
      });
      
      if (analysisResult.success && tiktokDatabase.isConnected) {
        await tiktokDatabase.storeAnalysisResults(analysisResult);
        console.log('✅ Scheduled analysis completed and stored');
      }
    } catch (error) {
      console.error('❌ Scheduled analysis failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes
  
  console.log('🕐 Automatic TikTok analysis scheduled every 30 minutes');
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
    app.listen(port, async () => {
      console.log('\n🎵 TikTok Integration Server Starting...');
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🔥 Viral content: http://localhost:${port}/api/viral-content`);
      console.log(`📈 Trending: http://localhost:${port}/api/trending`);
      console.log(`🚨 Alerts: http://localhost:${port}/api/alerts`);
      
      // Initialize services on startup
      const servicesReady = await initializeServices();
      
      if (servicesReady) {
        startAutomaticAnalysis();
        console.log('✅ TikTok Integration Server ready with all services');
      } else {
        console.log('⚠️ TikTok Integration Server running in demo mode');
      }
      
      console.log('\n💡 API Endpoints:');
      console.log('   GET  /health              - Service health check');
      console.log('   GET  /api/viral-content   - Get viral TikTok content with analysis');
      console.log('   GET  /api/trending        - Get trending videos from database');
      console.log('   GET  /api/alerts          - Get active viral alerts');
      console.log('   GET  /api/stats           - Get database statistics');
      console.log('   POST /api/analyze         - Trigger manual analysis');
      console.log('   DELETE /api/cleanup       - Cleanup old data');
      console.log('\n🔗 Integration with WaveSight Dashboard on port 8080');
    });

  } catch (error) {
    console.error('❌ Failed to start TikTok server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down TikTok Integration Server...');
  
  if (analysisInterval) {
    clearInterval(analysisInterval);
  }
  
  await tiktokAuth.cleanup();
  
  console.log('✅ Server shutdown complete');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;