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
let supabaseAvailable = false;

// Initialize Supabase with better error handling
try {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseAvailable = true;
    console.log('Supabase client initialized');
  } else {
    console.log('Supabase library not available, using fallback data');
  }
} catch (error) {
  console.log('Failed to initialize Supabase, using fallback data:', error);
  supabaseAvailable = false;
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
  
  // Try to fetch data from Supabase only if properly initialized
  if (supabaseAvailable && supabase) {
    try {
      console.log('Attempting to fetch data from Supabase...');
      
      // Fetch all data from trend_reach table
      const { data: trendData, error } = await supabase
        .from('trend_reach')
        .select('*')
        .order('id', { ascending: true });

      if (!error && trendData && trendData.length > 0) {
        console.log('Successfully fetched data from Supabase:', trendData);
        
        // Group data by timestamp and create chart data points
        const groupedData = {};
        
        trendData.forEach(item => {
          // Create a date key from the timestamp (assuming there's an id or timestamp field)
          const dateKey = item.id || Object.keys(groupedData).length + 1;
          
          if (!groupedData[dateKey]) {
            groupedData[dateKey] = {
              date: `Day ${dateKey}`,
              aiTools: 0,
              chatgpt: 0,
              ml: 0,
              blockchain: 0,
              metaverse: 0,
              nft: 0,
              crypto: 0
            };
          }
          
          // Map trend_name to chart categories and use reach_count
          const trendName = (item.trend_name || '').toLowerCase();
          const reachCount = item.reach_count || 0;
          
          if (trendName.includes('ai') || trendName.includes('artificial intelligence')) {
            groupedData[dateKey].aiTools += reachCount;
          } else if (trendName.includes('chatgpt') || trendName.includes('gpt')) {
            groupedData[dateKey].chatgpt += reachCount;
          } else if (trendName.includes('machine learning') || trendName.includes('ml')) {
            groupedData[dateKey].ml += reachCount;
          } else if (trendName.includes('blockchain')) {
            groupedData[dateKey].blockchain += reachCount;
          } else if (trendName.includes('metaverse')) {
            groupedData[dateKey].metaverse += reachCount;
          } else if (trendName.includes('nft')) {
            groupedData[dateKey].nft += reachCount;
          } else if (trendName.includes('crypto') || trendName.includes('bitcoin') || trendName.includes('ethereum')) {
            groupedData[dateKey].crypto += reachCount;
          } else {
            // Default assignment for uncategorized trends
            groupedData[dateKey].aiTools += reachCount;
          }
        });
        
        // Convert grouped data to array
        data = Object.values(groupedData);
        
        console.log('Transformed chart data:', data);
      } else {
        console.log('No data returned from Supabase or connection failed:', error);
      }
    } catch (error) {
      console.log('Supabase query failed, using fallback data:', error);
    }
  }

  // Fallback data if no Supabase data
  if (data.length === 0) {
    console.log('Using fallback chart data');
    data = [
      { date: 'Jan 1', aiTools: 800, chatgpt: 600, ml: 400, blockchain: 350, metaverse: 300, nft: 250, crypto: 320 },
      { date: 'Jan 2', aiTools: 1200, chatgpt: 900, ml: 700, blockchain: 500, metaverse: 450, nft: 380, crypto: 480 },
      { date: 'Jan 3', aiTools: 1800, chatgpt: 1400, ml: 1200, blockchain: 800, metaverse: 750, nft: 600, crypto: 720 },
      { date: 'Jan 4', aiTools: 2400, chatgpt: 2000, ml: 1800, blockchain: 1200, metaverse: 1100, nft: 900, crypto: 1050 },
      { date: 'Jan 5', aiTools: 2800, chatgpt: 2300, ml: 2100, blockchain: 1500, metaverse: 1400, nft: 1200, crypto: 1350 },
      { date: 'Jan 6', aiTools: 3200, chatgpt: 2700, ml: 2400, blockchain: 1800, metaverse: 1700, nft: 1500, crypto: 1650 },
      { date: 'Jan 7', aiTools: 3600, chatgpt: 3100, ml: 2800, blockchain: 2200, metaverse: 2000, nft: 1800, crypto: 1950 }
    ];
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.aiTools, d.chatgpt, d.ml, d.blockchain, d.metaverse, d.nft, d.crypto)));
  
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
        <div class="legend-item">
          <div class="legend-color" style="background: #f97316;"></div>
          <span>Blockchain</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981;"></div>
          <span>Metaverse</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #3b82f6;"></div>
          <span>NFT</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #eab308;"></div>
          <span>Crypto</span>
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
            
            <!-- Blockchain line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.blockchain / maxValue) * 210 })))}" 
                  fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Metaverse line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.metaverse / maxValue) * 210 })))}" 
                  fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- NFT line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.nft / maxValue) * 210 })))}" 
                  fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Crypto line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: (i * (380 / (data.length - 1))) + 20, y: 230 - (d.crypto / maxValue) * 210 })))}" 
                  fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            
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
  
  // Try to fetch data from Supabase only if properly initialized
  if (supabaseAvailable && supabase) {
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
          
          // Format reach count with K/M notation
          let formattedReach;
          if (reachCount >= 1000000) {
            formattedReach = (reachCount / 1000000).toFixed(1) + 'M';
          } else if (reachCount >= 1000) {
            formattedReach = (reachCount / 1000).toFixed(1) + 'K';
          } else {
            formattedReach = reachCount.toString();
          }
          
          // Calculate a score based on reach (simplified scoring)
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
        console.log('No table data returned from Supabase:', error);
      }
    } catch (error) {
      console.log('Table data fetch failed, using fallback data:', error);
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
        <td>Blockchain</td>
        <td>Twitter</td>
        <td>14.3K</td>
        <td>78</td>
      </tr>
      <tr>
        <td>Metaverse</td>
        <td>Instagram</td>
        <td>12.9K</td>
        <td>76</td>
      </tr>
      <tr>
        <td>NFT</td>
        <td>Discord</td>
        <td>11.8K</td>
        <td>73</td>
      </tr>
      <tr>
        <td>Crypto</td>
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