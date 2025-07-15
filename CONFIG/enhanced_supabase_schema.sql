-- Enhanced WaveScope Timeline Supabase Schema
-- Comprehensive database schema for advanced trend tracking and analysis

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing tables if they exist (for fresh installation)
DROP TABLE IF EXISTS trend_variants CASCADE;
DROP TABLE IF EXISTS wavescores CASCADE;
DROP TABLE IF EXISTS normalized_trend_bins CASCADE;
DROP TABLE IF EXISTS trend_scores CASCADE;
DROP TABLE IF EXISTS raw_ingestion_data CASCADE;
DROP TABLE IF EXISTS trend_insights CASCADE;
DROP TABLE IF EXISTS forecast CASCADE;
DROP TABLE IF EXISTS comments_analysis CASCADE;
DROP TABLE IF EXISTS anomaly_detection CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- Core Data Tables
-- =====================================================

-- Raw ingestion data from all platforms
CREATE TABLE raw_ingestion_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    platform_source VARCHAR(20) NOT NULL,
    content_id VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Raw metrics from platforms
    raw_metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Normalized metrics for cross-platform comparison
    normalized_metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Additional metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Data quality indicators
    data_quality_score DECIMAL(3,2) DEFAULT 1.00,
    processing_status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(content_id, source, timestamp)
);

-- Time-series trend scores
CREATE TABLE trend_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_id VARCHAR(150) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    platform_source VARCHAR(20) NOT NULL,
    
    -- Core scoring metrics
    normalized_trend_score DECIMAL(5,2) NOT NULL,
    delta DECIMAL(8,2) DEFAULT 0,
    reach_estimate BIGINT DEFAULT 0,
    viral_velocity DECIMAL(8,4) DEFAULT 0,
    
    -- Statistical context
    z_score DECIMAL(6,3) DEFAULT 0,
    percentile_rank DECIMAL(5,2) DEFAULT 50,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints and indexes
    UNIQUE(trend_id, timestamp)
);

-- Normalized temporal bins for aggregated analysis
CREATE TABLE normalized_trend_bins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    platform_source VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- Bin configuration
    bin_duration_ms BIGINT NOT NULL,
    data_point_count INTEGER NOT NULL,
    
    -- Aggregated metrics
    avg_normalized_score DECIMAL(5,2) DEFAULT 0,
    max_normalized_score DECIMAL(5,2) DEFAULT 0,
    total_reach BIGINT DEFAULT 0,
    avg_engagement DECIMAL(8,4) DEFAULT 0,
    trend_momentum DECIMAL(8,4) DEFAULT 0,
    volatility DECIMAL(8,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(bin_timestamp, platform_source, category)
);

-- Advanced WaveScore calculations
CREATE TABLE wavescores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_id VARCHAR(100) NOT NULL,
    trend_id VARCHAR(150) NOT NULL,
    
    -- WaveScore components
    wave_score DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    
    -- Formula components
    normalized_engagement DECIMAL(5,2) DEFAULT 0,
    growth_rate DECIMAL(5,2) DEFAULT 0,
    sentiment_momentum DECIMAL(5,2) DEFAULT 0,
    audience_diversity DECIMAL(5,2) DEFAULT 0,
    
    -- Platform adjustments
    viral_boost DECIMAL(5,2) DEFAULT 0,
    platform_factor JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(trend_id, calculated_at)
);

-- Historical variants for trend analysis
CREATE TABLE trend_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_id VARCHAR(150) NOT NULL,
    variant_type VARCHAR(20) NOT NULL, -- snapshot, aggregated, projected, comparative
    variant_name VARCHAR(100) NOT NULL,
    
    -- Time range
    time_range_start TIMESTAMP WITH TIME ZONE,
    time_range_end TIMESTAMP WITH TIME ZONE,
    
    -- Variant data (different structure based on type)
    data_snapshot JSONB,
    aggregated_metrics JSONB,
    trend_analysis JSONB,
    projected_metrics JSONB,
    forecast_metadata JSONB,
    comparison_data JSONB,
    platform_analysis JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(trend_id, variant_type, variant_name)
);

