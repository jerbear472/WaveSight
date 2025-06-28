
// Initialize Supabase client
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to fetch data from Supabase
async function fetchTrendData() {
  try {
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching data:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}

// React Chart Component using Recharts
const TrendChart = () => {
  const [data, setData] = React.useState([]);
  const [keywords, setKeywords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const colors = [
    '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b',
    '#ef4444', '#3b82f6', '#84cc16', '#f472b6', '#06b6d4', '#8b5a2b',
    '#6366f1', '#d946ef', '#14b8a6', '#f97066', '#a855f7', '#22c55e',
    '#fb923c', '#64748b'
  ];

  const fetchAndProcessData = async () => {
    const trendData = await fetchTrendData();
    
    if (trendData && trendData.length > 0) {
      // Group data by keyword and get top 20
      const keywordGroups = {};
      trendData.forEach(item => {
        const keyword = item.keyword || 'Unknown';
        if (!keywordGroups[keyword]) {
          keywordGroups[keyword] = [];
        }
        keywordGroups[keyword].push(item);
      });

      // Calculate average value for each keyword to determine top 20
      const keywordAverages = Object.keys(keywordGroups).map(keyword => {
        const values = keywordGroups[keyword].map(item => item.value || 0);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        return { keyword, average };
      });

      // Sort and get top 20
      const top20Keywords = keywordAverages
        .sort((a, b) => b.average - a.average)
        .slice(0, 20)
        .map(item => item.keyword);

      setKeywords(top20Keywords);

      // Create chart data points
      const allIds = [...new Set(trendData.map(item => item.id))].sort((a, b) => a - b);
      
      const processedData = allIds.map(id => {
        const dataPoint = { name: `Point ${id}`, id };
        
        top20Keywords.forEach(keyword => {
          const item = trendData.find(d => d.id === id && d.keyword === keyword);
          dataPoint[keyword] = item ? (item.value || 0) : 0;
        });
        
        return dataPoint;
      });
      
      setData(processedData);
    } else {
      // Fallback static data
      setKeywords(['AI-generated images', 'ChatGPT', 'Elden Ring', 'Pineapple on pizza']);
      setData([
        { name: 'Mar 1', 'AI-generated images': 35, 'ChatGPT': 20, 'Elden Ring': 15, 'Pineapple on pizza': 10 },
        { name: 'Mar 7', 'AI-generated images': 45, 'ChatGPT': 34, 'Elden Ring': 25, 'Pineapple on pizza': 18 },
        { name: 'Mar 14', 'AI-generated images': 60, 'ChatGPT': 50, 'Elden Ring': 40, 'Pineapple on pizza': 30 },
        { name: 'Mar 21', 'AI-generated images': 70, 'ChatGPT': 65, 'Elden Ring': 55, 'Pineapple on pizza': 40 },
        { name: 'Mar 28', 'AI-generated images': 84, 'ChatGPT': 79, 'Elden Ring': 69, 'Pineapple on pizza': 53 }
      ]);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchAndProcessData();
    
    // Set up real-time updates
    const interval = setInterval(fetchAndProcessData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return React.createElement('div', { style: { color: '#e5e7eb', padding: '20px' } }, 'Loading chart data...');
  }

  return React.createElement(
    'div',
    { style: { width: '100%', height: '320px' } },
    React.createElement(
      Recharts.ResponsiveContainer,
      { width: '100%', height: '100%' },
      React.createElement(
        Recharts.LineChart,
        { data: data, margin: { top: 5, right: 30, left: 20, bottom: 5 } },
        React.createElement(Recharts.CartesianGrid, { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }),
        React.createElement(Recharts.XAxis, { 
          dataKey: 'name', 
          tick: { fill: '#a1a1aa', fontSize: 12 },
          axisLine: { stroke: '#2e2e45' }
        }),
        React.createElement(Recharts.YAxis, { 
          tick: { fill: '#a1a1aa', fontSize: 12 },
          axisLine: { stroke: '#2e2e45' }
        }),
        React.createElement(Recharts.Tooltip, {
          contentStyle: {
            backgroundColor: '#1a1a2e',
            border: '1px solid #2e2e45',
            borderRadius: '8px',
            color: '#e5e7eb'
          }
        }),
        React.createElement(Recharts.Legend, {
          wrapperStyle: { color: '#e5e7eb' }
        }),
        // Render lines for each keyword with different colors
        keywords.map((keyword, index) => 
          React.createElement(Recharts.Line, {
            key: keyword,
            type: 'monotone',
            dataKey: keyword,
            stroke: colors[index % colors.length],
            strokeWidth: 2,
            dot: { fill: colors[index % colors.length], strokeWidth: 1, r: 3 },
            activeDot: { r: 5, stroke: colors[index % colors.length], strokeWidth: 2 }
          })
        )
      )
    )
  );
};

// Function to update cards with Supabase data - keeping static cards for now
async function updateCards() {
  console.log('Using static card data');
}

// Function to create and populate table with Supabase data
async function createTrendTable() {
  try {
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error fetching table data:', error);
      document.getElementById('trendTable').innerHTML = '<p>Error loading data</p>';
      return;
    }
    
    if (!data || data.length === 0) {
      document.getElementById('trendTable').innerHTML = '<p>No data available</p>';
      return;
    }
    
    let tableHTML = `
      <table class="trend-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Keyword</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    data.forEach(item => {
      tableHTML += `
        <tr>
          <td>${item.id}</td>
          <td>${item.keyword || 'N/A'}</td>
          <td>${item.value || 'N/A'}</td>
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    document.getElementById('trendTable').innerHTML = tableHTML;
  } catch (err) {
    console.error('Error creating table:', err);
    document.getElementById('trendTable').innerHTML = '<p>Error loading data</p>';
  }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Render the React chart component
  const chartContainer = document.getElementById('trendChart');
  const root = ReactDOM.createRoot(chartContainer);
  root.render(React.createElement(TrendChart));
  
  await updateCards();
  await createTrendTable();
});
