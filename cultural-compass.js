// Cultural Compass - Interactive Cultural Trend Mapping System
// Multi-dimensional analysis of cultural trends based on Reddit sentiment and social momentum

class CulturalCompass {
  constructor() {
    // Configuration
    this.config = {
      canvas: {
        width: 800,
        height: 600,
        padding: 60
      },
      axes: {
        xAxis: 'mainstream', // Current X-axis dimension
        yAxis: 'traditional', // Current Y-axis dimension
        colorDimension: 'sentiment' // Current color coding
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutCubic'
      },
      colors: {
        positive: '#10b981',
        negative: '#ef4444',
        neutral: '#9ca3af',
        high: '#5ee3ff',
        medium: '#8b5cf6',
        low: '#64748b'
      }
    };

    // State management
    this.state = {
      currentData: null,
      selectedTrend: null,
      isLoading: false,
      lastUpdate: null,
      compass: null,
      tooltip: null
    };

    // Cultural dimension mappings
    this.dimensions = {
      mainstream: {
        name: 'Mainstream ↔ Underground',
        calculate: (trend) => this.calculateMainstreamScore(trend)
      },
      appeal: {
        name: 'Mass Appeal ↔ Subcultural Depth', 
        calculate: (trend) => this.calculateAppealScore(trend)
      },
      adoption: {
        name: 'Early Adopter ↔ Late Majority',
        calculate: (trend) => this.calculateAdoptionScore(trend)
      },
      traditional: {
        name: 'Traditional ↔ Disruptive',
        calculate: (trend) => this.calculateDisruptionScore(trend)
      },
      sentiment: {
        name: 'Sentimental ↔ Ironic/Detached',
        calculate: (trend) => this.calculateSentimentScore(trend)
      },
      energy: {
        name: 'High Energy ↔ Chill/Laid Back',
        calculate: (trend) => this.calculateEnergyScore(trend)
      }
    };

    // Initialize
    this.init();
  }

  async init() {
    console.log('🧭 Initializing Cultural Compass...');
    
    try {
      // Load cultural trend data
      await this.loadCulturalData();
      
      // Initialize compass visualization
      this.initializeCompass();
      
      // Set up event listeners
      this.initializeEventListeners();
      
      // Update metrics display
      this.updateMetrics();
      
      // Initialize legend
      this.initializeLegend();
      
      console.log('✅ Cultural Compass initialized successfully');
    } catch (error) {
      console.error('❌ Cultural Compass initialization failed:', error);
      this.showErrorState();
    }
  }

