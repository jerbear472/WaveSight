
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
