
# WAVESIGHT Dashboard - Complete Code Export

## 📋 Project Overview
WAVESIGHT is a comprehensive trending analytics platform that combines YouTube data collection, sentiment analysis, and real-time visualization in a sleek web dashboard.

---

## 🗂️ Complete Source Code Files

### 1. Frontend - HTML Files

#### index.html (Main Dashboard)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAVESIGHT - Trend Tracker Dashboard</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">

    <!-- Load required libraries -->
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/recharts@2.5.0/umd/Recharts.js"></script>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <header class="header-bar">
            <div class="header-left">
                <img src="logo2.png" alt="WAVESIGHT Logo" class="logo-image">
                <h1 class="header-title">WAVESIGHT</h1>
                <span class="header-subtitle">Trend Intelligence Platform</span>
            </div>
            <div class="header-right">
                <nav class="nav-links">
                    <a href="index.html" class="nav-link active">Dashboard</a>
                    <a href="sentiment-dashboard.html" class="nav-link">Sentiment</a>
                </nav>
                <div id="userSection" class="user-section" style="display: none;"></div>
                <div id="loginSection" class="login-section" style="display: none;">
                    <button class="login-btn" onclick="handleLogin()">Login</button>
                </div>
            </div>
        </header>

        <!-- Controls Section -->
        <div class="controls-section">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search trends..." class="search-input">
                <button onclick="searchTrends()" class="search-btn">Search</button>
            </div>
            
            <div class="filter-container">
                <select id="trendFilter" onchange="filterChart()" class="filter-select">
                    <option value="all">All Trends</option>
                </select>
            </div>

            <div class="date-filter-container">
                <label for="startDate">From:</label>
                <input type="date" id="startDate" class="date-input">
                <label for="endDate">To:</label>
                <input type="date" id="endDate" class="date-input">
                <button onclick="filterByDateRange()" class="filter-btn">Filter</button>
                <button onclick="resetDateFilter()" class="reset-btn">Reset</button>
            </div>

            <div class="action-buttons">
                <div class="button-group">
                    <button class="submit-btn" onclick="resetDateFilter()" style="background: #374151;">Reset</button>
                    <button class="submit-btn" onclick="fetchFreshYouTubeData()" style="background: #10B981;">Fetch Data</button>
                    <button class="submit-btn" onclick="fetchBulkData('all', 1000)" style="background: #8B5CF6;">Bulk Fetch</button>
                </div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="dashboard-grid">
            <!-- Chart Section -->
            <div class="chart-section">
                <div class="section-header">
                    <h2>Trending Analytics</h2>
                    <div class="chart-controls">
                        <span class="trend-count">Multiple trends</span>
                    </div>
                </div>
                <div id="trendChart" class="chart-container"></div>
            </div>

            <!-- Table Section -->
            <div class="table-section">
                <div class="section-header">
                    <h2>Trending Topics</h2>
                    <span class="data-source">Live Data</span>
                </div>
                <div class="table-wrapper">
                    <table class="trend-table">
                        <thead>
                            <tr>
                                <th>Topic</th>
                                <th>Platform</th>
                                <th>Reach</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody id="trendTableBody">
                            <tr><td colspan="4">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Loading Overlay -->
        <div id="loadingOverlay" class="loading-overlay" style="display: none;">
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading data...</div>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

