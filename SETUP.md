
# WAVESIGHT Setup Guide

## Prerequisites

- Replit account
- Supabase account (free tier available)
- YouTube Data API key (Google Cloud Console)
- Reddit API credentials (optional)
- OpenAI API key (optional)

## Step-by-Step Setup

### 1. API Key Setup

#### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Copy the API key

#### Supabase Setup
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy Project URL and anon public key

#### Reddit API (Optional)
1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Create new app (script type)
3. Copy client ID and secret

#### OpenAI API (Optional)
1. Go to [OpenAI](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy the key

### 2. Replit Configuration

#### Add Secrets
In your Replit, go to Secrets (lock icon) and add:

```
YOUTUBE_API_KEY=your_youtube_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
OPENAI_API_KEY=your_openai_api_key
```

### 3. Database Setup

1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the complete schema from `supabase_schema.sql`
4. Verify tables are created: `youtube_trends` and `sentiment_forecasts`

### 4. Install Dependencies

The `package.json` will automatically install Node.js dependencies when you run the project.

For Python dependencies, they are included in the Replit environment.

### 5. Start the Application

1. Click the "Run" button (starts YouTube API Server)
2. From workflows dropdown, start "Sentiment Analysis Server"
3. Open the preview to see your dashboard

### 6. Initial Data Load

Click "Fetch Data" button in the dashboard or make an API call:
```bash
curl "http://your-repl-url:5000/api/fetch-youtube?q=trending&maxResults=50"
```

## Troubleshooting

### Common Issues

#### "YouTube API key not configured"
- Check if `YOUTUBE_API_KEY` is set in Secrets
- Verify the API key is valid and has YouTube Data API enabled

#### "Supabase connection failed"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Secrets
- Check if database schema is properly set up

#### "Script error" or syntax errors
- Clear browser cache and refresh
- Check browser console for specific error details

#### Charts not displaying
- Ensure JavaScript is enabled
- Check if data is being fetched successfully
- Verify canvas element is rendering

#### Sentiment analysis not working
- Start the "Sentiment Analysis Server" workflow
- Check if Reddit API credentials are set (optional)
- OpenAI API key is optional (fallback available)

### Testing API Endpoints

#### Test YouTube API Server
```bash
curl http://your-repl-url:5000/api/health
```

#### Test Sentiment Server
```bash
curl http://your-repl-url:5001/api/health
```

#### Fetch Sample Data
```bash
curl "http://your-repl-url:5000/api/fetch-youtube?q=AI&maxResults=10"
```

### Performance Optimization

#### Database Optimization
- Ensure indexes are created (included in schema)
- Monitor query performance in Supabase dashboard
- Use appropriate limits on data fetching

#### Frontend Optimization
- Browser caching is enabled
- Data pagination prevents large loads
- Fallback data ensures UI remains functional

## Environment Variables Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `YOUTUBE_API_KEY` | Yes | Fetch YouTube trending data |
| `SUPABASE_URL` | Yes | Database connection |
| `SUPABASE_ANON_KEY` | Yes | Database authentication |
| `REDDIT_CLIENT_ID` | Optional | Reddit sentiment analysis |
| `REDDIT_CLIENT_SECRET` | Optional | Reddit sentiment analysis |
| `OPENAI_API_KEY` | Optional | Advanced sentiment classification |

## Deployment Checklist

- [ ] All secrets configured
- [ ] Database schema deployed
- [ ] YouTube API Server running (port 5000)
- [ ] Sentiment Analysis Server running (port 5001)
- [ ] Dashboard accessible via preview URL
- [ ] API endpoints responding correctly
- [ ] Data fetching and displaying properly
- [ ] Charts rendering without errors

## Next Steps

After successful setup:

1. **Customize Categories**: Edit trend categories in `youtubeToSupabase.js`
2. **Modify Styling**: Update colors and design in `style.css`
3. **Add Data Sources**: Extend sentiment analysis with more platforms
4. **Create Alerts**: Set up notifications for trending topics
5. **Export Data**: Build data export functionality
6. **Scale Up**: Increase API limits and data retention

## Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Verify all environment variables are set
3. Ensure both servers are running
4. Check Supabase logs for database issues
5. Review API rate limits and quotas

---

Your WAVESIGHT dashboard should now be fully functional with real-time trend tracking and sentiment analysis capabilities!
