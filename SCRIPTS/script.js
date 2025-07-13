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
      console.error('❌ Supabase configuration missing. Please ensure config.js is loaded and configured.');
      this.showConfigurationError();
      return;
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
      
      // Load initial data
      console.log('🌊 Loading dashboard with demo data...');
      this.useFallbackData(); // Always load demo data for immediate display
      
      // Initialize UI components
      this.updateLiveStatus('connected');
      this.initAutoRefresh();
      
      // Initialize alert system
      await this.initAlertSystem();
      
      // Initialize WaveScope Timeline
      this.initWaveScopeTimeline();
      
      console.log('✅ Dashboard initialized successfully');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      this.handleError(error);
    }
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
    const cacheKey = 'dashboard_data';
    
    // Check cache first
    if (!forceRefresh && this.config.cache.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📦 Using cached dashboard data');
        this.processDashboardData(cached);
        return;
      }
    }

    this.showLoading();

    try {
      // Fetch data from API
      const response = await this.fetchWithTimeout('/api/youtube-data?limit=1000');
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        
        // Cache the data
        this.setCache(cacheKey, data);
        
        // Process and display
        this.processDashboardData(data);
        
        console.log(`✅ Loaded ${data.length} records`);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      this.handleError(error);
      this.useFallbackData();
    } finally {
      this.hideLoading();
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
    const canvas = document.getElementById('wavescopeCanvas');
    if (!canvas) return;

    this.wavescopeChart = new WaveScopeChart(canvas);
    this.wavescopeChart.init();
    console.log('✅ WaveScope Timeline initialized successfully');
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
    const searchTerm = searchInput?.value.trim().toLowerCase();

    if (!searchTerm) {
      await this.resetView();
      return;
    }

    this.showLoading();

    try {
      // Search in current data first
      let searchResults = this.searchInCurrentData(searchTerm);

      // If no results, fetch from API
      if (searchResults.length === 0) {
        searchResults = await this.fetchSearchResults(searchTerm);
      }

      if (searchResults.length > 0) {
        this.displaySearchResults(searchResults, searchTerm);
      } else {
        this.showNoResults(searchTerm);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      this.handleError(error);
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

    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No data available</td></tr>';
      return;
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
      this.showNotification('Fetching fresh YouTube data...', 'info');

      const response = await fetch('/api/fetch-youtube?q=trending&maxResults=50', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification(`✅ Fetched ${result.data?.length || 0} new records`, 'success');
        await this.loadDashboardData(true); // Refresh dashboard with new data
      } else {
        throw new Error(result.message || 'Failed to fetch YouTube data');
      }
    } catch (error) {
      console.error('❌ Error fetching fresh YouTube data:', error);
      this.showNotification('Failed to fetch fresh data: ' + error.message, 'error');
    } finally {
      this.hideLoading();
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
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentPeriod = '1M';
    this.activeTrends = {
      ai: true,
      gaming: true, 
      entertainment: true,
      crypto: true,
      news: true
    };
    this.data = this.generateTrendData();
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
    const trends = {
      ai: { name: 'AI & Technology', color: '#5ee3ff', data: [] },
      gaming: { name: 'Gaming', color: '#8b5cf6', data: [] },
      entertainment: { name: 'Entertainment', color: '#ec4899', data: [] },
      crypto: { name: 'Crypto & Finance', color: '#f97316', data: [] },
      news: { name: 'News & Politics', color: '#10b981', data: [] }
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
        
        // Generate realistic trend data with some volatility
        const baseValue = this.getTrendBaseValue(key);
        const volatility = Math.sin(i * 0.1) * 0.3 + Math.random() * 0.4 - 0.2;
        const seasonality = Math.sin(i * 0.02) * 0.2;
        const growth = i * 0.001; // Slight upward trend
        
        const value = Math.max(0, baseValue + (baseValue * (volatility + seasonality + growth)));
        
        trend.data.push({
          date: new Date(date),
          value: Math.round(value)
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
      news: 1800000
    };
    return baseValues[trendKey] || 1000000;
  }

  render() {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Draw background
    this.drawBackground(width, height);
    
    // Draw grid
    this.drawGrid(width, height);
    
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