
# WAVESIGHT Dashboard - Complete Code Export

## 📦 Project Overview
WAVESIGHT is a comprehensive trending analytics platform that combines YouTube data collection, sentiment analysis, and real-time visualization in a sleek web dashboard.

## 🏗️ Architecture Stack

### Frontend
- **HTML5**: Semantic structure with responsive design
- **CSS3**: Modern styling with gradients, animations, and responsive layouts
- **Vanilla JavaScript**: Canvas-based chart rendering, real-time data fetching
- **Canvas API**: Custom chart visualization with interactive click detection

### Backend Services
- **Node.js + Express**: YouTube API integration server (Port 5000)
- **Python Flask**: Sentiment analysis server (Port 5001)
- **Static Web Server**: Frontend hosting (Port 80)

### Database & APIs
- **Supabase**: PostgreSQL database with real-time capabilities
- **YouTube Data API v3**: Trending video data collection
- **Reddit API**: Social sentiment analysis
- **OpenAI API**: Advanced text classification (optional)

### Deployment Platform
- **Replit**: Full-stack hosting with integrated workflows
- **Static deployment**: Frontend served via static-web-server
- **Multi-port configuration**: API servers on separate ports

## 📁 File Structure
```
wavesight-dashboard/
├── Frontend/
│   ├── index.html                 # Main dashboard
│   ├── sentiment-dashboard.html   # Sentiment analysis page
│   ├── script.js                  # Main dashboard logic
│   ├── sentiment-script.js        # Sentiment dashboard logic
│   ├── style.css                  # Complete styling
│   └── logo2.png                  # Brand assets
├── Backend/
│   ├── youtubeToSupabase.js      # YouTube API server
│   ├── sentiment_server.py       # Sentiment analysis server
│   ├── package.json              # Node.js dependencies
│   └── reddit_oauth.py           # Reddit API authentication
├── Database/
│   └── supabase_schema.sql       # Database schema
├── Configuration/
│   ├── .replit                   # Replit deployment config
│   └── .config/static-web-server.toml
├── Documentation/
│   ├── README.md                 # Project overview
│   ├── SETUP.md                  # Setup instructions
│   └── WAVESIGHT-CODE-EXPORT.md  # This file
└── Utilities/
    ├── main.js                   # Initial test script
    └── test-secrets.js           # Environment validation
```

## 🚀 Key Features

### Data Collection Engine
- **Multi-source aggregation**: YouTube, Reddit, social platforms
- **Real-time processing**: Live data updates every few seconds
- **Historical tracking**: 3+ years of trend data simulation
- **Smart categorization**: AI-powered content classification
- **Bulk data operations**: Efficient large-scale data collection

### Visualization System
- **Custom Canvas charts**: Hand-built interactive trend lines
- **Real-time updates**: Dynamic data refresh without page reload
- **Interactive elements**: Click detection on chart points
- **Responsive design**: Mobile-first approach
- **Date filtering**: Time-range based analysis

### Sentiment Analysis
- **Multi-platform sentiment**: Reddit, Twitter, social media
- **Predictive modeling**: Future trend forecasting
- **Confidence scoring**: Statistical reliability metrics
- **Cultural predictions**: Entertainment, tech, crypto trends

### Search & Filtering
- **Real-time search**: Instant trend filtering
- **Category-based views**: Technology, entertainment, sports, etc.
- **Date range selection**: Historical trend analysis
- **Default trend display**: Automatic 6-month view on load

## 🛠️ Technology Implementation

### Frontend Architecture
```javascript
// Main data flow
fetchYouTubeDataFromSupabase() → processDataForChart() → createChart()
↓
Interactive Canvas Chart ← Click Detection ← User Interaction
```

### Backend Services
```javascript
// YouTube API Server (Port 5000)
Express.js Router
├── /api/fetch-youtube      # Fresh data collection
├── /api/youtube-data       # Cached data retrieval
├── /api/bulk-fetch         # Mass data operations
└── /api/health             # Service status

// Sentiment Server (Port 5001)
Python Flask
├── /api/analyze-sentiment  # Text sentiment analysis
├── /api/reddit-trends      # Reddit data collection
└── /api/forecast           # Predictive modeling
```

### Database Schema
```sql
-- YouTube trends table
youtube_trends (
  id, video_id, title, description, published_at,
  channel_id, channel_title, view_count, like_count,
  comment_count, trend_category, trend_score
)

-- Sentiment forecasts table
sentiment_forecasts (
  id, topic, platform, sentiment_yes, sentiment_no,
  sentiment_unclear, confidence, created_at
)

-- User management
users (
  id, replit_user_id, replit_username, display_name,
  created_at, last_login, login_count
)
```

## 🔧 Environment Configuration

### Required Secrets (Replit)
```env
YOUTUBE_API_KEY=your_youtube_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
REDDIT_CLIENT_ID=your_reddit_client_id (optional)
REDDIT_CLIENT_SECRET=your_reddit_client_secret (optional)
OPENAI_API_KEY=your_openai_api_key (optional)
```

### Workflow Configuration
- **Run Button**: YouTube API Server (Primary service)
- **Secondary Workflows**: 
  - Sentiment Analysis Server
  - Static Web Server
  - Configure Run Command

