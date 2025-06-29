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

  if (!data || data.length === 0) {
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Chart dimensions (use display size, not canvas size)
  const padding = 60;
  const legendHeight = 30; // Space for top legend
  const axisHeight = 25; // Reduced space for month labels
  const displayWidth = containerWidth;
  const displayHeight = 330;
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
    trendNames = sortedAllTrends.filter(name => name.toLowerCase().includes(filteredTrends.toLowerCase()));
  }

  // Expanded color palette with unique colors
  const colors = [
    '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#84cc16', '#f472b6', '#a855f7', '#22d3ee', '#fb923c', '#34d399', '#fbbf24', '#f87171'
  ];

  // Find max value for scaling (only from visible trends)
  const maxValue = Math.max(...data.flatMap(d => 
    trendNames.map(trend => d[trend] || 0).filter(v => typeof v === 'number')
  ));

  // Calculate final positions for all points
  const finalPositions = [];
  trendNames.forEach((trendName, trendIndex) => {
    const positions = [];
    data.forEach((item, index) => {
      if (item[trendName] !== undefined) {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + legendHeight + chartHeight - ((item[trendName] / maxValue) * chartHeight);
        positions.push({ x, y, value: item[trendName] });
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

    // Draw x-axis labels (months only)
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px Satoshi, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    // Track months for axis
    let currentMonth = '';
    let monthRanges = [];
    let monthStart = 0;

    // Collect month data
    data.forEach((item, index) => {
      // Parse date to get month
      const dateParts = item.date.split('/');
      const month = dateParts[0];

      // Track month changes
      if (currentMonth !== month) {
        if (currentMonth !== '') {
          monthRanges.push({
            month: currentMonth,
            start: monthStart,
            end: index - 1
          });
        }
        currentMonth = month;
        monthStart = index;
      }

      // Handle last month
      if (index === data.length - 1) {
        monthRanges.push({
          month: currentMonth,
          start: monthStart,
          end: index
        });
      }
    });

    // Draw months
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    monthRanges.forEach(range => {
      const startX = padding + (chartWidth * range.start) / (data.length - 1);
      const endX = padding + (chartWidth * range.end) / (data.length - 1);
      const centerX = (startX + endX) / 2;

      // Draw month separator line
      if (range.start > 0) {
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, padding + legendHeight);
        ctx.lineTo(startX, padding + legendHeight + chartHeight);
        ctx.stroke();
      }

      // Draw month label much closer to x-axis
      const monthIndex = parseInt(range.month);
      const monthName = monthNames[monthIndex] || range.month;
      ctx.fillText(monthName, centerX, padding + legendHeight + chartHeight + 20);
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
    // Draw trend lines with animation
    finalPositions.forEach((positions, trendIndex) => {
      if (positions.length === 0) return;

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
        const firstAnimatedY = baseY + (positions[0].y - baseY) * easeOutCubic(animationProgress);
        ctx.moveTo(positions[0].x, baseY);
        ctx.lineTo(positions[0].x, firstAnimatedY);

        // Draw the smooth curve path for fill using cubic Bézier curves
        positions.forEach((finalPos, pointIndex) => {
          const animatedY = baseY + (finalPos.y - baseY) * easeOutCubic(animationProgress);

          if (pointIndex === 0) {
            // Already moved to first point above
          } else {
            const prevPos = positions[pointIndex - 1];
            const prevAnimatedY = baseY + (prevPos.y - baseY) * easeOutCubic(animationProgress);

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

      // Draw the line on top
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      // Create smooth curves using cubic Bézier curves
      positions.forEach((finalPos, pointIndex) => {
        const animatedY = baseY + (finalPos.y - baseY) * easeOutCubic(animationProgress);

        if (pointIndex === 0) {
          ctx.moveTo(finalPos.x, animatedY);
        } else {
          const prevPos = positions[pointIndex - 1];
          const prevAnimatedY = baseY + (prevPos.y - baseY) * easeOutCubic(animationProgress);

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

  // Start animation
  animate();
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

  // Group data by date and aggregate reach by trend
  const dateMap = new Map();
  const dates = ['1/1', '1/15', '2/1', '2/15', '3/1', '3/15', '4/1', '4/15', '5/1', '5/15', '6/1', '6/15'];

  // Initialize dates
  dates.forEach(date => {
    dateMap.set(date, {});
  });

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

  // Categorize and aggregate data
  supabaseData.forEach((item, index) => {
    const dateIndex = index % dates.length;
    const date = dates[dateIndex];

    const title = (item.title || item.trend_name || '').toLowerCase();
    let category = 'Other';

    // Find matching category
    for (const [groupName, keywords] of Object.entries(trendGroups)) {
      if (keywords.some(keyword => title.includes(keyword))) {
        category = groupName;
        break;
      }
    }

    // Add to date map
    if (!dateMap.get(date)[category]) {
      dateMap.get(date)[category] = 0;
    }
    dateMap.get(date)[category] += item.view_count || item.reach_count || 100000;
  });

  // Convert to chart format
  const chartData = [];
  dates.forEach(date => {
    const dataPoint = { date };
    const dayData = dateMap.get(date);

    Object.keys(trendGroups).forEach(category => {
      dataPoint[category] = dayData[category] || 0;
    });

    chartData.push(dataPoint);
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