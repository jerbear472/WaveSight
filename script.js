
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
  const [loading, setLoading] = React.useState(true);

  const fetchAndProcessData = async () => {
    const trendData = await fetchTrendData();
    
    if (trendData && trendData.length > 0) {
      // Process the data for Recharts
      const processedData = trendData.map((item, index) => ({
        name: `Point ${index + 1}`,
        id: item.id,
        keyword: item.keyword || 'Unknown',
        value: item.value || 0,
        originalData: item
      }));
      
      setData(processedData);
    } else {
      // Fallback static data
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
        data.length > 0 && data[0].keyword ? 
          React.createElement(Recharts.Line, {
            type: 'monotone',
            dataKey: 'value',
            stroke: '#5ee3ff',
            strokeWidth: 2,
            dot: { fill: '#5ee3ff', strokeWidth: 2, r: 4 },
            activeDot: { r: 6, stroke: '#5ee3ff', strokeWidth: 2 }
          }) :
          [
            React.createElement(Recharts.Line, {
              key: 'ai',
              type: 'monotone',
              dataKey: 'AI-generated images',
              stroke: '#5ee3ff',
              strokeWidth: 2,
              dot: { fill: '#5ee3ff' }
            }),
            React.createElement(Recharts.Line, {
              key: 'chatgpt',
              type: 'monotone',
              dataKey: 'ChatGPT',
              stroke: '#8b5cf6',
              strokeWidth: 2,
              dot: { fill: '#8b5cf6' }
            }),
            React.createElement(Recharts.Line, {
              key: 'elden',
              type: 'monotone',
              dataKey: 'Elden Ring',
              stroke: '#ec4899',
              strokeWidth: 2,
              dot: { fill: '#ec4899' }
            }),
            React.createElement(Recharts.Line, {
              key: 'pizza',
              type: 'monotone',
              dataKey: 'Pineapple on pizza',
              stroke: '#f97316',
              strokeWidth: 2,
              dot: { fill: '#f97316' }
            })
          ]
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
      .from('trends')
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
            <th>Date</th>
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
          <td>${item.date || 'N/A'}</td>
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
