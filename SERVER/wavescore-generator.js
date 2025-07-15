/**
 * WaveScore Generator - Advanced Multi-Factor Scoring Algorithm
 * Implements: WaveScore = α·NormEngagement + β·GrowthRate + γ·SentimentMomentum + δ·AudienceDiversity
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class WaveScoreGenerator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // WaveScore Formula Coefficients
    this.coefficients = {
      α: 0.35,  // Normalized Engagement Weight
      β: 0.25,  // Growth Rate Weight
      γ: 0.25,  // Sentiment Momentum Weight
      δ: 0.15   // Audience Diversity Weight
    };
    
    // Platform-specific adjustment factors
    this.platformAdjustments = {
      youtube: {
        engagement_boost: 1.2,
        viral_threshold: 1000000,
        sentiment_weight: 1.0,
        diversity_factor: 1.1
      },
      reddit: {
        engagement_boost: 0.9,
        viral_threshold: 50000,
        sentiment_weight: 1.3,
        diversity_factor: 0.8
      },
      tiktok: {
        engagement_boost: 1.5,
        viral_threshold: 5000000,
        sentiment_weight: 0.8,
        diversity_factor: 1.2
      }
    };
    
    // Sentiment analysis cache
    this.sentimentCache = new Map();
    
    // Statistics for score normalization
    this.scoreStatistics = {
      global: { mean: 50, stdDev: 20 },
      byPlatform: {},
      byCategory: {}
    };
  }

  /**
   * Calculate WaveScore for a given data point
   */
  async calculateWaveScore(dataPoint, contextData = null) {
    try {
      // Get the four main components
      const normEngagement = await this.calculateNormalizedEngagement(dataPoint, contextData);
      const growthRate = await this.calculateGrowthRate(dataPoint, contextData);
      const sentimentMomentum = await this.calculateSentimentMomentum(dataPoint);
      const audienceDiversity = await this.calculateAudienceDiversity(dataPoint);
      
      // Apply platform adjustments
      const platformFactor = this.platformAdjustments[dataPoint.platform_source] || 
                           this.platformAdjustments.youtube;
      
      // Calculate base WaveScore using the formula
      const baseScore = (
        (this.coefficients.α * normEngagement * platformFactor.engagement_boost) +
        (this.coefficients.β * growthRate) +
        (this.coefficients.γ * sentimentMomentum * platformFactor.sentiment_weight) +
        (this.coefficients.δ * audienceDiversity * platformFactor.diversity_factor)
      );
      
      // Apply viral boost if above threshold
      const viralBoost = this.calculateViralBoost(dataPoint, platformFactor);
      
      // Final WaveScore with viral adjustment
      const waveScore = Math.min(100, Math.max(0, baseScore + viralBoost));
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(dataPoint, contextData);
      
      return {
        waveScore: Math.round(waveScore * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        components: {
          normalizedEngagement: Math.round(normEngagement * 100) / 100,
          growthRate: Math.round(growthRate * 100) / 100,
          sentimentMomentum: Math.round(sentimentMomentum * 100) / 100,
          audienceDiversity: Math.round(audienceDiversity * 100) / 100
        },
        metadata: {
          platform: dataPoint.platform_source,
          viralBoost: Math.round(viralBoost * 100) / 100,
          platformFactor: platformFactor,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ WaveScore calculation failed:', error);
      
      // Return fallback score
      return {
        waveScore: 50,
        confidence: 0.3,
        components: {
          normalizedEngagement: 25,
          growthRate: 25,
          sentimentMomentum: 25,
          audienceDiversity: 25
        },
        metadata: {
          platform: dataPoint.platform_source,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Calculate normalized engagement component
   */
  async calculateNormalizedEngagement(dataPoint, contextData) {
    const rawMetrics = dataPoint.raw_metrics || {};
    const platform = dataPoint.platform_source;
    
    let engagementScore = 0;
    
    switch (platform) {
      case 'youtube':
        const views = rawMetrics.view_count || 0;
        const likes = rawMetrics.like_count || 0;
        const comments = rawMetrics.comment_count || 0;
        
        // YouTube engagement formula
        if (views > 0) {
          const likeRate = likes / views;
          const commentRate = comments / views;
          engagementScore = (likeRate * 100 + commentRate * 500) * 100;
        }
        break;
        
      case 'reddit':
        const score = rawMetrics.score || 0;
        const commentsCount = rawMetrics.comments || 0;
        const upvoteRatio = rawMetrics.upvote_ratio || 0.5;
        
        // Reddit engagement formula
        engagementScore = (score + commentsCount * 2) * upvoteRatio * 0.1;
        break;
        
      case 'tiktok':
        const tikTokViews = rawMetrics.view_count || 0;
        const tikTokLikes = rawMetrics.like_count || 0;
        const shares = rawMetrics.share_count || 0;
        
        // TikTok engagement formula
        if (tikTokViews > 0) {
          const likeRate = tikTokLikes / tikTokViews;
          const shareRate = shares / tikTokViews;
          engagementScore = (likeRate * 80 + shareRate * 200) * 100;
        }
        break;
    }
    
    // Normalize to 0-100 scale using contextual data
    if (contextData && contextData.engagement) {
      const stats = contextData.engagement;
      const zScore = (engagementScore - stats.mean) / (stats.stdDev || 1);
      return this.sigmoidNormalization(zScore);
    }
    
    // Fallback normalization
    return Math.min(100, engagementScore);
  }

  /**
   * Calculate growth rate component
   */
  async calculateGrowthRate(dataPoint, contextData) {
    const publishedDate = new Date(dataPoint.published_at);
    const now = new Date();
    const hoursOld = (now - publishedDate) / (1000 * 60 * 60);
    
    if (hoursOld <= 0) return 50; // Default for brand new content
    
    const rawMetrics = dataPoint.raw_metrics || {};
    const reach = rawMetrics.view_count || rawMetrics.score || 0;
    
    // Calculate views/engagement per hour
    const growthRate = reach / hoursOld;
    
    // Apply logarithmic scaling for viral growth detection
    const logGrowth = Math.log10(growthRate + 1);
    
    // Normalize based on platform expectations
    const platform = dataPoint.platform_source;
    const platformFactor = this.platformAdjustments[platform] || this.platformAdjustments.youtube;
    
    let normalizedGrowth = (logGrowth / 6) * 100; // Scale to 0-100
    
    // Boost for content that's growing faster than viral threshold rate
    const viralRate = platformFactor.viral_threshold / 24; // Expected viral views per hour
    if (growthRate > viralRate) {
      normalizedGrowth *= 1.5;
    }
    
    return Math.min(100, normalizedGrowth);
  }

  /**
   * Calculate sentiment momentum component
   */
  async calculateSentimentMomentum(dataPoint) {
    try {
      const contentText = `${dataPoint.title || ''} ${dataPoint.metadata?.description || ''}`;
      
      // Check cache first
      const cacheKey = this.generateSentimentCacheKey(contentText);
      if (this.sentimentCache.has(cacheKey)) {
        return this.sentimentCache.get(cacheKey);
      }
      
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(contentText);
      
      // Calculate momentum based on sentiment trend
      const momentum = this.calculateSentimentMomentumFromAnalysis(sentiment, dataPoint);
      
      // Cache result
      this.sentimentCache.set(cacheKey, momentum);
      
      return momentum;
      
    } catch (error) {
      console.error('❌ Sentiment analysis failed:', error);
      return 50; // Neutral fallback
    }
  }

  /**
   * Analyze sentiment using VADER or external API
   */
  async analyzeSentiment(text) {
    // Try to use local sentiment analysis first
    try {
      const response = await fetch(`${window.location.origin}/api/sentiment/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 500) }) // Limit text length
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          compound: result.compound || 0,
          positive: result.positive || 0,
          negative: result.negative || 0,
          neutral: result.neutral || 0
        };
      }
    } catch (error) {
      console.warn('⚠️ Local sentiment analysis unavailable');
    }
    
    // Fallback: Simple keyword-based sentiment
    return this.simpleKeywordSentiment(text);
  }

  /**
   * Simple keyword-based sentiment analysis fallback
   */
  simpleKeywordSentiment(text) {
    const lowerText = text.toLowerCase();
    
    const positiveWords = [
      'amazing', 'awesome', 'incredible', 'fantastic', 'great', 'excellent',
      'love', 'perfect', 'brilliant', 'outstanding', 'wonderful', 'best'
    ];
    
    const negativeWords = [
      'terrible', 'awful', 'horrible', 'worst', 'hate', 'bad',
      'disappointing', 'failed', 'broken', 'useless', 'garbage'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeScore++;
    });
    
    const total = positiveScore + negativeScore;
    if (total === 0) {
      return { compound: 0, positive: 0.33, negative: 0.33, neutral: 0.34 };
    }
    
    const compound = (positiveScore - negativeScore) / total;
    
    return {
      compound: compound,
      positive: positiveScore / total,
      negative: negativeScore / total,
      neutral: Math.max(0, 1 - (positiveScore + negativeScore) / total)
    };
  }

  /**
   * Calculate sentiment momentum from analysis
   */
  calculateSentimentMomentumFromAnalysis(sentiment, dataPoint) {
    const compound = sentiment.compound;
    
    // Base sentiment score (0-100)
    const baseSentimentScore = ((compound + 1) / 2) * 100;
    
    // Apply engagement multiplier for sentiment momentum
    const rawMetrics = dataPoint.raw_metrics || {};
    const engagement = rawMetrics.engagement_score || 0;
    
    // Higher engagement amplifies sentiment impact
    const engagementMultiplier = Math.min(2.0, 1 + (engagement / 100));
    
    // Positive sentiment gets boost, negative sentiment gets penalty
    let momentumScore = baseSentimentScore;
    
    if (compound > 0.1) {
      // Positive sentiment momentum
      momentumScore *= engagementMultiplier;
    } else if (compound < -0.1) {
      // Negative sentiment reduces momentum
      momentumScore *= 0.7;
    }
    
    return Math.min(100, Math.max(0, momentumScore));
  }

  /**
   * Calculate audience diversity component
   */
  async calculateAudienceDiversity(dataPoint) {
    // For now, use heuristics based on content metadata
    // In a full implementation, this would analyze actual audience data
    
    const metadata = dataPoint.metadata || {};
    const category = dataPoint.category || 'General';
    const platform = dataPoint.platform_source;
    
    let diversityScore = 50; // Base diversity score
    
    // Category diversity factors
    const categoryDiversityFactors = {
      'AI Tools': 0.7,           // Niche audience
      'Technology': 0.8,         // Tech-focused audience
      'Gaming': 0.9,             // Broad but specific audience
      'Entertainment': 1.2,      // Very diverse audience
      'Music': 1.1,              // Diverse but taste-dependent
      'News & Politics': 0.8,    // Often polarized audience
      'Education': 0.9,          // Learning-focused audience
      'Sports': 1.0,             // Moderately diverse
      'Science & Technology': 0.7,
      'Crypto': 0.6              // Very niche audience
    };
    
    const categoryFactor = categoryDiversityFactors[category] || 1.0;
    diversityScore *= categoryFactor;
    
    // Platform diversity adjustments
    switch (platform) {
      case 'youtube':
        // YouTube generally has good diversity
        diversityScore *= 1.1;
        break;
      case 'reddit':
        // Reddit can be echo chambers but also very diverse
        diversityScore *= 0.9;
        break;
      case 'tiktok':
        // TikTok algorithm creates diverse reach
        diversityScore *= 1.2;
        break;
    }
    
    // Content length/complexity factor (YouTube specific)
    if (platform === 'youtube' && metadata.duration) {
      const durationMatch = metadata.duration.match(/PT(\d+)M?(\d+)?S/);
      if (durationMatch) {
        const minutes = parseInt(durationMatch[1]) || 0;
        const seconds = parseInt(durationMatch[2]) || 0;
        const totalMinutes = minutes + seconds / 60;
        
        // Optimal diversity around 3-10 minutes
        if (totalMinutes >= 3 && totalMinutes <= 10) {
          diversityScore *= 1.1;
        } else if (totalMinutes > 20) {
          diversityScore *= 0.9; // Longer content = more niche audience
        }
      }
    }
    
    // Cross-platform content gets diversity boost
    if (metadata.cross_platform_presence) {
      diversityScore *= 1.15;
    }
    
    return Math.min(100, Math.max(20, diversityScore));
  }

  /**
   * Calculate viral boost factor
   */
  calculateViralBoost(dataPoint, platformFactor) {
    const rawMetrics = dataPoint.raw_metrics || {};
    const reach = rawMetrics.view_count || rawMetrics.score || 0;
    const viralThreshold = platformFactor.viral_threshold;
    
    if (reach < viralThreshold) return 0;
    
    // Logarithmic boost for viral content
    const viralRatio = reach / viralThreshold;
    const boost = Math.log10(viralRatio) * 10;
    
    return Math.min(20, boost); // Max 20 point viral boost
  }

  /**
   * Calculate confidence score for the WaveScore
   */
  calculateConfidenceScore(dataPoint, contextData) {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for sparse data
    const rawMetrics = dataPoint.raw_metrics || {};
    const hasEngagement = (rawMetrics.like_count || 0) > 0 || (rawMetrics.comments || 0) > 0;
    if (!hasEngagement) confidence *= 0.7;
    
    // Reduce confidence for very new content
    const publishedDate = new Date(dataPoint.published_at);
    const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) confidence *= 0.6;
    
    // Increase confidence with more context data
    if (contextData) confidence *= 1.1;
    
    // Platform-specific confidence adjustments
    const platform = dataPoint.platform_source;
    switch (platform) {
      case 'youtube':
        confidence *= 1.0; // Good data quality
        break;
      case 'reddit':
        confidence *= 0.9; // Some data limitations
        break;
      case 'tiktok':
        confidence *= 0.8; // Limited API data
        break;
    }
    
    return Math.min(1.0, Math.max(0.3, confidence));
  }

  /**
   * Sigmoid normalization function
   */
  sigmoidNormalization(zScore) {
    const sigmoid = 1 / (1 + Math.exp(-zScore));
    return sigmoid * 100;
  }

  /**
   * Generate cache key for sentiment analysis
   */
  generateSentimentCacheKey(text) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Batch calculate WaveScores for multiple data points
   */
  async batchCalculateWaveScores(dataPoints, contextData = null) {
    console.log(`🌊 Calculating WaveScores for ${dataPoints.length} data points...`);
    
    const results = [];
    const batchSize = 10;
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (dataPoint) => {
        const waveScoreResult = await this.calculateWaveScore(dataPoint, contextData);
        
        return {
          content_id: dataPoint.content_id,
          trend_id: `${dataPoint.platform_source}_${dataPoint.content_id}`,
          ...waveScoreResult,
          calculated_at: new Date().toISOString()
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < dataPoints.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Calculated ${results.length} WaveScores`);
    return results;
  }

  /**
   * Store WaveScore results in database
   */
  async storeWaveScores(waveScoreResults) {
    console.log('💾 Storing WaveScore results...');
    
    try {
      const { error } = await this.supabase
        .from('wavescores')
        .upsert(waveScoreResults, { 
          onConflict: 'trend_id,calculated_at' 
        });
      
      if (error) {
        throw new Error(`Failed to store WaveScores: ${error.message}`);
      }
      
      console.log(`✅ Stored ${waveScoreResults.length} WaveScore results`);
      
    } catch (error) {
      console.error('❌ Failed to store WaveScores:', error);
      throw error;
    }
  }

  /**
   * Get latest WaveScores for trends
   */
  async getLatestWaveScores(limit = 100, category = null, minScore = null) {
    let query = this.supabase
      .from('wavescores')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(limit);
    
    if (category) {
      // Join with original data to filter by category
      query = this.supabase
        .from('wavescores')
        .select(`
          *,
          raw_ingestion_data!inner(category)
        `)
        .eq('raw_ingestion_data.category', category);
    }
    
    if (minScore) {
      query = query.gte('waveScore', minScore);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch WaveScores: ${error.message}`);
    }
    
    return data;
  }
}

export default WaveScoreGenerator;

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new WaveScoreGenerator();
  
  console.log('🌊 WaveScore Generator initialized');
  console.log('Formula: WaveScore = α·NormEngagement + β·GrowthRate + γ·SentimentMomentum + δ·AudienceDiversity');
  console.log('Coefficients:', generator.coefficients);
}