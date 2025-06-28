
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
      console.log('Supabase client initialized');
      return true;
    } else {
      console.log('Supabase library not loaded');
      return false;
    }
  } catch (error) {
    console.log('Failed to initialize Supabase:', error);
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
      
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('trend_name, reach_count, platform, created_at')
        .order('created_at', { ascending: true });

      if (!error && trendData && trendData.length > 0) {
        console.log('Successfully fetched data from Supabase:', trendData);
        
        // Group data by timestamp/date and trend names
        const groupedData = {};
        
        trendData.forEach((item) => {
          const timestamp = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown Date';
          const trendName = item.trend_name || 'Unknown';
          const reachCount = item.reach_count || 0;
          
          if (!groupedData[timestamp]) {
            groupedData[timestamp] = {
              date: timestamp,
            };
          }
          
          groupedData[timestamp][trendName] = (groupedData[timestamp][trendName] || 0) + reachCount;
        });
        
        data = Object.values(groupedData);
        console.log('Transformed chart data:', data);
        
        window.chartTrendNames = [...new Set(trendData.map(item => item.trend_name))];
      } else {
        console.log('No data returned from Supabase, using fallback data');
        data = fallbackChartData;
        window.chartTrendNames = ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
      }
    } catch (error) {
      console.log('Supabase query failed, using fallback data:', error);
      data = fallbackChartData;
      window.chartTrendNames = ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
    }
  } else {
    console.log('Using fallback chart data');
    data = fallbackChartData;
    window.chartTrendNames = ['AI Tools', 'ChatGPT', 'Machine Learning', 'Blockchain', 'Metaverse', 'NFT', 'Crypto'];
  }

  // Create React component for the chart
  const ChartComponent = () => {
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
        .select('trend_name, reach_count, platform, created_at')
        .order('reach_count', { ascending: false })
        .limit(10);

      if (!error && trendData && trendData.length > 0) {
        console.log('Successfully fetched table data:', trendData);
        
        tableRows = trendData.map((item) => {
          const trendName = item.trend_name || 'Unknown Trend';
          const reachCount = item.reach_count || 0;
          const platform = item.platform || 'Various';
          
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
        console.log('No table data returned from Supabase, using fallback data');
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
      console.log('Table data fetch failed, using fallback data:', error);
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
    console.log('Using fallback table data');
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
  
  // Initialize Supabase
  setTimeout(() => {
    initSupabase();
  }, 1000);
  
  // Wait for libraries and create chart
  try {
    await createChart();
  } catch (error) {
    console.log('Error creating chart:', error);
  }
  
  // Create table
  try {
    await createTrendTable();
  } catch (error) {
    console.log('Error creating table:', error);
  }
  
  // Set up auto-refresh
  setInterval(async () => {
    try {
      await createChart();
      await createTrendTable();
    } catch (error) {
      console.log('Error during refresh:', error);
    }
  }, 30000); // Refresh every 30 seconds
});
