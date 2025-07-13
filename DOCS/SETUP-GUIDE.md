# 🌊 WaveSight Complete Setup Guide

This comprehensive guide will help you get WaveSight running locally with all features working.

## 📋 Prerequisites

### Required Software
- **Python 3.8+** - For backend services
- **Node.js 14+** - For JavaScript tooling (optional but recommended)
- **Git** - For version control

### Required Accounts & API Keys
- **Supabase Account** - Database and real-time subscriptions
- **YouTube Data API v3** - For trending video data
- **Reddit API** - For sentiment analysis
- **OpenAI API** (Optional) - Enhanced sentiment analysis

---

## 🚀 Quick Start (5 Minutes)

### 1. Run Setup Script
```bash
python setup.py
```

This will:
- Check dependencies
- Create `.env` file from template
- Install Python packages
- Create necessary directories
- Configure Git

### 2. Configure API Keys
Edit the `.env` file with your credentials:

```bash
# Copy example to .env
cp .env.example .env

# Edit with your credentials
nano .env  # or use your preferred editor
```

### 3. Set Up Database
- Open your Supabase project
- Go to SQL Editor
- Run the contents of `CONFIG/supabase_schema.sql`

### 4. Start Services
```bash
# Terminal 1: Sentiment Analysis Server
python SERVER/sentiment_server.py

# Terminal 2: YouTube Data Collection
node SCRIPTS/youtubeToSupabase.js

# Terminal 3: Local Web Server (optional)
python -m http.server 8080
```

### 5. Open WaveSight
- Open `index.html` in your browser
- Or navigate to `http://localhost:8080`

---

## 📋 Detailed Setup Instructions

### Step 1: Get API Credentials

#### Supabase Setup
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy your URL and `anon` key
5. Run the SQL schema from `CONFIG/supabase_schema.sql`

#### YouTube API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable YouTube Data API v3
4. Create credentials → API key
5. Restrict the key to YouTube Data API v3

