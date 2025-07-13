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
      await this.loadDashboardData();
      
      // Initialize UI components
      this.updateLiveStatus('connected');
      this.initAutoRefresh();
      
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

  // Render chart with performance optimization
  renderChart(data, filterTrend = 'all') {
    const startTime = performance.now();
    
    const container = document.getElementById('trendChart');
    if (!container) return;

    // Clear existing chart
    container.innerHTML = '';

    // Create canvas with proper sizing
    const canvas = this.createHighDPICanvas(container);
    const ctx = canvas.getContext('2d');

    // Get trends to display
    const trendsToShow = this.getTrendsToShow(data, filterTrend);

    // Create chart renderer
    const chartRenderer = new ChartRenderer(ctx, {
      data: data,
      trends: trendsToShow,
      colors: this.config.chart.colors,
      dimensions: {
        width: container.clientWidth,
        height: 330,
        padding: 60
      }
    });

    // Render with animation
    chartRenderer.render();

    // Add interactivity
    this.addChartInteractivity(canvas, chartRenderer);

    // Track performance
    this.performanceMetrics.chartRenderTime = performance.now() - startTime;
    console.log(`⚡ Chart rendered in ${this.performanceMetrics.chartRenderTime.toFixed(2)}ms`);
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
    const fallbackData = {
      chartData: [
        { date: '1/2024', 'AI Tools': 1200000, 'Crypto': 800000, 'Gaming': 950000 },
        { date: '2/2024', 'AI Tools': 1500000, 'Crypto': 750000, 'Gaming': 1100000 },
        { date: '3/2024', 'AI Tools': 1800000, 'Crypto': 900000, 'Gaming': 1050000 },
        { date: '4/2024', 'AI Tools': 2100000, 'Crypto': 850000, 'Gaming': 1200000 },
        { date: '5/2024', 'AI Tools': 2400000, 'Crypto': 1000000, 'Gaming': 1300000 },
        { date: '6/2024', 'AI Tools': 2700000, 'Crypto': 1100000, 'Gaming': 1450000 }
      ],
      tableData: [
        { topic: 'AI Tools', totalViews: 12300000, videoCount: 150, avgScore: 85, platformCount: 5 },
        { topic: 'Crypto', totalViews: 5400000, videoCount: 80, avgScore: 72, platformCount: 3 },
        { topic: 'Gaming', totalViews: 7000000, videoCount: 120, avgScore: 78, platformCount: 4 }
      ]
    };
    
    this.renderChart(fallbackData.chartData);
    this.renderTrendTable(fallbackData.tableData);
    this.showNotification('Using demo data - API connection failed', 'warning');
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

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.waveSightDashboard = new WaveSightDashboard();
  window.waveSightDashboard.init();
});