// Add process polyfill for browser environment
if (typeof process === 'undefined') {
  window.process = {
    env: {}
  };
}

// Initialize Supabase client - using correct API key format
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDU5NDcsImV4cCI6MjA2NjQ4MTk0N30.YGOXgs0LtdCQYqpEWu0BECZFp9gRtk6nJPbOeDwN8kM';

let supabase = null;

// Initialize Supabase
if (typeof window.supabase !== 'undefined') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized');
} else {
  console.log('Supabase library not available');
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing components...');

  // Initialize native chart with real data
  await createNativeChart();
  
  // Initialize table with real data
  await createTrendTable();
});

// Create smooth curved path from points
function createSmoothPath(points) {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    
    if (i === 1) {
      // First curve - use current and next point for smoother start
      const cp1x = prev.x + (current.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = current.x - (current.x - prev.x) * 0.2;
      const cp2y = current.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
    } else {
      // Calculate smooth control points using previous, current, and next points
      const tension = 0.4;
      const prevPoint = points[i - 2] || prev;
      const nextPoint = next || current;
      
      // Calculate control point distances
      const cp1x = prev.x + (current.x - prevPoint.x) * tension;
      const cp1y = prev.y + (current.y - prevPoint.y) * tension;
      const cp2x = current.x - (nextPoint.x - prev.x) * tension;
      const cp2y = current.y - (nextPoint.y - prev.y) * tension;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
    }
  }
  
  return path;
}

