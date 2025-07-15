/**
 * Historical Variant Generation System
 * Creates versioned trend snapshots and historical data variants
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class HistoricalVariantGenerator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.variantTypes = {
      SNAPSHOT: 'snapshot',           // Point-in-time data capture
      AGGREGATED: 'aggregated',       // Time-period aggregation
      PROJECTED: 'projected',         // Future projection
      COMPARATIVE: 'comparative'      // Cross-platform comparison
    };
    
    this.variantConfigs = {
      retention: {
        daily: 30,      // Keep daily variants for 30 days
        weekly: 12,     // Keep weekly variants for 12 weeks
        monthly: 24     // Keep monthly variants for 24 months
      },
      aggregation: {
        timeframes: ['1h', '6h', '24h', '7d', '30d'],
        metrics: ['avg', 'max', 'sum', 'trend']
      }
    };
  }

  /**
   * Generate historical variants for a trend
   */
  async generateTrendVariants(trendId, dataPoints, options = {}) {
    console.log(`📜 Generating historical variants for trend: ${trendId}`);
    
    try {
      const variants = [];
      
      // 1. Create snapshot variants
      const snapshots = await this.createSnapshotVariants(trendId, dataPoints, options);
      variants.push(...snapshots);
      
      // 2. Create aggregated variants
      const aggregated = await this.createAggregatedVariants(trendId, dataPoints, options);
      variants.push(...aggregated);
      
      // 3. Create projected variants (if enough historical data)
      if (dataPoints.length >= 10) {
        const projected = await this.createProjectedVariants(trendId, dataPoints, options);
        variants.push(...projected);
      }
      
      // 4. Create comparative variants
      const comparative = await this.createComparativeVariants(trendId, dataPoints, options);
      variants.push(...comparative);
      
      // Store all variants
      await this.storeVariants(variants);
      
      console.log(`✅ Generated ${variants.length} variants for trend ${trendId}`);
      return variants;
      
    } catch (error) {
      console.error(`❌ Failed to generate variants for ${trendId}:`, error);
      throw error;
    }
  }

  /**
   * Create snapshot variants - point-in-time captures
   */
  async createSnapshotVariants(trendId, dataPoints, options) {
    console.log('📸 Creating snapshot variants...');
    
    const snapshots = [];
    const sortedData = [...dataPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Create snapshots at key intervals
    const intervals = ['1h', '6h', '24h', '7d'];
    const now = new Date();
    
    for (const interval of intervals) {
      const intervalMs = this.parseTimeInterval(interval);
      const snapshotTime = new Date(now.getTime() - intervalMs);
      
      // Find data point closest to snapshot time
      const closestPoint = this.findClosestDataPoint(sortedData, snapshotTime);
      
      if (closestPoint) {
        snapshots.push({
          trend_id: trendId,
          variant_type: this.variantTypes.SNAPSHOT,
          variant_name: `snapshot_${interval}_ago`,
          time_range_start: closestPoint.timestamp,
          time_range_end: closestPoint.timestamp,
          data_snapshot: {
            timestamp: closestPoint.timestamp,
            metrics: closestPoint.raw_metrics,
            normalized_metrics: closestPoint.normalized_metrics,
            wave_score: closestPoint.wave_score,
            platform_source: closestPoint.platform_source
          },
          metadata: {
            interval: interval,
            snapshot_reason: 'historical_point',
            data_quality: this.assessDataQuality(closestPoint)
          },
          created_at: new Date().toISOString()
        });
      }
    }
    
    return snapshots;
  }

  /**
   * Create aggregated variants - time-period summaries
   */
  async createAggregatedVariants(trendId, dataPoints, options) {
    console.log('📊 Creating aggregated variants...');
    
    const aggregated = [];
    const timeframes = this.variantConfigs.aggregation.timeframes;
    
    for (const timeframe of timeframes) {
      const periodData = this.getDataForPeriod(dataPoints, timeframe);
      
      if (periodData.length === 0) continue;
      
      // Calculate aggregated metrics
      const aggregatedMetrics = this.calculateAggregatedMetrics(periodData);
      
      // Calculate trend direction and velocity
      const trendAnalysis = this.analyzeTrendDirection(periodData);
      
      aggregated.push({
        trend_id: trendId,
        variant_type: this.variantTypes.AGGREGATED,
        variant_name: `aggregated_${timeframe}`,
        time_range_start: periodData[0].timestamp,
        time_range_end: periodData[periodData.length - 1].timestamp,
        data_snapshot: null,
        aggregated_metrics: aggregatedMetrics,
        trend_analysis: trendAnalysis,
        metadata: {
          timeframe: timeframe,
          data_points_count: periodData.length,
          aggregation_methods: ['avg', 'max', 'sum', 'trend'],
          confidence_score: this.calculateAggregationConfidence(periodData)
        },
        created_at: new Date().toISOString()
      });
    }
    
    return aggregated;
  }

  /**
   * Create projected variants - future forecasts
   */
  async createProjectedVariants(trendId, dataPoints, options) {
    console.log('🔮 Creating projected variants...');
    
    const projected = [];
    const sortedData = [...dataPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Simple linear regression for trend projection
    const projection = this.calculateLinearProjection(sortedData);
    
    // Project for different time horizons
    const horizons = ['6h', '24h', '7d'];
    
    for (const horizon of horizons) {
      const horizonMs = this.parseTimeInterval(horizon);
      const projectedValues = this.projectValues(projection, horizonMs);
      
      projected.push({
        trend_id: trendId,
        variant_type: this.variantTypes.PROJECTED,
        variant_name: `projection_${horizon}_ahead`,
        time_range_start: sortedData[sortedData.length - 1].timestamp,
        time_range_end: new Date(Date.now() + horizonMs).toISOString(),
        data_snapshot: null,
        projected_metrics: projectedValues,
        forecast_metadata: {
          projection_method: 'linear_regression',
          horizon: horizon,
          confidence_interval: this.calculateProjectionConfidence(projection),
          based_on_points: sortedData.length
        },
        metadata: {
          algorithm: 'linear_regression',
          data_quality: this.assessProjectionDataQuality(sortedData),
          warning_flags: this.getProjectionWarnings(sortedData, projection)
        },
        created_at: new Date().toISOString()
      });
    }
    
    return projected;
  }

  /**
   * Create comparative variants - cross-platform analysis
   */
  async createComparativeVariants(trendId, dataPoints, options) {
    console.log('🔍 Creating comparative variants...');
    
    const comparative = [];
    
    // Get similar trends for comparison
    const similarTrends = await this.findSimilarTrends(trendId, dataPoints);
    
    if (similarTrends.length > 0) {
      // Create performance comparison
      const performanceComparison = this.createPerformanceComparison(dataPoints, similarTrends);
      
      comparative.push({
        trend_id: trendId,
        variant_type: this.variantTypes.COMPARATIVE,
        variant_name: 'performance_comparison',
        time_range_start: dataPoints[0]?.timestamp,
        time_range_end: dataPoints[dataPoints.length - 1]?.timestamp,
        data_snapshot: null,
        comparison_data: performanceComparison,
        metadata: {
          compared_trends: similarTrends.map(t => t.trend_id),
          comparison_metrics: ['wave_score', 'growth_rate', 'engagement'],
          sample_size: similarTrends.length
        },
        created_at: new Date().toISOString()
      });
    }
    
    // Platform-specific comparison if multi-platform
    const platformComparison = this.createPlatformComparison(dataPoints);
    if (platformComparison) {
      comparative.push({
        trend_id: trendId,
        variant_type: this.variantTypes.COMPARATIVE,
        variant_name: 'platform_comparison',
        time_range_start: dataPoints[0]?.timestamp,
        time_range_end: dataPoints[dataPoints.length - 1]?.timestamp,
        data_snapshot: null,
        platform_analysis: platformComparison,
        metadata: {
          platforms_analyzed: Object.keys(platformComparison.by_platform || {}),
          comparison_type: 'cross_platform'
        },
        created_at: new Date().toISOString()
      });
    }
    
    return comparative;
  }

  /**
   * Calculate aggregated metrics for a period
   */
  calculateAggregatedMetrics(dataPoints) {
    if (dataPoints.length === 0) return null;
    
    const waveScores = dataPoints.map(d => d.wave_score || 0);
    const engagementScores = dataPoints.map(d => d.normalized_metrics?.engagement_score || 0);
    const reachEstimates = dataPoints.map(d => d.normalized_metrics?.reach_estimate || 0);
    
    return {
      wave_score: {
        avg: this.average(waveScores),
        max: Math.max(...waveScores),
        min: Math.min(...waveScores),
        std_dev: this.standardDeviation(waveScores),
        trend: this.calculateTrend(waveScores)
      },
      engagement: {
        avg: this.average(engagementScores),
        max: Math.max(...engagementScores),
        total: this.sum(engagementScores),
        trend: this.calculateTrend(engagementScores)
      },
      reach: {
        avg: this.average(reachEstimates),
        max: Math.max(...reachEstimates),
        total: this.sum(reachEstimates),
        trend: this.calculateTrend(reachEstimates)
      },
      data_points: dataPoints.length,
      time_span_hours: this.calculateTimeSpan(dataPoints)
    };
  }

  /**
   * Analyze trend direction and velocity
   */
  analyzeTrendDirection(dataPoints) {
    if (dataPoints.length < 2) return null;
    
    const sortedData = [...dataPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const waveScores = sortedData.map(d => d.wave_score || 0);
    
    // Calculate linear regression
    const regression = this.calculateLinearRegression(waveScores);
    
    // Determine trend direction
    const direction = regression.slope > 0.1 ? 'rising' : 
                     regression.slope < -0.1 ? 'falling' : 'stable';
    
    // Calculate velocity (score change per hour)
    const timeSpanHours = this.calculateTimeSpan(sortedData);
    const totalChange = waveScores[waveScores.length - 1] - waveScores[0];
    const velocity = timeSpanHours > 0 ? totalChange / timeSpanHours : 0;
    
    return {
      direction: direction,
      velocity: velocity,
      acceleration: this.calculateAcceleration(waveScores),
      volatility: this.standardDeviation(waveScores),
      momentum_score: this.calculateMomentumScore(waveScores),
      regression: regression
    };
  }

  /**
   * Calculate linear projection for forecasting
   */
  calculateLinearProjection(dataPoints) {
    const sortedData = [...dataPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const waveScores = sortedData.map(d => d.wave_score || 0);
    
    const regression = this.calculateLinearRegression(waveScores);
    
    return {
      slope: regression.slope,
      intercept: regression.intercept,
      r_squared: regression.rSquared,
      last_value: waveScores[waveScores.length - 1],
      last_timestamp: sortedData[sortedData.length - 1].timestamp
    };
  }

  /**
   * Project values into the future
   */
  projectValues(projection, horizonMs) {
    const hoursAhead = horizonMs / (1000 * 60 * 60);
    const projectedScore = projection.last_value + (projection.slope * hoursAhead);
    
    // Apply bounds and confidence intervals
    const confidence = Math.max(0.3, projection.r_squared || 0.5);
    const confidenceInterval = (100 - projectedScore) * (1 - confidence) * 0.5;
    
    return {
      projected_wave_score: Math.max(0, Math.min(100, projectedScore)),
      confidence_lower: Math.max(0, projectedScore - confidenceInterval),
      confidence_upper: Math.min(100, projectedScore + confidenceInterval),
      confidence_level: confidence,
      projection_hours: hoursAhead,
      warning_flags: this.getProjectionWarningFlags(projectedScore, confidence)
    };
  }

  /**
   * Find similar trends for comparison
   */
  async findSimilarTrends(trendId, dataPoints) {
    try {
      const category = dataPoints[0]?.category;
      const platform = dataPoints[0]?.platform_source;
      
      // Query for trends in same category from last 30 days
      const { data, error } = await this.supabase
        .from('raw_ingestion_data')
        .select('*')
        .eq('category', category)
        .neq('content_id', dataPoints[0]?.content_id)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);
      
      if (error) throw error;
      
      return data || [];
      
    } catch (error) {
      console.error('❌ Failed to find similar trends:', error);
      return [];
    }
  }

  /**
   * Create performance comparison
   */
  createPerformanceComparison(dataPoints, similarTrends) {
    const currentTrend = {
      max_wave_score: Math.max(...dataPoints.map(d => d.wave_score || 0)),
      avg_wave_score: this.average(dataPoints.map(d => d.wave_score || 0)),
      total_reach: this.sum(dataPoints.map(d => d.normalized_metrics?.reach_estimate || 0))
    };
    
    const similarMetrics = similarTrends.map(trend => ({
      trend_id: trend.content_id,
      max_wave_score: trend.wave_score || 0,
      total_reach: trend.normalized_metrics?.reach_estimate || 0
    }));
    
    const percentiles = {
      wave_score: this.calculatePercentileRank(currentTrend.max_wave_score, similarMetrics.map(s => s.max_wave_score)),
      reach: this.calculatePercentileRank(currentTrend.total_reach, similarMetrics.map(s => s.total_reach))
    };
    
    return {
      current_trend: currentTrend,
      similar_trends: similarMetrics,
      performance_percentiles: percentiles,
      ranking: {
        by_wave_score: this.calculateRanking(currentTrend.max_wave_score, similarMetrics.map(s => s.max_wave_score)),
        by_reach: this.calculateRanking(currentTrend.total_reach, similarMetrics.map(s => s.total_reach))
      }
    };
  }

  /**
   * Create cross-platform comparison
   */
  createPlatformComparison(dataPoints) {
    const platforms = [...new Set(dataPoints.map(d => d.platform_source))];
    
    if (platforms.length < 2) return null; // Need multiple platforms
    
    const platformData = {};
    
    platforms.forEach(platform => {
      const platformPoints = dataPoints.filter(d => d.platform_source === platform);
      platformData[platform] = {
        data_points: platformPoints.length,
        avg_wave_score: this.average(platformPoints.map(d => d.wave_score || 0)),
        max_wave_score: Math.max(...platformPoints.map(d => d.wave_score || 0)),
        total_reach: this.sum(platformPoints.map(d => d.normalized_metrics?.reach_estimate || 0)),
        avg_engagement: this.average(platformPoints.map(d => d.normalized_metrics?.engagement_score || 0))
      };
    });
    
    // Find best performing platform
    const bestPlatform = Object.entries(platformData)
      .sort(([,a], [,b]) => b.avg_wave_score - a.avg_wave_score)[0];
    
    return {
      by_platform: platformData,
      best_performing: {
        platform: bestPlatform[0],
        metrics: bestPlatform[1]
      },
      cross_platform_reach: this.sum(Object.values(platformData).map(p => p.total_reach)),
      platform_diversity_score: this.calculatePlatformDiversityScore(platformData)
    };
  }

  /**
   * Store variants in database
   */
  async storeVariants(variants) {
    if (variants.length === 0) return;
    
    console.log(`💾 Storing ${variants.length} historical variants...`);
    
    try {
      const { error } = await this.supabase
        .from('trend_variants')
        .upsert(variants, { 
          onConflict: 'trend_id,variant_type,variant_name' 
        });
      
      if (error) {
        throw new Error(`Failed to store variants: ${error.message}`);
      }
      
      console.log(`✅ Stored ${variants.length} variants successfully`);
      
    } catch (error) {
      console.error('❌ Failed to store variants:', error);
      throw error;
    }
  }

  /**
   * Utility functions
   */
  parseTimeInterval(interval) {
    const match = interval.match(/^(\d+)([hdw])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      'h': 60 * 60 * 1000,      // hours
      'd': 24 * 60 * 60 * 1000, // days
      'w': 7 * 24 * 60 * 60 * 1000 // weeks
    };
    
    return value * multipliers[unit];
  }

  findClosestDataPoint(sortedData, targetTime) {
    let closest = null;
    let minDiff = Infinity;
    
    for (const point of sortedData) {
      const diff = Math.abs(new Date(point.timestamp) - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }
    
    return closest;
  }

  getDataForPeriod(dataPoints, timeframe) {
    const periodMs = this.parseTimeInterval(timeframe);
    const cutoff = new Date(Date.now() - periodMs);
    
    return dataPoints.filter(point => new Date(point.timestamp) >= cutoff);
  }

  average(numbers) {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  sum(numbers) {
    return numbers.reduce((sum, n) => sum + n, 0);
  }

  standardDeviation(numbers) {
    const avg = this.average(numbers);
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    const regression = this.calculateLinearRegression(values);
    return regression.slope;
  }

  calculateLinearRegression(values) {
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssRes = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssRes / ssTotal);
    
    return { slope, intercept, rSquared };
  }

  calculateTimeSpan(dataPoints) {
    if (dataPoints.length < 2) return 0;
    const sorted = [...dataPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const spanMs = new Date(sorted[sorted.length - 1].timestamp) - new Date(sorted[0].timestamp);
    return spanMs / (1000 * 60 * 60); // Return hours
  }

  calculateAcceleration(values) {
    if (values.length < 3) return 0;
    
    // Calculate second derivative (acceleration)
    const firstDerivatives = [];
    for (let i = 1; i < values.length; i++) {
      firstDerivatives.push(values[i] - values[i-1]);
    }
    
    const secondDerivatives = [];
    for (let i = 1; i < firstDerivatives.length; i++) {
      secondDerivatives.push(firstDerivatives[i] - firstDerivatives[i-1]);
    }
    
    return this.average(secondDerivatives);
  }

  calculateMomentumScore(values) {
    if (values.length < 2) return 0;
    
    const trend = this.calculateTrend(values);
    const volatility = this.standardDeviation(values);
    const recentChange = values[values.length - 1] - values[Math.max(0, values.length - 5)];
    
    // Momentum combines trend strength, recent change, and inverse of volatility
    return (Math.abs(trend) * 0.4) + (Math.abs(recentChange) * 0.4) + ((100 - volatility) * 0.2);
  }

  calculatePercentileRank(value, dataset) {
    const sorted = [...dataset].sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return (rank / sorted.length) * 100;
  }

  calculateRanking(value, dataset) {
    const sorted = [...dataset].sort((a, b) => b - a);
    return sorted.indexOf(value) + 1;
  }

  calculatePlatformDiversityScore(platformData) {
    const platforms = Object.keys(platformData);
    const totalReach = this.sum(Object.values(platformData).map(p => p.total_reach));
    
    // Calculate distribution evenness (entropy-based)
    const entropy = platforms.reduce((sum, platform) => {
      const proportion = platformData[platform].total_reach / totalReach;
      return sum - (proportion * Math.log2(proportion || 0.001));
    }, 0);
    
    // Normalize to 0-100 scale
    const maxEntropy = Math.log2(platforms.length);
    return (entropy / maxEntropy) * 100;
  }

  assessDataQuality(dataPoint) {
    let quality = 1.0;
    
    // Check for missing metrics
    if (!dataPoint.raw_metrics) quality *= 0.7;
    if (!dataPoint.normalized_metrics) quality *= 0.8;
    if (!dataPoint.wave_score) quality *= 0.9;
    
    // Check data recency
    const hoursOld = (Date.now() - new Date(dataPoint.timestamp)) / (1000 * 60 * 60);
    if (hoursOld > 24) quality *= 0.9;
    
    return Math.round(quality * 100) / 100;
  }

  calculateAggregationConfidence(dataPoints) {
    if (dataPoints.length === 0) return 0;
    
    let confidence = Math.min(1.0, dataPoints.length / 10); // More data = higher confidence
    
    // Check data quality
    const avgQuality = this.average(dataPoints.map(d => this.assessDataQuality(d)));
    confidence *= avgQuality;
    
    // Check time distribution
    const timeSpan = this.calculateTimeSpan(dataPoints);
    if (timeSpan > 0 && timeSpan < 168) { // Less than a week
      confidence *= Math.min(1.0, timeSpan / 24); // At least 24 hours is good
    }
    
    return Math.round(confidence * 100) / 100;
  }

  assessProjectionDataQuality(dataPoints) {
    const quality = this.calculateAggregationConfidence(dataPoints);
    
    // Additional checks for projection quality
    const waveScores = dataPoints.map(d => d.wave_score || 0);
    const volatility = this.standardDeviation(waveScores);
    
    // High volatility reduces projection quality
    const volatilityPenalty = Math.min(0.5, volatility / 100);
    
    return Math.max(0.1, quality - volatilityPenalty);
  }

  getProjectionWarnings(dataPoints, projection) {
    const warnings = [];
    
    if (dataPoints.length < 5) {
      warnings.push('insufficient_data');
    }
    
    if (projection.r_squared < 0.5) {
      warnings.push('low_correlation');
    }
    
    const volatility = this.standardDeviation(dataPoints.map(d => d.wave_score || 0));
    if (volatility > 30) {
      warnings.push('high_volatility');
    }
    
    const timeSpan = this.calculateTimeSpan(dataPoints);
    if (timeSpan < 6) {
      warnings.push('short_time_span');
    }
    
    return warnings;
  }

  getProjectionWarningFlags(projectedScore, confidence) {
    const flags = [];
    
    if (confidence < 0.5) flags.push('low_confidence');
    if (projectedScore > 90) flags.push('extreme_high_score');
    if (projectedScore < 10) flags.push('extreme_low_score');
    
    return flags;
  }

  calculateProjectionConfidence(projection) {
    let confidence = projection.r_squared || 0.5;
    
    // Reduce confidence for extreme slopes
    if (Math.abs(projection.slope) > 10) {
      confidence *= 0.8;
    }
    
    return Math.round(confidence * 100) / 100;
  }
}

export default HistoricalVariantGenerator;

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new HistoricalVariantGenerator();
  console.log('📜 Historical Variant Generator initialized');
  console.log('Variant types:', generator.variantTypes);
}