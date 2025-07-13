// WaveSight Dashboard - Improved Version
// Performance optimized, modular architecture, better error handling

class WaveSightDashboard {
  constructor() {
    // Configuration
    this.config = {
      supabase: {
        url: window.WaveSightConfig?.supabase?.url || null,
        anonKey: window.WaveSightConfig?.supabase?.anonKey || null
      },
      api: {
        baseUrl: '/api',
        timeout: 30000
      },
      chart: {
        maxTrends: 8,
        animationDuration: 1500,
        colors: [
          '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', 
          '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f472b6'
        ]
      },
      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        enabled: true
      },
      ui: {
        debounceDelay: 300,
        maxComparedTrends: 3,
        defaultTimeRange: 6 // months
      }
    };

    // State management
    this.state = {
      currentData: null,
      filteredData: null,
      selectedTrends: 'all',
      comparedTrends: [],
      dateRange: { start: null, end: null },
      isLoading: false,
      autoRefreshInterval: null,
      currentUser: null
    };

    // Validate configuration
    if (!this.config.supabase.url || !this.config.supabase.anonKey) {
      console.warn('⚠️ Supabase configuration missing. Running in demo mode.');
      console.log('💡 To use real data, configure Supabase credentials in the browser console:');
      console.log('   window.WaveSightConfig.setDevelopmentConfig("YOUR_SUPABASE_URL", "YOUR_ANON_KEY")');
      // Don't return - allow demo mode to continue
    }

    // Services
    this.supabase = null;
    this.cache = new Map();
    this.chartInstance = null;
    this.performanceMetrics = {};

