
-- Create YouTube trends table in your Supabase database
-- Run this SQL in your Supabase SQL editor

CREATE TABLE youtube_trends (
  id BIGSERIAL PRIMARY KEY,
  trend_name VARCHAR(200) NOT NULL,
  platform VARCHAR(50) DEFAULT 'YouTube',
  reach_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  video_id VARCHAR(100),
  channel_name VARCHAR(200),
  published_at TIMESTAMPTZ,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_youtube_trends_published_at ON youtube_trends(published_at DESC);
CREATE INDEX idx_youtube_trends_reach_count ON youtube_trends(reach_count DESC);

-- Enable Row Level Security (optional)
ALTER TABLE youtube_trends ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON youtube_trends
  FOR ALL USING (true);