-- =====================================================
-- Analysis and Intelligence Tables
-- =====================================================

-- Trend insights and cultural analysis
CREATE TABLE trend_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- Metrics
    total_videos INTEGER DEFAULT 0,
    total_reach BIGINT DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    wave_score DECIMAL(5,2) DEFAULT 0,
    sentiment_score DECIMAL(4,3) DEFAULT 0,
    trend_score DECIMAL(5,2) DEFAULT 0,
    growth_rate DECIMAL(8,4) DEFAULT 0,
    
    -- Analysis metadata
    data_sources TEXT[] DEFAULT '{}',
    analysis_date TIMESTAMP WITH TIME ZONE NOT NULL,
    top_video_title TEXT,
    top_video_views BIGINT DEFAULT 0,
    momentum VARCHAR(20) DEFAULT 'stable', -- rising, stable, declining
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(trend_name, analysis_date)
);

-- Sentiment analysis results
CREATE TABLE comments_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_id VARCHAR(100) NOT NULL,
    platform_source VARCHAR(20) NOT NULL,
    
    -- Sentiment scores
    compound_score DECIMAL(4,3) NOT NULL,
    positive_score DECIMAL(4,3) DEFAULT 0,
    negative_score DECIMAL(4,3) DEFAULT 0,
    neutral_score DECIMAL(4,3) DEFAULT 0,
    
    -- Analysis metadata
    text_sample TEXT,
    analysis_method VARCHAR(50) DEFAULT 'vader',
    confidence DECIMAL(3,2) DEFAULT 0.80,
    
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to raw data
    FOREIGN KEY (content_id) REFERENCES raw_ingestion_data(content_id)
);

-- Forecasting and predictions
CREATE TABLE forecast (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_id VARCHAR(150) NOT NULL,
    forecast_type VARCHAR(20) NOT NULL, -- wavescore, reach, engagement
    
    -- Prediction details
    forecast_horizon_hours INTEGER NOT NULL,
    predicted_value DECIMAL(10,4) NOT NULL,
    confidence_lower DECIMAL(10,4) NOT NULL,
    confidence_upper DECIMAL(10,4) NOT NULL,
    confidence_level DECIMAL(3,2) NOT NULL,
    
    -- Model information
    model_type VARCHAR(50) NOT NULL, -- linear_regression, lstm, prophet
    model_accuracy DECIMAL(4,3),
    training_data_points INTEGER,
    
    -- Metadata
    forecast_metadata JSONB DEFAULT '{}',
    warning_flags TEXT[] DEFAULT '{}',
    
    forecasted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(trend_id, forecast_type, forecasted_at)
);

-- Anomaly detection results
CREATE TABLE anomaly_detection (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_id VARCHAR(150) NOT NULL,
    
    -- Anomaly details
    anomaly_type VARCHAR(30) NOT NULL, -- spike, drop, unusual_pattern
    severity VARCHAR(10) NOT NULL, -- low, medium, high, critical
    anomaly_score DECIMAL(5,2) NOT NULL,
    
    -- Detection context
    baseline_value DECIMAL(10,4),
    anomaly_value DECIMAL(10,4),
    threshold_exceeded DECIMAL(10,4),
    
    -- Time information
    detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    anomaly_duration_minutes INTEGER,
    
    -- Analysis
    probable_causes TEXT[],
    related_events JSONB DEFAULT '{}',
    
    -- Metadata
    detection_method VARCHAR(50) DEFAULT 'statistical',
    confidence DECIMAL(3,2) DEFAULT 0.80,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(trend_id, detection_timestamp, anomaly_type)
);

-- =====================================================
-- User and System Tables
-- =====================================================

-- User management
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    replit_user_id VARCHAR(100) UNIQUE NOT NULL,
    replit_username VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    
    -- User preferences
    replit_roles TEXT[] DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    
    -- Usage tracking
    login_count INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Raw ingestion data indexes
