/**
 * Demo Configuration for GitHub Pages
 * This configuration enables WaveSight to work without backend servers
 * by using mock data and client-side functionality
 */

window.WaveSightConfig = {
  // Demo mode for GitHub Pages
  environment: 'demo',
  demoMode: true,
  
  // API Configuration (disabled for demo)
  api: {
    baseUrl: window.location.origin,
    sentimentServer: null, // Disabled - using mock data
    youtubeServer: null,   // Disabled - using mock data
    timeout: 30000
  },
  
  // Supabase Configuration (disabled for demo)
  supabase: {
    url: null,     // Disabled - using mock data
    anonKey: null  // Disabled - using mock data
  },
  
  // Chart Configuration
  chart: {
    maxTrends: 8,
    animationDuration: 1500,
    colors: [
      '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', 
      '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f472b6'
    ]
  },
  
  // Cache Configuration
  cache: {
    defaultTtl: 300000, // 5 minutes
    trendsDataTtl: 60000, // 1 minute
    sentimentDataTtl: 180000 // 3 minutes
  },
  
  // UI Configuration
  ui: {
    refreshInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 2000,
    animationSpeed: 1500,
    showDemoNotice: true // Show demo banner
  },
  
  // Feature Flags
  features: {
    realTimeUpdates: false, // Disabled for demo
    culturalCompass: true,
    alertSystem: true,
    exportData: true,
    darkMode: true
  },
  
  // Default settings
  defaults: {
    region: 'US',
    category: 'all',
    timeRange: '1_week',
    maxResults: 50
  },
  
  // Demo data configuration
  demo: {
    enableMockData: true,
    showDataSources: true,
    autoRefresh: true,
    refreshInterval: 10000 // 10 seconds for demo
  }
};

// Mock Data Generators for Demo
window.MockDataGenerator = {
  
  // Generate trending YouTube videos
  generateTrendingVideos: function(count = 20) {
    const categories = ['Technology', 'Gaming', 'Entertainment', 'News', 'Music', 'Sports'];
    const regions = ['US', 'GB', 'CA'];
    const titles = [
      'AI Revolution: The Future is Here',
      'Breaking: Major Tech Announcement',
      'Viral TikTok Dance Takes Over',
      'Gaming Championship Finals',
      'Climate Change Documentary',
      'New Music Video Breaks Records',
      'Celebrity Interview Goes Viral',
      'Tech Review: Latest Innovation',
      'Sports Highlight Compilation',
      'Educational Content Trends'
    ];
    
    return Array.from({length: count}, (_, i) => ({
      id: `demo_video_${i}`,
      title: titles[Math.floor(Math.random() * titles.length)] + ` #${i + 1}`,
      channel_title: `Creator ${String.fromCharCode(65 + (i % 26))}`,
      view_count: Math.floor(Math.random() * 5000000) + 100000,
      published_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: categories[Math.floor(Math.random() * categories.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      wave_score: Math.random() * 0.8 + 0.2,
      likes: Math.floor(Math.random() * 100000) + 1000,
      comments: Math.floor(Math.random() * 10000) + 100,
      thumbnail_url: `https://picsum.photos/320/180?random=${i}`
    }));
  },
  
  // Generate sentiment analysis data
  generateSentimentData: function(topic) {
    const basePositive = 60;
    const baseNegative = 25;
    const baseUnclear = 15;
    
    // Topic-based adjustments
    let positive = basePositive;
    let negative = baseNegative;
    let unclear = baseUnclear;
    
    if (topic.toLowerCase().includes('ai')) {
      positive += Math.random() * 20 - 5;
    } else if (topic.toLowerCase().includes('crypto')) {
      negative += Math.random() * 15;
    }
    
    positive = Math.max(1, Math.floor(positive + Math.random() * 20 - 10));
    negative = Math.max(1, Math.floor(negative + Math.random() * 15 - 7));
    unclear = Math.max(1, Math.floor(unclear + Math.random() * 10 - 5));
    
    const total = positive + negative + unclear;
    const confidence = Math.round((positive / total) * 100);
    
    return {
      topic: topic,
      platform: "Reddit (Demo Data)",
      date: new Date().toISOString().split('T')[0],
      sentiment_yes: positive,
      sentiment_no: negative,
      sentiment_unclear: unclear,
      confidence: confidence,
      certainty_score: Math.round(((positive + negative) / total) * 100),
      prediction_outcome: confidence > 65 ? "Likely" : confidence > 45 ? "Uncertain" : "Unlikely",
      cultural_momentum: positive > negative * 1.5 ? "Rising" : negative > positive * 1.5 ? "Declining" : "Stable",
      total_responses: total,
      wave_score: Math.random() * 0.8 + 0.2
    };
  },
  
  // Generate cultural compass data
  generateCulturalCompass: function(topics) {
    return topics.map(topic => {
      const topicLower = topic.toLowerCase();
      
      // Calculate coordinates based on topic
      let x = Math.random() * 1.6 - 0.8; // -0.8 to 0.8
      let y = Math.random() * 1.6 - 0.8;
      
      // Topic-specific positioning
      if (topicLower.includes('ai') || topicLower.includes('tech')) {
        x = Math.random() * 0.6 + 0.1; // More underground/emerging
        y = Math.random() * 0.8 + 0.2; // More disruptive
      } else if (topicLower.includes('crypto')) {
        x = Math.random() * 0.8 + 0.2; // Underground
        y = Math.random() * 0.6 + 0.3; // Disruptive
      } else if (topicLower.includes('climate') || topicLower.includes('remote')) {
        x = Math.random() * 0.6 - 0.5; // More mainstream
        y = Math.random() * 0.5 + 0.1; // Moderately progressive
      }
      
      return {
        topic: topic,
        name: topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        coordinates: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 },
        sentiment_score: Math.random() * 0.6 + 0.2,
        total_posts: Math.floor(Math.random() * 100) + 20,
        total_engagement: Math.floor(Math.random() * 10000) + 1000,
        category: this.categorizeByTopic(topic),
        cultural_velocity: Math.random() * 0.8 + 0.2,
        cultural_momentum: ['Rising', 'Stable', 'Declining'][Math.floor(Math.random() * 3)],
        mainstream_score: Math.random() * 0.8 + 0.1,
        disruption_score: Math.random() * 0.8 + 0.1,
        cultural_impact: ['High Impact', 'Moderate Impact', 'Emerging Impact'][Math.floor(Math.random() * 3)],
        analysis_date: new Date().toISOString(),
        confidence: Math.random() * 0.4 + 0.6
      };
    });
  },
  
  categorizeByTopic: function(topic) {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('ai') || topicLower.includes('tech')) return 'Technology';
    if (topicLower.includes('crypto')) return 'Finance';
    if (topicLower.includes('climate')) return 'Environmental';
    if (topicLower.includes('remote') || topicLower.includes('work')) return 'Professional';
    if (topicLower.includes('music') || topicLower.includes('art')) return 'Creative';
    return 'Cultural';
  }
};