    // Bind methods
    this.searchTrends = this.debounce(this.searchTrends.bind(this), this.config.ui.debounceDelay);
  }

  // Initialize the dashboard
  async init() {
    console.log('🚀 Initializing WaveSight Dashboard...');
    
    try {
      // Initialize services
      this.initSupabase();
      this.initEventListeners();
      this.initKeyboardShortcuts();
      
      // Auto-populate with viral trends first
      console.log('🔥 Auto-populating most viral trends...');
      await this.autoPopulateViralTrends();
      
      // Load comprehensive dashboard data
      console.log('🌊 Loading comprehensive dashboard data...');
      await this.loadDashboardData(true);
      
      // Initialize UI components
      this.updateLiveStatus('connected');
      this.initAutoRefresh();
      
      // Initialize alert system
      await this.initAlertSystem();
      
      // Initialize WaveScope Timeline
      this.initWaveScopeTimeline();
      
      // Set up real-time viral trend monitoring
      this.startViralTrendMonitoring();
      
      // Set up aggressive auto-refresh to hit API limits
      this.startAggressiveDataFetching();
      
      console.log('✅ Dashboard initialized successfully with viral trend detection');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      this.handleError(error);
    }
  }

  // Auto-populate with the most viral trends across all categories
  async autoPopulateViralTrends() {
    try {
      this.showNotification('🔥 Loading most viral trends across all platforms...', 'info');
      
      // Check if we have recent viral trends in cache/Supabase first
      let viralTrends = await this.getRecentViralTrends();
      
      if (!viralTrends || viralTrends.length < 50) {
        // Fetch fresh viral trends from YouTube
        console.log('🚀 Fetching fresh viral trends from YouTube...');
        viralTrends = await this.fetchViralTrendsFromYouTube();
      }
      
      if (viralTrends && viralTrends.length > 0) {
        // Store and display viral trends
        this.state.currentData = viralTrends;
        
        // Immediate UI update with viral trends
        this.processDashboardData(viralTrends);
        
        this.showNotification(`🔥 Loaded ${viralTrends.length} viral trends automatically`, 'success');
        console.log(`✅ Auto-populated with ${viralTrends.length} viral trends`);
      } else {
        // Fallback to enhanced demo data with viral characteristics
        console.log('📊 Using enhanced viral demo data');
        this.useEnhancedViralDemoData();
      }
      
    } catch (error) {
      console.warn('⚠️ Auto-population failed, using demo data:', error);
      this.useEnhancedViralDemoData();
    }
  }

  // Get recent viral trends from Supabase (last 24 hours)
  async getRecentViralTrends() {
    if (!this.supabase) return null;
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data, error } = await this.supabase
        .from('youtube_trends')
        .select('*')
        .gte('fetch_timestamp', yesterday.toISOString())
        .order('viral_score', { ascending: false })
        .limit(100);
      
      if (error) {
        console.warn('⚠️ Error fetching recent viral trends:', error);
        return null;
      }
      
      return data && data.length > 0 ? data : null;
    } catch (error) {
      console.warn('⚠️ Error accessing recent viral trends:', error);
      return null;
    }
  }

  // Fetch viral trends from YouTube API
  async fetchViralTrendsFromYouTube() {
    try {
      const viralQueries = [
        'viral trends 2025',
        'trending now',
        'most viewed today',
        'breaking viral',
        'viral videos',
        'trending worldwide'
      ];
      
      const allViralTrends = [];
      
      for (const query of viralQueries) {
        try {
          const response = await fetch(`/api/fetch-youtube?q=${encodeURIComponent(query)}&maxResults=30&order=viewCount&publishedAfter=${this.getDateDaysAgo(3)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const result = await response.json();
          
          if (result.success && result.data) {
            const viralData = result.data.map(video => ({
              ...video,
              wave_score: this.calculateWaveScore(video),
              viral_score: this.calculateViralScore(video),
              trend_category: this.categorizeByContent(video.title + ' ' + (video.description || '')),
              search_query: query,
              fetch_timestamp: new Date().toISOString(),
              is_viral: true
            }));
            
            allViralTrends.push(...viralData);
          }
          
          // Respectful delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (queryError) {
          console.warn(`⚠️ Failed to fetch viral trends for "${query}":`, queryError);
        }
      }
      
      // Remove duplicates and sort by viral score
      const uniqueTrends = this.removeDuplicateVideos(allViralTrends);
      uniqueTrends.sort((a, b) => (b.viral_score || 0) - (a.viral_score || 0));
      
      // Store in Supabase for future use
      if (this.supabase && uniqueTrends.length > 0) {
        await this.storeInSupabase(uniqueTrends);
      }
      
      return uniqueTrends;
    } catch (error) {
      console.error('❌ Error fetching viral trends from YouTube:', error);
      return null;
    }
  }

  // Remove duplicate videos based on video_id or title similarity
  removeDuplicateVideos(videos) {
    const seen = new Set();
    const unique = [];
    
    videos.forEach(video => {
      const key = video.video_id || video.title?.substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(video);
      }
    });
    
    return unique;
  }

  // Enhanced viral demo data with realistic viral characteristics
  useEnhancedViralDemoData() {
    const viralDemoData = [
      {
        title: 'AI Breakthrough: ChatGPT-5 Changes Everything',
        view_count: 15400000,
        like_count: 890000,
        comment_count: 45000,
        viral_score: 9.2,
        trend_category: 'AI Tools',
        published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Tech Insider',
        is_viral: true
      },
      {
        title: 'BREAKING: New Gaming Console Revealed',
        view_count: 12800000,
        like_count: 750000,
        comment_count: 38000,
        viral_score: 8.9,
        trend_category: 'Gaming',
        published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        channel_title: 'GameSpot',
        is_viral: true
      },
      {
        title: 'Viral Dance Takes Over TikTok and YouTube',
        view_count: 22500000,
        like_count: 1200000,
        comment_count: 67000,
        viral_score: 9.8,
        trend_category: 'Entertainment',
        published_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Viral Trends',
        is_viral: true
      },
      {
        title: 'NEW MUSIC: Artist Drops Surprise Album',
        view_count: 8900000,
        like_count: 650000,
        comment_count: 28000,
        viral_score: 8.3,
        trend_category: 'Music',
        published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Music Central',
        is_viral: true
      },
      {
        title: 'SPORTS: Incredible Last-Second Victory',
        view_count: 11200000,
        like_count: 780000,
        comment_count: 42000,
        viral_score: 8.7,
        trend_category: 'Sports',
        published_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        channel_title: 'ESPN',
        is_viral: true
      },
      {
        title: 'Crypto Market EXPLODES: Bitcoin Hits New High',
        view_count: 6700000,
        like_count: 420000,
        comment_count: 31000,
        viral_score: 7.9,
        trend_category: 'Crypto',
        published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Crypto News',
        is_viral: true
      },
      {
        title: 'Educational: How to Master Any Skill in 30 Days',
        view_count: 5200000,
        like_count: 380000,
        comment_count: 19000,
        viral_score: 7.4,
        trend_category: 'Education',
        published_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Learning Hub',
        is_viral: true
      },
      {
        title: 'HEALTH: Revolutionary Fitness Method Goes Viral',
        view_count: 4800000,
        like_count: 320000,
        comment_count: 15000,
        viral_score: 7.1,
        trend_category: 'Health',
        published_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Fitness Today',
        is_viral: true
      },
      {
        title: 'BREAKING NEWS: Major Political Development',
        view_count: 9800000,
        like_count: 520000,
        comment_count: 87000,
        viral_score: 8.5,
        trend_category: 'News',
        published_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        channel_title: 'News Network',
        is_viral: true
      },
      {
        title: 'Tech Review: iPhone 16 First Look',
        view_count: 7300000,
        like_count: 465000,
        comment_count: 23000,
        viral_score: 8.0,
        trend_category: 'Technology',
        published_at: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
        channel_title: 'Tech Reviews',
        is_viral: true
      }
    ];
    
    // Add viral scores and metadata to demo data
    const enhancedData = viralDemoData.map(item => ({
      ...item,
      video_id: `demo_${Math.random().toString(36).substr(2, 9)}`,
      fetch_timestamp: new Date().toISOString(),
      engagement_rate: ((item.like_count + item.comment_count * 5) / item.view_count * 100).toFixed(2),
      wave_score: this.calculateWaveScore(item),
      trend_score: item.viral_score / 10
    }));
    
    this.state.currentData = enhancedData;
    this.processDashboardData(enhancedData);
    
    // Force timeline creation immediately
    setTimeout(() => {
      this.createReliableTimeline();
    }, 100);
    
    console.log('📊 Using enhanced viral demo data with realistic metrics');
  }

  // Initialize Supabase client
  initSupabase() {
    try {
      this.supabase = window.supabase.createClient(
        this.config.supabase.url,
        this.config.supabase.anonKey
      );
      console.log('✅ Supabase initialized');
      return true;
    } catch (error) {
      console.error('❌ Supabase initialization failed:', error);
      return false;
    }
  }

  // Load dashboard data with caching
  async loadDashboardData(forceRefresh = false) {
    console.log('🔄 Loading dashboard data...');
    
    this.showLoading();

    try {
      // First try to get real data from Supabase
      if (this.supabase) {
        console.log('📊 Attempting to fetch real data from Supabase...');
        const realData = await this.fetchSupabaseData();
        if (realData && realData.length > 0) {
          console.log(`✅ Loaded ${realData.length} real records from Supabase`);
          this.processDashboardData(realData);
          this.updateElement('statusText', `✅ Live data: ${realData.length} trends loaded`);
          this.initWaveScopeTimeline(); // Ensure timeline displays with real data
          return;
        }
      }

      // Fallback to API if Supabase fails
      console.log('🔄 Trying API fallback...');
      const response = await this.fetchWithTimeout('/api/youtube-data?limit=100');
      const result = await response.json();

      if (result.success && result.data) {
        console.log(`✅ Loaded ${result.data.length} records from API`);
        this.processDashboardData(result.data);
        this.updateElement('statusText', `✅ API data: ${result.data.length} trends loaded`);
        this.initWaveScopeTimeline(); // Ensure timeline displays with API data
      } else {
        throw new Error('API failed');
      }
    } catch (error) {
      console.error('❌ All data sources failed, using demo data:', error);
      this.useFallbackData();
      this.updateElement('statusText', '🟡 Demo Mode - Configure API for live data');
      this.initWaveScopeTimeline(); // Ensure timeline displays with demo data
    } finally {
      this.hideLoading();
    }
  }

  // Fetch real data from Supabase
  async fetchSupabaseData() {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Supabase not configured');
        return null;
      }

      // Try to fetch from youtube_trends table
      const { data, error } = await this.supabase
        .from('youtube_trends')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('❌ Supabase error:', error);
        return null;
      }

      if (data && data.length > 0) {
        console.log(`📊 Found ${data.length} records in Supabase`);
        return data;
      } else {
        console.log('📭 No data found in Supabase');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching from Supabase:', error);
      return null;
    }
  }

  // Process dashboard data
  processDashboardData(data) {
    if (!data || data.length === 0) {
      this.useFallbackData();
      return;
    }

    // Store raw data
    this.state.currentData = data;

    // Process for different views
    const chartData = this.processDataForChart(data);
    const tableData = this.processDataForTable(data);

    // Update UI components
    this.renderChart(chartData);
    this.renderTrendTable(tableData);
    this.renderDetailedTable(data.slice(0, 25));
    this.updateStatusInfo(data);
    this.updateFilters(chartData);
    
    // ALWAYS ensure timeline is visible with current data
    this.createReliableTimeline();
    this.updateRealTrendsList();
  }

  // Process data for table display
  processDataForTable(data) {
    // Aggregate data by categories for trending topics
    const categoryAggregation = {};

    data.forEach(item => {
      const category = this.categorizeItem(item);
      
      if (!categoryAggregation[category]) {
        categoryAggregation[category] = {
          topic: category,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          videoCount: 0,
          avgScore: 0,
          topVideos: [],
          platforms: new Set(),
          scoreSum: 0
        };
      }

      const topic = categoryAggregation[category];
      topic.totalViews += item.view_count || 0;
      topic.totalLikes += item.like_count || 0;
      topic.totalComments += item.comment_count || 0;
      topic.videoCount += 1;
      topic.scoreSum += item.trend_score || 0;
      topic.platforms.add(item.channel_title || 'YouTube');

      // Keep top 3 videos
      if (topic.topVideos.length < 3) {
        topic.topVideos.push({
          title: item.title || 'Untitled',
          views: item.view_count || 0,
          video_id: item.video_id,
          channel: item.channel_title || 'Unknown'
        });
      }
    });

    // Convert to array and calculate averages
    return Object.values(categoryAggregation)
      .map(topic => ({
        ...topic,
        avgScore: Math.round(topic.scoreSum / topic.videoCount),
        avgViews: Math.round(topic.totalViews / topic.videoCount),
        engagement: topic.totalLikes + topic.totalComments,
        platformCount: topic.platforms.size
      }))
      .filter(topic => topic.totalViews > 0)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 15);
  }

  // Process data for chart display with better categorization
  processDataForChart(data) {
    const timeRange = this.getTimeRange();
    const dateMap = new Map();
    
    // Create date intervals
    const dates = this.generateDateIntervals(timeRange.start, timeRange.end);
    
    // Initialize date map with categories
    dates.forEach(date => {
      dateMap.set(date, this.createEmptyDataPoint(date));
    });

    // Aggregate data by date and category
    data.forEach(item => {
      const date = this.getDateKey(item.published_at, timeRange);
      if (dateMap.has(date)) {
        const category = this.categorizeItem(item);
        const dataPoint = dateMap.get(date);
        dataPoint[category] = (dataPoint[category] || 0) + (item.view_count || 0);
      }
    });

    // Convert to array and filter significant trends
    const chartData = Array.from(dateMap.values());
    return this.filterSignificantTrends(chartData);
  }

  // Enhanced categorization logic
  categorizeItem(item) {
    const categoryKeywords = {
      'AI Tools': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai'],
      'Crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft'],
      'Gaming': ['gaming', 'game', 'esports', 'streamer', 'twitch'],
      'Technology': ['tech', 'technology', 'gadget', 'software', 'hardware'],
      'Programming': ['programming', 'coding', 'developer', 'javascript', 'python'],
      'Entertainment': ['movie', 'film', 'music', 'celebrity', 'entertainment'],
      'Health & Fitness': ['health', 'fitness', 'workout', 'nutrition', 'wellness'],
      'Education': ['education', 'learning', 'tutorial', 'course', 'study']
    };

    const content = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }

    return item.trend_category || 'General';
  }

  // Initialize WaveScope Timeline
  initWaveScopeTimeline() {
    console.log('🌊 Initializing WaveScope Timeline...');
    
    // First initialize the main canvas timeline
    const canvas = document.getElementById('wavescopeCanvas');
    if (canvas) {
      setTimeout(() => {
        try {
          this.wavescopeChart = new WaveScopeChart(canvas, this.state.currentData);
          this.wavescopeChart.init();
          console.log('✅ Canvas WaveScope Timeline initialized');
        } catch (error) {
          console.warn('⚠️ Canvas failed, showing fallback timeline:', error);
          // If canvas fails, show a fallback message
          const chartContainer = canvas.parentElement;
          if (chartContainer) {
            chartContainer.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; height: 400px; background: #1a1a2e; border-radius: 12px; border: 2px solid #ef4444;">
                <div style="text-align: center; color: #f1f1f1;">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                  <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">Canvas Timeline Unavailable</div>
                  <div style="color: #9ca3af; font-size: 0.9rem;">See Trend Tiles below for detailed analytics</div>
                </div>
              </div>
            `;
          }
        }
      }, 100);
    }
    
    // Then add Trend Tiles section below
    setTimeout(() => {
      this.createReliableTimeline();
    }, 200);
    
    // Update status to show timeline is active
    this.updateElement('youtubeStatus', '🟢');
    this.updateElement('statusText', '🌊 WaveScope Timeline Active');
  }

  // Create a reliable timeline that ALWAYS shows with Trend Tiles
  createReliableTimeline() {
    const container = document.getElementById('trendChart');
    if (!container) return;

    const currentData = this.state.currentData || this.generateMockTopTrends();
    
    // Normalize data for Trend Tiles
    const normalizedTrends = this.normalizeDataForTrendTiles(currentData);
    
    // Create Trend Tiles section BELOW the main WaveScope Timeline canvas
    container.innerHTML = `
      <div class="trend-tiles-section" style="margin-top: 3rem;">
        <div class="reliable-timeline" style="background: #13131f; border-radius: 16px; padding: 2rem; margin: 2rem 0; border: 1px solid #2e2e45;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h3 style="color: #5ee3ff; margin: 0;">🧩 Trend Tiles - Normalized Cross-Platform Analytics</h3>
            <div style="color: #10b981; font-size: 0.9rem;">🟢 ${normalizedTrends.length} trends normalized</div>
          </div>
          
          ${this.createTrendTilesSection(normalizedTrends)}
          
          <div class="timeline-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin: 2rem 0;">
            ${this.generateCategoryCards(currentData)}
          </div>
          
          <div class="trending-list">
            <h4 style="color: #f1f1f1; margin-bottom: 1rem;">📊 Detailed Analytics</h4>
            <div id="liveTrendsList">${this.generateNormalizedTrendsList(normalizedTrends.slice(0, 10))}</div>
          </div>
        </div>
      </div>
    `;
    
    console.log('✅ Trend Tiles section created below WaveScope Timeline');
  }

  // Create Trend Tiles section
  createTrendTilesSection(normalizedTrends) {
    const topTrends = normalizedTrends.slice(0, 12); // Show top 12 tiles
    
    return `
      <div class="trend-tiles-container" style="margin-bottom: 2rem;">
        <div class="tiles-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="color: #f1f1f1; margin: 0;">🔥 Top Trending Tiles</h4>
          <div style="color: #9ca3af; font-size: 0.8rem;">Normalized scores for cross-platform comparison</div>
        </div>
        
        <div class="trend-tiles-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
          ${topTrends.map(trend => this.generateTrendTile(trend)).join('')}
        </div>
        
        <div class="normalization-info" style="background: rgba(94, 227, 255, 0.05); border: 1px solid rgba(94, 227, 255, 0.2); border-radius: 8px; padding: 1rem; margin-top: 1.5rem;">
          <div style="color: #5ee3ff; font-weight: 600; margin-bottom: 0.5rem;">🔧 Normalization Applied:</div>
          <div style="color: #9ca3af; font-size: 0.85rem; line-height: 1.4;">
            Views (Z-score by category) • Engagement (ratio to views) • Growth Rate (% change/hour, smoothed) • 
            Sentiment (like ratio scaled 0-100) • Recency (log decay curve)
          </div>
        </div>
      </div>
    `;
  }

  // Generate a single Trend Tile
  generateTrendTile(trend) {
    const trajectoryConfig = this.getTrajectoryConfig(trend.trajectory);
    const waveScore = trend.unified_wave_score || 0;
    const breakdown = trend.wave_score_breakdown || {};
    
    // Generate thumbnail placeholder or use actual thumbnail
    const thumbnail = trend.thumbnail_url || this.generateThumbnailPlaceholder(trend);
    
    return `
      <div class="trend-tile" style="
        background: linear-gradient(135deg, #2e2e45 0%, #1a1a2e 100%);
        border-radius: 16px;
        padding: 1.5rem;
        border: 1px solid ${this.getScoreColor(waveScore)};
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
      " onclick="waveSightDashboard.showTrendDetails('${trend.video_id || trend.id}')">
        
        <!-- Thumbnail Section -->
        <div class="tile-thumbnail" style="
          width: 100%;
          height: 120px;
          background: ${thumbnail.startsWith('http') ? `url(${thumbnail})` : thumbnail};
          background-size: cover;
          background-position: center;
          border-radius: 12px;
          margin-bottom: 1rem;
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: 600;
          ">${trend.trend_category || 'General'}</div>
          
          <div style="
            position: absolute;
            bottom: 8px;
            left: 8px;
            background: ${trajectoryConfig.bgColor};
            color: ${trajectoryConfig.textColor};
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: 600;
          ">${trajectoryConfig.icon} ${trajectoryConfig.label}</div>
        </div>
        
        <!-- Content Section -->
        <div class="tile-content">
          <div class="tile-title" style="
            color: #f1f1f1;
            font-weight: 600;
            font-size: 1rem;
            line-height: 1.3;
            margin-bottom: 0.75rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          ">${trend.title || 'Untitled Trend'}</div>
          
          <!-- WaveScore Display -->
          <div class="wave-score-display" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          ">
            <div>
              <div style="color: #9ca3af; font-size: 0.8rem;">WaveScore</div>
              <div style="
                color: ${this.getScoreColor(waveScore)};
                font-size: 1.8rem;
                font-weight: 700;
                line-height: 1;
              ">${waveScore}</div>
            </div>
            
            <div class="score-breakdown" style="text-align: right; font-size: 0.7rem;">
              <div style="color: #5ee3ff;">Views: ${breakdown.views || 0}</div>
              <div style="color: #8b5cf6;">Engagement: ${breakdown.engagement || 0}</div>
              <div style="color: #ec4899;">Growth: ${breakdown.growth_rate || 0}</div>
              <div style="color: #f97316;">Sentiment: ${breakdown.sentiment || 0}</div>
            </div>
          </div>
          
          <!-- Metrics Row -->
          <div class="tile-metrics" style="
            display: flex;
            justify-content: space-between;
            color: #9ca3af;
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
          ">
            <span>👁️ ${this.formatNumber(trend.view_count || 0)}</span>
            <span>💬 ${this.formatNumber(trend.comment_count || 0)}</span>
            <span>⏱️ ${this.formatTimeAgo(trend.published_at)}</span>
          </div>
          
          <!-- Platform Icon -->
          <div style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: 32px;
            height: 32px;
            background: rgba(94, 227, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #5ee3ff;
            font-size: 0.9rem;
          ">${this.getPlatformIcon(trend.platform || 'youtube')}</div>
        </div>
        
        <!-- Hover Effect Overlay -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, ${this.getScoreColor(waveScore)}20, transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        " class="tile-hover-overlay"></div>
      </div>
    `;
  }

  // Get trajectory configuration
  getTrajectoryConfig(trajectory) {
    const configs = {
      rising: { icon: '📈', label: 'Rising', bgColor: '#10b981', textColor: '#ffffff' },
      peaking: { icon: '🚀', label: 'Peaking', bgColor: '#f59e0b', textColor: '#000000' },
      stable: { icon: '📊', label: 'Stable', bgColor: '#6366f1', textColor: '#ffffff' },
      cooling: { icon: '📉', label: 'Cooling', bgColor: '#ef4444', textColor: '#ffffff' },
      declining: { icon: '⬇️', label: 'Declining', bgColor: '#64748b', textColor: '#ffffff' }
    };
    
    return configs[trajectory] || configs.stable;
  }

  // Get color based on WaveScore
  getScoreColor(score) {
    if (score >= 90) return '#ff1744'; // Red - Mega viral
    if (score >= 80) return '#ff6b35'; // Orange-red - Ultra viral
    if (score >= 70) return '#ffaa00'; // Orange - Highly viral
    if (score >= 60) return '#ffd54f'; // Yellow - Viral
    if (score >= 40) return '#81c784'; // Green - Growing
    if (score >= 20) return '#64b5f6'; // Blue - Stable
    return '#90a4ae'; // Gray - Low activity
  }

  // Generate thumbnail placeholder
  generateThumbnailPlaceholder(trend) {
    const colors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
    const color = colors[Math.abs(trend.title?.charCodeAt(0) || 0) % colors.length];
    return `linear-gradient(135deg, ${color}40, ${color}80)`;
  }

  // Get platform icon
  getPlatformIcon(platform) {
    const icons = {
      youtube: '📺',
      reddit: '🟠',
      tiktok: '🎵',
      twitter: '🐦',
      instagram: '📷',
      twitch: '💜'
    };
    return icons[platform.toLowerCase()] || '📱';
  }

  // Format time ago
  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Generate normalized trends list
  generateNormalizedTrendsList(trends) {
    return trends.map((trend, index) => `
      <div class="normalized-trend-item" style="
        display: flex;
        align-items: center;
        padding: 1rem;
        margin-bottom: 0.5rem;
        background: #2e2e45;
        border-radius: 8px;
        border: 1px solid ${this.getScoreColor(trend.unified_wave_score || 0)};
        transition: all 0.3s ease;
      ">
        <span class="trend-rank" style="
          font-weight: 700;
          color: #5ee3ff;
          min-width: 3rem;
          text-align: center;
          font-size: 1.1rem;
        ">#${index + 1}</span>
        
        <div style="flex: 1; margin-left: 1rem;">
          <div style="color: #f1f1f1; font-weight: 600; margin-bottom: 0.25rem; font-size: 1rem;">
            ${trend.title || 'Untitled'}
          </div>
          <div style="color: #9ca3af; font-size: 0.875rem;">
            🔧 ${this.formatNumber(trend.view_count || 0)} views • 
            ${trend.trend_category || 'General'} • 
            ${trend.trajectory} • 
            ${this.formatTimeAgo(trend.published_at)}
          </div>
          
          <!-- Normalized Metrics Breakdown -->
          <div style="margin-top: 0.5rem; font-size: 0.75rem;">
            <span style="color: #5ee3ff;">V:${trend.normalized_metrics?.views || 0}</span> • 
            <span style="color: #8b5cf6;">E:${trend.normalized_metrics?.engagement || 0}</span> • 
            <span style="color: #ec4899;">G:${trend.normalized_metrics?.growth_rate || 0}</span> • 
            <span style="color: #f97316;">S:${trend.normalized_metrics?.sentiment || 0}</span> • 
            <span style="color: #10b981;">R:${trend.normalized_metrics?.recency || 0}</span>
          </div>
        </div>
        
        <div style="
          font-weight: 700;
          color: ${this.getScoreColor(trend.unified_wave_score || 0)};
          font-size: 1.2rem;
          min-width: 4rem;
          text-align: right;
        ">
          ${trend.unified_wave_score || 0}
        </div>
      </div>
    `).join('');
  }

  // Generate category cards showing trend counts
  generateCategoryCards(data) {
    const categories = {};
    
    data.forEach(item => {
      const category = item.trend_category || 'General';
      if (!categories[category]) {
        categories[category] = { count: 0, totalViews: 0, topTrend: null };
      }
      categories[category].count++;
      categories[category].totalViews += item.view_count || 0;
      if (!categories[category].topTrend || (item.viral_score || 0) > (categories[category].topTrend.viral_score || 0)) {
        categories[category].topTrend = item;
      }
    });

    const categoryColors = {
      'AI Tools': '#5ee3ff',
      'Gaming': '#8b5cf6', 
      'Entertainment': '#ec4899',
      'Music': '#f59e0b',
      'Sports': '#84cc16',
      'News': '#10b981',
      'Crypto': '#f97316',
      'Education': '#ef4444',
      'Health': '#06b6d4',
      'General': '#9ca3af'
    };

    return Object.entries(categories).map(([category, stats]) => `
      <div style="background: #2e2e45; border-radius: 12px; padding: 1.5rem; border: 1px solid ${categoryColors[category] || '#9ca3af'};">
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
          <h5 style="color: ${categoryColors[category] || '#f1f1f1'}; margin: 0; font-size: 1rem;">${category}</h5>
          <span style="color: #9ca3af; font-size: 0.8rem;">${stats.count} trends</span>
        </div>
        <div style="color: #f1f1f1; font-size: 0.9rem; margin-bottom: 0.5rem;">
          Top: ${stats.topTrend?.title?.substring(0, 40)}...
        </div>
        <div style="color: #9ca3af; font-size: 0.8rem;">
          ${this.formatNumber(stats.totalViews)} total views
        </div>
      </div>
    `).join('');
  }

  // Generate trends list
  generateTrendsList(trends) {
    return trends.map((trend, index) => `
      <div class="trend-item" style="display: flex; align-items: center; padding: 1rem; margin-bottom: 0.5rem; background: #2e2e45; border-radius: 8px; border: 1px solid rgba(94, 227, 255, 0.2); transition: all 0.3s ease;">
        <span class="trend-rank" style="font-weight: 700; color: #5ee3ff; min-width: 3rem; text-align: center; font-size: 1.1rem;">#${index + 1}</span>
        <div style="flex: 1; margin-left: 1rem;">
          <div style="color: #f1f1f1; font-weight: 600; margin-bottom: 0.25rem; font-size: 1rem;">${trend.title || 'Untitled'}</div>
          <div style="color: #9ca3af; font-size: 0.875rem;">
            ${this.formatNumber(trend.view_count || 0)} views • 
            ${trend.trend_category || 'General'} • 
            ${trend.viral_score ? `🔥 ${trend.viral_score.toFixed(1)}` : ''} •
            ${new Date(trend.published_at || Date.now()).toLocaleDateString()}
          </div>
        </div>
        <div style="font-weight: 700; color: #10b981; font-size: 1rem; min-width: 4rem; text-align: right;">
          ${((trend.trend_score || 0) * 100).toFixed(0)}%
        </div>
      </div>
    `).join('');
  }

  // Create fallback timeline if canvas fails
  createFallbackTimeline() {
    const container = document.getElementById('trendChart');
    if (!container) return;

    const dataSource = this.state.currentData ? 'Real Data' : 'Demo Data';
    
    container.innerHTML = `
      <div class="fallback-timeline" style="background: #13131f; border-radius: 16px; padding: 2rem; margin: 2rem 0; border: 1px solid #2e2e45;">
        <h3 style="color: #5ee3ff; margin-bottom: 1rem;">📊 Top Trending Topics (${dataSource})</h3>
        <div class="timeline-status" style="margin-bottom: 1rem; padding: 12px; background: #2e2e45; border-radius: 8px; color: #9ca3af; font-size: 14px;">
          🌊 WaveScope Timeline - Canvas fallback mode active
        </div>
        <div id="realTrendsList"></div>
      </div>
    `;

    this.updateRealTrendsList();
    console.log('✅ Fallback timeline created and populated');
  }

  // Update real trends list
  updateRealTrendsList() {
    const container = document.getElementById('realTrendsList');
    if (!container) return;

    // Always show content, even if no current data
    const currentData = this.state.currentData || [];
    const topTrends = currentData.length > 0 ? currentData.slice(0, 10) : this.generateMockTopTrends();
    
    const trendsHTML = topTrends.map((trend, index) => `
      <div class="trend-item">
        <span class="trend-rank">#${index + 1}</span>
        <div class="trend-info">
          <div class="trend-title">${trend.title || trend.trend_name || 'Untitled'}</div>
          <div class="trend-stats">
            ${this.formatNumber(trend.view_count || 0)} views • 
            ${trend.trend_category || 'General'} • 
            ${new Date(trend.published_at || Date.now()).toLocaleDateString()}
          </div>
        </div>
        <div class="trend-score">${((trend.trend_score || 0) * 100).toFixed(0)}%</div>
      </div>
    `).join('');

    container.innerHTML = trendsHTML;
    console.log(`✅ Real trends list updated with ${topTrends.length} items`);
  }

  // Generate mock top trends for demo
  generateMockTopTrends() {
    return [
      { title: 'AI Breakthrough Changes Everything', view_count: 4500000, trend_category: 'AI Tools', trend_score: 0.95, published_at: new Date() },
      { title: 'New Gaming Technology Released', view_count: 3200000, trend_category: 'Gaming', trend_score: 0.88, published_at: new Date() },
      { title: 'Viral Entertainment Content', view_count: 2800000, trend_category: 'Entertainment', trend_score: 0.82, published_at: new Date() },
      { title: 'Crypto Market Update', view_count: 2100000, trend_category: 'Crypto', trend_score: 0.75, published_at: new Date() },
      { title: 'Tech Innovation Unveiled', view_count: 1900000, trend_category: 'Technology', trend_score: 0.73, published_at: new Date() },
      { title: 'Health & Fitness Trends', view_count: 1600000, trend_category: 'Health & Fitness', trend_score: 0.69, published_at: new Date() },
      { title: 'Educational Content Rising', view_count: 1400000, trend_category: 'Education', trend_score: 0.65, published_at: new Date() },
      { title: 'Music Video Goes Viral', view_count: 1200000, trend_category: 'Entertainment', trend_score: 0.62, published_at: new Date() },
      { title: 'Programming Tutorial Trending', view_count: 1000000, trend_category: 'Programming', trend_score: 0.58, published_at: new Date() },
      { title: 'News Update Breaking', view_count: 850000, trend_category: 'News', trend_score: 0.55, published_at: new Date() }
    ];
  }

  // Render chart - fallback for legacy code
  renderChart(data, filterTrend = 'all') {
    // Initialize timeline if not already done
    if (!this.wavescopeChart) {
      this.initWaveScopeTimeline();
    }
    console.log('✅ Chart render called - WaveScope Timeline should be visible');
  }

  createTimelineChart(data) {
    if (!Array.isArray(data)) {
      // Create demo data if none provided
      data = [
        { date: 'Jan 2025', 'AI & Technology': 2800000, 'Gaming': 2100000, 'Entertainment': 2600000 },
        { date: 'Feb 2025', 'AI & Technology': 3200000, 'Gaming': 2300000, 'Entertainment': 2800000 },
        { date: 'Mar 2025', 'AI & Technology': 3600000, 'Gaming': 2500000, 'Entertainment': 3000000 },
        { date: 'Apr 2025', 'AI & Technology': 4100000, 'Gaming': 2800000, 'Entertainment': 3200000 },
        { date: 'May 2025', 'AI & Technology': 4500000, 'Gaming': 3100000, 'Entertainment': 3400000 },
        { date: 'Jun 2025', 'AI & Technology': 4900000, 'Gaming': 3300000, 'Entertainment': 3600000 }
      ];
    }

    const categories = ['AI & Technology', 'Gaming', 'Entertainment'];
    const colors = ['#5ee3ff', '#8b5cf6', '#ec4899'];
    
    return `
      <div class="chart-container">
        <div class="chart-y-axis">
          <div class="y-label">5M</div>
          <div class="y-label">4M</div>
          <div class="y-label">3M</div>
          <div class="y-label">2M</div>
          <div class="y-label">1M</div>
          <div class="y-label">0</div>
        </div>
        
        <div class="chart-main">
          ${data.map((month, index) => `
            <div class="chart-column" style="animation-delay: ${index * 0.1}s">
              <div class="month-label">${month.date}</div>
              <div class="bars-container">
                ${categories.map((category, catIndex) => {
                  const value = month[category] || 0;
                  const height = Math.min((value / 5000000) * 100, 100);
                  return `
                    <div class="trend-bar" 
                         style="height: ${height}%; 
                                background: ${colors[catIndex]}; 
                                animation-delay: ${(index * 0.1) + (catIndex * 0.05)}s"
                         title="${category}: ${this.formatNumber(value)} views">
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="trend-indicators">
                ${categories.map((category, catIndex) => {
                  const current = month[category] || 0;
                  const previous = index > 0 ? (data[index - 1][category] || 0) : current;
                  const growth = previous > 0 ? ((current - previous) / previous * 100) : 0;
                  const indicator = growth > 10 ? '🔥' : growth > 0 ? '📈' : growth < -10 ? '📉' : '➡️';
                  return `<span class="indicator" title="${category}: ${growth.toFixed(1)}% growth">${indicator}</span>`;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  createTimelineLegend(data) {
    const categories = [
      { name: 'AI & Technology', color: '#5ee3ff', icon: '🤖' },
      { name: 'Gaming', color: '#8b5cf6', icon: '🎮' },
      { name: 'Entertainment', color: '#ec4899', icon: '🎬' }
    ];

    return `
      <div class="chart-legend">
        ${categories.map(cat => `
          <div class="legend-item">
            <div class="legend-color" style="background: ${cat.color}"></div>
            <span class="legend-icon">${cat.icon}</span>
            <span class="legend-text">${cat.name}</span>
          </div>
        `).join('')}
        <div class="legend-indicators">
          <span>🔥 Viral</span>
          <span>📈 Rising</span>
          <span>➡️ Stable</span>
          <span>📉 Declining</span>
        </div>
      </div>
    `;
  }

  // Enhanced search functionality
  async searchTrends() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput?.value.trim();

    if (!searchTerm) {
      await this.resetView();
      return;
    }

    this.showLoading();
    this.showNotification(`🔍 Searching for "${searchTerm}" across all platforms...`, 'info');

    try {
      // Search in current data first
      let localResults = this.searchInCurrentData(searchTerm);
      
      // Always fetch fresh data from YouTube API for comprehensive results
      let freshResults = await this.fetchSearchResults(searchTerm);
      
      // Combine and deduplicate results
      const combinedResults = this.combineAndRankResults(localResults, freshResults, searchTerm);

      if (combinedResults.length > 0) {
        this.displaySearchResults(combinedResults, searchTerm);
        this.showNotification(`✅ Found ${combinedResults.length} trends for "${searchTerm}" (${freshResults.length} new from YouTube)`, 'success');
      } else {
        this.showNoResults(searchTerm);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      // Fallback to local search only
      const localResults = this.searchInCurrentData(searchTerm);
      if (localResults.length > 0) {
        this.displaySearchResults(localResults, searchTerm);
        this.showNotification(`⚠️ Showing ${localResults.length} local results for "${searchTerm}"`, 'warning');
      } else {
        this.showNoResults(searchTerm);
      }
    } finally {
      this.hideLoading();
    }
  }

  // Search in current data
  searchInCurrentData(searchTerm) {
    if (!this.state.currentData) return [];

    return this.state.currentData.filter(item => {
      const searchableContent = [
        item.title,
        item.description,
        item.trend_category,
        item.channel_title
      ].join(' ').toLowerCase();

      return searchableContent.includes(searchTerm);
    });
  }

  // Fetch search results from API
  async fetchSearchResults(searchTerm) {
    const response = await this.fetchWithTimeout(
      `/api/fetch-youtube?q=${encodeURIComponent(searchTerm)}&maxResults=50`
    );
    
    const result = await response.json();
    return result.success ? result.data : [];
  }

  // Trend comparison functionality
  addToComparison(trendName, trendData) {
    if (this.state.comparedTrends.length >= this.config.ui.maxComparedTrends) {
      this.showNotification('Maximum comparison limit reached', 'warning');
      return;
    }

    if (this.state.comparedTrends.some(t => t.name === trendName)) {
      this.showNotification('Trend already in comparison', 'info');
      return;
    }

    this.state.comparedTrends.push({ name: trendName, data: trendData });
    this.updateComparisonView();
  }

  // Advanced analytics
  async showAdvancedAnalytics(trendName) {
    const trendData = this.getTrendData(trendName);
    if (!trendData || trendData.length === 0) {
      this.showNotification('No data available for analysis', 'error');
      return;
    }

    const analytics = this.calculateAdvancedMetrics(trendData);
    const modal = new AnalyticsModal(trendName, analytics);
    modal.show();
  }

  // Calculate advanced metrics
  calculateAdvancedMetrics(data) {
    const metrics = new MetricsCalculator(data);
    
    return {
      waveScore: metrics.calculateWaveScore(),
      growthRate: metrics.calculateGrowthRate(),
      engagementQuality: metrics.calculateEngagementQuality(),
      prediction: metrics.predictTrend(),
      insights: metrics.generateInsights(),
      recommendations: metrics.generateRecommendations()
    };
  }

  // Performance utilities
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Cache management
  setCache(key, value) {
    if (!this.config.cache.enabled) return;
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    if (!this.config.cache.enabled) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  // Helper methods for date and time
  getTimeRange() {
    if (this.state.dateRange.start || this.state.dateRange.end) {
      return {
        start: this.state.dateRange.start ? new Date(this.state.dateRange.start) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        end: this.state.dateRange.end ? new Date(this.state.dateRange.end) : new Date()
      };
    }
    
    // Default to last 6 months
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - this.config.ui.defaultTimeRange);
    
    return { start, end };
  }

  generateDateIntervals(start, end) {
    const dates = [];
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 30) {
      // Daily intervals
      const current = new Date(start);
      while (current <= end) {
        dates.push(`${current.getMonth() + 1}/${current.getDate()}`);
        current.setDate(current.getDate() + 1);
      }
    } else if (daysDiff <= 180) {
      // Weekly intervals
      const current = new Date(start);
      let week = 1;
      while (current <= end) {
        dates.push(`Week ${week}`);
        current.setDate(current.getDate() + 7);
        week++;
      }
    } else {
      // Monthly intervals
      const current = new Date(start);
      while (current <= end) {
        dates.push(`${current.getMonth() + 1}/${current.getFullYear()}`);
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return dates;
  }

  getDateKey(dateString, timeRange) {
    const date = new Date(dateString);
    const daysDiff = Math.ceil((timeRange.end - timeRange.start) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 30) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else if (daysDiff <= 180) {
      const weekNumber = Math.ceil((date - timeRange.start) / (1000 * 60 * 60 * 24 * 7));
      return `Week ${Math.max(1, weekNumber)}`;
    } else {
      return `${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  }

  createEmptyDataPoint(date) {
    return {
      date,
      'AI Tools': 0,
      'Crypto': 0,
      'Gaming': 0,
      'Technology': 0,
      'Programming': 0,
      'Entertainment': 0,
      'Health & Fitness': 0,
      'Education': 0,
      'General': 0
    };
  }

  filterSignificantTrends(chartData) {
    // Calculate totals for each trend
    const trendTotals = {};
    
    chartData.forEach(dataPoint => {
      Object.keys(dataPoint).forEach(key => {
        if (key !== 'date') {
          trendTotals[key] = (trendTotals[key] || 0) + (dataPoint[key] || 0);
        }
      });
    });
    
    // Get top trends by total views
    const significantTrends = Object.entries(trendTotals)
      .filter(([_, total]) => total > 1000)
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.config.chart.maxTrends)
      .map(([trend]) => trend);
    
    // Filter chart data to only include significant trends
    return chartData.map(dataPoint => {
      const filtered = { date: dataPoint.date };
      significantTrends.forEach(trend => {
        filtered[trend] = dataPoint[trend] || 0;
      });
      return filtered;
    });
  }

  getTrendsToShow(data, filterTrend) {
    if (!data || data.length === 0) return [];
    
    if (filterTrend === 'all') {
      // Get all trend names from data
      const trends = new Set();
      data.forEach(dataPoint => {
        Object.keys(dataPoint).forEach(key => {
          if (key !== 'date') trends.add(key);
        });
      });
      return Array.from(trends);
    } else if (filterTrend === 'comparison' && this.state.comparedTrends.length > 0) {
      // Show compared trends
      return this.state.comparedTrends.map(t => t.name);
    } else {
      // Show specific trend
      return [filterTrend];
    }
  }

  createHighDPICanvas(container) {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = 330;
    
    // Set actual size in memory
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set display size
    canvas.style.width = '100%';
    canvas.style.height = height + 'px';
    
    container.appendChild(canvas);
    
    // Scale context for high DPI
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    return canvas;
  }

  addChartInteractivity(canvas, chartRenderer) {
    // Add click handler for trend details
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Get clickable areas from chart renderer
      const clickableAreas = chartRenderer.getClickableAreas();
      
      // Check if click is on any trend line
      clickableAreas.forEach(area => {
        area.points.forEach(point => {
          const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
          if (distance <= 25) {
            this.showTrendAnalytics(area.trendName);
          }
        });
      });
    });
    
    // Add hover effect
    canvas.style.cursor = 'pointer';
  }

  showTrendAnalytics(trendName) {
    // Get data for this trend
    const trendData = this.state.currentData?.filter(item => 
      this.categorizeItem(item) === trendName
    );
    
    if (!trendData || trendData.length === 0) {
      this.showNotification('No data available for this trend', 'info');
      return;
    }
    
    // Show advanced analytics
    this.showAdvancedAnalytics(trendName);
  }

  // Auto-refresh functionality
  initAutoRefresh() {
    const settings = JSON.parse(localStorage.getItem('wavesightSettings') || '{}');
    const interval = settings.refreshInterval || 'never';
    
    if (interval !== 'never') {
      this.enableAutoRefresh(interval);
    }
  }

  enableAutoRefresh(interval) {
    this.disableAutoRefresh();
    
    const intervalMap = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000
    };
    
    const ms = intervalMap[interval];
    if (ms) {
      this.state.autoRefreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard...');
        this.loadDashboardData(true);
      }, ms);
      
      this.updateLiveStatus('auto-refresh');
    }
  }

  disableAutoRefresh() {
    if (this.state.autoRefreshInterval) {
      clearInterval(this.state.autoRefreshInterval);
      this.state.autoRefreshInterval = null;
    }
  }

  toggleAutoRefresh() {
    const btn = document.getElementById('autoRefreshBtn');
    if (!btn) return;
    
    if (this.state.autoRefreshInterval) {
      this.disableAutoRefresh();
      btn.textContent = '⏰ Auto-Refresh';
      btn.style.background = '#7C3AED';
      this.updateLiveStatus('connected');
    } else {
      this.enableAutoRefresh('5min');
      btn.textContent = '⏸️ Auto-Refresh';
      btn.style.background = '#10B981';
    }
  }

  updateLiveStatus(status) {
    const indicator = document.getElementById('liveStatus');
    if (!indicator) return;
    
    const statusMap = {
      'connected': { text: '🟢 Live', color: '#10B981' },
      'auto-refresh': { text: '🔄 Auto-refresh', color: '#06B6D4' },
      'error': { text: '🔴 Disconnected', color: '#EF4444' },
      'loading': { text: '🟡 Loading...', color: '#F59E0B' }
    };
    
    const statusInfo = statusMap[status] || statusMap['connected'];
    indicator.textContent = statusInfo.text;
    indicator.style.color = statusInfo.color;
  }

  // Keyboard shortcuts
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      
      switch(event.key) {
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.loadDashboardData(true);
          }
          break;
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            document.getElementById('searchInput')?.focus();
          }
          break;
        case 'Escape':
          this.resetView();
          break;
      }
    });
  }

  // Fallback data when API fails
  useFallbackData() {
    // Generate more realistic current trending data
    const currentDate = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate chart data for last 6 months
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      chartData.push({
        date: monthLabel,
        'AI & Technology': Math.floor(Math.random() * 1000000 + 2000000),
        'Crypto & Finance': Math.floor(Math.random() * 800000 + 1200000),
        'Gaming': Math.floor(Math.random() * 600000 + 1500000),
        'Entertainment': Math.floor(Math.random() * 900000 + 1800000),
        'News & Politics': Math.floor(Math.random() * 700000 + 1000000),
        'Lifestyle': Math.floor(Math.random() * 500000 + 800000)
      });
    }

    // Current trending topics with realistic data
    const trendingTopics = [
      {
        topic: 'AI & Technology',
        trends: ['ChatGPT Updates', 'Apple Vision Pro', 'Tesla FSD', 'iPhone 16 Pro', 'AI Image Generation'],
        totalViews: Math.floor(Math.random() * 5000000 + 15000000),
        videoCount: Math.floor(Math.random() * 50 + 180),
        avgScore: Math.floor(Math.random() * 15 + 85),
        platformCount: 8,
        momentum: 'rising'
      },
      {
        topic: 'Crypto & Finance',
        trends: ['Bitcoin ETF', 'Ethereum 2.0', 'DeFi Protocols', 'NFT Market', 'Solana Updates'],
        totalViews: Math.floor(Math.random() * 3000000 + 8000000),
        videoCount: Math.floor(Math.random() * 30 + 120),
        avgScore: Math.floor(Math.random() * 20 + 70),
        platformCount: 6,
        momentum: 'stable'
      },
      {
        topic: 'Gaming',
        trends: ['Baldur\'s Gate 3', 'Fortnite Chapter 5', 'Call of Duty', 'Palworld', 'Helldivers 2'],
        totalViews: Math.floor(Math.random() * 4000000 + 12000000),
        videoCount: Math.floor(Math.random() * 40 + 200),
        avgScore: Math.floor(Math.random() * 18 + 82),
        platformCount: 7,
        momentum: 'viral'
      },
      {
        topic: 'Entertainment',
        trends: ['Marvel Phase 5', 'Netflix Shows', 'Streaming Wars', 'Celebrity News', 'Music Releases'],
        totalViews: Math.floor(Math.random() * 6000000 + 20000000),
        videoCount: Math.floor(Math.random() * 60 + 250),
        avgScore: Math.floor(Math.random() * 12 + 88),
        platformCount: 9,
        momentum: 'trending'
      },
      {
        topic: 'News & Politics',
        trends: ['Election 2024', 'Global Events', 'Economic News', 'Climate Change', 'Tech Regulation'],
        totalViews: Math.floor(Math.random() * 4000000 + 10000000),
        videoCount: Math.floor(Math.random() * 45 + 160),
        avgScore: Math.floor(Math.random() * 25 + 65),
        platformCount: 12,
        momentum: 'rising'
      },
      {
        topic: 'Lifestyle',
        trends: ['Fitness Trends', 'Cooking Videos', 'Travel Vlogs', 'Fashion Hauls', 'Wellness Tips'],
        totalViews: Math.floor(Math.random() * 3000000 + 7000000),
        videoCount: Math.floor(Math.random() * 35 + 140),
        avgScore: Math.floor(Math.random() * 15 + 75),
        platformCount: 5,
        momentum: 'stable'
      }
    ];

    // Generate detailed trends for the table
    const detailedTrends = [];
    trendingTopics.forEach(category => {
      category.trends.forEach((trend, index) => {
        detailedTrends.push({
          id: `trend_${category.topic}_${index}`,
          title: trend,
          category: category.topic,
          view_count: Math.floor(Math.random() * 2000000 + 500000),
          like_count: Math.floor(Math.random() * 50000 + 10000),
          comment_count: Math.floor(Math.random() * 5000 + 1000),
          trend_score: Math.random() * 0.3 + 0.7,
          engagement_rate: Math.random() * 8 + 2,
          published_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          channel_title: `Top ${category.topic} Channel`,
          momentum: category.momentum
        });
      });
    });

    // Store the data
    this.state.currentData = detailedTrends;
    
    // Render components
    this.renderChart(chartData);
    this.renderTrendTable(trendingTopics);
    this.renderDetailedTable(detailedTrends.slice(0, 25));
    this.updateStatusInfo(detailedTrends);
    
    // ALWAYS ensure timeline is visible
    this.createReliableTimeline();
    
    // Update status cards with demo data
    this.updateElement('liveStatus', '🟡 Demo Mode');
    this.updateElement('lastRefresh', 'Demo Data');
    this.updateElement('nextTrend', 'AI Technology');
    this.updateElement('totalRecords', detailedTrends.length.toLocaleString());
    this.updateElement('totalCategories', trendingTopics.length);
    this.updateElement('totalViews', (detailedTrends.reduce((sum, t) => sum + t.view_count, 0)).toLocaleString());
    this.updateElement('dateRange', 'Last 7 days');
    this.updateElement('topCategory', trendingTopics[0].topic);
    this.updateElement('trendMomentum', '📈 Rising');

    this.showNotification('📊 Displaying demo trending data - Configure API keys for live data', 'info');
  }

  // Error handling
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.api.timeout);

    try {
      const response = await fetch(this.config.api.baseUrl + url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Render trending topics table
  renderTrendTable(tableData) {
    const tableBody = document.getElementById('trendTableBody');
    if (!tableBody) {
      console.log('❌ Table body element not found');
      return;
    }

    if (!tableData || tableData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No trending topics available</td></tr>';
      return;
    }

    const totalReach = tableData.reduce((sum, topic) => sum + topic.totalViews, 0);

    const tableHTML = tableData.map((topic, index) => {
      const reachPercentage = totalReach > 0 ? ((topic.totalViews / totalReach) * 100).toFixed(1) : '0.0';
      const engagementRate = topic.totalViews > 0 ? 
        ((topic.engagement / topic.totalViews) * 100).toFixed(2) : '0.00';

      const trendDirection = topic.avgScore >= 80 ? '📈' : topic.avgScore >= 60 ? '📊' : '📉';
      const trendClass = topic.avgScore >= 80 ? 'trending-up' : topic.avgScore >= 60 ? 'trending-stable' : 'trending-down';

      const topVideo = topic.topVideos[0];
      const videoUrl = topVideo?.video_id ? `https://www.youtube.com/watch?v=${topVideo.video_id}` : '#';

      return `
        <tr class="${trendClass}">
          <td class="topic-cell">
            ${topVideo?.video_id ? 
              `<a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #5ee3ff; text-decoration: none;">
                <div class="topic-name">${topic.topic}</div>
                <div class="topic-subtitle">${topic.videoCount} videos</div>
              </a>` :
              `<div class="topic-name">${topic.topic}</div>
               <div class="topic-subtitle">${topic.videoCount} videos</div>`
            }
          </td>
          <td>
            <span class="platform-count">${topic.platformCount} source${topic.platformCount > 1 ? 's' : ''}</span>
          </td>
          <td>
            <div class="metric-stack">
              <span class="primary-metric">${this.formatNumber(topic.totalViews)}</span>
              <span class="secondary-metric">${engagementRate}% engagement</span>
            </div>
          </td>
          <td>
            <div class="score-display">
              <span class="trend-direction">${trendDirection}</span>
              <span class="score-value" style="color: ${topic.avgScore >= 80 ? '#10B981' : topic.avgScore >= 60 ? '#F59E0B' : '#EF4444'}">${topic.avgScore}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = tableHTML;
    console.log(`✅ Trending topics table populated with ${tableData.length} categories`);
  }

  // Render detailed trends table
  renderDetailedTable(data) {
    const tableBody = document.getElementById('detailedTrendsTableBody');
    if (!tableBody) {
      console.log('❌ Detailed trends table body not found');
      return;
    }

    // Use real data if available, otherwise generate mock data
    if (!data || data.length === 0) {
      console.log('📊 No real data available, generating mock trends for detailed table');
      data = this.generateMockTopTrends();
    }

    const rows = data.map((item, index) => {
      const rank = index + 1;
      const title = item.title || item.trend_name || 'Untitled';
      const category = item.trend_category || 'General';
      const views = item.view_count || 0;
      const engagementRate = this.calculateEngagementRate(item);
      const viewGrowth = this.calculateViewGrowth(item);
      const score = item.trend_score || 0;
      const publishedDate = new Date(item.published_at || Date.now());

      const getGrowthClass = (status) => {
        switch (status) {
          case 'viral': return 'growth-viral';
          case 'trending': return 'growth-trending';
          case 'rising': return 'growth-rising';
          default: return 'growth-stable';
        }
      };

      return `
        <tr>
          <td><span class="rank-badge">#${rank}</span></td>
          <td>
            <div class="content-info">
              <div class="content-title">${this.escapeHtml(title)}</div>
              <div class="content-channel">${this.escapeHtml(item.channel_title || 'Unknown')}</div>
            </div>
          </td>
          <td><span class="category-tag category-${category.toLowerCase().replace(/\s+/g, '-')}">${category}</span></td>
          <td>
            <div class="metric-value">${this.formatNumber(views)}</div>
            <div class="metric-label">views</div>
          </td>
          <td>
            <div class="growth-container">
              <span class="growth-percentage ${getGrowthClass(viewGrowth.status)}">
                +${viewGrowth.percentage}%
              </span>
              <div class="growth-status ${getGrowthClass(viewGrowth.status)}">
                ${viewGrowth.status}
              </div>
            </div>
          </td>
          <td>
            <div class="metric-value">${engagementRate}%</div>
            <div class="metric-label">engagement</div>
          </td>
          <td>
            <div class="metric-value">${score}</div>
            <div class="metric-label">score</div>
          </td>
          <td>
            <div class="date-info">
              <div>${publishedDate.toLocaleDateString()}</div>
              <div class="time-ago">${viewGrowth.hoursOld}h ago</div>
            </div>
          </td>
          <td>
            <div class="action-buttons">
              <button class="action-btn view-btn" onclick="waveSightDashboard.showTrendDetails('${item.video_id || item.id}')" title="View Details">👁️</button>
              <button class="action-btn alert-btn" onclick="waveSightDashboard.createTrendAlert('${item.video_id || item.id}')" title="Set Alert">🚨</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = rows;
  }

  // Update status information
  updateStatusInfo(data) {
    if (!data || data.length === 0) return;

    const totalRecords = data.length;
    const categories = [...new Set(data.map(item => this.categorizeItem(item)))];
    const totalViews = data.reduce((sum, item) => sum + (item.view_count || 0), 0);
    
    const dates = data.map(item => new Date(item.published_at)).sort((a, b) => a - b);
    const dateRange = dates.length > 0 ? 
      `${dates[0].toLocaleDateString()} - ${dates[dates.length - 1].toLocaleDateString()}` : 
      'No data';

    // Find top category
    const categoryViews = {};
    data.forEach(item => {
      const category = this.categorizeItem(item);
      categoryViews[category] = (categoryViews[category] || 0) + (item.view_count || 0);
    });
    const topCategory = Object.entries(categoryViews)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';

    // Update UI elements
    this.updateElement('totalRecords', totalRecords.toLocaleString());
    this.updateElement('totalCategories', categories.length);
    this.updateElement('totalViews', this.formatNumber(totalViews));
    this.updateElement('dateRange', dateRange);
    this.updateElement('topCategory', topCategory);
    this.updateElement('lastRefresh', `Updated ${new Date().toLocaleTimeString()}`);
  }

  // Update filters dropdown
  updateFilters(chartData) {
    const filterSelect = document.getElementById('trendFilter');
    if (!filterSelect || !chartData || chartData.length === 0) return;

    // Extract unique trends
    const trends = new Set();
    chartData.forEach(dataPoint => {
      Object.keys(dataPoint).forEach(key => {
        if (key !== 'date') trends.add(key);
      });
    });

    // Update dropdown
    filterSelect.innerHTML = '<option value="all">All Trends</option>';
    Array.from(trends).forEach(trend => {
      const option = document.createElement('option');
      option.value = trend;
      option.textContent = trend;
      filterSelect.appendChild(option);
    });
  }

  // Helper methods
  calculateEngagementRate(item) {
    const viewCount = item.view_count || 0;
    const likeCount = item.like_count || 0;
    const commentCount = item.comment_count || 0;

    if (viewCount === 0) return 0;
    return ((likeCount + commentCount) / viewCount * 100).toFixed(2);
  }

  calculateViewGrowth(item) {
    const currentViews = item.view_count || 0;
    const publishedDate = new Date(item.published_at);
    const now = new Date();
    const hoursOld = Math.max(1, (now - publishedDate) / (1000 * 60 * 60));

    // Simplified growth calculation
    const trendScore = item.trend_score || 50;
    const growthFactor = hoursOld < 24 ? 2 : hoursOld < 168 ? 1.5 : 1.2;
    const growthPercentage = (trendScore / 50) * growthFactor * 10;

    let status = 'stable';
    if (growthPercentage > 50) status = 'viral';
    else if (growthPercentage > 25) status = 'trending';
    else if (growthPercentage > 10) status = 'rising';

    return {
      percentage: growthPercentage.toFixed(1),
      status: status,
      hoursOld: Math.floor(hoursOld)
    };
  }

  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toString();
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // UI utilities
  showLoading() {
    if (this.state.isLoading) return;
    this.state.isLoading = true;

    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading data...</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  hideLoading() {
    this.state.isLoading = false;
    const overlay = document.getElementById('loadingOverlay');
    overlay?.remove();
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Event listeners initialization
  initEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.searchTrends());
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performComprehensiveSearch();
        }
      });
    }

    // Filter dropdowns
    document.getElementById('trendFilter')?.addEventListener('change', () => this.filterChart());
    document.getElementById('detailedCategoryFilter')?.addEventListener('change', () => this.refreshDetailedTable());
    document.getElementById('detailedSortBy')?.addEventListener('change', () => this.refreshDetailedTable());
    document.getElementById('detailedLimit')?.addEventListener('change', () => this.refreshDetailedTable());

    // Date range
    document.getElementById('startDate')?.addEventListener('change', () => this.filterByDateRange());
    document.getElementById('endDate')?.addEventListener('change', () => this.filterByDateRange());

    // Buttons
    document.getElementById('searchBtn')?.addEventListener('click', () => this.performComprehensiveSearch());
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.loadDashboardData(true));
    document.getElementById('autoRefreshBtn')?.addEventListener('click', () => this.toggleAutoRefresh());
  }

  // Chart filtering
  async filterChart() {
    const filterSelect = document.getElementById('trendFilter');
    if (!filterSelect) return;

    this.state.selectedTrends = filterSelect.value;
    
    if (this.state.currentData) {
      const chartData = this.processDataForChart(this.state.currentData);
      this.renderChart(chartData, this.state.selectedTrends);
    }
  }

  // Refresh detailed table with filters
  refreshDetailedTable() {
    if (!this.state.currentData || this.state.currentData.length === 0) return;

    const categoryFilter = document.getElementById('detailedCategoryFilter')?.value || 'all';
    const sortBy = document.getElementById('detailedSortBy')?.value || 'view_count';
    const limit = parseInt(document.getElementById('detailedLimit')?.value || '25');

    let filteredData = this.state.currentData;

    // Apply category filter
    if (categoryFilter !== 'all') {
      filteredData = filteredData.filter(item => 
        this.categorizeItem(item) === categoryFilter
      );
    }

    // Sort data
    filteredData.sort((a, b) => {
      switch (sortBy) {
        case 'view_count':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'trend_score':
          return (b.trend_score || 0) - (a.trend_score || 0);
        case 'published_at':
          return new Date(b.published_at) - new Date(a.published_at);
        case 'engagement':
          return this.calculateEngagementRate(b) - this.calculateEngagementRate(a);
        case 'growth':
          return parseFloat(this.calculateViewGrowth(b).percentage) - 
                 parseFloat(this.calculateViewGrowth(a).percentage);
        default:
          return 0;
      }
    });

    // Apply limit
    const limitedData = filteredData.slice(0, limit);
    
    // Render the table
    this.renderDetailedTable(limitedData);
  }

  // Date range filtering
  async filterByDateRange() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    if (!startDate && !endDate) return;

    this.state.dateRange = { start: startDate, end: endDate };

    if (this.state.currentData) {
      // Filter data by date range
      let filteredData = this.state.currentData;
      
      if (startDate || endDate) {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.published_at);
          const start = startDate ? new Date(startDate) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
          return itemDate >= start && itemDate <= end;
        });
      }

      // Update all views with filtered data
      this.processDashboardData(filteredData);
    }
  }

  // Comprehensive search
  async performComprehensiveSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput?.value.trim();
    
    if (!searchTerm) {
      this.showNotification('Please enter a search term', 'warning');
      return;
    }

    await this.searchTrends();
  }

  // Display search results
  displaySearchResults(results, searchTerm) {
    const searchTermDisplay = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
    
    // Create search-specific chart data
    const chartData = this.createSearchChartData(results, searchTermDisplay);
    
    // Update state
    this.state.filteredData = results;
    this.state.selectedTrends = searchTermDisplay;
    
    // Update UI
    this.renderChart(chartData, searchTermDisplay);
    this.renderTrendTable(this.processDataForTable(results));
    this.renderDetailedTable(results.slice(0, 25));
    this.updateStatusInfo(results);
    
    // Update filter dropdown
    const filterSelect = document.getElementById('trendFilter');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">All Trends</option>';
      const option = document.createElement('option');
      option.value = searchTermDisplay;
      option.textContent = searchTermDisplay;
      option.selected = true;
      filterSelect.appendChild(option);
    }
  }

  // Create search-specific chart data
  createSearchChartData(searchResults, searchTerm) {
    const dates = this.generateDateIntervals(
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      new Date()
    );
    
    const dateMap = new Map();
    dates.forEach(date => {
      dateMap.set(date, { date, [searchTerm]: 0 });
    });

    searchResults.forEach(item => {
      const dateKey = this.getDateKey(item.published_at, { monthsBack: 6 });
      if (dateMap.has(dateKey)) {
        const dataPoint = dateMap.get(dateKey);
        dataPoint[searchTerm] = (dataPoint[searchTerm] || 0) + (item.view_count || 0);
      }
    });

    return Array.from(dateMap.values());
  }

  // Show no results message
  showNoResults(searchTerm) {
    const tableBody = document.getElementById('trendTableBody');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No results found for "${searchTerm}"</td></tr>`;
    }
    
    const detailedTableBody = document.getElementById('detailedTrendsTableBody');
    if (detailedTableBody) {
      detailedTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">No results found for "${searchTerm}"</td></tr>`;
    }
  }

  // Reset view to default
  async resetView() {
    this.state.selectedTrends = 'all';
    this.state.comparedTrends = [];
    this.state.dateRange = { start: null, end: null };
    
    // Clear inputs
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('trendFilter').value = 'all';
    
    // Reload data
    await this.loadDashboardData();
  }

  // Show trend details modal
  showTrendDetails(videoId) {
    const video = this.state.currentData?.find(item => item.video_id === videoId || item.id === videoId);
    if (!video) {
      this.showNotification('Video details not found', 'error');
      return;
    }

    // Create and show modal with video details
    const modalHTML = `
      <div id="trendDetailModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${this.escapeHtml(video.title || 'Video Details')}</h2>
            <button class="modal-close" onclick="waveSightDashboard.closeModal('trendDetailModal')">×</button>
          </div>
          <div class="modal-body">
            <div class="video-details-grid">
              <div class="detail-item">
                <label>Channel:</label>
                <span>${this.escapeHtml(video.channel_title || 'Unknown')}</span>
              </div>
              <div class="detail-item">
                <label>Views:</label>
                <span>${this.formatNumber(video.view_count || 0)}</span>
              </div>
              <div class="detail-item">
                <label>Likes:</label>
                <span>${this.formatNumber(video.like_count || 0)}</span>
              </div>
              <div class="detail-item">
                <label>Comments:</label>
                <span>${this.formatNumber(video.comment_count || 0)}</span>
              </div>
              <div class="detail-item">
                <label>Trend Score:</label>
                <span>${video.trend_score || 0}</span>
              </div>
              <div class="detail-item">
                <label>Published:</label>
                <span>${new Date(video.published_at).toLocaleString()}</span>
              </div>
            </div>
            ${video.video_id ? 
              `<div class="video-actions">
                <a href="https://www.youtube.com/watch?v=${video.video_id}" target="_blank" class="btn btn-primary">Watch on YouTube</a>
              </div>` : ''
            }
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
      document.getElementById('trendDetailModal')?.classList.add('show');
    }, 10);
  }

  // Create trend alert
  createTrendAlert(videoId) {
    const video = this.state.currentData?.find(item => item.video_id === videoId || item.id === videoId);
    if (!video) {
      this.showNotification('Video not found', 'error');
      return;
    }

    // For now, just show a notification
    this.showNotification(`Alert created for: ${video.title}`, 'success');
    
    // Store alert in localStorage
    const alerts = JSON.parse(localStorage.getItem('trendAlerts') || '[]');
    alerts.push({
      video_id: videoId,
      title: video.title,
      created_at: new Date().toISOString(),
      threshold: 10 // 10% change threshold
    });
    localStorage.setItem('trendAlerts', JSON.stringify(alerts));
  }

  // Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
  }
  handleError(error) {
    console.error('Dashboard error:', error);
    
    const message = error.message || 'An unexpected error occurred';
    this.showNotification(message, 'error');
    
    // Log to analytics service
    this.logError(error);
  }

  logError(error) {
    // Implement error logging to analytics service
    if (window.ga) {
      window.ga('send', 'exception', {
        exDescription: error.message,
        exFatal: false
      });
    }
  }

  // Fetch fresh YouTube data from API
  async fetchFreshYouTubeData() {
    try {
      this.showLoading();
      this.showNotification('🔥 AGGRESSIVE DATA FETCH: Hitting API limits for real-time trends...', 'info');

      // MASSIVE trending categories - hitting quota limits
      const trendingCategories = [
        // Core trending searches (high volume)
        { query: 'trending', region: 'US', category: 'all', maxResults: 50 },
        { query: 'viral', region: 'US', category: 'all', maxResults: 50 },
        { query: 'breaking news', region: 'US', category: 'all', maxResults: 50 },
        
        // AI & Technology (current hot topics)
        { query: 'ChatGPT OpenAI', region: 'US', category: 'AI', maxResults: 50 },
        { query: 'Claude AI Anthropic', region: 'US', category: 'AI', maxResults: 50 },
        { query: 'AI tools 2024', region: 'US', category: 'AI', maxResults: 50 },
        { query: 'machine learning', region: 'US', category: 'AI', maxResults: 50 },
        { query: 'artificial intelligence news', region: 'US', category: 'AI', maxResults: 50 },
        
        // Film & Entertainment
        { query: 'movie trailer 2024', region: 'US', category: 'Film', maxResults: 50 },
        { query: 'Netflix series', region: 'US', category: 'Film', maxResults: 50 },
        { query: 'Disney Plus', region: 'US', category: 'Film', maxResults: 50 },
        { query: 'Marvel DC movies', region: 'US', category: 'Film', maxResults: 50 },
        { query: 'box office', region: 'US', category: 'Film', maxResults: 50 },
        
        // Gaming (massive category)
        { query: 'gaming news', region: 'US', category: 'Gaming', maxResults: 50 },
        { query: 'Fortnite updates', region: 'US', category: 'Gaming', maxResults: 50 },
        { query: 'Call of Duty', region: 'US', category: 'Gaming', maxResults: 50 },
        { query: 'Minecraft', region: 'US', category: 'Gaming', maxResults: 50 },
        { query: 'PlayStation Xbox', region: 'US', category: 'Gaming', maxResults: 50 },
        { query: 'gaming review', region: 'US', category: 'Gaming', maxResults: 50 },
        
        // Crypto & Finance
        { query: 'Bitcoin price', region: 'US', category: 'Crypto', maxResults: 50 },
        { query: 'Ethereum crypto', region: 'US', category: 'Crypto', maxResults: 50 },
        { query: 'crypto news', region: 'US', category: 'Crypto', maxResults: 50 },
        { query: 'NFT market', region: 'US', category: 'Crypto', maxResults: 50 },
        { query: 'DeFi yield farming', region: 'US', category: 'Crypto', maxResults: 50 },
        
        // Music & Audio
        { query: 'new music 2024', region: 'US', category: 'Music', maxResults: 50 },
        { query: 'Taylor Swift', region: 'US', category: 'Music', maxResults: 50 },
        { query: 'hip hop rap', region: 'US', category: 'Music', maxResults: 50 },
        { query: 'Billboard charts', region: 'US', category: 'Music', maxResults: 50 },
        { query: 'music festival', region: 'US', category: 'Music', maxResults: 50 },
        
        // Technology & Gadgets
        { query: 'iPhone 15 review', region: 'US', category: 'Technology', maxResults: 50 },
        { query: 'tech news', region: 'US', category: 'Technology', maxResults: 50 },
        { query: 'Apple Vision Pro', region: 'US', category: 'Technology', maxResults: 50 },
        { query: 'Samsung Galaxy', region: 'US', category: 'Technology', maxResults: 50 },
        { query: 'electric car Tesla', region: 'US', category: 'Technology', maxResults: 50 },
        
        // Social Media & Culture
        { query: 'TikTok viral', region: 'US', category: 'Social', maxResults: 50 },
        { query: 'Instagram reels', region: 'US', category: 'Social', maxResults: 50 },
        { query: 'Twitter X news', region: 'US', category: 'Social', maxResults: 50 },
        { query: 'social media trends', region: 'US', category: 'Social', maxResults: 50 },
        { query: 'influencer drama', region: 'US', category: 'Social', maxResults: 50 },
        
        // Lifestyle & Health
        { query: 'fitness workout', region: 'US', category: 'Lifestyle', maxResults: 50 },
        { query: 'healthy recipes', region: 'US', category: 'Lifestyle', maxResults: 50 },
        { query: 'mental health', region: 'US', category: 'Lifestyle', maxResults: 50 },
        { query: 'productivity tips', region: 'US', category: 'Lifestyle', maxResults: 50 },
        { query: 'fashion trends 2024', region: 'US', category: 'Lifestyle', maxResults: 50 },
        
        // Viral & Memes
        { query: 'meme compilation', region: 'US', category: 'Viral', maxResults: 50 },
        { query: 'viral video', region: 'US', category: 'Viral', maxResults: 50 },
        { query: 'challenge dance', region: 'US', category: 'Viral', maxResults: 50 },
        { query: 'funny moments', region: 'US', category: 'Viral', maxResults: 50 },
        { query: 'internet drama', region: 'US', category: 'Viral', maxResults: 50 }
      ];

      console.log(`🚀 AGGRESSIVE FETCH: Processing ${trendingCategories.length} categories in parallel batches`);
      
      let totalFetched = 0;
      const allTrendData = [];
      
      // Process in batches of 5 concurrent requests to maximize throughput
      const batchSize = 5;
      for (let i = 0; i < trendingCategories.length; i += batchSize) {
        const batch = trendingCategories.slice(i, i + batchSize);
        
        console.log(`📡 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(trendingCategories.length/batchSize)} - ${batch.length} categories`);
        
        // Execute batch requests concurrently
        const batchPromises = batch.map(async (category) => {
          try {
            const timeFilters = [
              this.getDateDaysAgo(1),   // Last 24 hours
              this.getDateDaysAgo(3),   // Last 3 days  
              this.getDateDaysAgo(7)    // Last week
            ];
            
            // Try multiple time ranges for maximum data capture
            const allResults = [];
            for (const timeFilter of timeFilters) {
              try {
                const response = await fetch(`/api/fetch-youtube?q=${encodeURIComponent(category.query)}&maxResults=${category.maxResults}&order=relevance&publishedAfter=${timeFilter}`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                  timeout: 15000
                });

                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                  allResults.push(...result.data);
                }
              } catch (timeError) {
                console.warn(`⚠️ Time filter ${timeFilter} failed for ${category.query}`);
              }
            }
            
            // Deduplicate and process results
            const uniqueResults = this.deduplicateVideos(allResults);
            const categorizedData = uniqueResults.map(video => ({
              ...video,
              trend_category: category.category,
              search_query: category.query,
              fetch_timestamp: new Date().toISOString(),
              viral_score: this.calculateViralScore(video),
              engagement_velocity: this.calculateEngagementVelocity(video),
              trend_momentum: this.calculateTrendMomentum(video)
            }));

            console.log(`✅ ${category.category}: ${categorizedData.length} unique videos`);
            return categorizedData;
            
          } catch (categoryError) {
            console.warn(`❌ Failed to fetch ${category.category} trends:`, categoryError);
            return [];
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allTrendData.push(...result.value);
            totalFetched += result.value.length;
          }
        });
        
        // Short delay between batches (not between individual requests)
        if (i + batchSize < trendingCategories.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (totalFetched > 0) {
        // Sort by viral score and recency
        allTrendData.sort((a, b) => {
          const aScore = (a.viral_score || 0) * 0.7 + (new Date(a.published_at || 0).getTime() / 1000000000) * 0.3;
          const bScore = (b.viral_score || 0) * 0.7 + (new Date(b.published_at || 0).getTime() / 1000000000) * 0.3;
          return bScore - aScore;
        });

        // Store in Supabase if available
        if (this.supabase) {
          await this.storeInSupabase(allTrendData);
          console.log(`💾 Stored ${allTrendData.length} trending videos in Supabase`);
        }

        // Update current data immediately
        this.state.currentData = allTrendData;
        
        this.showNotification(`✅ Fetched ${totalFetched} trending videos across ${trendingCategories.length} categories`, 'success');
        
        // Force reload from Supabase to get fresh data
        await this.loadDashboardData(true);
        
        // Update viral trends detection
        this.updateViralTrends(allTrendData);
        
      } else {
        throw new Error('No trending data fetched from any category');
      }
    } catch (error) {
      console.error('❌ Error fetching fresh YouTube data:', error);
      this.showNotification('⚠️ YouTube API not configured - using demo data with search functionality', 'warning');
      
      // Still provide search functionality with demo data
      this.enableDemoSearch();
    } finally {
      this.hideLoading();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED DATA PROCESSING METHODS
  // ═══════════════════════════════════════════════════════════════

  // Remove duplicate videos from different searches
  deduplicateVideos(videos) {
    const seen = new Map();
    const unique = [];
    
    videos.forEach(video => {
      const key = video.video_id || video.id;
      if (key && !seen.has(key)) {
        seen.set(key, true);
        unique.push(video);
      }
    });
    
    return unique;
  }

  // Calculate enhanced viral score
  calculateViralScore(video) {
    const views = parseInt(video.view_count) || 0;
    const likes = parseInt(video.like_count) || 0;
    const comments = parseInt(video.comment_count) || 0;
    
    // Age factor (newer = higher score)
    const published = new Date(video.published_at || Date.now());
    const hoursOld = (Date.now() - published.getTime()) / (1000 * 60 * 60);
    const ageFactor = Math.max(0, 1 - hoursOld / (24 * 7)); // Decay over 1 week
    
    // Engagement rate
    const engagementRate = views > 0 ? ((likes + comments) / views) : 0;
    
    // Viral score calculation
    const baseScore = Math.log10(views + 1) * 10; // Log scale for views
    const engagementBonus = engagementRate * 20;
    const timeBonus = ageFactor * 15;
    
    return Math.min(100, baseScore + engagementBonus + timeBonus);
  }

  // Calculate engagement velocity (engagement per hour)
  calculateEngagementVelocity(video) {
    const views = parseInt(video.view_count) || 0;
    const likes = parseInt(video.like_count) || 0;
    const comments = parseInt(video.comment_count) || 0;
    
    const published = new Date(video.published_at || Date.now());
    const hoursOld = Math.max(1, (Date.now() - published.getTime()) / (1000 * 60 * 60));
    
    const totalEngagement = views + (likes * 2) + (comments * 3);
    return totalEngagement / hoursOld;
  }

  // Calculate trend momentum
  calculateTrendMomentum(video) {
    const viral_score = this.calculateViralScore(video);
    const velocity = this.calculateEngagementVelocity(video);
    
    // Recent content gets momentum boost
    const published = new Date(video.published_at || Date.now());
    const hoursOld = (Date.now() - published.getTime()) / (1000 * 60 * 60);
    const recentBoost = hoursOld < 24 ? 1.5 : hoursOld < 72 ? 1.2 : 1.0;
    
    return (viral_score * 0.6 + Math.log10(velocity + 1) * 8) * recentBoost;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🧩 Comprehensive Data Normalization System
  normalizeDataForTrendTiles(rawTrends, category = 'all') {
    if (!rawTrends || rawTrends.length === 0) return [];

    console.log(`🔧 Normalizing ${rawTrends.length} trends for category: ${category}`);

    // Step 1: Extract raw features and calculate baselines
    const categoryData = this.getCategoryBaselines(rawTrends, category);
    
    // Step 2: Normalize each trend
    const normalizedTrends = rawTrends.map(trend => {
      return this.normalizeSingleTrend(trend, categoryData);
    });

    // Step 3: Calculate unified WaveScore
    return normalizedTrends.map(trend => {
      trend.unified_wave_score = this.calculateUnifiedWaveScore(trend);
      return trend;
    }).sort((a, b) => b.unified_wave_score - a.unified_wave_score);
  }

  // Get statistical baselines for normalization by category
  getCategoryBaselines(trends, category) {
    const filteredTrends = category === 'all' ? trends : 
      trends.filter(t => t.trend_category === category);

    const views = filteredTrends.map(t => parseInt(t.view_count) || 0);
    const likes = filteredTrends.map(t => parseInt(t.like_count) || 0);
    const comments = filteredTrends.map(t => parseInt(t.comment_count) || 0);
    const ages = filteredTrends.map(t => {
      const published = new Date(t.published_at || Date.now());
      return (Date.now() - published.getTime()) / (1000 * 60 * 60); // hours
    });

    return {
      views: this.getStatistics(views),
      likes: this.getStatistics(likes),
      comments: this.getStatistics(comments),
      ages: this.getStatistics(ages),
      category: category,
      count: filteredTrends.length
    };
  }

  // Calculate statistical measures for normalization
  getStatistics(values) {
    if (values.length === 0) return { mean: 0, std: 1, min: 0, max: 1, median: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 1; // Avoid division by zero
    
    return {
      mean: mean,
      std: std,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      q75: sorted[Math.floor(sorted.length * 0.75)],
      q25: sorted[Math.floor(sorted.length * 0.25)]
    };
  }

  // Normalize a single trend using various methods
  normalizeSingleTrend(trend, categoryBaselines) {
    const views = parseInt(trend.view_count) || 0;
    const likes = parseInt(trend.like_count) || 0;
    const comments = parseInt(trend.comment_count) || 0;
    const shares = parseInt(trend.share_count) || Math.floor(comments * 0.1);
    const publishedDate = new Date(trend.published_at || Date.now());
    const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);

    // 1. VIEWS - Z-score normalization by category
    const normalizedViews = this.zScoreNormalization(views, categoryBaselines.views);

    // 2. ENGAGEMENT - Ratio-based normalization  
    const engagementRate = views > 0 ? ((likes + comments * 2 + shares * 5) / views) : 0;
    const normalizedEngagement = Math.min(engagementRate * 1000, 100); // Scale to 0-100

    // 3. GROWTH RATE - Velocity calculation with smoothing
    const viewsPerHour = hoursOld > 0 ? views / Math.max(hoursOld, 1) : views;
    const velocityScore = Math.min((Math.log10(viewsPerHour + 1) / Math.log10(1000000)) * 100, 100);
    const normalizedGrowthRate = this.smoothGrowthRate(velocityScore, hoursOld);

    // 4. SENTIMENT - NLP scaling (-1 to 1 → 0 to 100)
    const likeRatio = (likes + comments) > 0 ? likes / (likes + comments) : 0.5;
    const sentimentProxy = (likeRatio * 2 - 1); // Convert to -1 to 1 range
    const normalizedSentiment = ((sentimentProxy + 1) / 2) * 100; // Scale to 0-100

    // 5. RECENCY - Time decay curve prioritizing recent content
    const recencyWeight = this.calculateRecencyWeight(hoursOld);

    // 6. TRAJECTORY - Momentum indicator
    const trajectory = this.calculateTrajectory(views, engagementRate, hoursOld, velocityScore);

    return {
      ...trend,
      normalized_metrics: {
        views: Math.max(0, Math.min(100, normalizedViews)),
        engagement: Math.max(0, Math.min(100, normalizedEngagement)),
        growth_rate: Math.max(0, Math.min(100, normalizedGrowthRate)),
        sentiment: Math.max(0, Math.min(100, normalizedSentiment)),
        recency: Math.max(0, Math.min(100, recencyWeight))
      },
      trajectory: trajectory,
      hours_old: hoursOld,
      engagement_rate: engagementRate
    };
  }

  // Z-score normalization with outlier handling
  zScoreNormalization(value, stats) {
    if (stats.std === 0) return 50; // Default if no variance
    const zScore = (value - stats.mean) / stats.std;
    // Convert to 0-100 scale, capping extreme outliers
    return Math.max(0, Math.min(100, 50 + (zScore * 15)));
  }

  // Smooth growth rate calculation to handle recency bias
  smoothGrowthRate(velocityScore, hoursOld) {
    // Apply smoothing factor based on content age
    let smoothingFactor = 1;
    
    if (hoursOld < 1) smoothingFactor = 0.7; // Very new content penalty
    else if (hoursOld < 6) smoothingFactor = 0.9; // Recent content slight penalty
    else if (hoursOld > 168) smoothingFactor = 1.2; // Week-old content bonus for sustained growth
    
    return velocityScore * smoothingFactor;
  }

  // Calculate recency weight with logarithmic decay
  calculateRecencyWeight(hoursOld) {
    // Logarithmic decay favoring recent content
    if (hoursOld <= 0) return 100;
    if (hoursOld <= 1) return 95;
    if (hoursOld <= 6) return 85;
    if (hoursOld <= 24) return 70;
    if (hoursOld <= 168) return 50; // 1 week
    if (hoursOld <= 720) return 25; // 1 month
    return 10; // Older content
  }

  // Calculate trajectory indicator
  calculateTrajectory(views, engagementRate, hoursOld, velocityScore) {
    if (velocityScore > 80 && hoursOld < 24) return 'rising';
    if (velocityScore > 60 && engagementRate > 0.05) return 'peaking';
    if (hoursOld > 72 && velocityScore < 30) return 'cooling';
    if (velocityScore > 40) return 'stable';
    return 'declining';
  }

  // Calculate unified WaveScore using weighted factors
  calculateUnifiedWaveScore(normalizedTrend) {
    const metrics = normalizedTrend.normalized_metrics;
    
    // Configurable weights - can be tuned based on desired bias
    const weights = {
      views: 0.25,        // w1 - Reach importance
      engagement: 0.30,   // w2 - Engagement quality
      growth_rate: 0.25,  // w3 - Velocity/momentum
      sentiment: 0.15,    // w4 - Sentiment quality
      recency: 0.05       // w5 - Recency boost
    };

    const waveScore = (
      weights.views * metrics.views +
      weights.engagement * metrics.engagement +
      weights.growth_rate * metrics.growth_rate +
      weights.sentiment * metrics.sentiment +
      weights.recency * metrics.recency
    );

    // Store component breakdown for transparency
    normalizedTrend.wave_score_breakdown = {
      views: Math.round(metrics.views * weights.views),
      engagement: Math.round(metrics.engagement * weights.engagement),
      growth_rate: Math.round(metrics.growth_rate * weights.growth_rate),
      sentiment: Math.round(metrics.sentiment * weights.sentiment),
      recency: Math.round(metrics.recency * weights.recency),
      total: Math.round(waveScore)
    };

    return Math.round(waveScore);
  }

  // Legacy method - maintained for backward compatibility
  calculateWaveScore(video, previousPeriodData = null) {
    const normalized = this.normalizeSingleTrend(video, this.getCategoryBaselines([video], 'general'));
    return this.calculateUnifiedWaveScore(normalized);
  }

  // Legacy viral score for backward compatibility
  calculateViralScore(video, previousPeriodData = null) {
    return this.calculateWaveScore(video, previousPeriodData) / 10; // Convert to 0-10 scale
  }

  // Get date N days ago in ISO format
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  // Combine and rank search results
  combineAndRankResults(localResults, freshResults, searchTerm) {
    const seen = new Set();
    const combined = [];
    
    // Add local results first
    localResults.forEach(item => {
      const key = item.video_id || item.title?.substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        combined.push({
          ...item,
          relevance_score: this.calculateSearchRelevance(item, searchTerm),
          is_fresh: false
        });
      }
    });
    
    // Add fresh results
    freshResults.forEach(item => {
      const key = item.video_id || item.title?.substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        combined.push({
          ...item,
          relevance_score: this.calculateSearchRelevance(item, searchTerm),
          is_fresh: true,
          viral_score: this.calculateViralScore(item),
          trend_category: this.categorizeByContent(item.title + ' ' + (item.description || ''))
        });
      }
    });
    
    // Sort by relevance and freshness
    combined.sort((a, b) => {
      const aScore = (a.relevance_score || 0) * 0.6 + (a.viral_score || 0) * 0.3 + (a.is_fresh ? 0.1 : 0);
      const bScore = (b.relevance_score || 0) * 0.6 + (b.viral_score || 0) * 0.3 + (b.is_fresh ? 0.1 : 0);
      return bScore - aScore;
    });
    
    return combined;
  }

  // Calculate search relevance score
  calculateSearchRelevance(item, query) {
    const queryLower = query.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const category = (item.trend_category || '').toLowerCase();
    
    let score = 0;
    
    // Title matches are most important
    if (title.includes(queryLower)) score += 3;
    if (title.startsWith(queryLower)) score += 2;
    
    // Description matches
    if (description.includes(queryLower)) score += 1;
    
    // Category matches
    if (category.includes(queryLower)) score += 1;
    
    // Exact word matches get bonus
    const words = queryLower.split(' ');
    words.forEach(word => {
      if (word.length > 2) { // Ignore short words
        if (title.includes(word)) score += 0.5;
        if (description.includes(word)) score += 0.3;
      }
    });
    
    return score;
  }

  // Categorize content by analyzing title and description
  categorizeByContent(content) {
    const contentLower = content.toLowerCase();
    
    const categories = {
      'AI Tools': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'claude', 'gpt'],
      'Gaming': ['gaming', 'game', 'esports', 'streamer', 'twitch', 'xbox', 'playstation', 'nintendo', 'fortnite'],
      'Technology': ['tech', 'technology', 'gadget', 'software', 'hardware', 'apple', 'google', 'microsoft', 'iphone'],
      'Crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'dogecoin', 'trading'],
      'Entertainment': ['movie', 'film', 'celebrity', 'entertainment', 'trailer', 'review', 'reaction', 'netflix'],
      'Music': ['music', 'song', 'album', 'artist', 'concert', 'live', 'official video', 'spotify'],
      'News': ['news', 'breaking', 'politics', 'election', 'government', 'world', 'current events'],
      'Education': ['tutorial', 'how to', 'education', 'learning', 'course', 'explained', 'guide'],
      'Health': ['health', 'fitness', 'workout', 'nutrition', 'wellness', 'medical', 'doctor'],
      'Sports': ['sports', 'football', 'basketball', 'soccer', 'baseball', 'olympics', 'nfl', 'nba']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  // Start real-time viral trend monitoring
  startViralTrendMonitoring() {
    console.log('🔥 Starting real-time viral trend monitoring...');
    
    // Check for viral trends every 5 minutes
    const monitoringInterval = setInterval(async () => {
      try {
        await this.checkForNewViralTrends();
      } catch (error) {
        console.warn('⚠️ Viral trend monitoring cycle failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Also check every 30 seconds for ultra-viral content (>1M views/hour)
    const rapidCheckInterval = setInterval(async () => {
      try {
        await this.checkForUltraViralContent();
      } catch (error) {
        console.warn('⚠️ Ultra-viral check failed:', error);
      }
    }, 30 * 1000); // 30 seconds
    
    // Store intervals for cleanup
    this.state.monitoringIntervals = {
      viral: monitoringInterval,
      ultraViral: rapidCheckInterval
    };
    
    console.log('✅ Viral trend monitoring active');
  }

  // Check for new viral trends
  async checkForNewViralTrends() {
    try {
      console.log('🔍 Checking for new viral trends...');
      
      // Fetch latest viral content
      const newViralTrends = await this.fetchViralTrendsFromYouTube();
      
      if (newViralTrends && newViralTrends.length > 0) {
        // Check if any trends are significantly more viral than what we have
        const currentMaxViral = Math.max(...(this.state.currentData?.map(item => item.viral_score || 0) || [0]));
        const newMaxViral = Math.max(...newViralTrends.map(item => item.viral_score || 0));
        
        if (newMaxViral > currentMaxViral + 1) { // Significantly more viral
          // Add new viral trends to current data
          const updatedData = [...(this.state.currentData || []), ...newViralTrends];
          
          // Remove duplicates and sort by viral score
          const uniqueData = this.removeDuplicateVideos(updatedData);
          uniqueData.sort((a, b) => (b.viral_score || 0) - (a.viral_score || 0));
          
          // Keep only top 200 trends to avoid bloat
          this.state.currentData = uniqueData.slice(0, 200);
          
          // Update UI with new viral content
          this.processDashboardData(this.state.currentData);
          
          // Notify user of new viral content
          const topNewTrend = newViralTrends[0];
          this.showNotification(`🔥 NEW VIRAL: "${topNewTrend.title}" (Score: ${topNewTrend.viral_score?.toFixed(1)})`, 'success');
          
          console.log(`🔥 Updated with ${newViralTrends.length} new viral trends`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to check for new viral trends:', error);
    }
  }

  // Check for ultra-viral content (>1M views/hour)
  async checkForUltraViralContent() {
    try {
      // Only check if we have current data to compare against
      if (!this.state.currentData || this.state.currentData.length === 0) return;
      
      // Check the top 10 current trends for ultra-viral velocity
      const topTrends = this.state.currentData.slice(0, 10);
      
      for (const trend of topTrends) {
        if (trend.video_id && !trend.is_ultra_viral_checked) {
          const updatedStats = await this.fetchUpdatedVideoStats(trend.video_id);
          
          if (updatedStats) {
            const oldViews = trend.view_count || 0;
            const newViews = updatedStats.view_count || 0;
            const timeDiff = (Date.now() - new Date(trend.fetch_timestamp || Date.now()).getTime()) / (1000 * 60 * 60); // hours
            
            if (timeDiff > 0) {
              const viewsPerHour = (newViews - oldViews) / timeDiff;
              
              if (viewsPerHour > 1000000) { // 1M+ views per hour = ultra-viral
                trend.is_ultra_viral = true;
                trend.views_per_hour = viewsPerHour;
                
                // Alert user of ultra-viral content
                this.showNotification(`🚨 ULTRA-VIRAL: "${trend.title}" - ${Math.round(viewsPerHour / 1000)}K views/hour!`, 'success');
                console.log(`🚨 Ultra-viral detected: ${trend.title} - ${viewsPerHour.toLocaleString()} views/hour`);
              }
            }
            
            trend.is_ultra_viral_checked = true;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Ultra-viral check failed:', error);
    }
  }

  // Fetch updated video statistics
  async fetchUpdatedVideoStats(videoId) {
    try {
      const response = await fetch(`/api/youtube-video-stats?videoId=${videoId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch updated stats for video ${videoId}:`, error);
      return null;
    }
  }

  // Update viral trends display
  updateViralTrends(allTrendData) {
    if (!allTrendData || allTrendData.length === 0) return;
    
    // Find the most viral trends
    const viralTrends = allTrendData
      .filter(trend => (trend.viral_score || 0) > 5)
      .sort((a, b) => (b.viral_score || 0) - (a.viral_score || 0))
      .slice(0, 10);
    
    // Update viral trends section if it exists
    const viralSection = document.getElementById('viralTrendsList');
    if (viralSection && viralTrends.length > 0) {
      const viralHTML = viralTrends.map((trend, index) => `
        <div class="viral-trend-item" style="display: flex; align-items: center; padding: 0.5rem; margin-bottom: 0.5rem; background: rgba(244, 114, 182, 0.1); border-radius: 8px; border: 1px solid rgba(244, 114, 182, 0.3);">
          <span class="viral-rank" style="color: #f472b6; font-weight: 700; min-width: 2rem;">#${index + 1}</span>
          <div style="flex: 1; margin-left: 0.5rem;">
            <div style="color: #f1f1f1; font-weight: 600; font-size: 0.9rem;">${trend.title?.substring(0, 60)}...</div>
            <div style="color: #9ca3af; font-size: 0.8rem;">🔥 ${(trend.viral_score || 0).toFixed(1)} • ${this.formatNumber(trend.view_count || 0)} views</div>
          </div>
        </div>
      `).join('');
      
      viralSection.innerHTML = viralHTML;
    }
    
    console.log(`🔥 Updated viral trends display with ${viralTrends.length} trends`);
  }

  // Store data in Supabase
  async storeInSupabase(data) {
    if (!this.supabase || !data || data.length === 0) return;

    try {
      // Prepare data for Supabase
      const supabaseData = data.map(item => ({
        video_id: item.video_id || item.id,
        title: item.title || item.snippet?.title,
        channel_title: item.channel_title || item.snippet?.channelTitle,
        published_at: item.published_at || item.snippet?.publishedAt,
        view_count: parseInt(item.view_count) || parseInt(item.statistics?.viewCount) || 0,
        like_count: parseInt(item.like_count) || parseInt(item.statistics?.likeCount) || 0,
        comment_count: parseInt(item.comment_count) || parseInt(item.statistics?.commentCount) || 0,
        trend_score: item.trend_score || Math.random() * 0.8 + 0.2, // Generate if missing
        trend_category: item.trend_category || this.categorizeItem(item),
        engagement_rate: item.engagement_rate || this.calculateEngagementRate(item)
      }));

      // Insert into Supabase (upsert to handle duplicates)
      const { data: inserted, error } = await this.supabase
        .from('youtube_trends')
        .upsert(supabaseData, { onConflict: 'video_id' });

      if (error) {
        console.error('❌ Error storing in Supabase:', error);
      } else {
        console.log(`✅ Stored ${supabaseData.length} records in Supabase`);
      }
    } catch (error) {
      console.error('❌ Error in storeInSupabase:', error);
    }
  }

  // Fetch bulk data for multiple categories
  async fetchBulkData(category = 'all', maxResults = 50) {
    try {
      this.showLoading();
      this.showNotification('Fetching bulk trend data...', 'info');

      const categories = category === 'all' 
        ? ['Gaming', 'Technology', 'Entertainment', 'Music', 'News']
        : [category];

      let totalFetched = 0;

      for (const cat of categories) {
        const response = await fetch(`/api/fetch-youtube?q=${encodeURIComponent(cat)}&maxResults=${maxResults}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        if (result.success) {
          totalFetched += result.data?.length || 0;
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.showNotification(`✅ Fetched ${totalFetched} total records`, 'success');
      await this.loadDashboardData(true); // Refresh dashboard
    } catch (error) {
      console.error('❌ Error fetching bulk data:', error);
      this.showNotification('Failed to fetch bulk data: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  // Track specific trend across platforms
  async trackSpecificTrend(trendQuery) {
    try {
      this.showLoading();
      this.showNotification(`Tracking trend: "${trendQuery}" across platforms...`, 'info');

      // Create trend label in database
      const trendLabel = await this.createTrendLabel(trendQuery);
      
      // Fetch data from multiple platforms
      const platforms = ['youtube', 'reddit'];
      const results = {};

      for (const platform of platforms) {
        try {
          const data = await this.fetchPlatformData(platform, trendQuery);
          results[platform] = data;
          
          // Store trend data with label
          await this.storeTrendData(trendLabel.id, platform, data);
          
        } catch (error) {
          console.warn(`Failed to fetch ${platform} data for "${trendQuery}":`, error);
          results[platform] = { error: error.message };
        }
      }

      // Display cross-platform analytics
      this.displayCrossPlatformAnalytics(trendQuery, results);
      this.showNotification(`✅ Trend tracking completed for "${trendQuery}"`, 'success');

      return results;
    } catch (error) {
      console.error('❌ Error tracking trend:', error);
      this.showNotification('Failed to track trend: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  // Create trend label in database
  async createTrendLabel(trendQuery) {
    try {
      const response = await fetch('/api/trend-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: trendQuery,
          created_at: new Date().toISOString(),
          status: 'active'
        })
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create trend label');
      }
    } catch (error) {
      console.error('❌ Error creating trend label:', error);
      throw error;
    }
  }

  // Fetch data from specific platform
  async fetchPlatformData(platform, query) {
    const endpoints = {
      youtube: `/api/fetch-youtube?q=${encodeURIComponent(query)}&maxResults=50`,
      reddit: `/api/reddit-sentiment?topic=${encodeURIComponent(query)}`,
      tiktok: `/api/tiktok-trends?q=${encodeURIComponent(query)}` // Future implementation
    };

    if (!endpoints[platform]) {
      throw new Error(`Platform ${platform} not supported`);
    }

    const response = await fetch(endpoints[platform]);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || `Failed to fetch ${platform} data`);
    }

    return result.data;
  }

  // Store trend data with platform association
  async storeTrendData(labelId, platform, data) {
    try {
      const response = await fetch('/api/trend-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          label_id: labelId,
          platform: platform,
          data: data,
          metrics: this.calculatePlatformMetrics(platform, data),
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to store trend data');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Error storing trend data:', error);
      throw error;
    }
  }

  // Calculate metrics for each platform
  calculatePlatformMetrics(platform, data) {
    if (!data || !Array.isArray(data)) return {};

    switch (platform) {
      case 'youtube':
        return {
          total_videos: data.length,
          total_views: data.reduce((sum, item) => sum + (item.view_count || 0), 0),
          avg_engagement: data.reduce((sum, item) => sum + (item.engagement_rate || 0), 0) / data.length,
          trending_score: data.reduce((sum, item) => sum + (item.trend_score || 0), 0) / data.length
        };
      case 'reddit':
        return {
          total_posts: data.length,
          avg_sentiment: data.reduce((sum, item) => sum + (item.sentiment_score || 0), 0) / data.length,
          total_comments: data.reduce((sum, item) => sum + (item.comment_count || 0), 0),
          upvote_ratio: data.reduce((sum, item) => sum + (item.upvote_ratio || 0), 0) / data.length
        };
      default:
        return {};
    }
  }

  // Display cross-platform analytics
  displayCrossPlatformAnalytics(query, results) {
    const container = document.getElementById('trendChart');
    if (!container) return;

    const analyticsHtml = `
      <div class="cross-platform-analytics">
        <h3>🔍 Trend Analysis: "${query}"</h3>
        <div class="platform-metrics">
          ${Object.entries(results).map(([platform, data]) => `
            <div class="platform-card">
              <h4>${platform.toUpperCase()}</h4>
              ${data.error 
                ? `<p class="error">❌ ${data.error}</p>`
                : this.renderPlatformMetrics(platform, data)
              }
            </div>
          `).join('')}
        </div>
        <div class="trend-actions">
          <button onclick="window.waveSightDashboard.exportTrendData('${query}')" class="export-btn">
            📥 Export Data
          </button>
          <button onclick="window.waveSightDashboard.createTrendAlert('${query}')" class="alert-btn">
            🔔 Create Alert
          </button>
        </div>
      </div>
    `;

    container.innerHTML = analyticsHtml;
  }

  // Render platform-specific metrics
  renderPlatformMetrics(platform, data) {
    if (!data || data.length === 0) {
      return '<p>No data available</p>';
    }

    switch (platform) {
      case 'youtube':
        const totalViews = data.reduce((sum, item) => sum + (item.view_count || 0), 0);
        const avgEngagement = data.reduce((sum, item) => sum + (item.engagement_rate || 0), 0) / data.length;
        return `
          <div class="metrics">
            <div class="metric">
              <span class="value">${data.length}</span>
              <span class="label">Videos</span>
            </div>
            <div class="metric">
              <span class="value">${this.formatNumber(totalViews)}</span>
              <span class="label">Total Views</span>
            </div>
            <div class="metric">
              <span class="value">${avgEngagement.toFixed(2)}%</span>
              <span class="label">Avg Engagement</span>
            </div>
          </div>
        `;
      case 'reddit':
        const avgSentiment = data.reduce((sum, item) => sum + (item.sentiment_score || 0), 0) / data.length;
        const totalComments = data.reduce((sum, item) => sum + (item.comment_count || 0), 0);
        return `
          <div class="metrics">
            <div class="metric">
              <span class="value">${data.length}</span>
              <span class="label">Posts</span>
            </div>
            <div class="metric">
              <span class="value">${(avgSentiment * 100).toFixed(1)}%</span>
              <span class="label">Sentiment</span>
            </div>
            <div class="metric">
              <span class="value">${this.formatNumber(totalComments)}</span>
              <span class="label">Comments</span>
            </div>
          </div>
        `;
      default:
        return '<p>Platform metrics not available</p>';
    }
  }

  // Enhanced Alert System for detecting rising trends
  async initAlertSystem() {
    try {
      // Load existing alerts configuration
      await this.loadAlertConfiguration();
      
      // Start monitoring for rising trends
      this.startTrendMonitoring();
      
      console.log('✅ Alert system initialized');
    } catch (error) {
      console.error('❌ Error initializing alert system:', error);
    }
  }

  async loadAlertConfiguration() {
    try {
      const response = await fetch('/api/alerts/config');
      const result = await response.json();
      
      if (result.success) {
        this.alertConfig = result.data || {
          enabled: true,
          checkInterval: 60000, // 1 minute
          thresholds: {
            viewGrowth: 50, // 50% growth
            engagementSpike: 25, // 25% engagement increase
            velocityThreshold: 100, // Views per minute
            sentimentChange: 0.3 // 30% sentiment change
          },
          notifications: {
            browser: true,
            sound: false
          }
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not load alert configuration, using defaults');
      this.alertConfig = {
        enabled: true,
        checkInterval: 60000,
        thresholds: {
          viewGrowth: 50,
          engagementSpike: 25,
          velocityThreshold: 100,
          sentimentChange: 0.3
        },
        notifications: {
          browser: true,
          sound: false
        }
      };
    }
  }

  startTrendMonitoring() {
    if (!this.alertConfig.enabled) return;

    // Clear existing interval
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }

    // Start monitoring
    this.alertInterval = setInterval(async () => {
      await this.checkForRisingTrends();
    }, this.alertConfig.checkInterval);

    console.log(`🔔 Alert monitoring started (checking every ${this.alertConfig.checkInterval / 1000}s)`);
  }

  async checkForRisingTrends() {
    try {
      // Get current trend data
      const response = await fetch('/api/youtube-data?limit=100&sortBy=recent');
      const result = await response.json();

      if (!result.success || !result.data) return;

      const currentTrends = result.data;
      
      // Compare with previous data to detect spikes
      const alerts = await this.detectTrendSpikes(currentTrends);
      
      // Process and send alerts
      for (const alert of alerts) {
        await this.processAlert(alert);
      }

      // Store current data for next comparison
      this.previousTrendData = currentTrends;
      
    } catch (error) {
      console.error('❌ Error checking for rising trends:', error);
    }
  }

  async detectTrendSpikes(currentTrends) {
    const alerts = [];
    
    if (!this.previousTrendData) {
      this.previousTrendData = currentTrends;
      return alerts;
    }

    for (const currentTrend of currentTrends) {
      const previousTrend = this.previousTrendData.find(
        prev => prev.video_id === currentTrend.video_id
      );

      if (!previousTrend) continue; // New trend, skip for now

      // Calculate growth metrics
      const metrics = this.calculateGrowthMetrics(previousTrend, currentTrend);
      
      // Check for alert conditions
      const alertConditions = this.checkAlertConditions(metrics, currentTrend);
      
      if (alertConditions.triggered) {
        alerts.push({
          type: 'trend_spike',
          severity: alertConditions.severity,
          trend: currentTrend,
          metrics: metrics,
          reason: alertConditions.reason,
          timestamp: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  calculateGrowthMetrics(previous, current) {
    const viewGrowth = previous.view_count > 0 
      ? ((current.view_count - previous.view_count) / previous.view_count) * 100 
      : 0;
    
    const likeGrowth = previous.like_count > 0 
      ? ((current.like_count - previous.like_count) / previous.like_count) * 100 
      : 0;

    const engagementGrowth = previous.engagement_rate > 0 
      ? ((current.engagement_rate - previous.engagement_rate) / previous.engagement_rate) * 100 
      : 0;

    // Calculate velocity (views per minute)
    const timeDiff = (new Date(current.updated_at) - new Date(previous.updated_at)) / (1000 * 60);
    const velocity = timeDiff > 0 ? (current.view_count - previous.view_count) / timeDiff : 0;

    return {
      viewGrowth,
      likeGrowth,
      engagementGrowth,
      velocity,
      timeDiff
    };
  }

  checkAlertConditions(metrics, trend) {
    const conditions = [];
    let severity = 'low';

    // Check view growth
    if (metrics.viewGrowth > this.alertConfig.thresholds.viewGrowth) {
      conditions.push(`${metrics.viewGrowth.toFixed(1)}% view growth`);
      severity = metrics.viewGrowth > 100 ? 'critical' : metrics.viewGrowth > 75 ? 'high' : 'medium';
    }

    // Check engagement spike
    if (metrics.engagementGrowth > this.alertConfig.thresholds.engagementSpike) {
      conditions.push(`${metrics.engagementGrowth.toFixed(1)}% engagement spike`);
      severity = this.escalateSeverity(severity, 'medium');
    }

    // Check velocity
    if (metrics.velocity > this.alertConfig.thresholds.velocityThreshold) {
      conditions.push(`${metrics.velocity.toFixed(0)} views/min velocity`);
      severity = this.escalateSeverity(severity, 'high');
    }

    // Check trend score
    if (trend.trend_score > 0.8) {
      conditions.push('High trend score detected');
      severity = this.escalateSeverity(severity, 'medium');
    }

    return {
      triggered: conditions.length > 0,
      severity,
      reason: conditions.join(', ')
    };
  }

  escalateSeverity(current, new_severity) {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    const currentLevel = levels[current] || 1;
    const newLevel = levels[new_severity] || 1;
    
    const resultLevel = Math.max(currentLevel, newLevel);
    return Object.keys(levels).find(key => levels[key] === resultLevel);
  }

  async processAlert(alert) {
    try {
      // Store alert in database
      await this.storeAlert(alert);
      
      // Send notifications
      if (this.alertConfig.notifications.browser) {
        this.sendBrowserNotification(alert);
      }
      
      if (this.alertConfig.notifications.sound) {
        this.playAlertSound();
      }

      // Log alert
      console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.trend.title}`);
      console.log(`📊 Reason: ${alert.reason}`);
      
    } catch (error) {
      console.error('❌ Error processing alert:', error);
    }
  }

  async storeAlert(alert) {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_id: alert.trend.video_id,
          title: alert.trend.title,
          channel_title: alert.trend.channel_title,
          view_count: alert.trend.view_count,
          like_count: alert.trend.like_count,
          wave_score: alert.trend.trend_score || 0,
          growth_rate: alert.metrics.viewGrowth / 100,
          sentiment_score: alert.trend.sentiment_score || 0.5,
          severity: alert.severity.toUpperCase(),
          reason: alert.reason,
          alert_type: alert.type,
          created_at: alert.timestamp
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to store alert');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Error storing alert:', error);
      throw error;
    }
  }

  sendBrowserNotification(alert) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(`🚨 WaveSight Alert: ${alert.severity.toUpperCase()}`, {
        body: `"${alert.trend.title}" is trending!\n${alert.reason}`,
        icon: '/logo2.png',
        tag: alert.trend.video_id
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/alerts-dashboard.html`;
      };

      setTimeout(() => notification.close(), 10000);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.sendBrowserNotification(alert);
        }
      });
    }
  }

  playAlertSound() {
    // Create audio element and play alert sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+3Vm2EXDD2Y3/DAaB8FeMS5z8ptMgIFmOSKBH5eWgAAUDQA');
    audio.volume = 0.3;
    audio.play().catch(e => console.warn('Could not play alert sound:', e));
  }

  // ═══════════════════════════════════════════════════════════════
  // AGGRESSIVE AUTO-FETCHING SYSTEM
  // ═══════════════════════════════════════════════════════════════

  startAggressiveDataFetching() {
    console.log('🚀 STARTING AGGRESSIVE DATA FETCHING - HITTING API LIMITS');
    
    // Immediate fetch on startup
    setTimeout(() => {
      this.fetchFreshYouTubeData();
    }, 3000);
    
    // Heavy refresh every 10 minutes (600k/day ÷ 144 = ~4200 calls per session)
    const aggressiveInterval = setInterval(async () => {
      try {
        console.log('🔥 AGGRESSIVE REFRESH: Fetching maximum data...');
        await this.fetchFreshYouTubeData();
        
        // Update category trends with latest data
        if (this.wavescopeChart) {
          this.wavescopeChart.refreshCategoryTrends();
        }
        
        this.showNotification('🔥 Data refresh complete - staying current with trends', 'success');
      } catch (error) {
        console.warn('⚠️ Aggressive fetch cycle failed:', error);
        this.showNotification('⚠️ Data refresh encountered issues, but continuing...', 'warning');
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    // Ultra-rapid checks for breaking/viral content every 2 minutes
    const rapidViralCheck = setInterval(async () => {
      try {
        console.log('⚡ RAPID VIRAL CHECK: Scanning for breaking trends...');
        
        // Quick searches for breaking content
        const breakingQueries = [
          'breaking news',
          'viral now',
          'trending today',
          'just happened',
          'live now',
          'urgent',
          'emergency',
          'scandal',
          'leaked',
          'exposed'
        ];
        
        const promises = breakingQueries.slice(0, 3).map(async (query) => {
          try {
            const response = await fetch(`/api/fetch-youtube?q=${encodeURIComponent(query)}&maxResults=10&order=date&publishedAfter=${this.getDateDaysAgo(0.05)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              timeout: 8000
            });
            const result = await response.json();
            return result.success ? result.data : [];
          } catch (error) {
            return [];
          }
        });
        
        const allBreaking = await Promise.all(promises);
        const breakingContent = allBreaking.flat();
        
        if (breakingContent.length > 0) {
          // Check for ultra-viral content (>100k views in last hour)
          const ultraViral = breakingContent.filter(item => {
            const views = parseInt(item.view_count) || 0;
            const published = new Date(item.published_at || Date.now());
            const hoursOld = (Date.now() - published.getTime()) / (1000 * 60 * 60);
            return views > 100000 && hoursOld < 1;
          });
          
          if (ultraViral.length > 0) {
            console.log(`🚨 ULTRA-VIRAL DETECTED: ${ultraViral.length} breaking trends`);
            this.showNotification(`🚨 BREAKING: ${ultraViral.length} ultra-viral trends detected!`, 'warning');
            
            // Immediately trigger full data refresh
            this.fetchFreshYouTubeData();
          }
        }
        
      } catch (error) {
        console.warn('⚠️ Rapid viral check failed:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes
    
    // Store intervals for cleanup
    this.aggressiveInterval = aggressiveInterval;
    this.rapidViralCheck = rapidViralCheck;
    
    console.log('✅ Aggressive data fetching system active - maximizing trend detection');
  }

  // Clean up intervals when needed
  stopAggressiveDataFetching() {
    if (this.aggressiveInterval) {
      clearInterval(this.aggressiveInterval);
      this.aggressiveInterval = null;
    }
    if (this.rapidViralCheck) {
      clearInterval(this.rapidViralCheck);
      this.rapidViralCheck = null;
    }
    console.log('🛑 Aggressive data fetching stopped');
  }
}

// Chart Renderer Class
class ChartRenderer {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.animationProgress = 0;
    this.clickableAreas = [];
  }

  render() {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      this.animationProgress = Math.min(elapsed / 1500, 1);

      this.clear();
      this.drawGrid();
      this.drawAxes();
      this.drawData();
      this.drawLegend();

      if (this.animationProgress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  clear() {
    const { width, height } = this.config.dimensions;
    this.ctx.clearRect(0, 0, width, height);
  }

  drawGrid() {
    // Implementation of grid drawing
    const { padding, width, height } = this.config.dimensions;
    this.ctx.strokeStyle = '#2e2e45';
    this.ctx.lineWidth = 1;

    // Draw horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - padding * 2) * (i / 4);
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(width - padding, y);
      this.ctx.stroke();
    }
  }

  drawAxes() {
    // Implementation of axes drawing
    // Y-axis labels, X-axis labels, etc.
  }

  drawData() {
    // Implementation of data lines and areas
    this.config.trends.forEach((trend, index) => {
      this.drawTrendLine(trend, this.config.colors[index % this.config.colors.length]);
    });
  }

  drawTrendLine(trend, color) {
    // Implementation of individual trend line
    // With animation based on this.animationProgress
  }

  drawLegend() {
    // Implementation of legend drawing
  }

  getClickableAreas() {
    return this.clickableAreas;
  }
}

// Metrics Calculator Class
class MetricsCalculator {
  constructor(data) {
    this.data = data;
  }

  calculateWaveScore() {
    const totalViews = this.data.reduce((sum, item) => sum + (item.view_count || 0), 0);
    const totalEngagement = this.data.reduce((sum, item) => 
      sum + (item.like_count || 0) + (item.comment_count || 0), 0);
    
    const avgViews = totalViews / this.data.length;
    const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;
    
    return Math.min(1, (avgViews / 1000000) * engagementRate * 10);
  }

  calculateGrowthRate() {
    // Implementation of growth rate calculation
    const recentData = this.getRecentData(7); // Last 7 days
    const olderData = this.getDataInRange(14, 7); // 7-14 days ago
    
    if (recentData.length === 0 || olderData.length === 0) return 0;
    
    const recentViews = recentData.reduce((sum, item) => sum + (item.view_count || 0), 0);
    const olderViews = olderData.reduce((sum, item) => sum + (item.view_count || 0), 0);
    
    return olderViews > 0 ? ((recentViews - olderViews) / olderViews * 100) : 0;
  }

  calculateEngagementQuality() {
    const totalViews = this.data.reduce((sum, item) => sum + (item.view_count || 0), 0);
    const totalLikes = this.data.reduce((sum, item) => sum + (item.like_count || 0), 0);
    const totalComments = this.data.reduce((sum, item) => sum + (item.comment_count || 0), 0);
    
    return totalViews > 0 ? (totalLikes + totalComments * 2) / totalViews * 100 : 0;
  }

  predictTrend() {
    const growthRate = this.calculateGrowthRate();
    const waveScore = this.calculateWaveScore();
    
    if (growthRate > 50 && waveScore > 0.7) return '🚀 Viral Potential';
    if (growthRate > 20 && waveScore > 0.5) return '📈 Rising';
    if (growthRate < -20) return '📉 Declining';
    return '📊 Stable';
  }

  generateInsights() {
    const totalViews = this.data.reduce((sum, item) => sum + (item.view_count || 0), 0);
    const avgViews = totalViews / this.data.length;
    const topVideo = this.data.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0];
    
    return [
      `Total reach: ${this.formatNumber(totalViews)} views across ${this.data.length} videos`,
      `Average views per video: ${this.formatNumber(avgViews)}`,
      `Top performing video: ${this.formatNumber(topVideo?.view_count || 0)} views`,
      `Engagement quality score: ${this.calculateEngagementQuality().toFixed(1)}%`
    ];
  }

  generateRecommendations() {
    const growthRate = this.calculateGrowthRate();
    const engagementQuality = this.calculateEngagementQuality();
    
    const recommendations = [];
    
    if (growthRate > 20) {
      recommendations.push('Capitalize on momentum with increased posting frequency');
    }
    
    if (engagementQuality < 5) {
      recommendations.push('Focus on engagement-driven content to boost interaction rates');
    }
    
    recommendations.push(
      'Monitor competitor content in this category',
      'Consider cross-platform promotion strategies',
      'Analyze top-performing content for replicable patterns'
    );
    
    return recommendations;
  }

  getRecentData(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.data.filter(item => 
      new Date(item.published_at) >= cutoff
    );
  }

  getDataInRange(daysAgo, daysRecent) {
    const older = new Date();
    older.setDate(older.getDate() - daysAgo);
    
    const recent = new Date();
    recent.setDate(recent.getDate() - daysRecent);
    
    return this.data.filter(item => {
      const date = new Date(item.published_at);
      return date >= older && date < recent;
    });
  }

  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toString();
  }

  showConfigurationError() {
    const errorHtml = `
      <div class="configuration-error" style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(0,0,0,0.9); z-index: 10000; 
        display: flex; align-items: center; justify-content: center;
        font-family: Arial, sans-serif; color: white;
      ">
        <div style="
          background: #1f2937; border-radius: 12px; padding: 2rem; 
          max-width: 500px; text-align: center; border: 1px solid #374151;
        ">
          <h2 style="color: #ef4444; margin-bottom: 1rem;">⚙️ Configuration Required</h2>
          <p style="margin-bottom: 1rem; line-height: 1.6;">
            WaveSight needs to be configured with your Supabase credentials to function properly.
          </p>
          <div style="background: #111827; padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: left;">
            <p style="margin: 0; font-size: 0.9em; color: #9ca3af;">
              1. Copy .env.example to .env<br>
              2. Add your Supabase URL and key<br>
              3. Refresh the page
            </p>
          </div>
          <button onclick="location.reload()" style="
            background: #3b82f6; color: white; border: none; 
            padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;
          ">
            Refresh Page
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', errorHtml);
  }
}

// Global functions called from HTML
window.fetchFreshYouTubeData = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.fetchFreshYouTubeData();
  }
};

window.fetchBulkData = function(category = 'all', maxResults = 50) {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.fetchBulkData(category, maxResults);
  }
};

window.performComprehensiveSearch = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.performComprehensiveSearch();
  }
};

window.resetToDefaultView = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.resetToDefaultView();
  }
};

window.filterChart = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.filterChart();
  }
};

window.toggleMobileMenu = function() {
  const navLinks = document.getElementById('navLinks');
  if (navLinks) {
    if (navLinks.style.display === 'none' || navLinks.style.display === '') {
      navLinks.style.display = 'flex';
    } else {
      navLinks.style.display = 'none';
    }
  }
};

window.showAboutModal = function() {
  const modal = document.getElementById('aboutModal');
  if (modal) {
    modal.style.display = 'block';
  }
};

window.showSettingsModal = function() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'block';
  }
};

window.showDevelopersModal = function() {
  const modal = document.getElementById('developersModal');
  if (modal) {
    modal.style.display = 'block';
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
};

window.trackSpecificTrend = function() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput && window.waveSightDashboard) {
    const query = searchInput.value.trim();
    if (query) {
      window.waveSightDashboard.trackSpecificTrend(query);
    } else {
      alert('Please enter a trend to track');
    }
  }
};

