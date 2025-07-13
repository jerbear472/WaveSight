-- TikTok Database Schema for WaveSight
-- Stores TikTok video data, metrics, and viral trend analysis

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TikTok Videos Table (Master data)
CREATE TABLE IF NOT EXISTS tiktok_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100),
  create_time TIMESTAMP,
  region_code VARCHAR(10),
  video_description TEXT,
  music_id VARCHAR(50),
  hashtag_names TEXT[],
  duration_ms INTEGER,
  voice_to_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TikTok Metrics Table (Time series data)
CREATE TABLE IF NOT EXISTS tiktok_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id VARCHAR(50) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  share_count BIGINT DEFAULT 0,
  collected_at TIMESTAMP DEFAULT NOW(),
  
  -- Calculated growth metrics
  view_growth_1h BIGINT DEFAULT 0,
  like_growth_1h BIGINT DEFAULT 0,
  comment_growth_1h BIGINT DEFAULT 0,
  share_growth_1h BIGINT DEFAULT 0,
  
  -- Engagement metrics
  engagement_rate DECIMAL(8,6) DEFAULT 0,
  views_per_hour DECIMAL(12,2) DEFAULT 0,
  
  -- Viral analysis
  viral_score DECIMAL(5,2) DEFAULT 0,
  trend_category VARCHAR(20) DEFAULT 'STABLE',
  viral_potential VARCHAR(10) DEFAULT 'LOW',
  confidence_score DECIMAL(4,3) DEFAULT 0,
  
  -- Performance indexes
  INDEX idx_video_collected (video_id, collected_at),
  INDEX idx_viral_score (viral_score DESC),
  INDEX idx_collected_at (collected_at DESC)
);

-- TikTok Viral Trends Summary (Aggregated analysis)
CREATE TABLE IF NOT EXISTS tiktok_viral_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id VARCHAR(50) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
  
  -- Trend identification
  trend_type VARCHAR(20) NOT NULL, -- EMERGING, VIRAL, PEAK, DECLINING
  viral_score DECIMAL(5,2) NOT NULL,
  peak_prediction JSONB, -- Estimated peak views, time to peak
  
  -- Growth analysis
  growth_metrics JSONB, -- Detailed growth calculations
  viral_factors JSONB,  -- Factors contributing to virality
  
  -- Metadata
  hashtags TEXT[],
  region_code VARCHAR(10),
  category VARCHAR(50),
  
  -- Timestamps
  first_detected_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_trend_type (trend_type),
  INDEX idx_viral_score_desc (viral_score DESC),
  INDEX idx_category (category),
  INDEX idx_first_detected (first_detected_at DESC)
);

-- TikTok Comments Analysis (Sentiment data)
CREATE TABLE IF NOT EXISTS tiktok_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id VARCHAR(50) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
  comment_id VARCHAR(50) UNIQUE,
  comment_text TEXT,
  username VARCHAR(100),
  like_count INTEGER DEFAULT 0,
  create_time TIMESTAMP,
  
  -- Sentiment analysis
  sentiment_score DECIMAL(4,3), -- -1 to 1
  sentiment_label VARCHAR(20),  -- POSITIVE, NEGATIVE, NEUTRAL
  emotion_tags TEXT[],          -- joy, anger, surprise, etc.
  
  collected_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_video_sentiment (video_id, sentiment_score),
  INDEX idx_comment_created (create_time DESC)
);

-- TikTok User Influence Tracking
CREATE TABLE IF NOT EXISTS tiktok_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150),
  follower_count BIGINT DEFAULT 0,
  following_count BIGINT DEFAULT 0,
  likes_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  
  -- Influence metrics
  influence_score DECIMAL(6,2) DEFAULT 0,
  viral_content_count INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(6,4) DEFAULT 0,
  
  -- Profile data
  bio_description TEXT,
  profile_image_url TEXT,
  region_code VARCHAR(10),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_influence_score (influence_score DESC),
  INDEX idx_follower_count (follower_count DESC)
);

