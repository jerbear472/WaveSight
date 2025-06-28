// Supabase credentials
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDU5NDcsImV4cCI6MjA2NjQ4MTk0N30.YGOXgs0LtdCQYqpEWu0BECZFp9gRtk6nJPbOeDwN8kM';

let supabase = null;
let chartRoot = null;

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
    { date: 'Jan 1', 'AI Tools': 1200000, 'ChatGPT': 950000, 'Blockchain': 800000 },
    { date: 'Jan 2', 'AI Tools': 1350000, 'ChatGPT': 1100000, 'Blockchain': 920000 },
    { date: 'Jan 3', 'AI Tools': 1800000, 'ChatGPT': 1400000, 'Blockchain': 1100000 },
    { date: 'Jan 4', 'AI Tools': 2100000, 'ChatGPT': 1650000, 'Blockchain': 1300000 },
    { date: 'Jan 5', 'AI Tools': 2500000, 'ChatGPT': 1900000, 'Blockchain': 1500000 }
  ],
  tableData: [
    { trend_name: 'AI Art Generation', platform: 'TikTok', reach_count: 2500000 },
    { trend_name: 'ChatGPT Tips', platform: 'Instagram', reach_count: 1800000 },
    { trend_name: 'Blockchain Explained', platform: 'Twitter', reach_count: 950000 },
    { trend_name: 'Machine Learning', platform: 'YouTube', reach_count: 1200000 }
  ]
};

// Create chart with Canvas API
function createChart(data) {
  const chartContainer = document.getElementById('trendChart');
  if (!chartContainer) return;

  // Clear existing content
  chartContainer.innerHTML = '';

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 800;
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
  const trendNames = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'date')))];
  const colors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

  // Find max value for scaling
  const maxValue = Math.max(...data.flatMap(d => 
    Object.values(d).filter(v => typeof v === 'number')
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
  ctx.font = '12px Inter';
  ctx.textAlign = 'right';
  
  for (let i = 0; i <= 4; i++) {
    const value = maxValue * (4 - i) / 4;
    const y = padding + (chartHeight * i) / 4;
    ctx.fillText(formatNumber(value), padding - 10, y + 4);
  }

  // Draw x-axis labels
  ctx.textAlign = 'center';
  data.forEach((item, index) => {
    const x = padding + (chartWidth * index) / (data.length - 1);
    ctx.fillText(item.date, x, canvas.height - 20);
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
    const legendY = 20 + (trendIndex * 20);
    ctx.fillStyle = color;
    ctx.fillRect(20, legendY, 10, 10);
    ctx.fillStyle = '#f1f1f1';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(trendName, 35, legendY + 8);
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

  return Object.values(timeGroups).slice(0, 7); // Limit to 7 time points
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

// Search function
function searchTrends() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput.value.toLowerCase();
  console.log('Searching for:', searchTerm);
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

    // Create chart
    createChart(data.chartData);

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
      createChart(data.chartData);
      createTrendTable(data.tableData);
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  }, 30000); // Refresh every 30 seconds
});