/**
 * WaveScope Normalization & Temporal Binning Engine
 * Handles data normalization and time-series binning for trend analysis
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class NormalizationEngine {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.rollingWindows = {
      short: 24 * 60 * 60 * 1000,    // 24 hours
      medium: 48 * 60 * 60 * 1000,   // 48 hours
      long: 7 * 24 * 60 * 60 * 1000  // 7 days
    };
    
    this.timeBins = {
      minute: 60 * 1000,
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000
    };
    
    this.platformFactors = {
      youtube: {
        engagement_weight: 1.2,
        reach_multiplier: 1.0,
        viral_threshold: 1000000
      },
      reddit: {
        engagement_weight: 0.8,
        reach_multiplier: 10.0,
        viral_threshold: 10000
      },
      tiktok: {
        engagement_weight: 1.5,
        reach_multiplier: 0.5,
        viral_threshold: 5000000
      }
    };
  }

  /**
   * Main normalization process
   */
  async normalizeData(timeWindow = 'medium') {
    console.log('🔄 Starting data normalization process...');
    
    try {
      const windowMs = this.rollingWindows[timeWindow];
      const cutoffTime = new Date(Date.now() - windowMs).toISOString();
      
      // Get raw data for normalization
      const rawData = await this.getRawDataForNormalization(cutoffTime);
      
      if (!rawData || rawData.length === 0) {
        console.log('📭 No data available for normalization');
        return;
      }
      
      console.log(`📊 Processing ${rawData.length} data points...`);
      
      // Group by platform and category for normalization
      const groupedData = this.groupDataForNormalization(rawData);
      
      // Calculate rolling statistics
      const rollingStats = await this.calculateRollingStatistics(groupedData, windowMs);
      
      // Apply normalization
      const normalizedData = this.applyNormalization(rawData, rollingStats);
      
      // Perform temporal binning
      const binnedData = this.performTemporalBinning(normalizedData);
      
      // Store normalized results
      await this.storeNormalizedData(binnedData);
      
      console.log(`✅ Normalized ${normalizedData.length} data points into ${binnedData.length} time bins`);
      
      return binnedData;
      
    } catch (error) {
      console.error('❌ Normalization failed:', error);
      throw error;
    }
  }

  /**
   * Get raw data for normalization
   */
  async getRawDataForNormalization(cutoffTime) {
    const { data, error } = await this.supabase
      .from('raw_ingestion_data')
      .select('*')
      .gte('timestamp', cutoffTime)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch raw data: ${error.message}`);
    }

    return data;
  }

  /**
   * Group data by platform and category for normalization
   */
  groupDataForNormalization(rawData) {
    const groups = {};
    
    rawData.forEach(item => {
      const key = `${item.platform_source}_${item.category}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(item);
    });
    
    return groups;
  }

  /**
   * Calculate rolling statistics for normalization
   */
  async calculateRollingStatistics(groupedData, windowMs) {
    console.log('📈 Calculating rolling statistics...');
    
    const stats = {};
    
    for (const [groupKey, dataPoints] of Object.entries(groupedData)) {
      const [platform, category] = groupKey.split('_');
      
      // Extract metric values
      const engagementScores = dataPoints.map(d => d.normalized_metrics?.engagement_score || 0);
      const reachEstimates = dataPoints.map(d => d.normalized_metrics?.reach_estimate || 0);
      const growthRates = dataPoints.map(d => d.normalized_metrics?.growth_rate || 0);
      
      stats[groupKey] = {
        platform,
        category,
        engagement: this.calculateStatistics(engagementScores),
        reach: this.calculateStatistics(reachEstimates),
        growth: this.calculateStatistics(growthRates),
        count: dataPoints.length,
        timeRange: windowMs
      };
    }
    
    return stats;
  }

  /**
   * Calculate statistical measures (mean, std dev, etc.)
   */
  calculateStatistics(values) {
    if (values.length === 0) {
      return { mean: 0, stdDev: 1, min: 0, max: 0, median: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance) || 1; // Avoid division by zero
    
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    return { mean, stdDev, min, max, median };
  }

  /**
   * Apply normalization to raw data
   */
  applyNormalization(rawData, rollingStats) {
    console.log('🎯 Applying normalization...');
    
    return rawData.map(item => {
      const groupKey = `${item.platform_source}_${item.category}`;
      const stats = rollingStats[groupKey];
      
      if (!stats) {
        // No stats available, return with basic normalization
        return {
          ...item,
          normalized_score: 50, // Default middle value
          z_score: 0,
          percentile_rank: 50
        };
      }
      
      const platformFactor = this.platformFactors[item.platform_source] || this.platformFactors.youtube;
      
      // Apply platform-specific normalization
      const engagement = item.normalized_metrics?.engagement_score || 0;
      const reach = item.normalized_metrics?.reach_estimate || 0;
      const growth = item.normalized_metrics?.growth_rate || 0;
      
      // Calculate Z-scores
      const engagementZ = (engagement - stats.engagement.mean) / stats.engagement.stdDev;
      const reachZ = (reach - stats.reach.mean) / stats.reach.stdDev;
      const growthZ = (growth - stats.growth.mean) / stats.growth.stdDev;
      
      // Apply platform weighting
      const weightedEngagement = engagement * platformFactor.engagement_weight;
      const weightedReach = reach * platformFactor.reach_multiplier;
      
      // Calculate normalized score (0-100 scale)
      const rawNormalizedScore = (
        (engagementZ * 0.4) +
        (reachZ * 0.35) +
        (growthZ * 0.25)
      );
      
      // Convert to 0-100 scale using sigmoid function
      const normalizedScore = this.sigmoidNormalization(rawNormalizedScore);
      
      // Calculate percentile rank
      const percentileRank = this.calculatePercentileRank(engagement, stats.engagement);
      
      return {
        ...item,
        normalized_score: normalizedScore,
        z_score: rawNormalizedScore,
        percentile_rank: percentileRank,
        weighted_metrics: {
          engagement: weightedEngagement,
          reach: weightedReach,
          growth: growth
        },
        normalization_metadata: {
          group_key: groupKey,
          sample_size: stats.count,
          platform_factor: platformFactor
        }
      };
    });
  }

  /**
   * Sigmoid normalization to 0-100 scale
   */
  sigmoidNormalization(zScore) {
    // Apply sigmoid function: 1 / (1 + e^(-x))
    const sigmoid = 1 / (1 + Math.exp(-zScore));
    
    // Scale to 0-100
    return Math.round(sigmoid * 100);
  }

  /**
   * Calculate percentile rank
   */
  calculatePercentileRank(value, stats) {
    if (stats.max === stats.min) return 50;
    
    const percentile = ((value - stats.min) / (stats.max - stats.min)) * 100;
    return Math.round(Math.max(0, Math.min(100, percentile)));
  }

  /**
   * Perform temporal binning
   */
  performTemporalBinning(normalizedData, binSize = 'hourly') {
    console.log(`⏰ Performing temporal binning (${binSize})...`);
    
    const binDuration = this.timeBins[binSize];
    const bins = new Map();
    
    normalizedData.forEach(item => {
      const timestamp = new Date(item.timestamp);
      
      // Round down to bin boundary
      const binTimestamp = new Date(Math.floor(timestamp.getTime() / binDuration) * binDuration);
      const binKey = `${binTimestamp.toISOString()}_${item.platform_source}_${item.category}`;
      
      if (!bins.has(binKey)) {
        bins.set(binKey, {
          timestamp: binTimestamp.toISOString(),
          platform_source: item.platform_source,
          category: item.category,
          bin_duration_ms: binDuration,
          data_points: [],
          aggregated_metrics: null
        });
      }
      
      bins.get(binKey).data_points.push(item);
    });
    
    // Aggregate data within each bin
    const binnedData = Array.from(bins.values()).map(bin => {
      const metrics = this.aggregateBinMetrics(bin.data_points);
      
      return {
        ...bin,
        aggregated_metrics: metrics,
        data_point_count: bin.data_points.length
      };
    });
    
    return binnedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Aggregate metrics within a time bin
   */
  aggregateBinMetrics(dataPoints) {
    if (dataPoints.length === 0) {
      return {
        avg_normalized_score: 0,
        max_normalized_score: 0,
        total_reach: 0,
        avg_engagement: 0,
        trend_momentum: 0
      };
    }
    
    const scores = dataPoints.map(d => d.normalized_score);
    const reaches = dataPoints.map(d => d.normalized_metrics?.reach_estimate || 0);
    const engagements = dataPoints.map(d => d.weighted_metrics?.engagement || 0);
    
    // Calculate trend momentum (rate of change)
    const momentum = dataPoints.length > 1 
      ? this.calculateMomentum(dataPoints)
      : 0;
    
    return {
      avg_normalized_score: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      max_normalized_score: Math.max(...scores),
      total_reach: reaches.reduce((sum, r) => sum + r, 0),
      avg_engagement: engagements.reduce((sum, e) => sum + e, 0) / engagements.length,
      trend_momentum: momentum,
      volatility: this.calculateVolatility(scores)
    };
  }

  /**
   * Calculate trend momentum
   */
  calculateMomentum(dataPoints) {
    if (dataPoints.length < 2) return 0;
    
    // Sort by timestamp
    const sorted = dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate rate of change in normalized scores
    const first = sorted[0].normalized_score;
    const last = sorted[sorted.length - 1].normalized_score;
    const timeSpan = new Date(sorted[sorted.length - 1].timestamp) - new Date(sorted[0].timestamp);
    
    if (timeSpan === 0) return 0;
    
    // Momentum = score change per hour
    const momentum = ((last - first) / (timeSpan / (1000 * 60 * 60)));
    
    return Math.round(momentum * 100) / 100;
  }

  /**
   * Calculate volatility (standard deviation of scores)
   */
  calculateVolatility(scores) {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Store normalized and binned data
   */
  async storeNormalizedData(binnedData) {
    console.log('💾 Storing normalized data...');
    
    try {
      // Prepare data for storage
      const normalizedRecords = binnedData.map(bin => ({
        bin_timestamp: bin.timestamp,
        platform_source: bin.platform_source,
        category: bin.category,
        bin_duration_ms: bin.bin_duration_ms,
        data_point_count: bin.data_point_count,
        avg_normalized_score: bin.aggregated_metrics.avg_normalized_score,
        max_normalized_score: bin.aggregated_metrics.max_normalized_score,
        total_reach: bin.aggregated_metrics.total_reach,
        avg_engagement: bin.aggregated_metrics.avg_engagement,
        trend_momentum: bin.aggregated_metrics.trend_momentum,
        volatility: bin.aggregated_metrics.volatility,
        created_at: new Date().toISOString()
      }));
      
      // Store in normalized_trend_bins table
      const { error } = await this.supabase
        .from('normalized_trend_bins')
        .upsert(normalizedRecords, { 
          onConflict: 'bin_timestamp,platform_source,category' 
        });
      
      if (error) {
        throw new Error(`Failed to store normalized data: ${error.message}`);
      }
      
      console.log(`✅ Stored ${normalizedRecords.length} normalized bins`);
      
    } catch (error) {
      console.error('❌ Failed to store normalized data:', error);
      throw error;
    }
  }

  /**
   * Get normalized data for time range
   */
  async getNormalizedData(timeRange = '24h', platform = null, category = null) {
    console.log('📊 Fetching normalized data...');
    
    const hours = parseInt(timeRange.replace('h', ''));
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    let query = this.supabase
      .from('normalized_trend_bins')
      .select('*')
      .gte('bin_timestamp', cutoffTime)
      .order('bin_timestamp', { ascending: true });
    
    if (platform) {
      query = query.eq('platform_source', platform);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch normalized data: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Start periodic normalization
   */
  startPeriodicNormalization(intervalMinutes = 30) {
    console.log(`🔄 Starting periodic normalization (every ${intervalMinutes} minutes)...`);
    
    setInterval(async () => {
      try {
        await this.normalizeData();
      } catch (error) {
        console.error('❌ Periodic normalization failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

export default NormalizationEngine;

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = new NormalizationEngine();
  
  // Run normalization
  engine.normalizeData()
    .then(() => {
      console.log('✅ Normalization completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Normalization failed:', error);
      process.exit(1);
    });
}