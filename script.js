// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing components...');

  // Wait for all scripts to load
  setTimeout(() => {
    try {
      const chartContainer = document.getElementById('trendChart');
      if (chartContainer && window.React && window.ReactDOM && window.Recharts) {
        console.log('All libraries loaded, rendering chart...');

        // Create the chart component using React.createElement
        const TrendChart = () => {
          const [data, setData] = React.useState([
            { name: 'Jan 1', 'AI Tools': 1200, 'ChatGPT': 900, 'Machine Learning': 800 },
            { name: 'Jan 2', 'AI Tools': 1500, 'ChatGPT': 1100, 'Machine Learning': 950 },
            { name: 'Jan 3', 'AI Tools': 1800, 'ChatGPT': 1300, 'Machine Learning': 1100 },
            { name: 'Jan 4', 'AI Tools': 2100, 'ChatGPT': 1600, 'Machine Learning': 1250 },
            { name: 'Jan 5', 'AI Tools': 1900, 'ChatGPT': 1400, 'Machine Learning': 1150 }
          ]);

          const colors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

          return React.createElement(
            'div',
            { style: { width: '100%', height: '320px' } },
            React.createElement(
              Recharts.ResponsiveContainer,
              { width: '100%', height: '100%' },
              React.createElement(
                Recharts.LineChart,
                { 
                  data: data, 
                  margin: { top: 5, right: 30, left: 20, bottom: 5 } 
                },
                React.createElement(Recharts.CartesianGrid, { strokeDasharray: '3 3', stroke: '#2e2e45' }),
                React.createElement(Recharts.XAxis, { dataKey: 'name', stroke: '#9ca3af' }),
                React.createElement(Recharts.YAxis, { stroke: '#9ca3af' }),
                React.createElement(Recharts.Tooltip, { 
                  contentStyle: { 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2e2e45',
                    borderRadius: '8px',
                    color: '#f1f1f1'
                  } 
                }),
                React.createElement(Recharts.Legend, {}),
                React.createElement(Recharts.Line, {
                  type: 'monotone',
                  dataKey: 'AI Tools',
                  stroke: colors[0],
                  strokeWidth: 2,
                  dot: { fill: colors[0] }
                }),
                React.createElement(Recharts.Line, {
                  type: 'monotone',
                  dataKey: 'ChatGPT',
                  stroke: colors[1],
                  strokeWidth: 2,
                  dot: { fill: colors[1] }
                }),
                React.createElement(Recharts.Line, {
                  type: 'monotone',
                  dataKey: 'Machine Learning',
                  stroke: colors[2],
                  strokeWidth: 2,
                  dot: { fill: colors[2] }
                })
              )
            )
          );
        };

        // Render the chart
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
        chartContainer.innerHTML = '<p style="color: #e5e7eb;">Chart initialization error: ' + error.message + '</p>';
      }
    }

    // Initialize table
    createTrendTable();
  }, 1000);
});

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