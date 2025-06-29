// Sentiment Dashboard Configuration
let SUPABASE_URL = 'https://artdirswzxxskcdvstse.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo';

let supabase = null;
let sentimentData = null;

// Initialize Supabase
function initSupabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialized for sentiment dashboard');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return false;
    }
  }
  return false;
}

// Fetch sentiment data from Supabase
async function fetchSentimentData() {
  if (!supabase) {
    console.log('⚠️ Supabase not initialized, using fallback data');
    return getFallbackSentimentData();
  }

  try {
    console.log('📥 Fetching sentiment data from Supabase...');

    const { data, error } = await supabase
      .from('sentiment_forecasts')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching sentiment data:', error);
      return getFallbackSentimentData();
    }

    if (!data || data.length === 0) {
      console.log('📊 No sentiment data found, using fallback');
      return getFallbackSentimentData();
    }

    console.log(`✅ Retrieved ${data.length} sentiment records`);
    return data;

  } catch (error) {
    console.error('❌ Error in fetchSentimentData:', error);
    return getFallbackSentimentData();
  }
}

// Fallback sentiment data for demo purposes
function getFallbackSentimentData() {
  return [
    {
      id: 1,
      topic: 'AI Development',
      platform: 'Reddit',
      date: '2025-01-01',
      sentiment_yes: 45,
      sentiment_no: 12,
      sentiment_unclear: 8,
      confidence: 69.2
    },
    {
      id: 2,
      topic: 'AI Development',
      platform: 'Reddit',
      date: '2025-01-02',
      sentiment_yes: 52,
      sentiment_no: 15,
      sentiment_unclear: 10,
      confidence: 67.5
    },
    {
      id: 3,
      topic: 'Cryptocurrency Market',
      platform: 'Reddit',
      date: '2025-01-01',
      sentiment_yes: 38,
      sentiment_no: 25,
      sentiment_unclear: 12,
      confidence: 50.7
    },
    {
      id: 4,
      topic: 'Cryptocurrency Market',
      platform: 'Reddit',
      date: '2025-01-02',
      sentiment_yes: 41,
      sentiment_no: 22,
      sentiment_unclear: 14,
      confidence: 53.2
    },
    {
      id: 5,
      topic: 'Climate Change',
      platform: 'Reddit',
      date: '2025-01-01',
      sentiment_yes: 67,
      sentiment_no: 8,
      sentiment_unclear: 15,
      confidence: 74.4
    },
    {
      id: 6,
      topic: 'Climate Change',
      platform: 'Reddit',
      date: '2025-01-02',
      sentiment_yes: 72,
      sentiment_no: 6,
      sentiment_unclear: 12,
      confidence: 80.0
    }
  ];
}

