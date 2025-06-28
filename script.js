// Supabase credentials
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDU5NDcsImV4cCI6MjA2NjQ4MTk0N30.YGOXgs0LtdCQYqpEWu0BECZFp9gRtk6nJPbOeDwN8kM';

let supabase = null;
let chartRoot = null;
let currentData = null;
let selectedTrends = 'all';

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
    { date: '1/15', 'AI Tools': 1350000, 'ChatGPT': 1100000, 'Blockchain': 920000 },
    { date: '2/1', 'AI Tools': 1800000, 'ChatGPT': 1400000, 'Blockchain': 1100000 },
    { date: '2/15', 'AI Tools': 2100000, 'ChatGPT': 1650000, 'Blockchain': 1300000 },
    { date: '3/1', 'AI Tools': 2500000, 'ChatGPT': 1900000, 'Blockchain': 1500000 },
    { date: '3/15', 'AI Tools': 2800000, 'ChatGPT': 2200000, 'Blockchain': 1700000 },
    { date: '4/1', 'AI Tools': 3200000, 'ChatGPT': 2500000, 'Blockchain': 1900000 },
    { date: '4/15', 'AI Tools': 3600000, 'ChatGPT': 2800000, 'Blockchain': 2100000 },
    { date: '5/1', 'AI Tools': 4000000, 'ChatGPT': 3100000, 'Blockchain': 2300000 },
    { date: '5/15', 'AI Tools': 4400000, 'ChatGPT': 3400000, 'Blockchain': 2500000 },
    { date: '6/1', 'AI Tools': 4800000, 'ChatGPT': 3700000, 'Blockchain': 2700000 },
    { date: '6/15', 'AI Tools': 5200000, 'ChatGPT': 4000000, 'Blockchain': 2900000 }
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

  // Create canvas element
  const canvas = document.createElement('canvas');
  const containerWidth = chartContainer.clientWidth || 800;
  canvas.width = containerWidth;
  canvas.height = 300;
  canvas.style.width = '100%';
  canvas.style.height = '300px';
  canvas.style.background = '#13131f';
  canvas.style.borderRadius = '12px';
  
  chartContainer.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  
  if (!data || data.length === 0) {
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Chart dimensions
  const padding = 60;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

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

  // Draw grid lines
  ctx.strokeStyle = '#2e2e45';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartWidth, y);
    ctx.stroke();
  }

  // Draw y-axis labels
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px Inter';
  ctx.textAlign = 'right';
  
  for (let i = 0; i <= 4; i++) {
    const value = maxValue * (4 - i) / 4;
    const y = padding + (chartHeight * i) / 4;
    ctx.fillText(formatNumber(value), padding - 10, y + 4);
  }

  // Draw x-axis labels
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  data.forEach((item, index) => {
    const x = padding + (chartWidth * index) / (data.length - 1);
    ctx.fillText(item.date, x, canvas.height - 15);
  });

  // Draw trend lines
  trendNames.forEach((trendName, trendIndex) => {
    const color = colors[trendIndex % colors.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    let firstPoint = true;
    
    data.forEach((item, index) => {
      if (item[trendName] !== undefined) {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + chartHeight - ((item[trendName] / maxValue) * chartHeight);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    
    ctx.stroke();

    // Draw legend
    const legendY = 20 + (trendIndex * 18);
    ctx.fillStyle = color;
    ctx.fillRect(20, legendY, 8, 8);
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(trendName, 32, legendY + 7);
  });
}

// Fetch data from Supabase
async function fetchData() {
  console.log('Fetching data...');

  if (!supabase) {
    console.log('Using fallback data - no Supabase connection');
    return fallbackData;
  }

  try {
    // Try different table names and column structures
    let trendData = null;
    let error = null;

    // Try trend_reach table first
    const result1 = await supabase
      .from('trend_reach')
      .select('*')
      .limit(50);
    
    if (!result1.error && result1.data) {
      trendData = result1.data;
      console.log('Successfully fetched from trend_reach:', trendData);
    } else {
      console.log('trend_reach failed:', result1.error);
      
      // Try table_range table
      const result2 = await supabase
        .from('table_range')
        .select('*')
        .limit(50);
      
      if (!result2.error && result2.data) {
        trendData = result2.data;
        console.log('Successfully fetched from table_range:', trendData);
      } else {
        console.log('table_range failed:', result2.error);
        
        // Try any table with similar structure
        const result3 = await supabase
          .from('trends')
          .select('*')
          .limit(50);
        
        if (!result3.error && result3.data) {
          trendData = result3.data;
          console.log('Successfully fetched from trends:', trendData);
        } else {
          console.log('All table attempts failed, using fallback');
          return fallbackData;
        }
      }
    }

    if (!trendData || trendData.length === 0) {
      console.log('No data returned from Supabase');
      return fallbackData;
    }

    // Process the data for chart
    const processedChartData = processDataForChart(trendData);
    const processedTableData = trendData;

    return {
      chartData: processedChartData,
      tableData: processedTableData
    };

  } catch (error) {
    console.error('Fetch error:', error);
    return fallbackData;
  }
}

// Process data for chart display
function processDataForChart(rawData) {
  // Group data by time periods
  const timeGroups = {};

  rawData.forEach((item, index) => {
    // Create time grouping (you can adjust this based on your data structure)
    const timeKey = item.timestamp || item.created_at || `Time ${Math.floor(index / 3) + 1}`;
    const trendName = item.trend_name || 'Unknown';
    const reach = item.reach_count || item.reach || 0;

    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = { date: timeKey };
    }

    timeGroups[timeKey][trendName] = reach;
  });

  return Object.values(timeGroups).slice(0, 15); // Show up to 15 time points for larger range
}

// Create trend table
function createTrendTable(data) {
  const tableBody = document.getElementById('trendTableBody');
  if (!tableBody) return;

  const tableHTML = data.map(item => {
    const trendName = item.trend_name || 'Unknown Trend';
    const platform = item.platform || 'Various';
    const reach = item.reach_count || item.reach || 0;
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
    createChart(currentData.chartData, selectedTrends);
  }
}

// Update trend filter dropdown
function updateTrendFilter(data) {
  const filterSelect = document.getElementById('trendFilter');
  if (!filterSelect || !data) return;

  // Get all unique trend names
  const allTrends = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'date')))];
  
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

    // Update filter dropdown
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
  }, 30000); // Refresh every 30 seconds
});