// Viral Trend Analyzer for TikTok Data
// Analyzes growth metrics, engagement patterns, and viral potential

class ViralTrendAnalyzer {
  constructor() {
    this.trendCategories = {
      EMERGING: { min_growth: 0.5, max_views: 100000, description: 'High growth, low views' },
      VIRAL: { min_growth: 0.3, min_views: 100000, description: 'High growth + high engagement' },
      PEAK: { max_growth: 0.2, min_views: 500000, description: 'Slowing growth, high views' },
      DECLINING: { max_growth: -0.1, description: 'Negative growth trend' }
    };
    
    this.viralThresholds = {
      view_velocity_high: 10000,    // views per hour
      share_velocity_high: 100,     // shares per hour  
      engagement_rate_high: 0.1,    // 10% engagement rate
      comment_velocity_high: 50     // comments per hour
    };
    
    console.log('📊 Viral Trend Analyzer initialized');
  }

  // Analyze single video for viral potential
  analyzeVideo(video, previousMetrics = null) {
    try {
      const metrics = this.extractMetrics(video);
      const growth = previousMetrics ? this.calculateGrowthMetrics(metrics, previousMetrics) : null;
      const viralScore = this.calculateViralScore(metrics, growth);
      const category = this.categorizeTrend(metrics, growth);
      const prediction = this.predictViralPotential(metrics, growth);

      return {
        video_id: video.id || video.video_id,
        platform: 'tiktok',
        analyzed_at: new Date().toISOString(),
        metrics,
        growth,
        viral_score: viralScore,
        category,
        prediction,
        metadata: {
          username: video.username,
          create_time: video.create_time,
          hashtags: video.hashtag_names || [],
          region: video.region_code
        }
      };
    } catch (error) {
      console.error('❌ Error analyzing video:', error);
      return null;
    }
  }

  // Extract key metrics from video data
  extractMetrics(video) {
    const now = new Date();
    const createTime = new Date(video.create_time * 1000); // TikTok uses Unix timestamp
    const ageHours = (now - createTime) / (1000 * 60 * 60);

    return {
      view_count: parseInt(video.view_count) || 0,
      like_count: parseInt(video.like_count) || 0,
      comment_count: parseInt(video.comment_count) || 0,
      share_count: parseInt(video.share_count) || 0,
      age_hours: ageHours,
      engagement_rate: this.calculateEngagementRate(video),
      views_per_hour: ageHours > 0 ? (parseInt(video.view_count) || 0) / ageHours : 0
    };
  }

  // Calculate engagement rate
  calculateEngagementRate(video) {
    const views = parseInt(video.view_count) || 0;
    const likes = parseInt(video.like_count) || 0;
    const comments = parseInt(video.comment_count) || 0;
    const shares = parseInt(video.share_count) || 0;
    
    if (views === 0) return 0;
    
    const totalEngagement = likes + comments + shares;
    return totalEngagement / views;
  }

  // Calculate growth metrics between two time points
  calculateGrowthMetrics(currentMetrics, previousMetrics) {
    const timeDiff = (new Date() - new Date(previousMetrics.timestamp)) / (1000 * 60 * 60); // hours
    
    if (timeDiff <= 0) return null;

    return {
      view_growth_1h: (currentMetrics.view_count - previousMetrics.view_count) / timeDiff,
      like_growth_1h: (currentMetrics.like_count - previousMetrics.like_count) / timeDiff,
      comment_growth_1h: (currentMetrics.comment_count - previousMetrics.comment_count) / timeDiff,
      share_growth_1h: (currentMetrics.share_count - previousMetrics.share_count) / timeDiff,
      engagement_growth: currentMetrics.engagement_rate - previousMetrics.engagement_rate,
      time_period_hours: timeDiff
    };
  }

