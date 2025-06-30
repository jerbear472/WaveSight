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

// Validate YouTube API key
async function validateYouTubeAPI() {
  try {
    console.log('🔍 Validating YouTube API key...');
    const response = await fetch('/api/validate-youtube');
    const result = await response.json();

    if (result.success) {
      console.log('✅ YouTube API key is valid');
      console.log('📊 Quota remaining:', result.quota_remaining);
      return true;
    } else {
      console.error('❌ YouTube API validation failed:', result.error);
      console.error('💡 Troubleshooting:', result.troubleshooting);
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating YouTube API:', error);
    return false;
  }
}

// YouTube API integration
async function fetchYouTubeDataFromAPI() {
  try {
    console.log('🔍 Searching for trending videos...');
    console.log('🔍 Fetching YouTube data for query: "trending tech AI blockchain crypto" (max 25 results)');
    console.log('📡 Making direct YouTube API request...');

    // Make direct YouTube API call
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=trending%20tech%20AI%20blockchain%20crypto&type=video&order=relevance&maxResults=25&key=${YOUTUBE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      console.log('❌ No YouTube data retrieved');
      return null;
    }

    console.log('✅ Successfully fetched YouTube data from API');

    // Convert to expected format
    const processedData = searchData.items.map((item, index) => ({
      trend_name: item.snippet.title,
      platform: 'YouTube',
      reach_count: Math.floor(Math.random() * 2000000) + 500000, // Mock view count
      score: Math.floor(Math.random() * 30) + 70,
      published_at: item.snippet.publishedAt,
      video_id: item.id.videoId,
      channel_title: item.snippet.channelTitle
    }));

    // Try to save to Supabase if available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('youtube_trends')
          .upsert(processedData.map(item => ({
            video_id: item.video_id,
            title: item.trend_name,
            channel_title: item.channel_title,
            published_at: item.published_at,
            view_count: item.reach_count,
            trend_score: item.score,
            trend_category: 'Technology'
          })), { onConflict: 'video_id' });

        if (!error) {
          console.log('✅ Data saved to Supabase');
        }
      } catch (supabaseError) {
        console.log('⚠️ Could not save to Supabase:', supabaseError.message);
      }
    }

    return processedData;

  } catch (error) {
    console.error('❌ Error fetching YouTube data:', error);
    console.log('❌ No YouTube data retrieved');
    return null;
  }
}

async function processYouTubeDataForSupabase(youtubeData) {
  if (!youtubeData) return [];

  return youtubeData.map(item => {
    const stats = item.statistics || {};
    const snippet = item.snippet;

    // Calculate trend score based on engagement
    const viewCount = parseInt(stats.viewCount) || 0;
    const likeCount = parseInt(stats.likeCount) || 0;
    const commentCount = parseInt(stats.commentCount) || 0;

    // Simple trend score calculation (0-100)
    const engagementRatio = viewCount > 0 ? (likeCount + commentCount) / viewCount * 1000 : 0;
    const trendScore = Math.min(100, Math.max(0, Math.floor(engagementRatio * 10) + 50));

    // Categorize content
    const title = snippet.title.toLowerCase();
    let category = 'General';
    if (title.includes('ai') || title.includes('artificial intelligence')) category = 'AI';
    else if (title.includes('crypto') || title.includes('blockchain')) category = 'Crypto';
    else if (title.includes('tech') || title.includes('technology')) category = 'Technology';
    else if (title.includes('gaming') || title.includes('game')) category = 'Gaming';

    return {
      video_id: item.id.videoId,
      title: snippet.title,
      description: snippet.description?.substring(0, 1000) || '',
      published_at: snippet.publishedAt,
      channel_id: snippet.channelId,
      channel_title: snippet.channelTitle,
      thumbnail_default: snippet.thumbnails?.default?.url || '',
      thumbnail_medium: snippet.thumbnails?.medium?.url || '',
      thumbnail_high: snippet.thumbnails?.high?.url || '',
      view_count: viewCount,
      like_count: likeCount,
      comment_count: commentCount,
      trend_category: category,
      trend_score: trendScore
    };
  });
}

// Note: Data saving is now handled by the server-side API
// The fetchYouTubeData function automatically saves to Supabase

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

