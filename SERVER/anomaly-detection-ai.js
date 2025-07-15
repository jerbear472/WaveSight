/**
 * Anomaly Detection and AI Forecasting Engine
 * Advanced analytics for viral trend prediction and spike detection
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class AnomalyDetectionAI {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Anomaly detection parameters
    this.anomalyThresholds = {
      spike: {
        zScore: 2.5,        // Standard deviations above mean
        percentileRank: 95,  // Top 5% of scores
        rapidGrowth: 0.5     // 50% growth in short period
      },
      drop: {
        zScore: -2.0,
        percentileRank: 5,
        rapidDecline: -0.4
      },
      unusual: {
        volatility: 30,      // High volatility threshold
        patternDeviation: 0.7 // Correlation with expected pattern
      }
    };
    
    // Forecasting models
    this.forecastingModels = {
      linear: this.linearRegressionForecast.bind(this),
      exponential: this.exponentialSmoothingForecast.bind(this),
      seasonal: this.seasonalForecast.bind(this),
      ml: this.mlBasedForecast.bind(this)
    };
    
    // Statistical cache for performance
    this.statisticsCache = new Map();
    this.forecastCache = new Map();
  }

  /**
   * Main anomaly detection process
   */
  async detectAnomalies(timeWindow = '24h') {
    console.log('🔍 Starting anomaly detection process...');
    
    try {
      // Get recent trend data
      const trendData = await this.getRecentTrendData(timeWindow);
      
      if (!trendData || trendData.length === 0) {
        console.log('📭 No data available for anomaly detection');
        return [];
      }
      
      console.log(`📊 Analyzing ${trendData.length} data points for anomalies...`);
      
      // Group data by trend for analysis
      const groupedData = this.groupDataByTrend(trendData);
      
      const detectedAnomalies = [];
      
      // Analyze each trend for anomalies
      for (const [trendId, data] of Object.entries(groupedData)) {
        const anomalies = await this.analyzeTrendForAnomalies(trendId, data);
        detectedAnomalies.push(...anomalies);
      }
      
      // Store detected anomalies
      if (detectedAnomalies.length > 0) {
        await this.storeAnomalies(detectedAnomalies);
      }
      
      console.log(`✅ Detected ${detectedAnomalies.length} anomalies`);
      return detectedAnomalies;
      
    } catch (error) {
      console.error('❌ Anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a single trend for anomalies
   */
  async analyzeTrendForAnomalies(trendId, data) {
    const anomalies = [];
    
    if (data.length < 5) {
      console.log(`⚠️ Insufficient data for ${trendId} (${data.length} points)`);
      return anomalies;
    }
    
    // Sort data by timestamp
    const sortedData = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate baseline statistics
    const statistics = this.calculateBaselineStatistics(sortedData);
    
    // Detect different types of anomalies
    const spikes = this.detectSpikes(sortedData, statistics);
    const drops = this.detectDrops(sortedData, statistics);
    const patterns = this.detectUnusualPatterns(sortedData, statistics);
    
    anomalies.push(...spikes, ...drops, ...patterns);
    
    return anomalies.map(anomaly => ({
      ...anomaly,
      trend_id: trendId,
      detection_timestamp: new Date().toISOString(),
      detection_method: 'statistical_ai'
    }));
  }

  /**
   * Detect viral spikes
   */
  detectSpikes(data, statistics) {
    const spikes = [];
    const { mean, stdDev } = statistics.waveScore;
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      const currentScore = current.wave_score || 0;
      const previousScore = previous.wave_score || 0;
      
      // Calculate z-score
      const zScore = (currentScore - mean) / stdDev;
      
      // Calculate growth rate
      const growthRate = previousScore > 0 ? (currentScore - previousScore) / previousScore : 0;
      
      // Check for spike conditions
      const isStatisticalSpike = zScore > this.anomalyThresholds.spike.zScore;
      const isRapidGrowth = growthRate > this.anomalyThresholds.spike.rapidGrowth;
      const isHighScore = currentScore > 80; // WaveScore > 80 is considered high
      
      if (isStatisticalSpike || (isRapidGrowth && isHighScore)) {
        const severity = this.calculateSpikeSeverity(zScore, growthRate, currentScore);
        
        spikes.push({
          anomaly_type: 'spike',
          severity: severity,
          anomaly_score: Math.min(100, zScore * 10 + growthRate * 50),
          baseline_value: previousScore,
          anomaly_value: currentScore,
          threshold_exceeded: zScore,
          detection_timestamp: current.timestamp,
          anomaly_duration_minutes: this.calculateDuration(data, i),
          probable_causes: this.identifySpikeCauses(current, growthRate, zScore),
          confidence: this.calculateConfidence('spike', zScore, growthRate),
          metadata: {
            z_score: zScore,
            growth_rate: growthRate,
            statistical_spike: isStatisticalSpike,
            rapid_growth: isRapidGrowth,
            baseline_mean: mean,
            baseline_std: stdDev
          }
        });
      }
    }
    
    return spikes;
  }

  /**
   * Detect dramatic drops
   */
  detectDrops(data, statistics) {
    const drops = [];
    const { mean, stdDev } = statistics.waveScore;
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      const currentScore = current.wave_score || 0;
      const previousScore = previous.wave_score || 0;
      
      // Calculate z-score (negative for drops)
      const zScore = (currentScore - mean) / stdDev;
      
      // Calculate decline rate
      const declineRate = previousScore > 0 ? (currentScore - previousScore) / previousScore : 0;
      
      // Check for drop conditions
      const isStatisticalDrop = zScore < this.anomalyThresholds.drop.zScore;
      const isRapidDecline = declineRate < this.anomalyThresholds.drop.rapidDecline;
      const isSignificantDrop = previousScore > 60 && currentScore < 40; // Major drop
      
      if (isStatisticalDrop || (isRapidDecline && isSignificantDrop)) {
        const severity = this.calculateDropSeverity(zScore, declineRate, currentScore);
        
        drops.push({
          anomaly_type: 'drop',
          severity: severity,
          anomaly_score: Math.min(100, Math.abs(zScore) * 10 + Math.abs(declineRate) * 50),
          baseline_value: previousScore,
          anomaly_value: currentScore,
          threshold_exceeded: Math.abs(zScore),
          detection_timestamp: current.timestamp,
          anomaly_duration_minutes: this.calculateDuration(data, i),
          probable_causes: this.identifyDropCauses(current, declineRate, zScore),
          confidence: this.calculateConfidence('drop', Math.abs(zScore), Math.abs(declineRate)),
          metadata: {
            z_score: zScore,
            decline_rate: declineRate,
            statistical_drop: isStatisticalDrop,
            rapid_decline: isRapidDecline,
            baseline_mean: mean,
            baseline_std: stdDev
          }
        });
      }
    }
    
    return drops;
  }

  /**
   * Detect unusual patterns
   */
  detectUnusualPatterns(data, statistics) {
    const patterns = [];
    
    if (data.length < 10) return patterns; // Need enough data for pattern analysis
    
    // Calculate volatility
    const volatility = statistics.waveScore.stdDev;
    
    // Check for unusual volatility
    if (volatility > this.anomalyThresholds.unusual.volatility) {
      patterns.push({
        anomaly_type: 'unusual_pattern',
        severity: 'medium',
        anomaly_score: Math.min(100, volatility * 2),
        baseline_value: statistics.waveScore.mean,
        anomaly_value: volatility,
        threshold_exceeded: volatility - this.anomalyThresholds.unusual.volatility,
        detection_timestamp: data[data.length - 1].timestamp,
        anomaly_duration_minutes: this.calculateDuration(data, data.length - 1),
        probable_causes: ['high_volatility', 'irregular_pattern', 'external_factors'],
        confidence: 0.75,
        metadata: {
          volatility: volatility,
          pattern_type: 'high_volatility',
          data_points: data.length
        }
      });
    }
    
    // Check for oscillating patterns
    const oscillationScore = this.detectOscillation(data);
    if (oscillationScore > 0.7) {
      patterns.push({
        anomaly_type: 'unusual_pattern',
        severity: 'low',
        anomaly_score: oscillationScore * 100,
        baseline_value: statistics.waveScore.mean,
        anomaly_value: oscillationScore,
        threshold_exceeded: oscillationScore - 0.7,
        detection_timestamp: data[data.length - 1].timestamp,
        anomaly_duration_minutes: this.calculateDuration(data, data.length - 1),
        probable_causes: ['oscillating_behavior', 'competing_trends', 'user_fatigue'],
        confidence: 0.65,
        metadata: {
          oscillation_score: oscillationScore,
          pattern_type: 'oscillation'
        }
      });
    }
    
    return patterns;
  }

  /**
   * Generate AI-powered forecasts
   */
  async generateForecasts(trendId, horizonHours = 24) {
    console.log(`🔮 Generating AI forecasts for ${trendId} (${horizonHours}h ahead)...`);
    
    try {
      // Get historical data for forecasting
      const historicalData = await this.getHistoricalData(trendId, '7d');
      
      if (!historicalData || historicalData.length < 10) {
        console.log(`⚠️ Insufficient historical data for ${trendId}`);
        return null;
      }
      
      // Generate forecasts using different models
      const forecasts = {};
      
      for (const [modelName, modelFunction] of Object.entries(this.forecastingModels)) {
        try {
          const forecast = await modelFunction(historicalData, horizonHours);
          if (forecast) {
            forecasts[modelName] = forecast;
          }
        } catch (error) {
          console.warn(`⚠️ ${modelName} forecast failed:`, error.message);
        }
      }
      
      // Ensemble forecast (combine multiple models)
      const ensembleForecast = this.createEnsembleForecast(forecasts, horizonHours);
      
      // Store forecast results
      if (ensembleForecast) {
        await this.storeForecast(trendId, ensembleForecast);
      }
      
      return ensembleForecast;
      
    } catch (error) {
      console.error(`❌ Forecast generation failed for ${trendId}:`, error);
      throw error;
    }
  }

  /**
   * Linear regression forecast
   */
  async linearRegressionForecast(data, horizonHours) {
    const scores = data.map(d => d.wave_score || 0);
    const timestamps = data.map(d => new Date(d.timestamp).getTime());
    
    // Calculate linear regression
    const regression = this.calculateLinearRegression(scores, timestamps);
    
    // Generate future predictions
    const predictions = [];
    const startTime = Math.max(...timestamps);
    const hourMs = 60 * 60 * 1000;
    
    for (let h = 1; h <= horizonHours; h++) {
      const futureTime = startTime + (h * hourMs);
      const predictedScore = regression.predict(futureTime);
      
      // Add confidence intervals
      const confidence = Math.max(0.3, regression.rSquared || 0.5);
      const errorMargin = (100 - predictedScore) * (1 - confidence) * 0.3;
      
      predictions.push({
        timestamp: new Date(futureTime).toISOString(),
        predicted_value: Math.max(0, Math.min(100, predictedScore)),
        confidence_lower: Math.max(0, predictedScore - errorMargin),
        confidence_upper: Math.min(100, predictedScore + errorMargin),
        confidence_level: confidence,
        hours_ahead: h
      });
    }
    
    return {
      model_type: 'linear_regression',
      model_accuracy: regression.rSquared,
      predictions: predictions,
      model_metadata: {
        slope: regression.slope,
        intercept: regression.intercept,
        training_points: data.length
      }
    };
  }

  /**
   * Exponential smoothing forecast
   */
  async exponentialSmoothingForecast(data, horizonHours) {
    const scores = data.map(d => d.wave_score || 0);
    const alpha = 0.3; // Smoothing parameter
    
    // Calculate exponential smoothing
    let smoothedValues = [scores[0]];
    for (let i = 1; i < scores.length; i++) {
      const smoothed = alpha * scores[i] + (1 - alpha) * smoothedValues[i - 1];
      smoothedValues.push(smoothed);
    }
    
    // Calculate trend component
    const trend = this.calculateTrend(smoothedValues);
    
    // Generate predictions
    const predictions = [];
    const lastSmoothed = smoothedValues[smoothedValues.length - 1];
    const startTime = new Date(data[data.length - 1].timestamp).getTime();
    const hourMs = 60 * 60 * 1000;
    
    for (let h = 1; h <= horizonHours; h++) {
      const futureTime = startTime + (h * hourMs);
      const predictedScore = lastSmoothed + (trend * h);
      
      const confidence = 0.6;
      const errorMargin = Math.abs(trend) * h * 0.5;
      
      predictions.push({
        timestamp: new Date(futureTime).toISOString(),
        predicted_value: Math.max(0, Math.min(100, predictedScore)),
        confidence_lower: Math.max(0, predictedScore - errorMargin),
        confidence_upper: Math.min(100, predictedScore + errorMargin),
        confidence_level: confidence,
        hours_ahead: h
      });
    }
    
    return {
      model_type: 'exponential_smoothing',
      model_accuracy: 0.6,
      predictions: predictions,
      model_metadata: {
        alpha: alpha,
        trend: trend,
        last_smoothed: lastSmoothed
      }
    };
  }

  /**
   * Seasonal forecast (placeholder for advanced seasonal analysis)
   */
  async seasonalForecast(data, horizonHours) {
    // Simplified seasonal analysis
    const hourlyAverages = this.calculateHourlyAverages(data);
    
    const predictions = [];
    const startTime = new Date(data[data.length - 1].timestamp).getTime();
    const hourMs = 60 * 60 * 1000;
    
    for (let h = 1; h <= horizonHours; h++) {
      const futureTime = startTime + (h * hourMs);
      const hour = new Date(futureTime).getHours();
      const seasonalComponent = hourlyAverages[hour] || 50;
      
      // Add trend component
      const lastScore = data[data.length - 1].wave_score || 50;
      const trendComponent = this.calculateTrend(data.map(d => d.wave_score || 0));
      
      const predictedScore = seasonalComponent + (trendComponent * h * 0.1);
      
      predictions.push({
        timestamp: new Date(futureTime).toISOString(),
        predicted_value: Math.max(0, Math.min(100, predictedScore)),
        confidence_lower: Math.max(0, predictedScore - 10),
        confidence_upper: Math.min(100, predictedScore + 10),
        confidence_level: 0.5,
        hours_ahead: h
      });
    }
    
    return {
      model_type: 'seasonal',
      model_accuracy: 0.5,
      predictions: predictions,
      model_metadata: {
        hourly_averages: hourlyAverages,
        seasonal_strength: 0.3
      }
    };
  }

  /**
   * ML-based forecast (simplified neural network approach)
   */
  async mlBasedForecast(data, horizonHours) {
    // Simplified ML approach using moving averages and pattern recognition
    const windowSize = Math.min(10, Math.floor(data.length / 3));
    const scores = data.map(d => d.wave_score || 0);
    
    // Calculate moving averages for feature engineering
    const features = this.extractMLFeatures(scores, windowSize);
    
    // Simple pattern-based prediction
    const predictions = [];
    const startTime = new Date(data[data.length - 1].timestamp).getTime();
    const hourMs = 60 * 60 * 1000;
    
    const lastFeatures = features[features.length - 1];
    const patternStrength = this.calculatePatternStrength(scores);
    
    for (let h = 1; h <= horizonHours; h++) {
      const futureTime = startTime + (h * hourMs);
      
      // Pattern-based prediction
      const patternPrediction = this.predictFromPattern(lastFeatures, h, patternStrength);
      
      const confidence = Math.max(0.4, patternStrength);
      const errorMargin = (100 - patternPrediction) * (1 - confidence) * 0.4;
      
      predictions.push({
        timestamp: new Date(futureTime).toISOString(),
        predicted_value: Math.max(0, Math.min(100, patternPrediction)),
        confidence_lower: Math.max(0, patternPrediction - errorMargin),
        confidence_upper: Math.min(100, patternPrediction + errorMargin),
        confidence_level: confidence,
        hours_ahead: h
      });
    }
    
    return {
      model_type: 'ml_pattern',
      model_accuracy: patternStrength,
      predictions: predictions,
      model_metadata: {
        pattern_strength: patternStrength,
        feature_count: features.length,
        window_size: windowSize
      }
    };
  }

  /**
   * Create ensemble forecast by combining multiple models
   */
  createEnsembleForecast(forecasts, horizonHours) {
    const modelNames = Object.keys(forecasts);
    
    if (modelNames.length === 0) {
      console.warn('⚠️ No forecasts available for ensemble');
      return null;
    }
    
    // Weight models by their accuracy
    const weights = {};
    let totalWeight = 0;
    
    modelNames.forEach(model => {
      const accuracy = forecasts[model].model_accuracy || 0.5;
      weights[model] = accuracy;
      totalWeight += accuracy;
    });
    
    // Normalize weights
    Object.keys(weights).forEach(model => {
      weights[model] = weights[model] / totalWeight;
    });
    
    // Combine predictions
    const ensemblePredictions = [];
    
    for (let h = 1; h <= horizonHours; h++) {
      let weightedSum = 0;
      let weightedConfidenceLower = 0;
      let weightedConfidenceUpper = 0;
      let totalConfidence = 0;
      
      modelNames.forEach(model => {
        const prediction = forecasts[model].predictions[h - 1];
        if (prediction) {
          const weight = weights[model];
          weightedSum += prediction.predicted_value * weight;
          weightedConfidenceLower += prediction.confidence_lower * weight;
          weightedConfidenceUpper += prediction.confidence_upper * weight;
          totalConfidence += prediction.confidence_level * weight;
        }
      });
      
      const futureTime = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
      
      ensemblePredictions.push({
        timestamp: futureTime,
        predicted_value: Math.round(weightedSum * 100) / 100,
        confidence_lower: Math.round(weightedConfidenceLower * 100) / 100,
        confidence_upper: Math.round(weightedConfidenceUpper * 100) / 100,
        confidence_level: Math.round(totalConfidence * 100) / 100,
        hours_ahead: h
      });
    }
    
    return {
      forecast_type: 'ensemble',
      model_type: 'ensemble',
      model_accuracy: totalWeight / modelNames.length,
      predictions: ensemblePredictions,
      component_models: modelNames,
      model_weights: weights,
      warning_flags: this.assessForecastWarnings(ensemblePredictions)
    };
  }

  // Utility methods...
  
  async getRecentTrendData(timeWindow) {
    const hours = parseInt(timeWindow.replace('h', '').replace('d', '') * (timeWindow.includes('d') ? 24 : 1));
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('wavescores')
      .select('*')
      .gte('calculated_at', cutoffTime)
      .order('calculated_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  groupDataByTrend(data) {
    const groups = {};
    data.forEach(item => {
      if (!groups[item.trend_id]) {
        groups[item.trend_id] = [];
      }
      groups[item.trend_id].push(item);
    });
    return groups;
  }

  calculateBaselineStatistics(data) {
    const waveScores = data.map(d => d.wave_score || 0);
    const mean = waveScores.reduce((sum, s) => sum + s, 0) / waveScores.length;
    const variance = waveScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / waveScores.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      waveScore: { mean, stdDev, min: Math.min(...waveScores), max: Math.max(...waveScores) }
    };
  }

  calculateSpikeSeverity(zScore, growthRate, currentScore) {
    if (zScore > 3.5 || growthRate > 1.0 || currentScore > 90) return 'critical';
    if (zScore > 3.0 || growthRate > 0.7 || currentScore > 85) return 'high';
    if (zScore > 2.5 || growthRate > 0.5 || currentScore > 75) return 'medium';
    return 'low';
  }

  calculateDropSeverity(zScore, declineRate, currentScore) {
    if (Math.abs(zScore) > 3.0 || Math.abs(declineRate) > 0.8 || currentScore < 10) return 'high';
    if (Math.abs(zScore) > 2.5 || Math.abs(declineRate) > 0.6 || currentScore < 20) return 'medium';
    return 'low';
  }

  calculateConfidence(type, zScore, changeRate) {
    const zScoreConfidence = Math.min(1.0, Math.abs(zScore) / 4.0);
    const changeConfidence = Math.min(1.0, Math.abs(changeRate));
    return (zScoreConfidence + changeConfidence) / 2;
  }

  calculateDuration(data, currentIndex) {
    // Simplified duration calculation
    return Math.min(60, currentIndex * 10); // Estimate in minutes
  }

  identifySpikeCauses(dataPoint, growthRate, zScore) {
    const causes = [];
    
    if (growthRate > 0.8) causes.push('viral_acceleration');
    if (zScore > 3.0) causes.push('statistical_outlier');
    if (dataPoint.platform_source === 'tiktok') causes.push('tiktok_algorithm_boost');
    if (dataPoint.platform_source === 'youtube') causes.push('youtube_trending');
    
    causes.push('possible_external_event', 'influencer_mention', 'news_coverage');
    
    return causes;
  }

  identifyDropCauses(dataPoint, declineRate, zScore) {
    const causes = [];
    
    if (Math.abs(declineRate) > 0.6) causes.push('rapid_decline');
    if (Math.abs(zScore) > 2.5) causes.push('statistical_drop');
    
    causes.push('user_fatigue', 'algorithm_change', 'competing_content', 'trend_saturation');
    
    return causes;
  }

  detectOscillation(data) {
    // Simple oscillation detection based on direction changes
    let directionChanges = 0;
    let lastDirection = 0;
    
    for (let i = 1; i < data.length; i++) {
      const currentDirection = Math.sign(data[i].wave_score - data[i-1].wave_score);
      if (currentDirection !== 0 && currentDirection !== lastDirection && lastDirection !== 0) {
        directionChanges++;
      }
      if (currentDirection !== 0) lastDirection = currentDirection;
    }
    
    return directionChanges / (data.length - 1);
  }

  calculateLinearRegression(values, timestamps) {
    const n = values.length;
    const sumX = timestamps.reduce((sum, t) => sum + t, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = timestamps.reduce((sum, t, i) => sum + t * values[i], 0);
    const sumXX = timestamps.reduce((sum, t) => sum + t * t, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0);
    const ssRes = values.reduce((sum, v, i) => {
      const predicted = slope * timestamps[i] + intercept;
      return sum + Math.pow(v - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssRes / ssTotal);
    
    return {
      slope,
      intercept,
      rSquared,
      predict: (x) => slope * x + intercept
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    return (values[values.length - 1] - values[0]) / values.length;
  }

  calculateHourlyAverages(data) {
    const hourlyData = {};
    
    data.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(item.wave_score || 0);
    });
    
    const averages = {};
    Object.keys(hourlyData).forEach(hour => {
      const scores = hourlyData[hour];
      averages[hour] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    });
    
    return averages;
  }

  extractMLFeatures(scores, windowSize) {
    const features = [];
    
    for (let i = windowSize; i < scores.length; i++) {
      const window = scores.slice(i - windowSize, i);
      const mean = window.reduce((sum, s) => sum + s, 0) / window.length;
      const trend = (window[window.length - 1] - window[0]) / window.length;
      const volatility = Math.sqrt(window.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / window.length);
      
      features.push({ mean, trend, volatility });
    }
    
    return features;
  }

  calculatePatternStrength(scores) {
    // Simplified pattern strength calculation
    const trend = this.calculateTrend(scores);
    const volatility = Math.sqrt(scores.reduce((sum, s, i, arr) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return sum + Math.pow(s - mean, 2);
    }, 0) / scores.length);
    
    return Math.max(0.3, 1 - (volatility / 100));
  }

  predictFromPattern(features, hoursAhead, patternStrength) {
    // Simple pattern-based prediction
    const trendComponent = features.trend * hoursAhead;
    const baseValue = features.mean;
    
    return Math.max(0, Math.min(100, baseValue + trendComponent));
  }

  assessForecastWarnings(predictions) {
    const warnings = [];
    
    // Check for extreme predictions
    predictions.forEach(p => {
      if (p.predicted_value > 95) warnings.push('extreme_high_prediction');
      if (p.predicted_value < 5) warnings.push('extreme_low_prediction');
      if (p.confidence_level < 0.4) warnings.push('low_confidence');
    });
    
    // Check for high volatility in predictions
    const values = predictions.map(p => p.predicted_value);
    const volatility = Math.sqrt(values.reduce((sum, v, i, arr) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return sum + Math.pow(v - mean, 2);
    }, 0) / values.length);
    
    if (volatility > 20) warnings.push('high_volatility_forecast');
    
    return warnings;
  }

  async storeAnomalies(anomalies) {
    const { error } = await this.supabase
      .from('anomaly_detection')
      .upsert(anomalies, { onConflict: 'trend_id,detection_timestamp,anomaly_type' });
    
    if (error) throw new Error(`Failed to store anomalies: ${error.message}`);
  }

  async storeForecast(trendId, forecast) {
    const forecastRecords = forecast.predictions.map(prediction => ({
      trend_id: trendId,
      forecast_type: 'wavescore',
      forecast_horizon_hours: prediction.hours_ahead,
      predicted_value: prediction.predicted_value,
      confidence_lower: prediction.confidence_lower,
      confidence_upper: prediction.confidence_upper,
      confidence_level: prediction.confidence_level,
      model_type: forecast.model_type,
      model_accuracy: forecast.model_accuracy,
      forecast_metadata: forecast,
      warning_flags: forecast.warning_flags || [],
      forecasted_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + prediction.hours_ahead * 60 * 60 * 1000).toISOString()
    }));
    
    const { error } = await this.supabase
      .from('forecast')
      .upsert(forecastRecords, { onConflict: 'trend_id,forecast_type,forecasted_at' });
    
    if (error) throw new Error(`Failed to store forecast: ${error.message}`);
  }

  async getHistoricalData(trendId, timeWindow) {
    const hours = parseInt(timeWindow.replace('h', '').replace('d', '') * (timeWindow.includes('d') ? 24 : 1));
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('wavescores')
      .select('*')
      .eq('trend_id', trendId)
      .gte('calculated_at', cutoffTime)
      .order('calculated_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }
}

export default AnomalyDetectionAI;

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const detector = new AnomalyDetectionAI();
  
  console.log('🤖 Starting Anomaly Detection and AI Forecasting...');
  
  // Run anomaly detection
  detector.detectAnomalies('24h')
    .then(anomalies => {
      console.log(`✅ Detected ${anomalies.length} anomalies`);
      
      // Run forecasting for detected trends
      const uniqueTrends = [...new Set(anomalies.map(a => a.trend_id))];
      return Promise.all(uniqueTrends.map(trendId => detector.generateForecasts(trendId, 24)));
    })
    .then(forecasts => {
      console.log(`✅ Generated ${forecasts.filter(f => f).length} forecasts`);
      console.log('🎉 Anomaly Detection and AI Forecasting completed');
    })
    .catch(error => {
      console.error('❌ Process failed:', error);
      process.exit(1);
    });
}