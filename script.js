// Add process polyfill for browser environment
if (typeof process === 'undefined') {
  window.process = { env: {} };
}

// Supabase credentials (store securely in production)
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'PUBLIC_ANON_KEY_HERE';

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
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('trend_reach')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Fetch error:', err);
    return null;
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

    const firstItem = trendData[0];
    const hasKeyword = 'keyword' in firstItem || 'trend' in firstItem || 'name' in firstItem;
    const hasValue = 'value' in firstItem || 'reach' in firstItem || 'score' in firstItem || 'mentions' in firstItem;
    const hasTime = 'created_at' in firstItem;

    if (!(hasKeyword && hasValue && hasTime)) {
      setError('Data structure is incompatible');
      setLoading(false);
      return;
    }

    const keywordGroups = {};
    trendData.forEach(item => {
      const keyword = item.keyword || item.trend || item.name || `Trend ${item.id}`;
      if (!keywordGroups[keyword]) keywordGroups[keyword] = [];
      keywordGroups[keyword].push(item);
    });

    const keywordAverages = Object.entries(keywordGroups).map(([keyword, items]) => {
      const avg = items.reduce((sum, item) => sum + (item.value || item.reach || item.score || item.mentions || 0), 0) / items.length;
      return { keyword, average: avg };
    });

    const topKeywords = keywordAverages.sort((a, b) => b.average - a.average).slice(0, 5).map(k => k.keyword);
    setKeywords(topKeywords);

    const timePoints = [...new Set(trendData.map(item => item.created_at))].sort((a, b) => new Date(a) - new Date(b));
    const processedData = timePoints.map(timestamp => {
      const entry = { name: new Date(timestamp).toLocaleDateString() };
      topKeywords.forEach(kw => {
        const match = trendData.find(d => d.created_at === timestamp && (d.keyword === kw || d.trend === kw || d.name === kw));
        entry[kw] = match ? (match.value || match.reach || match.score || match.mentions || 0) : 0;
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const chartContainer = document.getElementById('trendChart');
  if (chartContainer && window.React && window.ReactDOM) {
    const root = ReactDOM.createRoot(chartContainer);
    root.render(React.createElement(TrendChart));
  }
});
