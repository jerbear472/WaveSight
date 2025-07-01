
import os
import time
import json
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import requests
from wave_score import calculate_wave_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AlertCriteria:
    """Define criteria for triggering alerts"""
    min_view_count: int = 100000
    min_like_ratio: float = 0.02  # 2% like ratio
    min_wave_score: float = 0.7
    max_hours_old: int = 24
    keywords: List[str] = None
    categories: List[str] = None
    min_growth_rate: float = 0.5  # 50% growth
    
    def __post_init__(self):
        if self.keywords is None:
            self.keywords = ["breaking", "urgent", "viral", "trending", "alert"]
        if self.categories is None:
            self.categories = ["AI Tools", "Crypto", "Technology", "Gaming"]

@dataclass
class Alert:
    """Alert data structure"""
    alert_id: str
    alert_type: str
    video_id: str
    title: str
    description: str
    channel_title: str
    view_count: int
    like_count: int
    wave_score: float
    growth_rate: float
    sentiment_score: float
    reason: str
    created_at: datetime
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    
class YouTubeAlertSystem:
    def __init__(self):
        """Initialize the alert system with API connections"""
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not all([self.youtube_api_key, self.supabase_url, self.supabase_key]):
            raise ValueError("Missing required environment variables")
            
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        
        # Alert configuration
        self.alert_criteria = AlertCriteria()
        self.processed_videos = set()  # Track processed videos to avoid duplicates
        
        logger.info("🚨 YouTube Alert System initialized")
    
    def fetch_trending_videos(self, max_results: int = 50) -> List[Dict]:
        """Fetch trending videos from YouTube API"""
        try:
            search_queries = [
                "breaking news trending",
                "viral video trending today",
                "cryptocurrency breaking news",
                "AI artificial intelligence breakthrough",
                "technology innovation alert",
                "gaming esports trending",
                "stock market alert",
                "social media viral trend"
            ]
            
            all_videos = []
            
            for query in search_queries[:3]:  # Limit to avoid quota issues
                url = f"https://www.googleapis.com/youtube/v3/search"
                params = {
                    'part': 'snippet',
                    'q': query,
                    'type': 'video',
                    'order': 'relevance',
                    'maxResults': max_results // 3,
                    'publishedAfter': (datetime.now() - timedelta(hours=self.alert_criteria.max_hours_old)).isoformat() + 'Z',
                    'key': self.youtube_api_key
                }
                
                response = requests.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    all_videos.extend(data.get('items', []))
                    logger.info(f"✅ Fetched {len(data.get('items', []))} videos for query: {query}")
                else:
                    logger.error(f"❌ YouTube API error for query '{query}': {response.status_code}")
                
                time.sleep(0.5)  # Rate limiting
            
            # Get detailed statistics for videos
            if all_videos:
                video_ids = [item['id']['videoId'] for item in all_videos]
                stats_url = f"https://www.googleapis.com/youtube/v3/videos"
                stats_params = {
                    'part': 'statistics,contentDetails',
                    'id': ','.join(video_ids[:50]),  # API limit
                    'key': self.youtube_api_key
                }
                
                stats_response = requests.get(stats_url, params=stats_params)
                if stats_response.status_code == 200:
                    stats_data = stats_response.json()
                    
                    # Merge stats with video data
                    stats_dict = {item['id']: item for item in stats_data.get('items', [])}
                    
                    for video in all_videos:
                        video_id = video['id']['videoId']
                        if video_id in stats_dict:
                            video['statistics'] = stats_dict[video_id].get('statistics', {})
            
            logger.info(f"📊 Total videos fetched: {len(all_videos)}")
            return all_videos
            
        except Exception as e:
            logger.error(f"❌ Error fetching trending videos: {e}")
            return []
    
    def analyze_video_metrics(self, video: Dict) -> Dict[str, Any]:
        """Analyze video metrics and calculate scores"""
        try:
            stats = video.get('statistics', {})
            snippet = video.get('snippet', {})
            
            # Extract metrics
            view_count = int(stats.get('viewCount', 0))
            like_count = int(stats.get('likeCount', 0))
            comment_count = int(stats.get('commentCount', 0))
            
            # Calculate sentiment from title and description
            text_content = f"{snippet.get('title', '')} {snippet.get('description', '')}"
            sentiment_scores = self.sentiment_analyzer.polarity_scores(text_content)
            sentiment_score = (sentiment_scores['compound'] + 1) / 2  # Normalize to 0-1
            
            # Calculate growth rate (mock for real-time system)
            # In production, you'd compare with historical data
            publish_time = datetime.fromisoformat(snippet.get('publishedAt', '').replace('Z', '+00:00'))
            hours_since_publish = (datetime.now(publish_time.tzinfo) - publish_time).total_seconds() / 3600
            
            if hours_since_publish > 0:
                views_per_hour = view_count / hours_since_publish
                # Estimate growth rate based on views per hour vs expected baseline
                expected_baseline = 1000  # views per hour for average video
                growth_rate = min(views_per_hour / expected_baseline, 10)  # Cap at 10x
            else:
                growth_rate = 0
            
            # Calculate wave score
            last_view_count = max(view_count * 0.8, view_count - 50000)  # Estimate previous count
            wave_score = calculate_wave_score(
                view_count=view_count,
                last_view_count=last_view_count,
                likes=like_count,
                comments=comment_count,
                sentiment_score=sentiment_score
            )
            
            return {
                'video_id': video['id']['videoId'],
                'title': snippet.get('title', ''),
                'description': snippet.get('description', ''),
                'channel_title': snippet.get('channelTitle', ''),
                'published_at': snippet.get('publishedAt', ''),
                'view_count': view_count,
                'like_count': like_count,
                'comment_count': comment_count,
                'sentiment_score': sentiment_score,
                'growth_rate': growth_rate,
                'wave_score': wave_score,
                'hours_since_publish': hours_since_publish
            }
            
        except Exception as e:
            logger.error(f"❌ Error analyzing video metrics: {e}")
            return None
    
    def check_alert_criteria(self, video_metrics: Dict[str, Any]) -> Optional[Alert]:
        """Check if video meets alert criteria"""
        try:
            criteria = self.alert_criteria
            reasons = []
            severity = "LOW"
            
            # Skip if already processed
            if video_metrics['video_id'] in self.processed_videos:
                return None
            
            # Check view count threshold
            if video_metrics['view_count'] < criteria.min_view_count:
                return None
            
            # Check if video is too old
            if video_metrics['hours_since_publish'] > criteria.max_hours_old:
                return None
            
            # Check like ratio
            like_ratio = video_metrics['like_count'] / max(video_metrics['view_count'], 1)
            if like_ratio >= criteria.min_like_ratio:
                reasons.append(f"High engagement ratio: {like_ratio:.3f}")
                severity = "MEDIUM"
            
            # Check wave score
            if video_metrics['wave_score'] >= criteria.min_wave_score:
                reasons.append(f"High wave score: {video_metrics['wave_score']:.3f}")
                severity = "HIGH"
            
            # Check growth rate
            if video_metrics['growth_rate'] >= criteria.min_growth_rate:
                reasons.append(f"Rapid growth: {video_metrics['growth_rate']:.2f}x")
                severity = "HIGH"
            
            # Check keywords in title
            title_lower = video_metrics['title'].lower()
            matching_keywords = [kw for kw in criteria.keywords if kw.lower() in title_lower]
            if matching_keywords:
                reasons.append(f"Contains keywords: {', '.join(matching_keywords)}")
                severity = "CRITICAL" if any(kw in ["breaking", "urgent", "alert"] for kw in matching_keywords) else severity
            
            # Check sentiment extremes
            if video_metrics['sentiment_score'] > 0.8 or video_metrics['sentiment_score'] < 0.2:
                reasons.append(f"Extreme sentiment: {video_metrics['sentiment_score']:.3f}")
                severity = "MEDIUM" if severity == "LOW" else severity
            
            # Create alert if any criteria met
            if reasons:
                alert = Alert(
                    alert_id=f"alert_{video_metrics['video_id']}_{int(time.time())}",
                    alert_type="TRENDING_VIDEO",
                    video_id=video_metrics['video_id'],
                    title=video_metrics['title'],
                    description=video_metrics['description'][:500],
                    channel_title=video_metrics['channel_title'],
                    view_count=video_metrics['view_count'],
                    like_count=video_metrics['like_count'],
                    wave_score=video_metrics['wave_score'],
                    growth_rate=video_metrics['growth_rate'],
                    sentiment_score=video_metrics['sentiment_score'],
                    reason="; ".join(reasons),
                    created_at=datetime.now(),
                    severity=severity
                )
                
                self.processed_videos.add(video_metrics['video_id'])
                return alert
                
            return None
            
        except Exception as e:
            logger.error(f"❌ Error checking alert criteria: {e}")
            return None
    
    def store_alert(self, alert: Alert) -> bool:
        """Store alert in Supabase database"""
        try:
            alert_data = {
                'alert_id': alert.alert_id,
                'alert_type': alert.alert_type,
                'video_id': alert.video_id,
                'title': alert.title,
                'description': alert.description,
                'channel_title': alert.channel_title,
                'view_count': alert.view_count,
                'like_count': alert.like_count,
                'wave_score': alert.wave_score,
                'growth_rate': alert.growth_rate,
                'sentiment_score': alert.sentiment_score,
                'reason': alert.reason,
                'severity': alert.severity,
                'created_at': alert.created_at.isoformat()
            }
            
            result = self.supabase.table('youtube_alerts').insert(alert_data).execute()
            logger.info(f"✅ Alert stored: {alert.alert_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error storing alert: {e}")
            return False
    
    def send_notification(self, alert: Alert):
        """Send notification for high-priority alerts"""
        try:
            # Log alert to console
            logger.info(f"🚨 {alert.severity} ALERT: {alert.title}")
            logger.info(f"   📺 Video ID: {alert.video_id}")
            logger.info(f"   👀 Views: {alert.view_count:,}")
            logger.info(f"   🌊 Wave Score: {alert.wave_score:.3f}")
            logger.info(f"   📈 Growth: {alert.growth_rate:.2f}x")
            logger.info(f"   💭 Sentiment: {alert.sentiment_score:.3f}")
            logger.info(f"   🔍 Reason: {alert.reason}")
            logger.info(f"   🔗 URL: https://youtube.com/watch?v={alert.video_id}")
            
            # For CRITICAL alerts, you could integrate with external notification services
            if alert.severity == "CRITICAL":
                logger.warning(f"🔥 CRITICAL ALERT DETECTED: {alert.title}")
                # Add webhook, email, or Slack integration here
                
        except Exception as e:
            logger.error(f"❌ Error sending notification: {e}")
    
    def run_alert_scan(self):
        """Run a complete alert scanning cycle"""
        try:
            logger.info("🔍 Starting YouTube alert scan...")
            
            # Fetch trending videos
            videos = self.fetch_trending_videos()
            if not videos:
                logger.warning("⚠️ No videos fetched, skipping scan")
                return
            
            alerts_generated = 0
            
            # Analyze each video
            for video in videos:
                video_metrics = self.analyze_video_metrics(video)
                if not video_metrics:
                    continue
                
                # Check for alerts
                alert = self.check_alert_criteria(video_metrics)
                if alert:
                    # Store alert
                    if self.store_alert(alert):
                        self.send_notification(alert)
                        alerts_generated += 1
            
            logger.info(f"✅ Alert scan complete. Generated {alerts_generated} alerts from {len(videos)} videos")
            
        except Exception as e:
            logger.error(f"❌ Error in alert scan: {e}")
    
    def get_recent_alerts(self, hours: int = 24) -> List[Dict]:
        """Get recent alerts from database"""
        try:
            cutoff_time = (datetime.now() - timedelta(hours=hours)).isoformat()
            
            result = self.supabase.table('youtube_alerts')\
                .select('*')\
                .gte('created_at', cutoff_time)\
                .order('created_at', desc=True)\
                .execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Error fetching recent alerts: {e}")
            return []
    
    def update_criteria(self, **kwargs):
        """Update alert criteria dynamically"""
        for key, value in kwargs.items():
            if hasattr(self.alert_criteria, key):
                setattr(self.alert_criteria, key, value)
                logger.info(f"✅ Updated criteria: {key} = {value}")

if __name__ == "__main__":
    # Example usage
    alert_system = YouTubeAlertSystem()
    
    # Customize alert criteria
    alert_system.update_criteria(
        min_view_count=50000,
        min_wave_score=0.6,
        keywords=["breaking", "viral", "trending", "alert", "urgent", "bitcoin", "AI", "crash"]
    )
    
    # Run alert scan
    alert_system.run_alert_scan()
    
    # Show recent alerts
    recent_alerts = alert_system.get_recent_alerts(hours=6)
    print(f"\n📊 Recent alerts: {len(recent_alerts)}")
    for alert in recent_alerts[:5]:
        print(f"   🚨 {alert['severity']}: {alert['title'][:50]}...")
