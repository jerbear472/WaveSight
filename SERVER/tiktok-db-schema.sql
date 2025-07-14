-- TikTok Data Database Schema for WaveSight
-- Database: PostgreSQL (Supabase compatible)
-- Purpose: Store TikTok viral trend data with growth metrics and predictions

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TikTok Videos Table
-- Stores core video metadata and engagement metrics
CREATE TABLE tiktok_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    region_code VARCHAR(10),
    create_time BIGINT NOT NULL, -- Unix timestamp from TikTok API
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    music_id VARCHAR(255),
    hashtags TEXT[], -- Array of hashtag names
    description TEXT,
    video_duration INTEGER, -- Duration in seconds
    
    -- Metadata
    first_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source VARCHAR(50) DEFAULT 'tiktok_research_api',
    
    -- Indexes for performance
    INDEX idx_tiktok_videos_video_id (video_id),
    INDEX idx_tiktok_videos_username (username),
    INDEX idx_tiktok_videos_create_time (create_time),
    INDEX idx_tiktok_videos_view_count (view_count DESC)
);

-- TikTok Growth Metrics Table
-- Stores time-series data for calculating growth rates and velocities
CREATE TABLE tiktok_growth_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(255) NOT NULL,
    
    -- Growth metrics as per viral score formula
    view_velocity DECIMAL(15,2) DEFAULT 0, -- Views per hour
    share_acceleration DECIMAL(15,2) DEFAULT 0, -- Shares per hour
    comment_velocity DECIMAL(15,2) DEFAULT 0, -- Comments per hour
    like_velocity DECIMAL(15,2) DEFAULT 0, -- Likes per hour
    engagement_rate DECIMAL(8,6) DEFAULT 0, -- (likes + comments + shares) / views
    
    -- Calculated viral score and predictions
    viral_score INTEGER DEFAULT 0, -- 0-100 viral potential score
    recency_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Age-based score adjustment
    
    -- Video age and timing data
    video_age_hours DECIMAL(8,2) DEFAULT 0,
    time_elapsed_hours DECIMAL(8,2) DEFAULT 0,
    
    -- Snapshot timestamp
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key relationship
    FOREIGN KEY (video_id) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_growth_metrics_video_id (video_id),
    INDEX idx_growth_metrics_viral_score (viral_score DESC),
    INDEX idx_growth_metrics_measured_at (measured_at DESC)
);

-- TikTok Trend Predictions Table
-- Stores AI-powered trend direction predictions and risk analysis
CREATE TABLE tiktok_trend_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(255) NOT NULL,
    
    -- Prediction data
    trend_direction VARCHAR(20) NOT NULL, -- 'rising', 'declining', 'stable'
    confidence_score INTEGER DEFAULT 50, -- 0-100 confidence in prediction
    reasoning TEXT[], -- Array of reasoning factors
    
    -- Peak timing predictions
    predicted_peak_hours DECIMAL(8,2), -- Hours until predicted peak
    estimated_peak_views BIGINT, -- Estimated view count at peak
    
    -- Risk assessment
    risk_factors TEXT[], -- Array of identified risk factors
    risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    
    -- Historical pattern analysis
    has_historical_data BOOLEAN DEFAULT FALSE,
    pattern_consistency DECIMAL(3,2), -- 0-1 score for pattern reliability
    
    -- Prediction metadata
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    prediction_model_version VARCHAR(20) DEFAULT '1.0',
    
    -- Foreign key relationship
    FOREIGN KEY (video_id) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_predictions_video_id (video_id),
    INDEX idx_predictions_direction (trend_direction),
    INDEX idx_predictions_confidence (confidence_score DESC),
    INDEX idx_predictions_predicted_at (predicted_at DESC)
);

-- TikTok Viral Alerts Table
-- Stores generated alerts for high-potential viral content
CREATE TABLE tiktok_viral_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(255) UNIQUE NOT NULL, -- Composite ID from analyzer
    video_id VARCHAR(255) NOT NULL,
    
    -- Alert details
    alert_type VARCHAR(50) DEFAULT 'viral_prediction',
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert metadata
    viral_score INTEGER NOT NULL,
    view_velocity DECIMAL(15,2),
    engagement_rate DECIMAL(8,6),
    trend_category VARCHAR(50),
    
    -- Status and timestamps
    alert_status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key relationship
    FOREIGN KEY (video_id) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_alerts_video_id (video_id),
    INDEX idx_alerts_severity (severity),
    INDEX idx_alerts_status (alert_status),
    INDEX idx_alerts_created_at (created_at DESC),
    INDEX idx_alerts_viral_score (viral_score DESC)
);

