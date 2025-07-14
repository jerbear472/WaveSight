// TikTok Database Integration for WaveSight
// Handles database operations for TikTok viral trend data

const { createClient } = require('@supabase/supabase-js');

class TikTokDatabase {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.supabase = null;
    this.isConnected = false;
    
    if (this.supabaseUrl && this.supabaseKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
      this.isConnected = true;
      console.log('🗄️ TikTok Database initialized with Supabase');
    } else {
      console.warn('⚠️ Supabase not configured - TikTok data will not be persisted');
      console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    }
  }

  // Test database connection
  async testConnection() {
    if (!this.isConnected) {
      return { connected: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.supabase
        .from('tiktok_videos')
        .select('id')
        .limit(1);

      if (error) throw error;

      return { connected: true, message: 'Database connection successful' };
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return { connected: false, error: error.message };
    }
  }

  // Store video data
  async storeVideo(videoData) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const video = {
        video_id: videoData.id || videoData.video_id,
        username: videoData.username,
        display_name: videoData.display_name,
        region_code: videoData.region_code,
        create_time: videoData.create_time,
        view_count: parseInt(videoData.view_count || 0),
        like_count: parseInt(videoData.like_count || 0),
        comment_count: parseInt(videoData.comment_count || 0),
        share_count: parseInt(videoData.share_count || 0),
        music_id: videoData.music_id,
        hashtags: videoData.hashtag_names || [],
        description: videoData.video_description,
        video_duration: videoData.duration
      };

      const { data, error } = await this.supabase
        .from('tiktok_videos')
        .upsert(video, { onConflict: 'video_id' })
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Failed to store video:', error);
      return { success: false, error: error.message };
    }
  }

  // Store growth metrics
  async storeGrowthMetrics(videoId, metrics) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const growthData = {
        video_id: videoId,
        view_velocity: metrics.viewVelocity,
        share_acceleration: metrics.shareAcceleration,
        comment_velocity: metrics.commentVelocity,
        like_velocity: metrics.likeVelocity,
        engagement_rate: metrics.engagementRate,
        viral_score: metrics.viralScore || 0,
        recency_multiplier: metrics.recencyMultiplier,
        video_age_hours: metrics.videoAgeHours,
        time_elapsed_hours: metrics.timeElapsed
      };

      const { data, error } = await this.supabase
        .from('tiktok_growth_metrics')
        .insert(growthData)
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Failed to store growth metrics:', error);
      return { success: false, error: error.message };
    }
  }

  // Store trend prediction
  async storeTrendPrediction(videoId, prediction) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const predictionData = {
        video_id: videoId,
        trend_direction: prediction.direction,
        confidence_score: prediction.confidence,
        reasoning: prediction.reasoning || [],
        predicted_peak_hours: prediction.predictedPeakHours,
        estimated_peak_views: prediction.estimatedPeakViews,
        risk_factors: prediction.riskFactors || [],
        risk_level: this.calculateRiskLevel(prediction.riskFactors || []),
        has_historical_data: prediction.hasHistoricalData || false,
        pattern_consistency: prediction.patternConsistency || 0.5
      };

      const { data, error } = await this.supabase
        .from('tiktok_trend_predictions')
        .insert(predictionData)
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Failed to store trend prediction:', error);
      return { success: false, error: error.message };
    }
  }

  // Store viral alert
  async storeViralAlert(alert) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const alertData = {
        alert_id: alert.id,
        video_id: alert.videoId,
        alert_type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        viral_score: alert.metadata.viralScore,
        view_velocity: alert.metadata.viewVelocity,
        engagement_rate: alert.metadata.engagementRate,
        trend_category: alert.metadata.category
      };

      const { data, error } = await this.supabase
        .from('tiktok_viral_alerts')
        .insert(alertData)
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Failed to store viral alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Store complete analysis results
  async storeAnalysisResults(analysisResults) {
    if (!this.isConnected) {
      console.log('📊 Analysis complete but database not connected - results not persisted');
      return { success: false, error: 'Database not connected' };
    }

    console.log('💾 Storing TikTok analysis results in database...');

    try {
      let storedVideos = 0;
      let storedMetrics = 0;
      let storedPredictions = 0;
      let storedAlerts = 0;

      // Store videos and their data
      for (const trend of analysisResults.trends) {
        const videoId = trend.id || trend.video_id;

        // Store video basic data
        const videoResult = await this.storeVideo(trend);
        if (videoResult.success) storedVideos++;

        // Store growth metrics with viral score
        const metricsWithScore = {
          ...trend.growthMetrics,
          viralScore: trend.viralScore
        };
        const metricsResult = await this.storeGrowthMetrics(videoId, metricsWithScore);
        if (metricsResult.success) storedMetrics++;

        // Store trend prediction
        const predictionResult = await this.storeTrendPrediction(videoId, trend.trendPrediction);
        if (predictionResult.success) storedPredictions++;

        // Store video categories
        if (trend.trend_category) {
          await this.storeVideoCategory(videoId, trend.trend_category);
        }
      }

      // Store viral alerts
      if (analysisResults.topViral && analysisResults.topViral.length > 0) {
        const { viralAnalyzer } = require('./viral-trend-analyzer');
        const alerts = viralAnalyzer.generateViralAlerts(analysisResults);
        
        for (const alert of alerts) {
          const alertResult = await this.storeViralAlert(alert);
          if (alertResult.success) storedAlerts++;
        }
      }

      // Store analysis session metadata
      await this.storeAnalysisSession(analysisResults);

      console.log(`✅ Database storage complete:`);
      console.log(`   - Videos: ${storedVideos}`);
      console.log(`   - Growth metrics: ${storedMetrics}`);
      console.log(`   - Predictions: ${storedPredictions}`);
      console.log(`   - Alerts: ${storedAlerts}`);

      // Refresh analytics view
      await this.refreshAnalyticsView();

      return {
        success: true,
        stored: {
          videos: storedVideos,
          metrics: storedMetrics,
          predictions: storedPredictions,
          alerts: storedAlerts
        }
      };

    } catch (error) {
      console.error('❌ Failed to store analysis results:', error);
      return { success: false, error: error.message };
    }
  }

  // Store video category relationship
  async storeVideoCategory(videoId, categoryName, confidence = 1.0) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      // First, get or create the category
      const { data: category, error: categoryError } = await this.supabase
        .from('tiktok_trend_categories')
        .select('id')
        .eq('category_name', categoryName)
        .single();

      if (categoryError && categoryError.code !== 'PGRST116') { // Not found error
        throw categoryError;
      }

      let categoryId;
      if (category) {
        categoryId = category.id;
      } else {
        // Create new category
        const { data: newCategory, error: createError } = await this.supabase
          .from('tiktok_trend_categories')
          .insert({
            category_name: categoryName,
            description: `Auto-generated category for ${categoryName}`,
            hashtag_patterns: [categoryName]
          })
          .select()
          .single();

        if (createError) throw createError;
        categoryId = newCategory.id;
      }

      // Store the relationship
      const { data, error } = await this.supabase
        .from('tiktok_video_categories')
        .upsert({
          video_id: videoId,
          category_id: categoryId,
          confidence_score: confidence
        }, { onConflict: 'video_id,category_id' })
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Failed to store video category:', error);
      return { success: false, error: error.message };
    }
  }

  // Store analysis session metadata
  async storeAnalysisSession(analysisResults) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const sessionData = {
        session_id: `analysis_${Date.now()}`,
        categories_analyzed: analysisResults.analysisMetadata?.categories || [],
        videos_limit: analysisResults.totalAnalyzed,
        time_window_hours: analysisResults.analysisMetadata?.timeWindow || 24,
        total_videos_analyzed: analysisResults.totalAnalyzed,
        viral_candidates_found: analysisResults.viralCandidates,
        alerts_generated: analysisResults.topViral?.length || 0,
        completed_at: new Date(),
        session_status: 'completed'
      };

      const { data, error } = await this.supabase
        .from('tiktok_analysis_sessions')
        .insert(sessionData)
        .select();

      if (error) throw error;

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Failed to store analysis session:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trending videos for dashboard
  async getTrendingVideos(options = {}) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    const {
      limit = 50,
      category = null,
      minViralScore = 0,
      timeWindow = 24 // hours
    } = options;

    try {
      let query = this.supabase
        .from('tiktok_trend_analytics')
        .select('*')
        .gte('viral_score', minViralScore)
        .gte('video_created_at', new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString())
        .order('viral_score', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.ilike('categories', `%${category}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Failed to get trending videos:', error);
      return { success: false, error: error.message };
    }
  }

  // Get active viral alerts
  async getActiveAlerts(limit = 20) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const { data, error } = await this.supabase
        .from('tiktok_viral_alerts')
        .select(`
          *,
          tiktok_videos (
            username,
            display_name,
            view_count,
            hashtags
          )
        `)
        .eq('alert_status', 'active')
        .order('viral_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Failed to get active alerts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get growth history for a video
  async getVideoGrowthHistory(videoId, limit = 100) {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const { data, error } = await this.supabase
        .from('tiktok_growth_metrics')
        .select('*')
        .eq('video_id', videoId)
        .order('measured_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Failed to get video growth history:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh materialized view for analytics
  async refreshAnalyticsView() {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const { error } = await this.supabase.rpc('refresh_tiktok_trend_analytics');

      if (error) throw error;

      return { success: true, message: 'Analytics view refreshed' };
    } catch (error) {
      console.error('❌ Failed to refresh analytics view:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup old data
  async cleanupOldData() {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const { error } = await this.supabase.rpc('cleanup_old_tiktok_data');

      if (error) throw error;

      console.log('🧹 Old TikTok data cleaned up successfully');
      return { success: true, message: 'Data cleanup completed' };
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate risk level from risk factors
  calculateRiskLevel(riskFactors) {
    const riskCount = riskFactors.length;
    
    if (riskCount >= 3) return 'critical';
    if (riskCount >= 2) return 'high';
    if (riskCount >= 1) return 'medium';
    return 'low';
  }

  // Get database statistics
  async getStatistics() {
    if (!this.isConnected) return { success: false, error: 'Database not connected' };

    try {
      const queries = await Promise.all([
        this.supabase.from('tiktok_videos').select('id', { count: 'exact', head: true }),
        this.supabase.from('tiktok_viral_alerts').select('id').eq('alert_status', 'active'),
        this.supabase.from('tiktok_trend_analytics').select('viral_score').gte('viral_score', 70),
        this.supabase.from('tiktok_analysis_sessions').select('id').eq('session_status', 'completed').gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const stats = {
        totalVideos: queries[0].count || 0,
        activeAlerts: queries[1].data?.length || 0,
        viralCandidates: queries[2].data?.length || 0,
        sessionsLast24h: queries[3].data?.length || 0,
        lastUpdated: new Date().toISOString()
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('❌ Failed to get database statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // Health check
  async healthCheck() {
    const connectionTest = await this.testConnection();
    
    if (!connectionTest.connected) {
      return {
        status: 'warning',
        database: 'disconnected',
        message: connectionTest.error
      };
    }

    try {
      const stats = await this.getStatistics();
      
      return {
        status: 'healthy',
        database: 'connected',
        statistics: stats.success ? stats.data : null,
        connection: connectionTest
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'error',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const tiktokDatabase = new TikTokDatabase();

module.exports = {
  TikTokDatabase,
  tiktokDatabase
};