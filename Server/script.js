
// Performance monitoring
const performanceMetrics = {
  chartRenderTime: 0,
  dataFetchTime: 0,
  lastUpdate: null
};

// Performance-optimized debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Optimized search with debouncing
const debouncedSearch = debounce(async function() {
  await searchTrends();
}, 300);

// Add search input event listener
function setupSearchListener() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
    searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchTrends();
      }
    });
  }
}

// Performance monitoring wrapper
function measurePerformance(fn, metricName) {
  return async function(...args) {
    const startTime = performance.now();
    const result = await fn.apply(this, args);
    const endTime = performance.now();
    performanceMetrics[metricName] = endTime - startTime;
    console.log(`⚡ ${metricName}: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  };
}


// Configuration
let SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';
let YOUTUBE_API_KEY = null; // Will be handled by server

let supabase = null;
let chartRoot = null;
let currentData = null;
let selectedTrends = 'all';
let filteredData = null;
let startDate = null;
let endDate = null;

// User authentication state
let currentUser = null;
let isAuthenticated = false;

// Initialize Supabase
function initSupabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialized successfully');
      console.log('🔗 Connected to:', SUPABASE_URL);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  } else {
    console.log('❌ Supabase credentials not configured - using fallback data');
    console.log('📋 Current SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
    console.log('📋 Current SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');
    supabase = null;
    return false;
  }
}

// Call initializeDashboard after DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Initialize dashboard with enhanced features
async function initializeDashboard() {
  console.log('🚀 Initializing dashboard...');
  showLoadingSpinner();

  try {
    const data = await fetchData();

    if (!data) {
      console.log('❌ No initial data, using fallback...');
      hideLoadingSpinner();
      return;
    }

    console.log('✅ Dashboard initialized with REAL DATA successfully');
    console.log('📊 Chart shows multiple trends:', Object.keys(data.chartData[0] || {}).filter(key => key !== 'date'));

    currentData = data;
    createChart(data.chartData);
    createTrendTable(data.tableData);
    updateTrendFilter(data.chartData);
    
    // Force update status info with complete data
    updateStatusInfo(data);
    console.log('📊 Status info updated with complete dataset');

    // Set default filter to all trends
    const filterSelect = document.getElementById('trendFilter');
    if (filterSelect) {
      filterSelect.value = 'all';
    }

    // Initialize auto-refresh from settings
    initializeAutoRefresh();

    // Add keyboard shortcuts
    setupKeyboardShortcuts();

    // Setup search listener
    setupSearchListener();

    // Initialize live status indicator
    updateLiveStatus('connected');

  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    updateLiveStatus('error');
  } finally {
    hideLoadingSpinner();
  }
}

// Show loading spinner
function showLoadingSpinner() {
  // Create loading overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loadingOverlay';
  loadingOverlay.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Fetching YouTube data...</div>
    </div>
  `;
  document.body.appendChild(loadingOverlay);
}

// Hide loading spinner
function hideLoadingSpinner() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}