#### Reddit API Setup
1. Go to [reddit.com/prefs/apps](https://reddit.com/prefs/apps)
2. Click "Create App"
3. Choose "script" type
4. Copy client ID and secret

#### OpenAI API (Optional)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add billing information if needed

### Step 2: Configure Environment

Create `.env` file with your credentials:

```env
# Required: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Required: YouTube API
YOUTUBE_API_KEY=your-youtube-api-key

# Required: Reddit API
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret

# Optional: OpenAI (for enhanced sentiment analysis)
OPENAI_API_KEY=your-openai-key

# Optional: Additional settings
NODE_ENV=development
DEBUG=true
```

### Step 3: Install Dependencies

#### Python Dependencies
```bash
pip install flask flask-cors praw openai supabase vaderSentiment requests python-dotenv
```

#### Node.js Dependencies (if using Node services)
```bash
npm install dotenv @supabase/supabase-js node-fetch
```

### Step 4: Database Setup

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the entire `CONFIG/supabase_schema.sql` file
4. Run the SQL commands
5. Verify tables were created in Table Editor

### Step 5: Start Services

You need to run multiple services for full functionality:

#### Backend Services
```bash
# Sentiment Analysis & Cultural Compass (Port 5001)
cd SERVER
python sentiment_server.py

# YouTube Data Collection (Optional background service)
cd SCRIPTS
node youtubeToSupabase.js
```

#### Frontend
```bash
# Option 1: Simple HTTP server
python -m http.server 8080

# Option 2: Open files directly
# Open index.html in your browser
```

---

## 🔧 Configuration Options

### Frontend Configuration

The frontend uses `SCRIPTS/config.js` for configuration. You can:

1. **Development Mode**: Set credentials in localStorage
```javascript
// In browser console
WaveSightConfig.setDevelopmentConfig('your-supabase-url', 'your-anon-key');
```

2. **Meta Tags**: Add to HTML head
```html
<meta name="supabase-url" content="your-supabase-url">
<meta name="supabase-key" content="your-anon-key">
```

3. **Configuration Endpoint**: Create `/api/config` endpoint returning:
```json
{
  "supabase": {
    "url": "your-supabase-url",
    "anonKey": "your-anon-key"
  }
}
```

### Server Configuration

Modify settings in `.env`:

```env
# Server ports
SENTIMENT_SERVER_PORT=5001
YOUTUBE_SERVER_PORT=5000

# Rate limiting
YOUTUBE_QUOTA_LIMIT=10000
REDDIT_REQUEST_DELAY=1

# Logging
LOG_LEVEL=info
DEBUG=true
```

---

## 📊 Features & Usage

### 1. Trends Dashboard (`index.html`)
- Real-time YouTube trending data
- Multi-region support (US, GB, CA)
- Category filtering
- Wave Score algorithm
- Interactive charts

### 2. Sentiment Analysis (`sentiment-dashboard.html`)
- Reddit sentiment analysis
- Topic-based predictions
- Cultural momentum tracking
- Confidence scoring

### 3. Cultural Compass (`cultural-compass.html`)
- 2D cultural mapping
- Mainstream vs Underground analysis
- Traditional vs Disruptive trends
- Multi-platform insights

### 4. Alerts System (`alerts-dashboard.html`)
- Custom trend alerts
- Severity levels
- Email/SMS notifications (coming soon)

---

## 🐛 Troubleshooting

### Common Issues

#### "Configuration Required" Error
- **Cause**: Missing Supabase credentials
- **Fix**: Ensure `.env` file has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`

#### "Reddit API connection failed"
- **Cause**: Invalid Reddit credentials
- **Fix**: Check `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` in `.env`

#### "YouTube API quota exceeded"
- **Cause**: Too many API calls
- **Fix**: Wait for quota reset or increase quota limit

#### Database connection errors
- **Cause**: Missing tables or RLS policies
- **Fix**: Re-run `CONFIG/supabase_schema.sql`

#### CORS errors
- **Cause**: Incorrect origins in Supabase
- **Fix**: Add your domain to Supabase Auth settings

### Debug Mode

Enable detailed logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

Check browser console and server logs for detailed error messages.

### Health Check Endpoints

```bash
# Sentiment server health
curl http://localhost:5001/api/health

# Check service status
python -c "import requests; print(requests.get('http://localhost:5001/api/health').json())"
```

---

## 🔐 Security Notes

### Environment Variables
- Never commit `.env` file to Git
- Use different keys for development/production
- Rotate API keys regularly

### Supabase Security
- Enable Row Level Security (RLS)
- Restrict API access to your domain
- Use service role key only on server-side

### API Rate Limits
- YouTube: 10,000 units/day default
- Reddit: 60 requests/minute
- OpenAI: Varies by plan

---

## 📈 Performance Optimization

### Database
- Indexes are created automatically
- Use pagination for large datasets
- Enable connection pooling

### Frontend
- Data is cached for 5 minutes by default
- Charts use Canvas for better performance
- Lazy loading for non-critical features

### Backend
- Services run independently
- Retry logic for API failures
- Graceful error handling

---

## 🔄 Updates & Maintenance

### Updating Dependencies
```bash
# Python
pip install --upgrade -r requirements.txt

# Node.js
npm update
```

### Database Migrations
- Schema changes go in `CONFIG/supabase_schema.sql`
- Always backup before running migrations
- Test in development first

### Monitoring
- Check server logs regularly
- Monitor API quota usage
- Set up alerts for failures

---

## 📞 Support

### Documentation
- `DOCS/README.md` - Project overview
- `DOCS/SETUP.md` - This setup guide
- `DOCS/EXPORT-CHECKLIST.md` - Deployment guide

### Community
- GitHub Issues for bugs
- Discussions for questions
- Wiki for advanced configurations

### Getting Help
1. Check troubleshooting section above
2. Review server logs and browser console
3. Create GitHub issue with:
   - Steps to reproduce
   - Error messages
   - Environment details
   - Configuration (without secrets)

---

## 🎉 You're All Set!

WaveSight should now be running with all features enabled:

- ✅ Real-time trending data
- ✅ Sentiment analysis
- ✅ Cultural compass mapping
- ✅ Custom alerts
- ✅ Multi-platform insights

Visit `http://localhost:8080` to start exploring trends!

---

**Need Help?** Check the troubleshooting section or create an issue on GitHub.

**Want to Contribute?** See `DOCS/CONTRIBUTING.md` for development guidelines.