/**
 * Advanced WaveScope Timeline with D3.js
 * Interactive timeline visualization with anomaly detection and forecasting
 */

class WaveScopeTimelineD3 {
  constructor(containerSelector, options = {}) {
    this.container = d3.select(containerSelector);
    this.options = {
      width: options.width || 1200,
      height: options.height || 600,
      margin: { top: 40, right: 80, bottom: 60, left: 80 },
      animationDuration: options.animationDuration || 1000,
      showAnomalies: options.showAnomalies !== false,
      showForecasts: options.showForecasts !== false,
      interactive: options.interactive !== false,
      ...options
    };
    
    this.innerWidth = this.options.width - this.options.margin.left - this.options.margin.right;
    this.innerHeight = this.options.height - this.options.margin.top - this.options.margin.bottom;
    
    // Data storage
    this.data = {
      trends: [],
      anomalies: [],
      forecasts: [],
      currentTimeRange: '24h'
    };
    
    // D3 scales and generators
    this.scales = {
      x: null,
      y: null,
      color: null
    };
    
    this.line = null;
    this.area = null;
    
    // State management
    this.state = {
      selectedTrends: new Set(),
      hoveredTrend: null,
      zoomTransform: null,
      animationQueue: []
    };
    
    // Event handlers
    this.eventHandlers = {
      onTrendSelect: options.onTrendSelect || (() => {}),
      onAnomalyClick: options.onAnomalyClick || (() => {}),
      onTimeRangeChange: options.onTimeRangeChange || (() => {})
    };
    
    this.initializeVisualization();
  }

  /**
   * Initialize the D3 visualization
   */
  initializeVisualization() {
    console.log('🎨 Initializing D3 WaveScope Timeline...');
    
    // Clear existing content
    this.container.selectAll('*').remove();
    
    // Create main SVG
    this.svg = this.container
      .append('svg')
      .attr('width', this.options.width)
      .attr('height', this.options.height)
      .attr('class', 'wavescope-timeline-svg');
    
    // Create defs for patterns and gradients
    this.createDefinitions();
    
    // Create main group with margins
    this.g = this.svg
      .append('g')
      .attr('transform', `translate(${this.options.margin.left},${this.options.margin.top})`);
    
    // Create component groups
    this.createComponentGroups();
    
    // Initialize scales
    this.initializeScales();
    
    // Create axes
    this.createAxes();
    
    // Add zoom behavior
    if (this.options.interactive) {
      this.addZoomBehavior();
    }
    
    // Create tooltip
    this.createTooltip();
    
    // Add legend
    this.createLegend();
    
    console.log('✅ D3 Timeline initialized');
  }

