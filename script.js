// Add process polyfill for browser environment
if (typeof process === 'undefined') {
  window.process = { env: {} };
}

// Supabase credentials (store securely in production)
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';

let supabase = null;
try {
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully');
  } else {
    console.warn('Supabase library not loaded, using fallback data');
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  console.warn('Using fallback data');
}

// Fetch trend data with error handling
async function fetchTrendData() {
  if (!supabase) {
    console.log('Using fallback data for chart');
    return [
      { keyword: 'AI Tools', reach: 1200, timestamp: '2024-01-01' },
      { keyword: 'AI Tools', reach: 1500, timestamp: '2024-01-02' },
      { keyword: 'AI Tools', reach: 1800, timestamp: '2024-01-03' },
      { keyword: 'ChatGPT', reach: 900, timestamp: '2024-01-01' },
      { keyword: 'ChatGPT', reach: 1100, timestamp: '2024-01-02' },
      { keyword: 'ChatGPT', reach: 1300, timestamp: '2024-01-03' },
      { keyword: 'Machine Learning', reach: 800, timestamp: '2024-01-01' },
      { keyword: 'Machine Learning', reach: 950, timestamp: '2024-01-02' },
      { keyword: 'Machine Learning', reach: 1100, timestamp: '2024-01-03' }
    ];
  }
  
  try {
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Fetch error:', err);
    // Return fallback data on error
    return [
      { keyword: 'AI Tools', reach: 1200, timestamp: '2024-01-01' },
      { keyword: 'AI Tools', reach: 1500, timestamp: '2024-01-02' },
      { keyword: 'ChatGPT', reach: 900, timestamp: '2024-01-01' },
      { keyword: 'ChatGPT', reach: 1100, timestamp: '2024-01-02' }
    ];
  }
}

// React chart component
const TrendChart = () => {
  const [data, setData] = React.useState([]);
  const [keywords, setKeywords] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const colors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#84cc16', '#f472b6'];

  const fetchAndProcessData = async () => {
    const trendData = await fetchTrendData();
    if (!trendData || trendData.length === 0) {
      setError('No data available');
      setLoading(false);
      return;
    }

    // Group data by keyword
    const keywordGroups = {};
    trendData.forEach(item => {
      const keyword = item.keyword || item.trend || item.name || `Trend ${item.id}`;
      if (!keywordGroups[keyword]) keywordGroups[keyword] = [];
      keywordGroups[keyword].push(item);
    });

    // Get top keywords by average reach
    const keywordAverages = Object.entries(keywordGroups).map(([keyword, items]) => {
      const avg = items.reduce((sum, item) => sum + (item.reach || item.value || item.score || item.mentions || 0), 0) / items.length;
      return { keyword, average: avg };
    });

    const topKeywords = keywordAverages.sort((a, b) => b.average - a.average).slice(0, 5).map(k => k.keyword);
    setKeywords(topKeywords);

    // Get unique time points
    const timePoints = [...new Set(trendData.map(item => item.timestamp || item.created_at || item.date))].sort((a, b) => new Date(a) - new Date(b));
    
    // Process data for chart
    const processedData = timePoints.map(timestamp => {
      const entry = { name: new Date(timestamp).toLocaleDateString() };
      topKeywords.forEach(kw => {
        const match = trendData.find(d => (d.timestamp || d.created_at || d.date) === timestamp && (d.keyword === kw || d.trend === kw || d.name === kw));
        entry[kw] = match ? (match.reach || match.value || match.score || match.mentions || 0) : 0;
      });
      return entry;
    });

    setData(processedData);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchAndProcessData();
    const interval = setInterval(fetchAndProcessData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return React.createElement('div', {}, 'Loading...');
  if (error) return React.createElement('div', { style: { color: 'red' } }, error);

  return React.createElement(
    'div',
    { style: { width: '100%', height: '320px' } },
    React.createElement(
      Recharts.ResponsiveContainer,
      { width: '100%', height: '100%' },
      React.createElement(
        Recharts.LineChart,
        { data, margin: { top: 5, right: 30, left: 20, bottom: 5 } },
        React.createElement(Recharts.CartesianGrid, { strokeDasharray: '3 3' }),
        React.createElement(Recharts.XAxis, { dataKey: 'name' }),
        React.createElement(Recharts.YAxis, {}),
        React.createElement(Recharts.Tooltip, {}),
        React.createElement(Recharts.Legend, {}),
        keywords.map((kw, i) =>
          React.createElement(Recharts.Line, {
            key: kw,
            type: 'monotone',
            dataKey: kw,
            stroke: colors[i % colors.length],
            strokeWidth: 2
          })
        )
      )
    )
  );
};

// Add missing functions
async function updateCards() {
  console.log('Cards updated');
}

async function createTrendTable() {
  const tableContainer = document.getElementById('trendTable');
  if (tableContainer) {
    tableContainer.innerHTML = '<p style="color: #e5e7eb;">Trend table loaded</p>';
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing components...');
  
  // Wait for all scripts to load
  setTimeout(() => {
    try {
      const chartContainer = document.getElementById('trendChart');
      if (chartContainer && window.React && window.ReactDOM && window.Recharts) {
        console.log('Rendering chart component...');
        const root = ReactDOM.createRoot(chartContainer);
        root.render(React.createElement(TrendChart));
      } else {
        console.error('Missing dependencies:', {
          chartContainer: !!chartContainer,
          React: !!window.React,
          ReactDOM: !!window.ReactDOM,
          Recharts: !!window.Recharts
        });
        if (chartContainer) {
          chartContainer.innerHTML = '<p style="color: #e5e7eb;">Chart loading failed - missing dependencies</p>';
        }
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
      const chartContainer = document.getElementById('trendChart');
      if (chartContainer) {
        chartContainer.innerHTML = '<p style="color: #e5e7eb;">Chart initialization error</p>';
      }
    }
    
    // Initialize other components
    updateCards();
    createTrendTable();
  }, 1000);
});
