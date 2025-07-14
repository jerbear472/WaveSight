// Viral Trend Analyzer
// Identifies videos with highest growth metrics and calculates viral scores

const { tiktokCollector } = require('./tiktok-collector');

class ViralTrendAnalyzer {
  constructor() {
    this.previousMetrics = new Map(); // Store previous data points for growth calculation
    this.trendHistory = new Map(); // Store trend history for pattern analysis
    this.alertThresholds = {
      viralScore: 70,        // Alert when viral score > 70
      viewVelocity: 10000,   // Views per hour
      shareAcceleration: 100, // Shares per hour
      engagementRate: 0.05   // 5% engagement rate
    };
    
    console.log('🔥 Viral Trend Analyzer initialized');
  }

  // Analyze viral trends from TikTok data
  async analyzeViralTrends(options = {}) {
    const {
      categories = ['viral', 'trending', 'music', 'dance', 'comedy'],
      limit = 50,
      timeWindow = 24 // hours
    } = options;

    console.log('🔍 Analyzing viral trends across TikTok...');

    try {
      // Fetch current trending data
      const currentData = await tiktokCollector.fetchViralContent({
        categories,
        limit
      });

      if (!currentData.success) {
        throw new Error(`Failed to fetch viral content: ${currentData.error}`);
      }

      console.log(`📊 Analyzing ${currentData.videos.length} TikTok videos for viral patterns`);

      // Calculate growth metrics for each video
      const viralAnalysis = currentData.videos.map(video => {
        const growthMetrics = this.calculateGrowthMetrics(video, timeWindow);
        const viralScore = this.calculateViralScore(growthMetrics);
        const trendPrediction = this.predictTrendDirection(video, growthMetrics);

        return {
          ...video,
          growthMetrics,
          viralScore,
          trendPrediction,
          analysisTimestamp: new Date().toISOString(),
          platform: 'tiktok'
        };
      });

      // Sort by viral score (highest first)
      const sortedTrends = viralAnalysis.sort((a, b) => b.viralScore - a.viralScore);

      // Identify high-potential viral content
      const viralCandidates = sortedTrends.filter(trend => 
        trend.viralScore >= this.alertThresholds.viralScore
      );

      // Update trend history
      this.updateTrendHistory(sortedTrends);

      console.log(`🚀 Found ${viralCandidates.length} viral candidates with score ≥ ${this.alertThresholds.viralScore}`);

      return {
        success: true,
        totalAnalyzed: sortedTrends.length,
        viralCandidates: viralCandidates.length,
        trends: sortedTrends,
        topViral: viralCandidates.slice(0, 10), // Top 10 viral candidates
        analysisMetadata: {
          categories,
          timeWindow,
          thresholds: this.alertThresholds,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Viral trend analysis failed:', error);
      return {
        success: false,
        error: error.message,
        trends: []
      };
    }
  }

  // Calculate growth metrics for a video
  calculateGrowthMetrics(video, timeWindowHours = 24) {
    const videoId = video.id || video.video_id;
    const currentTime = new Date();
    const videoCreateTime = new Date(video.create_time * 1000); // Convert Unix timestamp
    
    // Get previous metrics if available
    const previousData = this.previousMetrics.get(videoId);
    
    // Current metrics
    const currentMetrics = {
      views: parseInt(video.view_count || 0),
      likes: parseInt(video.like_count || 0),
      shares: parseInt(video.share_count || 0),
      comments: parseInt(video.comment_count || 0),
      timestamp: currentTime
    };

    // Calculate time elapsed since video creation (in hours)
    const videoAgeHours = (currentTime - videoCreateTime) / (1000 * 60 * 60);
    const timeElapsed = previousData ? 
      (currentTime - previousData.timestamp) / (1000 * 60 * 60) : 
      Math.max(videoAgeHours, 1); // Minimum 1 hour

    // Calculate growth rates
    let viewVelocity = 0;
    let shareAcceleration = 0;
    let commentVelocity = 0;
    let likeVelocity = 0;

    if (previousData && timeElapsed > 0) {
      // Calculate actual growth since last measurement
      viewVelocity = (currentMetrics.views - previousData.views) / timeElapsed;
      shareAcceleration = (currentMetrics.shares - previousData.shares) / timeElapsed;
      commentVelocity = (currentMetrics.comments - previousData.comments) / timeElapsed;
      likeVelocity = (currentMetrics.likes - previousData.likes) / timeElapsed;
    } else {
      // Estimate velocity based on video age
      if (videoAgeHours > 0) {
        viewVelocity = currentMetrics.views / videoAgeHours;
        shareAcceleration = currentMetrics.shares / videoAgeHours;
        commentVelocity = currentMetrics.comments / videoAgeHours;
        likeVelocity = currentMetrics.likes / videoAgeHours;
      }
    }

    // Calculate engagement rate
    const totalEngagement = currentMetrics.likes + currentMetrics.comments + currentMetrics.shares;
    const engagementRate = currentMetrics.views > 0 ? totalEngagement / currentMetrics.views : 0;

    // Calculate recency multiplier (newer videos get higher scores)
    const recencyMultiplier = Math.max(0.1, Math.min(1, (48 - videoAgeHours) / 48));

    // Store current metrics for next calculation
    this.previousMetrics.set(videoId, currentMetrics);

    return {
      viewVelocity: Math.max(0, viewVelocity),
      shareAcceleration: Math.max(0, shareAcceleration),
      commentVelocity: Math.max(0, commentVelocity),
      likeVelocity: Math.max(0, likeVelocity),
      engagementRate,
      recencyMultiplier,
      videoAgeHours,
      timeElapsed,
      currentMetrics,
      previousMetrics: previousData || null
    };
  }

  // Calculate viral score using the specified formula
  calculateViralScore(growthMetrics) {
    const {
      viewVelocity,
      shareAcceleration,
      engagementRate,
      commentVelocity,
      recencyMultiplier
    } = growthMetrics;

    // Normalize metrics to 0-100 scale
    const normalizedViewVelocity = Math.min(100, viewVelocity / 1000); // Scale: 1000 views/hour = 100
    const normalizedShareAcceleration = Math.min(100, shareAcceleration * 10); // Scale: 10 shares/hour = 100
    const normalizedEngagementRate = Math.min(100, engagementRate * 1000); // Scale: 10% engagement = 100
    const normalizedCommentVelocity = Math.min(100, commentVelocity * 5); // Scale: 20 comments/hour = 100

    // Apply the viral score formula from specifications
    const baseScore = (
      (normalizedViewVelocity * 0.4) + 
      (normalizedShareAcceleration * 0.3) + 
      (normalizedEngagementRate * 0.2) + 
      (normalizedCommentVelocity * 0.1)
    );

    // Apply recency multiplier
    const viralScore = Math.round(baseScore * recencyMultiplier);

    return Math.min(100, Math.max(0, viralScore));
  }

  // Predict trend direction based on growth patterns
  predictTrendDirection(video, growthMetrics) {
    const { viewVelocity, engagementRate, videoAgeHours } = growthMetrics;
    
    // Get historical data for pattern analysis
    const videoId = video.id || video.video_id;
    const history = this.trendHistory.get(videoId) || [];
    
    let direction = 'stable';
    let confidence = 50;
    let reasoning = [];

    // Analyze current velocity
    if (viewVelocity > 5000) {
      direction = 'rising';
      confidence += 20;
      reasoning.push('High view velocity');
    } else if (viewVelocity < 100) {
      direction = 'declining';
      confidence -= 15;
      reasoning.push('Low view velocity');
    }

    // Analyze engagement quality
    if (engagementRate > 0.05) {
      if (direction === 'rising') confidence += 15;
      reasoning.push('High engagement rate');
    } else if (engagementRate < 0.01) {
      direction = 'declining';
      confidence -= 10;
      reasoning.push('Low engagement rate');
    }

    // Age factor
    if (videoAgeHours < 6) {
      if (direction === 'rising') {
        confidence += 10;
        reasoning.push('Fresh content with momentum');
      }
    } else if (videoAgeHours > 72) {
      if (direction !== 'rising') {
        confidence += 5;
        reasoning.push('Mature content past peak');
      }
    }

    // Historical trend analysis
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const isAccelerating = recent.every((point, i) => 
        i === 0 || point.viralScore >= recent[i-1].viralScore
      );
      
      if (isAccelerating && direction === 'rising') {
        confidence += 15;
        reasoning.push('Consistent growth pattern');
      } else if (!isAccelerating && direction === 'declining') {
        confidence += 10;
        reasoning.push('Declining trend confirmed');
      }
    }

    return {
      direction,
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning,
      predictedPeakHours: this.estimatePeakTiming(growthMetrics),
      riskFactors: this.identifyRiskFactors(video, growthMetrics)
    };
  }

  // Estimate when content might peak
  estimatePeakTiming(growthMetrics) {
    const { viewVelocity, videoAgeHours } = growthMetrics;
    
    if (viewVelocity > 10000) {
      return Math.max(6, 24 - videoAgeHours); // High velocity content peaks within 24 hours
    } else if (viewVelocity > 1000) {
      return Math.max(12, 72 - videoAgeHours); // Medium velocity peaks within 72 hours
    } else {
      return Math.max(24, 168 - videoAgeHours); // Slow growth peaks within a week
    }
  }

  // Identify potential risk factors
  identifyRiskFactors(video, growthMetrics) {
    const risks = [];
    
    // Content saturation risk
    if (video.hashtag_names && video.hashtag_names.length > 10) {
      risks.push('Over-hashtagged content may face algorithm penalties');
    }

    // Engagement authenticity risk
    if (growthMetrics.engagementRate > 0.15) {
      risks.push('Unusually high engagement rate - potential artificial inflation');
    }

    // Trend saturation risk
    const trendingHashtags = ['fyp', 'viral', 'trending'];
    if (video.hashtag_names && video.hashtag_names.some(tag => 
      trendingHashtags.includes(tag.toLowerCase())
    )) {
      risks.push('Generic trending hashtags may indicate saturated market');
    }

    // Rapid growth risk
    if (growthMetrics.viewVelocity > 50000) {
      risks.push('Extremely rapid growth may trigger platform review');
    }

    return risks;
  }

  // Update trend history for pattern analysis
  updateTrendHistory(trends) {
    const timestamp = new Date();
    
    trends.forEach(trend => {
      const videoId = trend.id || trend.video_id;
      
      if (!this.trendHistory.has(videoId)) {
        this.trendHistory.set(videoId, []);
      }
      
      const history = this.trendHistory.get(videoId);
      
      // Add current data point
      history.push({
        timestamp,
        viralScore: trend.viralScore,
        viewVelocity: trend.growthMetrics.viewVelocity,
        engagementRate: trend.growthMetrics.engagementRate
      });
      
      // Keep only last 100 data points
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
    });

    // Clean old entries (older than 7 days)
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [videoId, history] of this.trendHistory.entries()) {
      const recentHistory = history.filter(point => point.timestamp > cutoffTime);
      if (recentHistory.length === 0) {
        this.trendHistory.delete(videoId);
      } else {
        this.trendHistory.set(videoId, recentHistory);
      }
    }
  }

