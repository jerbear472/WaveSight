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

// Create interactive chart with click functionality
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
  canvas.height = 400 * dpr;

  // Set display size (CSS pixels)
  canvas.style.width = '100%';
  canvas.style.height = '400px';
  canvas.style.background = '#13131f';
  canvas.style.borderRadius = '12px';
  canvas.style.cursor = 'pointer';

  chartContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Scale context to account for device pixel ratio
  ctx.scale(dpr, dpr);

  // Enable anti-aliasing for smooth text
  ctx.textRenderingOptimization = 'optimizeQuality';
  ctx.imageSmoothingEnabled = true;

  // Chart dimensions (use display size, not canvas size)
  const padding = 60;
  const legendHeight = 40;
  const axisHeight = 30;
  const displayWidth = containerWidth;
  const displayHeight = 400;
  const chartWidth = displayWidth - padding * 2;
  const chartHeight = displayHeight - padding * 2 - legendHeight - axisHeight;

  // Process chart data if not available
  if (!data || data.length === 0) {
    // Create mock chart data from current table data
    if (currentData && currentData.tableData) {
      data = createMockChartData(currentData.tableData);
    } else {
      ctx.fillStyle = '#f1f1f1';
      ctx.font = '16px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', displayWidth / 2, displayHeight / 2);
      return;
    }
  }

  // Get all trend names
  let allTrendNames = [];
  data.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => {
      if (key !== 'date' && !allTrendNames.includes(key)) {
        allTrendNames.push(key);
      }
    });
  });

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
    trendNames = sortedAllTrends.filter(name => name.toLowerCase().includes(filteredTrends.toLowerCase()));
  }

  // Expanded color palette
  const colors = [
    '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'
  ];

  // Ensure we have valid trends with data
  if (trendNames.length === 0) {
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '16px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No trend data available', displayWidth / 2, displayHeight / 2);
    return;
  }

  // Find max value for scaling
  const allValues = data.flatMap(d => 
    trendNames.map(trend => d[trend] || 0).filter(v => typeof v === 'number' && v > 0)
  );
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1000000;

  // Calculate positions for all points
  const finalPositions = [];
  const clickableAreas = [];
  
  trendNames.forEach((trendName, trendIndex) => {
    const positions = [];
    data.forEach((item, index) => {
      const value = item[trendName] || 0;
      const x = padding + (chartWidth * index) / Math.max(data.length - 1, 1);
      const y = padding + legendHeight + chartHeight - ((value / maxValue) * chartHeight);
      
      positions.push({ x, y, value, dataIndex: index, trendName });
      
      // Add clickable area (circle around each point)
      clickableAreas.push({
        x, y, 
        radius: 8,
        trendName,
        value,
        dataIndex: index,
        color: colors[trendIndex % colors.length]
      });
    });
    finalPositions.push(positions);
  });

  // Draw static elements
  function drawChart() {
    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw grid lines
    ctx.strokeStyle = '#2e2e45';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + legendHeight + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const value = maxValue * (5 - i) / 5;
      const y = padding + legendHeight + (chartHeight * i) / 5;
      ctx.fillText(formatNumber(value), padding - 10, y + 4);
    }

    // Draw y-axis title
    ctx.save();
    ctx.translate(20, padding + legendHeight + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#5ee3ff';
    ctx.font = 'bold 14px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Reach Count (Views)', 0, 0);
    ctx.restore();

    // Draw x-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    data.forEach((item, index) => {
      const x = padding + (chartWidth * index) / Math.max(data.length - 1, 1);
      let label = item.date || `Period ${index + 1}`;

      // Format date if possible
      if (item.date && item.date.includes('/')) {
        const parts = item.date.split('/');
        if (parts.length >= 2) {
          const month = parseInt(parts[0]) - 1;
          if (month >= 0 && month < 12) {
            label = monthNames[month];
          }
        }
      }

      ctx.fillText(label, x, padding + legendHeight + chartHeight + 20);
    });

    // Draw trend lines and areas
    finalPositions.forEach((positions, trendIndex) => {
      if (positions.length === 0) return;

      const color = colors[trendIndex % colors.length];
      
      // Draw filled area
      const gradient = ctx.createLinearGradient(0, padding + legendHeight, 0, padding + legendHeight + chartHeight);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '08');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      
      if (positions.length > 0) {
        ctx.moveTo(positions[0].x, padding + legendHeight + chartHeight);
        ctx.lineTo(positions[0].x, positions[0].y);
        
        for (let i = 1; i < positions.length; i++) {
          ctx.lineTo(positions[i].x, positions[i].y);
        }
        
        ctx.lineTo(positions[positions.length - 1].x, padding + legendHeight + chartHeight);
        ctx.closePath();
        ctx.fill();
      }

      // Draw trend line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      positions.forEach((pos, index) => {
        if (index === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.stroke();

      // Draw data points
      positions.forEach(pos => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add white border for visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Draw legend
    ctx.font = 'bold 12px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';

    let legendX = padding;
    const legendY = 25;

    trendNames.forEach((trendName, trendIndex) => {
      const color = colors[trendIndex % colors.length];

      // Draw legend box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 10, 10);

      // Draw legend text
      ctx.fillStyle = '#f1f1f1';
      ctx.fillText(trendName, legendX + 15, legendY + 8);

      // Calculate text width and move to next position
      const textWidth = ctx.measureText(trendName).width;
      legendX += textWidth + 30;
    });
  }

  // Add click event listener
  canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width * dpr);
    const scaleY = canvas.height / (rect.height * dpr);
    
    const clickX = (event.clientX - rect.left) * scaleX / dpr;
    const clickY = (event.clientY - rect.top) * scaleY / dpr;

    // Check if click is on any data point
    clickableAreas.forEach(area => {
      const distance = Math.sqrt(
        Math.pow(clickX - area.x, 2) + Math.pow(clickY - area.y, 2)
      );
      
      if (distance <= area.radius) {
        showTrendBreakdown(area.trendName, area.value, area.dataIndex);
      }
    });
  });

  // Draw the chart
  drawChart();
}

