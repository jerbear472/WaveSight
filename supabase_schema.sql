
-- Create YouTube trends table in your Supabase database
-- Run this SQL in your Supabase SQL editor

CREATE TABLE youtube_trends (
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