-- TikTok Hashtag Trending Analysis
CREATE TABLE IF NOT EXISTS tiktok_hashtag_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hashtag VARCHAR(100) NOT NULL,
  
  -- Usage metrics
  video_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  avg_engagement_rate DECIMAL(6,4) DEFAULT 0,
  
  -- Trend analysis
  growth_rate DECIMAL(8,4) DEFAULT 0,
  trend_score DECIMAL(5,2) DEFAULT 0,
  category VARCHAR(50),
  
  -- Time tracking
  trending_since TIMESTAMP,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_hashtag_trend_score (trend_score DESC),
  INDEX idx_hashtag_growth (growth_rate DESC),
  INDEX idx_hashtag_analyzed (analyzed_at DESC)
);

-- TikTok Daily Summary Statistics
CREATE TABLE IF NOT EXISTS tiktok_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stat_date DATE UNIQUE NOT NULL,
  
  -- Volume metrics
  total_videos_processed INTEGER DEFAULT 0,
  new_videos_found INTEGER DEFAULT 0,
  viral_videos_detected INTEGER DEFAULT 0,
  
  -- Engagement metrics
  avg_viral_score DECIMAL(5,2) DEFAULT 0,
  top_viral_score DECIMAL(5,2) DEFAULT 0,
  total_views_tracked BIGINT DEFAULT 0,
  
  -- Category breakdown
  category_stats JSONB,
  top_hashtags TEXT[],
  top_creators TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_stat_date (stat_date DESC)
);

-- Views for easier querying

-- Current Viral Trends View
CREATE OR REPLACE VIEW current_viral_trends AS
SELECT 
  v.video_id,
  v.username,
  v.hashtag_names,
  vt.viral_score,
  vt.trend_type,
  vt.category,
  m.view_count,
  m.like_count,
  m.engagement_rate,
  m.collected_at
FROM tiktok_videos v
JOIN tiktok_viral_trends vt ON v.video_id = vt.video_id
JOIN tiktok_metrics m ON v.video_id = m.video_id
WHERE vt.viral_score >= 70
  AND m.collected_at >= NOW() - INTERVAL '24 hours'
ORDER BY vt.viral_score DESC, m.collected_at DESC;

-- Top Growing Videos View (last 6 hours)
CREATE OR REPLACE VIEW top_growing_videos AS
SELECT 
  v.video_id,
  v.username,
  v.hashtag_names,
  m1.view_count as current_views,
  m2.view_count as previous_views,
  (m1.view_count - m2.view_count) as view_growth,
  ((m1.view_count - m2.view_count)::DECIMAL / GREATEST(m2.view_count, 1)) * 100 as growth_percentage,
  m1.viral_score,
  m1.collected_at
FROM tiktok_videos v
JOIN tiktok_metrics m1 ON v.video_id = m1.video_id
JOIN tiktok_metrics m2 ON v.video_id = m2.video_id
WHERE m1.collected_at >= NOW() - INTERVAL '1 hour'
  AND m2.collected_at >= NOW() - INTERVAL '7 hours'
  AND m2.collected_at <= NOW() - INTERVAL '5 hours'
  AND m1.view_count > m2.view_count
ORDER BY growth_percentage DESC, view_growth DESC
LIMIT 50;

-- Hashtag Performance View
CREATE OR REPLACE VIEW hashtag_performance AS
SELECT 
  hashtag,
  COUNT(*) as video_count,
  AVG(m.viral_score) as avg_viral_score,
  SUM(m.view_count) as total_views,
  AVG(m.engagement_rate) as avg_engagement_rate,
  MAX(m.collected_at) as last_updated
FROM tiktok_hashtag_trends ht
JOIN tiktok_videos v ON hashtag = ANY(v.hashtag_names)
JOIN tiktok_metrics m ON v.video_id = m.video_id
WHERE m.collected_at >= NOW() - INTERVAL '24 hours'
GROUP BY hashtag
HAVING COUNT(*) >= 5
ORDER BY avg_viral_score DESC, total_views DESC;

-- Utility Functions