// Create mock chart data from table data
function createMockChartData(tableData) {
  if (!tableData || tableData.length === 0) return [];

  // Group data by trend categories
  const trendGroups = {};
  
  tableData.forEach(item => {
    const category = item.trend_category || categorizeContent(item.title || item.trend_name || '');
    const reach = item.view_count || item.reach_count || 0;
    
    if (!trendGroups[category]) {
      trendGroups[category] = [];
    }
    trendGroups[category].push(reach);
  });

  // Create time series data
  const dates = ['6/2024', '7/2024', '8/2024', '9/2024', '10/2024', '11/2024', '12/2024', '1/2025'];
  const chartData = [];

  dates.forEach((date, index) => {
    const dataPoint = { date };
    
    Object.keys(trendGroups).forEach(category => {
      const baseValue = trendGroups[category].reduce((sum, val) => sum + val, 0) / trendGroups[category].length;
      // Add some variation over time
      const variation = 0.8 + (Math.sin(index * 0.5) + 1) * 0.3;
      dataPoint[category] = Math.floor(baseValue * variation);
    });
    
    chartData.push(dataPoint);
  });

  return chartData;
}

// Categorize content based on title
function categorizeContent(title) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('ai') || titleLower.includes('artificial intelligence') || titleLower.includes('machine learning')) {
    return 'AI Tools';
  } else if (titleLower.includes('crypto') || titleLower.includes('bitcoin') || titleLower.includes('blockchain')) {
    return 'Crypto';
  } else if (titleLower.includes('game') || titleLower.includes('gaming') || titleLower.includes('esports')) {
    return 'Gaming';
  } else if (titleLower.includes('music') || titleLower.includes('song') || titleLower.includes('artist')) {
    return 'Music';
  } else if (titleLower.includes('movie') || titleLower.includes('film') || titleLower.includes('tv') || titleLower.includes('series')) {
    return 'Movies & TV';
  } else if (titleLower.includes('car') || titleLower.includes('auto') || titleLower.includes('vehicle')) {
    return 'Automotive';
  } else if (titleLower.includes('health') || titleLower.includes('fitness') || titleLower.includes('workout')) {
    return 'Health & Fitness';
  } else if (titleLower.includes('art') || titleLower.includes('design') || titleLower.includes('creative')) {
    return 'Art & Design';
  } else if (titleLower.includes('sport') || titleLower.includes('football') || titleLower.includes('basketball')) {
    return 'Sports';
  } else if (titleLower.includes('lifestyle') || titleLower.includes('vlog') || titleLower.includes('daily')) {
    return 'Lifestyle';
  }
  
  return 'General';
}