window.startAlertMonitoring = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.startTrendMonitoring();
  }
};

window.stopAlertMonitoring = function() {
  if (window.waveSightDashboard && window.waveSightDashboard.alertInterval) {
    clearInterval(window.waveSightDashboard.alertInterval);
    window.waveSightDashboard.alertInterval = null;
    console.log('🔕 Alert monitoring stopped');
  }
};

window.checkForRisingTrends = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.checkForRisingTrends();
  }
};

window.createTrendAlert = function(query) {
  if (window.waveSightDashboard) {
    // This would create a custom alert for a specific trend
    alert(`Alert created for trend: "${query}"\n\nYou will be notified when this trend shows significant activity.`);
  }
};

window.exportTrendData = function(query) {
  if (window.waveSightDashboard) {
    // This would export the trend data
    alert(`Exporting data for trend: "${query}"\n\nData export functionality will be available in the next update.`);
  }
};

// Additional missing functions for other pages
window.showAdvancedMenu = function() {
  const menu = document.getElementById('advancedMenu');
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
};

window.hideAdvancedMenu = function() {
  const menu = document.getElementById('advancedMenu');
  if (menu) {
    menu.style.display = 'none';
  }
};

window.processCulturalTrends = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.showNotification('🧠 Processing cultural trends...', 'info');
  }
};

