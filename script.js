// Supabase credentials
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDU5NDcsImV4cCI6MjA2NjQ4MTk0N30.YGOXgs0LtdCQYqpEWu0BECZFp9gRtk6nJPbOeDwN8kM';

let supabase = null;
let chartRoot = null;
let currentData = null;
let selectedTrends = 'all';
let filteredData = null;
let startDate = null;
let endDate = null;

// Initialize Supabase
function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized');
      return true;
    } else {
      console.error('Supabase library not loaded');
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return false;
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
  const axisHeight = 60; // Space for dual axis labels
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
      
      // No separator lines needed
      
      // Draw month label closer to x-axis
      const monthIndex = parseInt(range.month);
      const monthName = monthNames[monthIndex] || range.month;
      ctx.fillText(monthName, centerX, displayHeight - 5);
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

// Fetch data from Supabase
async function fetchData() {
  console.log('Fetching data...');

  if (!supabase) {
    console.log('Using fallback data - no Supabase connection');
    return fallbackData;
  }

  try {
    // Get all available tables first
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    console.log('Available tables:', tables);

    let allData = [];
    let successfulTable = null;

    // Try common table names that might contain trend data
    const possibleTables = ['trends', 'trend_reach', 'table_range', 'social_trends', 'trend_data'];

    for (const tableName of possibleTables) {
      try {
        console.log(`Trying table: ${tableName}`);
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(100);

        if (!error && data && data.length > 0) {
          console.log(`Successfully fetched ${data.length} records from ${tableName}:`, data);
          allData = data;
          successfulTable = tableName;
          break;
        } else if (error) {
          console.log(`Error with ${tableName}:`, error.message);
        }
      } catch (err) {
        console.log(`Exception with ${tableName}:`, err.message);
      }
    }

    // If no predefined tables work, try to get any table with data
    if (allData.length === 0 && tables) {
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table.table_name)
            .select('*')
            .limit(100);

          if (!error && data && data.length > 0) {
            console.log(`Found data in table ${table.table_name}:`, data);
            allData = data;
            successfulTable = table.table_name;
            break;
          }
        } catch (err) {
          // Skip tables that cause errors
          continue;
        }
      }
    }

    if (allData.length === 0) {
      console.log('No data found in any table, using fallback');
      return fallbackData;
    }

    console.log(`Using data from table: ${successfulTable}`);
    console.log('Sample record:', allData[0]);

    // Process the data for chart and table
    const processedChartData = processDataForChart(allData);

    return {
      chartData: processedChartData,
      tableData: allData,
      sourceTable: successfulTable
    };

  } catch (error) {
    console.error('Fetch error:', error);
    return fallbackData;
  }
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

  // Try to identify trend name column
  const trendNameColumn = columns.find(col => 
    col.includes('trend') || col.includes('name') || col.includes('title')
  ) || columns[0];

  // Try to identify reach/value column
  const reachColumn = columns.find(col => 
    col.includes('reach') || col.includes('count') || col.includes('value') || 
    col.includes('views') || col.includes('engagement')
  ) || columns.find(col => typeof sample[col] === 'number') || columns[1];

  // Try to identify date/time column
  const dateColumn = columns.find(col => 
    col.includes('date') || col.includes('time') || col.includes('created')
  );

  console.log(`Using columns - Trend: ${trendNameColumn}, Reach: ${reachColumn}, Date: ${dateColumn}`);

  // Create individual data points for each trend and date combination
  const trendMap = new Map();
  const dates = ['1/1', '1/15', '2/1', '2/15', '3/1', '3/15', '4/1', '4/15', '5/1', '5/15', '6/1', '6/15'];

  // Group raw data by trend name to track individual trends over time
  rawData.forEach((item, index) => {
    const trendName = item[trendNameColumn] || `Trend ${index + 1}`;
    const reach = typeof item[reachColumn] === 'number' ? item[reachColumn] : 
                  parseInt(item[reachColumn]) || Math.floor(Math.random() * 1000000) + 500000;

    if (!trendMap.has(trendName)) {
      trendMap.set(trendName, []);
    }

    // Assign a date for this data point
    let timeKey;
    if (dateColumn && item[dateColumn]) {
      const date = new Date(item[dateColumn]);
      timeKey = `${date.getMonth() + 1}/${date.getDate()}`;
    } else {
      // Distribute items across dates based on their index
      const trendData = trendMap.get(trendName);
      timeKey = dates[trendData.length % dates.length] || dates[0];
    }

    trendMap.get(trendName).push({
      date: timeKey,
      reach: reach
    });
  });

  // Convert to chart format - each date gets its own data point with actual values
  const chartData = [];
  const usedDates = new Set();

  // Collect all dates that have data
  trendMap.forEach((dataPoints) => {
    dataPoints.forEach(point => usedDates.add(point.date));
  });

  // Sort dates chronologically
  const sortedDates = Array.from(usedDates).sort((a, b) => {
    const [aMonth, aDay] = a.split('/').map(Number);
    const [bMonth, bDay] = b.split('/').map(Number);
    return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
  });

  // Create chart data structure
  sortedDates.slice(0, 12).forEach(date => {
    const dataPoint = { date };

    trendMap.forEach((dataPoints, trendName) => {
      // Find the actual reach for this trend on this specific date
      const pointForDate = dataPoints.find(point => point.date === date);
      if (pointForDate) {
        dataPoint[trendName] = pointForDate.reach;
      } else {
        // If no data for this date, use 0 or interpolated value
        dataPoint[trendName] = 0;
      }
    });

    chartData.push(dataPoint);
  });

  console.log('Processed chart data (non-cumulative):', chartData);
  return chartData;
}

// Create trend table
function createTrendTable(data) {
  const tableBody = document.getElementById('trendTableBody');
  if (!tableBody || !data || data.length === 0) return;

  // Analyze data structure
  const sample = data[0];
  const columns = Object.keys(sample);

  // Try to identify key columns
  const trendNameColumn = columns.find(col => 
    col.includes('trend') || col.includes('name') || col.includes('title')
  ) || columns[0];

  const platformColumn = columns.find(col => 
    col.includes('platform') || col.includes('source') || col.includes('site')
  ) || columns.find(col => typeof sample[col] === 'string' && col !== trendNameColumn) || 'N/A';

  const reachColumn = columns.find(col => 
    col.includes('reach') || col.includes('count') || col.includes('value') || 
    col.includes('views') || col.includes('engagement')
  ) || columns.find(col => typeof sample[col] === 'number') || columns[1];

  console.log(`Table columns - Trend: ${trendNameColumn}, Platform: ${platformColumn}, Reach: ${reachColumn}`);

  const tableHTML = data.map((item, index) => {
    const trendName = item[trendNameColumn] || `Trend ${index + 1}`;
    const platform = platformColumn !== 'N/A' ? (item[platformColumn] || 'Various') : 'Various';
    const reach = typeof item[reachColumn] === 'number' ? item[reachColumn] : 
                  parseInt(item[reachColumn]) || Math.floor(Math.random() * 1000000) + 500000;
    const score = Math.min(99, Math.floor(reach / 10000) + 50);

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

  // Initialize Supabase
  const supabaseReady = initSupabase();
  console.log('Supabase ready:', supabaseReady);

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

    if (data.sourceTable) {
      console.log(`Dashboard initialized successfully using table: ${data.sourceTable}`);
    } else {
      console.log('Dashboard initialized with fallback data');
    }

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
  }, 30000); // Refresh every 30 seconds
});