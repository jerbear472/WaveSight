// Charting Trends Table Configuration
const CONFIG = {
  SUPABASE_URL: 'https://artdirswzxxskcdvstse.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo',
  ITEMS_PER_PAGE: 50,
  MAX_RECORDS: 1000,
  DEBOUNCE_DELAY: 300
};

// Category configuration
const CATEGORIES = {
  'AI Tools': { class: 'category-ai', color: '#8b5cf6' },
  'Crypto': { class: 'category-crypto', color: '#f59e0b' },
  'Gaming': { class: 'category-gaming', color: '#10b981' },
  'Technology': { class: 'category-tech', color: '#3b82f6' },
  'Entertainment': { class: 'category-entertainment', color: '#ec4899' },
  'Health & Fitness': { class: 'category-health', color: '#06b6d4' },
  'General': { class: 'category-general', color: '#6b7280' }
};

// Wave score thresholds
const WAVE_SCORES = {
  HIGH: { threshold: 0.7, class: 'wave-high', label: 'High' },
  MEDIUM: { threshold: 0.4, class: 'wave-medium', label: 'Medium' },
  LOW: { threshold: 0, class: 'wave-low', label: 'Low' }
};

class TrendsTable {
  constructor() {
    this.supabase = null;
    this.currentData = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.isLoading = false;
    this.loadingOverlay = null;
    this.sortDirection = {};
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async init() {
    console.log('🚀 Initializing charting trends table...');
    
    if (!this.initSupabase()) {
      console.error('Failed to initialize Supabase');
      this.showError('Failed to connect to database');
      return;
    }

    this.attachEventListeners();
    await this.refreshTable();
  }

  initSupabase() {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase configuration');
      return false;
    }

    try {
      this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialized for trends table');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  }

  async fetchTrendingData(forceRefresh = false) {
    const cacheKey = 'trending_data';
    
    // Check cache first
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Using cached data');
        return cached.data;
      }
    }

    try {
      this.showLoading();
      console.log('📥 Fetching trending data...');

      const { data, error } = await this.supabase
        .from('youtube_trends')
        .select('*')
        .order('view_count', { ascending: false })
        .limit(CONFIG.MAX_RECORDS);

      if (error) throw error;

      console.log(`✅ Retrieved ${data.length} trending records`);
      
      // Cache the data
      this.cache.set(cacheKey, {
        data: data || [],
        timestamp: Date.now()
      });

      return data || [];

    } catch (error) {
      console.error('❌ Error fetching trending data:', error);
      this.showError(`Failed to load data: ${error.message}`);
      return this.getFallbackTrendingData();
    } finally {
      this.hideLoading();
    }
  }

  getFallbackTrendingData() {
    const categories = Object.keys(CATEGORIES);
    const data = [];

    for (let i = 0; i < 100; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const viewCount = Math.floor(Math.random() * 10000000) + 100000;
      const likeCount = Math.floor(viewCount * (0.01 + Math.random() * 0.05));
      const commentCount = Math.floor(viewCount * (0.002 + Math.random() * 0.008));
      
      data.push({
        id: i + 1,
        video_id: `fallback_${i}`,
        title: `Trending ${category} Content ${i + 1}`,
        trend_category: category,
        view_count: viewCount,
        like_count: likeCount,
        comment_count: commentCount,
        trend_score: Math.floor(Math.random() * 100) + 1,
        wave_score: Math.random(),
        sentiment_score: Math.random(),
        published_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        channel_title: `Channel ${Math.floor(Math.random() * 1000)}`
      });
    }

    return data;
  }

  formatNumber(num) {
    if (!num || isNaN(num)) return '0';
    
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toString();
  }

  calculateEngagementRate(item) {
    const viewCount = item.view_count || 0;
    const likeCount = item.like_count || 0;
    const commentCount = item.comment_count || 0;
    
    if (viewCount === 0) return 0;
    return ((likeCount + commentCount) / viewCount * 100).toFixed(2);
  }

  calculateGrowth(item) {
    const daysOld = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
    const baseGrowth = (item.trend_score || 50) - 50;
    const timeDecay = Math.max(0, 1 - (daysOld / 30));
    return (baseGrowth * timeDecay).toFixed(1);
  }

  getCategoryConfig(category) {
    return CATEGORIES[category] || CATEGORIES['General'];
  }

