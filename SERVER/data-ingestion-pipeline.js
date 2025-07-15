/**
 * WaveScope Data Ingestion Pipeline
 * Handles multi-source data collection with scheduling and normalization
 */

import cron from 'node-cron';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class DataIngestionPipeline {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.sources = {
      youtube: {
        apiKey: process.env.YOUTUBE_API_KEY,
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        quotaUsed: 0,
        quotaLimit: 10000
      },
      reddit: {
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        userAgent: 'WaveSight:1.0.0 (by /u/wavesight)'
      }
    };
    
    this.ingestionQueue = [];
    this.processingStats = {
      totalProcessed: 0,
      errors: 0,
      lastRun: null
    };
  }

  /**
   * Initialize scheduled data ingestion
   */
  initializeScheduler() {
    console.log('🕒 Initializing WaveScope Data Ingestion Scheduler...');
    
    // YouTube trending data - every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.ingestYouTubeData();
    });
    
    // Reddit hot topics - every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await this.ingestRedditData();
    });
    
    // Process ingestion queue - every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.processIngestionQueue();
    });
    
    console.log('✅ Data ingestion scheduler started');
  }

  /**
   * YouTube API Data Ingestion
   */
  async ingestYouTubeData() {
    console.log('📺 Ingesting YouTube trending data...');
    
    try {
      if (this.sources.youtube.quotaUsed >= this.sources.youtube.quotaLimit * 0.8) {
        console.warn('⚠️ YouTube API quota nearly exhausted, skipping...');
        return;
      }

      const categories = [
        { id: 28, name: 'Science & Technology' },
        { id: 20, name: 'Gaming' },
        { id: 24, name: 'Entertainment' },
        { id: 10, name: 'Music' },
        { id: 25, name: 'News & Politics' }
      ];

      for (const category of categories) {
        const trendingData = await this.fetchYouTubeTrending(category.id);
        
        if (trendingData && trendingData.length > 0) {
          const processedData = this.processYouTubeData(trendingData, category.name);
          this.ingestionQueue.push(...processedData);
          
          console.log(`✅ Queued ${processedData.length} ${category.name} trends`);
        }
        
        // Rate limiting
        await this.delay(1000);
      }
      
    } catch (error) {
      console.error('❌ YouTube ingestion failed:', error);
      this.processingStats.errors++;
    }
  }

  /**
   * Fetch YouTube trending videos by category
   */
  async fetchYouTubeTrending(categoryId) {
    const url = new URL(`${this.sources.youtube.baseUrl}/videos`);
    url.searchParams.append('part', 'snippet,statistics,contentDetails');
    url.searchParams.append('chart', 'mostPopular');
    url.searchParams.append('regionCode', 'US');
    url.searchParams.append('videoCategoryId', categoryId);
    url.searchParams.append('maxResults', '50');
    url.searchParams.append('key', this.sources.youtube.apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    this.sources.youtube.quotaUsed += 100; // Videos list costs 100 units
    
    return data.items || [];
  }

  /**
   * Process raw YouTube data into normalized format
   */
  processYouTubeData(rawData, category) {
    const timestamp = new Date().toISOString();
    
    return rawData.map(item => {
      const stats = item.statistics;
      const snippet = item.snippet;
      
      // Calculate engagement metrics
      const viewCount = parseInt(stats.viewCount) || 0;
      const likeCount = parseInt(stats.likeCount) || 0;
      const commentCount = parseInt(stats.commentCount) || 0;
      
      const engagementRate = viewCount > 0 
        ? ((likeCount + commentCount) / viewCount) * 100 
        : 0;
      
      // Calculate time-based growth (mock for now - would need historical data)
      const publishedDate = new Date(snippet.publishedAt);
      const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
      const growthRate = hoursOld > 0 ? viewCount / hoursOld : 0;
      
      return {
        source: 'youtube',
        platform_source: 'youtube',
        content_id: item.id,
        title: snippet.title,
        category: category,
        timestamp: timestamp,
        published_at: snippet.publishedAt,
        raw_metrics: {
          view_count: viewCount,
          like_count: likeCount,
          comment_count: commentCount,
          engagement_rate: engagementRate
        },
        normalized_metrics: {
          reach_estimate: viewCount,
          engagement_score: engagementRate,
          growth_rate: growthRate,
          viral_velocity: this.calculateViralVelocity(viewCount, hoursOld)
        },
        metadata: {
          channel_id: snippet.channelId,
          channel_title: snippet.channelTitle,
          duration: item.contentDetails?.duration,
          thumbnail_url: snippet.thumbnails?.high?.url
        }
      };
    });
  }

  /**
   * Calculate viral velocity score
   */
  calculateViralVelocity(views, hoursOld) {
    if (hoursOld <= 0) return 0;
    
    // Viral velocity = views per hour normalized to 0-100 scale
    const viewsPerHour = views / hoursOld;
    
    // Logarithmic scaling for viral velocity
    const velocity = Math.min(100, Math.log10(viewsPerHour + 1) * 20);
    
    return Math.round(velocity * 100) / 100;
  }

  /**
   * Reddit Data Ingestion
   */
  async ingestRedditData() {
    console.log('🔴 Ingesting Reddit trending data...');
    
    try {
      const subreddits = [
        'technology', 'gaming', 'worldnews', 'entertainment', 
        'Music', 'science', 'artificial', 'cryptocurrency'
      ];

      for (const subreddit of subreddits) {
        const hotPosts = await this.fetchRedditHot(subreddit);
        
        if (hotPosts && hotPosts.length > 0) {
          const processedData = this.processRedditData(hotPosts, subreddit);
          this.ingestionQueue.push(...processedData);
          
          console.log(`✅ Queued ${processedData.length} Reddit trends from r/${subreddit}`);
        }
        
        // Rate limiting
        await this.delay(2000);
      }
      
    } catch (error) {
      console.error('❌ Reddit ingestion failed:', error);
      this.processingStats.errors++;
    }
  }

  /**
   * Fetch Reddit hot posts
   */
  async fetchRedditHot(subreddit) {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.sources.reddit.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.children?.map(child => child.data) || [];
  }

  /**
   * Process Reddit data into normalized format
   */
  processRedditData(rawData, subreddit) {
    const timestamp = new Date().toISOString();
    
    return rawData.map(post => {
      const score = post.score || 0;
      const comments = post.num_comments || 0;
      const upvoteRatio = post.upvote_ratio || 0.5;
      
      // Calculate Reddit-specific engagement
      const engagementScore = (score + comments) / Math.max(1, score) * 100;
      
      // Time-based metrics
      const createdTime = new Date(post.created_utc * 1000);
      const hoursOld = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
      const growthRate = hoursOld > 0 ? score / hoursOld : 0;
      
      return {
        source: 'reddit',
        platform_source: 'reddit',
        content_id: post.id,
        title: post.title,
        category: this.mapSubredditToCategory(subreddit),
        timestamp: timestamp,
        published_at: createdTime.toISOString(),
        raw_metrics: {
          score: score,
          comments: comments,
          upvote_ratio: upvoteRatio,
          engagement_score: engagementScore
        },
        normalized_metrics: {
          reach_estimate: score * 10, // Estimate reach based on score
          engagement_score: engagementScore,
          growth_rate: growthRate,
          viral_velocity: this.calculateViralVelocity(score * 10, hoursOld)
        },
        metadata: {
          subreddit: subreddit,
          author: post.author,
          url: post.url,
          post_type: post.is_video ? 'video' : post.is_self ? 'text' : 'link'
        }
      };
    });
  }

  /**
   * Map subreddit to WaveScope category
   */
  mapSubredditToCategory(subreddit) {
    const mapping = {
      'technology': 'Technology',
      'gaming': 'Gaming',
      'worldnews': 'News & Politics',
      'entertainment': 'Entertainment',
      'Music': 'Music',
      'science': 'Science & Technology',
      'artificial': 'AI Tools',
      'cryptocurrency': 'Crypto'
    };
    
    return mapping[subreddit] || 'General';
  }

  /**
   * Process the ingestion queue
   */
  async processIngestionQueue() {
    if (this.ingestionQueue.length === 0) {
      console.log('📭 Ingestion queue is empty');
      return;
    }

    console.log(`🔄 Processing ${this.ingestionQueue.length} items from ingestion queue...`);
    
    try {
      // Process in batches of 100
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < this.ingestionQueue.length; i += batchSize) {
        batches.push(this.ingestionQueue.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await this.storeBatch(batch);
        this.processingStats.totalProcessed += batch.length;
        
        // Small delay between batches
        await this.delay(500);
      }

      // Clear the queue
      this.ingestionQueue = [];
      this.processingStats.lastRun = new Date().toISOString();
      
      console.log(`✅ Processed ${batches.length} batches successfully`);
      
    } catch (error) {
      console.error('❌ Queue processing failed:', error);
      this.processingStats.errors++;
    }
  }

  /**
   * Store batch of data in Supabase
   */
  async storeBatch(batch) {
    // Store raw ingested data
    const { error: rawError } = await this.supabase
      .from('raw_ingestion_data')
      .upsert(batch, { onConflict: 'content_id,source,timestamp' });

    if (rawError) {
      throw new Error(`Failed to store raw data: ${rawError.message}`);
    }

    // Transform for trend_scores table
    const trendScores = batch.map(item => ({
      trend_id: `${item.source}_${item.content_id}`,
      timestamp: item.timestamp,
      platform_source: item.platform_source,
      normalized_trend_score: item.normalized_metrics.engagement_score,
      delta: item.normalized_metrics.growth_rate,
      reach_estimate: item.normalized_metrics.reach_estimate,
      viral_velocity: item.normalized_metrics.viral_velocity,
      metadata: JSON.stringify(item.metadata)
    }));

    const { error: scoresError } = await this.supabase
      .from('trend_scores')
      .upsert(trendScores, { onConflict: 'trend_id,timestamp' });

    if (scoresError) {
      throw new Error(`Failed to store trend scores: ${scoresError.message}`);
    }
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      ...this.processingStats,
      queueSize: this.ingestionQueue.length,
      youtubeQuotaUsed: this.sources.youtube.quotaUsed,
      youtubeQuotaRemaining: this.sources.youtube.quotaLimit - this.sources.youtube.quotaUsed
    };
  }

  /**
   * Utility: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start the pipeline
   */
  start() {
    console.log('🚀 Starting WaveScope Data Ingestion Pipeline...');
    
    this.initializeScheduler();
    
    // Run initial ingestion
    setTimeout(async () => {
      await this.ingestYouTubeData();
      await this.ingestRedditData();
    }, 5000);
    
    console.log('✅ Data Ingestion Pipeline started successfully');
  }

  /**
   * Stop the pipeline
   */
  stop() {
    console.log('🛑 Stopping Data Ingestion Pipeline...');
    // Cron jobs will be stopped when process exits
    console.log('✅ Pipeline stopped');
  }
}

export default DataIngestionPipeline;

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const pipeline = new DataIngestionPipeline();
  pipeline.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    pipeline.stop();
    process.exit(0);
  });
}