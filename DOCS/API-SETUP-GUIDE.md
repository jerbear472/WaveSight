# 🔑 WaveSight API Keys Setup Guide

Get WaveSight running with live data in 15 minutes!

## 🏃‍♂️ Quick Setup (15 minutes)

### 1. Supabase Setup (5 minutes) - REQUIRED

**What it's for**: Database storage, real-time updates

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose organization and enter:
   - **Name**: `WaveSight`
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest to you
4. Wait 2 minutes for project to provision
5. Go to **Settings** → **API**
6. Copy these values:
   ```
   URL: https://your-project-id.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

7. **Set up database**: 
   - Go to **SQL Editor**
   - Copy contents of `CONFIG/supabase_schema.sql`
   - Paste and click "Run"

### 2. YouTube API Setup (3 minutes) - REQUIRED

**What it's for**: Trending video data collection

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **YouTube Data API v3**:
   - Go to "APIs & Services" → "Library"
   - Search "YouTube Data API v3"
   - Click "Enable"
4. Create API key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the key: `AIzaSyC...`
5. **Restrict the key** (recommended):
   - Click on your key → "API restrictions"
   - Select "YouTube Data API v3"

### 3. Reddit API Setup (2 minutes) - REQUIRED

**What it's for**: Sentiment analysis from Reddit discussions

1. Go to [reddit.com/prefs/apps](https://reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: `WaveSight Bot`
   - **App type**: `script`
   - **Description**: `Sentiment analysis for trends`
   - **About URL**: Leave blank
   - **Redirect URI**: `http://localhost:8080`
4. Click "Create app"
5. Copy these values:
   ```
   Client ID: (under the app name, looks like: Ab1cD2eF3g)
   Client Secret: (the secret key)
   ```

### 4. OpenAI API Setup (2 minutes) - OPTIONAL

**What it's for**: Enhanced sentiment analysis (fallback works without this)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Go to **API Keys**
4. Click "Create new secret key"
5. Copy: `sk-...`

**Note**: Requires billing setup, but usage will be minimal

## ⚙️ Configure Your .env File

Edit your `.env` file with the values you copied:

```bash
# Required: Supabase (from step 1)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required: YouTube API (from step 2)
YOUTUBE_API_KEY=AIzaSyC...

# Required: Reddit API (from step 3)
REDDIT_CLIENT_ID=Ab1cD2eF3g
REDDIT_CLIENT_SECRET=your-reddit-secret

# Optional: OpenAI (from step 4)
OPENAI_API_KEY=sk-...

# Keep these settings
NODE_ENV=development
DEBUG=true
```

## 🚀 Test Your Setup

1. **Restart the sentiment server**:
   ```bash
   # Stop existing server (Ctrl+C)
   python3 SERVER/sentiment_server.py
   ```

2. **Check the health endpoint**:
   ```bash
   curl http://localhost:5001/api/health
   ```
   Should show ✅ for all services

3. **Test live sentiment analysis**:
   ```bash
   curl -X POST http://localhost:5001/api/analyze-sentiment \
     -H "Content-Type: application/json" \
     -d '{"topic": "artificial intelligence"}'
   ```

4. **Open WaveSight**: http://localhost:8080

## 🔧 Troubleshooting

### Common Issues:

**❌ "YouTube API quota exceeded"**
- Default quota: 10,000 units/day
- Each trending request uses ~100 units
- Solution: Wait for quota reset (midnight Pacific Time)

**❌ "Reddit API rate limit"**
- Limit: 60 requests/minute
- Solution: Built-in rate limiting, just wait

**❌ "Supabase connection failed"**
- Check URL format: `https://your-id.supabase.co`
- Verify anon key is correct
- Check database schema was run

**❌ "CORS errors in browser"**
- Add your domain to Supabase Auth settings
- Check browser console for specific errors

## 💡 Quick Tips

- **Free tiers are enough** for development and testing
- **YouTube quota resets daily** - be mindful of usage
- **Reddit doesn't require authentication** for basic API calls
- **OpenAI is optional** - sentiment analysis works without it
- **Supabase free tier** includes 500MB database + 2GB bandwidth

## 🎯 What You'll See With Live Data

- **Real YouTube trending videos** from US, UK, Canada
- **Actual Reddit sentiment analysis** for any topic
- **Live Cultural Compass** mapping real trends
- **Wave Scores** calculated from real engagement data
- **Real-time database updates** as new data comes in

## 🚨 Security Notes

- **Never commit `.env` to Git** (already in .gitignore)
- **Rotate keys regularly** in production
- **Use different keys** for development/production
- **Monitor API usage** to avoid unexpected costs

---

Ready to see WaveSight with live data? Follow these steps and you'll have real trending analysis running in minutes!