  // Calculate viral score (0-100)
  calculateViralScore(metrics, growth = null) {
    let score = 0;
    
    // Base engagement score (0-30 points)
    const engagementScore = Math.min(30, metrics.engagement_rate * 300);
    score += engagementScore;
    
    // Views velocity score (0-25 points)
    const velocityScore = Math.min(25, (metrics.views_per_hour / this.viralThresholds.view_velocity_high) * 25);
    score += velocityScore;
    
    // Age factor (0-20 points) - newer content scores higher
    const ageScore = Math.max(0, 20 - (metrics.age_hours / 24) * 10); // Decay over 2 days
    score += ageScore;
    
    // Growth acceleration (0-25 points) - only if we have growth data
    if (growth) {
      const growthScore = Math.min(25, 
        (growth.view_growth_1h / this.viralThresholds.view_velocity_high) * 15 +
        (growth.share_growth_1h / this.viralThresholds.share_velocity_high) * 10
      );
      score += growthScore;
    } else {
      // Fallback: use absolute numbers for growth estimation
      const absoluteGrowthScore = Math.min(25,
        (metrics.view_count / 1000000) * 15 + // Scale by millions of views
        (metrics.share_count / 10000) * 10    // Scale by thousands of shares
      );
      score += absoluteGrowthScore;
    }
    
    return Math.min(100, Math.round(score));
  }

  // Categorize trend type
  categorizeTrend(metrics, growth = null) {
    const views = metrics.view_count;
    const growthRate = growth ? growth.view_growth_1h / Math.max(1, metrics.view_count) : 0;
    
    // Emerging: High growth rate, lower absolute views
    if (growthRate > this.trendCategories.EMERGING.min_growth && 
        views < this.trendCategories.EMERGING.max_views) {
      return 'EMERGING';
    }
    
    // Viral: High growth + high engagement
    if (growthRate > this.trendCategories.VIRAL.min_growth && 
        views > this.trendCategories.VIRAL.min_views) {
      return 'VIRAL';
    }
    
    // Peak: High views but slowing growth
    if (views > this.trendCategories.PEAK.min_views && 
        growthRate < this.trendCategories.PEAK.max_growth) {
      return 'PEAK';
    }
    
    // Declining: Negative growth
    if (growthRate < this.trendCategories.DECLINING.max_growth) {
      return 'DECLINING';
    }
    
    return 'STABLE';
  }

  // Predict viral potential
  predictViralPotential(metrics, growth = null) {
    const viralFactors = {
      high_engagement: metrics.engagement_rate > this.viralThresholds.engagement_rate_high,
      rapid_views: metrics.views_per_hour > this.viralThresholds.view_velocity_high,
      young_content: metrics.age_hours < 24,
      accelerating: growth && growth.view_growth_1h > 0
    };
    
    const factorCount = Object.values(viralFactors).filter(Boolean).length;
    
    let prediction = 'LOW';
    let confidence = 0.2;
    
    if (factorCount >= 3) {
      prediction = 'HIGH';
      confidence = 0.8 + (factorCount - 3) * 0.05;
    } else if (factorCount === 2) {
      prediction = 'MEDIUM';
      confidence = 0.6;
    } else if (factorCount === 1) {
      prediction = 'LOW';
      confidence = 0.4;
    }
    
    return {
      potential: prediction,
      confidence: Math.min(0.95, confidence),
      factors: viralFactors,
      estimated_peak_views: this.estimatePeakViews(metrics, growth),
      time_to_peak_hours: this.estimateTimeToPeak(metrics, growth)
    };
  }

  // Estimate peak views based on current trajectory
  estimatePeakViews(metrics, growth = null) {
    if (!growth || growth.view_growth_1h <= 0) {
      // Fallback: estimate based on current engagement
      return metrics.view_count * (1 + metrics.engagement_rate * 10);
    }
    
    // Project growth with decay
    const currentViews = metrics.view_count;
    const growthRate = growth.view_growth_1h;
    const decayFactor = 0.95; // 5% decay per hour
    
    let projectedViews = currentViews;
    let currentGrowth = growthRate;
    
    // Project 48 hours ahead with exponential decay
    for (let hour = 1; hour <= 48; hour++) {
      projectedViews += currentGrowth;
      currentGrowth *= decayFactor;
      
      if (currentGrowth < growthRate * 0.01) break; // Stop when growth drops to 1% of original
    }
    
    return Math.round(projectedViews);
  }