// Show detailed breakdown when user clicks on a trend point
function showTrendBreakdown(trendName, value, dataIndex) {
  console.log(`🔍 Clicked on ${trendName} trend - Value: ${formatNumber(value)}`);
  
  // Get videos that contribute to this trend
  const contributingVideos = getContributingVideos(trendName);
  
  // Create and show modal
  showBreakdownModal(trendName, value, contributingVideos);
}

// Get videos that contribute to a specific trend
function getContributingVideos(trendName) {
  if (!currentData || !currentData.tableData) return [];
  
  return currentData.tableData.filter(video => {
    const category = video.trend_category || categorizeContent(video.title || video.trend_name || '');
    return category === trendName;
  }).slice(0, 10); // Limit to top 10 contributing videos
}

// Show breakdown modal with contributing videos
function showBreakdownModal(trendName, totalReach, videos) {
  // Remove existing modal if any
  const existingModal = document.getElementById('breakdownModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal HTML
  const modalHTML = `
    <div id="breakdownModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${trendName} Breakdown</h2>
          <button class="modal-close" onclick="closeBreakdownModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="breakdown-summary">
            <div class="total-reach">
              <span class="label">Total Reach:</span>
              <span class="value">${formatNumber(totalReach)}</span>
            </div>
            <div class="video-count">
              <span class="label">Contributing Videos:</span>
              <span class="value">${videos.length}</span>
            </div>
          </div>
          <div class="contributing-videos">
            <h3>Top Contributing Videos</h3>
            <div class="video-list">
              ${videos.map(video => `
                <div class="video-item">
                  <div class="video-thumbnail">
                    <img src="${video.thumbnail_medium || video.thumbnail_default || '/api/placeholder/120/90'}" 
                         alt="Thumbnail" onerror="this.src='/api/placeholder/120/90'">
                  </div>
                  <div class="video-details">
                    <h4 class="video-title">${video.title || video.trend_name || 'Untitled'}</h4>
                    <p class="video-channel">${video.channel_title || video.platform || 'Unknown Channel'}</p>
                    <div class="video-stats">
                      <span class="views">${formatNumber(video.view_count || video.reach_count || 0)} views</span>
                      <span class="likes">${formatNumber(video.like_count || 0)} likes</span>
                      <span class="comments">${formatNumber(video.comment_count || 0)} comments</span>
                      <span class="score">Score: ${video.trend_score || video.score || 0}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add event listener to close modal when clicking outside
  const modal = document.getElementById('breakdownModal');
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeBreakdownModal();
    }
  });
}

// Close breakdown modal
function closeBreakdownModal() {
  const modal = document.getElementById('breakdownModal');
  if (modal) {
    modal.remove();
  }
}

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

  // Limit chart data to top 8 trends
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
    .slice(0, 8)
    .map(([trend]) => trend);

  const limitedChartData = chartData.map(dataPoint => {
    const limitedDataPoint = { date: dataPoint.date };
    sortedTrends.forEach(trend => {
      limitedDataPoint[trend] = dataPoint[trend] || 0;
    });
    return limitedDataPoint;
  });

  console.log('Processed chart data:', limitedChartData);
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