  getWaveScoreIndicator(waveScore) {
    const score = parseFloat(waveScore) || 0;
    
    if (score >= WAVE_SCORES.HIGH.threshold) return WAVE_SCORES.HIGH;
    if (score >= WAVE_SCORES.MEDIUM.threshold) return WAVE_SCORES.MEDIUM;
    return WAVE_SCORES.LOW;
  }

  createTableRow(item, rank) {
    const engagementRate = this.calculateEngagementRate(item);
    const growth = this.calculateGrowth(item);
    const waveIndicator = this.getWaveScoreIndicator(item.wave_score);
    const categoryConfig = this.getCategoryConfig(item.trend_category);
    
    const growthClass = parseFloat(growth) > 0 ? 'growth-positive' : 
                      parseFloat(growth) < 0 ? 'growth-negative' : 'growth-neutral';

    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    return `
      <tr data-video-id="${escapeHtml(item.video_id)}" class="table-row">
        <td class="rank-cell">
          <span class="trend-rank">#${rank}</span>
        </td>
        <td class="title-cell">
          <div class="trend-name">${escapeHtml(item.title || 'Untitled')}</div>
          <div class="channel-name">${escapeHtml(item.channel_title || 'Unknown Channel')}</div>
        </td>
        <td class="category-cell">
          <span class="trend-category ${categoryConfig.class}" style="background-color: ${categoryConfig.color}20; color: ${categoryConfig.color};">
            ${escapeHtml(item.trend_category || 'General')}
          </span>
        </td>
        <td class="metric-cell">
          <div class="metric-value">${this.formatNumber(item.view_count || 0)}</div>
          <div class="metric-label">views</div>
        </td>
        <td class="metric-cell">
          <div class="metric-value">${engagementRate}%</div>
          <div class="metric-label">
            ${this.formatNumber((item.like_count || 0) + (item.comment_count || 0))} total
          </div>
        </td>
        <td class="metric-cell">
          <div class="metric-value">${item.trend_score || 0}</div>
          <div class="metric-label">/100</div>
        </td>
        <td class="metric-cell">
          <div class="wave-score">
            <span class="wave-indicator ${waveIndicator.class}"></span>
            <span class="metric-value">${(item.wave_score || 0).toFixed(3)}</span>
          </div>
          <div class="metric-label">${waveIndicator.label}</div>
        </td>
        <td class="metric-cell">
          <div class="metric-growth ${growthClass}">
            ${parseFloat(growth) > 0 ? '+' : ''}${growth}%
          </div>
        </td>
        <td class="date-cell">
          <div class="date-primary">${new Date(item.published_at).toLocaleDateString()}</div>
          <div class="date-secondary">
            ${new Date(item.published_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </td>
        <td class="actions-cell">
          <div class="trend-actions">
            <button class="action-btn btn-chart" data-video-id="${escapeHtml(item.video_id)}" title="View Chart">
              📊
            </button>
            <button class="action-btn btn-alert" data-video-id="${escapeHtml(item.video_id)}" title="Create Alert">
              🚨
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  renderTable(data) {
    const tbody = document.getElementById('trendsTableBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">
            <div class="empty-state-content">
              <p>No trending data available</p>
              <button class="refresh-btn" onclick="trendsTable.refreshTable(true)">Refresh</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + CONFIG.ITEMS_PER_PAGE, data.length);
    const pageData = data.slice(startIndex, endIndex);

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    tempDiv.innerHTML = pageData
      .map((item, index) => this.createTableRow(item, startIndex + index + 1))
      .join('');
    
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    this.updatePagination();
  }

  filterAndSortData() {
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'view_count';
    const timeRange = document.getElementById('timeRange')?.value || 'all';

    let filtered = [...this.currentData];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.trend_category === categoryFilter);
    }

    // Time range filter
    if (timeRange !== 'all') {
      const days = parseInt(timeRange);
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => new Date(item.published_at) >= cutoffDate);
    }

    // Toggle sort direction
    if (!this.sortDirection[sortBy]) {
      this.sortDirection[sortBy] = 'desc';
    } else {
      this.sortDirection[sortBy] = this.sortDirection[sortBy] === 'desc' ? 'asc' : 'desc';
    }

    const direction = this.sortDirection[sortBy] === 'desc' ? -1 : 1;

    // Sort data
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'view_count':
          compareValue = (b.view_count || 0) - (a.view_count || 0);
          break;
        case 'trend_score':
          compareValue = (b.trend_score || 0) - (a.trend_score || 0);
          break;
        case 'wave_score':
          compareValue = (b.wave_score || 0) - (a.wave_score || 0);
          break;
        case 'published_at':
          compareValue = new Date(b.published_at) - new Date(a.published_at);
          break;
        case 'engagement':
          const engagementA = this.calculateEngagementRate(a);
          const engagementB = this.calculateEngagementRate(b);
          compareValue = parseFloat(engagementB) - parseFloat(engagementA);
          break;
      }
      
      return compareValue * direction;
    });

    this.filteredData = filtered;
    this.currentPage = 1;
    this.totalPages = Math.ceil(filtered.length / CONFIG.ITEMS_PER_PAGE);
    
    this.renderTable(filtered);
  }

  updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
      prevBtn.classList.toggle('disabled', this.currentPage <= 1);
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= this.totalPages;
      nextBtn.classList.toggle('disabled', this.currentPage >= this.totalPages);
    }
  }

  changePage(direction) {
    const newPage = this.currentPage + direction;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.renderTable(this.filteredData);
      
      // Scroll to top of table
      document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async refreshTable(forceRefresh = false) {
    if (this.isLoading) return;
    
    console.log('🔄 Refreshing trends table...');
    this.currentData = await this.fetchTrendingData(forceRefresh);
    this.filterAndSortData();
  }

  viewChart(videoId) {
    console.log(`📊 Opening chart for video: ${videoId}`);
    const item = this.currentData.find(d => d.video_id === videoId);
    
    if (item) {
      // Store selected item in sessionStorage for the dashboard
      sessionStorage.setItem('selectedTrend', JSON.stringify(item));
      window.open(`index.html?highlight=${videoId}`, '_blank');
    }
  }

  async createAlert(videoId) {
    console.log(`🚨 Creating alert for video: ${videoId}`);
    const item = this.currentData.find(d => d.video_id === videoId);
    
    if (!item) return;

    try {
      // Here you would typically save the alert to your backend
      const alert = {
        video_id: videoId,
        title: item.title,
        threshold_type: 'engagement_change',
        threshold_value: 10, // 10% change
        created_at: new Date().toISOString()
      };

      // For now, just show a confirmation
      this.showNotification(`Alert created for: ${item.title}`, 'success');
      
      // Store alert in localStorage (temporary solution)
      const alerts = JSON.parse(localStorage.getItem('trendAlerts') || '[]');
      alerts.push(alert);
      localStorage.setItem('trendAlerts', JSON.stringify(alerts));
      
    } catch (error) {
      console.error('Failed to create alert:', error);
      this.showNotification('Failed to create alert', 'error');
    }
  }

  showLoading() {
    if (this.isLoading) return;
    this.isLoading = true;

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading trending data...</div>
      </div>
    `;
    document.body.appendChild(this.loadingOverlay);
  }