// Create sentiment dashboard with fallback for when Recharts isn't available
function createSentimentDashboard(data) {
  const dashboardContainer = document.getElementById('sentimentDashboard');
  if (!dashboardContainer || !data || data.length === 0) {
    console.log('No sentiment data to display');
    return;
  }

  // Group data by topic
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.topic]) {
      acc[item.topic] = [];
    }
    acc[item.topic].push(item);
    return acc;
  }, {});

  // Check if Recharts is available
  if (typeof Recharts === 'undefined') {
    console.log('⚠️ Recharts not available, creating simple dashboard');
    createSimpleSentimentDashboard(groupedData, dashboardContainer);
    return;
  }

  // Create React component with Recharts
  const SentimentDashboard = () => {
    const [loading, setLoading] = React.useState(false);

    return React.createElement('div', { className: 'sentiment-dashboard-grid' },
      Object.entries(groupedData).map(([topic, entries]) => {
        // Sort entries by date
        const sortedEntries = entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        return React.createElement('div', {
          key: topic,
          className: 'sentiment-card'
        }, [
          React.createElement('div', { className: 'sentiment-card-header', key: 'header' }, [
            React.createElement('h3', { className: 'sentiment-topic', key: 'title' }, topic),
            React.createElement('div', { className: 'sentiment-summary', key: 'summary' }, [
              React.createElement('span', { 
                className: 'confidence-score',
                key: 'confidence'
              }, `Confidence: ${Math.round(sortedEntries[sortedEntries.length - 1]?.confidence || 0)}%`)
            ])
          ]),
          React.createElement('div', { className: 'sentiment-chart-container', key: 'chart' },
            React.createElement(Recharts.ResponsiveContainer, {
              width: '100%',
              height: 250
            },
              React.createElement(Recharts.LineChart, {
                data: sortedEntries,
                margin: { top: 5, right: 30, left: 20, bottom: 5 }
              }, [
                React.createElement(Recharts.XAxis, {
                  dataKey: 'date',
                  stroke: '#9ca3af',
                  fontSize: 12,
                  key: 'xaxis'
                }),
                React.createElement(Recharts.YAxis, {
                  stroke: '#9ca3af',
                  fontSize: 12,
                  key: 'yaxis'
                }),
                React.createElement(Recharts.Tooltip, {
                  contentStyle: {
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #5ee3ff',
                    borderRadius: '8px',
                    color: '#f1f1f1'
                  },
                  key: 'tooltip'
                }),
                React.createElement(Recharts.Legend, { key: 'legend' }),
                React.createElement(Recharts.Line, {
                  type: 'monotone',
                  dataKey: 'sentiment_yes',
                  stroke: '#22c55e',
                  strokeWidth: 3,
                  name: 'Positive',
                  dot: { fill: '#22c55e', strokeWidth: 2, r: 4 },
                  key: 'yes-line'
                }),
                React.createElement(Recharts.Line, {
                  type: 'monotone',
                  dataKey: 'sentiment_no',
                  stroke: '#ef4444',
                  strokeWidth: 3,
                  name: 'Negative',
                  dot: { fill: '#ef4444', strokeWidth: 2, r: 4 },
                  key: 'no-line'
                }),
                React.createElement(Recharts.Line, {
                  type: 'monotone',
                  dataKey: 'sentiment_unclear',
                  stroke: '#eab308',
                  strokeWidth: 3,
                  name: 'Unclear',
                  dot: { fill: '#eab308', strokeWidth: 2, r: 4 },
                  key: 'unclear-line'
                })
              ])
            )
          )
        ]);
      })
    );
  };

  try {
    // Render the React component
    const root = ReactDOM.createRoot(dashboardContainer);
    root.render(React.createElement(SentimentDashboard));
  } catch (error) {
    console.error('Error rendering React dashboard:', error);
    createSimpleSentimentDashboard(groupedData, dashboardContainer);
  }
}

