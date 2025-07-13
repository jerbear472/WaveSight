# WAVESITE Technical Specification

## Project Overview
WAVESITE is a cultural trend intelligence platform that predicts viral content and tracks trend migration across social media platforms.

## Core Features

### 1. Real-Time Trend Monitor
- **Purpose**: Live dashboard showing emerging trends across platforms
- **Input**: Social media posts from Reddit, YouTube, TikTok
- **Output**: Ranked list of trending content with confidence scores
- **API Endpoint**: `GET /api/trends/live`
- **Update Frequency**: 30-second intervals
- **Key Metrics**: Engagement velocity, confidence score (0-100%), time-to-viral estimate

### 2. Cross-Platform Migration Tracking
- **Purpose**: Track how trends move between platforms
- **Algorithm**: Content fingerprinting + similarity matching
- **Data Points**: Audio hash, visual hash, text embedding, hashtag clusters
- **Key Function**: `identify_trend_variants(content_signature, threshold=0.8)`

### 3. Viral Prediction Engine
- **Purpose**: Predict which content will go viral within 24-48 hours
- **ML Features**: engagement_velocity, creator_influence, hashtag_trending_score
- **Target Accuracy**: 70%+ prediction accuracy
- **Output**: Virality score (0-100%) with confidence intervals

### 4. Alert System
- **Triggers**: New trend (confidence >80%), 2x growth in 1 hour, cross-platform migration
- **Channels**: Email, Slack webhook, mobile push
- **API Endpoint**: `POST /api/alerts/create`

## Technical Architecture

### Data Sources
```python
PLATFORMS = {
    'reddit': {
        'api': 'PRAW',
        'rate_limit': '60 requests/minute',
        'data_points': ['title', 'score', 'comments', 'subreddit', 'created_utc']
    },
    'youtube': {
        'api': 'YouTube Data API v3',
        'rate_limit': '10,000 units/day',
        'data_points': ['title', 'description', 'view_count', 'like_count', 'published_at']
    },
    'tiktok': {
        'api': 'TikTok Research API',
        'rate_limit': 'TBD',
        'data_points': ['video_description', 'view_count', 'like_count', 'share_count']
    }
}
```

### Database Schema
```sql
-- Core trends table
CREATE TABLE trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_signature JSONB NOT NULL,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    platform_origin VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    viral_prediction_score DECIMAL(5,2),
    current_engagement_velocity DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'emerging',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform-specific content instances
CREATE TABLE content_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES trends(id),
    platform VARCHAR(50) NOT NULL,
    platform_content_id VARCHAR(255) NOT NULL,
    content_data JSONB NOT NULL,
    engagement_metrics JSONB NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, platform_content_id)
);

-- Trend migrations between platforms
CREATE TABLE trend_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES trends(id),
    source_platform VARCHAR(50) NOT NULL,
    target_platform VARCHAR(50) NOT NULL,
    migration_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    similarity_score DECIMAL(3,2) NOT NULL,
    time_delay_hours DECIMAL(6,2)
);
```

### Key Algorithms

#### Content Fingerprinting
```python
def extract_content_signature(content_data):
    return {
        'audio_hash': generate_audio_fingerprint(content_data.get('audio')),
        'visual_hash': generate_perceptual_hash(content_data.get('video')),
        'text_embedding': encode_text_semantic(content_data.get('text', '')),
        'hashtag_cluster': cluster_hashtags(content_data.get('hashtags', [])),
        'engagement_velocity': calculate_velocity(content_data.get('engagement', {}))
    }
```

#### Trend Detection
```python
def detect_emerging_trend(content_instance):
    velocity_threshold = get_platform_threshold(content_instance.platform)
    confidence_factors = [
        content_instance.engagement_velocity > velocity_threshold,
        content_instance.creator_influence_score > 1000,
        has_viral_hashtags(content_instance.hashtags),
        cross_platform_similarity_exists(content_instance.signature)
    ]
    return calculate_confidence_score(confidence_factors)
```

## Development Guidelines

### File Structure
```
wavesite/
├── src/
│   ├── data_collection/
│   │   ├── reddit_collector.py
│   │   ├── youtube_collector.py
│   │   └── base_collector.py
│   ├── trend_detection/
│   │   ├── signature_extractor.py
│   │   ├── similarity_matcher.py
│   │   └── viral_predictor.py
│   ├── api/
│   │   ├── trends_router.py
│   │   ├── alerts_router.py
│   │   └── analytics_router.py
│   └── models/
│       ├── trend.py
│       ├── content_instance.py
│       └── migration.py
├── tests/
├── config/
├── migrations/
└── docs/
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/wavesite
REDIS_URL=redis://localhost:6379

# API Keys
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
TIKTOK_API_KEY=your_tiktok_api_key

# Configuration
TREND_DETECTION_INTERVAL=30  # seconds
VIRAL_THRESHOLD_REDDIT=100   # upvotes/hour
VIRAL_THRESHOLD_YOUTUBE=1000 # views/hour
```

### API Endpoints

#### Trends API
- `GET /api/trends/live` - Get current trending content
- `GET /api/trends/{trend_id}` - Get specific trend details
- `POST /api/trends/track` - Start tracking a specific trend
- `GET /api/trends/{trend_id}/migration` - Get migration path

#### Analytics API
- `GET /api/analytics/platform-performance` - Platform-specific metrics
- `GET /api/analytics/prediction-accuracy` - Model performance metrics
- `GET /api/analytics/trend-lifecycle/{trend_id}` - Full trend timeline

#### Alerts API
- `POST /api/alerts/create` - Create new alert rule
- `GET /api/alerts/active` - Get active alerts
- `PUT /api/alerts/{alert_id}` - Update alert settings

## Development Priorities

### Phase 1 (MVP - Weeks 1-4)
1. Set up basic data collection from Reddit and YouTube
2. Implement simple trend detection based on engagement velocity
3. Create basic REST API for trends
4. Build minimal web dashboard
5. Add user authentication

### Phase 2 (Enhancement - Weeks 5-8)
1. Add TikTok data collection
2. Implement cross-platform content matching
3. Build alert system
4. Add trend analytics dashboard
5. Implement basic viral prediction

### Phase 3 (Scale - Weeks 9-12)
1. Advanced ML models for prediction
2. Real-time notifications
3. Mobile app development
4. API rate limiting and authentication
5. Performance optimization

## Code Standards

### Python Code Style
- Use Black for formatting
- Follow PEP 8 naming conventions
- Type hints for all function signatures
- Docstrings for all public functions
- Maximum line length: 88 characters

### Database Naming
- Snake_case for table and column names
- Plural table names (trends, content_instances)
- Foreign keys: {table_name}_id
- Timestamps: created_at, updated_at (always with timezone)

### Error Handling
- Use custom exception classes
- Log all errors with context
- Return consistent error response format
- Implement circuit breakers for external APIs

## Testing Strategy

### Unit Tests
- Test all core algorithms (trend detection, similarity matching)
- Mock external API calls
- Test database models and relationships
- Target: 90%+ code coverage

### Integration Tests
- Test full data collection pipeline
- Test API endpoints with real data
- Test cross-platform content matching
- Test alert delivery systems

### Performance Tests
- Load test API endpoints (1000+ concurrent users)
- Test data processing pipeline with high volume
- Test real-time notification delivery
- Monitor memory usage and response times

## Deployment Configuration

### Docker Setup
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes Resources
- Deployment with 3 replicas minimum
- HorizontalPodAutoscaler for traffic spikes
- ConfigMap for environment variables
- Secret for API keys and database credentials
- Service and Ingress for external access

This specification should be the single source of truth for the WAVESITE project.