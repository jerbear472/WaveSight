// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing components...');

  // Initialize native chart
  createNativeChart();
  
  // Initialize table
  createTrendTable();
});

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
            <polyline points="${data.map((d, i) => `${i * 100 + 50},${250 - (d.aiTools / maxValue) * 200}`).join(' ')}" 
                      fill="none" stroke="#5ee3ff" stroke-width="3"/>
            
            <!-- ChatGPT line -->
            <polyline points="${data.map((d, i) => `${i * 100 + 50},${250 - (d.chatgpt / maxValue) * 200}`).join(' ')}" 
                      fill="none" stroke="#8b5cf6" stroke-width="3"/>
            
            <!-- ML line -->
            <polyline points="${data.map((d, i) => `${i * 100 + 50},${250 - (d.ml / maxValue) * 200}`).join(' ')}" 
                      fill="none" stroke="#ec4899" stroke-width="3"/>
            
            <!-- Data points -->
            ${data.map((d, i) => `
              <circle cx="${i * 100 + 50}" cy="${250 - (d.aiTools / maxValue) * 200}" r="4" fill="#5ee3ff"/>
              <circle cx="${i * 100 + 50}" cy="${250 - (d.chatgpt / maxValue) * 200}" r="4" fill="#8b5cf6"/>
              <circle cx="${i * 100 + 50}" cy="${250 - (d.ml / maxValue) * 200}" r="4" fill="#ec4899"/>
            `).join('')}
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