  hideLoading() {
    this.isLoading = false;
    if (this.loadingOverlay) {
      this.loadingOverlay.remove();
      this.loadingOverlay = null;
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

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

  attachEventListeners() {
    // Filter change listeners with debouncing
    const debouncedFilter = this.debounce(() => this.filterAndSortData(), CONFIG.DEBOUNCE_DELAY);
    
    document.getElementById('categoryFilter')?.addEventListener('change', debouncedFilter);
    document.getElementById('sortBy')?.addEventListener('change', debouncedFilter);
    document.getElementById('timeRange')?.addEventListener('change', debouncedFilter);

    // Pagination listeners
    document.getElementById('prevBtn')?.addEventListener('click', () => this.changePage(-1));
    document.getElementById('nextBtn')?.addEventListener('click', () => this.changePage(1));

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshTable(true));

    // Table action buttons using event delegation
    document.getElementById('trendsTableBody')?.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.classList.contains('btn-chart')) {
        const videoId = target.dataset.videoId;
        if (videoId) this.viewChart(videoId);
      } else if (target.classList.contains('btn-alert')) {
        const videoId = target.dataset.videoId;
        if (videoId) this.createAlert(videoId);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.key) {
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) this.changePage(-1);
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) this.changePage(1);
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.refreshTable(true);
          }
          break;
      }
    });
  }
}

// Initialize on DOM load
let trendsTable;

document.addEventListener('DOMContentLoaded', async () => {
  trendsTable = new TrendsTable();
  await trendsTable.init();
});

// Export for global access
window.trendsTable = trendsTable;