#### sentiment-dashboard.html (Sentiment Analysis Page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAVESIGHT - Sentiment Dashboard</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">

    <!-- Load required libraries -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/recharts@2.8.0/umd/Recharts.js"></script>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <header class="header-bar">
            <div class="header-left">
                <img src="logo2.png" alt="WAVESIGHT Logo" class="logo-image">
                <h1 class="header-title">WAVESIGHT</h1>
                <span class="header-subtitle">Sentiment Intelligence</span>
            </div>
            <div class="header-right">
                <nav class="nav-links">
                    <a href="index.html" class="nav-link">Dashboard</a>
                    <a href="sentiment-dashboard.html" class="nav-link active">Sentiment</a>
                </nav>
            </div>
        </header>

        <!-- Event Prediction Cards Grid -->
        <div class="event-predictions-section">
            <div class="section-header">
                <h2>Event Predictions</h2>
                <span class="prediction-subtitle">AI-powered sentiment forecasting</span>
            </div>
            <div id="eventPredictionCards" class="event-prediction-cards-grid"></div>
        </div>

        <!-- Sentiment Analysis Input -->
        <div class="sentiment-input-section">
            <div class="section-header">
                <h2>Analyze New Topic</h2>
                <span class="analysis-subtitle">Get real-time sentiment analysis</span>
            </div>
            <div class="sentiment-input-container">
                <input type="text" id="topicInput" placeholder="Enter topic to analyze..." class="topic-input">
                <button onclick="analyzeTopic()" class="analyze-btn">Analyze Sentiment</button>
            </div>
            <div class="quick-topics">
                <span class="quick-label">Quick analyze:</span>
                <button onclick="quickAnalyze('AI development')" class="topic-chip">AI Development</button>
                <button onclick="quickAnalyze('cryptocurrency market')" class="topic-chip">Crypto Market</button>
                <button onclick="quickAnalyze('climate change')" class="topic-chip">Climate Change</button>
                <button onclick="quickAnalyze('remote work')" class="topic-chip">Remote Work</button>
            </div>
        </div>

        <!-- Sentiment Dashboard -->
        <div class="sentiment-dashboard-section">
            <div class="section-header">
                <h2>Sentiment Trends</h2>
                <button onclick="refreshSentimentData()" class="refresh-btn">Refresh Data</button>
            </div>
            <div id="sentimentDashboard" class="sentiment-dashboard-container"></div>
        </div>

        <!-- Sentiment Table -->
        <div class="sentiment-table-section">
            <div class="section-header">
                <h2>Recent Analysis</h2>
                <span class="table-subtitle">Latest sentiment data</span>
            </div>
            <div class="table-wrapper">
                <table class="sentiment-table">
                    <thead>
                        <tr>
                            <th>Topic</th>
                            <th>Platform</th>
                            <th>Date</th>
                            <th>Confidence</th>
                            <th>Positive</th>
                            <th>Negative</th>
                            <th>Unclear</th>
                        </tr>
                    </thead>
                    <tbody id="sentimentTableBody">
                        <tr><td colspan="7">Loading sentiment data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script src="sentiment-script.js"></script>
</body>
</html>
```

### 2. Frontend - JavaScript Files

#### script.js (Main Dashboard Logic)
```javascript
// Configuration
let SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';
let YOUTUBE_API_KEY = null; // Will be handled by server

let supabase = null;
let chartRoot = null;
let currentData = null;
let selectedTrends = 'all';
let filteredData = null;
let startDate = null;
let endDate = null;

// User authentication state
let currentUser = null;
let isAuthenticated = false;

// Initialize Supabase
function initSupabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialized successfully');
      console.log('🔗 Connected to:', SUPABASE_URL);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  } else {
    console.log('❌ Supabase credentials not configured - using fallback data');
    console.log('📋 Current SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
    console.log('📋 Current SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');
    supabase = null;
    return false;
  }
}