  /**
   * Create SVG definitions for patterns and gradients
   */
  createDefinitions() {
    this.defs = this.svg.append('defs');
    
    // Gradient for trend lines
    const gradient = this.defs
      .append('linearGradient')
      .attr('id', 'trendGradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#5ee3ff')
      .attr('stop-opacity', 0.8);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#8b5cf6')
      .attr('stop-opacity', 0.3);
    
    // Pattern for anomaly regions
    const anomalyPattern = this.defs
      .append('pattern')
      .attr('id', 'anomalyPattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8);
    
    anomalyPattern.append('rect')
      .attr('width', 8)
      .attr('height', 8)
      .attr('fill', '#ff4444')
      .attr('opacity', 0.1);
    
    anomalyPattern.append('path')
      .attr('d', 'M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6')
      .attr('stroke', '#ff4444')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);
    
    // Glow filter for viral trends
    const glowFilter = this.defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', 3)
      .attr('result', 'coloredBlur');
    
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  /**
   * Create component groups for organized rendering
   */
  createComponentGroups() {
    this.groups = {
      background: this.g.append('g').attr('class', 'background-group'),
      anomalies: this.g.append('g').attr('class', 'anomalies-group'),
      forecasts: this.g.append('g').attr('class', 'forecasts-group'),
      trends: this.g.append('g').attr('class', 'trends-group'),
      points: this.g.append('g').attr('class', 'points-group'),
      annotations: this.g.append('g').attr('class', 'annotations-group'),
      overlay: this.g.append('g').attr('class', 'overlay-group')
    };
  }

  /**
   * Initialize D3 scales
   */
  initializeScales() {
    // Time scale for x-axis
    this.scales.x = d3.scaleTime()
      .range([0, this.innerWidth]);
    
    // Linear scale for y-axis (WaveScore 0-100)
    this.scales.y = d3.scaleLinear()
      .domain([0, 100])
      .range([this.innerHeight, 0]);
    
    // Color scale for different trends
    this.scales.color = d3.scaleOrdinal()
      .range([
        '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981',
        '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f472b6'
      ]);
    
    // Line generator
    this.line = d3.line()
      .x(d => this.scales.x(new Date(d.timestamp)))
      .y(d => this.scales.y(d.wave_score))
      .curve(d3.curveCatmullRom.alpha(0.5));
    
    // Area generator for confidence intervals
    this.area = d3.area()
      .x(d => this.scales.x(new Date(d.timestamp)))
      .y0(d => this.scales.y(d.confidence_lower || d.wave_score - 5))
      .y1(d => this.scales.y(d.confidence_upper || d.wave_score + 5))
      .curve(d3.curveCatmullRom.alpha(0.5));
  }

  /**
   * Create axes with labels
   */
  createAxes() {
    // X-axis
    this.xAxis = d3.axisBottom(this.scales.x)
      .tickFormat(d3.timeFormat('%H:%M'))
      .tickSize(-this.innerHeight)
      .tickPadding(10);
    
    this.xAxisGroup = this.g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${this.innerHeight})`);
    
    // Y-axis
    this.yAxis = d3.axisLeft(this.scales.y)
      .tickSize(-this.innerWidth)
      .tickPadding(10);
    
    this.yAxisGroup = this.g
      .append('g')
      .attr('class', 'y-axis');
    
    // Axis labels
    this.g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - this.options.margin.left + 20)
      .attr('x', 0 - (this.innerHeight / 2))
      .attr('text-anchor', 'middle')
      .text('WaveScore');
    
    this.g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', `translate(${this.innerWidth / 2}, ${this.innerHeight + this.options.margin.bottom - 10})`)
      .attr('text-anchor', 'middle')
      .text('Time');
  }

  /**
   * Add zoom and pan behavior
   */
  addZoomBehavior() {
    this.zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .extent([[0, 0], [this.innerWidth, this.innerHeight]])
      .on('zoom', (event) => this.handleZoom(event));
    
    this.svg.call(this.zoom);
  }

  /**
   * Create interactive tooltip
   */
  createTooltip() {
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'wavescope-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', '#fff')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('border', '1px solid #5ee3ff')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
  }

  /**
   * Create legend
   */
  createLegend() {
    this.legend = this.svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.options.width - 150}, ${this.options.margin.top})`);
  }

  /**
   * Load and display trend data
   */
  async loadTrendData(timeRange = '24h') {
    console.log(`📊 Loading trend data for ${timeRange}...`);
    
    try {
      // Update current time range
      this.data.currentTimeRange = timeRange;
      
      // Load trend data
      const trendData = await this.fetchTrendData(timeRange);
      this.data.trends = trendData;
      
      // Load anomalies if enabled
      if (this.options.showAnomalies) {
        const anomalies = await this.fetchAnomalies(timeRange);
        this.data.anomalies = anomalies;
      }
      
      // Load forecasts if enabled
      if (this.options.showForecasts) {
        const forecasts = await this.fetchForecasts();
        this.data.forecasts = forecasts;
      }
      
      // Update scales based on data
      this.updateScales();
      
      // Render the visualization
      this.render();
      
      console.log(`✅ Loaded ${trendData.length} trends, ${this.data.anomalies.length} anomalies`);
      
    } catch (error) {
      console.error('❌ Failed to load trend data:', error);
      this.showError('Failed to load trend data');
    }
  }

  /**
   * Fetch trend data from API or generate demo data
   */
  async fetchTrendData(timeRange) {
    try {
      const hours = parseInt(timeRange.replace('h', ''));
      const response = await fetch(`${window.location.origin}/api/wavescores/latest?hours=${hours}&limit=100`);
      
      if (response.ok) {
        const result = await response.json();
        return this.processTrendData(result.data || []);
      }
    } catch (error) {
      console.warn('⚠️ API unavailable, generating demo data');
    }
    
    // Generate demo data
    return this.generateDemoTrendData(timeRange);
  }

  /**
   * Generate demo trend data for testing
   */
  generateDemoTrendData(timeRange) {
    const hours = parseInt(timeRange.replace('h', ''));
    const dataPoints = Math.min(100, hours * 2); // 2 points per hour
    const categories = ['AI Tools', 'Crypto', 'Gaming', 'Technology', 'Entertainment'];
    const trends = [];
    
    categories.forEach((category, categoryIndex) => {
      const trendData = [];
      let baseScore = 30 + Math.random() * 40; // Start between 30-70
      
      for (let i = 0; i < dataPoints; i++) {
        const timestamp = new Date(Date.now() - (dataPoints - i) * (hours * 60 * 60 * 1000) / dataPoints);
        
        // Add some realistic variation
        const variation = (Math.random() - 0.5) * 10;
        const trend = Math.sin(i * 0.1) * 5; // Some trending pattern
        baseScore = Math.max(5, Math.min(95, baseScore + variation + trend));
        
        // Occasionally add viral spikes
        if (Math.random() < 0.05) {
          baseScore = Math.min(95, baseScore + 20);
        }
        
        trendData.push({
          timestamp: timestamp.toISOString(),
          wave_score: Math.round(baseScore * 100) / 100,
          trend_id: `${category.toLowerCase()}_trend`,
          category: category,
          confidence: 0.7 + Math.random() * 0.3,
          platform_source: ['youtube', 'reddit', 'tiktok'][Math.floor(Math.random() * 3)]
        });
      }
      
      trends.push({
        trend_id: `${category.toLowerCase()}_trend`,
        category: category,
        color: this.scales.color(categoryIndex),
        data: trendData,
        visible: true
      });
    });
    
    return trends;
  }

  /**
   * Fetch anomaly data
   */
  async fetchAnomalies(timeRange) {
    // For demo, generate some anomalies
    const anomalies = [];
    const now = Date.now();
    const hours = parseInt(timeRange.replace('h', ''));
    
    // Generate 3-5 random anomalies
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      const anomalyTime = new Date(now - Math.random() * hours * 60 * 60 * 1000);
      
      anomalies.push({
        id: `anomaly_${i}`,
        timestamp: anomalyTime.toISOString(),
        type: ['spike', 'drop', 'unusual_pattern'][Math.floor(Math.random() * 3)],
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        score: 70 + Math.random() * 30,
        trend_id: this.data.trends[Math.floor(Math.random() * this.data.trends.length)]?.trend_id,
        description: 'Anomalous activity detected'
      });
    }
    
    return anomalies;
  }

  /**
   * Fetch forecast data
   */
  async fetchForecasts() {
    // For demo, generate forecasts for each trend
    const forecasts = [];
    const now = Date.now();
    
    this.data.trends.forEach(trend => {
      if (trend.data.length > 0) {
        const lastPoint = trend.data[trend.data.length - 1];
        const forecastPoints = [];
        
        // Generate 6 hours of forecast
        for (let i = 1; i <= 6; i++) {
          const forecastTime = new Date(now + i * 60 * 60 * 1000);
          const baseScore = lastPoint.wave_score;
          const variation = (Math.random() - 0.5) * 10;
          const projectedScore = Math.max(5, Math.min(95, baseScore + variation));
          
          forecastPoints.push({
            timestamp: forecastTime.toISOString(),
            wave_score: projectedScore,
            confidence_lower: projectedScore - 5,
            confidence_upper: projectedScore + 5,
            is_forecast: true
          });
        }
        
        forecasts.push({
          trend_id: trend.trend_id,
          data: forecastPoints
        });
      }
    });
    
    return forecasts;
  }

  /**
   * Process and normalize trend data
   */
  processTrendData(rawData) {
    const trendMap = new Map();
    
    rawData.forEach(item => {
      const trendId = item.trend_id;
      
      if (!trendMap.has(trendId)) {
        trendMap.set(trendId, {
          trend_id: trendId,
          category: item.category || 'Unknown',
          color: this.scales.color(trendMap.size),
          data: [],
          visible: true
        });
      }
      
      trendMap.get(trendId).data.push({
        timestamp: item.calculated_at || item.timestamp,
        wave_score: item.wave_score || 0,
        confidence: item.confidence || 0.8,
        platform_source: item.platform_source || 'unknown'
      });
    });
    
    // Sort data points by timestamp
    trendMap.forEach(trend => {
      trend.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });
    
    return Array.from(trendMap.values());
  }

  /**
   * Update scales based on current data
   */
  updateScales() {
    if (this.data.trends.length === 0) return;
    
    // Get time extent from all trends
    const allTimestamps = [];
    this.data.trends.forEach(trend => {
      trend.data.forEach(point => {
        allTimestamps.push(new Date(point.timestamp));
      });
    });
    
    // Add forecast timestamps
    this.data.forecasts.forEach(forecast => {
      forecast.data.forEach(point => {
        allTimestamps.push(new Date(point.timestamp));
      });
    });
    
    if (allTimestamps.length > 0) {
      this.scales.x.domain(d3.extent(allTimestamps));
    }
  }

  /**
   * Main render function
   */
  render() {
    console.log('🎨 Rendering WaveScope Timeline...');
    
    // Update axes
    this.updateAxes();
    
    // Render anomaly regions
    if (this.options.showAnomalies) {
      this.renderAnomalies();
    }
    
    // Render trend lines
    this.renderTrends();
    
    // Render forecast projections
    if (this.options.showForecasts) {
      this.renderForecasts();
    }
    
    // Update legend
    this.updateLegend();
    
    // Add interactions
    if (this.options.interactive) {
      this.addInteractions();
    }
    
    console.log('✅ Timeline rendered');
  }

  /**
   * Update axes with animation
   */
  updateAxes() {
    this.xAxisGroup
      .transition()
      .duration(this.options.animationDuration)
      .call(this.xAxis);
    
    this.yAxisGroup
      .transition()
      .duration(this.options.animationDuration)
      .call(this.yAxis);
  }

  /**
   * Render anomaly regions
   */
  renderAnomalies() {
    const anomalyGroups = this.groups.anomalies
      .selectAll('.anomaly')
      .data(this.data.anomalies, d => d.id);
    
    // Enter new anomalies
    const anomalyEnter = anomalyGroups
      .enter()
      .append('g')
      .attr('class', 'anomaly')
      .style('opacity', 0);
    
    // Add anomaly markers
    anomalyEnter
      .append('circle')
      .attr('r', 8)
      .attr('fill', d => this.getAnomalySeverityColor(d.severity))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'url(#glow)');
    
    // Add anomaly labels
    anomalyEnter
      .append('text')
      .attr('class', 'anomaly-label')
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(d => d.type.toUpperCase());
    
    // Update all anomalies
    anomalyGroups
      .merge(anomalyEnter)
      .transition()
      .duration(this.options.animationDuration)
      .style('opacity', 1)
      .attr('transform', d => `translate(${this.scales.x(new Date(d.timestamp))}, ${this.scales.y(d.score)})`);
    
    // Remove old anomalies
    anomalyGroups
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .style('opacity', 0)
      .remove();
  }

  /**
   * Render trend lines
   */
  renderTrends() {
    const trendGroups = this.groups.trends
      .selectAll('.trend-group')
      .data(this.data.trends.filter(t => t.visible), d => d.trend_id);
    
    // Enter new trends
    const trendEnter = trendGroups
      .enter()
      .append('g')
      .attr('class', 'trend-group');
    
    // Add trend paths
    trendEnter
      .append('path')
      .attr('class', 'trend-line')
      .attr('fill', 'none')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');
    
    // Add confidence area
    trendEnter
      .append('path')
      .attr('class', 'confidence-area')
      .attr('fill-opacity', 0.2);
    
    // Update all trends
    const trendUpdate = trendGroups.merge(trendEnter);
    
    // Update trend lines
    trendUpdate
      .select('.trend-line')
      .transition()
      .duration(this.options.animationDuration)
      .attr('stroke', d => d.color)
      .attr('d', d => this.line(d.data))
      .style('filter', d => {
        const maxScore = d3.max(d.data, p => p.wave_score);
        return maxScore > 80 ? 'url(#glow)' : 'none';
      });
    
    // Update confidence areas
    trendUpdate
      .select('.confidence-area')
      .transition()
      .duration(this.options.animationDuration)
      .attr('fill', d => d.color)
      .attr('d', d => this.area(d.data));
    
    // Remove old trends
    trendGroups
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .style('opacity', 0)
      .remove();
    
    // Add data points
    this.renderDataPoints();
  }

  /**
   * Render individual data points
   */
  renderDataPoints() {
    const allPoints = [];
    this.data.trends
      .filter(t => t.visible)
      .forEach(trend => {
        trend.data.forEach(point => {
          allPoints.push({
            ...point,
            trend_id: trend.trend_id,
            color: trend.color,
            category: trend.category
          });
        });
      });
    
    const points = this.groups.points
      .selectAll('.data-point')
      .data(allPoints, d => `${d.trend_id}_${d.timestamp}`);
    
    // Enter new points
    const pointsEnter = points
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('r', 0);
    
    // Update all points
    points
      .merge(pointsEnter)
      .transition()
      .duration(this.options.animationDuration)
      .attr('cx', d => this.scales.x(new Date(d.timestamp)))
      .attr('cy', d => this.scales.y(d.wave_score))
      .attr('r', d => Math.max(2, d.confidence * 4))
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('opacity', 0.8);
    
    // Remove old points
    points
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .attr('r', 0)
      .remove();
  }

  /**
   * Render forecast projections
   */
  renderForecasts() {
    const forecastGroups = this.groups.forecasts
      .selectAll('.forecast-group')
      .data(this.data.forecasts, d => d.trend_id);
    
    // Enter new forecasts
    const forecastEnter = forecastGroups
      .enter()
      .append('g')
      .attr('class', 'forecast-group');
    
    // Add forecast lines
    forecastEnter
      .append('path')
      .attr('class', 'forecast-line')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .style('opacity', 0.7);
    
    // Add confidence bands
    forecastEnter
      .append('path')
      .attr('class', 'forecast-confidence')
      .attr('fill-opacity', 0.1);
    
    // Update forecasts
    const forecastUpdate = forecastGroups.merge(forecastEnter);
    
    // Get trend colors for forecasts
    const trendColorMap = new Map();
    this.data.trends.forEach(trend => {
      trendColorMap.set(trend.trend_id, trend.color);
    });
    
    // Update forecast lines
    forecastUpdate
      .select('.forecast-line')
      .transition()
      .duration(this.options.animationDuration)
      .attr('stroke', d => trendColorMap.get(d.trend_id) || '#666')
      .attr('d', d => this.line(d.data));
    
    // Update confidence bands
    forecastUpdate
      .select('.forecast-confidence')
      .transition()
      .duration(this.options.animationDuration)
      .attr('fill', d => trendColorMap.get(d.trend_id) || '#666')
      .attr('d', d => this.area(d.data));
    
    // Remove old forecasts
    forecastGroups
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .style('opacity', 0)
      .remove();
  }

  /**
   * Update legend
   */
  updateLegend() {
    const legendItems = this.legend
      .selectAll('.legend-item')
      .data(this.data.trends, d => d.trend_id);
    
    // Enter new legend items
    const legendEnter = legendItems
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .style('cursor', 'pointer');
    
    // Add legend rectangles
    legendEnter
      .append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2);
    
    // Add legend text
    legendEnter
      .append('text')
      .attr('x', 18)
      .attr('y', 6)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('fill', '#fff');
    
    // Update all legend items
    const legendUpdate = legendItems.merge(legendEnter);
    
    legendUpdate
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .style('opacity', d => d.visible ? 1 : 0.5);
    
    legendUpdate
      .select('rect')
      .attr('fill', d => d.color);
    
    legendUpdate
      .select('text')
      .text(d => d.category);
    
    // Add click handlers
    legendUpdate
      .on('click', (event, d) => this.toggleTrend(d.trend_id));
    
    // Remove old legend items
    legendItems
      .exit()
      .remove();
  }

  /**
   * Add interactive behaviors
   */
  addInteractions() {
    // Add hover effects for data points
    this.groups.points
      .selectAll('.data-point')
      .on('mouseover', (event, d) => this.showTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());
    
    // Add click handlers for anomalies
    this.groups.anomalies
      .selectAll('.anomaly')
      .style('cursor', 'pointer')
      .on('click', (event, d) => this.eventHandlers.onAnomalyClick(d));
  }

  /**
   * Show tooltip with trend information
   */
  showTooltip(event, data) {
    const tooltip = this.tooltip;
    const formatTime = d3.timeFormat('%Y-%m-%d %H:%M');
    
    tooltip.transition()
      .duration(200)
      .style('opacity', 0.9);
    
    tooltip.html(`
      <div style="font-weight: bold; margin-bottom: 8px;">${data.category}</div>
      <div>WaveScore: <span style="color: #5ee3ff;">${data.wave_score.toFixed(1)}</span></div>
      <div>Confidence: ${(data.confidence * 100).toFixed(0)}%</div>
      <div>Platform: ${data.platform_source}</div>
      <div>Time: ${formatTime(new Date(data.timestamp))}</div>
    `)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.transition()
      .duration(200)
      .style('opacity', 0);
  }

  /**
   * Toggle trend visibility
   */
  toggleTrend(trendId) {
    const trend = this.data.trends.find(t => t.trend_id === trendId);
    if (trend) {
      trend.visible = !trend.visible;
      this.render();
      this.eventHandlers.onTrendSelect(trendId, trend.visible);
    }
  }

  /**
   * Handle zoom events
   */
  handleZoom(event) {
    const { transform } = event;
    this.state.zoomTransform = transform;
    
    // Update x scale
    const newXScale = transform.rescaleX(this.scales.x);
    
    // Update axes
    this.xAxisGroup.call(this.xAxis.scale(newXScale));
    
    // Update trend lines
    this.groups.trends
      .selectAll('.trend-line')
      .attr('d', d => this.line.x(point => newXScale(new Date(point.timestamp)))(d.data));
    
    // Update data points
    this.groups.points
      .selectAll('.data-point')
      .attr('cx', d => newXScale(new Date(d.timestamp)));
    
    // Update anomalies
    this.groups.anomalies
      .selectAll('.anomaly')
      .attr('transform', d => `translate(${newXScale(new Date(d.timestamp))}, ${this.scales.y(d.score)})`);
  }

  /**
   * Get color for anomaly severity
   */
  getAnomalySeverityColor(severity) {
    const colors = {
      'low': '#fbbf24',
      'medium': '#f97316',
      'high': '#ef4444',
      'critical': '#dc2626'
    };
    return colors[severity] || colors.medium;
  }

  /**
   * Show error message
   */
  showError(message) {
    this.groups.overlay
      .selectAll('.error-message')
      .remove();
    
    this.groups.overlay
      .append('text')
      .attr('class', 'error-message')
      .attr('x', this.innerWidth / 2)
      .attr('y', this.innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ef4444')
      .attr('font-size', '16px')
      .text(message);
  }

  /**
   * Update time range and reload data
   */
  async updateTimeRange(newTimeRange) {
    if (newTimeRange !== this.data.currentTimeRange) {
      await this.loadTrendData(newTimeRange);
      this.eventHandlers.onTimeRangeChange(newTimeRange);
    }
  }

  /**
   * Resize the visualization
   */
  resize(newWidth, newHeight) {
    this.options.width = newWidth;
    this.options.height = newHeight;
    this.innerWidth = newWidth - this.options.margin.left - this.options.margin.right;
    this.innerHeight = newHeight - this.options.margin.top - this.options.margin.bottom;
    
    // Update SVG dimensions
    this.svg
      .attr('width', newWidth)
      .attr('height', newHeight);
    
    // Update scales
    this.scales.x.range([0, this.innerWidth]);
    this.scales.y.range([this.innerHeight, 0]);
    
    // Re-render
    this.render();
  }

  /**
   * Destroy the visualization
   */
  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    this.container.selectAll('*').remove();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaveScopeTimelineD3;
}

// Global assignment for direct HTML usage
if (typeof window !== 'undefined') {
  window.WaveScopeTimelineD3 = WaveScopeTimelineD3;
}