// Test Supabase connection
async function testSupabaseConnection() {
  if (!supabase) {
    console.log('Supabase not initialized');
    return false;
  }

  try {
    console.log('Testing Supabase connection...');

    // First, let's see what tables exist
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    } else {
      console.log('Supabase connection successful! Sample data:', data);
      return true;
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
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
    // For specific search/filter, show ONLY the matching trend
    const searchTermCapitalized = filteredTrends.charAt(0).toUpperCase() + filteredTrends.slice(1);
    console.log(`🔍 Filtering chart for: "${filteredTrends}"`);
    console.log(`📊 Available trends:`, sortedAllTrends);

    // For specific searches, always create a single focused category
    trendNames = [searchTermCapitalized];
    console.log(`🎯 Creating single focused trend: [${searchTermCapitalized}]`);

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

// Function to show trend detail modal
function showTrendDetailModal(trendName, trendColor) {
  console.log(`🔍 Showing details for trend: ${trendName}`);

  // Get detailed data for this trend
  getTrendDetailData(trendName).then(detailData => {
    if (!detailData || detailData.length === 0) {
      console.log('No detail data found for trend:', trendName);
      return;
    }

    // Create modal HTML
    const modalHTML = `
      <div id="trendDetailModal" class="trend-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 style="color: ${trendColor}; margin: 0; display: flex; align-items: center;">
              <span style="width: 12px; height: 12px; background: ${trendColor}; border-radius: 50%; margin-right: 10px;"></span>
              ${trendName} Trend Details
            </h2>
            <button class="modal-close" onclick="closeTrendModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="trend-summary">
              <div class="summary-stat">
                <span class="stat-label">Total Videos:</span>
                <span class="stat-value">${detailData.length}</span>
              </div>
              <div class="summary-stat">
                <span class="stat-label">Total Views:</span>
                <span class="stat-value">${formatNumber(detailData.reduce((sum, item) => sum + (item.view_count || 0), 0))}</span>
              </div>
              <div class="summary-stat">
                <span class="stat-label">Avg Trend Score:</span>
                <span class="stat-value">${Math.round(detailData.reduce((sum, item) => sum + (item.trend_score || 0), 0) / detailData.length)}</span>
              </div>
              <div class="summary-stat">
                <span class="stat-label">Date Range:</span>
                <span class="stat-value">${getDateRange(detailData)}</span>
              </div>
            </div>
            <div class="trend-videos">
              <h3>Contributing Videos</h3>
              <div class="video-list">
                ${detailData.slice(0, 10).map(video => `
                  <div class="video-item">
                    <div class="video-thumbnail">
                      ${video.thumbnail_medium ? 
                        `<img src="${video.thumbnail_medium}" alt="Thumbnail" onerror="this.style.display='none'">` : 
                        '<div class="no-thumbnail">📹</div>'
                      }
                    </div>
                    <div class="video-details">
                      <div class="video-title">
                        ${video.video_id ? 
                          `<a href="https://www.youtube.com/watch?v=${video.video_id}" target="_blank" rel="noopener noreferrer">${video.title}</a>` :
                          video.title
                        }
                      </div>
                      <div class="video-meta">
                        <span class="channel">${video.channel_title || 'Unknown Channel'}</span>
                        <span class="views">${formatNumber(video.view_count || 0)} views</span>
                        <span class="date">${new Date(video.published_at).toLocaleDateString()}</span>
                      </div>
                      <div class="video-stats">
                        <span class="likes">👍 ${formatNumber(video.like_count || 0)}</span>
                        <span class="comments">💬 ${formatNumber(video.comment_count || 0)}</span>
                        <span class="score">📊 ${video.trend_score || 0}</span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
              ${detailData.length > 10 ? `<p class="more-videos">... and ${detailData.length - 10} more videos</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('trendDetailModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal with animation
    setTimeout(() => {
      const modal = document.getElementById('trendDetailModal');
      if (modal) {
        modal.classList.add('show');
      }
    }, 10);
  });
}

// Function to get detailed data for a specific trend
async function getTrendDetailData(trendName) {
  try {
    console.log(`📊 Fetching detail data for trend: ${trendName}`);
    console.log('📋 Current data available:', !!currentData);
    console.log('📋 Table data available:', !!currentData?.tableData);
    console.log('📋 Table data length:', currentData?.tableData?.length || 0);

    if (!currentData || !currentData.tableData) {
      console.log('No current data available');
      return [];
    }

    // Filter current data for this specific trend```text
 category
    const trendData = currentData.tableData.filter(item => {
      const category = item.trend_category || 'General';
      const title = (item.title || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const channel = (item.channel_title || '').toLowerCase();
      const trendLower = trendName.toLowerCase();

      console.log(`🔍 Checking item: category="${category}", title="${title.substring(0, 50)}..."`);

      // Match by exact category name
      if (category.toLowerCase() === trendLower) {
        console.log(`✅ Matched by category: ${category}`);
        return true;
      }

      // Check if trend name keywords appear in title, description, or channel
      const trendKeywords = getTrendKeywords(trendName);
      const matchFound = trendKeywords.some(keyword => 
        title.includes(keyword.toLowerCase()) || 
        description.includes(keyword.toLowerCase()) ||
        channel.includes(keyword.toLowerCase())
      );

      if (matchFound) {
        console.log(`✅ Matched by keywords in ${trendName}`);
      }

      return matchFound;
    });

    console.log(`📊 Filtered ${trendData.length} items for trend: ${trendName}`);

    // If we have limited data, try to fetch more from Supabase
    if (trendData.length < 5 && supabase) {
      console.log(`🔍 Limited data found (${trendData.length}), fetching more from Supabase...`);

      try {
        const { data, error } = await supabase
          .from('youtube_trends')
          .select('*')
          .eq('trend_category', trendName)
          .order('view_count', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          console.log(`✅ Found ${data.length} additional videos for ${trendName}`);
          return data;
        }
      } catch (supabaseError) {
        console.log('Could not fetch additional data from Supabase:', supabaseError);
      }
    }

    console.log(`📊 Returning ${trendData.length} videos for ${trendName}`);
    return trendData.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

  } catch (error) {
    console.error('Error fetching trend detail data:', error);
    return [];
  }
}

// Helper function to get keywords for a trend
function getTrendKeywords(trendName) {
  const keywordMap = {
    'AI Tools': ['ai', 'artificial intelligence', 'chatgpt', 'machine learning'],
    'Crypto': ['crypto', 'bitcoin', 'ethereum', 'cryptocurrency'],
    'Gaming': ['gaming', 'game', 'esports', 'streamer'],
    'Music': ['music', 'song', 'artist', 'album'],
    'Sports': ['sports', 'football', 'basketball', 'soccer'],
    'Health & Fitness': ['health', 'fitness', 'workout', 'nutrition'],
    'Movies & TV': ['movie', 'film', 'series', 'netflix'],
    'Technology': ['tech', 'technology', 'gadget', 'review'],
    'Programming': ['programming', 'coding', 'developer', 'software'],
    'Art & Design': ['art', 'design', 'creative', 'drawing'],
    'Automotive': ['car', 'automotive', 'tesla', 'vehicle'],
    'Lifestyle': ['lifestyle', 'vlog', 'daily', 'routine']
  };

  return keywordMap[trendName] || [trendName.toLowerCase()];
}

// Helper function to get date range from data
function getDateRange(data) {
  if (!data || data.length === 0) return 'No data';

  const dates = data.map(item => new Date(item.published_at)).sort((a, b) => a - b);
  const earliest = dates[0];
  const latest = dates[dates.length - 1];

  const formatDate = (date) => date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  if (earliest.getTime() === latest.getTime()) {
    return formatDate(earliest);
  }

  return `${formatDate(earliest)} - ${formatDate(latest)}`;
}

// Function to close the modal
function closeTrendModal() {
  const modal = document.getElementById('trendDetailModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Make close function globally available
window.closeTrendModal = closeTrendModal;

// Fetch data with YouTube integration
async function fetchData() {
  console.log('🚀 Fetching data with YouTube integration...');

  // Force initialize Supabase with current credentials
  const supabaseConnected = initSupabase();

  if (supabaseConnected) {
    console.log('📊 Supabase connected, checking YouTube API...');

    if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY') {
      console.log('🎥 YouTube API key found, fetching data...');

      try {
        // Fetch fresh YouTube data
        console.log('🔍 Searching for trending videos...');
        const youtubeData = await fetchYouTubeDataFromAPI('trending tech AI blockchain crypto', 25);

        if (youtubeData && youtubeData.length > 0) {
          console.log(`📋 Got ${youtubeData.length} videos from YouTube`);
          console.log('🔄 Processing YouTube data for Supabase...');
          const processedData = await processYouTubeDataForSupabase(youtubeData);

          console.log('💾 Saving to Supabase youtube_trends table...');
          const saveSuccess = await saveYouTubeDataToSupabase(processedData);

          if (saveSuccess) {
            console.log('✅ Data saved successfully to Supabase!');

            // Fetch the data we just saved
            console.log('📥 Fetching saved data from Supabase...');
            const supabaseData = await fetchYouTubeDataFromSupabase();

            if (supabaseData && supabaseData.length > 0) {
              console.log(`✅ Retrieved ${supabaseData.length} records from Supabase`);

              // Convert Supabase data to chart format
              const chartData = processSupabaseDataForChart(supabaseData);

              return {
                chartData: chartData,
                tableData: supabaseData.slice(0, 10)
              };
            }
          } else {
            console.log('❌ Failed to save data to Supabase');
          }
        } else {
          console.log('❌ No YouTube data retrieved');
        }
      } catch (error) {
        console.error('❌ Error fetching YouTube data:', error);
      }
    } else {
      console.log('❌ YouTube API key not configured');
    }

    // Try to fetch existing data from Supabase
    console.log('📥 Checking for existing data in Supabase...');
    const existingData = await fetchYouTubeDataFromSupabase();
    if (existingData && existingData.length > 0) {
      console.log(`✅ Found ${existingData.length} existing records in Supabase`);
      const chartData = processSupabaseDataForChart(existingData);
      return {
        chartData: chartData,
        tableData: existingData.slice(0, 10)
      };
    }
  } else {
    console.log('❌ Supabase connection failed');
  }

  console.log('⚠️ Falling back to mock data...');

  // Enhanced fallback data with more realistic trends
  const enhancedFallbackData = {
    chartData: [
      { date: '1/1', 'AI Tools': 1200000, 'ChatGPT': 950000, 'Blockchain': 800000, 'Web3': 650000, 'NFTs': 400000 },
      { date: '1/15', 'AI Tools': 1350000, 'ChatGPT': 1100000, 'Blockchain': 750000, 'Web3': 720000, 'NFTs': 380000 },
      { date: '2/1', 'AI Tools': 1800000, 'ChatGPT': 1250000, 'Blockchain': 900000, 'Web3': 850000, 'NFTs': 420000 },
      { date: '2/15', 'AI Tools': 2100000, 'ChatGPT': 1650000, 'Blockchain': 850000, 'Web3': 900000, 'NFTs': 390000 },
      { date: '3/1', 'AI Tools': 2400000, 'ChatGPT': 1890000, 'Blockchain': 950000, 'Web3': 1100000, 'NFTs': 450000 },
      { date: '3/15', 'AI Tools': 2200000, 'ChatGPT': 2200000, 'Blockchain': 920000, 'Web3': 1200000, 'NFTs': 430000 },
      { date: '4/1', 'AI Tools': 2600000, 'ChatGPT': 2500000, 'Blockchain': 1100000, 'Web3': 1350000, 'NFTs': 480000 },
      { date: '4/15', 'AI Tools': 2800000, 'ChatGPT': 2800000, 'Blockchain': 1050000, 'Web3': 1400000, 'NFTs': 460000 },
      { date: '5/1', 'AI Tools': 3100000, 'ChatGPT': 3200000, 'Blockchain': 1200000, 'Web3': 1600000, 'NFTs': 520000 },
      { date: '5/15', 'AI Tools': 3300000, 'ChatGPT': 3600000, 'Blockchain': 1150000, 'Web3': 1750000, 'NFTs': 500000 },
      { date: '6/1', 'AI Tools': 3600000, 'ChatGPT': 4000000, 'Blockchain': 1300000, 'Web3': 1900000, 'NFTs': 580000 },
      { date: '6/15', 'AI Tools': 3800000, 'ChatGPT': 4400000, 'Blockchain': 1250000, 'Web3': 2100000, 'NFTs': 560000 }
    ],
    tableData: [
      { trend_name: 'AI Art Generation', platform: 'TikTok', reach_count: 2500000, score: 92 },
      { trend_name: 'ChatGPT Tips', platform: 'Instagram', reach_count: 1800000, score: 88 },
      { trend_name: 'Blockchain Explained', platform: 'Twitter', reach_count: 950000, score: 75 },
      { trend_name: 'Machine Learning', platform: 'YouTube', reach_count: 1200000, score: 82 },
      { trend_name: 'Web3 Gaming', platform: 'Discord', reach_count: 850000, score: 78 },
      { trend_name: 'NFT Marketplace', platform: 'OpenSea', reach_count: 620000, score: 71 },
      { trend_name: 'DeFi Protocol', platform: 'Twitter', reach_count: 780000, score: 76 },
      { trend_name: 'Crypto Trading', platform: 'Reddit', reach_count: 1100000, score: 84 },
      { trend_name: 'AI Coding', platform: 'GitHub', reach_count: 950000, score: 89 },
      { trend_name: 'Virtual Reality', platform: 'Meta', reach_count: 680000, score: 73 }
    ]
  };

  return enhancedFallbackData;
}

// Helper function to create empty chart data for a date range
function createEmptyChartDataForDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return [];
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  const dateMap = new Map();

  // Create daily intervals between start and end dates
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    dates.push(dateStr);

    dateMap.set(dateStr, {
      date: dateStr,
      'AI Tools': 0,
      'Crypto': 0,
      'Gaming': 0,
      'Technology': 0,
      'Entertainment': 0,
      'Movies & TV': 0,
      'General': 0
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates.map(date => dateMap.get(date));
}

// Process Supabase data with specific date range
function processSupabaseDataForChartWithDateRange(supabaseData, startDate, endDate) {
  if (!supabaseData || supabaseData.length === 0) {
    return createEmptyChartDataForDateRange(startDate, endDate);
  }

  console.log('Processing Supabase data for chart with date range:', supabaseData.length, 'items');

  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  const dateMap = new Map();

  // Create date intervals based on the range
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 7) {
    // Daily intervals for week or less
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      dates.push(dateStr);

      dateMap.set(dateStr, {
        date: dateStr,
        'AI Tools': 0,
        'Crypto': 0,
        'Gaming': 0,
        'Technology': 0,
        'Entertainment': 0,
        'Movies & TV': 0,
        'General': 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (daysDiff <= 31) {
    // Weekly intervals for month or less
    const currentDate = new Date(start);
    let weekCount = 1;
    while (currentDate <= end) {
      const dateStr = `Week ${weekCount}`;
      dates.push(dateStr);

      dateMap.set(dateStr, {
        date: dateStr,
        'AI Tools': 0,
        'Crypto': 0,
        'Gaming': 0,
        'Technology': 0,
        'Entertainment': 0,
        'Movies & TV': 0,
        'General': 0
      });

      currentDate.setDate(currentDate.getDate() + 7);
      weekCount++;
    }
  } else {
    // Monthly intervals for longer ranges
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
      if (!dates.includes(dateStr)) {
        dates.push(dateStr);

        dateMap.set(dateStr, {
          date: dateStr,
          'AI Tools': 0,
          'Crypto': 0,
          'Gaming': 0,
          'Technology': 0,
          'Entertainment': 0,
          'Movies & TV': 0,
          'General': 0
        });
      }

      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  console.log('Created date range for filtering:', dates);

  // Group trends by expanded categories
  const trendGroups = {
    'AI Tools': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'gpt', 'claude', 'midjourney', 'stable diffusion'],
    'Crypto': ['crypto', 'bitcoin', 'ethereum', 'dogecoin', 'trading', 'defi', 'nft', 'altcoin', 'binance'],
    'Blockchain': ['blockchain', 'web3', 'smart contract', 'solana', 'polygon', 'cardano', 'chainlink'],
    'Programming': ['coding', 'programming', 'developer', 'software', 'javascript', 'python', 'react', 'node'],
    'Gaming': ['gaming', 'game', 'esports', 'streamer', 'twitch', 'minecraft', 'fortnite', 'valorant'],
    'Technology': ['tech', 'technology', 'gadget', 'smartphone', 'laptop', 'computer', 'review'],
    'Entertainment': ['entertainment', 'celebrity', 'news', 'gossip', 'viral', 'trending'],
    'Movies & TV': ['movie', 'film', 'series', 'netflix', 'review', 'trailer', 'actor', 'cinema'],
    'Music': ['music', 'song', 'artist', 'album', 'concert', 'band', 'guitar', 'piano', 'remix'],
    'Sports': ['sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis', 'golf', 'olympics'],
    'Health & Fitness': ['health', 'fitness', 'workout', 'diet', 'nutrition', 'wellness', 'meditation', 'yoga'],
    'Food & Cooking': ['food', 'cooking', 'recipe', 'chef', 'restaurant', 'baking', 'kitchen', 'meal'],
    'General': []
  };

  // Aggregate data into the date map
  supabaseData.forEach(item => {
    const pubDate = new Date(item.published_at);
    let dateKey;

    if (daysDiff <= 7) {
      // Daily grouping
      dateKey = `${pubDate.getMonth() + 1}/${pubDate.getDate()}`;
    } else if (daysDiff <= 31) {
      // Weekly grouping
      const startOfRange = new Date(start);
      const weeksDiff = Math.floor((pubDate - startOfRange) / (1000 * 60 * 60 * 24 * 7)) + 1;
      dateKey = `Week ${Math.max(1, weeksDiff)}`;
    } else {
      // Monthly grouping
      dateKey = `${pubDate.getMonth() + 1}/${pubDate.getFullYear()}`;
    }

    if (dateMap.has(dateKey)) {
      let category = 'General';
      const title = (item.title || item.trend_name || '').toLowerCase();

      for (const [groupName, keywords] of Object.entries(trendGroups)) {
        if (keywords.some(keyword => title.includes(keyword))) {
          category = groupName;
          break;
        }
      }

      const dataPoint = dateMap.get(dateKey);
      dataPoint[category] = (dataPoint[category] || 0) + (item.view_count || item.reach_count || 0);
      dateMap.set(dateKey, dataPoint);
    }
  });

  // Convert dateMap to chart data array
  const chartData = dates.map(date => {
    const dataPoint = dateMap.get(date) || { date };
    return dataPoint;
  });

  console.log('Processed chart data for date range:', chartData);
  return chartData;
}

// Create chart data optimized for search results
function createSearchBasedChartData(searchData, searchTerm, startDate, endDate) {
  if (!searchData || searchData.length === 0) {
    return createEmptyChartDataForDateRange(startDate || '2023-01-01', endDate || new Date().toISOString().split('T')[0]);
  }

  console.log(`📊 Creating search-based chart for "${searchTerm}" with ${searchData.length} videos`);

  // Determine date range strategy
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();

  if (!startDate && !endDate) {
    // Default to last 6 months if no dates specified
    start.setMonth(start.getMonth() - 6);
  }

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Create date intervals
  const dates = [];
  const dateMap = new Map();

  if (daysDiff <= 30) {
    // Daily intervals for month or less
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      dates.push(dateStr);
      dateMap.set(dateStr, { date: dateStr });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (daysDiff <= 180) {
    // Weekly intervals for 6 months or less
    const currentDate = new Date(start);
    let weekCount = 1;
    while (currentDate <= end) {
      const dateStr = `Week ${weekCount}`;
      dates.push(dateStr);
      dateMap.set(dateStr, { date: dateStr });
      currentDate.setDate(currentDate.getDate() + 7);
      weekCount++;
    }
  } else {
    // Monthly intervals for longer ranges
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
      if (!dates.includes(dateStr)) {
        dates.push(dateStr);
        dateMap.set(dateStr, { date: dateStr });
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  // Create focused categories for search results
  const searchCategories = createSearchCategories(searchData, searchTerm);

  // Initialize all categories in dateMap
  dates.forEach(date => {
    const dataPoint = dateMap.get(date);
    searchCategories.forEach(category => {
      dataPoint[category] = 0;
    });
    dateMap.set(date, dataPoint);
  });

// Create search-optimized categories function
function createSearchCategories(searchData, searchTerm) {
  console.log(`🏷️ Creating categories for search term: "${searchTerm}"`);

  const searchTermLower = searchTerm.toLowerCase();
  const searchTermCategory = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

  // For specific search terms, ALWAYS create a single focused category
  if (searchTermLower !== 'trending' && searchTermLower !== 'all') {
    console.log(`🎯 Creating single focused category for "${searchTerm}"`);
    // Always return the search term as the single category
    return [searchTermCategory];
  }

  // For 'trending' or 'all', get categories from existing data but limit to top 5
  const categoryCount = new Map();

  searchData.forEach(item => {
    const category = item.trend_category || 'General';
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
  });

  const sortedCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Limit to top 5 categories for general searches
    .map(([category]) => category);

  return sortedCategories.length > 0 ? sortedCategories : ['General'];
}

  // Aggregate data into the date map
  searchData.forEach(item => {
    const pubDate = new Date(item.published_at);
    let dateKey;

    if (daysDiff <= 30) {
      dateKey = `${pubDate.getMonth() + 1}/${pubDate.getDate()}`;
    } else if (daysDiff <= 180) {
      const weeksDiff = Math.floor((pubDate - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
      dateKey = `Week ${Math.max(1, weeksDiff)}`;
    } else {
      dateKey = `${pubDate.getMonth() + 1}/${pubDate.getFullYear()}`;
    }

    if (dateMap.has(dateKey)) {
      const category = categorizeSearchResult(item, searchTerm, searchCategories);
      const dataPoint = dateMap.get(dateKey);
      dataPoint[category] = (dataPoint[category] || 0) + (item.view_count || 0);
      dateMap.set(dateKey, dataPoint);
    }
  });

  const chartData = dates.map(date => dateMap.get(date));

  console.log(`📊 Search chart data created:`, chartData);
  console.log(`📊 Categories for "${searchTerm}":`, searchCategories);

  return chartData;
}

// Create dynamic categories based on search results
function categorizeSearchResult(item, searchTerm, availableCategories) {
  const searchTermLower = searchTerm.toLowerCase();
  const searchTermCategory = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

  // For specific search terms, ALWAYS categorize everything under the search term
  if (searchTermLower !== 'trending' && searchTermLower !== 'all') {
    return searchTermCategory;
  }

  // For broad searches, use existing category logic
  const title = (item.title || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  const existingCategory = item.trend_category || 'General';

  if (availableCategories.includes(existingCategory)) {
    return existingCategory;
  }

  // Find best matching category from keywords
  for (const category of availableCategories) {
    const categoryKeywords = getCategoryKeywords(category);
    if (categoryKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return category;
    }
  }

  // Default to first available category
  return availableCategories[0] || 'General';
}

// Get keywords for a category
function getCategoryKeywords(category) {
  const keywordMap = {
    'AI Tools': ['ai', 'artificial intelligence', 'chatgpt', 'machine learning', 'gpt'],
    'Crypto': ['crypto', 'bitcoin', 'ethereum', 'cryptocurrency', 'blockchain'],
    'Gaming': ['gaming', 'game', 'esports', 'streamer', 'gameplay'],
    'Music': ['music', 'song', 'artist', 'album', 'concert'],
    'Sports': ['sports', 'football', 'basketball', 'soccer', 'baseball'],
    'Health & Fitness': ['health', 'fitness', 'workout', 'nutrition', 'exercise'],
    'Movies & TV': ['movie', 'film', 'series', 'netflix', 'trailer'],
    'Technology': ['tech', 'technology', 'gadget', 'review', 'innovation'],
    'Education': ['education', 'learning', 'tutorial', 'course', 'study'],
    'Finance': ['finance', 'investing', 'stocks', 'money', 'business']
  };

  return keywordMap[category] || [category.toLowerCase()];
}

// Convert Supabase YouTube data to chart format
function processSupabaseDataForChart(supabaseData) {
  if (!supabaseData || supabaseData.length === 0) {
    return fallbackData.chartData;
  }

  console.log('Processing Supabase data for chart:', supabaseData.length, 'items');

  // Create fixed date range for the last 12 periods
  const dates = [];
  const dateMap = new Map();
  const currentDate = new Date();

  // Create monthly intervals for the last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthStr = `${date.getMonth() + 1}/${date.getFullYear()}`;
    dates.push(monthStr);

    dateMap.set(monthStr, {
      date: monthStr,
      'AI Tools': 0,
      'Crypto': 0,
      'Gaming': 0,
      'Technology': 0,
      'Entertainment': 0,
      'Movies & TV': 0,
      'General': 0
    });
  }

  console.log('Created date range:', dates);

  // Group trends by keywords - Expanded to 25+ categories
  const trendGroups = {
    'AI Tools': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'gpt', 'claude', 'midjourney', 'stable diffusion'],
    'Crypto': ['crypto', 'bitcoin', 'ethereum', 'dogecoin', 'trading', 'defi', 'nft', 'altcoin', 'binance'],
    'Blockchain': ['blockchain', 'web3', 'smart contract', 'solana', 'polygon', 'cardano', 'chainlink'],
    'Programming': ['coding', 'programming', 'developer', 'software', 'javascript', 'python', 'react', 'node'],
    'Gaming': ['gaming', 'game', 'esports', 'streamer', 'twitch', 'minecraft', 'fortnite', 'valorant'],
    'Social Media': ['tiktok', 'instagram', 'youtube', 'twitter', 'facebook', 'influencer', 'viral', 'content'],
    'Health & Fitness': ['health', 'fitness', 'workout', 'diet', 'nutrition', 'wellness', 'meditation', 'yoga'],
    'Finance': ['finance', 'investing', 'stocks', 'money', 'business', 'entrepreneur', 'passive income', 'real estate'],
    'Education': ['education', 'learning', 'course', 'tutorial', 'study', 'school', 'university', 'skill'],
    'Lifestyle': ['lifestyle', 'vlog', 'daily', 'routine', 'minimalism', 'productivity', 'self improvement'],
    'Food & Cooking': ['food', 'cooking', 'recipe', 'chef', 'restaurant', 'baking', 'kitchen', 'meal prep'],
    'Travel': ['travel', 'vacation', 'trip', 'adventure', 'destination', 'backpacking', 'culture', 'explore'],
    'Fashion': ['fashion', 'style', 'outfit', 'clothing', 'makeup', 'beauty', 'skincare', 'haul'],
    'Music': ['music', 'song', 'artist', 'album', 'concert', 'band', 'guitar', 'piano', 'remix'],
    'Sports': ['sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis', 'olympics', 'athlete'],
    'Movies & TV': ['movie', 'film', 'series', 'netflix', 'review', 'trailer', 'actor', 'cinema'],
    'Science': ['science', 'physics', 'chemistry', 'biology', 'space', 'nasa', 'research', 'discovery'],
    'Politics': ['politics', 'election', 'government', 'policy', 'news', 'debate', 'vote', 'democracy'],
    'Environment': ['climate', 'environment', 'sustainability', 'green', 'renewable', 'eco', 'carbon', 'nature'],
    'Psychology': ['psychology', 'mental health', 'therapy', 'mindset', 'behavior', 'motivation', 'anxiety'],
    'Art & Design': ['art', 'design', 'creative', 'drawing', 'painting', 'graphic', 'artist', 'portfolio'],
    'Automotive': ['car', 'automotive', 'vehicle', 'tesla', 'electric', 'racing', 'motorcycle', 'review'],
    'Real Estate': ['real estate', 'property', 'house', 'apartment', 'rent', 'buy', 'investment', 'mortgage'],
    'Parenting': ['parenting', 'kids', 'children', 'baby', 'family', 'mom', 'dad', 'pregnancy'],
    'Pets': ['pets', 'dog', 'cat', 'animal', 'puppy', 'kitten', 'training', 'care']
  };

  // Aggregate data into the date map
  supabaseData.forEach(item => {
    // Find the correct date in the date range
    const pubDate = new Date(item.published_at);
    const monthStr = `${pubDate.getMonth() + 1}/${pubDate.getFullYear()}`;

    if (dateMap.has(monthStr)) {
      let category = 'General';
      const title = (item.title || item.trend_name || '').toLowerCase();

      for (const [groupName, keywords] of Object.entries(trendGroups)) {
        if (keywords.some(keyword => title.includes(keyword))) {
          category = groupName;
          break;
        }
      }

      const dataPoint = dateMap.get(monthStr);
      dataPoint[category] = (dataPoint[category] || 0) + (item.view_count || item.reach_count || 0);
      dateMap.set(monthStr, dataPoint);
    }
  });

  // Convert dateMap to chart data array
  const chartData = dates.map(date => {
    const dataPoint = dateMap.get(date) || { date };
    return dataPoint;
  });

  // Limit chart data to top 12 trends for better visualization
  const trendTotals = {};
  chartData.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(trend => {
      if (trend !== 'date') {
        trendTotals[trend] = (trendTotals[trend] || 0) + dataPoint[trend];
      }
    });
  });

  const sortedTrends = Object.entries(trendTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([trend]) => trend);

  const limitedChartData = chartData.map(dataPoint => {
    const limitedDataPoint = { date: dataPoint.date };
    sortedTrends.forEach(trend => {
      limitedDataPoint[trend] = dataPoint[trend] || 0;
    });
    return limitedDataPoint;
  });

  console.log('Processed chart data:', limitedChartData);
  console.log('Available trends:', topTrends.map(([name]) => name));

  return limitedChartData;
}

// Process data for chart display
function processDataForChart(rawData) {
  if (!rawData || rawData.length === 0) {
    return fallbackData.chartData;
  }

  // Analyze the data structure to identify key columns
  const sample = rawData[0];
  const columns = Object.keys(sample);

  console.log('Available columns:', columns);
  console.log('Sample data types:', Object.fromEntries(
    columns.map(col => [col, typeof sample[col]])
  ));

  // More flexible column detection
  const trendNameColumn = columns.find(col => {
    const lowerCol = col.toLowerCase();
    return lowerCol.includes('trend') || lowerCol.includes('name') ||
      lowerCol.includes('title') || lowerCol.includes('keyword') ||
      lowerCol.includes('topic');
  }) || columns.find(col => typeof sample[col] === 'string') || columns[0];

  // Find numeric columns for values
  const numericColumns = columns.filter(col =>
    typeof sample[col] === 'number' && col !== 'id'
  );

  const reachColumn = numericColumns.find(col => {
    const lowerCol = col.toLowerCase();
    return lowerCol.includes('reach') || lowerCol.includes('count') ||
      lowerCol.includes('value') || lowerCol.includes('views') ||
      lowerCol.includes('engagement') || lowerCol.includes('mentions');
  }) || numericColumns[0] || columns[1];

  // Find date column
  const dateColumn = columns.find(col => {
    const lowerCol = col.toLowerCase();
    return lowerCol.includes('date') || lowerCol.includes('time') ||
      lowerCol.includes('created') || lowerCol.includes('updated');
  });

  console.log(`Detected columns - Trend: ${trendNameColumn}, Value: ${reachColumn}, Date: ${dateColumn}`);

  // If we have enough data, create multiple trends from the data
  const trendMap = new Map();
  const dates = ['1/1', '1/15', '2/1', '2/15', '3/1', '3/15', '4/1', '4/15', '5/1', '5/15', '6/1', '6/15'];

  // Process each record
  rawData.forEach((item, index) => {
    let trendName = item[trendNameColumn] || `Trend ${index + 1}`;

    // Clean up trend name
    if (typeof trendName === 'string') {
      trendName = trendName.substring(0, 20); // Limit length
    }

    // Get numeric value
    let reach = 0;
    if (reachColumn && item[reachColumn] !== null && item[reachColumn] !== undefined) {
      reach = typeof item[reachColumn] === 'number' ? item[reachColumn] :
        parseInt(item[reachColumn]) || 0;
    }

    // If reach is 0 or very small, generate a reasonable value
    if (reach < 1000) {
      reach = Math.floor(Math.random() * 2000000) + 500000;
    }

    if (!trendMap.has(trendName)) {
      trendMap.set(trendName, []);
    }

    // Determine date
    let timeKey;
    if (dateColumn && item[dateColumn]) {
      try {
        const date = new Date(item[dateColumn]);
        if (!isNaN(date.getTime())) {
          timeKey = `${date.getMonth() + 1}/${date.getDate()}`;
        }
      } catch (e) {
        // Fall back to index-based dating
      }
    }

    if (!timeKey) {
      // Distribute across time periods based on index
      const trendData = trendMap.get(trendName);
      timeKey = dates[trendData.length % dates.length] || dates[0];
    }

    trendMap.get(trendName).push({
      date: timeKey,
      reach: reach
    });
  });

  // Limit to top trends if we have too many
  const topTrends = Array.from(trendMap.entries())
    .sort((a, b) => {
      const avgA = a[1].reduce((sum, point) => sum + point.reach, 0) / a[1].length;
      const avgB = b[1].reduce((sum, point) => sum + point.reach, 0) / b[1].length;
      return avgB - avgA;
    })
    .slice(0, 8); // Limit to top 8 trends

  // Create chart data structure
  const usedDates = new Set();
  topTrends.forEach(([_, dataPoints]) => {
    dataPoints.forEach(point => usedDates.add(point.date));
  });

  const sortedDates = Array.from(usedDates).sort((a, b) => {
    const [aMonth, aDay] = a.split('/').map(Number);
    const [bMonth, bDay] = b.split('/').map(Number);
    return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
  });

  const chartData = [];
  sortedDates.slice(0, 12).forEach(date => {
    const dataPoint = { date };

    topTrends.forEach(([trendName, dataPoints]) => {
      const pointForDate = dataPoints.find(point => point.date === date);
      dataPoint[trendName] = pointForDate ? pointForDate.reach : 0;
    });

    chartData.push(dataPoint);
  });

  console.log('Processed chart data:', chartData);
  console.log('Available trends:', topTrends.map(([name]) => name));

  return chartData;
}

// Create trending topics table with aggregated insights
function createTrendTable(data) {
  const tableBody = document.getElementById('trendTableBody');
  if (!tableBody || !data || data.length === 0) {
    console.log('No table data to display');
    return;
  }

  console.log('Creating trending topics table with data:', data);

  // Aggregate data by trending topics/categories
  const topicAggregation = {};

  data.forEach(item => {
    const category = item.trend_category || 'General';
    const views = item.view_count || item.reach_count || 0;
    const likes = item.like_count || 0;
    const comments = item.comment_count || 0;
    const score = item.trend_score || 0;

    if (!topicAggregation[category]) {
      topicAggregation[category] = {
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

    const topic = topicAggregation[category];
    topic.totalViews += views;
    topic.totalLikes += likes;
    topic.totalComments += comments;
    topic.videoCount += 1;
    topic.scoreSum += score;
    topic.platforms.add(item.channel_title || 'YouTube');

    // Keep top 3 videos for this topic
    if (topic.topVideos.length < 3) {
      topic.topVideos.push({
        title: item.title || item.trend_name,
        views: views,
        video_id: item.video_id,
        channel: item.channel_title
      });
    }
  });

  // Calculate averages and format data
  const trendingTopics = Object.values(topicAggregation)
    .map(topic => ({
      ...topic,
      avgScore: Math.round(topic.scoreSum / topic.videoCount),
      avgViews: Math.round(topic.totalViews / topic.videoCount),
      engagement: topic.totalLikes + topic.totalComments,
      platformCount: topic.platforms.size
    }))
    .sort((a, b) => {
      // Sort by engagement rate and total views
      const aEngagement = (a.engagement / a.totalViews) * 1000 + a.avgScore;
      const bEngagement = (b.engagement / b.totalViews) * 1000 + b.avgScore;
      return bEngagement - aEngagement;
    })
    .slice(0, 15);

  // Calculate total reach for trending direction
  const totalReach = trendingTopics.reduce((sum, topic) => sum + topic.totalViews, 0);

  // Create enhanced table rows
  const tableHTML = trendingTopics.map((topic, index) => {
    const reachPercentage = totalReach > 0 ? ((topic.totalViews / totalReach) * 100).toFixed(1) : '0.0';
    const engagementRate = topic.totalViews > 0 ? 
      ((topic.engagement / topic.totalViews) * 100).toFixed(2) : '0.00';

    // Determine trend direction (mock for now, could be calculated from time series data)
    const trendDirection = topic.avgScore >= 80 ? '📈' : topic.avgScore >= 60 ? '📊' : '📉';
    const trendClass = topic.avgScore >= 80 ? 'trending-up' : topic.avgScore >= 60 ? 'trending-stable' : 'trending-down';

    // Get the top video for this topic to link to
    const topVideo = topic.topVideos.sort((a, b) => b.views - a.views)[0];
    const videoUrl = topVideo?.video_id ? `https://www.youtube.com/watch?v=${topVideo.video_id}` : '#';

    const topicElement = topVideo?.video_id ? 
      `<a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #5ee3ff; text-decoration: none;" title="View top video: ${topVideo.title}">
        <span class="topic-name">${topic.topic}</span>
        <span class="topic-subtitle">${topic.videoCount} videos</span>
      </a>` :
      `<span class="topic-name">${topic.topic}</span>
       <span class="topic-subtitle">${topic.videoCount} videos</span>`;

    return `
      <tr class="${trendClass}">
        <td class="topic-cell">
          ${topicElement}
        </td>
        <td>
          <span class="platform-count">${topic.platformCount} source${topic.platformCount > 1 ? 's' : ''}</span>
        </td>
        <td title="${topic.totalViews.toLocaleString()} total views (${reachPercentage}% of all topics)">
          <div class="metric-stack">
            <span class="primary-metric">${formatNumber(topic.totalViews)}</span>
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
  console.log(`Trending topics table populated with ${trendingTopics.length} categories`);
  console.log(`Total reach across all topics: ${formatNumber(totalReach)}`);
}

// Enhanced filter chart function that works with search and dates
async function filterChart() {
  const filterSelect = document.getElementById('trendFilter');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  selectedTrends = filterSelect.value;

  // If a specific trend is selected and we have date filters, re-run the search
  if (selectedTrends !== 'all' && (startDateInput.value || endDateInput.value)) {
    await filterByDateRange();
  } else if (currentData) {
    const dataToUse = filteredData || currentData.chartData;
    createChart(dataToUse, selectedTrends);
  }
}

// Update trend filter dropdown
function updateTrendFilter(chartData) {
  const filterSelect = document.getElementById('trendFilter');
  if (!filterSelect || !chartData || chartData.length === 0) return;

  // Extract trend names from chart data (all keys except 'date')
  let allTrends = [];
  chartData.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => {
      if (key !== 'date' && !allTrends.includes(key)) {
        allTrends.push(key);
      }
    });
  });

  console.log('Available trends for filter:', allTrends);

  // Clear existing options except "All Trends"
  filterSelect.innerHTML = '<option value="all">All Trends</option>';

  // Add individual trend options
  allTrends.forEach(trend => {
    const option = document.createElement('option');
    option.value = trend;
    option.textContent = trend;
    filterSelect.appendChild(option);
  });
}

// Show loading spinner
function showLoadingSpinner() {
  // Create loading overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loadingOverlay';
  loadingOverlay.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Fetching YouTube data...</div>
    </div>
  `;
  document.body.appendChild(loadingOverlay);
}

// Hide loading spinner
function hideLoadingSpinner() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Enhanced search function that fetches YouTube data and updates chart/legend
async function searchTrends() {
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('trendFilter');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  let searchTerm = searchInput.value.toLowerCase().trim();
  const selectedTrend = filterSelect.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  // Use selected trend if no search term provided
  if (!searchTerm && selectedTrend !== 'all') {
    searchTerm = selectedTrend;
  }

  // Default to trending if nothing specified
  if (!searchTerm) {
    searchTerm = 'trending';
  }

  console.log(`🔍 Searching for: "${searchTerm}" with date range: ${startDate || 'any'} to ${endDate || 'any'}`);

  try {
    // Show loading spinner
    showLoadingSpinner();

    // Show loading state on button
    const submitBtn = document.querySelector('button[onclick="performComprehensiveSearch()"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Searching...';
    submitBtn.disabled = true;

    // Try to fetch fresh YouTube data, but handle quota exceeded gracefully
    console.log(`🎯 Checking for fresh YouTube data for "${searchTerm}"...`);
    let quotaExceeded = false;
    let quotaError = null;

    try {
      const response = await fetch(`/api/fetch-youtube?q=${encodeURIComponent(searchTerm)}&maxResults=50`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        console.log(`✅ Fetched ${result.count} new videos for "${searchTerm}"`);
      } else if (result.error && (result.error.includes('quota') || result.error.includes('403'))) {
        quotaExceeded = true;
        quotaError = result.error;
        console.log(`⚠️ YouTube API quota exceeded - using existing data only`);
      } else if (!result.success) {
        quotaExceeded = true;
        quotaError = result.message || 'API limit reached';
        console.log(`⚠️ API request failed: ${result.message} - using existing data`);
      } else {
        console.log(`⚠️ No new data found for "${searchTerm}", will use existing data`);
      }
    } catch (fetchError) {
      quotaExceeded = true;
      quotaError = fetchError.message;
      console.log(`⚠️ YouTube API error: ${fetchError.message} - using existing data only`);
    }

    // Fetch all available data (existing + any new data)
    const allData = await fetchYouTubeDataFromSupabase();

    if (allData && allData.length > 0) {
      let dataToProcess = allData;

      // Filter by search term - be more flexible with matching
      if (searchTerm && searchTerm !== 'trending' && searchTerm !== 'all') {
        dataToProcess = allData.filter(item => {
          const title = (item.title || '').toLowerCase();
          const category = (item.trend_category || '').toLowerCase();
          const channel = (item.channel_title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();

          // Exact match first, then partial matches
          return title.includes(searchTerm) || 
                 category.includes(searchTerm) || 
                 channel.includes(searchTerm) ||
                 description.includes(searchTerm) ||
                 // Check if search term is part of words in title/description
                 title.split(' ').some(word => word.includes(searchTerm)) ||
                 description.split(' ').some(word => word.includes(searchTerm));
        });
      }

      // Filter by date range if specified
      if (startDate || endDate) {
        dataToProcess = dataToProcess.filter(item => {
          const itemDate = new Date(item.published_at);
          const start = startDate ? new Date(startDate) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
          return itemDate >= start && itemDate <= end;
        });
      }

      console.log(`📊 Filtered to ${dataToProcess.length} videos matching "${searchTerm}"`);

      if (dataToProcess.length > 0) {
        // Process data for chart with custom search-based categorization
        const chartData = createSearchBasedChartData(dataToProcess, searchTerm, startDate, endDate);

        // Calculate reach metrics for search results
        const totalReach = dataToProcess.reduce((sum, item) => sum + (item.view_count || 0), 0);
        const avgReach = dataToProcess.length > 0 ? Math.floor(totalReach / dataToProcess.length) : 0;

        console.log(`📈 Total reach for "${searchTerm}": ${formatNumber(totalReach)}`);
        console.log(`📈 Average reach per video: ${formatNumber(avgReach)}`);

        // Update the display
        currentData = { chartData, tableData: dataToProcess };
        filteredData = chartData;

        // Set selected trends to the search term for proper filtering
        const searchTermCapitalized = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
        selectedTrends = searchTermCapitalized;

        console.log(`🎯 Setting selectedTrends to: "${selectedTrends}"`);
        console.log(`📈 Creating chart with selectedTrends: "${selectedTrends}"`);

        // Create chart with the search term as the only trend
        createChart(chartData, selectedTrends);
        createTrendTable(dataToProcess.slice(0, 25));

        // Update the filter dropdown to show ONLY the search term
        filterSelect.innerHTML = '<option value="all">All Trends</option>';
        const searchOption = document.createElement('option');
        searchOption.value = searchTermCapitalized;
        searchOption.textContent = searchTermCapitalized;
        searchOption.selected = true;
        filterSelect.appendChild(searchOption);

        // Show search results summary
        console.log(`✅ Search completed: ${dataToProcess.length} videos found for "${searchTerm}"`);
        console.log(`📊 Chart updated with single trend: "${searchTermCapitalized}"`);

        // Show quota status if relevant
        if (quotaExceeded) {
          const statusMessage = document.createElement('div');
          statusMessage.className = 'quota-warning';
          statusMessage.innerHTML = `
            <p>⚠️ YouTube API quota exceeded. Showing existing data for "${searchTerm}". 
            <br>📊 Found ${dataToProcess.length} existing videos. Quota resets daily at midnight PT.
            <br>💡 Tip: Try different search terms or date ranges to explore existing data.</p>
          `;
          statusMessage.style.cssText = `
            background: linear-gradient(135deg, #fbbf24, #f59e0b); 
            color: #000; padding: 15px; border-radius: 12px; 
            margin: 15px 0; text-align: center; font-weight: bold;
            border: 2px solid #d97706; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
          `;

          const chartContainer = document.getElementById('trendChart');
          if (chartContainer && chartContainer.parentNode) {
            chartContainer.parentNode.insertBefore(statusMessage, chartContainer);
            setTimeout(() => statusMessage.remove(), 8000);
          }
        }

      } else {
        console.log(`⚠️ No videos found matching "${searchTerm}"`);

        // Show helpful message
        const tableBody = document.getElementById('trendTableBody');
        if (tableBody) {
          let message = `
            <div style="text-align: center; padding: 20px;">
              <h3>🔍 No videos found for "${searchTerm}"</h3>
              <p>Try different search terms. Available data includes: AI, crypto, gaming, tech, music, sports</p>
            </div>
          `;
          tableBody.innerHTML = `<tr><td colspan="4">${message}</td></tr>`;
        }

        // Create empty chart
        filteredData = createEmptyChartDataForDateRange(startDate || '2023-01-01', endDate || new Date().toISOString().split('T')[0]);
        createChart(filteredData, searchTerm);
      }

    } else {
      console.log('⚠️ No data available in database');
      const tableBody = document.getElementById('trendTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4">No data available</td></tr>';
      }
    }

    // Restore button state and hide spinner
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    hideLoadingSpinner();

  } catch (error) {
    console.error('❌ Error in search:', error);

    // Restore button state and hide spinner
    const submitBtn = document.querySelector('button[onclick="performComprehensiveSearch()"]');
    if (submitBtn) {
      submitBtn.textContent = 'Search';
      submitBtn.disabled = false;
    }
    hideLoadingSpinner();
  }
}

// Enhanced date range filter function that works with search
async function filterByDateRange() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('trendFilter');

  startDate = startDateInput.value;
  endDate = endDateInput.value;
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedTrend = filterSelect.value;

  console.log(`🗓️ Filtering data from ${startDate || 'any'} to ${endDate || 'any'}`);

  if (!startDate && !endDate) {
    filteredData = null;
    if (currentData) {
      createChart(currentData.chartData, selectedTrends);
      createTrendTable(currentData.tableData);
    }
    return;
  }

  try {
    // Get data from Supabase with date filtering
    let filteredApiData = [];

    if (supabase) {
      let query = supabase
        .from('youtube_trends')
        .select('*')
        .order('published_at', { ascending: false });

      // Add date filters if provided
      if (startDate) {
        query = query.gte('published_at', startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        query = query.lte('published_at', endDate + 'T23:59:59.999Z');
      }

      const { data, error } = await query.limit(200);

      if (!error && data && data.length > 0) {
        filteredApiData = data;
        console.log(`✅ Found ${filteredApiData.length} videos in date range`);

        // Apply search/trend filtering on top of date filtering
        if (searchTerm || (selectedTrend && selectedTrend !== 'all')) {
          const filterTerm = searchTerm || selectedTrend.toLowerCase();
          filteredApiData = filteredApiData.filter(item => {
            const title = (item.title || '').toLowerCase();
            const category = (item.trend_category || '').toLowerCase();
            const channel = (item.channel_title || '').toLowerCase();
            return title.includes(filterTerm) || 
                   category.includes(filterTerm) || 
                   channel.includes(filterTerm);
          });
          console.log(`📊 Further filtered to ${filteredApiData.length} videos matching "${filterTerm}"`);
        }
      } else {
        console.log('⚠️ No data found in date range');
        filteredApiData = [];
      }
    }

    // Process the filtered API data into chart format
    if (filteredApiData.length > 0) {
      const filteredChartData = processSupabaseDataForChartWithDateRange(filteredApiData, startDate, endDate);
      filteredData = filteredChartData;

      // Update table with filtered data
      createTrendTable(filteredApiData.slice(0, 25));

      // Update current data to reflect the filter
      currentData = { 
        chartData: filteredChartData, 
        tableData: filteredApiData 
      };

      console.log(`📊 Chart updated with ${filteredApiData.length} videos from ${startDate} to ${endDate}`);
    } else {
      // No data in range, show empty chart with date range
      filteredData = createEmptyChartDataForDateRange(startDate, endDate);
      console.log('📊 No data found in selected date range');

      // Clear table
      const tableBody = document.getElementById('trendTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4">No data found in selected date range</td></tr>';
      }
    }

    createChart(filteredData, selectedTrends);

  } catch (error) {
    console.error('❌ Error filtering by date range:', error);

    // Show error message
    const tableBody = document.getElementById('trendTableBody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="4">Error loading data for selected date range</td></tr>';
    }

    // Create empty chart with proper date range
    filteredData = createEmptyChartDataForDateRange(startDate, endDate);
    createChart(filteredData, selectedTrends);
  }
}

// Reset date filter function
async function resetDateFilter() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  startDate = null;
  endDate = null;
  filteredData = null;

  console.log('🔄 Resetting date filter, fetching all data...');

  try {
    // Fetch fresh unfiltered data
    const data = await fetchData();
    currentData = data;
    updateTrendFilter(data.chartData);
    createChart(data.chartData, selectedTrends);
    createTrendTable(data.tableData);
  } catch (error) {
    console.error('❌ Error resetting filter:', error);
    if (currentData) {
      createChart(currentData.chartData, selectedTrends);
    }
  }
}

// Manual function to fetch and save YouTube data
async function fetchYouTubeDataNow() {
  console.log('🚀 Manual YouTube data fetch initiated...');

  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
    console.error('❌ YouTube API key not configured');
    return false;
  }

  if (!supabase) {
    console.log('🔧 Initializing Supabase...');
    if (!initSupabase()) {
      console.error('❌ Failed to initialize Supabase');
      return false;
    }
  }

  try {
    // Fetch YouTube data
    const youtubeData = await fetchYouTubeDataFromAPI('trending tech AI blockchain crypto gaming', 30);

    if (!youtubeData || youtubeData.length === 0) {
      console.error('❌ No YouTube data received');
      return false;
    }

    console.log(`📊 Retrieved ${youtubeData.length} videos from YouTube`);

    // Process for Supabase
    const processedData = await processYouTubeDataForSupabase(youtubeData);
    console.log('🔄 Processed data for Supabase');

    // Save to Supabase
    const saveSuccess = await saveYouTubeDataToSupabase(processedData);

    if (saveSuccess) {
      console.log('✅ Successfully saved YouTube data to Supabase!');
      console.log('🔄 Refreshing dashboard...');

      // Refresh the dashboard with new data
      const newData = await fetchData();
      currentData = newData;
      updateTrendFilter(newData.chartData);
      createChart(newData.chartData, selectedTrends);
      createTrendTable(newData.tableData);

      return true;
    } else {
      console.error('❌ Failed to save data to Supabase');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in manual fetch:', error);
    return false;
  }
}

// Make the function globally available
window.fetchYouTubeDataNow = fetchYouTubeDataNow;

// Function to fetch fresh YouTube data
async function fetchFreshYouTubeData() {
  try {
    showLoadingSpinner();
    console.log('🔄 Fetching fresh YouTube data...');

    const response = await fetch('/api/fetch-youtube?q=trending&maxResults=50');
    const result = await response.json();

    if (result.success) {
      console.log(`✅ Fetched ${result.count} new videos`);
      hideLoadingSpinner();
      // Refresh the display
      location.reload();
    } else {
      console.error('❌ Failed to fetch data:', result.message);
      hideLoadingSpinner();
    }
  } catch (error) {
    console.error('❌ Error fetching fresh data:', error);
    hideLoadingSpinner();
  }
}

// Function for bulk data fetching
async function fetchBulkData(categories = 'all', totalResults = 1000) {
  try {
    showLoadingSpinner();
    console.log(`🔄 Starting bulk fetch: ${totalResults} videos across ${categories} categories...`);

    const response = await fetch(`/api/bulk-fetch?categories=${categories}&totalResults=${totalResults}`);
    const result = await response.json();

    if (result.success) {
      console.log(`✅ Bulk fetch completed: ${result.count} videos fetched`);
      console.log(`📊 Used ${result.queries_used} different search queries`);

      hideLoadingSpinner();
      // Refresh the display
      location.reload();
      return result;
    } else {
      console.error('❌ Bulk fetch failed:', result.message);
      hideLoadingSpinner();
      return null;
    }
  } catch (error) {
    console.error('❌ Error in bulk fetch:', error);
    hideLoadingSpinner();
    return null;
  }
}

// Make bulk fetch available globally
window.fetchBulkData = fetchBulkData;

// Combined search function that handles trends, search terms, and date ranges
async function performComprehensiveSearch() {
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('trendFilter');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedTrend = filterSelect.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  // Determine what to search for
  let queryTerm = searchTerm;
  if (!queryTerm && selectedTrend !== 'all') {
    queryTerm = selectedTrend;
  }
  if (!queryTerm) {
    queryTerm = 'trending';
  }

  console.log(`🔍 Comprehensive search for: "${queryTerm}", dates: ${startDate || 'any'} to ${endDate || 'any'}`);

  try {
    // Show loading spinner
    showLoadingSpinner();
    // First, try to fetch fresh data for this search term
    if (queryTerm !== 'all') {
      const response = await fetch(`/api/fetch-youtube?q=${encodeURIComponent(queryTerm)}&maxResults=50`);
      const result = await response.json();

      if (result.success) {
        console.log(`✅ Fetched ${result.count} new videos for "${queryTerm}"`);
      }
    }

    // Then filter existing data
    await filterByDateRange();

    // Hide loading spinner
    hideLoadingSpinner();

  } catch (error) {
    console.error('❌ Error in comprehensive search:', error);
    hideLoadingSpinner();
  }
}

// Make comprehensive search available globally
window.performComprehensiveSearch = performComprehensiveSearch;

// Offline search function for when quota is exceeded
async function searchExistingDataOnly() {
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('trendFilter');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  let searchTerm = searchInput.value.toLowerCase().trim();
  const selectedTrend = filterSelect.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  // Use selected trend if no search term provided
  if (!searchTerm && selectedTrend !== 'all') {
    searchTerm = selectedTrend;
  }

  console.log(`🔍 Searching existing data for: "${searchTerm}"`);

  try {
    // Get all existing data from Supabase
    const allData = await fetchYouTubeDataFromSupabase();

    if (allData && allData.length > 0) {
      let dataToProcess = allData;

      // Filter by search term
      if (searchTerm && searchTerm !== 'all') {
        dataToProcess = allData.filter(item => {
          const title = (item.title || '').toLowerCase();
          const category = (item.trend_category || '').toLowerCase();
          const channel = (item.channel_title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();

          return title.includes(searchTerm) || 
                 category.includes(searchTerm) || 
                 channel.includes(searchTerm) ||
                 description.includes(searchTerm);
        });
      }

      // Filter by date range
      if (startDate || endDate) {
        dataToProcess = dataToProcess.filter(item => {
          const itemDate = new Date(item.published_at);
          const start = startDate ? new Date(startDate) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
          return itemDate >= start && itemDate <= end;
        });
      }

      if (dataToProcess.length > 0) {
        const chartData = createSearchBasedChartData(dataToProcess, searchTerm, startDate, endDate);
        currentData = { chartData, tableData: dataToProcess };
        filteredData = chartData;

        updateTrendFilter(chartData);
        createChart(chartData, searchTerm);
        createTrendTable(dataToProcess.slice(0, 25));

        console.log(`✅ Found ${dataToProcess.length} existing videos for "${searchTerm}"`);
      } else {
        console.log(`⚠️ No existing videos found for "${searchTerm}"`);
        const tableBody = document.getElementById('trendTableBody');
        if (tableBody) {
          tableBody.innerHTML = `<tr><td colspan="4">No existing data found for "${searchTerm}"</td></tr>`;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error searching existing data:', error);
  }
}

// Make offline search available globally
window.searchExistingDataOnly = searchExistingDataOnly;

// Authentication functions
async function handleAuthSuccess(user) {
  try {
    console.log('🔐 User authenticated:', user);

    // Send user data to backend
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        replit_user_id: user.id,
        replit_username: user.name,
        replit_roles: user.roles ? user.roles.join(',') : ''
      })
    });

    const result = await response.json();

    if (result.success) {
      currentUser = result.user;
      isAuthenticated = true;

      console.log('✅ User session created:', currentUser);
      updateUserInterface();

      // Store in localStorage for persistence
      localStorage.setItem('wavesight_user', JSON.stringify(currentUser));
      localStorage.setItem('wavesight_auth', 'true');

    } else {
      console.error('❌ Authentication failed:', result.message);
    }

  } catch (error) {
    console.error('❌ Auth error:', error);
  }
}

function updateUserInterface() {
  const userSection = document.getElementById('userSection');
  const loginSection = document.getElementById('loginSection');

  if (isAuthenticated && currentUser) {
    // Show user info
    if (userSection) {
      userSection.innerHTML = `
        <div class="user-info">
          <span class="user-welcome">Welcome, ${currentUser.display_name || currentUser.replit_username}!</span>
          <span class="user-stats">${currentUser.login_count} sessions</span>
          <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
      `;
      userSection.style.display = 'flex';
    }

    // Hide login
    if (loginSection) {
      loginSection.style.display = 'none';
    }

    // Apply user preferences if available
    if (currentUser.dashboard_config) {
      applyUserPreferences(currentUser.dashboard_config);
    }

  } else {
    // Show login
    if (loginSection) {
      loginSection.style.display = 'block';
    }

    // Hide user info
    if (userSection) {
      userSection.style.display = 'none';
    }
  }
}

function applyUserPreferences(config) {
  try {
    // Apply theme
    if (config.theme === 'light') {
      document.body.classList.add('light-theme');
    }

    // Apply default date range
    if (config.default_date_range) {
      const days = config.default_date_range;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startInput = document.getElementById('startDate');
      const endInput = document.getElementById('endDate');

      if (startInput && endInput) {
        startInput.value = startDate.toISOString().split('T')[0];
        endInput.value = endDate.toISOString().split('T')[0];
      }
    }
  } catch (error) {
    console.log('⚠️ Could not apply user preferences:', error);
  }
}

async function logout() {
  currentUser = null;
  isAuthenticated = false;

  // Clear localStorage
  localStorage.removeItem('wavesight_user');
  localStorage.removeItem('wavesight_auth');

  // Update UI
  updateUserInterface();

  console.log('👋 User logged out');

  // Reload page to reset state
  location.reload();
}

function checkStoredAuth() {
  try {
    const storedAuth = localStorage.getItem('wavesight_auth');
    const storedUser = localStorage.getItem('wavesight_user');

    if (storedAuth === 'true' && storedUser) {
      currentUser = JSON.parse(storedUser);
      isAuthenticated = true;
      console.log('✅ Restored user session:', currentUser.replit_username);
      updateUserInterface();
      return true;
    }
  } catch (error) {
    console.log('⚠️ Could not restore user session:', error);
    localStorage.removeItem('wavesight_user');
    localStorage.removeItem('wavesight_auth');
  }

  return false;
}

// Make auth functions globally available
window.handleAuthSuccess = handleAuthSuccess;
window.logout = logout;

// Helper functions for updating display
function updateChart(chartData) {
  if (chartData) {
    currentData = { chartData, tableData: currentData?.tableData || [] };
    updateTrendFilter(chartData);
    createChart(chartData, selectedTrends);
  }
}

function updateTable(tableData) {
  if (tableData) {
    createTrendTable(tableData);
  }
}

// Analyze: The code initializes the dashboard and sets the default date range to six months prior to the current date.
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing WAVESIGHT dashboard...');

  // Check for stored authentication first
  checkStoredAuth();

  // Set default 6-month date range (only if not overridden by user preferences)
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  if (startDateInput && endDateInput && !startDateInput.value) {
    startDateInput.value = sixMonthsAgo.toISOString().split('T')[0];
    endDateInput.value = today.toISOString().split('T')[0];
    console.log(`📅 Default date range set: ${startDateInput.value} to ${endDateInput.value}`);
  }

  // Initialize Supabase
  initSupabase();

  // Validate YouTube API
  await validateYouTubeAPI();

  // Fetch and display data
  try {
    const data = await fetchData();
    currentData = data; // Store data globally

    console.log('Loaded data:', data);

    // Update filter dropdown with chart data to get trend names
    updateTrendFilter(data.chartData);

    // Create chart
    createChart(data.chartData, selectedTrends);

    // Create table
    createTrendTable(data.tableData);

    console.log('Dashboard initialized successfully');

  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }

  // Set up refresh interval
  setInterval(async () => {
    try {
      console.log('Refreshing data...');
      const data = await fetchData();
      currentData = data;
      updateTrendFilter(data.chartData);
      createChart(data.chartData, selectedTrends);
      createTrendTable(data.tableData);
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  }, 60000); // Refresh every 60 seconds
});