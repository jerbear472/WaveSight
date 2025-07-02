

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

