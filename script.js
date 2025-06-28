// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing components...');

  // Initialize native chart
  createNativeChart();
  
  // Initialize table
  createTrendTable();
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
function createNativeChart() {
  const chartContainer = document.getElementById('trendChart');
  if (!chartContainer) return;

  const data = [
    { date: 'Jan 1', aiTools: 1200, chatgpt: 900, ml: 800 },
    { date: 'Jan 2', aiTools: 1500, chatgpt: 1100, ml: 950 },
    { date: 'Jan 3', aiTools: 1800, chatgpt: 1300, ml: 1100 },
    { date: 'Jan 4', aiTools: 2100, chatgpt: 1600, ml: 1250 },
    { date: 'Jan 5', aiTools: 1900, chatgpt: 1400, ml: 1150 }
  ];

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
          <div class="y-label">${Math.round(maxValue)}K</div>
          <div class="y-label">${Math.round(maxValue * 0.75)}K</div>
          <div class="y-label">${Math.round(maxValue * 0.5)}K</div>
          <div class="y-label">${Math.round(maxValue * 0.25)}K</div>
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
            <path d="${createSmoothPath(data.map((d, i) => ({ x: i * 100 + 50, y: 250 - (d.aiTools / maxValue) * 200 })))}" 
                  fill="none" stroke="#5ee3ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- ChatGPT line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: i * 100 + 50, y: 250 - (d.chatgpt / maxValue) * 200 })))}" 
                  fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- ML line -->
            <path d="${createSmoothPath(data.map((d, i) => ({ x: i * 100 + 50, y: 250 - (d.ml / maxValue) * 200 })))}" 
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
function createTrendTable() {
  const tableContainer = document.getElementById('trendTable');
  if (tableContainer) {
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
        </tbody>
      </table>
    `;
    tableContainer.innerHTML = tableHTML;
  }
}