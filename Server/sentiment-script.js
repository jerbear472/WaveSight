
// Sentiment Dashboard Configuration
let SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';

let supabase = null;
let sentimentData = null;

// Initialize Supabase - prevent multiple instances
function initSupabase() {
  if (window.globalSupabaseClient) {
    supabase = window.globalSupabaseClient;
    console.log('✅ Supabase reused existing client');
    return true;
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.globalSupabaseClient = supabase;
      console.log('✅ Supabase initialized for sentiment dashboard');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  }
  return false;
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing sentiment dashboard...');

  // Initialize Supabase
  initSupabase();

  try {
    // Create event prediction cards first
    createEventPredictionCards();

    // Fetch and display sentiment data
    const data = await fetchSentimentData();
    sentimentData = data;

    console.log('Loaded sentiment data:', data);

    // Create prediction cards
    createPredictionCards(data);

    // Create dashboard
    createSentimentDashboard(data);

    // Create table
    createSentimentTable(data);

    console.log('Sentiment dashboard initialized successfully');

  } catch (error) {
    console.error('Error initializing sentiment dashboard:', error);
  }
});