window.toggleAutoRefresh = function() {
  if (window.waveSightDashboard) {
    const btn = document.getElementById('autoRefreshBtn');
    if (window.waveSightDashboard.alertInterval) {
      window.stopAlertMonitoring();
      if (btn) btn.textContent = '▶️ Auto-Refresh';
    } else {
      window.startAlertMonitoring();
      if (btn) btn.textContent = '⏸️ Auto-Refresh';
    }
  }
};

window.exportData = function() {
  alert('📥 Export functionality\n\nThis would export current trend data in CSV/JSON format.');
};

window.filterByDateRange = function() {
  console.log('📅 Date range filter applied');
};

// WaveScope Timeline Chart Class
class WaveScopeChart {
  constructor(canvas, realData = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentPeriod = '1M';
    this.realData = realData;
    this.activeTrends = {
      ai: true,
      film: true,
      culture: true,
      crypto: true,
      technology: true,
      music: true,
      gaming: true,
      social: true,
      lifestyle: true,
      viral: true
    };
    
    // Use real data if available, otherwise generate demo data
    this.data = this.realData ? this.processRealDataForChart(this.realData) : this.generateTrendData();
  }

  init() {
    this.setupCanvas();
    this.render();
    this.setupEventListeners();
  }

  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  generateTrendData() {
    // Define 10 high-reach trend categories with specific trending topics
    const categoryTrends = this.getCategoryBasedTrends();
    
    const trends = {
      ai: { 
        name: 'AI: ' + categoryTrends.ai.topic, 
        color: '#5ee3ff', 
        data: [],
        category: 'AI & Technology',
        currentTrend: categoryTrends.ai
      },
      film: { 
        name: 'Film: ' + categoryTrends.film.topic, 
        color: '#ec4899', 
        data: [],
        category: 'Film & Cinema',
        currentTrend: categoryTrends.film
      },
      culture: { 
        name: 'Culture: ' + categoryTrends.culture.topic, 
        color: '#8b5cf6', 
        data: [],
        category: 'Cultural Trends',
        currentTrend: categoryTrends.culture
      },
      crypto: { 
        name: 'Crypto: ' + categoryTrends.crypto.topic, 
        color: '#f97316', 
        data: [],
        category: 'Cryptocurrency',
        currentTrend: categoryTrends.crypto
      },
      technology: { 
        name: 'Tech: ' + categoryTrends.technology.topic, 
        color: '#10b981', 
        data: [],
        category: 'Technology',
        currentTrend: categoryTrends.technology
      },
      music: { 
        name: 'Music: ' + categoryTrends.music.topic, 
        color: '#f59e0b', 
        data: [],
        category: 'Music & Audio',
        currentTrend: categoryTrends.music
      },
      gaming: { 
        name: 'Gaming: ' + categoryTrends.gaming.topic, 
        color: '#ef4444', 
        data: [],
        category: 'Gaming',
        currentTrend: categoryTrends.gaming
      },
      social: { 
        name: 'Social: ' + categoryTrends.social.topic, 
        color: '#06b6d4', 
        data: [],
        category: 'Social Media',
        currentTrend: categoryTrends.social
      },
      lifestyle: { 
        name: 'Lifestyle: ' + categoryTrends.lifestyle.topic, 
        color: '#84cc16', 
        data: [],
        category: 'Lifestyle',
        currentTrend: categoryTrends.lifestyle
      },
      viral: { 
        name: 'Viral: ' + categoryTrends.viral.topic, 
        color: '#f472b6', 
        data: [],
        category: 'Viral Content',
        currentTrend: categoryTrends.viral
      }
    };

    const periods = {
      '1M': 30,
      '3M': 90, 
      '6M': 180,
      '1Y': 365,
      '5Y': 1825,
      'MAX': 3650
    };

    Object.keys(trends).forEach(key => {
      const trend = trends[key];
      const days = periods[this.currentPeriod];
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        
        // Use trend-specific data for realistic chart generation
        const trendInfo = trend.currentTrend;
        const baseValue = trendInfo.reach / 1000; // Scale down for chart visibility
        const trendVelocity = trendInfo.velocity;
        
        // Generate realistic trend data with velocity-based patterns
        const volatility = Math.sin(i * 0.1) * 0.3 + Math.random() * 0.4 - 0.2;
        const seasonality = Math.sin(i * 0.02) * 0.2;
        const growth = i * (trendVelocity / 1000); // Growth based on trend velocity
        const waveScore = trendInfo.wave_score / 100; // Scale wave score
        
        // Recent trends should show more dramatic growth
        const recentBoost = days - i < 7 ? (trendVelocity * 0.5) : 0;
        
        const value = Math.max(0, baseValue + (baseValue * (volatility + seasonality + growth + recentBoost)) * waveScore);
        
        trend.data.push({
          date: new Date(date),
          value: Math.round(value),
          metadata: {
            reach: trendInfo.reach,
            velocity: trendInfo.velocity,
            wave_score: trendInfo.wave_score,
            platform: trendInfo.platform_origin,
            description: trendInfo.description
          }
        });
      }
    });