-- TikTok Trend Categories Table
-- Lookup table for trend categorization
CREATE TABLE tiktok_trend_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    hashtag_patterns TEXT[], -- Common hashtags for this category
    view_threshold BIGINT DEFAULT 0, -- Minimum views for this category
    engagement_threshold DECIMAL(8,6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default trend categories
INSERT INTO tiktok_trend_categories (category_name, description, hashtag_patterns, view_threshold, engagement_threshold) VALUES
('viral', 'High-engagement content with massive reach', ARRAY['fyp', 'viral', 'trending'], 1000000, 0.05),
('music', 'Music and audio-focused content', ARRAY['music', 'song', 'singing', 'dance', 'musicvideo'], 100000, 0.03),
('dance', 'Dance challenges and choreography', ARRAY['dance', 'dancing', 'choreography', 'dancechallenge'], 50000, 0.04),
('comedy', 'Humorous and entertaining content', ARRAY['funny', 'comedy', 'humor', 'meme', 'hilarious'], 50000, 0.06),
('beauty', 'Beauty and cosmetics content', ARRAY['beauty', 'makeup', 'skincare', 'tutorial', 'grwm'], 25000, 0.04),
('food', 'Food and cooking content', ARRAY['food', 'cooking', 'recipe', 'foodie', 'asmr'], 25000, 0.03),
('lifestyle', 'Lifestyle and vlog content', ARRAY['lifestyle', 'vlog', 'dayinmylife', 'routine', 'selfcare'], 25000, 0.03),
('trending', 'General trending content', ARRAY['trending', 'fyp', 'viral'], 50000, 0.04);

-- TikTok Video Categories Junction Table
-- Many-to-many relationship between videos and categories
CREATE TABLE tiktok_video_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- AI classification confidence
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign keys
    FOREIGN KEY (video_id) REFERENCES tiktok_videos(video_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES tiktok_trend_categories(id) ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE(video_id, category_id),
    
    -- Indexes
    INDEX idx_video_categories_video_id (video_id),
    INDEX idx_video_categories_category_id (category_id)
);

-- TikTok Analysis Sessions Table
-- Track batch analysis sessions for monitoring and debugging
CREATE TABLE tiktok_analysis_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session parameters
    categories_analyzed TEXT[],
    videos_limit INTEGER DEFAULT 50,
    time_window_hours INTEGER DEFAULT 24,
    
    -- Session results
    total_videos_analyzed INTEGER DEFAULT 0,
    viral_candidates_found INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds DECIMAL(8,2),
    
    -- Status
    session_status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    error_message TEXT,
    
    -- Metadata
    analyzer_version VARCHAR(20) DEFAULT '1.0',
    api_rate_limit_status JSONB,
    
    -- Indexes
    INDEX idx_sessions_session_id (session_id),
    INDEX idx_sessions_started_at (started_at DESC),
    INDEX idx_sessions_status (session_status)
);

-- Create materialized view for trend analytics
-- Optimized view for dashboard queries and analytics
CREATE MATERIALIZED VIEW tiktok_trend_analytics AS
SELECT 
    v.video_id,
    v.username,
    v.display_name,
    v.region_code,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.share_count,
    v.hashtags,
    
    -- Latest growth metrics
    gm.viral_score,
    gm.view_velocity,
    gm.share_acceleration,
    gm.engagement_rate,
    gm.video_age_hours,
    
    -- Latest prediction
    tp.trend_direction,
    tp.confidence_score,
    tp.predicted_peak_hours,
    tp.estimated_peak_views,
    tp.risk_level,
    
    -- Category information
    STRING_AGG(tc.category_name, ', ') as categories,
    
    -- Time information
    TO_TIMESTAMP(v.create_time) as video_created_at,
    v.last_updated_at,
    gm.measured_at as last_analyzed_at
    