// Demo API Simulation
window.DemoAPI = {
  
  // Simulate sentiment analysis API
  analyzeSentiment: async function(topic) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return {
      success: true,
      data: window.MockDataGenerator.generateSentimentData(topic),
      message: `Demo sentiment analysis for "${topic}"`,
      reddit_connected: false,
      supabase_connected: false
    };
  },
  
  // Simulate cultural compass API
  culturalCompass: async function(topics) {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    return {
      success: true,
      data: window.MockDataGenerator.generateCulturalCompass(topics),
      total_analyzed: topics.length,
      reddit_connected: false,
      message: `Demo cultural analysis for ${topics.length} topics`
    };
  },
  
  // Simulate health check
  healthCheck: async function() {
    return {
      status: "demo",
      reddit_configured: false,
      reddit_working: false,
      openai_configured: false,
      supabase_configured: false,
      services: {
        reddit: "🎭 Demo Mode",
        openai: "🎭 Demo Mode", 
        supabase: "🎭 Demo Mode"
      }
    };
  }
};

// Auto-initialize demo mode
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎭 WaveSight Demo Mode Initialized');
  console.log('📊 Using mock data for GitHub Pages demo');
  
  // Show demo notice
  if (window.WaveSightConfig.ui.showDemoNotice) {
    setTimeout(() => {
      const notice = document.createElement('div');
      notice.innerHTML = `
        <div style="
          position: fixed; top: 0; left: 0; right: 0; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; padding: 12px; text-align: center; z-index: 10000;
          font-family: Arial, sans-serif; font-size: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        ">
          🎭 <strong>Demo Mode</strong> - Using mock data for GitHub Pages demo. 
          <a href="https://github.com/jerbear472/WaveSight/blob/main/LIVE-DEMO-GUIDE.md" 
             style="color: #FFE066; text-decoration: underline;">
            Get live data setup →
          </a>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="float: right; background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
        </div>
      `;
      document.body.appendChild(notice);
    }, 2000);
  }
});