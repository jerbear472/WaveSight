
// Add process polyfill for browser environment
if (typeof process === 'undefined') {
  window.process = { env: {} };
}

// Supabase credentials
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDU5NDcsImV4cCI6MjA2NjQ4MTk0N30.YGOXgs0LtdCQYqpEWu0BECZFp9gRtk6nJPbOeDwN8kM';

let supabase = null;
let data = [];
let tableRows = '';

// Initialize Supabase
try {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
  } else {
    console.log('Supabase library not loaded, using fallback data');
  }
} catch (error) {
  console.log('Failed to initialize Supabase, using fallback data:', error);
}

// Fallback data
const fallbackChartData = [
  { date: 'Day 1', aiTools: 1200, chatgpt: 950, ml: 700, blockchain: 800, metaverse: 600, nft: 450, crypto: 1100 },
  { date: 'Day 2', aiTools: 1350, chatgpt: 1100, ml: 850, blockchain: 920, metaverse: 750, nft: 520, crypto: 1250 },
  { date: 'Day 3', aiTools: 1800, chatgpt: 1400, ml: 1200, blockchain: 1100, metaverse: 900, nft: 680, crypto: 1400 },
  { date: 'Day 4', aiTools: 2100, chatgpt: 1650, ml: 1400, blockchain: 1300, metaverse: 1100, nft: 750, crypto: 1600 },
  { date: 'Day 5', aiTools: 2500, chatgpt: 1900, ml: 1600, blockchain: 1500, metaverse: 1300, nft: 850, crypto: 1800 },
  { date: 'Day 6', aiTools: 2800, chatgpt: 2200, ml: 1850, blockchain: 1700, metaverse: 1500, nft: 950, crypto: 2000 },
  { date: 'Day 7', aiTools: 3200, chatgpt: 2500, ml: 2100, blockchain: 1900, metaverse: 1700, nft: 1100, crypto: 2200 }
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

// Create native chart using Recharts
async function createNativeChart() {
  console.log('Creating chart...');
  
  // Try to fetch data from Supabase
  if (supabase) {
    try {
      console.log('Attempting to fetch data from Supabase...');
      
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
        .order('id', { ascending: true });

      if (!error && trendData && trendData.length > 0) {
        console.log('Successfully fetched data from Supabase:', trendData);
        
        // Group data by day and create chart data points
        const groupedData = {};
        
        trendData.forEach((item, index) => {
          const dayKey = Math.floor(index / 7) + 1; // Group by weeks as days
          
          if (!groupedData[dayKey]) {
            groupedData[dayKey] = {
              date: `Day ${dayKey}`,
              aiTools: 0,
              chatgpt: 0,
              ml: 0,
              blockchain: 0,
              metaverse: 0,
              nft: 0,
              crypto: 0
            };
          }
          
          // Map trend_name to chart categories
          const trendName = (item.trend_name || '').toLowerCase();
          const reachCount = item.reach_count || Math.floor(Math.random() * 1000) + 500;
          
          if (trendName.includes('ai') || trendName.includes('artificial intelligence')) {
            groupedData[dayKey].aiTools += reachCount;
          } else if (trendName.includes('chatgpt') || trendName.includes('gpt')) {
            groupedData[dayKey].chatgpt += reachCount;
          } else if (trendName.includes('machine learning') || trendName.includes('ml')) {
            groupedData[dayKey].ml += reachCount;
          } else if (trendName.includes('blockchain')) {
            groupedData[dayKey].blockchain += reachCount;
          } else if (trendName.includes('metaverse')) {
            groupedData[dayKey].metaverse += reachCount;
          } else if (trendName.includes('nft')) {
            groupedData[dayKey].nft += reachCount;
          } else if (trendName.includes('crypto') || trendName.includes('bitcoin') || trendName.includes('ethereum')) {
            groupedData[dayKey].crypto += reachCount;
          } else {
            groupedData[dayKey].aiTools += reachCount;
          }
        });
        
        data = Object.values(groupedData);
        console.log('Transformed chart data:', data);
      } else {
        console.log('No data returned from Supabase, using fallback data');
        data = fallbackChartData;
      }
    } catch (error) {
      console.log('Supabase query failed, using fallback data:', error);
      data = fallbackChartData;
    }
  } else {
    console.log('Using fallback chart data');
    data = fallbackChartData;
  }

  // Create React component for the chart
  const ChartComponent = () => {
    return React.createElement(
      Recharts.ResponsiveContainer,
      { width: '100%', height: 320 },
      React.createElement(
        Recharts.LineChart,
        { data: data, margin: { top: 20, right: 30, left: 20, bottom: 5 } },
        React.createElement(Recharts.CartesianGrid, { strokeDasharray: '3 3', stroke: '#2e2e45' }),
        React.createElement(Recharts.XAxis, { 
          dataKey: 'date', 
          stroke: '#9ca3af',
          tick: { fill: '#9ca3af' }
        }),
        React.createElement(Recharts.YAxis, { 
          stroke: '#9ca3af',
          tick: { fill: '#9ca3af' },
          tickFormatter: formatNumber
        }),
        React.createElement(Recharts.Tooltip, {
          contentStyle: {
            backgroundColor: '#1a1a2e',
            border: '1px solid #2e2e45',
            borderRadius: '8px',
            color: '#f1f1f1'
          },
          formatter: (value) => [formatNumber(value), '']
        }),
        React.createElement(Recharts.Legend, {
          wrapperStyle: { color: '#f1f1f1' }
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'aiTools',
          stroke: '#5ee3ff',
          strokeWidth: 3,
          name: 'AI Tools'
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'chatgpt',
          stroke: '#8b5cf6',
          strokeWidth: 3,
          name: 'ChatGPT'
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'ml',
          stroke: '#ec4899',
          strokeWidth: 3,
          name: 'Machine Learning'
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'blockchain',
          stroke: '#f97316',
          strokeWidth: 3,
          name: 'Blockchain'
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'metaverse',
          stroke: '#10b981',
          strokeWidth: 3,
          name: 'Metaverse'
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'nft',
          stroke: '#f59e0b',
          strokeWidth: 3,
          name: 'NFT'
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'crypto',
          stroke: '#ef4444',
          strokeWidth: 3,
          name: 'Crypto'
        })
      )
    );
  };

  // Render the chart
  const chartContainer = document.getElementById('trendChart');
  if (chartContainer && typeof ReactDOM !== 'undefined') {
    const root = ReactDOM.createRoot(chartContainer);
    root.render(React.createElement(ChartComponent));
  }
}

// Create trend table
async function createTrendTable() {
  console.log('Creating table...');
  
  // Try to fetch data from Supabase
  if (supabase) {
    try {
      console.log('Attempting to fetch table data from Supabase...');
      
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
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
  
  // Wait for libraries to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (typeof Recharts !== 'undefined') {
    console.log('Recharts loaded');
    await createNativeChart();
  } else {
    console.log('Recharts not loaded, retrying...');
    setTimeout(createNativeChart, 2000);
  }
  
  await createTrendTable();
  
  // Set up auto-refresh
  setInterval(async () => {
    await createNativeChart();
    await createTrendTable();
  }, 30000); // Refresh every 30 seconds
});