// Create native HTML/CSS chart
async function createNativeChart() {
  const chartContainer = document.getElementById('trendChart');
  if (!chartContainer) return;

  let data = [];
  
  // Try to fetch data from Supabase
  if (supabase) {
    try {
      console.log('Fetching data from trend_reach table...');
      
      // First, let's check what columns exist
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
        .limit(20);

      if (error) {
        console.error('Error fetching trend data:', error);
        console.log('Trying alternative column names...');
        
        // Try with different possible column names
        const { data: altData, error: altError } = await supabase
          .from('trend_reach')
          .select('keyword, trend_name, reach, timestamp, created_at, date, score, platform')
          .limit(20);
          
        if (altError) {
          console.error('Alternative query also failed:', altError);
          throw altError;
        }
        
        if (altData && altData.length > 0) {
          console.log('Alternative query successful:', altData);
          data = altData.map((item, index) => ({
            date: item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                  item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                  item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                  `Day ${index + 1}`,
            aiTools: item.reach || Math.floor(Math.random() * 2000) + 800,
            chatgpt: (item.reach * 0.8) || Math.floor(Math.random() * 1800) + 700,
            ml: (item.reach * 0.6) || Math.floor(Math.random() * 1500) + 600
          }));
        }
      } else if (trendData && trendData.length > 0) {
        console.log('Fetched trend data successfully:', trendData);
        console.log('Available columns:', Object.keys(trendData[0]));
        
        // Transform the data for the chart based on available columns
        data = trendData.map((item, index) => ({
          date: item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                `Day ${index + 1}`,
          aiTools: item.reach || item.ai_tools || Math.floor(Math.random() * 2000) + 800,
          chatgpt: item.chatgpt || (item.reach * 0.8) || Math.floor(Math.random() * 1800) + 700,
          ml: item.ml || (item.reach * 0.6) || Math.floor(Math.random() * 1500) + 600
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Fallback data if no Supabase data
  if (data.length === 0) {
    console.log('Using fallback chart data');
    data = [
      { date: 'Jan 1', aiTools: 800, chatgpt: 600, ml: 400 },
      { date: 'Jan 2', aiTools: 1200, chatgpt: 900, ml: 700 },
      { date: 'Jan 3', aiTools: 1800, chatgpt: 1400, ml: 1200 },
      { date: 'Jan 4', aiTools: 2400, chatgpt: 2000, ml: 1800 },
      { date: 'Jan 5', aiTools: 2800, chatgpt: 2300, ml: 2100 },
      { date: 'Jan 6', aiTools: 3200, chatgpt: 2700, ml: 2400 },
      { date: 'Jan 7', aiTools: 3600, chatgpt: 3100, ml: 2800 }
    ];
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.aiTools, d.chatgpt, d.ml)));
  
  chartContainer.innerHTML = `
    <div class="native-chart">
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #5ee3ff;"></div>
          <span>AI Tools</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #8b5cf6;"></div>
          <span>ChatGPT</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ec4899;"></div>
          <span>Machine Learning</span>
        </div>
      </div>
      
      <div class="chart-container">
        <div class="y-axis">
          <div class="y-label">${maxValue >= 1000000 ? (maxValue / 1000000).toFixed(1) + 'M' : (maxValue / 1000).toFixed(0) + 'K'}</div>
          <div class="y-label">${(maxValue * 0.75) >= 1000000 ? ((maxValue * 0.75) / 1000000).toFixed(1) + 'M' : ((maxValue * 0.75) / 1000).toFixed(0) + 'K'}</div>
          <div class="y-label">${(maxValue * 0.5) >= 1000000 ? ((maxValue * 0.5) / 1000000).toFixed(1) + 'M' : ((maxValue * 0.5) / 1000).toFixed(0) + 'K'}</div>
          <div class="y-label">${(maxValue * 0.25) >= 1000000 ? ((maxValue * 0.25) / 1000000).toFixed(1) + 'M' : ((maxValue * 0.25) / 1000).toFixed(0) + 'K'}</div>
          <div class="y-label">0</div>
        </div>
        
        <div class="chart-area">
          <svg class="chart-svg" viewBox="0 0 400 250">
            <defs>
              <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#2e2e45;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2e2e45;stop-opacity:0.3" />
              </linearGradient>
            </defs>
            
            <!-- Grid lines -->
            <line x1="0" y1="50" x2="400" y2="50" stroke="#2e2e45" stroke-width="1"/>
            <line x1="0" y1="100" x2="400" y2="100" stroke="#2e2e45" stroke-width="1"/>
            <line x1="0" y1="150" x2="400" y2="150" stroke="#2e2e45" stroke-width="1"/>
            <line x1="0" y1="200" x2="400" y2="200" stroke="#2e2e45" stroke-width="1"/>
            
            <!-- AI Tools line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.aiTools / maxValue) * 210 })))}" 
                  fill="none" stroke="#5ee3ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- ChatGPT line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.chatgpt / maxValue) * 210 })))}" 
                  fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- ML line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.ml / maxValue) * 210 })))}" 
                  fill="none" stroke="#ec4899" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            
          </svg>
          
          <div class="x-axis">
            ${data.map(d => `<div class="x-label">${d.date}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Create trend table function
async function createTrendTable() {
  const tableContainer = document.getElementById('trendTable');
  if (!tableContainer) return;

  let tableRows = '';
  
  // Try to fetch data from Supabase
  if (supabase) {
    try {
      console.log('Fetching table data from trend_reach...');
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
        .limit(10);

      if (error) {
        console.error('Error fetching table data:', error);
      } else if (trendData && trendData.length > 0) {
        console.log('Fetched table data:', trendData);
        console.log('Table columns available:', Object.keys(trendData[0]));
        
        // Sort by reach if available, otherwise use first 10 records
        const sortedData = trendData.sort((a, b) => (b.reach || 0) - (a.reach || 0));
        
        tableRows = sortedData.map(item => `
          <tr>
            <td>${item.keyword || item.trend_name || item.name || 'Unknown Trend'}</td>
            <td>${item.platform || 'TikTok'}</td>
            <td>${item.reach ? (item.reach / 1000).toFixed(1) + 'K' : 'N/A'}</td>
            <td>${item.score || (item.reach ? Math.floor(item.reach / 100) : 'N/A')}</td>
          </tr>
        `).join('');
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    }
  }

  // Fallback data if no Supabase data
  if (!tableRows) {
    console.log('Using fallback table data');
    tableRows = `
      <tr>
        <td>AI Tools</td>
        <td>TikTok</td>
        <td>23.4K</td>
        <td>94</td>
      </tr>
      <tr>
        <td>ChatGPT</td>
        <td>Reddit</td>
        <td>18.7K</td>
        <td>89</td>
      </tr>
      <tr>
        <td>Machine Learning</td>
        <td>YouTube</td>
        <td>15.2K</td>
        <td>82</td>
      </tr>
      <tr>
        <td>Deep Learning</td>
        <td>Twitter</td>
        <td>12.9K</td>
        <td>76</td>
      </tr>
      <tr>
        <td>Neural Networks</td>
        <td>LinkedIn</td>
        <td>10.3K</td>
        <td>71</td>
      </tr>
    `;
  }

  const tableHTML = `
    <table class="trend-table">
      <thead>
        <tr>
          <th>Keyword</th>
          <th>Platform</th>
          <th>Mentions</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
  
  tableContainer.innerHTML = tableHTML;
}