  async loadCulturalData() {
    this.state.isLoading = true;
    
    try {
      // Try to fetch real cultural data
      const response = await fetch('/api/cultural-trends');
      
      if (response.ok) {
        this.state.currentData = await response.json();
        console.log('✅ Real cultural data loaded');
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.warn('⚠️ Using mock cultural data for compass analysis');
      this.state.currentData = this.generateMockCulturalData();
    }
    
    this.state.isLoading = false;
    this.state.lastUpdate = Date.now();
  }

  generateMockCulturalData() {
    const culturalTrends = [
      // Tech & Innovation
      { id: 1, name: 'AI Art Generation', category: 'Technology', mentions: 15420, sentiment: 0.7, platform: 'reddit', subreddit: 'technology', engagement: 892, velocity: 0.8, age_days: 2 },
      { id: 2, name: 'Crypto Winter Recovery', category: 'Finance', mentions: 8934, sentiment: -0.2, platform: 'reddit', subreddit: 'cryptocurrency', engagement: 1203, velocity: 0.3, age_days: 7 },
      { id: 3, name: 'Remote Work Evolution', category: 'Lifestyle', mentions: 12890, sentiment: 0.4, platform: 'reddit', subreddit: 'careeradvice', engagement: 567, velocity: 0.1, age_days: 14 },
      
      // Entertainment & Media
      { id: 4, name: 'Netflix Password Sharing', category: 'Entertainment', mentions: 23450, sentiment: -0.6, platform: 'reddit', subreddit: 'netflix', engagement: 2341, velocity: 0.9, age_days: 1 },
      { id: 5, name: 'TikTok Algorithm Changes', category: 'Social Media', mentions: 19283, sentiment: -0.3, platform: 'reddit', subreddit: 'tiktok', engagement: 1876, velocity: 0.7, age_days: 3 },
      { id: 6, name: 'Indie Game Renaissance', category: 'Gaming', mentions: 7621, sentiment: 0.8, platform: 'reddit', subreddit: 'indiegaming', engagement: 923, velocity: 0.4, age_days: 5 },
      
      // Fashion & Lifestyle
      { id: 7, name: 'Sustainable Fashion', category: 'Fashion', mentions: 9812, sentiment: 0.6, platform: 'reddit', subreddit: 'fashion', engagement: 734, velocity: 0.2, age_days: 10 },
      { id: 8, name: 'Cottage Core Aesthetic', category: 'Lifestyle', mentions: 6543, sentiment: 0.5, platform: 'reddit', subreddit: 'cottagecore', engagement: 456, velocity: 0.1, age_days: 21 },
      { id: 9, name: 'Urban Gardening', category: 'Lifestyle', mentions: 4321, sentiment: 0.7, platform: 'reddit', subreddit: 'gardening', engagement: 321, velocity: 0.3, age_days: 8 },
      
      // Political & Social
      { id: 10, name: 'Digital Privacy Rights', category: 'Politics', mentions: 11234, sentiment: 0.2, platform: 'reddit', subreddit: 'privacy', engagement: 987, velocity: 0.5, age_days: 4 },
      { id: 11, name: 'Climate Activism', category: 'Environment', mentions: 18765, sentiment: 0.3, platform: 'reddit', subreddit: 'climatechange', engagement: 1432, velocity: 0.6, age_days: 6 },
      { id: 12, name: 'Gen Z Workplace Values', category: 'Culture', mentions: 13456, sentiment: 0.4, platform: 'reddit', subreddit: 'genz', engagement: 1098, velocity: 0.4, age_days: 9 },
      
      // Niche & Emerging
      { id: 13, name: 'Micro-Dosing Wellness', category: 'Health', mentions: 3210, sentiment: 0.1, platform: 'reddit', subreddit: 'microdosing', engagement: 287, velocity: 0.7, age_days: 12 },
      { id: 14, name: 'Dark Academia Style', category: 'Fashion', mentions: 5432, sentiment: 0.6, platform: 'reddit', subreddit: 'darkacademia', engagement: 423, velocity: 0.2, age_days: 18 },
      { id: 15, name: 'Minimalist Tech', category: 'Technology', mentions: 4567, sentiment: 0.5, platform: 'reddit', subreddit: 'minimalism', engagement: 345, velocity: 0.3, age_days: 15 }
    ];

    return {
      trends: culturalTrends,
      lastUpdate: Date.now(),
      totalTrends: culturalTrends.length,
      avgSentiment: culturalTrends.reduce((sum, t) => sum + t.sentiment, 0) / culturalTrends.length,
      viralTrends: culturalTrends.filter(t => t.velocity > 0.7).length,
      emergingTrends: culturalTrends.filter(t => t.mentions < 8000 && t.velocity > 0.5).length
    };
  }

  // Calculate cultural dimension scores (0-100 scale)
  calculateMainstreamScore(trend) {
    // Higher mentions and popular subreddits = more mainstream
    const mentionScore = Math.min(trend.mentions / 20000, 1) * 60;
    const subredditScore = this.getSubredditMainstreamScore(trend.subreddit) * 40;
    return Math.round(mentionScore + subredditScore);
  }

  calculateAppealScore(trend) {
    // Broad engagement vs niche depth
    const engagementRatio = trend.engagement / trend.mentions;
    const categoryScore = this.getCategoryAppealScore(trend.category);
    return Math.round((engagementRatio * 50 + categoryScore * 50));
  }

  calculateAdoptionScore(trend) {
    // New trends vs established ones
    const ageScore = Math.max(0, (30 - trend.age_days) / 30) * 70;
    const velocityScore = trend.velocity * 30;
    return Math.round(ageScore + velocityScore);
  }

  calculateDisruptionScore(trend) {
    // How disruptive vs traditional the trend is
    const categoryDisruption = this.getCategoryDisruptionScore(trend.category);
    const sentimentFactor = Math.abs(trend.sentiment) * 30; // Controversial = more disruptive
    const velocityFactor = trend.velocity * 20;
    return Math.round(categoryDisruption + sentimentFactor + velocityFactor);
  }

  calculateSentimentScore(trend) {
    // Emotional vs detached
    return Math.round(((trend.sentiment + 1) / 2) * 100);
  }

  calculateEnergyScore(trend) {
    // High energy vs chill
    const velocityEnergy = trend.velocity * 60;
    const engagementEnergy = Math.min(trend.engagement / 2000, 1) * 40;
    return Math.round(velocityEnergy + engagementEnergy);
  }

  getSubredditMainstreamScore(subreddit) {
    const scores = {
      technology: 85, worldnews: 90, gaming: 80, netflix: 85,
      tiktok: 95, cryptocurrency: 60, privacy: 40, climatechange: 70,
      indiegaming: 30, fashion: 75, cottagecore: 20, gardening: 50,
      genz: 70, microdosing: 15, darkacademia: 25, minimalism: 35,
      careeradvice: 65
    };
    return scores[subreddit] || 50;
  }

  getCategoryAppealScore(category) {
    const scores = {
      Technology: 70, Finance: 60, Entertainment: 85, 'Social Media': 90,
      Gaming: 75, Fashion: 80, Lifestyle: 70, Politics: 65,
      Environment: 60, Culture: 75, Health: 55
    };
    return scores[category] || 60;
  }

  getCategoryDisruptionScore(category) {
    const scores = {
      Technology: 80, Finance: 70, Entertainment: 50, 'Social Media': 85,
      Gaming: 60, Fashion: 45, Lifestyle: 40, Politics: 90,
      Environment: 75, Culture: 55, Health: 65
    };
    return scores[category] || 50;
  }

  initializeCompass() {
    const compassChart = document.getElementById('compassChart');
    if (!compassChart) return;

    // Create trend points
    this.renderTrendPoints();
    
    // Update axis labels based on current selection
    this.updateAxisLabels();

    console.log('🧭 Compass visualization initialized');
  }

  renderTrendPoints() {
    const compassChart = document.getElementById('compassChart');
    const existingPoints = compassChart.querySelectorAll('.trend-point');
    existingPoints.forEach(point => point.remove());

    if (!this.state.currentData) return;

    const containerWidth = 800;
    const containerHeight = 600;
    const padding = 60;

    this.state.currentData.trends.forEach((trend, index) => {
      const xScore = this.dimensions[this.config.axes.xAxis].calculate(trend);
      const yScore = this.dimensions[this.config.axes.yAxis].calculate(trend);
      
      // Convert scores to canvas coordinates
      const x = padding + ((100 - xScore) / 100) * (containerWidth - 2 * padding);
      const y = padding + (yScore / 100) * (containerHeight - 2 * padding);
      
      // Create trend point
      const point = document.createElement('div');
      point.className = 'trend-point';
      point.style.left = `${x}px`;
      point.style.top = `${y}px`;
      point.style.background = this.getColorForDimension(trend, this.config.axes.colorDimension);
      point.title = trend.name;
      
      // Add click handler
      point.addEventListener('click', () => this.selectTrend(trend));
      point.addEventListener('mouseenter', (e) => this.showTooltip(e, trend));
      point.addEventListener('mouseleave', () => this.hideTooltip());
      
      compassChart.appendChild(point);
    });
  }

  getColorForDimension(trend, dimension) {
    const value = this.dimensions[dimension].calculate(trend);
    
    switch (dimension) {
      case 'sentiment':
        if (value > 70) return this.config.colors.positive;
        if (value < 30) return this.config.colors.negative;
        return this.config.colors.neutral;
      
      case 'velocity':
        if (trend.velocity > 0.7) return this.config.colors.high;
        if (trend.velocity > 0.4) return this.config.colors.medium;
        return this.config.colors.low;
      
      case 'momentum':
        const momentum = trend.velocity * trend.engagement / 1000;
        if (momentum > 1) return this.config.colors.high;
        if (momentum > 0.5) return this.config.colors.medium;
        return this.config.colors.low;
      
      default:
        return this.config.colors.medium;
    }
  }

  updateAxisLabels() {
    const xDimension = this.dimensions[this.config.axes.xAxis];
    const yDimension = this.dimensions[this.config.axes.yAxis];
    
    const [xLeft, xRight] = xDimension.name.split(' ↔ ');
    const [yBottom, yTop] = yDimension.name.split(' ↔ ');
    
    document.getElementById('leftLabel').textContent = xLeft;
    document.getElementById('rightLabel').textContent = xRight;
    document.getElementById('bottomLabel').textContent = yBottom;
    document.getElementById('topLabel').textContent = yTop;
    
    // Update quadrant descriptions
    const quadrants = document.querySelectorAll('.quadrant div');
    if (quadrants.length >= 4) {
      quadrants[0].innerHTML = `${xRight}<br>${yTop}`;
      quadrants[1].innerHTML = `${xLeft}<br>${yTop}`;
      quadrants[2].innerHTML = `${xLeft}<br>${yBottom}`;
      quadrants[3].innerHTML = `${xRight}<br>${yBottom}`;
    }
  }

  showTooltip(event, trend) {
    const tooltip = document.getElementById('trendTooltip');
    if (!tooltip) return;

    const xScore = this.dimensions[this.config.axes.xAxis].calculate(trend);
    const yScore = this.dimensions[this.config.axes.yAxis].calculate(trend);
    const colorScore = this.dimensions[this.config.axes.colorDimension].calculate(trend);

    tooltip.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 0.5rem; color: #5ee3ff;">${trend.name}</div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Category:</strong> ${trend.category}<br>
        <strong>Platform:</strong> r/${trend.subreddit}
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>${this.config.axes.xAxis}:</strong> ${xScore}/100<br>
        <strong>${this.config.axes.yAxis}:</strong> ${yScore}/100<br>
        <strong>${this.config.axes.colorDimension}:</strong> ${colorScore}/100
      </div>
      <div style="font-size: 0.8rem; color: #9ca3af;">
        ${trend.mentions.toLocaleString()} mentions • ${trend.engagement} engagement
      </div>
    `;

    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY - 10}px`;
    tooltip.classList.add('show');
  }

  hideTooltip() {
    const tooltip = document.getElementById('trendTooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  selectTrend(trend) {
    this.state.selectedTrend = trend;
    
    // Highlight selected point
    document.querySelectorAll('.trend-point').forEach(point => {
      point.style.transform = point.title === trend.name ? 'scale(1.5)' : 'scale(1)';
      point.style.zIndex = point.title === trend.name ? '25' : '10';
    });

    console.log(`🎯 Selected trend: ${trend.name}`);
  }

  initializeEventListeners() {
    // Axis selection changes
    document.getElementById('xAxisSelect')?.addEventListener('change', (e) => {
      this.config.axes.xAxis = e.target.value;
      this.updateAxisLabels();
      this.renderTrendPoints();
    });

    document.getElementById('yAxisSelect')?.addEventListener('change', (e) => {
      this.config.axes.yAxis = e.target.value;
      this.updateAxisLabels();
      this.renderTrendPoints();
    });

    document.getElementById('colorSelect')?.addEventListener('change', (e) => {
      this.config.axes.colorDimension = e.target.value;
      this.renderTrendPoints();
    });

    console.log('🎛️ Event listeners initialized');
  }

  updateMetrics() {
    if (!this.state.currentData) return;

    const data = this.state.currentData;
    
    document.getElementById('totalTrends').textContent = data.totalTrends;
    document.getElementById('avgSentiment').textContent = Math.round(data.avgSentiment * 100) + '%';
    document.getElementById('viralTrends').textContent = data.viralTrends;
    document.getElementById('emergingTrends').textContent = data.emergingTrends;

    console.log('📊 Metrics updated');
  }

  initializeLegend() {
    const legendContainer = document.getElementById('trendLegend');
    if (!legendContainer || !this.state.currentData) return;

    const categories = [...new Set(this.state.currentData.trends.map(t => t.category))];
    
    legendContainer.innerHTML = categories.map(category => {
      const categoryTrends = this.state.currentData.trends.filter(t => t.category === category);
      const avgSentiment = categoryTrends.reduce((sum, t) => sum + t.sentiment, 0) / categoryTrends.length;
      const color = this.getSentimentColor(avgSentiment);
      
      return `
        <div class="legend-item">
          <div class="legend-color" style="background: ${color};"></div>
          <div>
            <strong>${category}</strong> (${categoryTrends.length} trends)<br>
            <small style="color: #9ca3af;">Avg sentiment: ${Math.round(avgSentiment * 100)}%</small>
          </div>
        </div>
      `;
    }).join('');

    console.log('🏷️ Legend initialized');
  }

  getSentimentColor(sentiment) {
    if (sentiment > 0.2) return this.config.colors.positive;
    if (sentiment < -0.2) return this.config.colors.negative;
    return this.config.colors.neutral;
  }

  // Refresh compass data
  async refreshCompass() {
    console.log('🔄 Refreshing Cultural Compass data...');
    await this.loadCulturalData();
    this.renderTrendPoints();
    this.updateMetrics();
    this.initializeLegend();
  }

  showErrorState() {
    const container = document.querySelector('.container');
    if (container) {
      container.innerHTML += `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ef4444; color: white; padding: 2rem; border-radius: 12px; z-index: 1000;">
          <h3>⚠️ Compass Error</h3>
          <p>Unable to load cultural compass data. Please refresh the page.</p>
        </div>
      `;
    }
  }
}

// Global functions for HTML event handlers
window.analyzeTopic = function() {
  const input = document.getElementById('topicFilter');
  if (!input || !input.value.trim()) return;
  
  console.log(`🔍 Analyzing cultural topic: ${input.value}`);
  // Implement topic analysis logic
};

window.loadSentimentTrends = function() {
  console.log('📊 Loading sentiment trends...');
  // Placeholder for sentiment trend loading
};

window.updateCompass = function() {
  if (window.culturalCompass) {
    window.culturalCompass.refreshCompass();
  }
};

window.updateMetrics = function() {
  if (window.culturalCompass) {
    window.culturalCompass.updateMetrics();
  }
};

// Initialize Cultural Compass when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.culturalCompass = new CulturalCompass();
});