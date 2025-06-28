// Supabase credentials - these need to be updated with valid credentials
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

// Create simple chart without external libraries
function createSimpleChart(data) {
  const chartContainer = document.getElementById('trendChart');
  if (!chartContainer) return;

  // Clear existing content
  chartContainer.innerHTML = '';

  // Create a simple text-based chart for now
  const chartHTML = `
    <div style="padding: 20px; background: #13131f; border-radius: 12px; color: #f1f1f1;">
      <h3 style="margin-bottom: 20px; color: #5ee3ff;">Chart Data Preview</h3>
      <div style="font-family: monospace; font-size: 14px;">
        ${data.map(item => `
          <div style="margin-bottom: 10px; padding: 8px; background: #1a1a2e; border-radius: 6px;">
            <strong>${item.date}</strong>: 
            ${Object.keys(item).filter(k => k !== 'date').map(trend => 
              `${trend}: ${formatNumber(item[trend])}`
            ).join(', ')}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  chartContainer.innerHTML = chartHTML;
}

// Fetch data from Supabase
async function fetchData() {
  console.log('Fetching data...');

  if (!supabase) {
    console.log('Using fallback data - no Supabase connection');
    return fallbackData;
  }

  try {
    // Test connection first
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest) {
      console.log('Connection test failed, using fallback data');
      return fallbackData;
    }

    // Fetch actual data
    const { data: trendData, error } = await supabase
      .from('trend_reach')
      .select('*')
      .limit(50);

    if (error) {
      console.error('Error fetching data:', error);
      return fallbackData;
    }

    if (!trendData || trendData.length === 0) {
      console.log('No data returned from Supabase');
      return fallbackData;
    }

    console.log('Successfully fetched data:', trendData);

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
    createSimpleChart(data.chartData);

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
      createSimpleChart(data.chartData);
      createTrendTable(data.tableData);
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  }, 30000); // Refresh every 30 seconds
});