CREATE INDEX idx_raw_ingestion_timestamp ON raw_ingestion_data(timestamp DESC);
CREATE INDEX idx_raw_ingestion_source ON raw_ingestion_data(source, platform_source);
CREATE INDEX idx_raw_ingestion_category ON raw_ingestion_data(category);
CREATE INDEX idx_raw_ingestion_content_id ON raw_ingestion_data(content_id);
CREATE INDEX idx_raw_ingestion_published ON raw_ingestion_data(published_at DESC);

-- Trend scores indexes
CREATE INDEX idx_trend_scores_trend_id ON trend_scores(trend_id);
CREATE INDEX idx_trend_scores_timestamp ON trend_scores(timestamp DESC);
CREATE INDEX idx_trend_scores_platform ON trend_scores(platform_source);
CREATE INDEX idx_trend_scores_score ON trend_scores(normalized_trend_score DESC);

-- Normalized bins indexes
CREATE INDEX idx_normalized_bins_timestamp ON normalized_trend_bins(bin_timestamp DESC);
CREATE INDEX idx_normalized_bins_platform_category ON normalized_trend_bins(platform_source, category);
CREATE INDEX idx_normalized_bins_score ON normalized_trend_bins(avg_normalized_score DESC);

-- WaveScores indexes
CREATE INDEX idx_wavescores_trend_id ON wavescores(trend_id);
CREATE INDEX idx_wavescores_calculated ON wavescores(calculated_at DESC);
CREATE INDEX idx_wavescores_score ON wavescores(wave_score DESC);
CREATE INDEX idx_wavescores_confidence ON wavescores(confidence DESC);

-- Trend variants indexes
CREATE INDEX idx_variants_trend_id ON trend_variants(trend_id);
CREATE INDEX idx_variants_type ON trend_variants(variant_type);
CREATE INDEX idx_variants_time_range ON trend_variants(time_range_start, time_range_end);

-- Analysis indexes
CREATE INDEX idx_insights_analysis_date ON trend_insights(analysis_date DESC);
CREATE INDEX idx_insights_category ON trend_insights(category);
CREATE INDEX idx_insights_wave_score ON trend_insights(wave_score DESC);

CREATE INDEX idx_comments_content_id ON comments_analysis(content_id);
CREATE INDEX idx_comments_platform ON comments_analysis(platform_source);
CREATE INDEX idx_comments_analyzed ON comments_analysis(analyzed_at DESC);

CREATE INDEX idx_forecast_trend_id ON forecast(trend_id);
CREATE INDEX idx_forecast_type ON forecast(forecast_type);
CREATE INDEX idx_forecast_valid ON forecast(valid_until DESC);

CREATE INDEX idx_anomaly_trend_id ON anomaly_detection(trend_id);
CREATE INDEX idx_anomaly_timestamp ON anomaly_detection(detection_timestamp DESC);
CREATE INDEX idx_anomaly_severity ON anomaly_detection(severity);

-- User indexes
CREATE INDEX idx_users_replit_id ON users(replit_user_id);
CREATE INDEX idx_users_last_login ON users(last_login DESC);

-- =====================================================
-- Triggers for Automatic Updates
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_raw_ingestion_updated_at 
    BEFORE UPDATE ON raw_ingestion_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Common Queries
-- =====================================================

-- Latest WaveScores with trend information
CREATE VIEW latest_wavescores AS
SELECT 
    w.trend_id,
    w.wave_score,
    w.confidence,
    w.normalized_engagement,
    w.growth_rate,
    w.sentiment_momentum,
    w.audience_diversity,
    w.calculated_at,
    r.title,
    r.category,
    r.platform_source,
    r.published_at
FROM wavescores w
JOIN raw_ingestion_data r ON w.content_id = r.content_id
WHERE w.calculated_at = (
    SELECT MAX(calculated_at) 
    FROM wavescores w2 
    WHERE w2.trend_id = w.trend_id
);

-- Trending content summary
CREATE VIEW trending_summary AS
SELECT 
    r.category,
    r.platform_source,
    COUNT(*) as content_count,
    AVG(w.wave_score) as avg_wave_score,
    MAX(w.wave_score) as max_wave_score,
    SUM(CAST(r.raw_metrics->>'view_count' AS BIGINT)) as total_views,
    DATE_TRUNC('hour', r.timestamp) as hour_bucket