## 📊 Data Processing Pipeline

### YouTube Data Flow
1. **API Request**: Fetch trending videos by category
2. **Data Enrichment**: Add statistics, categorization, trend scores
3. **Historical Simulation**: Generate realistic timestamp distribution
4. **Database Storage**: Upsert to Supabase with conflict resolution
5. **Frontend Consumption**: Real-time chart updates

### Sentiment Analysis Flow
1. **Reddit Data**: Collect posts/comments from relevant subreddits
2. **Text Processing**: Clean and normalize text content
3. **Sentiment Classification**: Yes/No/Unclear sentiment scoring
4. **Confidence Calculation**: Statistical reliability metrics
5. **Trend Forecasting**: Predictive modeling for future sentiment

## 🎨 UI/UX Design System

### Color Palette
- **Primary**: #5ee3ff (Bright cyan)
- **Secondary**: #8b5cf6 (Purple)
- **Accent**: #ec4899 (Pink)
- **Background**: #0a0a0f (Dark blue)
- **Surface**: #13131f (Darker blue)

### Typography
- **Headers**: Inter, system-ui fallback
- **Body**: -apple-system, BlinkMacSystemFont
- **Monospace**: 'Courier New' for data display

### Interactive Elements
- **Hover Effects**: Smooth transitions, color shifts
- **Loading States**: Animated indicators
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Keyboard navigation, screen reader support

## 🔐 Security Implementation

### Data Protection
- **Environment Variables**: Sensitive keys in Replit Secrets
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Server-side request sanitization
- **Rate Limiting**: API quota management

### Database Security
- **Row Level Security**: Supabase RLS policies
- **Connection Encryption**: SSL/TLS for all database connections
- **User Authentication**: Replit auth integration
- **Data Anonymization**: No PII storage

## 📈 Performance Optimizations

### Frontend Performance
- **Data Caching**: Client-side storage for faster loads
- **Lazy Loading**: Progressive data fetching
- **Canvas Optimization**: Efficient chart rendering
- **Debounced Search**: Reduced API calls during typing

### Backend Performance  
- **Connection Pooling**: Efficient database connections
- **Response Compression**: Reduced payload sizes
- **Error Handling**: Graceful degradation and fallbacks
- **Batch Operations**: Bulk data processing

### Database Performance
- **Proper Indexing**: Optimized query performance
- **Query Limits**: Pagination for large datasets
- **Connection Management**: Efficient resource utilization

## 🚀 Deployment Instructions

### Replit Setup
1. **Clone/Import**: Import all files to new Replit
2. **Configure Secrets**: Add all required environment variables
3. **Run Database Schema**: Execute in Supabase SQL editor
4. **Start Services**: Run YouTube API Server workflow
5. **Optional Services**: Start Sentiment Analysis Server
6. **Access Dashboard**: Open preview URL

### Production Considerations
- **API Rate Limits**: Monitor YouTube API quota usage
- **Database Scaling**: Consider connection limits
- **Error Monitoring**: Implement logging and alerting
- **Backup Strategy**: Regular database backups

## 🔄 Maintenance & Updates

### Regular Tasks
- **Data Cleanup**: Remove old records periodically
- **API Key Rotation**: Update credentials as needed
- **Performance Monitoring**: Track response times and errors
- **Feature Updates**: Add new data sources and visualizations

### Monitoring Endpoints
- **Health Checks**: `/api/health` for service status
- **Data Validation**: Verify data integrity regularly
- **User Analytics**: Track dashboard usage patterns

## 📚 API Documentation

### YouTube API Server (Port 5000)
```javascript
GET /api/youtube-data           // Fetch processed data
GET /api/fetch-youtube?q=term   // Fresh data collection
GET /api/bulk-fetch             // Mass data operations
GET /api/health                 // Service status
```

### Sentiment Analysis Server (Port 5001)
```python
POST /api/analyze-sentiment     // Text sentiment analysis
GET /api/reddit-trends          // Social media trends
POST /api/forecast              // Predictive modeling
GET /api/health                 // Service status
```

## 🎯 Future Enhancement Opportunities

### Feature Expansions
- **Real-time Alerts**: Notification system for trending topics
- **Export Functionality**: Data export to CSV/JSON
- **Advanced Analytics**: Deeper statistical analysis
- **Mobile App**: Native mobile application
- **API Rate Limiting**: Advanced quota management

### Data Source Expansions
- **Twitter/X Integration**: Additional social sentiment
- **TikTok Trends**: Short-form video analytics
- **News Aggregation**: Media sentiment tracking
- **Stock Market Correlation**: Financial trend analysis

### Technical Improvements
- **WebSocket Integration**: Real-time data streaming
- **Advanced Caching**: Redis or similar
- **Microservices**: Service decomposition
- **GraphQL API**: More flexible data queries

---

## 💾 Complete Code Files

All source code files are included in this Replit project and can be exported directly. The system is production-ready with comprehensive error handling, fallback mechanisms, and scalable architecture.

**Total Lines of Code**: ~3,500+ lines across all files
**Supported Platforms**: Web browsers, mobile responsive
**Database**: PostgreSQL via Supabase
**Hosting**: Replit with multi-service architecture

This export represents a complete, functional trending analytics platform ready for deployment and further development.
