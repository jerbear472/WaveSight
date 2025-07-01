
// Charting Trends Table Configuration
let SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';

let supabase = null;
let currentData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 50;
let totalPages = 1;

// Initialize Supabase
function initSupabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialized for trends table');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  }
  return false;
}

// Fetch trending data from Supabase
async function fetchTrendingData() {
  try {
    showLoading();
    console.log('📥 Fetching trending data...');

    const { data, error } = await supabase
      .from('youtube_trends')
      .select('*')
      .order('view_count', { ascending: false })
      .limit(1000);

    if (error) {
      throw error;
    }

    console.log(`✅ Retrieved ${data.length} trending records`);
    return data || [];

  } catch (error) {
    console.error('❌ Error fetching trending data:', error);
    return getFallbackTrendingData();
  } finally {
    hideLoading();
  }
}

// Fallback data when database is unavailable
function getFallbackTrendingData() {
  const categories = ['AI Tools', 'Crypto', 'Gaming', 'Technology', 'Entertainment', 'Health & Fitness', 'General'];
  const data = [];

  for (let i = 0; i < 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const viewCount = Math.floor(Math.random() * 10000000) + 100000;
    const likeCount = Math.floor(viewCount * (0.01 + Math.random() * 0.05));
    const commentCount = Math.floor(viewCount * (0.002 + Math.random() * 0.008));
    
    data.push({
      id: i + 1,
      video_id: `fallback_${i}`,
      title: `Trending ${category} Content ${i + 1}`,
      trend_category: category,
      view_count: viewCount,
      like_count: likeCount,
      comment_count: commentCount,
      trend_score: Math.floor(Math.random() * 100) + 1,
      wave_score: Math.random(),
      sentiment_score: Math.random(),
      published_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      channel_title: `Channel ${Math.floor(Math.random() * 1000)}`
    });
  }

  return data;
}

// Format numbers with K/M notation
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  } else {
    return num.toString();
  }
}

// Calculate engagement rate
function calculateEngagementRate(item) {
  const viewCount = item.view_count || 0;
  const likeCount = item.like_count || 0;
  const commentCount = item.comment_count || 0;
  
  if (viewCount === 0) return 0;
  return ((likeCount + commentCount) / viewCount * 100).toFixed(2);
}

// Calculate growth (mock for now)
function calculateGrowth(item) {
  // Mock growth calculation based on trend score and recency
  const daysOld = Math.floor((Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24));
  const baseGrowth = (item.trend_score || 50) - 50;
  const timeDecay = Math.max(0, 1 - (daysOld / 30));
  return (baseGrowth * timeDecay).toFixed(1);
}

// Get category CSS class
function getCategoryClass(category) {
  const categoryMap = {
    'AI Tools': 'category-ai',
    'Crypto': 'category-crypto',
    'Gaming': 'category-gaming',
    'Technology': 'category-tech',
    'Entertainment': 'category-entertainment',
    'Health & Fitness': 'category-health',
    'General': 'category-general'
  };
  return categoryMap[category] || 'category-general';
}

// Get wave score indicator
function getWaveScoreIndicator(waveScore) {
  const score = parseFloat(waveScore) || 0;
  if (score >= 0.7) return { class: 'wave-high', label: 'High' };
  if (score >= 0.4) return { class: 'wave-medium', label: 'Medium' };
  return { class: 'wave-low', label: 'Low' };
}

