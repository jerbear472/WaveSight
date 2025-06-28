
// Initialize Supabase client
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    console.log('Supabase connection successful!', data);
    return true;
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
}

// Function to fetch data from Supabase
async function fetchTrendData() {
  try {
    console.log('Fetching data from trend_reach table...');
    
    // First test the connection
    const connectionOk = await testSupabaseConnection();
    if (!connectionOk) {
      console.log('Connection failed, using mock data');
      return null;
    }
    
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching data:', error);
      return null;
    }
    
    console.log('Fetched data:', data);
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
      console.log('Processing trend data:', trendData);
      
      // If we have real data, try to use it, otherwise show mock chart data
      const firstItem = trendData[0];
      const hasKeywordColumn = 'keyword' in firstItem || 'trend' in firstItem || 'name' in firstItem;
      const hasValueColumn = 'value' in firstItem || 'reach' in firstItem || 'score' in firstItem || 'mentions' in firstItem;
      
      if (hasKeywordColumn && hasValueColumn) {
        // Process real data
        const keywordGroups = {};
        trendData.forEach(item => {
          const keyword = item.keyword || item.trend || item.name || `Trend ${item.id}`;
          if (!keywordGroups[keyword]) {
            keywordGroups[keyword] = [];
          }
          keywordGroups[keyword].push(item);
        });

        const keywordAverages = Object.keys(keywordGroups).map(keyword => {
          const values = keywordGroups[keyword].map(item => {
            return item.value || item.reach || item.score || item.mentions || 0;
          });
          const average = values.reduce((sum, val) => sum + val, 0) / values.length;
          return { keyword, average };
        });

        const top20Keywords = keywordAverages
          .sort((a, b) => b.average - a.average)
          .slice(0, 20)
          .map(item => item.keyword);

        setKeywords(top20Keywords);

        // Create simple chart data with IDs as time points
        const processedData = [...new Set(trendData.map(item => item.id))]
          .sort((a, b) => a - b)
          .map(id => {
            const dataPoint = { name: `Point ${id}` };
            
            top20Keywords.forEach(keyword => {
              const item = trendData.find(d => d.id === id && (d.keyword === keyword || d.trend === keyword || d.name === keyword));
              dataPoint[keyword] = item ? (item.value || item.reach || item.score || item.mentions || 0) : 0;
            });
            
            return dataPoint;
          });
        
        setData(processedData);
      } else {
        // Use fallback data if structure doesn't match
        console.log('Data structure not suitable for chart, using fallback');
        setKeywords(['AI-generated images', 'ChatGPT', 'Elden Ring', 'Pineapple on pizza']);
        setData([
          { name: 'Mar 1', 'AI-generated images': 35, 'ChatGPT': 20, 'Elden Ring': 15, 'Pineapple on pizza': 10 },
          { name: 'Mar 7', 'AI-generated images': 45, 'ChatGPT': 34, 'Elden Ring': 25, 'Pineapple on pizza': 18 },
          { name: 'Mar 14', 'AI-generated images': 60, 'ChatGPT': 50, 'Elden Ring': 40, 'Pineapple on pizza': 30 },
          { name: 'Mar 21', 'AI-generated images': 70, 'ChatGPT': 65, 'Elden Ring': 55, 'Pineapple on pizza': 40 },
          { name: 'Mar 28', 'AI-generated images': 84, 'ChatGPT': 79, 'Elden Ring': 69, 'Pineapple on pizza': 53 }
        ]);
      }
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
  try {
    // Test if we can connect to trend_reach table
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .limit(4);
    
    if (error) {
      console.log('Could not fetch card data from Supabase:', error.message);
      console.log('Using static card data');
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Successfully connected to trend_reach table, found', data.length, 'records');
    } else {
      console.log('trend_reach table is empty, using static card data');
    }
  } catch (err) {
    console.log('Error testing card data connection:', err);
    console.log('Using static card data');
  }
}

// Function to create and populate table with Supabase data
async function createTrendTable() {
  try {
    console.log('Creating trend table...');
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .limit(50); // Limit to 50 rows to avoid overwhelming the display
    
    if (error) {
      console.error('Error fetching table data:', error);
      // Show mock data if there's an error
      showMockTable();
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No data in trend_reach table, showing mock data');
      showMockTable();
      return;
    }
    
    console.log('Table data:', data);
    
    // Get all column names from the first row
    const columns = Object.keys(data[0]);
    
    let tableHTML = `
      <table class="trend-table">
        <thead>
          <tr>
    `;
    
    // Create headers for all columns
    columns.forEach(col => {
      const displayName = col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      tableHTML += `<th>${displayName}</th>`;
    });
    
    tableHTML += `
          </tr>
        </thead>
        <tbody>
    `;
    
    // Create rows with all column data
    data.forEach(item => {
      tableHTML += '<tr>';
      columns.forEach(col => {
        let value = item[col];
        // Format different types of values
        if (value === null || value === undefined) {
          value = 'N/A';
        } else if (typeof value === 'number') {
          value = value.toLocaleString();
        } else if (typeof value === 'string' && value.length > 50) {
          value = value.substring(0, 47) + '...';
        }
        tableHTML += `<td>${value}</td>`;
      });
      tableHTML += '</tr>';
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    document.getElementById('trendTable').innerHTML = tableHTML;
  } catch (err) {
    console.error('Error creating table:', err);
    showMockTable();
  }
}

// Function to show mock data if Supabase data isn't available
function showMockTable() {
  const mockData = [
    { id: 1, keyword: 'AI-generated images', reach: 23400, platform: 'TikTok', score: 84 },
    { id: 2, keyword: 'ChatGPT', reach: 18700, platform: 'Reddit', score: 79 },
    { id: 3, keyword: 'Elden Ring', reach: 15200, platform: 'YouTube', score: 69 },
    { id: 4, keyword: 'Pineapple on pizza', reach: 12900, platform: 'TikTok', score: 53 },
    { id: 5, keyword: 'Crypto trends', reach: 11500, platform: 'Twitter', score: 47 },
    { id: 6, keyword: 'Gaming memes', reach: 9800, platform: 'Reddit', score: 42 }
  ];
  
  let tableHTML = `
    <table class="trend-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Keyword</th>
          <th>Reach</th>
          <th>Platform</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  mockData.forEach(item => {
    tableHTML += `
      <tr>
        <td>${item.id}</td>
        <td>${item.keyword}</td>
        <td>${item.reach.toLocaleString()}</td>
        <td>${item.platform}</td>
        <td>${item.score}</td>
      </tr>
    `;
  });
  
  tableHTML += `
      </tbody>
    </table>
    <p style="color: #9ca3af; font-size: 0.8rem; margin-top: 10px;">
      * Showing sample data - connect to your Supabase table for real data
    </p>
  `;
  
  document.getElementById('trendTable').innerHTML = tableHTML;
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
