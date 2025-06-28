
// Supabase credentials
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDU5NDcsImV4cCI6MjA2NjQ4MTk0N30.YGOXgs0LtdCQYqpEWu0BECZFp9gRtk6nJPbOeDwN8kM';

let supabase = null;
let data = [];
let tableRows = '';
let chartRoot = null;

// Initialize Supabase
function initSupabase() {
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized successfully');
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

// Fallback data
const fallbackChartData = [
  { date: 'Day 1', 'AI Tools': 1200000, 'ChatGPT': 950000, 'Machine Learning': 700000, 'Blockchain': 800000, 'Metaverse': 600000, 'NFT': 450000, 'Crypto': 1100000 },
  { date: 'Day 2', 'AI Tools': 1350000, 'ChatGPT': 1100000, 'Machine Learning': 850000, 'Blockchain': 920000, 'Metaverse': 750000, 'NFT': 520000, 'Crypto': 1250000 },
  { date: 'Day 3', 'AI Tools': 1800000, 'ChatGPT': 1400000, 'Machine Learning': 1200000, 'Blockchain': 1100000, 'Metaverse': 900000, 'NFT': 680000, 'Crypto': 1400000 },
  { date: 'Day 4', 'AI Tools': 2100000, 'ChatGPT': 1650000, 'Machine Learning': 1400000, 'Blockchain': 1300000, 'Metaverse': 1100000, 'NFT': 750000, 'Crypto': 1600000 },
  { date: 'Day 5', 'AI Tools': 2500000, 'ChatGPT': 1900000, 'Machine Learning': 1600000, 'Blockchain': 1500000, 'Metaverse': 1300000, 'NFT': 850000, 'Crypto': 1800000 },
  { date: 'Day 6', 'AI Tools': 2800000, 'ChatGPT': 2200000, 'Machine Learning': 1850000, 'Blockchain': 1700000, 'Metaverse': 1500000, 'NFT': 950000, 'Crypto': 2000000 },
  { date: 'Day 7', 'AI Tools': 3200000, 'ChatGPT': 2500000, 'Machine Learning': 2100000, 'Blockchain': 1900000, 'Metaverse': 1700000, 'NFT': 1100000, 'Crypto': 2200000 }
];

const fallbackTableData = [
  { trend_name: 'AI Art Generation', platform: 'TikTok', reach_count: 2500000 },
  { trend_name: 'ChatGPT Tips', platform: 'Instagram', reach_count: 1800000 },
  { trend_name: 'Machine Learning Basics', platform: 'YouTube', reach_count: 1200000 },
  { trend_name: 'Blockchain Explained', platform: 'Twitter', reach_count: 950000 },
  { trend_name: 'Metaverse Gaming', platform: 'TikTok', reach_count: 800000 },
  { trend_name: 'NFT Marketplace', platform: 'Instagram', reach_count: 650000 },
  { trend_name: 'Crypto Trading', platform: 'YouTube', reach_count: 1100000 }
];

// Format numbers with K/M notation
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}

// Wait for libraries to be available
function waitForLibraries() {
  return new Promise((resolve) => {
    const checkLibraries = () => {
      if (typeof window.Recharts !== 'undefined' && 
          typeof window.React !== 'undefined' && 
          typeof window.ReactDOM !== 'undefined') {
        console.log('All libraries loaded successfully');
        resolve(true);
      } else {
        console.log('Waiting for libraries...');
        setTimeout(checkLibraries, 500);
      }
    };
    checkLibraries();
  });
}