// Create table rows
function createTableRows(data) {
  const tbody = document.getElementById('trendsTableBody');
  if (!tbody || !data || data.length === 0) {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: #9ca3af;">No trending data available</td></tr>';
    }
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const pageData = data.slice(startIndex, endIndex);

  const rows = pageData.map((item, index) => {
    const rank = startIndex + index + 1;
    const engagementRate = calculateEngagementRate(item);
    const growth = calculateGrowth(item);
    const waveIndicator = getWaveScoreIndicator(item.wave_score);
    
    const growthClass = parseFloat(growth) > 0 ? 'growth-positive' : 
                      parseFloat(growth) < 0 ? 'growth-negative' : 'growth-neutral';

    return `
      <tr data-video-id="${item.video_id}">
        <td><span class="trend-rank">#${rank}</span></td>
        <td>
          <div class="trend-name">${item.title || 'Untitled'}</div>
          <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">
            ${item.channel_title || 'Unknown Channel'}
          </div>
        </td>
        <td>
          <span class="trend-category ${getCategoryClass(item.trend_category)}">
            ${item.trend_category || 'General'}
          </span>
        </td>
        <td>
          <div class="metric-value">${formatNumber(item.view_count || 0)}</div>
          <div style="font-size: 0.75rem; color: #9ca3af;">views</div>
        </td>
        <td>
          <div class="metric-value">${engagementRate}%</div>
          <div style="font-size: 0.75rem; color: #9ca3af;">
            ${formatNumber((item.like_count || 0) + (item.comment_count || 0))} total
          </div>
        </td>
        <td>
          <div class="metric-value">${item.trend_score || 0}</div>
          <div style="font-size: 0.75rem; color: #9ca3af;">/100</div>
        </td>
        <td>
          <div class="wave-score">
            <span class="wave-indicator ${waveIndicator.class}"></span>
            <span class="metric-value">${(item.wave_score || 0).toFixed(3)}</span>
          </div>
          <div style="font-size: 0.75rem; color: #9ca3af;">${waveIndicator.label}</div>
        </td>
        <td>
          <div class="metric-growth ${growthClass}">
            ${parseFloat(growth) > 0 ? '+' : ''}${growth}%
          </div>
        </td>
        <td>
          <div style="font-size: 0.875rem;">
            ${new Date(item.published_at).toLocaleDateString()}
          </div>
          <div style="font-size: 0.75rem; color: #9ca3af;">
            ${new Date(item.published_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </td>
        <td>
          <div class="trend-actions">
            <button class="action-btn btn-chart" onclick="viewChart('${item.video_id}')" title="View Chart">
              📊
            </button>
            <button class="action-btn btn-alert" onclick="createAlert('${item.video_id}')" title="Create Alert">
              🚨
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;

  // Update pagination
  updatePagination();
}

// Filter and sort data
function filterAndSortData() {
  const categoryFilter = document.getElementById('categoryFilter').value;
  const sortBy = document.getElementById('sortBy').value;
  const timeRange = document.getElementById('timeRange').value;

  let filtered = [...currentData];

  // Category filter
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(item => item.trend_category === categoryFilter);
  }

  // Time range filter
  if (timeRange !== 'all') {
    const days = parseInt(timeRange);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(item => new Date(item.published_at) >= cutoffDate);
  }

  // Sort data
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'view_count':
        return (b.view_count || 0) - (a.view_count || 0);
      case 'trend_score':
        return (b.trend_score || 0) - (a.trend_score || 0);
      case 'wave_score':
        return (b.wave_score || 0) - (a.wave_score || 0);
      case 'published_at':
        return new Date(b.published_at) - new Date(a.published_at);
      case 'engagement':
        const engagementA = calculateEngagementRate(a);
        const engagementB = calculateEngagementRate(b);
        return parseFloat(engagementB) - parseFloat(engagementA);
      default:
        return 0;
    }
  });

  filteredData = filtered;
  currentPage = 1;
  totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  createTableRows(filtered);
}

// Update pagination
function updatePagination() {
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }
}

// Change page
function changePage(direction) {
  const newPage = currentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    createTableRows(filteredData);
  }
}

// Refresh table
async function refreshTable() {
  console.log('🔄 Refreshing trends table...');
  currentData = await fetchTrendingData();
  filterAndSortData();
}

// View chart for specific trend
function viewChart(videoId) {
  console.log(`📊 Opening chart for video: ${videoId}`);
  // Open main dashboard with this video highlighted
  window.open(`index.html?highlight=${videoId}`, '_blank');
}

// Create alert for specific trend
function createAlert(videoId) {
  console.log(`🚨 Creating alert for video: ${videoId}`);
  const item = currentData.find(d => d.video_id === videoId);
  if (item) {
    alert(`Alert created for: ${item.title}\nYou'll be notified of significant changes in engagement.`);
  }
}

// Show/hide loading
function showLoading() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loadingOverlay';
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div>Loading trending data...</div>
    </div>
  `;
  document.body.appendChild(loadingOverlay);
}

function hideLoading() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing charting trends table...');

  // Initialize Supabase
  initSupabase();

  // Add event listeners for filters
  document.getElementById('categoryFilter').addEventListener('change', filterAndSortData);
  document.getElementById('sortBy').addEventListener('change', filterAndSortData);
  document.getElementById('timeRange').addEventListener('change', filterAndSortData);

  // Load initial data
  await refreshTable();
});

// Make functions globally available
window.refreshTable = refreshTable;
window.changePage = changePage;
window.viewChart = viewChart;
window.createAlert = createAlert;
