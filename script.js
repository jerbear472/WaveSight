// Supabase and YouTube API configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your actual Supabase URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual Supabase anon key
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your actual YouTube API key

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
      console.log('Supabase initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      return false;
    }
  } else {
    console.log('Supabase credentials not configured - using fallback data');
    supabase = null;
    return false;
  }
}

// YouTube API functions
async function fetchYouTubeData(query = 'trending', maxResults = 50) {
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
    console.log('YouTube API key not configured');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=relevance&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    return null;
  }
}

async function processYouTubeDataForSupabase(youtubeData) {
  if (!youtubeData) return [];

  return youtubeData.map(item => ({
    trend_name: item.snippet.title.substring(0, 100), // Limit title length
    platform: 'YouTube',
    reach_count: Math.floor(Math.random() * 2000000) + 100000, // Simulated reach since API doesn't provide this
    score: Math.floor(Math.random() * 50) + 50,
    video_id: item.id.videoId,
    channel_name: item.snippet.channelTitle,
    published_at: item.snippet.publishedAt,
    description: item.snippet.description?.substring(0, 500) || '',
    thumbnail_url: item.snippet.thumbnails?.medium?.url || ''
  }));
}

async function saveYouTubeDataToSupabase(processedData) {
  if (!supabase || !processedData || processedData.length === 0) {
    console.log('Cannot save to Supabase: no connection or data');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('youtube_trends')
      .insert(processedData);

    if (error) {
      console.error('Error saving YouTube data to Supabase:', error);
      return false;
    }

    console.log('YouTube data saved to Supabase successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in saveYouTubeDataToSupabase:', error);
    return false;
  }
}

async function fetchYouTubeDataFromSupabase() {
  if (!supabase) {
    console.log('Supabase not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('youtube_trends')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching YouTube data from Supabase:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchYouTubeDataFromSupabase:', error);
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

  // Filter trends based on selection
  let trendNames;
  if (filteredTrends === 'all') {
    trendNames = allTrendNames;
  } else {
    trendNames = allTrendNames.filter(name => name.toLowerCase().includes(filteredTrends.toLowerCase()));
  }

  const colors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#ef4444'];

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
  console.log('Fetching data with YouTube integration...');
  
  // Try to fetch YouTube data and save to Supabase
  if (supabase && YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY') {
    try {
      // Fetch fresh YouTube data
      const youtubeData = await fetchYouTubeData('trending tech AI blockchain', 20);
      if (youtubeData) {
        const processedData = await processYouTubeDataForSupabase(youtubeData);
        await saveYouTubeDataToSupabase(processedData);
      }

      // Fetch data from Supabase
      const supabaseData = await fetchYouTubeDataFromSupabase();
      if (supabaseData && supabaseData.length > 0) {
        console.log('Using YouTube data from Supabase:', supabaseData.length, 'items');
        
        // Convert Supabase data to chart format
        const chartData = processSupabaseDataForChart(supabaseData);
        
        return {
          chartData: chartData,
          tableData: supabaseData.slice(0, 10) // Show top 10 in table
        };
      }
    } catch (error) {
      console.error('Error with YouTube/Supabase integration:', error);
    }
  }
  
  console.log('Using enhanced fallback data...');
  
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

  // Group trends by keywords
  const trendGroups = {
    'AI Tools': ['AI', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai'],
    'Tech Trends': ['technology', 'tech', 'innovation', 'startup'],
    'Blockchain': ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'web3'],
    'Programming': ['coding', 'programming', 'developer', 'software'],
    'Gaming': ['gaming', 'game', 'esports', 'streamer']
  };

  // Categorize and aggregate data
  supabaseData.forEach((item, index) => {
    const dateIndex = index % dates.length;
    const date = dates[dateIndex];
    
    const title = item.trend_name.toLowerCase();
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
    dateMap.get(date)[category] += item.reach_count || 100000;
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

  return chartData;
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
    .slice(0, 5); // Limit to top 5 trends

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
    const trendName = item.trend_name || `Trend ${index + 1}`;
    const platform = item.platform || 'Various';
    const reach = item.reach_count || Math.floor(Math.random() * 2000000) + 500000;
    const score = item.score || Math.min(99, Math.max(50, Math.floor(reach / 15000) + 45));

    return `
      <tr>
        <td>${trendName}</td>
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
function filterByDateRange() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  startDate = startDateInput.value;
  endDate = endDateInput.value;

  if (!currentData) return;

  if (!startDate && !endDate) {
    filteredData = null;
    createChart(currentData.chartData, selectedTrends);
    return;
  }

  // Convert chart dates to comparable format
  const filterData = currentData.chartData.filter(item => {
    if (!item.date) return true;

    // Parse date format (assuming MM/DD or M/D format)
    const dateParts = item.date.split('/');
    if (dateParts.length !== 2) return true;

    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);

    // Assume current year for comparison
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

  filteredData = filterData;
  createChart(filteredData, selectedTrends);
}

// Reset date filter function
function resetDateFilter() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  startDate = null;
  endDate = null;
  filteredData = null;

  if (currentData) {
    createChart(currentData.chartData, selectedTrends);
  }
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing WAVESIGHT dashboard...');

  // Initialize (Supabase disabled)
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

    console.log('Dashboard initialized successfully with enhanced fallback data');

  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }

  // Set up refresh interval (using static data, but keeping for future database integration)
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
  }, 30000); // Refresh every 30 seconds
});