  // Estimate time to reach peak engagement
  estimateTimeToPeak(metrics, growth = null) {
    if (!growth || growth.view_growth_1h <= 0) {
      return null; // Can't estimate without growth data
    }
    
    // Most TikTok content peaks within 24-72 hours
    const ageHours = metrics.age_hours;
    const growthRate = growth.view_growth_1h / Math.max(1, metrics.view_count);
    
    if (growthRate > 0.5) return Math.max(0, 12 - ageHours);  // High growth: peak in ~12h
    if (growthRate > 0.2) return Math.max(0, 24 - ageHours);  // Medium growth: peak in ~24h
    if (growthRate > 0.1) return Math.max(0, 48 - ageHours);  // Slow growth: peak in ~48h
    
    return Math.max(0, 72 - ageHours); // Default: peak within 72h
  }

  // Analyze batch of videos
  analyzeBatch(videos, previousMetricsBatch = {}) {
    console.log(`📊 Analyzing ${videos.length} TikTok videos for viral potential...`);
    
    const results = videos.map(video => {
      const videoId = video.id || video.video_id;
      const previousMetrics = previousMetricsBatch[videoId] || null;
      return this.analyzeVideo(video, previousMetrics);
    }).filter(result => result !== null);
    
    // Sort by viral score
    results.sort((a, b) => b.viral_score - a.viral_score);
    
    // Calculate summary statistics
    const summary = this.generateBatchSummary(results);
    
    console.log(`✅ Analysis complete: ${results.length} videos analyzed`);
    console.log(`🔥 Viral content found: ${summary.viral_count} videos`);
    console.log(`📈 Emerging trends: ${summary.emerging_count} videos`);
    
    return {
      results,
      summary,
      analyzed_at: new Date().toISOString(),
      total_analyzed: results.length
    };
  }

  // Generate summary statistics for batch analysis
  generateBatchSummary(results) {
    const summary = {
      total_videos: results.length,
      viral_count: 0,
      emerging_count: 0,
      peak_count: 0,
      declining_count: 0,
      avg_viral_score: 0,
      top_viral_score: 0,
      high_potential_count: 0
    };
    
    results.forEach(result => {
      summary.avg_viral_score += result.viral_score;
      summary.top_viral_score = Math.max(summary.top_viral_score, result.viral_score);
      
      switch (result.category) {
        case 'VIRAL': summary.viral_count++; break;
        case 'EMERGING': summary.emerging_count++; break;
        case 'PEAK': summary.peak_count++; break;
        case 'DECLINING': summary.declining_count++; break;
      }
      
      if (result.prediction.potential === 'HIGH') {
        summary.high_potential_count++;
      }
    });
    
    summary.avg_viral_score = results.length > 0 ? 
      Math.round(summary.avg_viral_score / results.length) : 0;
    
    return summary;
  }

  // Get top viral trends
  getTopViralTrends(analysisResults, limit = 10) {
    return analysisResults.results
      .filter(result => result.viral_score >= 70 || result.category === 'VIRAL')
      .slice(0, limit)
      .map(result => ({
        video_id: result.video_id,
        viral_score: result.viral_score,
        category: result.category,
        prediction: result.prediction.potential,
        confidence: result.prediction.confidence,
        views: result.metrics.view_count,
        engagement_rate: result.metrics.engagement_rate,
        username: result.metadata.username,
        hashtags: result.metadata.hashtags
      }));
  }
}

// Export singleton instance
const viralAnalyzer = new ViralTrendAnalyzer();

module.exports = {
  ViralTrendAnalyzer,
  viralAnalyzer
};