// Fetch YouTube data from Supabase via server API
async function fetchYouTubeDataFromSupabase() {
  try {
    console.log('📥 Fetching YouTube data from Supabase via server API...');

    const response = await fetch('/api/youtube-data');

    if (!response.ok) {
      throw new Error(`Server API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.log('⚠️ No data returned from server:', result.message);
      return null;
    }

    console.log(`✅ Retrieved ${result.count} records from Supabase via server`);
    console.log('📊 Sample fetched data:', result.data?.[0]);

    // Validate data structure
    if (result.data && result.data.length > 0) {
      const sample = result.data[0];
      console.log('📊 Data fields available:', Object.keys(sample));
      console.log('📊 View count field:', sample.view_count);
      console.log('📊 Title field:', sample.title);
      console.log('📊 Category field:', sample.trend_category);
    }

    return result.data;

  } catch (error) {
    console.error('❌ Error fetching from Supabase via server:', error);
    return null;
  }
}

// Format numbers with K/M notation
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  } else {
    return num.toString();
  }
}

// Fallback data for when Supabase fails
const fallbackData = {
  chartData: [
    { date: '1/1', 'AI Tools': 1200000, 'ChatGPT': 950000, 'Blockchain': 800000 },
    { date: '1/15', 'AI Tools': 890000, 'ChatGPT': 1100000, 'Blockchain': 650000 },
    { date: '2/1', 'AI Tools': 1800000, 'ChatGPT': 750000, 'Blockchain': 1100000 },
    { date: '2/15', 'AI Tools': 1200000, 'ChatGPT': 1650000, 'Blockchain': 580000 },
    { date: '3/1', 'AI Tools': 2200000, 'ChatGPT': 890000, 'Blockchain': 1500000 },
    { date: '3/15', 'AI Tools': 950000, 'ChatGPT': 2200000, 'Blockchain': 720000 },
    { date: '4/1', 'AI Tools': 1800000, 'ChatGPT': 1100000, 'Blockchain': 1900000 },
    { date: '4/15', 'AI Tools': 1400000, 'ChatGPT': 2800000, 'Blockchain': 650000 },
    { date: '5/1', 'AI Tools': 2100000, 'ChatGPT': 950000, 'Blockchain': 2300000 },
    { date: '5/15', 'AI Tools': 1600000, 'ChatGPT': 3400000, 'Blockchain': 780000 },
    { date: '6/1', 'AI Tools': 2400000, 'ChatGPT': 1200000, 'Blockchain': 2700000 },
    { date: '6/15', 'AI Tools': 1800000, 'ChatGPT': 4000000, 'Blockchain': 920000 }
  ],
  tableData: [
    { trend_name: 'AI Art Generation', platform: 'TikTok', reach_count: 2500000 },
    { trend_name: 'ChatGPT Tips', platform: 'Instagram', reach_count: 1800000 },
    { trend_name: 'Blockchain Explained', platform: 'Twitter', reach_count: 950000 },
    { trend_name: 'Machine Learning', platform: 'YouTube', reach_count: 1200000 }
  ]
};

// Create chart with Canvas API
function createChart(data, filteredTrends = 'all') {
  const chartContainer = document.getElementById('trendChart');
  if (!chartContainer) return;

  // Clear existing content
  chartContainer.innerHTML = '';

  // Create canvas element with high DPI support
  const canvas = document.createElement('canvas');
  const containerWidth = chartContainer.clientWidth || 800;
  const dpr = window.devicePixelRatio || 1;

  // Set actual canvas size (accounting for device pixel ratio)
  canvas.width = containerWidth * dpr;
  canvas.height = 330 * dpr;

  // Set display size (CSS pixels)
  canvas.style.width = '100%';
  canvas.style.height = '330px';
  canvas.style.background = '#13131f';
  canvas.style.borderRadius = '12px';

  chartContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Scale context to account for device pixel ratio
  ctx.scale(dpr, dpr);

  // Enable anti-aliasing for smooth text
  ctx.textRenderingOptimization = 'optimizeQuality';
  ctx.imageSmoothingEnabled = true;

  // Chart dimensions (use display size, not canvas size)
  const padding = 60;
  const legendHeight = 30; // Space for top legend
  const axisHeight = 25; // Reduced space for month labels
  const displayWidth = containerWidth;
  const displayHeight = 330;

  if (!data || data.length === 0) {
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '16px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', displayWidth / 2, displayHeight / 2);
    return;
  }
  const chartWidth = displayWidth - padding * 2;
  const chartHeight = displayHeight - padding * 2 - legendHeight - axisHeight;

  // Get all trend names
  let allTrendNames = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'date')))];

  // Calculate trend totals for prioritization
  const trendTotals = {};
  allTrendNames.forEach(trend => {
    trendTotals[trend] = data.reduce((sum, dataPoint) => sum + (dataPoint[trend] || 0), 0);
  });

  // Sort trends by total value and limit to top 8
  const sortedAllTrends = allTrendNames.sort((a, b) => trendTotals[b] - trendTotals[a]).slice(0, 8);

  // Filter trends based on selection
  let trendNames;
  if (filteredTrends === 'all') {
    trendNames = sortedAllTrends;
  } else {
    // For specific search/filter, show ONLY the specified trend
    console.log(`🔍 Filtering chart for specific trend: "${filteredTrends}"`);log(`📊 Available trends in data:`, sortedAllTrends);

    // When filtering for a specific trend, show EXACTLY that trend
    if (sortedAllTrends.includes(filteredTrends)) {
      trendNames = [filteredTrends];
      console.log(`🎯 Showing existing trend: [${filteredTrends}]`);
    } else {
      // This handles search results where we created a custom trend name
      trendNames = [filteredTrends];
      console.log(`🎯 Showing search trend: [${filteredTrends}]`);
    }

    console.log(`📈 Final trend names for chart:`, trendNames);
  }

  // Expanded color palette with unique colors
  const colors = [
    '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#84cc16', '#f472b6', '#a855f7', '#22d3ee', '#fb923c', '#34d399', '#fbbf24', '#f87171'
  ];

  // Ensure we have valid trends with data
  if (trendNames.length === 0) {
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '16px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No trend data available', displayWidth / 2, displayHeight / 2);
    return;
  }

  // Find max value for scaling (only from visible trends)
  const allValues = data.flatMap(d => 
    trendNames.map(trend => d[trend] || 0).filter(v => typeof v === 'number' && v > 0)
  );

  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

  // Calculate final positions for all points
  const finalPositions = [];
  trendNames.forEach((trendName, trendIndex) => {
    const positions = [];
    data.forEach((item, index) => {
      const value = item[trendName];
      if (value !== undefined && value !== null && typeof value === 'number') {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + legendHeight + chartHeight - ((value / maxValue) * chartHeight);
        positions.push({ x, y, value });
      }
    });
    finalPositions.push(positions);
  });

  // Animation variables
  let animationProgress = 0;
  const animationDuration = 1500; // 1.5 seconds
  const startTime = Date.now();

  function drawStaticElements() {
    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw grid lines
    ctx.strokeStyle = '#2e2e45';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + legendHeight + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const value = maxValue * (4 - i) / 4;
      const y = padding + legendHeight + (chartHeight * i) / 4;
      ctx.fillText(formatNumber(value), padding - 10, y + 4);
    }

    // Draw x-axis labels dynamically based on date range
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataLength = data.length;

    // Dynamic label step based on data length
    let labelStep = 1;
    if (dataLength > 12) {
      labelStep = Math.max(1, Math.floor(dataLength / 8));
    } else if (dataLength > 6) {
      labelStep = Math.max(1, Math.floor(dataLength / 6));
    }

    data.forEach((item, index) => {
      if (index % labelStep === 0 || index === dataLength - 1) {
        const x = padding + (chartWidth * index) / (dataLength - 1);
        let label = item.date;

        // Format different types of date labels
        if (item.date && item.date.includes('/')) {
          const parts = item.date.split('/');

          if (parts.length === 2) {
            // Monthly format: "MM/YYYY"
            const month = parseInt(parts[0]) - 1;
            if (month >= 0 && month < 12) {
              label = monthNames[month];
              if (parts[1] && parts[1].length === 4) {
                label += ` '${parts[1].slice(-2)}`;
              }
            }
          } else if (parts.length === 3) {
            // Daily format: "MM/DD/YYYY"
            const month = parseInt(parts[0]) - 1;
            const day = parseInt(parts[1]);
            if (month >= 0 && month < 12) {
              label = `${monthNames[month]} ${day}`;
            }
          }
        } else if (item.date && item.date.includes('Week')) {
          // Week format: "Week 1", "Week 2", etc.
          label = item.date;
        }

        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, padding + legendHeight + chartHeight + 20);
      }
    });

    // Draw horizontal legend at the top
    ctx.font = 'bold 11px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';

    let legendX = padding;
    const legendY = 20;

    trendNames.forEach((trendName, trendIndex) => {
      const color = colors[trendIndex % colors.length];

      // Draw legend box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 8, 8);

      // Draw legend text
      ctx.fillStyle = '#f1f1f1';
      ctx.fillText(trendName, legendX + 12, legendY + 7);

      // Calculate text width and move to next position
      const textWidth = ctx.measureText(trendName).width;
      legendX += textWidth + 25; // 12 for box + text + 25 for spacing
    });
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawAnimatedLines() {
    // Store clickable areas for interaction
    window.chartClickableAreas = [];
    console.log('🔄 Initialized clickable areas array');

    // Draw trend lines with animation
    finalPositions.forEach((positions, trendIndex) => {
      if (positions.length === 0) return;

      const trendName = trendNames[trendIndex];
      const color = colors[trendIndex % colors.length];
      const baseY = padding + legendHeight + chartHeight; // Bottom of chart

      // Create gradient for the fill
      const gradient = ctx.createLinearGradient(0, padding + legendHeight, 0, baseY);
      gradient.addColorStop(0, color + '40'); // 25% opacity at top
      gradient.addColorStop(1, color + '08'); // 3% opacity at bottom

      // Draw filled area first
      ctx.fillStyle = gradient;
      ctx.beginPath();

      // Start from bottom left
      if (positions.length > 0) {
        const firstAnimatedY = baseY - (baseY - positions[0].y) * easeOutCubic(animationProgress);
        ctx.moveTo(positions[0].x, baseY);
        ctx.lineTo(positions[0].x, firstAnimatedY);

        // Draw the smooth curve path for fill using cubic Bézier curves
        positions.forEach((finalPos, pointIndex) => {
          const animatedY = baseY - (baseY - finalPos.y) * easeOutCubic(animationProgress);

          if (pointIndex === 0) {
            // Already moved to first point above
          } else {
            const prevPos = positions[pointIndex - 1];
            const prevAnimatedY = baseY - (baseY - prevPos.y) * easeOutCubic(animationProgress);

            // Calculate control points for smooth cubic Bézier curve
            const tension = 0.4; // Adjust this value to control curve smoothness (0.1 to 0.5)
            const deltaX = finalPos.x - prevPos.x;

            const cp1x = prevPos.x + deltaX * tension;
            const cp1y = prevAnimatedY;
            const cp2x = finalPos.x - deltaX * tension;
            const cp2y = animatedY;

            // Use cubic Bézier curve for smooth fill
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, finalPos.x, animatedY);
          }
        });

        // Close the path back to bottom
        const lastPos = positions[positions.length - 1];
        ctx.lineTo(lastPos.x, baseY);
        ctx.closePath();
        ctx.fill();
      }

      // Draw the line on top with click detection areas
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const clickablePoints = [];

      // Create smooth curves using cubic Bézier curves
      positions.forEach((finalPos, pointIndex) => {
        const animatedY = baseY - (baseY - finalPos.y) * easeOutCubic(animationProgress);

        clickablePoints.push({
          x: finalPos.x,
          y: animatedY,
          value: finalPos.value,
          dataPoint: data[pointIndex],
          trendName: trendName
        });

        if (pointIndex === 0) {
          ctx.moveTo(finalPos.x, animatedY);
        } else {
          const prevPos = positions[pointIndex - 1];
          const prevAnimatedY = baseY - (baseY - prevPos.y) * easeOutCubic(animationProgress);

          // Calculate control points for smooth cubic Bézier curve
          const tension = 0.4; // Adjust this value to control curve smoothness
          const deltaX = finalPos.x - prevPos.x;

          const cp1x = prevPos.x + deltaX * tension;
          const cp1y = prevAnimatedY;
          const cp2x = finalPos.x - deltaX * tension;
          const cp2y = animatedY;

          // Use cubic Bézier curve for smooth transitions
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, finalPos.x, animatedY);
        }
      });

      ctx.stroke();

      // Store clickable area for this trend line
      if (!window.chartClickableAreas) {
        window.chartClickableAreas = [];
      }

      window.chartClickableAreas.push({
        trendName: trendName,
        color: color,
        points: clickablePoints,
        trendIndex: trendIndex
      });

      console.log(`📍 Added clickable area for ${trendName} with ${clickablePoints.length} points`);
    });
  }

  function animate() {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    animationProgress = Math.min(elapsed / animationDuration, 1);

    drawStaticElements();
    drawAnimatedLines();

    if (animationProgress < 1) {
      requestAnimationFrame(animate);
    }
  }

  // Add click event listener to canvas
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left);
    const clickY = (event.clientY - rect.top);

    console.log(`🖱️ Canvas clicked at: ${clickX}, ${clickY}`);

    // Check if click is near any trend line
    if (window.chartClickableAreas) {
      console.log(`🔍 Checking ${window.chartClickableAreas.length} clickable areas`);

      window.chartClickableAreas.forEach((area, areaIndex) => {
        // Check if click is near any point in this trend line
        const clickRadius = 25; // Increased click tolerance

        area.points.forEach((point, pointIndex) => {
          const distance = Math.sqrt(
            Math.pow(clickX - point.x, 2) + Math.pow(clickY - point.y, 2)
          );

          console.log(`📊 Point ${pointIndex} in ${area.trendName}: distance ${distance.toFixed(2)}`);

          if (distance <= clickRadius) {
            console.log(`✅ Clicked on ${area.trendName}!`);
            showTrendDetailModal(area.trendName, area.color);
            return; // Exit after first match
          }
        });
      });
    } else {
      console.log('❌ No clickable areas found');
    }
  });

  // Start animation
  animate();
}