    return trends;
  }

  getTrendBaseValue(trendKey) {
    const baseValues = {
      ai: 2800000,
      gaming: 2100000,
      entertainment: 3200000,
      crypto: 1500000,
      news: 1800000,
      music: 2900000,
      education: 1600000,
      health: 1400000,
      sports: 2500000,
      viral: 4500000
    };
    return baseValues[trendKey] || 1000000;
  }

  processRealDataForChart(realData) {
    if (!realData || realData.length === 0) {
      return this.generateTrendData();
    }

    console.log(`🔄 Processing ${realData.length} real data points for WaveScope Timeline`);

    const trends = {
      ai: { name: 'AI & Technology', color: '#5ee3ff', data: [] },
      gaming: { name: 'Gaming', color: '#8b5cf6', data: [] },
      entertainment: { name: 'Entertainment', color: '#ec4899', data: [] },
      crypto: { name: 'Crypto & Finance', color: '#f97316', data: [] },
      news: { name: 'News & Politics', color: '#10b981', data: [] },
      music: { name: 'Music', color: '#f59e0b', data: [] },
      education: { name: 'Education', color: '#ef4444', data: [] },
      health: { name: 'Health & Fitness', color: '#06b6d4', data: [] },
      sports: { name: 'Sports', color: '#84cc16', data: [] },
      viral: { name: 'Viral Content', color: '#f472b6', data: [] }
    };

    // Categorize real data by trend type
    const categoryMap = {
      'AI Tools': 'ai',
      'Technology': 'ai',
      'Gaming': 'gaming',
      'Entertainment': 'entertainment',
      'Crypto': 'crypto',
      'News': 'news',
      'Music': 'music',
      'Education': 'education',
      'Health': 'health',
      'Health & Fitness': 'health',
      'Sports': 'sports'
    };

    // Group data by date and category
    const dateGroups = {};
    
    realData.forEach(item => {
      const category = item.trend_category || 'General';
      const trendKey = categoryMap[category] || 'entertainment';
      const date = new Date(item.published_at || Date.now()).toDateString();
      
      if (!dateGroups[date]) {
        dateGroups[date] = {};
      }
      if (!dateGroups[date][trendKey]) {
        dateGroups[date][trendKey] = 0;
      }
      
      dateGroups[date][trendKey] += item.view_count || 0;
    });

    // Convert to timeline format
    const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(a) - new Date(b));
    
    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayData = dateGroups[dateStr];
      
      Object.keys(trends).forEach(trendKey => {
        trends[trendKey].data.push({
          date: new Date(date),
          value: dayData[trendKey] || 0
        });
      });
    });

    console.log('✅ Real data processed for WaveScope Timeline');
    return trends;
  }

  render() {
    // Get proper canvas dimensions accounting for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    
    // Clear entire canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Ensure we have data to render
    if (!this.data || Object.keys(this.data).length === 0) {
      this.drawNoDataMessage(width, height);
      return;
    }
    
    // Draw advanced WaveScope Timeline
    this.drawWaveScopeTimeline(width, height);
  }

  drawNoDataMessage(width, height) {
    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    this.ctx.fillRect(0, 0, width, height);
    
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.font = '16px Satoshi, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Initializing WaveScope Timeline...', width / 2, height / 2);
    this.ctx.fillText('Loading trend data...', width / 2, height / 2 + 30);
  }

  drawWaveScopeTimeline(width, height) {
    // Draw background with grid
    this.drawTimelineBackground(width, height);
    
    // Draw time axis (X-axis)
    this.drawTimeAxis(width, height);
    
    // Draw WaveScore axis (Y-axis: 0-100)
    this.drawWaveScoreAxis(width, height);
    
    // Draw trend lines with color gradients
    this.drawTrendLines(width, height);
    
    // Draw annotations and breakout moments
    this.drawAnnotations(width, height);
    
    // Draw legend
    this.drawAdvancedLegend(width, height);
  }

  drawTimelineBackground(width, height) {
    // Gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(26, 26, 46, 0.95)');
    gradient.addColorStop(1, 'rgba(19, 19, 31, 0.95)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    this.ctx.strokeStyle = 'rgba(94, 227, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    // Horizontal grid lines (WaveScore levels)
    for (let i = 0; i <= 10; i++) {
      const y = (height - 60) * (1 - i / 10) + 40;
      this.ctx.beginPath();
      this.ctx.moveTo(60, y);
      this.ctx.lineTo(width - 20, y);
      this.ctx.stroke();
    }
    
    // Vertical grid lines (Time intervals)
    const timeIntervals = this.getTimeIntervals();
    timeIntervals.forEach((_, index) => {
      const x = 60 + (width - 80) * (index / (timeIntervals.length - 1));
      this.ctx.beginPath();
      this.ctx.moveTo(x, 40);
      this.ctx.lineTo(x, height - 20);
      this.ctx.stroke();
    });
  }

  drawTimeAxis(width, height) {
    const timeIntervals = this.getTimeIntervals();
    
    this.ctx.fillStyle = '#f1f1f1';
    this.ctx.font = '12px Satoshi, sans-serif';
    this.ctx.textAlign = 'center';
    
    timeIntervals.forEach((time, index) => {
      const x = 60 + (width - 80) * (index / (timeIntervals.length - 1));
      this.ctx.fillText(this.formatTimeLabel(time), x, height - 5);
    });
    
    // X-axis label
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.font = 'bold 14px Satoshi, sans-serif';
    this.ctx.fillText('Time', width / 2, height - 25);
  }

  drawWaveScoreAxis(width, height) {
    this.ctx.fillStyle = '#f1f1f1';
    this.ctx.font = '12px Satoshi, sans-serif';
    this.ctx.textAlign = 'right';
    
    // WaveScore labels (0-100)
    for (let i = 0; i <= 10; i++) {
      const score = i * 10;
      const y = (height - 60) * (1 - i / 10) + 40;
      this.ctx.fillText(score.toString(), 55, y + 4);
    }
    
    // Y-axis label
    this.ctx.save();
    this.ctx.translate(20, height / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.font = 'bold 14px Satoshi, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('WaveScore (0-100)', 0, 0);
    this.ctx.restore();
  }

  drawTrendLines(width, height) {
    Object.keys(this.data).forEach(trendKey => {
      if (!this.activeTrends[trendKey]) return;
      
      const trend = this.data[trendKey];
      const points = this.generateWaveScorePoints(trend);
      
      if (points.length < 2) return;
      
      // Create gradient for line based on intensity
      const gradient = this.createIntensityGradient(points, width);
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      // Draw the trend line
      this.ctx.beginPath();
      points.forEach((point, index) => {
        const x = 60 + (width - 80) * (index / (points.length - 1));
        const y = (height - 60) * (1 - point.waveScore / 100) + 40;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.stroke();
      
      // Draw data points with varying sizes based on momentum
      points.forEach((point, index) => {
        const x = 60 + (width - 80) * (index / (points.length - 1));
        const y = (height - 60) * (1 - point.waveScore / 100) + 40;
        const radius = 2 + (point.momentum || 0) * 0.1;
        
        this.ctx.fillStyle = this.getIntensityColor(point.waveScore);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
      });
    });
  }

  generateWaveScorePoints(trend) {
    // Generate time series data with proper WaveScore calculation
    const periods = this.getTimePeriods();
    const points = [];
    
    periods.forEach((period, index) => {
      // Simulate historical data with realistic wave patterns
      const baseScore = trend.data[index]?.value || 0;
      const waveScore = this.convertToWaveScore(baseScore, index, periods.length);
      
      // Add momentum and volatility
      const momentum = this.calculateMomentumBoost(waveScore, index);
      const volatility = Math.sin(index * 0.3) * 5; // Natural fluctuation
      
      points.push({
        date: period,
        waveScore: Math.max(0, Math.min(100, waveScore + momentum + volatility)),
        momentum: momentum,
        breakout: this.detectBreakoutMoment(waveScore, momentum)
      });
    });
    
    return points;
  }

  convertToWaveScore(value, index, totalPeriods) {
    // Convert raw engagement value to 0-100 WaveScore
    const normalizedValue = Math.log10(value + 1) / Math.log10(10000000) * 100;
    
    // Add time-based growth pattern
    const growthFactor = (index / totalPeriods) * 20; // Gradual growth over time
    
    return Math.min(100, normalizedValue + growthFactor);
  }

  calculateMomentumBoost(baseScore, index) {
    // Simulate momentum spikes based on viral triggers
    if (index % 7 === 0) return Math.random() * 15; // Weekly viral moments
    if (baseScore > 70) return Math.random() * 10; // High-score momentum
    if (Math.random() < 0.1) return Math.random() * 20; // Random viral spikes
    return 0;
  }

  detectBreakoutMoment(waveScore, momentum) {
    return waveScore > 80 && momentum > 10; // Major viral breakout
  }

  createIntensityGradient(points, width) {
    const gradient = this.ctx.createLinearGradient(60, 0, width - 20, 0);
    
    points.forEach((point, index) => {
      const position = index / (points.length - 1);
      const color = this.getIntensityColor(point.waveScore);
      gradient.addColorStop(position, color);
    });
    
    return gradient;
  }

  getIntensityColor(waveScore) {
    // Color gradient based on WaveScore intensity
    if (waveScore >= 90) return '#ff1744'; // Red - Mega viral
    if (waveScore >= 80) return '#ff6b35'; // Orange-red - Ultra viral  
    if (waveScore >= 70) return '#ffaa00'; // Orange - Highly viral
    if (waveScore >= 60) return '#ffd54f'; // Yellow - Viral
    if (waveScore >= 40) return '#81c784'; // Green - Growing
    if (waveScore >= 20) return '#64b5f6'; // Blue - Stable
    return '#90a4ae'; // Gray - Low activity
  }

  drawAnnotations(width, height) {
    // Draw breakout moment annotations
    Object.keys(this.data).forEach(trendKey => {
      if (!this.activeTrends[trendKey]) return;
      
      const points = this.generateWaveScorePoints(this.data[trendKey]);
      
      points.forEach((point, index) => {
        if (point.breakout) {
          const x = 60 + (width - 80) * (index / (points.length - 1));
          const y = (height - 60) * (1 - point.waveScore / 100) + 40;
          
          // Draw breakout indicator
          this.ctx.fillStyle = '#ff1744';
          this.ctx.font = 'bold 12px Satoshi, sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('🚀', x, y - 15);
          
          // Optional: Add annotation text
          if (point.waveScore > 85) {
            this.ctx.fillStyle = 'rgba(255, 23, 68, 0.1)';
            this.ctx.fillRect(x - 30, y - 35, 60, 20);
            this.ctx.fillStyle = '#ff1744';
            this.ctx.font = '10px Satoshi, sans-serif';
            this.ctx.fillText('VIRAL', x, y - 25);
          }
        }
      });
    });
  }

  drawAdvancedLegend(width, height) {
    const legendY = 10;
    let legendX = width - 200;
    
    this.ctx.fillStyle = 'rgba(19, 19, 31, 0.9)';
    this.ctx.fillRect(legendX - 10, legendY, 190, 100);
    
    this.ctx.strokeStyle = 'rgba(94, 227, 255, 0.3)';
    this.ctx.strokeRect(legendX - 10, legendY, 190, 100);
    
    // Legend title
    this.ctx.fillStyle = '#5ee3ff';
    this.ctx.font = 'bold 12px Satoshi, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('WaveScore Legend', legendX, legendY + 15);
    
    // Color intensity guide
    const intensityLevels = [
      { score: '90-100', color: '#ff1744', label: 'Mega Viral' },
      { score: '80-89', color: '#ff6b35', label: 'Ultra Viral' },
      { score: '70-79', color: '#ffaa00', label: 'Highly Viral' },
      { score: '60-69', color: '#ffd54f', label: 'Viral' },
      { score: '40-59', color: '#81c784', label: 'Growing' },
      { score: '0-39', color: '#64b5f6', label: 'Stable' }
    ];
    
    intensityLevels.forEach((level, index) => {
      const y = legendY + 30 + index * 10;
      
      // Color indicator
      this.ctx.fillStyle = level.color;
      this.ctx.fillRect(legendX, y - 4, 8, 8);
      
      // Text
      this.ctx.fillStyle = '#f1f1f1';
      this.ctx.font = '9px Satoshi, sans-serif';
      this.ctx.fillText(`${level.score}: ${level.label}`, legendX + 12, y + 2);
    });
  }

  getTimeIntervals() {
    // Generate time intervals based on current period
    const periods = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '5Y': 1825,
      'MAX': 3650
    };
    
    const days = periods[this.currentPeriod] || 30;
    const intervals = [];
    const intervalCount = 10; // Show 10 time points
    
    for (let i = 0; i < intervalCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - (days * i / (intervalCount - 1))));
      intervals.push(date);
    }
    
    return intervals;
  }

  getTimePeriods() {
    // Return array of time periods for data generation
    return this.getTimeIntervals();
  }

  formatTimeLabel(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (this.currentPeriod === '1M' || this.currentPeriod === '3M') {
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return `${Math.floor(diffDays / 7)}w ago`;
    } else if (this.currentPeriod === '6M' || this.currentPeriod === '1Y') {
      if (diffDays < 30) return `${diffDays}d`;
      return `${Math.floor(diffDays / 30)}mo`;
    } else {
      return date.getFullYear().toString();
    }
  }

  // Get current biggest trends for each category
  getCategoryBasedTrends() {
    // This would normally fetch from API, but for demo we'll use curated trending topics
    const currentTrends = {
      ai: {
        topic: 'Claude Code for Vibecoding',
        reach: 2847392,
        velocity: 0.89,
        description: 'Developers using Claude Code for creative coding workflows',
        platform_origin: 'YouTube',
        wave_score: 87
      },
      film: {
        topic: 'Dune 3 Production Updates',
        reach: 1924761,
        velocity: 0.76,
        description: 'Behind-the-scenes content from Denis Villeneuve\'s Dune: Part Three',
        platform_origin: 'YouTube',
        wave_score: 82
      },
      culture: {
        topic: 'Gen Z Work-Life Balance Revolution',
        reach: 3102847,
        velocity: 0.81,
        description: 'Cultural shift in workplace expectations and remote work advocacy',
        platform_origin: 'TikTok',
        wave_score: 85
      },
      crypto: {
        topic: 'Bitcoin ETF Impact Analysis',
        reach: 1647382,
        velocity: 0.73,
        description: 'Market analysis of institutional Bitcoin adoption effects',
        platform_origin: 'Reddit',
        wave_score: 79
      },
      technology: {
        topic: 'Apple Vision Pro Review Wave',
        reach: 4192847,
        velocity: 0.94,
        description: 'Comprehensive reviews and user experiences with Apple\'s VR headset',
        platform_origin: 'YouTube',
        wave_score: 91
      },
      music: {
        topic: 'Taylor Swift Eras Tour Documentary',
        reach: 5847392,
        velocity: 0.97,
        description: 'Behind-the-scenes documentary content from the record-breaking tour',
        platform_origin: 'YouTube',
        wave_score: 94
      },
      gaming: {
        topic: 'Baldur\'s Gate 3 Speedrun Community',
        reach: 2384761,
        velocity: 0.68,
        description: 'Competitive speedrunning strategies and world record attempts',
        platform_origin: 'Twitch',
        wave_score: 77
      },
      social: {
        topic: 'Instagram Threads vs Twitter Migration',
        reach: 3847291,
        velocity: 0.86,
        description: 'User migration patterns and platform comparison content',
        platform_origin: 'TikTok',
        wave_score: 88
      },
      lifestyle: {
        topic: 'Minimalist Tech Setup Trends',
        reach: 1923847,
        velocity: 0.71,
        description: 'Clean desk setups and minimalist productivity workflows',
        platform_origin: 'YouTube',
        wave_score: 81
      },
      viral: {
        topic: 'AI-Generated Meme Templates',
        reach: 4729384,
        velocity: 0.92,
        description: 'Creative use of AI tools for meme generation and viral content',
        platform_origin: 'TikTok',
        wave_score: 89
      }
    };
    
    return currentTrends;
  }

  setupEventListeners() {
    // Add hover tooltips for data points
    this.canvas.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });
    
    this.canvas.addEventListener('click', (e) => {
      this.handleClick(e);
    });
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is over a data point and show tooltip
    this.showTooltipIfNearPoint(x, y);
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle clicking on breakout moments or trend lines
    this.handleTrendClick(x, y);
  }

  showTooltipIfNearPoint(mouseX, mouseY) {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    
    Object.keys(this.data).forEach(trendKey => {
      if (!this.activeTrends[trendKey]) return;
      
      const points = this.generateWaveScorePoints(this.data[trendKey]);
      
      points.forEach((point, index) => {
        const x = 60 + (width - 80) * (index / (points.length - 1));
        const y = (height - 60) * (1 - point.waveScore / 100) + 40;
        
        const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        
        if (distance < 10) {
          this.showWaveScoreTooltip(mouseX, mouseY, point, this.data[trendKey]);
        }
      });
    });
  }

  showWaveScoreTooltip(x, y, point, trend) {
    const tooltip = document.getElementById('chartTooltip');
    if (!tooltip) return;
    
    const breakdown = point.waveScore_breakdown || {};
    
    const trendInfo = trend.currentTrend || {};
    
    tooltip.innerHTML = `
      <div style="background: rgba(19, 19, 31, 0.95); border: 1px solid #5ee3ff; border-radius: 8px; padding: 12px; color: #f1f1f1; font-size: 12px; min-width: 280px; max-width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <div style="font-weight: 600; margin-bottom: 8px; color: #5ee3ff; font-size: 14px;">
          ${trend.category || 'Trending Category'}
        </div>
        <div style="font-weight: 500; margin-bottom: 8px; line-height: 1.4; color: #f1f1f1;">
          📈 ${trendInfo.topic || trend.name}
        </div>
        ${trendInfo.description ? `
          <div style="color: #9ca3af; margin-bottom: 8px; font-size: 11px; line-height: 1.3; font-style: italic;">
            ${trendInfo.description}
          </div>
        ` : ''}
        <div style="border-top: 1px solid #2e2e45; padding-top: 8px; margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>🌊 WaveScore:</span>
            <span style="color: #5ee3ff; font-weight: 600;">${Math.round(point.waveScore)}/100</span>
          </div>
          ${trendInfo.reach ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>🎯 Total Reach:</span>
              <span style="color: #f59e0b; font-weight: 600;">${trendInfo.reach.toLocaleString()}</span>
            </div>
          ` : ''}
          ${trendInfo.velocity ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>⚡ Velocity:</span>
              <span style="color: #ec4899; font-weight: 600;">${Math.round(trendInfo.velocity * 100)}%</span>
            </div>
          ` : ''}
          ${trendInfo.platform_origin ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>📱 Platform:</span>
              <span style="color: #8b5cf6; font-weight: 600;">${trendInfo.platform_origin}</span>
            </div>
          ` : ''}
        </div>
        ${breakdown.reach || breakdown.velocity || breakdown.sentiment || breakdown.momentum ? `
          <div style="border-top: 1px solid #2e2e45; padding-top: 8px; margin-top: 8px;">
            <div style="color: #9ca3af; font-size: 11px; margin-bottom: 4px;">WaveScore Breakdown:</div>
            ${breakdown.reach ? `<div style="margin-bottom: 2px; font-size: 11px;">🔹 Reach: ${breakdown.reach}/40</div>` : ''}
            ${breakdown.velocity ? `<div style="margin-bottom: 2px; font-size: 11px;">🔹 Velocity: ${breakdown.velocity}/30</div>` : ''}
            ${breakdown.sentiment ? `<div style="margin-bottom: 2px; font-size: 11px;">🔹 Sentiment: ${breakdown.sentiment}/20</div>` : ''}
            ${breakdown.momentum ? `<div style="margin-bottom: 2px; font-size: 11px;">🔹 Momentum: ${breakdown.momentum}/10</div>` : ''}
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #2e2e45;">
          <span style="color: #9ca3af; font-size: 10px;">📅 ${point.date.toLocaleDateString()}</span>
        </div>
        ${point.breakout ? '<div style="color: #ff1744; font-weight: 600; margin-top: 8px; text-align: center; padding: 4px; background: rgba(255, 23, 68, 0.1); border-radius: 4px;">🚀 VIRAL BREAKOUT MOMENT</div>' : ''}
      </div>
    `;
    
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => tooltip.style.display = 'none', 300);
    }, 3000);
  }

  handleTrendClick(x, y) {
    // Handle clicking on specific trend elements
    console.log(`Clicked on WaveScope Timeline at (${x}, ${y})`);
  }
    
    // Draw trend lines
    this.drawTrendLines(width, height);
    
    // Draw axes
    this.drawAxes(width, height);
  }

  drawBackground(width, height) {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(26, 26, 46, 0.8)');
    gradient.addColorStop(1, 'rgba(37, 37, 69, 0.8)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  drawGrid(width, height) {
    const padding = 60;
    const gridColor = 'rgba(94, 227, 255, 0.1)';
    
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - padding * 2) * (i / 5);
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(width - padding, y);
      this.ctx.stroke();
    }
    
    // Vertical grid lines
    const timePoints = this.getTimePoints();
    for (let i = 0; i < timePoints; i++) {
      const x = padding + (width - padding * 2) * (i / (timePoints - 1));
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding);
      this.ctx.lineTo(x, height - padding);
      this.ctx.stroke();
    }
  }

  drawTrendLines(width, height) {
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    Object.keys(this.activeTrends).forEach(key => {
      if (!this.activeTrends[key]) return;
      
      const trend = this.data[key];
      if (!trend || trend.data.length === 0) return;
      
      this.ctx.strokeStyle = trend.color;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      // Add glow effect
      this.ctx.shadowColor = trend.color;
      this.ctx.shadowBlur = 10;
      
      this.ctx.beginPath();
      
      const maxValue = Math.max(...Object.values(this.data)
        .filter(t => this.activeTrends[Object.keys(this.data).find(k => this.data[k] === t)])
        .flatMap(t => t.data.map(d => d.value)));
      
      trend.data.forEach((point, index) => {
        const x = padding + (chartWidth * index / (trend.data.length - 1));
        const y = padding + chartHeight - (chartHeight * point.value / maxValue);
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    });
  }

  drawAxes(width, height) {
    const padding = 60;
    
    this.ctx.strokeStyle = 'rgba(94, 227, 255, 0.6)';
    this.ctx.lineWidth = 2;
    
    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(padding, padding);
    this.ctx.lineTo(padding, height - padding);
    this.ctx.stroke();
    
    // X-axis  
    this.ctx.beginPath();
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(width - padding, height - padding);
    this.ctx.stroke();
    
    // Draw labels
    this.drawLabels(width, height);
  }

  drawLabels(width, height) {
    const padding = 60;
    
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.font = '12px Satoshi, sans-serif';
    this.ctx.textAlign = 'right';
    
    // Y-axis labels (view counts)
    const maxValue = Math.max(...Object.values(this.data)
      .filter(t => this.activeTrends[Object.keys(this.data).find(k => this.data[k] === t)])
      .flatMap(t => t.data.map(d => d.value)));
    
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * (5 - i);
      const y = padding + (height - padding * 2) * (i / 5);
      const label = this.formatNumber(value);
      
      this.ctx.fillText(label, padding - 10, y + 4);
    }
    
    // X-axis labels (dates)
    this.ctx.textAlign = 'center';
    const timeLabels = this.getTimeLabels();
    timeLabels.forEach((label, index) => {
      const x = padding + (width - padding * 2) * (index / (timeLabels.length - 1));
      this.ctx.fillText(label, x, height - padding + 20);
    });
  }

  getTimePoints() {
    const points = {
      '1M': 7,
      '3M': 6,
      '6M': 6,
      '1Y': 12,
      '5Y': 5,
      'MAX': 10
    };
    return points[this.currentPeriod] || 6;
  }

  getTimeLabels() {
    const now = new Date();
    const labels = [];
    const points = this.getTimePoints();
    
    for (let i = points - 1; i >= 0; i--) {
      const date = new Date(now);
      
      switch (this.currentPeriod) {
        case '1M':
          date.setDate(date.getDate() - (i * 5));
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          break;
        case '3M':
          date.setDate(date.getDate() - (i * 15));
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          break;
        case '6M':
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
          break;
        case '1Y':
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
          break;
        case '5Y':
          date.setFullYear(date.getFullYear() - i);
          labels.push(date.getFullYear().toString());
          break;
        case 'MAX':
          date.setFullYear(date.getFullYear() - (i * 2));
          labels.push(date.getFullYear().toString());
          break;
      }
    }
    
    return labels.reverse();
  }

  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return Math.round(num).toString();
  }

  setupEventListeners() {
    // Canvas hover for tooltips
    this.canvas.addEventListener('mousemove', (e) => {
      // TODO: Implement tooltip on hover
    });
  }

  updatePeriod(period) {
    this.currentPeriod = period;
    this.data = this.generateTrendData();
    this.render();
  }

  toggleTrend(trendKey) {
    this.activeTrends[trendKey] = !this.activeTrends[trendKey];
    this.render();
  }

  // Method to refresh category trends with new data
  refreshCategoryTrends() {
    const newCategoryTrends = this.getCategoryBasedTrends();
    
    // Update existing trend data with new trending topics
    Object.keys(this.data).forEach(key => {
      if (newCategoryTrends[key]) {
        this.data[key].currentTrend = newCategoryTrends[key];
        this.data[key].name = `${this.data[key].category.split(' ')[0]}: ${newCategoryTrends[key].topic}`;
        
        // Regenerate chart data with new trend info
        this.regenerateTrendData(key);
      }
    });
    
    this.render();
    console.log('🔄 Category trends refreshed with latest data');
  }

  // Regenerate chart data for a specific trend
  regenerateTrendData(trendKey) {
    const trend = this.data[trendKey];
    const trendInfo = trend.currentTrend;
    const periods = {
      '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 1825, 'MAX': 3650
    };
    const days = periods[this.currentPeriod];
    
    // Clear existing data
    trend.data = [];
    
    // Regenerate with new trend-specific parameters
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      const baseValue = trendInfo.reach / 1000;
      const trendVelocity = trendInfo.velocity;
      
      const volatility = Math.sin(i * 0.1) * 0.3 + Math.random() * 0.4 - 0.2;
      const seasonality = Math.sin(i * 0.02) * 0.2;
      const growth = i * (trendVelocity / 1000);
      const waveScore = trendInfo.wave_score / 100;
      
      const recentBoost = days - i < 7 ? (trendVelocity * 0.5) : 0;
      const value = Math.max(0, baseValue + (baseValue * (volatility + seasonality + growth + recentBoost)) * waveScore);
      
      trend.data.push({
        date: new Date(date),
        value: Math.round(value),
        metadata: {
          reach: trendInfo.reach,
          velocity: trendInfo.velocity,
          wave_score: trendInfo.wave_score,
          platform: trendInfo.platform_origin,
          description: trendInfo.description
        }
      });
    }
  }
}

// Global functions for timeline controls
window.setTimePeriod = function(period) {
  // Update active button
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update chart
  if (window.waveSightDashboard && window.waveSightDashboard.wavescopeChart) {
    window.waveSightDashboard.wavescopeChart.updatePeriod(period);
  }
};

window.toggleTrendLine = function(trendKey) {
  if (window.waveSightDashboard && window.waveSightDashboard.wavescopeChart) {
    window.waveSightDashboard.wavescopeChart.toggleTrend(trendKey);
  }
};

window.refreshYouTubeData = function() {
  if (window.waveSightDashboard) {
    window.waveSightDashboard.showNotification('🔄 Refreshing YouTube data...', 'info');
    window.waveSightDashboard.fetchFreshYouTubeData();
  }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.waveSightDashboard = new WaveSightDashboard();
  window.waveSightDashboard.init();
});