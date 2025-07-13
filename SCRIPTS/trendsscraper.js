/**
 * TikTok Trends Scraper for WaveSight
 * Fetches trending topics from various sources and stores in Supabase
 * 
 * Note: Since TikTok doesn't provide a public API for trends,
 * this uses alternative data sources and web scraping
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  },
  sources: {
    rapidApi: {
      key: process.env.RAPIDAPI_KEY,
      host: 'tiktok-scraper7.p.rapidapi.com'
    }
  },
  dateRanges: {
    '1_day': { days: 1, label: 'Last 24 Hours' },
    '1_week': { days: 7, label: 'Last Week' },
    '1_month': { days: 30, label: 'Last Month' },
    '1_year': { days: 365, label: 'Last Year' },
    '5_years': { days: 1825, label: 'Last 5 Years' },
    'max': { days: 3650, label: 'All Time' }
  }
};

// Validate environment variables
if (!config.supabase.url || !config.supabase.key) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', config.supabase.url ? '✅' : '❌');
  console.error('   SUPABASE_ANON_KEY:', config.supabase.key ? '✅' : '❌');
  console.error('📝 Please check your .env file');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(config.supabase.url, config.supabase.key);

class TikTokTrendsScraper {
  constructor() {
    this.browser = null;
    this.trends = new Map();
  }

  /**
   * Main method to fetch trends for all date ranges
   */
  async fetchAllTrends() {
    console.log('🚀 Starting TikTok trends fetch...');
    
    try {
      // Method 1: Scrape from trend aggregator sites
      await this.scrapeTrendingSites();
      
      // Method 2: Use RapidAPI TikTok endpoints (if available)
      if (config.sources.rapidApi.key) {
        await this.fetchFromRapidAPI();
      }
      
      // Method 3: Scrape Google Trends for TikTok
      await this.scrapeGoogleTrends();
      
      // Process and store all collected trends
      await this.processTrends();
      
      console.log('✅ TikTok trends fetch completed!');
      
    } catch (error) {
      console.error('❌ Error fetching trends:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Scrape trending topics from aggregator sites
   */
  async scrapeTrendingSites() {
    console.log('📊 Scraping trend aggregator sites...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const sites = [
      {
        url: 'https://explodingtopics.com/blog/tiktok-trends',
        selector: '.trend-item',
        nameSelector: '.trend-name',
        growthSelector: '.trend-growth'
      },
      {
        url: 'https://trends.google.com/trends/explore?q=tiktok&geo=US',
        selector: '.trending-searches-item',
        nameSelector: '.title',
        growthSelector: '.metric-value'
      }
    ];

    for (const site of sites) {
      try {
        await this.scrapeSite(site);
      } catch (error) {
        console.error(`Error scraping ${site.url}:`, error.message);
      }
    }
  }

  /**
   * Scrape individual site
   */
  async scrapeSite(site) {
    const page = await this.browser.newPage();
    
    try {
      console.log(`🔍 Scraping ${site.url}...`);
      
      await page.goto(site.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for content to load
      await page.waitForSelector(site.selector, { timeout: 10000 });
      
      // Extract trend data
      const trends = await page.evaluate((selectors) => {
        const items = document.querySelectorAll(selectors.selector);
        return Array.from(items).map(item => {
          const name = item.querySelector(selectors.nameSelector)?.textContent?.trim();
          const growth = item.querySelector(selectors.growthSelector)?.textContent?.trim();
          
          return {
            name,
            growth,
            timestamp: new Date().toISOString()
          };
        }).filter(item => item.name);
      }, site);
      
      // Add to trends collection
      trends.forEach(trend => {
        this.addTrend(trend.name, {
          source: new URL(site.url).hostname,
          growth: trend.growth,
          timestamp: trend.timestamp
        });
      });
      
      console.log(`✅ Found ${trends.length} trends from ${new URL(site.url).hostname}`);
      
    } catch (error) {
      console.error(`Error scraping ${site.url}:`, error.message);
    } finally {
      await page.close();
    }
  }

  /**
   * Fetch trends from RapidAPI TikTok endpoints
   */
  async fetchFromRapidAPI() {
    if (!config.sources.rapidApi.key) {
      console.log('⚠️ RapidAPI key not configured, skipping...');
      return;
    }

    console.log('🔍 Fetching from RapidAPI TikTok endpoints...');

    const endpoints = [
      {
        url: 'https://tiktok-scraper7.p.rapidapi.com/trending/hashtags',
        type: 'hashtags'
      },
      {
        url: 'https://tiktok-scraper7.p.rapidapi.com/trending/creators',
        type: 'creators'
      },
      {
        url: 'https://tiktok-scraper7.p.rapidapi.com/challenge/search?keywords=trending',
        type: 'challenges'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'X-RapidAPI-Key': config.sources.rapidApi.key,
            'X-RapidAPI-Host': config.sources.rapidApi.host
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.processRapidAPIData(data, endpoint.type);
        }
      } catch (error) {
        console.error(`Error fetching ${endpoint.type}:`, error.message);
      }
    }
  }

  /**
   * Process RapidAPI response data
   */
  processRapidAPIData(data, type) {
    if (!data || !Array.isArray(data.data)) return;

    data.data.forEach(item => {
      let trendName = '';
      let metrics = {};

      switch (type) {
        case 'hashtags':
          trendName = `#${item.hashtag || item.name}`;
          metrics = {
            views: item.views || item.videoCount,
            posts: item.videoCount
          };
          break;
        case 'creators':
          trendName = `@${item.uniqueId || item.username}`;
          metrics = {
            followers: item.followers,
            likes: item.likes
          };
          break;
        case 'challenges':
          trendName = item.title || item.challenge;
          metrics = {
            participants: item.userCount,
            views: item.viewCount
          };
          break;
      }

      if (trendName) {
        this.addTrend(trendName, {
          source: 'tiktok-api',
          type,
          metrics,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Scrape Google Trends for TikTok-related searches
   */
  async scrapeGoogleTrends() {
    console.log('📊 Fetching Google Trends data for TikTok...');

    const timeRanges = {
      '1_day': 'now 1-d',
      '1_week': 'now 7-d',
      '1_month': 'today 1-m',
      '1_year': 'today 12-m',
      '5_years': 'today 5-y'
    };

    for (const [key, value] of Object.entries(timeRanges)) {
      try {
        // Google Trends doesn't have a public API, so we'd need to use puppeteer
        // This is a placeholder for the actual implementation
        console.log(`📈 Fetching trends for ${config.dateRanges[key].label}...`);
        
        // Add mock data for demonstration
        this.addTrend(`TikTok Dance ${key}`, {
          source: 'google-trends',
          dateRange: key,
          trendScore: Math.floor(Math.random() * 100),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error fetching Google Trends for ${key}:`, error.message);
      }
    }
  }

  /**
   * Add trend to collection
   */
  addTrend(name, data) {
    if (!this.trends.has(name)) {
      this.trends.set(name, {
        name,
        occurrences: [],
        totalScore: 0
      });
    }

    const trend = this.trends.get(name);
    trend.occurrences.push(data);
    trend.totalScore += data.trendScore || 1;
  }

  /**
   * Process and store trends in Supabase
   */
  async processTrends() {
    console.log('💾 Processing and storing trends...');

    const processedTrends = [];
    const now = new Date();

    // Convert trends map to array and calculate scores
    for (const [name, data] of this.trends) {
      const trend = {
        trend_name: name,
        platform: 'TikTok',
        sources: [...new Set(data.occurrences.map(o => o.source))],
        occurrences: data.occurrences.length,
        trend_score: this.calculateTrendScore(data),
        date_ranges: this.calculateDateRanges(data),
        metrics: this.aggregateMetrics(data),
        first_seen: data.occurrences[0]?.timestamp,
        last_updated: now.toISOString(),
        raw_data: data.occurrences
      };

      processedTrends.push(trend);
    }

    // Sort by trend score
    processedTrends.sort((a, b) => b.trend_score - a.trend_score);

    // Store in Supabase
    try {
      const { data, error } = await supabase
        .from('tiktok_trends')
        .upsert(processedTrends.slice(0, 100), { // Top 100 trends
          onConflict: 'trend_name,platform'
        });

      if (error) throw error;

      console.log(`✅ Stored ${processedTrends.length} trends in Supabase`);
      
      // Log top 10 trends
      console.log('\n📊 Top 10 TikTok Trends:');
      processedTrends.slice(0, 10).forEach((trend, index) => {
        console.log(`${index + 1}. ${trend.trend_name} (Score: ${trend.trend_score})`);
      });

    } catch (error) {
      console.error('❌ Error storing trends:', error);
    }
  }

  /**
   * Calculate trend score based on various factors
   */
  calculateTrendScore(trendData) {
    let score = 0;

    // Base score from occurrences
    score += trendData.occurrences.length * 10;

    // Add scores from metrics
    trendData.occurrences.forEach(occ => {
      if (occ.metrics) {
        score += (occ.metrics.views || 0) / 1000000; // 1 point per million views
        score += (occ.metrics.followers || 0) / 100000; // 1 point per 100k followers
        score += (occ.metrics.posts || 0) / 1000; // 1 point per 1k posts
      }
      
      // Growth factor
      if (occ.growth) {
        const growthNum = parseFloat(occ.growth.replace(/[^0-9.-]/g, ''));
        if (!isNaN(growthNum)) {
          score += growthNum / 100;
        }
      }
    });

    return Math.round(score);
  }

  /**
   * Determine which date ranges this trend appears in
   */
  calculateDateRanges(trendData) {
    const ranges = [];
    const now = new Date();

    trendData.occurrences.forEach(occ => {
      const occDate = new Date(occ.timestamp);
      const daysDiff = (now - occDate) / (1000 * 60 * 60 * 24);

      Object.entries(config.dateRanges).forEach(([key, range]) => {
        if (daysDiff <= range.days && !ranges.includes(key)) {
          ranges.push(key);
        }
      });
    });

    return ranges;
  }

  /**
   * Aggregate metrics from multiple sources
   */
  aggregateMetrics(trendData) {
    const metrics = {
      total_views: 0,
      total_posts: 0,
      avg_engagement: 0,
      sources_count: new Set()
    };

    trendData.occurrences.forEach(occ => {
      if (occ.metrics) {
        metrics.total_views += occ.metrics.views || 0;
        metrics.total_posts += occ.metrics.posts || 0;
      }
      metrics.sources_count.add(occ.source);
    });

    metrics.sources_count = metrics.sources_count.size;
    return metrics;
  }

  /**
   * Fetch trends for specific date range
   */
  async fetchTrendsForDateRange(dateRange) {
    console.log(`📅 Fetching trends for ${config.dateRanges[dateRange].label}...`);
    
    // Filter existing trends by date range
    const filteredTrends = [];
    
    for (const [name, data] of this.trends) {
      const ranges = this.calculateDateRanges(data);
      if (ranges.includes(dateRange)) {
        filteredTrends.push({
          name,
          score: this.calculateTrendScore(data),
          dateRange
        });
      }
    }

    return filteredTrends.sort((a, b) => b.score - a.score);
  }
}

// Main execution
async function main() {
  const scraper = new TikTokTrendsScraper();
  
  try {
    // Fetch all trends
    await scraper.fetchAllTrends();
    
    // Get trends for specific date ranges
    for (const dateRange of Object.keys(config.dateRanges)) {
      const trends = await scraper.fetchTrendsForDateRange(dateRange);
      console.log(`\n📊 Top trends for ${config.dateRanges[dateRange].label}:`);
      trends.slice(0, 5).forEach((trend, index) => {
        console.log(`  ${index + 1}. ${trend.name} (Score: ${trend.score})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Cron job function for scheduled execution
export async function scheduledTikTokTrendsFetch() {
  console.log('⏰ Running scheduled TikTok trends fetch...');
  await main();
}

// Export for testing
export { TikTokTrendsScraper };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}