// Create chart using Recharts
async function createChart() {
  console.log('Creating chart...');
  
  // Wait for libraries to be available
  await waitForLibraries();
  
  // Try to fetch data from Supabase
  if (supabase) {
    try {
      console.log('Attempting to fetch data from trend_reach table...');
      
      // First, let's check what columns exist in the table
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
        .limit(50);

      if (!error && trendData && trendData.length > 0) {
        console.log('Successfully fetched data from Supabase:', trendData);
        
        // Group data by a time period - let's use row index as time for now
        const groupedData = {};
        
        trendData.forEach((item, index) => {
          const timeKey = `Hour ${Math.floor(index / 5) + 1}`; // Group every 5 entries as one hour
          const trendName = item.trend_name || item.keyword || 'Unknown';
          const reachCount = item.reach_count || item.reach || item.value || 0;
          
          if (!groupedData[timeKey]) {
            groupedData[timeKey] = {
              date: timeKey,
            };
          }
          
          groupedData[timeKey][trendName] = (groupedData[timeKey][trendName] || 0) + reachCount;
        });
        
        data = Object.values(groupedData);
        console.log('Transformed chart data:', data);
        
        // Get unique trend names
        window.chartTrendNames = [...new Set(trendData.map(item => item.trend_name || item.keyword || 'Unknown'))];
        console.log('Chart trend names:', window.chartTrendNames);
      } else {
        console.error('No data returned from Supabase or error occurred:', error);
        data = fallbackChartData;
        window.chartTrendNames = ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
      }
    } catch (error) {
      console.error('Supabase query failed:', error);
      data = fallbackChartData;
      window.chartTrendNames = ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
    }
  } else {
    console.log('Supabase not initialized, using fallback chart data');
    data = fallbackChartData;
    window.chartTrendNames = ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
  }

  // Create React component for the chart
  const ChartComponent = () => {
    // Check if Recharts is available
    if (!window.Recharts) {
      return React.createElement('div', { 
        style: { 
          color: '#f1f1f1', 
          padding: '20px', 
          textAlign: 'center' 
        } 
      }, 'Loading chart...');
    }

    const trendNames = window.chartTrendNames || ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
    const colors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#22d3ee', '#a855f7', '#06b6d4'];
    
    const chartLines = trendNames.map((trendName, index) => {
      return React.createElement(window.Recharts.Line, {
        key: trendName,
        type: 'monotone',
        dataKey: trendName,
        stroke: colors[index % colors.length],
        strokeWidth: 3,
        name: trendName,
        dot: false
      });
    });

    return React.createElement(
      window.Recharts.ResponsiveContainer,
      { width: '100%', height: 320 },
      React.createElement(
        window.Recharts.LineChart,
        { data: data, margin: { top: 20, right: 30, left: 20, bottom: 5 } },
        React.createElement(window.Recharts.CartesianGrid, { strokeDasharray: '3 3', stroke: '#2e2e45' }),
        React.createElement(window.Recharts.XAxis, { 
          dataKey: 'date', 
          stroke: '#9ca3af',
          tick: { fill: '#9ca3af' }
        }),
        React.createElement(window.Recharts.YAxis, { 
          stroke: '#9ca3af',
          tick: { fill: '#9ca3af' },
          tickFormatter: formatNumber
        }),
        React.createElement(window.Recharts.Tooltip, {
          contentStyle: {
            backgroundColor: '#1a1a2e',
            border: '1px solid #2e2e45',
            borderRadius: '8px',
            color: '#f1f1f1'
          },
          formatter: (value) => [formatNumber(value), '']
        }),
        React.createElement(window.Recharts.Legend, {
          wrapperStyle: { color: '#f1f1f1' }
        }),
        ...chartLines
      )
    );
  };

  // Render the chart
  const chartContainer = document.getElementById('trendChart');
  if (chartContainer && typeof window.ReactDOM !== 'undefined') {
    if (!chartRoot) {
      chartRoot = window.ReactDOM.createRoot(chartContainer);
    }
    chartRoot.render(React.createElement(ChartComponent));
    console.log('Chart rendered successfully');
  } else {
    console.log('Chart container or ReactDOM not available');
  }
}

// Create trend table
async function createTrendTable() {
  console.log('Creating table...');
  
  // Try to fetch data from Supabase
  if (supabase) {
    try {
      console.log('Fetching table data from trend_reach...');
      
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
        .order('reach_count', { ascending: false })
        .limit(15);

      if (!error && trendData && trendData.length > 0) {
        console.log('Successfully fetched table data:', trendData);
        
        tableRows = trendData.map((item) => {
          const trendName = item.trend_name || item.keyword || 'Unknown Trend';
          const reachCount = item.reach_count || item.reach || item.value || 0;
          const platform = item.platform || item.source || 'Various';
          
          const formattedReach = formatNumber(reachCount);
          const score = Math.min(99, Math.floor(reachCount / 10000) + 50);
          
          return `
            <tr>
              <td>${trendName}</td>
              <td>${platform}</td>
              <td>${formattedReach}</td>
              <td>${score}</td>
            </tr>
          `;
        }).join('');
      } else {
        console.error('No table data returned from Supabase:', error);
        tableRows = fallbackTableData.map((item) => {
          const formattedReach = formatNumber(item.reach_count);
          const score = Math.min(99, Math.floor(item.reach_count / 10000) + 50);
          
          return `
            <tr>
              <td>${item.trend_name}</td>
              <td>${item.platform}</td>
              <td>${formattedReach}</td>
              <td>${score}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (error) {
      console.error('Table data fetch failed:', error);
      tableRows = fallbackTableData.map((item) => {
        const formattedReach = formatNumber(item.reach_count);
        const score = Math.min(99, Math.floor(item.reach_count / 10000) + 50);
        
        return `
          <tr>
            <td>${item.trend_name}</td>
            <td>${item.platform}</td>
            <td>${formattedReach}</td>
            <td>${score}</td>
          </tr>
        `;
      }).join('');
    }
  } else {
    console.log('Supabase not initialized, using fallback table data');
    tableRows = fallbackTableData.map((item) => {
      const formattedReach = formatNumber(item.reach_count);
      const score = Math.min(99, Math.floor(item.reach_count / 10000) + 50);
      
      return `
        <tr>
          <td>${item.trend_name}</td>
          <td>${item.platform}</td>
          <td>${formattedReach}</td>
          <td>${score}</td>
        </tr>
      `;
    }).join('');
  }

  // Update table
  const tableBody = document.getElementById('trendTableBody');
  if (tableBody) {
    tableBody.innerHTML = tableRows;
  }
}

// Search function
function searchTrends() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput.value.toLowerCase();
  console.log('Searching for:', searchTerm);
  // Add search functionality here
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing components...');
  
  // Initialize Supabase first
  const supabaseReady = initSupabase();
  console.log('Supabase initialization result:', supabaseReady);
  
  // Wait for libraries and create chart
  try {
    await createChart();
    console.log('Chart creation completed');
  } catch (error) {
    console.error('Error creating chart:', error);
  }
  
  // Create table
  try {
    await createTrendTable();
    console.log('Table creation completed');
  } catch (error) {
    console.error('Error creating table:', error);
  }
  
  // Set up auto-refresh
  setInterval(async () => {
    try {
      console.log('Refreshing data...');
      await createChart();
      await createTrendTable();
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  }, 60000); // Refresh every 60 seconds
});