-- Function to update video metrics
CREATE OR REPLACE FUNCTION update_video_metrics(
  p_video_id VARCHAR(50),
  p_view_count BIGINT,
  p_like_count BIGINT,
  p_comment_count BIGINT,
  p_share_count BIGINT,
  p_viral_score DECIMAL(5,2)
) RETURNS VOID AS $$
DECLARE
  previous_metrics RECORD;
  time_diff INTERVAL;
BEGIN
  -- Get most recent metrics for growth calculation
  SELECT view_count, like_count, comment_count, share_count, collected_at
  INTO previous_metrics
  FROM tiktok_metrics 
  WHERE video_id = p_video_id 
  ORDER BY collected_at DESC 
  LIMIT 1;
  
  -- Calculate growth if previous data exists
  IF previous_metrics.collected_at IS NOT NULL THEN
    time_diff := NOW() - previous_metrics.collected_at;
    
    INSERT INTO tiktok_metrics (
      video_id, view_count, like_count, comment_count, share_count,
      view_growth_1h, like_growth_1h, comment_growth_1h, share_growth_1h,
      engagement_rate, viral_score, collected_at
    ) VALUES (
      p_video_id, p_view_count, p_like_count, p_comment_count, p_share_count,
      CASE WHEN EXTRACT(EPOCH FROM time_diff) > 0 
           THEN ((p_view_count - previous_metrics.view_count) * 3600.0 / EXTRACT(EPOCH FROM time_diff))::BIGINT
           ELSE 0 END,
      CASE WHEN EXTRACT(EPOCH FROM time_diff) > 0 
           THEN ((p_like_count - previous_metrics.like_count) * 3600.0 / EXTRACT(EPOCH FROM time_diff))::BIGINT
           ELSE 0 END,
      CASE WHEN EXTRACT(EPOCH FROM time_diff) > 0 
           THEN ((p_comment_count - previous_metrics.comment_count) * 3600.0 / EXTRACT(EPOCH FROM time_diff))::BIGINT
           ELSE 0 END,
      CASE WHEN EXTRACT(EPOCH FROM time_diff) > 0 
           THEN ((p_share_count - previous_metrics.share_count) * 3600.0 / EXTRACT(EPOCH FROM time_diff))::BIGINT
           ELSE 0 END,
      CASE WHEN p_view_count > 0 
           THEN ((p_like_count + p_comment_count + p_share_count)::DECIMAL / p_view_count)
           ELSE 0 END,
      p_viral_score,
      NOW()
    );
  ELSE
    -- First metrics entry
    INSERT INTO tiktok_metrics (
      video_id, view_count, like_count, comment_count, share_count,
      engagement_rate, viral_score, collected_at
    ) VALUES (
      p_video_id, p_view_count, p_like_count, p_comment_count, p_share_count,
      CASE WHEN p_view_count > 0 
           THEN ((p_like_count + p_comment_count + p_share_count)::DECIMAL / p_view_count)
           ELSE 0 END,
      p_viral_score,
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_username ON tiktok_videos(username);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_region ON tiktok_videos(region_code);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_created ON tiktok_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_metrics_viral_recent ON tiktok_metrics(viral_score DESC, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_hashtag_trends_category ON tiktok_hashtag_trends(category, trend_score DESC);

-- Comments
COMMENT ON TABLE tiktok_videos IS 'Master table for TikTok video metadata';
COMMENT ON TABLE tiktok_metrics IS 'Time-series metrics for TikTok videos with growth calculations';
COMMENT ON TABLE tiktok_viral_trends IS 'Aggregated viral trend analysis and predictions';
COMMENT ON TABLE tiktok_comments IS 'Comment analysis and sentiment data';
COMMENT ON TABLE tiktok_users IS 'TikTok user profiles and influence metrics';
COMMENT ON TABLE tiktok_hashtag_trends IS 'Hashtag trending analysis and categorization';
COMMENT ON TABLE tiktok_daily_stats IS 'Daily aggregated statistics and summaries';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO wavesight_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO wavesight_app;