FROM raw_ingestion_data r
JOIN wavescores w ON r.content_id = w.content_id
WHERE r.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY r.category, r.platform_source, DATE_TRUNC('hour', r.timestamp)
ORDER BY hour_bucket DESC, avg_wave_score DESC;

-- Anomaly summary view
CREATE VIEW recent_anomalies AS
SELECT 
    a.trend_id,
    a.anomaly_type,
    a.severity,
    a.anomaly_score,
    a.detection_timestamp,
    r.title,
    r.category,
    r.platform_source
FROM anomaly_detection a
JOIN raw_ingestion_data r ON a.trend_id = CONCAT(r.source, '_', r.content_id)
WHERE a.detection_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY a.detection_timestamp DESC, a.anomaly_score DESC;

-- =====================================================
-- Functions for Data Maintenance
-- =====================================================

-- Function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Clean old raw ingestion data
    DELETE FROM raw_ingestion_data 
    WHERE timestamp < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean old trend scores
    DELETE FROM trend_scores 
    WHERE timestamp < cutoff_date;
    
    -- Clean old normalized bins
    DELETE FROM normalized_trend_bins 
    WHERE bin_timestamp < cutoff_date;
    
    -- Clean old forecasts
    DELETE FROM forecast 
    WHERE valid_until < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trend statistics
CREATE OR REPLACE FUNCTION calculate_trend_stats(
    trend_id_param VARCHAR(150),
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
    avg_score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    trend_direction VARCHAR(10),
    volatility DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(normalized_trend_score)::DECIMAL(5,2) as avg_score,
        MAX(normalized_trend_score)::DECIMAL(5,2) as max_score,
        CASE 
            WHEN AVG(normalized_trend_score) > LAG(AVG(normalized_trend_score)) OVER (ORDER BY timestamp) THEN 'rising'
            WHEN AVG(normalized_trend_score) < LAG(AVG(normalized_trend_score)) OVER (ORDER BY timestamp) THEN 'falling'
            ELSE 'stable'
        END::VARCHAR(10) as trend_direction,
        STDDEV(normalized_trend_score)::DECIMAL(5,2) as volatility
    FROM trend_scores 
    WHERE trend_id = trend_id_param 
    AND timestamp >= NOW() - (hours_back || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Security and Permissions
-- =====================================================

-- Row Level Security (RLS) policies can be added here
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY user_isolation ON users FOR ALL TO authenticated USING (auth.uid() = replit_user_id);

-- Grant permissions to service role
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- Initial Data and Configuration
-- =====================================================

-- Insert some initial configuration data if needed
INSERT INTO trend_insights (trend_name, category, analysis_date) VALUES
('System Initialization', 'System', NOW())
ON CONFLICT (trend_name, analysis_date) DO NOTHING;

-- Comments
COMMENT ON TABLE raw_ingestion_data IS 'Raw data ingested from various social media platforms';
COMMENT ON TABLE trend_scores IS 'Time-series scoring data for trend analysis';
COMMENT ON TABLE normalized_trend_bins IS 'Aggregated trend data in temporal bins';
COMMENT ON TABLE wavescores IS 'Advanced WaveScore calculations with multi-factor analysis';
COMMENT ON TABLE trend_variants IS 'Historical variants and projections for trends';
COMMENT ON TABLE trend_insights IS 'High-level trend insights and cultural analysis';
COMMENT ON TABLE comments_analysis IS 'Sentiment analysis results from content and comments';
COMMENT ON TABLE forecast IS 'Predictive analytics and forecasting results';
COMMENT ON TABLE anomaly_detection IS 'Anomaly detection and spike identification';
COMMENT ON TABLE users IS 'User management and preferences';

-- Schema version for migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('enhanced_v1.0.0') 
ON CONFLICT (version) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced WaveScope Timeline schema created successfully!';
    RAISE NOTICE 'Schema includes: % tables, % views, % indexes', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'),
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
END $$;