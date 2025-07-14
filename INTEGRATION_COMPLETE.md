# WaveSight Dashboard - Real-Time Trend Intelligence Platform

WaveSight is a comprehensive social intelligence platform that tracks viral content and predicts trends across YouTube, Reddit, and TikTok using real-time data collection and AI analytics.

## 🌊 Features

### WAVESITE Timeline
- **Real-time trend monitoring** with 30-second intervals
- **Cross-platform migration tracking** between Reddit ↔ YouTube ↔ TikTok
- **Viral prediction engine** with 70%+ accuracy target
- **Confidence scoring system** (0-100% with 80% alert threshold)
- **Engagement velocity tracking** and visualization
- **Animated migration flows** with flow particles
- **Live metrics dashboard** with platform indicators

### Dashboard Capabilities
- **Multi-platform search** across YouTube, TikTok, and cross-platform scoring
- **Advanced filtering** by categories, date ranges, and engagement metrics
- **Real-time data visualization** with Canvas-based charts
- **Trend categorization** with AI-powered classification
- **Alert system** for viral predictions and engagement spikes
- **Export functionality** for data analysis

## 🚀 Quick Start

### Prerequisites
- Node.js (v14.0.0 or higher)
- Python 3 (for web server)

### 1. Start the Servers
```bash
# Make startup script executable
chmod +x start-servers.sh

# Start both API and web servers
./start-servers.sh
```

This will start:
- **YouTube API Server** on `http://localhost:5003`
- **Web Dashboard** on `http://localhost:8080`

### 2. Access the Dashboard
Open your browser and navigate to:
```
http://localhost:8080
```

## 📊 API Integration

### Current Status
The system is currently running with **mock data** to demonstrate functionality. To enable real YouTube data:

### Configure YouTube API (Optional)
1. Get a YouTube Data API v3 key from [Google Cloud Console](https://console.cloud.google.com/)
2. Set environment variable:
   ```bash
   export YOUTUBE_API_KEY=your_api_key_here
   ```
3. Restart the servers

### Configure Supabase Database (Optional)
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Set environment variables:
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Restart the servers

## 🎯 API Endpoints

### Health Check
```bash
curl http://localhost:5003/api/health
```

### Get Trending Data
```bash
curl http://localhost:5003/api/youtube-trending?maxResults=50
```

### Get Configuration
```bash
curl http://localhost:5003/api/config
```

## 🔧 Architecture

### Frontend Stack
- **HTML5** with semantic structure
- **CSS3** with modern animations and gradients
- **Vanilla JavaScript** with Canvas API charts
- **Real-time updates** via fetch API
- **Responsive design** for all devices

### Backend Services
- **Node.js Express server** (Port 5003) - YouTube API integration
- **Python HTTP server** (Port 8080) - Static file serving
- **Supabase PostgreSQL** - Database storage (optional)
- **YouTube Data API v3** - Trending data source (optional)

### Data Flow
```
YouTube API → Node.js Server → Frontend Dashboard → Canvas Timeline
                     ↓
              Supabase Database (optional)
```

## 🌊 WAVESITE Timeline Features

The WaveScope Timeline implements professional-grade trend monitoring:

### Trend Categories
- **Emerging Trends**: New trends with confidence >80%
- **Viral Content**: Predictions with >70% accuracy
- **Cross-Platform Migration**: Content moving between platforms
- **Declining Trends**: Trends losing momentum

### Real-Time Metrics
- **Confidence Scores**: 0-100% accuracy indicators
- **Viral Predictions**: Likelihood of going viral
- **Engagement Velocity**: Rate of audience interaction
- **Platform Indicators**: Source platform tracking

### Visual Features
- **Animated flow particles** for migration tracking
- **Pulsing alert indicators** for high-confidence trends
- **Color-coded confidence scoring** with gradient effects
- **Real-time update timestamps** and live indicators

## 📱 Usage Guide

### Search & Filtering
1. **Quick Search Tags**: Click trending topics like AI, Crypto, Gaming
2. **Advanced Search**: Use the search bar for custom queries
3. **Date Range Filter**: Set start and end dates for historical data
4. **Category Filter**: Filter by specific trend categories
5. **Platform Toggle**: Enable/disable YouTube, TikTok data sources

### Timeline Interaction
1. **Time Period Controls**: Switch between 1M, 3M, 6M, 1Y, 5Y, MAX views
2. **Live Updates**: Automatic refresh every 30 seconds
3. **Hover Tooltips**: Get detailed metrics on data points
4. **Migration Tracking**: See content flow between platforms

### Advanced Features
1. **Track Specific Trends**: Monitor individual trending topics
2. **Export Data**: Download trend data for analysis
3. **Auto-Refresh**: Toggle automatic data updates
4. **Bulk Data Fetch**: Get large datasets for research

## 🔍 Testing

Run the integration test to verify everything is working:

```bash
cd SERVER
node test-integration.js
```

Expected output:
```
🧪 Testing WaveSight Dashboard Integration...
✅ API Health: healthy
✅ Trending Data Retrieved
✅ Web Server: Running
🎉 Integration Test Complete!
```

## 🛠️ Development

### File Structure
```
WaveSight/
├── SCRIPTS/
│   ├── script.js          # Main dashboard functionality
│   └── config.js          # Configuration settings
├── SERVER/
│   ├── youtube-api.js     # YouTube API integration
│   ├── wave_score.py      # Wave score calculation
│   └── youtube_alert_system.py  # Alert system
├── index.html             # Main dashboard page
├── style.css              # Dashboard styling
├── start-servers.sh       # Server startup script
└── README.md              # This file
```

### Key Components
- **WaveSightDashboard**: Main dashboard class
- **WaveScopeChart**: WAVESITE timeline implementation
- **YouTube API Server**: Real-time data fetching
- **Alert System**: Viral prediction monitoring

## 🚨 Troubleshooting

### Common Issues

**Timeline not showing data:**
- Check if API server is running on port 5003
- Verify browser console for any JavaScript errors
- Ensure CORS is properly configured

**API connection failed:**
- Confirm YouTube API server is running: `curl http://localhost:5003/api/health`
- Check server logs: `tail -f SERVER/youtube-api.log`
- Restart servers: `./start-servers.sh`

**No trending data:**
- System uses mock data by default (works without API keys)
- Configure YOUTUBE_API_KEY for real data
- Check API quota limits if using real YouTube API

### Performance Tips
- Close browser tabs consuming resources
- Use smaller maxResults values for faster loading
- Enable browser caching for better performance

## 🔗 Links

- **Dashboard**: http://localhost:8080
- **API Health**: http://localhost:5003/api/health
- **Trending Data**: http://localhost:5003/api/youtube-trending
- **YouTube Data API**: https://developers.google.com/youtube/v3
- **Supabase**: https://supabase.com

## 📝 Logs

Monitor server activity:
```bash
# YouTube API Server logs
tail -f SERVER/youtube-api.log

# Web Server logs  
tail -f web-server.log
```

## ⏹️ Stopping Servers

```bash
# Stop all WaveSight servers
pkill -f "python3 -m http.server" && pkill -f "node.*youtube-api"
```

---

**🎉 You're ready to explore viral trends with WaveSight!**

Open http://localhost:8080 in your browser and watch real-time trend intelligence in action.