// Create trend table
function createTrendTable(data) {
  const tableBody = document.getElementById('trendTableBody');
  if (!tableBody || !data || data.length === 0) {
    console.log('No table data to display');
    return;
  }

  console.log('Creating table with data:', data);

  // Create table rows from data
  const tableHTML = data.slice(0, 10).map((item, index) => {
    // Handle both YouTube API data and fallback data
    const trendName = item.title || item.trend_name || `Trend ${index + 1}`;
    const platform = item.channel_title || item.platform || 'YouTube';
    const reach = item.view_count || item.reach_count || Math.floor(Math.random() * 2000000) + 500000;
    const score = item.trend_score || item.score || Math.min(99, Math.max(50, Math.floor(reach / 15000) + 45));

    return `
      <tr>
        <td>${trendName.length > 50 ? trendName.substring(0, 50) + '...' : trendName}</td>
        <td>${platform}</td>
        <td>${formatNumber(reach)}</td>
        <td>${score}</td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = tableHTML;
  console.log(`Table populated with ${data.slice(0, 10).length} rows`);
}

// Filter chart function
function filterChart() {
  const filterSelect = document.getElementById('trendFilter');
  selectedTrends = filterSelect.value;

  if (currentData) {
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

// Search function
function searchTrends() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput.value.toLowerCase();

  if (searchTerm.trim() === '') {
    selectedTrends = 'all';
  } else {
    selectedTrends = searchTerm;
  }

  // Update dropdown to reflect search
  const filterSelect = document.getElementById('trendFilter');
  filterSelect.value = selectedTrends === 'all' ? 'all' : 'all';

  if (currentData) {
    const dataToUse = filteredData || currentData.chartData;
    createChart(dataToUse, selectedTrends);
  }
}

// Date range filter function
async function filterByDateRange() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  startDate = startDateInput.value;
  endDate = endDateInput.value;

  if (!startDate && !endDate) {
    filteredData = null;
    if (currentData) {
      createChart(currentData.chartData, selectedTrends);
    }
    return;
  }

  console.log(`🗓️ Filtering data from ${startDate} to ${endDate}`);

  try {
    // Get fresh data from Supabase with date filtering
    let filteredApiData = [];

    if (supabase) {
      let query = supabase
        .from('youtube_trends')
        .select('*')
        .order('published_at', { ascending: false });

      // Add date filters if provided
      if (startDate) {
        query = query.gte('published_at', startDate + 'T00:00:00');
      }
      if (endDate) {
        query = query.lte('published_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query.limit(100);

      if (!error && data && data.length > 0) {
        filteredApiData = data;
        console.log(`✅ Found ${filteredApiData.length} videos in date range`);
      } else {
        console.log('⚠️ No data found in date range');
        filteredApiData = [];
      }
    }

    // Process the filtered API data into chart format
    if (filteredApiData.length > 0) {
      const filteredChartData = processSupabaseDataForChart(filteredApiData);
      filteredData = filteredChartData;

      // Update table with filtered data
      createTrendTable(filteredApiData.slice(0, 10));

      // Show date range info
      console.log(`📊 Chart updated with data from ${startDate} to ${endDate}`);
    } else {
      // No data in range, show empty chart
      filteredData = [];
      console.log('📊 No data found in selected date range');
    }

    createChart(filteredData, selectedTrends);

  } catch (error) {
    console.error('❌ Error filtering by date range:', error);

    // Fallback to original chart data filtering
    if (currentData && currentData.chartData) {
      filteredData = currentData.chartData.filter(item => {
        // This is a fallback for mock data with MM/DD format
        if (!item.date) return true;

        const dateParts = item.date.split('/');
        if (dateParts.length !== 2) return true;

        const month = parseInt(dateParts[0]);
        const day = parseInt(dateParts[1]);
        const currentYear = new Date().getFullYear();
        const itemDate = new Date(currentYear, month - 1, day);

        let isInRange = true;
        if (startDate) {
          const start = new Date(startDate);
          isInRange = isInRange && itemDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          isInRange = isInRange && itemDate <= end;
        }

        return isInRange;
      });

      createChart(filteredData, selectedTrends);
    }
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
    console.log('🔄 Fetching fresh YouTube data...');

    const response = await fetch('/api/fetch-youtube?q=trending&maxResults=50');
    const result = await response.json();

    if (result.success) {
      console.log(`✅ Fetched ${result.count} new videos`);
      // Refresh the display
      location.reload();
    } else {
      console.error('❌ Failed to fetch data:', result.message);
    }
  } catch (error) {
    console.error('❌ Error fetching fresh data:', error);
  }
}

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing WAVESIGHT dashboard...');

  // Initialize Supabase
  initSupabase();

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