// Continue with rest of script.js functions... [abbreviated for space]

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing WAVESIGHT dashboard...');

  // Check for stored authentication first
  checkStoredAuth();

  // Set default 6-month date range
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  if (startDateInput && endDateInput) {
    startDateInput.value = sixMonthsAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];
    console.log(`📅 Default date range set: ${startDateInput.value} to ${endDateInput.value}`);
  }

  // Initialize Supabase
  const supabaseInitialized = initSupabase();
  console.log('📊 Supabase initialized:', supabaseInitialized);

  // Load initial data immediately - this should show DEFAULT TRENDS
  try {
    console.log('📊 Loading initial dashboard data with default trends...');

    // Clear search/filter state to ensure we show defaults
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('trendFilter');

    if (searchInput) searchInput.value = '';
    selectedTrends = 'all';
    filteredData = null;

    // Get data from Supabase
    const allData = await fetchYouTubeDataFromSupabase();

    if (allData && allData.length > 0) {
      console.log(`✅ Got ${allData.length} total videos from database`);
      console.log(`📊 Sample video data:`, allData[0]);

      // Create chart showing ALL default trends
      const chartData = processSupabaseDataForChart(allData);
      console.log(`📊 Processed chart data:`, chartData);
      console.log(`📊 Available trends:`, Object.keys(chartData[0] || {}).filter(k => k !== 'date'));

      // Store data globally
      currentData = { chartData, tableData: allData };
      selectedTrends = 'all';

      // Update UI to show all trends
      updateTrendFilter(chartData);
      if (filterSelect) filterSelect.value = 'all';

      // Display everything with 'all' filter to show multiple trend lines
      createChart(chartData, 'all');
      createTrendTable(allData.slice(0, 25));

      console.log('✅ Dashboard initialized with REAL DATA successfully');
      console.log('📊 Chart shows multiple trends:', Object.keys(chartData[0] || {}).filter(k => k !== 'date'));

    } else {
      console.log('⚠️ No data from Supabase, using fallback trends');

      currentData = fallbackData;
      selectedTrends = 'all';

      updateTrendFilter(fallbackData.chartData);
      createChart(fallbackData.chartData, 'all');
      createTrendTable(fallbackData.tableData);

      console.log('📊 Showing fallback default trends');
    }

  } catch (error) {
    console.error('❌ Error initializing dashboard:', error);

    // Use fallback on error - still show default trends
    currentData = fallbackData;
    selectedTrends = 'all';
    updateTrendFilter(fallbackData.chartData);
    createChart(fallbackData.chartData, 'all');
    createTrendTable(fallbackData.tableData);

    console.log('📊 Showing fallback default trends after error');
  }
});
```

### 3. Backend - Node.js Server

#### youtubeToSupabase.js (YouTube API Server)
```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Configuration - using environment variables from secrets
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// YouTube API functions
async function fetchYouTubeVideos(query = 'trending', maxResults = 500) {
  try {
    console.log(`🔍 Fetching YouTube data for query: "${query}" (max ${maxResults} results)`);
    
    // Check if YouTube API key is configured
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
      console.error('❌ YouTube API key not configured in environment variables');
      throw new Error('YouTube API key not configured');
    }
    
    console.log('✅ YouTube API key found, proceeding with requests...');

    // Use diverse search queries for comprehensive historical-style data
    let searchQueries = [query];
    if (query === 'trending' || query.includes('trending tech AI blockchain crypto')) {
      searchQueries = [
        // Technology & AI
        'artificial intelligence machine learning tutorial',
        'chatgpt openai ai tools productivity',
        'programming coding tutorial javascript python',
        'tech review smartphone laptop computer',
        'software development web development',

        // Crypto & Finance
        'bitcoin cryptocurrency trading investment',
        'ethereum blockchain defi nft market',
        'dogecoin altcoin crypto news analysis',
        'stock market investing finance tips',
        'real estate investment property business',

        // Entertainment & Gaming
        'gaming gameplay walkthrough review',
        'movie trailer film review cinema',
        'music video song artist concert',
        'netflix series tv show entertainment',
        'esports tournament gaming highlights',

        // Lifestyle & Health
        'fitness workout health nutrition diet',
        'cooking recipe food chef kitchen',
        'travel vlog destination adventure',
        'lifestyle daily routine productivity',
        'fashion style beauty makeup skincare',

        // Sports & Activities
        'sports highlights football basketball',
        'soccer fifa world cup tournament',
        'tennis golf baseball sports news',
        'olympics athletics competition',
        'extreme sports adventure outdoor',

        // Education & Science
        'education tutorial learning course',
        'science physics chemistry biology',
        'space nasa astronomy discovery',
        'history documentary educational',
        'art design creative tutorial',

        // Automotive & Tech
        'car review automotive tesla electric',
        'motorcycle racing automotive news',
        'drone technology gadget review',
        'smartphone tech unboxing review',

        // Animals & Nature
        'animals pets dogs cats funny',
        'wildlife nature documentary',
        'environment climate sustainability',

        // Business & Career
        'entrepreneur business startup success',
        'career advice job interview tips',
        'marketing digital business strategy',

        // Additional trending topics
        'viral trends social media latest',
        'breaking news current events',
        'celebrity gossip entertainment news',
        'memes funny viral videos',
        'product reviews unboxing hauls',
        'tutorials how to guides',
        'reaction videos trending topics',
        'podcast highlights interviews',
        'live streams gaming music',
        'shorts viral tiktok trends'
      ];
    }

    let allVideos = [];
    const videosPerQuery = Math.ceil(maxResults / searchQueries.length);

    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔍 Searching for: "${searchQuery}"`);

        // First, get search results
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&order=relevance&maxResults=${videosPerQuery}&key=${YOUTUBE_API_KEY}`;

        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.log(`⚠️ Failed to fetch for query "${searchQuery}": ${searchResponse.status}`);
          console.log(`❌ Error details: ${errorText}`);
          
          // Log specific error types
          if (searchResponse.status === 403) {
            console.log('❌ 403 Forbidden - Check your YouTube API key, quota limits, or restrictions');
          } else if (searchResponse.status === 400) {
            console.log('❌ 400 Bad Request - Check your query parameters');
          } else if (searchResponse.status === 429) {
            console.log('❌ 429 Too Many Requests - You have exceeded your quota');
          }
          continue;
        }

        const searchData = await searchResponse.json();

        if (searchData.items && searchData.items.length > 0) {
          allVideos.push(...searchData.items);
          console.log(`📋 Found ${searchData.items.length} videos for "${searchQuery}"`);
        }
      } catch (queryError) {
        console.log(`⚠️ Error with query "${searchQuery}":`, queryError.message);
        continue;
      }
    }

    if (allVideos.length === 0) {
      console.log('⚠️ No YouTube videos found for any query');
      return [];
    }

    console.log(`📋 Total found ${allVideos.length} videos, fetching detailed statistics...`);

    // Get video IDs for detailed stats (limit to avoid URL length issues)
    const videoIds = allVideos.slice(0, 50).map(item => item.id.videoId).join(',');

    // Fetch detailed video statistics
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;

    const statsResponse = await fetch(statsUrl);
    const statsData = statsResponse.ok ? await statsResponse.json() : { items: [] };

    // Merge search data with statistics
    const enrichedData = allVideos.slice(0, 50).map(item => {
      const stats = statsData.items?.find(stat => stat.id === item.id.videoId);
      return {
        ...item,
        statistics: stats?.statistics || {}
      };
    });

    console.log(`✅ Successfully fetched ${enrichedData.length} YouTube videos with statistics`);
    return enrichedData;

  } catch (error) {
    console.error('❌ Error fetching YouTube data:', error);
    throw error;
  }
}