  // Generate alerts for high-potential viral content
  generateViralAlerts(analysis) {
    if (!analysis.success) return [];

    const alerts = [];
    const now = new Date();

    analysis.topViral.forEach(trend => {
      const alert = {
        id: `viral_${trend.id || trend.video_id}_${now.getTime()}`,
        type: 'viral_prediction',
        severity: this.getAlertSeverity(trend.viralScore),
        timestamp: now.toISOString(),
        videoId: trend.id || trend.video_id,
        title: `Viral Prediction Alert: ${trend.viralScore}% confidence`,
        message: this.generateAlertMessage(trend),
        metadata: {
          viralScore: trend.viralScore,
          viewVelocity: trend.growthMetrics.viewVelocity,
          engagementRate: trend.growthMetrics.engagementRate,
          platform: 'tiktok',
          category: trend.trend_category,
          prediction: trend.trendPrediction
        }
      };

      alerts.push(alert);
    });

    return alerts;
  }

  // Determine alert severity based on viral score
  getAlertSeverity(viralScore) {
    if (viralScore >= 90) return 'critical';
    if (viralScore >= 80) return 'high';
    if (viralScore >= 70) return 'medium';
    return 'low';
  }

  // Generate human-readable alert message
  generateAlertMessage(trend) {
    const score = trend.viralScore;
    const velocity = Math.round(trend.growthMetrics.viewVelocity);
    const direction = trend.trendPrediction.direction;
    
    return `TikTok content showing ${score}% viral potential with ${velocity} views/hour. ` +
           `Trend direction: ${direction}. Category: ${trend.trend_category || 'general'}.`;
  }

  // Health check for the analyzer
  async healthCheck() {
    try {
      const collectorHealth = await tiktokCollector.healthCheck();
      
      return {
        status: collectorHealth.status === 'healthy' ? 'healthy' : 'warning',
        analyzer: 'operational',
        dataCollector: collectorHealth,
        metricsStored: this.previousMetrics.size,
        trendsTracked: this.trendHistory.size,
        thresholds: this.alertThresholds
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
const viralAnalyzer = new ViralTrendAnalyzer();

module.exports = {
  ViralTrendAnalyzer,
  viralAnalyzer
};