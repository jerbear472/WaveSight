-- Create YouTube trends table in your Supabase database
-- Run this SQL in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS youtube_trends (
  id BIGSERIAL PRIMARY KEY,

  -- Basic video info
  video_id VARCHAR(100) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMPTZ,

  -- Channel info
  channel_id VARCHAR(100),
  channel_title VARCHAR(200),

  -- Thumbnails
  thumbnail_default VARCHAR(500),
  thumbnail_medium VARCHAR(500),
  thumbnail_high VARCHAR(500),

  -- Engagement metrics (from videos API)
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- Trending analysis
  trend_category VARCHAR(100) DEFAULT 'General',
  trend_score INTEGER DEFAULT 0,

  -- Wave analysis
  wave_score DECIMAL(10, 6) DEFAULT 0,
  sentiment_score DECIMAL(5, 4) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_youtube_trends_published_at ON youtube_trends(published_at DESC);
CREATE INDEX idx_youtube_trends_view_count ON youtube_trends(view_count DESC);
CREATE INDEX idx_youtube_trends_video_id ON youtube_trends(video_id);
CREATE INDEX idx_youtube_trends_channel_id ON youtube_trends(channel_id);

-- Enable Row Level Security
ALTER TABLE youtube_trends ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON youtube_trends FOR ALL USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_youtube_trends_updated_at 
    BEFORE UPDATE ON youtube_trends 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create users table for authentication
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,

  -- Replit user info
  replit_user_id VARCHAR(100) UNIQUE NOT NULL,
  replit_username VARCHAR(100) NOT NULL,
  replit_roles TEXT,

  -- User preferences
  display_name VARCHAR(200),
  email VARCHAR(300),
  avatar_url VARCHAR(500),

  -- User settings
  preferred_categories TEXT[], -- Array of preferred trend categories
  notification_settings JSONB DEFAULT '{"email": false, "dashboard": true}',
  dashboard_config JSONB DEFAULT '{"theme": "dark", "default_date_range": 180}',

  -- Activity tracking
  last_login TIMESTAMPTZ DEFAULT NOW(),
  login_count INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_replit_user_id ON users(replit_user_id);
CREATE INDEX idx_users_username ON users(replit_username);
CREATE INDEX idx_users_last_login ON users(last_login DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (replit_user_id = current_setting('request.jwt.claims', true)::json->>'replit_user_id');
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (replit_user_id = current_setting('request.jwt.claims', true)::json->>'replit_user_id');

-- Trigger to automatically update updated_at for users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create sentiment forecasts table for sentiment analysis data
CREATE TABLE sentiment_forecasts (
  id BIGSERIAL PRIMARY KEY,

  -- Topic and platform info
  topic VARCHAR(200) NOT NULL,
  platform VARCHAR(100) DEFAULT 'Reddit',

  -- Date of analysis
  date DATE NOT NULL,

  -- Sentiment counts
  sentiment_yes INTEGER DEFAULT 0,
  sentiment_no INTEGER DEFAULT 0,
  sentiment_unclear INTEGER DEFAULT 0,

  -- Calculated confidence percentage
  confidence DECIMAL(5,2) DEFAULT 0.00,

  -- Cultural prediction metrics
  certainty_score DECIMAL(5,2) DEFAULT 0.00,
  prediction_outcome VARCHAR(50) DEFAULT 'Uncertain',
  cultural_momentum VARCHAR(50) DEFAULT 'Stable',
  total_responses INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sentiment_forecasts_topic ON sentiment_forecasts(topic);
CREATE INDEX idx_sentiment_forecasts_date ON sentiment_forecasts(date DESC);
CREATE INDEX idx_sentiment_forecasts_platform ON sentiment_forecasts(platform);
CREATE INDEX idx_sentiment_forecasts_confidence ON sentiment_forecasts(confidence DESC);

-- Enable Row Level Security
ALTER TABLE sentiment_forecasts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON sentiment_forecasts FOR ALL USING (true);

-- Trigger to automatically update updated_at for sentiment_forecasts
CREATE TRIGGER update_sentiment_forecasts_updated_at 
    BEFORE UPDATE ON sentiment_forecasts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- YouTube Alerts Table
CREATE TABLE IF NOT EXISTS youtube_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    video_id VARCHAR(50),
    title TEXT,
    channel_title VARCHAR(255),
    threshold_value BIGINT,
    current_value BIGINT,
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    message TEXT,
    alert_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_time ON youtube_alerts(alert_time);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON youtube_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON youtube_alerts(is_read);

-- Trend Insights Table for Cultural Trend Analysis
CREATE TABLE IF NOT EXISTS trend_insights (
    id BIGSERIAL PRIMARY KEY,
    trend_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_videos INTEGER DEFAULT 0,
    total_reach BIGINT DEFAULT 0,
    engagement_rate DECIMAL(10, 3) DEFAULT 0,
    wave_score DECIMAL(10, 6) DEFAULT 0,
    sentiment_score DECIMAL(5, 4) DEFAULT 0,
    trend_score DECIMAL(10, 3) DEFAULT 0,
    data_sources TEXT DEFAULT '["YouTube"]',
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    top_video_title TEXT,
    top_video_views BIGINT DEFAULT 0,
    geographic_regions TEXT,
    influencer_involvement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trend_name, analysis_date::DATE)
);

-- Create indexes for trend insights
CREATE INDEX IF NOT EXISTS idx_trend_insights_trend_name ON trend_insights(trend_name);
CREATE INDEX IF NOT EXISTS idx_trend_insights_category ON trend_insights(category);
CREATE INDEX IF NOT EXISTS idx_trend_insights_wave_score ON trend_insights(wave_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_insights_analysis_date ON trend_insights(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_trend_insights_total_reach ON trend_insights(total_reach DESC);

-- Enable Row Level Security for trend insights
ALTER TABLE trend_insights ENABLE ROW LEVEL SECURITY;

-- Create policy for trend insights
CREATE POLICY "Allow public access to trend_insights" ON trend_insights
    FOR ALL USING (true);

-- Add any additional indexes as needed
CREATE INDEX IF NOT EXISTS idx_youtube_data_published_date ON youtube_data(published_date);
CREATE INDEX IF NOT EXISTS idx_youtube_data_category ON youtube_data(category);
CREATE INDEX IF NOT EXISTS idx_youtube_data_view_count ON youtube_data(view_count);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_topic ON sentiment_analysis(topic);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_created_at ON sentiment_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_youtube_alerts_severity ON youtube_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_youtube_alerts_triggered_at ON youtube_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_youtube_alerts_dismissed ON youtube_alerts(dismissed);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow public access for demo purposes)
CREATE POLICY "Allow public access to youtube_trends" ON youtube_trends
    FOR ALL USING (true);

CREATE POLICY "Allow public access to sentiment_forecasts" ON sentiment_forecasts
    FOR ALL USING (true);

CREATE POLICY "Allow public access to users" ON users
    FOR ALL USING (true);

CREATE POLICY "Allow public access to youtube_alerts" ON youtube_alerts
    FOR ALL USING (true);