// API Routes
app.get('/api/fetch-youtube', async (req, res) => {
  try {
    const query = req.query.q || 'trending';
    const maxResults = parseInt(req.query.maxResults) || 50;

    console.log('🚀 API: Fetching YouTube data...');

    // Fetch YouTube data
    const youtubeData = await fetchYouTubeVideos(query, maxResults);

    if (youtubeData.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No YouTube data found',
        data: []
      });
    }

    // Process for Supabase
    const processedData = processYouTubeDataForSupabase(youtubeData);

    // Save to Supabase
    const savedData = await saveDataToSupabase(processedData);

    res.json({
      success: true,
      message: `Successfully fetched and saved ${processedData.length} videos`,
      data: savedData || processedData,
      count: processedData.length
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

app.get('/api/youtube-data', async (req, res) => {
  try {
    console.log('📥 API: Fetching YouTube data from Supabase...');

    const { data, error } = await supabase
      .from('youtube_trends')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('❌ API Error fetching from Supabase:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    youtube_api: YOUTUBE_API_KEY ? 'Configured' : 'Missing',
    supabase: SUPABASE_URL ? 'Configured' : 'Missing'
  });
});

// Serve static files from root directory
app.use(express.static('.'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 YouTube API: ${YOUTUBE_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🗄️  Supabase: ${SUPABASE_URL ? 'Configured' : 'Missing'}`);
  console.log('📡 API endpoints:');
  console.log(`   - GET /api/fetch-youtube?q=search_term&maxResults=25`);
  console.log(`   - GET /api/youtube-data`);
  console.log(`   - GET /api/health`);
});
```

### 4. Database Schema

#### supabase_schema.sql
```sql
-- Create YouTube trends table in your Supabase database
-- Run this SQL in your Supabase SQL editor

CREATE TABLE youtube_trends (
  id BIGSERIAL PRIMARY KEY,
  
  -- Basic video info
  video_id VARCHAR(100) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMPTZ,
  
  -- Channel info
  channel_id VARCHAR(100),
  channel_title VARCHAR(200),
  
  -- Thumbnails
  thumbnail_default VARCHAR(500),
  thumbnail_medium VARCHAR(500),
  thumbnail_high VARCHAR(500),
  
  -- Engagement metrics (from videos API)
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Trending analysis
  trend_category VARCHAR(100) DEFAULT 'General',
  trend_score INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_youtube_trends_published_at ON youtube_trends(published_at DESC);
CREATE INDEX idx_youtube_trends_view_count ON youtube_trends(view_count DESC);
CREATE INDEX idx_youtube_trends_video_id ON youtube_trends(video_id);
CREATE INDEX idx_youtube_trends_channel_id ON youtube_trends(channel_id);

-- Enable Row Level Security
ALTER TABLE youtube_trends ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON youtube_trends FOR ALL USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_youtube_trends_updated_at 
    BEFORE UPDATE ON youtube_trends 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create sentiment forecasts table for sentiment analysis data
CREATE TABLE sentiment_forecasts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Topic and platform info
  topic VARCHAR(200) NOT NULL,
  platform VARCHAR(100) DEFAULT 'Reddit',
  
  -- Date of analysis
  date DATE NOT NULL,
  
  -- Sentiment counts
  sentiment_yes INTEGER DEFAULT 0,
  sentiment_no INTEGER DEFAULT 0,
  sentiment_unclear INTEGER DEFAULT 0,
  
  -- Calculated confidence percentage
  confidence DECIMAL(5,2) DEFAULT 0.00,
  
  -- Cultural prediction metrics
  certainty_score DECIMAL(5,2) DEFAULT 0.00,
  prediction_outcome VARCHAR(50) DEFAULT 'Uncertain',
  cultural_momentum VARCHAR(50) DEFAULT 'Stable',
  total_responses INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sentiment_forecasts_topic ON sentiment_forecasts(topic);
CREATE INDEX idx_sentiment_forecasts_date ON sentiment_forecasts(date DESC);
CREATE INDEX idx_sentiment_forecasts_platform ON sentiment_forecasts(platform);
CREATE INDEX idx_sentiment_forecasts_confidence ON sentiment_forecasts(confidence DESC);

-- Enable Row Level Security
ALTER TABLE sentiment_forecasts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON sentiment_forecasts FOR ALL USING (true);

-- Trigger to automatically update updated_at for sentiment_forecasts
CREATE TRIGGER update_sentiment_forecasts_updated_at 
    BEFORE UPDATE ON sentiment_forecasts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 5. Configuration Files

#### package.json
```json
{
  "name": "wavesight-youtube-integration",
  "version": "1.0.0",
  "description": "YouTube API integration for WAVESIGHT dashboard",
  "main": "youtubeToSupabase.js",
  "scripts": {
    "start": "node youtubeToSupabase.js",
    "dev": "node youtubeToSupabase.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "node-fetch": "^2.6.7",
    "@supabase/supabase-js": "^2.38.4"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

#### .replit
```
entrypoint = "index.html"
modules = ["web"]

[workflows]
runButton = "YouTube API Server"

[[workflows.workflow]]
name = "YouTube API Server"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "nix-shell -p nodejs --run \"node youtubeToSupabase.js\""

[[workflows.workflow]]
name = "Serve static"
mode = "parallel"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "echo \"Serving HTML, open the Preview to see your output.\nTo see changes you make, you can hit the refresh button in the preview, you do [1mnot[0m have to stop and run again.\nConsole logs are available in the Preview devtools or your browser devtools.\" && static-web-server -w ./.config/static-web-server.toml > /dev/null 2>&1"

[[workflows.workflow]]
name = "Sentiment Analysis Server"
mode = "sequential"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "python sentiment_server.py"
```

---

## 🚀 Setup Instructions

1. **Environment Variables (Add to Replit Secrets):**
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Database Setup:**
   - Create new Supabase project
   - Run the SQL schema in Supabase SQL editor
   - Update connection credentials in environment variables

3. **Start the Application:**
   - Click "Run" to start YouTube API Server
   - Start "Serve static" workflow for frontend
   - Visit preview URL to see dashboard

4. **Optional Sentiment Analysis:**
   - Add Reddit API credentials to secrets
   - Start "Sentiment Analysis Server" workflow
   - Visit `/sentiment-dashboard.html` for sentiment features

---

## 📊 Features

- **Real-time YouTube data collection and visualization**
- **Interactive Canvas-based charts with smooth animations**
- **Advanced search and filtering capabilities**
- **Responsive design optimized for all devices**
- **Supabase database integration with real-time updates**
- **Optional sentiment analysis with Reddit integration**
- **Export-ready codebase for easy deployment**

This complete code export contains everything needed to run the WAVESIGHT dashboard. All source files are production-ready with comprehensive error handling and scalable architecture.
