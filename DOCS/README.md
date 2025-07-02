
# WAVESIGHT Dashboard - Advanced Social Intelligence Platform

## Overview
WAVESIGHT is a comprehensive trend tracking and sentiment analysis platform that transforms social media data into strategic insights. The platform aggregates data from YouTube, Reddit, and other sources to provide real-time trend analysis and sentiment forecasting.

## Features

### 🔥 Trend Tracking
- Real-time YouTube trending data collection
- Multi-category trend analysis (AI, Crypto, Gaming, Tech, etc.)
- Historical data visualization with 3-year timeline
- Interactive filtering and search capabilities
- Automated content categorization

### 📊 Sentiment Analysis
- Reddit comment sentiment analysis using OpenAI GPT
- Real-time confidence scoring
- Topic-based sentiment forecasting
- Historical sentiment tracking
- Multi-platform data aggregation

### 🎨 Interactive Dashboard
- Responsive web design
- Real-time animated charts using Canvas API
- Dynamic data filtering
- Date range selection
- Mobile-optimized interface

## Technology Stack

### Frontend
- **HTML5/CSS3**: Modern responsive design
- **JavaScript**: Vanilla JS with Canvas API for charts
- **Supabase Client**: Real-time database integration

### Backend
- **Node.js + Express**: YouTube API server
- **Python + Flask**: Sentiment analysis server
- **Supabase**: PostgreSQL database with real-time subscriptions

### APIs & Services
- **YouTube Data API v3**: Trending video data
- **Reddit API (PRAW)**: Comment sentiment analysis
- **OpenAI GPT-3.5**: Natural language processing
- **Supabase**: Database and real-time features

## Quick Start

### 1. Environment Setup
Set up the following secrets in your Replit environment:

```bash
# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# OpenAI (optional)
OPENAI_API_KEY=your_openai_api_key
```

### 2. Database Setup
Run the SQL schema in your Supabase SQL editor:
```sql
-- See supabase_schema.sql for complete setup
```

### 3. Start Services
1. Run **YouTube API Server** workflow (port 5000)
2. Run **Sentiment Analysis Server** workflow (port 5001)
3. Access your dashboard at the Replit URL

### 4. Fetch Initial Data
Click "Fetch Data" button or use the API endpoint:
```bash
curl "http://your-repl-url:5000/api/fetch-youtube?q=trending&maxResults=100"
```

## API Documentation

### YouTube API Endpoints

#### Fetch YouTube Data
```http
GET /api/fetch-youtube?q={query}&maxResults={number}
```
Fetches trending videos and saves to Supabase.

#### Get Stored Data
```http
GET /api/youtube-data
```
Returns stored YouTube trends from Supabase.

### Sentiment Analysis Endpoints

#### Analyze Sentiment
```http
POST /api/analyze-sentiment
Content-Type: application/json

{
  "topic": "AI trends",
  "limit": 50
}
```

#### Health Check
```http
GET /api/health
```

## File Structure

```
wavesight-dashboard/
├── index.html              # Main dashboard
├── sentiment-dashboard.html # Sentiment analysis page
├── script.js               # Main dashboard logic
├── sentiment-script.js     # Sentiment dashboard logic
├── style.css              # Responsive styling
├── youtubeToSupabase.js   # YouTube API server
├── sentiment_server.py    # Sentiment analysis server
├── package.json           # Node.js dependencies
├── supabase_schema.sql    # Database schema
└── .replit               # Replit configuration
```

## Data Flow

1. **Data Collection**: YouTube API fetches trending videos
2. **Processing**: Videos are categorized and processed
3. **Storage**: Data saved to Supabase with proper indexing
4. **Visualization**: Frontend fetches and displays data
5. **Sentiment**: Reddit comments analyzed for sentiment
6. **Real-time**: Dashboard updates automatically

## Customization

### Adding New Categories
Edit the `categories` object in `youtubeToSupabase.js`:
```javascript
const categories = {
  'Your Category': ['keyword1', 'keyword2', 'keyword3']
};
```

### Modifying Chart Appearance
Update the chart styling in `script.js`:
```javascript
const colors = ['#5ee3ff', '#8b5cf6', '#ec4899']; // Add your colors
```

### Changing Data Sources
Add new subreddits in `sentiment_server.py`:
```python
topic_subreddits = {
  'your_topic': ['subreddit1', 'subreddit2']
}
```

## Deployment

The project is optimized for Replit deployment:

1. **Static Frontend**: Served via static-web-server
2. **API Servers**: Run on ports 5000 and 5001
3. **Database**: Connected to Supabase cloud
4. **Secrets**: Managed via Replit environment

## Performance Features

- **Caching**: Client-side data caching for faster loads
- **Pagination**: Efficient data loading with limits
- **Indexing**: Optimized database queries
- **Fallback**: Graceful degradation when APIs are unavailable
- **Error Handling**: Comprehensive error management

## Security

- **Environment Variables**: Sensitive keys stored securely
- **CORS**: Properly configured cross-origin requests
- **RLS**: Row Level Security enabled on Supabase
- **Input Validation**: Server-side request validation

## Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the API documentation
- Review the console logs for debugging
- Ensure all environment variables are set
- Verify Supabase connection and schema

---

**WAVESIGHT Dashboard** - Transforming Data Waves into Strategic Insights
