
// Initialize Supabase client
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to fetch data from Supabase
async function fetchTrendData() {
  try {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .order('date', { ascending: true });
    
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

// Function to update cards with Supabase data - keeping static cards for now
async function updateCards() {
  // Keep existing static cards since trend_cards table doesn't exist
  console.log('Using static card data');
}

// Initialize chart with Supabase data
async function initChart() {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  const gradient1 = ctx.createLinearGradient(0, 0, 0, 300);
  gradient1.addColorStop(0, 'rgba(94, 227, 255, 0.8)');
  gradient1.addColorStop(1, 'rgba(94, 227, 255, 0.05)');

  const gradient2 = ctx.createLinearGradient(0, 0, 0, 300);
  gradient2.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
  gradient2.addColorStop(1, 'rgba(139, 92, 246, 0.05)');

  const gradient3 = ctx.createLinearGradient(0, 0, 0, 300);
  gradient3.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
  gradient3.addColorStop(1, 'rgba(236, 72, 153, 0.05)');

  const gradient4 = ctx.createLinearGradient(0, 0, 0, 300);
  gradient4.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
  gradient4.addColorStop(1, 'rgba(249, 115, 22, 0.05)');

  // Fetch data from Supabase
  const trendData = await fetchTrendData();
  
  let chartData;
  if (trendData && trendData.length > 0) {
    // Process Supabase data
    const labels = [...new Set(trendData.map(item => item.date))].sort();
    const datasets = {};
    
    trendData.forEach(item => {
      if (!datasets[item.keyword]) {
        datasets[item.keyword] = {
          label: item.keyword,
          data: [],
          fill: true,
          tension: 0.4,
          pointRadius: 0,
        };
      }
    });
    
    // Assign colors and gradients
    const gradients = [gradient1, gradient2, gradient3, gradient4];
    const borderColors = ['#5ee3ff', '#8b5cf6', '#ec4899', '#f97316'];
    
    Object.keys(datasets).forEach((keyword, index) => {
      datasets[keyword].backgroundColor = gradients[index % gradients.length];
      datasets[keyword].borderColor = borderColors[index % borderColors.length];
      
      // Fill data array with values for each date
      datasets[keyword].data = labels.map(date => {
        const item = trendData.find(d => d.keyword === keyword && d.date === date);
        return item ? item.value : 0;
      });
    });
    
    chartData = {
      labels: labels,
      datasets: Object.values(datasets)
    };
  } else {
    // Fallback to static data if Supabase fails
    chartData = {
      labels: ['Mar 1', 'Mar 7', 'Mar 14', 'Mar 21', 'Mar 28'],
      datasets: [
        {
          label: 'AI-generated images',
          data: [35, 45, 60, 70, 84],
          fill: true,
          backgroundColor: gradient1,
          borderColor: '#5ee3ff',
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: 'ChatGPT',
          data: [20, 34, 50, 65, 79],
          fill: true,
          backgroundColor: gradient2,
          borderColor: '#8b5cf6',
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: 'Elden Ring',
          data: [15, 25, 40, 55, 69],
          fill: true,
          backgroundColor: gradient3,
          borderColor: '#ec4899',
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: 'Pineapple on pizza',
          data: [10, 18, 30, 40, 53],
          fill: true,
          backgroundColor: gradient4,
          borderColor: '#f97316',
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    };
  }

  const chart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#e5e7eb',
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#a1a1aa',
          },
          grid: {
            color: 'rgba(255,255,255,0.05)',
          },
        },
        y: {
          ticks: {
            color: '#a1a1aa',
          },
          grid: {
            color: 'rgba(255,255,255,0.05)',
          },
        },
      },
    },
  });
}

// Function to create and populate table with Supabase data
async function createTrendTable() {
  try {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .order('date', { ascending: false });
    
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
  await initChart();
  await updateCards();
  await createTrendTable();
});