// Simple fallback dashboard without Recharts
function createSimpleSentimentDashboard(groupedData, container) {
  const dashboardHTML = Object.entries(groupedData).map(([topic, entries]) => {
    const latest = entries[entries.length - 1] || {};
    const confidence = Math.round(latest.confidence || 0);
    const yes = latest.sentiment_yes || 0;
    const no = latest.sentiment_no || 0;
    const unclear = latest.sentiment_unclear || 0;

    return `
      <div class="sentiment-card">
        <div class="sentiment-card-header">
          <h3 class="sentiment-topic">${topic}</h3>
          <div class="sentiment-summary">
            <span class="confidence-score">Confidence: ${confidence}%</span>
          </div>
        </div>
        <div class="sentiment-chart-container">
          <div class="sentiment-bars">
            <div class="sentiment-bar">
              <span class="bar-label">Positive: ${yes}</span>
              <div class="bar-fill positive" style="width: ${yes > 0 ? (yes / (yes + no + unclear)) * 100 : 0}%"></div>
            </div>
            <div class="sentiment-bar">
              <span class="bar-label">Negative: ${no}</span>
              <div class="bar-fill negative" style="width: ${no > 0 ? (no / (yes + no + unclear)) * 100 : 0}%"></div>
            </div>
            <div class="sentiment-bar">
              <span class="bar-label">Unclear: ${unclear}</span>
              <div class="bar-fill unclear" style="width: ${unclear > 0 ? (unclear / (yes + no + unclear)) * 100 : 0}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="sentiment-dashboard-grid">${dashboardHTML}</div>`;
}

// Get enhanced event predictions data
function getEventPredictionsData() {
  return [
    {
      id: 1,
      title: "WILL TRUMP WIN IN 2024?",
      subtitle: "PUBLIC SENTIMENT",
      prediction: "Likely",
      prediction_class: "likely",
      yes_percentage: 62,
      no_percentage: 38,
      confidence: 75,
      sentiment_over_time: [
        { date: "Jan 1", value: 60 },
        { date: "Jan 8", value: 65 },
        { date: "Jan 15", value: 70 },
        { date: "Jan 22", value: 80 }
      ],
      source_analysis: [
        { platform: "X", percentage: 57, icon: "𝕏" },
        { platform: "TikTok", percentage: 64, icon: "🎵" },
        { platform: "Reddit", percentage: 51, icon: "🔴" }
      ]
    },
    {
      id: 2,
      title: "WILL AI REPLACE PROGRAMMERS BY 2025?",
      subtitle: "TECH INDUSTRY SENTIMENT",
      prediction: "Unlikely",
      prediction_class: "unlikely",
      yes_percentage: 28,
      no_percentage: 72,
      confidence: 68,
      sentiment_over_time: [
        { date: "Jan 1", value: 35 },
        { date: "Jan 8", value: 32 },
        { date: "Jan 15", value: 28 },
        { date: "Jan 22", value: 25 }
      ],
      source_analysis: [
        { platform: "LinkedIn", percentage: 15, icon: "💼" },
        { platform: "Reddit", percentage: 35, icon: "🔴" },
        { platform: "X", percentage: 25, icon: "𝕏" }
      ]
    },
    {
      id: 3,
      title: "WILL CRYPTO HIT NEW ATH IN 2025?",
      subtitle: "MARKET SENTIMENT",
      prediction: "Likely",
      prediction_class: "likely",
      yes_percentage: 68,
      no_percentage: 32,
      confidence: 72,
      sentiment_over_time: [
        { date: "Jan 1", value: 55 },
        { date: "Jan 8", value: 62 },
        { date: "Jan 15", value: 65 },
        { date: "Jan 22", value: 75 }
      ],
      source_analysis: [
        { platform: "X", percentage: 78, icon: "𝕏" },
        { platform: "Reddit", percentage: 65, icon: "🔴" },
        { platform: "Discord", percentage: 72, icon: "💬" }
      ]
    },
    {
      id: 4,
      title: "WILL GTA 6 RELEASE IN 2025?",
      subtitle: "GAMING COMMUNITY",
      prediction: "Uncertain",
      prediction_class: "uncertain",
      yes_percentage: 45,
      no_percentage: 55,
      confidence: 52,
      sentiment_over_time: [
        { date: "Jan 1", value: 60 },
        { date: "Jan 8", value: 50 },
        { date: "Jan 15", value: 45 },
        { date: "Jan 22", value: 40 }
      ],
      source_analysis: [
        { platform: "Reddit", percentage: 35, icon: "🔴" },
        { platform: "X", percentage: 48, icon: "𝕏" },
        { platform: "YouTube", percentage: 52, icon: "📺" }
      ]
    }
  ];
}

// Create event prediction cards with enhanced design
function createEventPredictionCards() {
  const cardsContainer = document.getElementById('eventPredictionCards');
  if (!cardsContainer) {
    console.log('Event prediction cards container not found');
    return;
  }

  const eventData = getEventPredictionsData();

  const cardsHTML = eventData.map(event => {
    // Generate mini chart path
    const maxValue = Math.max(...event.sentiment_over_time.map(d => d.value));
    const minValue = Math.min(...event.sentiment_over_time.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    const pathData = event.sentiment_over_time.map((point, index) => {
      const x = (index / (event.sentiment_over_time.length - 1)) * 265;
      const y = 80 - ((point.value - minValue) / range) * 70;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return `
      <div class="event-prediction-card">
        <div class="event-card-header">
          <div class="wavesight-logo">
            W WAVESIGHT
          </div>
        </div>
        
        <div class="event-main-content">
          <h2 class="event-title">${event.title}</h2>
          <p class="event-subtitle">${event.subtitle}</p>
          
          <div class="event-content-grid">
            <div class="sentiment-chart-section">
              <h3>Sentiment Over Time</h3>
              <div class="mini-chart-container">
                <svg class="mini-chart" viewBox="0 0 300 100">
                  <defs>
                    <linearGradient id="chartGradient${event.id}">
                      <stop offset="0%" stop-color="#5ee3ff" stop-opacity="0.8"/>
                      <stop offset="100%" stop-color="#5ee3ff" stop-opacity="0.2"/>
                    </linearGradient>
                  </defs>
                  <!-- Y-axis labels -->
                  <text x="10" y="15" fill="#9ca3af" font-size="10" text-anchor="middle">100%</text>
                  <text x="10" y="55" fill="#9ca3af" font-size="10" text-anchor="middle">50%</text>
                  <text x="10" y="90" fill="#9ca3af" font-size="10" text-anchor="middle">0%</text>
                  <!-- Grid lines -->
                  <line x1="25" y1="10" x2="290" y2="10" stroke="rgba(156, 163, 175, 0.2)" stroke-width="1"/>
                  <line x1="25" y1="50" x2="290" y2="50" stroke="rgba(156, 163, 175, 0.2)" stroke-width="1"/>
                  <line x1="25" y1="90" x2="290" y2="90" stroke="rgba(156, 163, 175, 0.2)" stroke-width="1"/>
                  <!-- Chart title -->
                  <text x="150" y="8" fill="#f1f1f1" font-size="10" text-anchor="middle" font-weight="600">Positive Sentiment %</text>
                  <!-- Chart path adjusted for new viewBox -->
                  <g transform="translate(25, 10)">
                    <path d="${pathData}" stroke="#5ee3ff" stroke-width="3" fill="none"/>
                    <path d="${pathData} L 265 80 L 0 80 Z" fill="url(#chartGradient${event.id})"/>
                  </g>
                </svg>
                <div class="chart-labels">
                  ${event.sentiment_over_time.map(point => `<span>${point.date}</span>`).join('')}
                </div>
              </div>
            </div>
            
            <div class="prediction-section">
              <h3>PREDICTION</h3>
              <div class="prediction-result ${event.prediction_class}">
                ${event.prediction}
              </div>
              
              <div class="percentage-breakdown">
                <div class="percentage-item">
                  <span class="percentage-label">YES</span>
                  <span class="percentage-value">${event.yes_percentage}%</span>
                </div>
                <div class="percentage-item">
                  <span class="percentage-label">NO</span>
                  <span class="percentage-value">${event.no_percentage}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="source-analysis-section">
            <h3>Source Analysis</h3>
            <div class="source-platforms">
              ${event.source_analysis.map(source => `
                <div class="source-platform">
                  <span class="platform-icon">${source.icon}</span>
                  <span class="platform-percentage">${source.percentage}%</span>
                  <span class="platform-name">${source.platform}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cardsContainer.innerHTML = cardsHTML;
  console.log(`✅ Created ${eventData.length} event prediction cards`);
}

// Create cultural prediction cards (existing functionality)
function createPredictionCards(data) {
  const cardsContainer = document.getElementById('predictionCards');
  if (!cardsContainer || !data || data.length === 0) {
    return;
  }

  // Get recent predictions (last 5)
  const recentPredictions = data.slice(0, 5);

  const cardsHTML = recentPredictions.map(item => {
    const outcomeClass = item.prediction_outcome ? item.prediction_outcome.toLowerCase() : 'uncertain';
    const momentum = item.cultural_momentum || 'Stable';
    const certainty = item.certainty_score || 0;

    return `
      <div class="prediction-card">
        <h3>"Will ${item.topic} happen?"</h3>
        <div class="prediction-result ${outcomeClass}">
          <span class="confidence">${Math.round(item.confidence)}% Confidence</span>
          <span class="outcome">Prediction: ${item.prediction_outcome || 'Uncertain'}</span>
          <div style="margin-top: 10px; font-size: 0.8em; opacity: 0.7;">
            Momentum: ${momentum} | Certainty: ${Math.round(certainty)}%
          </div>
        </div>
      </div>
    `;
  }).join('');

  cardsContainer.innerHTML = cardsHTML;
}

// Create sentiment table
function createSentimentTable(data) {
  const tableBody = document.getElementById('sentimentTableBody');
  if (!tableBody || !data || data.length === 0) {
    console.log('No sentiment table data to display');
    return;
  }

  // Sort by date (most recent first)
  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

  const tableHTML = sortedData.slice(0, 10).map(item => {
    const confidenceClass = item.confidence >= 70 ? 'high-confidence' : 
                           item.confidence >= 50 ? 'medium-confidence' : 'low-confidence';

    return `
      <tr>
        <td class="topic-cell">${item.topic}</td>
        <td>${item.platform}</td>
        <td>${new Date(item.date).toLocaleDateString()}</td>
        <td class="${confidenceClass}">${Math.round(item.confidence)}%</td>
        <td class="positive-sentiment">${item.sentiment_yes}</td>
        <td class="negative-sentiment">${item.sentiment_no}</td>
        <td class="unclear-sentiment">${item.sentiment_unclear}</td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = tableHTML;
  console.log(`Sentiment table populated with ${sortedData.slice(0, 10).length} rows`);
}

// Analyze new topic function
async function analyzeTopic() {
  const topicInput = document.getElementById('topicInput');
  const topic = topicInput.value.trim();

  if (!topic) {
    alert('Please enter a topic to analyze');
    return;
  }

  console.log(`🔍 Analyzing sentiment for topic: ${topic}`);

  // Show loading state
  const analyzeBtn = document.querySelector('button[onclick="analyzeTopic()"]');
  const originalText = analyzeBtn.textContent;
  analyzeBtn.textContent = 'Analyzing...';
  analyzeBtn.disabled = true;

  try {
    // Call the Python sentiment analysis API
    const response = await fetch('/api/analyze-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic: topic })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert(`✅ Analysis complete! ${result.message}\nResults: ${result.data.sentiment_yes} positive, ${result.data.sentiment_no} negative, ${result.data.sentiment_unclear} unclear\nConfidence: ${result.data.confidence}%`);

      // Refresh the dashboard to show new data
      await refreshSentimentData();
    } else {
      alert(`❌ Analysis failed: ${result.error || result.message}`);
    }

  } catch (error) {
    console.error('❌ Error calling sentiment analysis:', error);
    alert('❌ Failed to analyze sentiment. Make sure the sentiment server is running.');
  } finally {
    // Restore button state
    analyzeBtn.textContent = originalText;
    analyzeBtn.disabled = false;

    // Clear the input
    topicInput.value = '';
  }
}

// Refresh sentiment data
async function refreshSentimentData() {
  console.log('🔄 Refreshing sentiment data...');

  try {
    const data = await fetchSentimentData();
    sentimentData = data;
    createSentimentDashboard(data);
    createSentimentTable(data);
    console.log('✅ Sentiment data refreshed');
  } catch (error) {
    console.error('❌ Error refreshing sentiment data:', error);
  }
}

// Quick analyze function for topic chips
function quickAnalyze(topic) {
  document.getElementById('topicInput').value = topic;
  analyzeTopic();
}

// Make function globally available
window.quickAnalyze = quickAnalyze;

// Analyze sentiment using Reddit data
async function analyzeSentiment() {
  const topicInput = document.getElementById('sentimentTopic');
  const topic = topicInput.value.trim();

  if (!topic) {
    alert('Please enter a topic to analyze');
    return;
  }

  // Show loading state
  const results = document.getElementById('sentimentResults');
  results.innerHTML = '<div class="loading">🔍 Fetching Reddit data and analyzing sentiment...</div>';

  try {
    console.log(`🔍 Analyzing sentiment for topic: ${topic}`);
    console.log('📡 Connecting to Reddit API via sentiment server...');

    // Check if sentiment server is running
    const healthResponse = await fetch('http://0.0.0.0:5001/api/health');
    if (!healthResponse.ok) {
      throw new Error('Sentiment analysis server is not running. Please start the "Sentiment Analysis Server" workflow.');
    }

    const response = await fetch('http://0.0.0.0:5001/api/analyze-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic,
        limit: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Reddit sentiment analysis completed:', result);
      console.log(`📊 Analyzed ${result.total_comments} Reddit comments`);

      // Display results
      displaySentimentResults(result.data);

      // Refresh dashboard with new data
      await loadSentimentData();
    } else {
      throw new Error(result.message || 'Reddit analysis failed');
    }

  } catch (error) {
    console.error('❌ Error analyzing Reddit sentiment:', error);
    results.innerHTML = `
      <div class="error">
        <h3>Reddit Connection Error</h3>
        <p>${error.message}</p>
        <small>
          <strong>To fix this:</strong><br>
          1. Start the "Sentiment Analysis Server" workflow<br>
          2. Ensure Reddit API credentials are configured<br>
          3. Check that ports 5001 is accessible
        </small>
      </div>
    `;
  }
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