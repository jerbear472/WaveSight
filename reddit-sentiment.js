// Reddit Sentiment Dashboard - Advanced Analytics System
// Real-time Reddit community sentiment analysis and trend monitoring

class RedditSentimentDashboard {
  constructor() {
    // Configuration
    this.config = {
      api: {
        baseUrl: '/api',
        redditEndpoint: '/reddit-sentiment',
        timeout: 30000
      },
      chart: {
        colors: {
          positive: '#10b981',
          negative: '#ef4444', 
          neutral: '#9ca3af',
          primary: '#5ee3ff',
          secondary: '#8b5cf6'
        }
      },
      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        enabled: true
      }
    };

    // State management
    this.state = {
      currentData: null,
      selectedSubreddit: 'all',
      selectedTimeRange: '24h',
      watchlist: JSON.parse(localStorage.getItem('reddit-watchlist') || '[]'),
      isLoading: false,
      lastUpdate: null
    };

    // Mock data for demo mode
    this.mockData = this.generateMockRedditData();
    
    // Initialize dashboard
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Reddit Sentiment Dashboard...');
    
    try {
      // Load initial data
      await this.loadRedditData();
      
      // Initialize UI components
      this.initializeTopLevelMetrics();
      this.initializeSentimentChart();
      this.initializeTopicTiles();
      this.initializeHeatmap();
      this.initializeWatchlist();
      
      // Set up real-time updates
      this.startRealTimeUpdates();
      
      console.log('✅ Reddit Sentiment Dashboard initialized successfully');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      this.showErrorState();
    }
  }

  // Generate comprehensive mock Reddit data
  generateMockRedditData() {
    const subreddits = [
      'technology', 'gaming', 'cryptocurrency', 'stocks', 'politics', 
      'worldnews', 'genz', 'fashion', 'programming', 'investing'
    ];
    
    const topics = [
      'AI Revolution in Programming',
      'Tesla Stock Prediction 2025',
      'Gaming Industry Layoffs',
      'Climate Change Policy',
      'Cryptocurrency Regulations',
      'Remote Work Future',
      'Gen Z Fashion Trends',
      'Tech Startup Funding',
      'Electric Vehicle Adoption',
      'Social Media Privacy'
    ];

    const posts = [];
    const comments = [];
    
    for (let i = 0; i < 50; i++) {
      const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const sentimentScore = (Math.random() * 2 - 1); // -1 to 1
      const engagement = Math.floor(Math.random() * 1000) + 50;
      const upvotes = Math.floor(Math.random() * 5000) + 100;
      
      const post = {
        id: `post_${i}`,
        title: topic,
        subreddit: subreddit,
        score: upvotes,
        num_comments: engagement,
        created_utc: Date.now() - (Math.random() * 86400000), // Last 24 hours
        sentiment_score: sentimentScore,
        sentiment_label: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
        engagement_rate: engagement / upvotes,
        momentum: Math.random() > 0.7 ? 'rising' : Math.random() > 0.4 ? 'stable' : 'cooling'
      };
      
      posts.push(post);
      
      // Generate comments for this post
      const numComments = Math.floor(Math.random() * 20) + 5;
      for (let j = 0; j < numComments; j++) {
        comments.push({
          id: `comment_${i}_${j}`,
          post_id: post.id,
          body: this.generateMockComment(topic),
          score: Math.floor(Math.random() * 200) - 50,
          sentiment_score: (Math.random() * 2 - 1),
          emotion_tags: this.generateEmotionTags(),
          created_utc: post.created_utc + (j * 3600000) // Spread over hours
        });
      }
    }

    return {
      posts: posts,
      comments: comments,
      subreddits: this.generateSubredditStats(posts),
      timeSeriesData: this.generateTimeSeriesData(),
      lastUpdate: Date.now()
    };
  }

  generateMockComment(topic) {
    const templates = [
      `I think ${topic.toLowerCase()} is really important for our future`,
      `Not sure about ${topic.toLowerCase()}, seems overhyped to me`,
      `${topic} could be a game changer if implemented correctly`,
      `I'm skeptical about ${topic.toLowerCase()} working as expected`,
      `Excited to see how ${topic.toLowerCase()} develops over time`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateEmotionTags() {
    const allTags = ['🧠 Thoughtful', '💥 Controversial', '😂 Funny', '😔 Concerned', '🚀 Excited', '🤔 Skeptical'];
    const numTags = Math.floor(Math.random() * 3) + 1;
    return allTags.sort(() => 0.5 - Math.random()).slice(0, numTags);
  }

  generateSubredditStats(posts) {
    const stats = {};
    posts.forEach(post => {
      if (!stats[post.subreddit]) {
        stats[post.subreddit] = {
          name: post.subreddit,
          post_count: 0,
          avg_sentiment: 0,
          total_engagement: 0,
          trending_topics: []
        };
      }
      stats[post.subreddit].post_count++;
      stats[post.subreddit].avg_sentiment += post.sentiment_score;
      stats[post.subreddit].total_engagement += post.num_comments;
    });

    // Calculate averages
    Object.keys(stats).forEach(subreddit => {
      stats[subreddit].avg_sentiment /= stats[subreddit].post_count;
      stats[subreddit].avg_sentiment = Math.round(stats[subreddit].avg_sentiment * 100) / 100;
    });

    return stats;
  }

  generateTimeSeriesData() {
    const data = [];
    const topics = ['AI', 'Crypto', 'Gaming', 'Politics', 'Climate'];
    
    for (let i = 0; i < 24; i++) { // Last 24 hours
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i));
      
      const dataPoint = {
        time: hour.toISOString(),
        hour: hour.getHours()
      };
      
      topics.forEach(topic => {
        dataPoint[topic] = Math.random() * 100; // Sentiment score 0-100
      });
      
      data.push(dataPoint);
    }
    
    return data;
  }

  async loadRedditData() {
    this.state.isLoading = true;
    
    try {
      // Try to fetch real data from API
      const response = await fetch(`${this.config.api.baseUrl}${this.config.api.redditEndpoint}`, {
        timeout: this.config.api.timeout
      });
      
      if (response.ok) {
        this.state.currentData = await response.json();
        console.log('✅ Real Reddit data loaded');
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.warn('⚠️ Using mock data for Reddit sentiment analysis');
      this.state.currentData = this.mockData;
    }
    
    this.state.isLoading = false;
    this.state.lastUpdate = Date.now();
  }

  // Initialize top-level metrics summary panel
  initializeTopLevelMetrics() {
    const data = this.state.currentData;
    if (!data) return;

    // Calculate metrics
    const trendingSubreddits = Object.keys(data.subreddits).length;
    const negativeSurge = data.posts.filter(p => p.sentiment_label === 'negative' && p.momentum === 'rising').length;
    const highEngagement = data.posts.filter(p => p.num_comments > 500).length;
    const positiveMomentum = data.posts.filter(p => p.sentiment_label === 'positive' && p.momentum === 'rising').length;

    // Update UI
    document.getElementById('trendingSubreddits').textContent = trendingSubreddits;
    document.getElementById('negativeSurge').textContent = negativeSurge;
    document.getElementById('highEngagement').textContent = highEngagement;
    document.getElementById('positiveMomentum').textContent = positiveMomentum;

    console.log('📊 Top-level metrics initialized');
  }

  // Initialize time-series sentiment chart
  initializeSentimentChart() {
    const container = document.getElementById('sentimentTimeChart');
    if (!container || !this.state.currentData) return;

    const data = this.state.currentData.timeSeriesData;
    
    // Create chart using Recharts
    const chartElement = React.createElement(Recharts.ResponsiveContainer, {
      width: '100%',
      height: 400
    }, 
      React.createElement(Recharts.LineChart, {
        data: data,
        margin: { top: 20, right: 30, left: 20, bottom: 5 }
      }, [
        React.createElement(Recharts.CartesianGrid, { 
          strokeDasharray: '3 3', 
          stroke: '#2e2e45' 
        }),
        React.createElement(Recharts.XAxis, { 
          dataKey: 'hour',
          stroke: '#9ca3af'
        }),
        React.createElement(Recharts.YAxis, { 
          stroke: '#9ca3af'
        }),
        React.createElement(Recharts.Tooltip, {
          contentStyle: {
            backgroundColor: '#1a1a2e',
            border: '1px solid #5ee3ff',
            borderRadius: '8px',
            color: '#f1f1f1'
          }
        }),
        React.createElement(Recharts.Legend),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'AI',
          stroke: '#5ee3ff',
          strokeWidth: 2,
          dot: { fill: '#5ee3ff', strokeWidth: 2, r: 4 }
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'Crypto',
          stroke: '#f59e0b',
          strokeWidth: 2,
          dot: { fill: '#f59e0b', strokeWidth: 2, r: 4 }
        }),
        React.createElement(Recharts.Line, {
          type: 'monotone',
          dataKey: 'Gaming',
          stroke: '#8b5cf6',
          strokeWidth: 2,
          dot: { fill: '#8b5cf6', strokeWidth: 2, r: 4 }
        })
      ])
    );

    ReactDOM.render(chartElement, container);
    console.log('📈 Sentiment time-series chart initialized');
  }

  // Initialize live Reddit topic tiles
  initializeTopicTiles() {
    const container = document.getElementById('redditTopicTiles');
    if (!container || !this.state.currentData) return;

    const topPosts = this.state.currentData.posts
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    container.innerHTML = topPosts.map(post => this.createTopicTile(post)).join('');
    console.log('💬 Topic tiles initialized');
  }

  createTopicTile(post) {
    const sentimentColor = this.getSentimentColor(post.sentiment_score);
    const sentimentPercentage = Math.round(((post.sentiment_score + 1) / 2) * 100);
    const momentumClass = `momentum-${post.momentum}`;
    
    return `
      <div class="reddit-topic-tile" onclick="redditDashboard.showCommentAnalysis('${post.id}')">
        <div class="momentum-badge ${momentumClass}">${post.momentum}</div>
        
        <div class="topic-header">
          <div class="subreddit-icon">r/</div>
          <div>
            <div class="topic-title">${post.title}</div>
            <div class="subreddit-name">r/${post.subreddit}</div>
          </div>
        </div>
        
        <div class="sentiment-gauge">
          <div class="sentiment-meter">
            <div class="sentiment-fill" style="width: ${sentimentPercentage}%; background: ${sentimentColor};"></div>
          </div>
          <div class="sentiment-score" style="color: ${sentimentColor};">${sentimentPercentage}</div>
        </div>
        
        <div class="engagement-stats">
          <span>💬 ${post.num_comments} comments</span>
          <span>⬆️ ${post.score} upvotes</span>
          <span>⚡ ${Math.round(post.engagement_rate * 100)}% engagement</span>
        </div>
      </div>
    `;
  }

  getSentimentColor(score) {
    if (score > 0.2) return '#10b981'; // Positive - green
    if (score < -0.2) return '#ef4444'; // Negative - red
    return '#9ca3af'; // Neutral - gray
  }

  // Initialize subreddit breakdown heatmap
  initializeHeatmap() {
    const container = document.getElementById('sentimentHeatmap');
    if (!container || !this.state.currentData) return;

    const subreddits = Object.keys(this.state.currentData.subreddits).slice(0, 8);
    const topics = ['AI', 'Crypto', 'Gaming', 'Politics', 'Climate'];
    
    let heatmapHTML = '<div class="heatmap-cell heatmap-header">Subreddit</div>';
    topics.forEach(topic => {
      heatmapHTML += `<div class="heatmap-cell heatmap-header">${topic}</div>`;
    });

    subreddits.forEach(subreddit => {
      heatmapHTML += `<div class="heatmap-cell heatmap-subreddit">r/${subreddit}</div>`;
      topics.forEach(topic => {
        const sentiment = (Math.random() * 2 - 1); // Mock sentiment
        const intensity = Math.abs(sentiment);
        const color = sentiment > 0 ? `rgba(16, 185, 129, ${intensity})` : `rgba(239, 68, 68, ${intensity})`;
        heatmapHTML += `<div class="heatmap-cell" style="background: ${color};" title="Sentiment: ${Math.round(sentiment * 100)}">${Math.round(sentiment * 100)}</div>`;
      });
    });

    container.innerHTML = heatmapHTML;
    console.log('🌐 Sentiment heatmap initialized');
  }

  // Show detailed comment analysis
  showCommentAnalysis(postId) {
    const container = document.getElementById('commentDrillDown');
    if (!container) return;

    const post = this.state.currentData.posts.find(p => p.id === postId);
    const comments = this.state.currentData.comments
      .filter(c => c.post_id === postId)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const analysisHTML = `
      <div style="margin-bottom: 2rem;">
        <h3 style="color: #5ee3ff; margin-bottom: 1rem;">📝 "${post.title}" Analysis</h3>
        <div style="color: #9ca3af;">r/${post.subreddit} • ${comments.length} top comments analyzed</div>
      </div>
      
      ${comments.map(comment => `
        <div class="comment-item">
          <div class="comment-header">
            <div class="comment-score">⬆️ ${comment.score}</div>
            <div style="color: ${this.getSentimentColor(comment.sentiment_score)};">
              Sentiment: ${Math.round(comment.sentiment_score * 100)}
            </div>
          </div>
          <div class="comment-text">${comment.body}</div>
          <div class="emotion-tags">
            ${comment.emotion_tags.map(tag => `<span class="emotion-tag">${tag}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    `;

    container.innerHTML = analysisHTML;
    console.log(`🔎 Comment analysis loaded for post: ${postId}`);
  }

  // Initialize watchlist functionality
  initializeWatchlist() {
    this.renderWatchlist();
    console.log('👁️ Watchlist initialized');
  }

  renderWatchlist() {
    const container = document.getElementById('watchlistItems');
    if (!container) return;

    if (this.state.watchlist.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 2rem;">No items in watchlist</div>';
      return;
    }

    container.innerHTML = this.state.watchlist.map(item => `
      <div class="watchlist-item">
        <div>
          <div style="color: #f1f1f1; font-weight: 600;">${item.keyword}</div>
          <div style="color: #9ca3af; font-size: 0.8rem;">Added ${new Date(item.added).toLocaleDateString()}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="alert-indicator ${item.status}"></div>
          <button onclick="redditDashboard.removeFromWatchlist('${item.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer;">×</button>
        </div>
      </div>
    `).join('');
  }

  // Add item to watchlist
  addToWatchlist() {
    const input = document.getElementById('watchlistInput');
    if (!input || !input.value.trim()) return;

    const newItem = {
      id: Date.now().toString(),
      keyword: input.value.trim(),
      added: Date.now(),
      status: 'normal'
    };

    this.state.watchlist.push(newItem);
    localStorage.setItem('reddit-watchlist', JSON.stringify(this.state.watchlist));
    
    input.value = '';
    this.renderWatchlist();
    
    console.log(`📌 Added "${newItem.keyword}" to watchlist`);
  }

  // Remove item from watchlist
  removeFromWatchlist(id) {
    this.state.watchlist = this.state.watchlist.filter(item => item.id !== id);
    localStorage.setItem('reddit-watchlist', JSON.stringify(this.state.watchlist));
    this.renderWatchlist();
  }

  // Start real-time updates
  startRealTimeUpdates() {
    setInterval(() => {
      this.refreshRedditData();
    }, 30000); // Update every 30 seconds
  }

  // Refresh Reddit data
  async refreshRedditData() {
    console.log('🔄 Refreshing Reddit data...');
    await this.loadRedditData();
    this.initializeTopLevelMetrics();
    this.initializeSentimentChart();
    this.initializeTopicTiles();
    this.initializeHeatmap();
  }

  // Show error state
  showErrorState() {
    const container = document.querySelector('.container');
    if (container) {
      container.innerHTML += `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ef4444; color: white; padding: 2rem; border-radius: 12px; z-index: 1000;">
          <h3>⚠️ Dashboard Error</h3>
          <p>Unable to load Reddit sentiment data. Please refresh the page.</p>
        </div>
      `;
    }
  }
}

// Global functions for HTML event handlers
window.analyzeRedditTopic = function() {
  const input = document.getElementById('redditTopicInput');
  if (!input || !input.value.trim()) return;
  
  console.log(`🔍 Analyzing topic: ${input.value}`);
  redditDashboard.showNotification(`Analyzing "${input.value}"...`, 'info');
  // Implement topic analysis logic
};

window.refreshRedditData = function() {
  redditDashboard.refreshRedditData();
};

window.toggleWatchlist = function() {
  const panel = document.getElementById('watchlistPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
};

window.addToWatchlist = function() {
  redditDashboard.addToWatchlist();
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.redditDashboard = new RedditSentimentDashboard();
});