FROM tiktok_videos v
LEFT JOIN LATERAL (
    SELECT * FROM tiktok_growth_metrics gm2 
    WHERE gm2.video_id = v.video_id 
    ORDER BY measured_at DESC 
    LIMIT 1
) gm ON true
LEFT JOIN LATERAL (
    SELECT * FROM tiktok_trend_predictions tp2 
    WHERE tp2.video_id = v.video_id 
    ORDER BY predicted_at DESC 
    LIMIT 1
) tp ON true
LEFT JOIN tiktok_video_categories vc ON v.video_id = vc.video_id
LEFT JOIN tiktok_trend_categories tc ON vc.category_id = tc.id
GROUP BY v.video_id, v.username, v.display_name, v.region_code, v.view_count, 
         v.like_count, v.comment_count, v.share_count, v.hashtags, v.create_time,
         v.last_updated_at, gm.viral_score, gm.view_velocity, gm.share_acceleration,
         gm.engagement_rate, gm.video_age_hours, gm.measured_at, tp.trend_direction,
         tp.confidence_score, tp.predicted_peak_hours, tp.estimated_peak_views, tp.risk_level;

-- Create index on materialized view
CREATE INDEX idx_trend_analytics_viral_score ON tiktok_trend_analytics (viral_score DESC);
CREATE INDEX idx_trend_analytics_view_count ON tiktok_trend_analytics (view_count DESC);
CREATE INDEX idx_trend_analytics_video_created_at ON tiktok_trend_analytics (video_created_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_tiktok_trend_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tiktok_trend_analytics;
END;
$$ LANGUAGE plpgsql;

-- Auto-update triggers for keeping data fresh
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply auto-update trigger to videos table
CREATE TRIGGER tiktok_videos_update_trigger
    BEFORE UPDATE ON tiktok_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_at();

-- Data retention policy function
-- Automatically cleanup old data to manage database size
CREATE OR REPLACE FUNCTION cleanup_old_tiktok_data()
RETURNS void AS $$
BEGIN
    -- Delete growth metrics older than 30 days
    DELETE FROM tiktok_growth_metrics 
    WHERE measured_at < NOW() - INTERVAL '30 days';
    
    -- Delete predictions older than 14 days
    DELETE FROM tiktok_trend_predictions 
    WHERE predicted_at < NOW() - INTERVAL '14 days';
    
    -- Delete resolved alerts older than 7 days
    DELETE FROM tiktok_viral_alerts 
    WHERE alert_status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '7 days';
    
    -- Delete analysis sessions older than 30 days
    DELETE FROM tiktok_analysis_sessions 
    WHERE completed_at < NOW() - INTERVAL '30 days';
    
    -- Refresh analytics view after cleanup
    PERFORM refresh_tiktok_trend_analytics();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for application user
-- Replace 'wavesight_app' with your actual application database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wavesight_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wavesight_app;
-- GRANT EXECUTE ON FUNCTION refresh_tiktok_trend_analytics() TO wavesight_app;
-- GRANT EXECUTE ON FUNCTION cleanup_old_tiktok_data() TO wavesight_app;

-- Performance optimization: Partitioning for high-volume tables
-- Consider partitioning growth_metrics by date for large datasets
-- CREATE TABLE tiktok_growth_metrics_y2024 PARTITION OF tiktok_growth_metrics
-- FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Example queries for common operations:

-- 1. Get top viral videos in last 24 hours
-- SELECT * FROM tiktok_trend_analytics 
-- WHERE video_created_at > NOW() - INTERVAL '24 hours'
-- ORDER BY viral_score DESC, view_count DESC 
-- LIMIT 10;

-- 2. Get trending videos by category
-- SELECT * FROM tiktok_trend_analytics 
-- WHERE categories LIKE '%dance%' 
-- AND viral_score > 70
-- ORDER BY viral_score DESC;

-- 3. Get active viral alerts
-- SELECT va.*, v.username, v.view_count 
-- FROM tiktok_viral_alerts va
-- JOIN tiktok_videos v ON va.video_id = v.video_id
-- WHERE va.alert_status = 'active'
-- ORDER BY va.viral_score DESC;

-- 4. Get growth trends for a specific video
-- SELECT measured_at, viral_score, view_velocity, engagement_rate
-- FROM tiktok_growth_metrics 
-- WHERE video_id = 'your_video_id'
-- ORDER BY measured_at ASC;