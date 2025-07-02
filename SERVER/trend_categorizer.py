
import re
from datetime import datetime, timedelta
from collections import defaultdict
import json

class TrendCategorizer:
    """Real-time cultural trend categorization system"""
    
    def __init__(self):
        self.cultural_categories = {
            'Gen Z Internet Culture': {
                'keywords': ['corecore', 'aesthetic', 'vibe', 'energy', 'liminal', 'backrooms', 'tiktok', 'viral dance', 'challenge'],
                'channels': ['tiktok', 'viral', 'meme', 'aesthetic'],
                'description': 'Internet-native cultural phenomena'
            },
            'Urban Style & Nightlife': {
                'keywords': ['chrome pants', 'streetwear', 'nightlife', 'club', 'underground', 'street style', 'fashion week'],
                'channels': ['no jumper', 'complex', 'hypebeast', 'streetwear'],
                'description': 'Urban fashion and nightlife trends'
            },
            'Wellness & Mindfulness': {
                'keywords': ['mindfulness', 'meditation', 'wellness', 'self care', 'mental health', 'yoga', 'breathwork'],
                'channels': ['wellness', 'mindful', 'meditation', 'health'],
                'description': 'Health and wellness movements'
            },
            'Tech Innovation': {
                'keywords': ['ai', 'blockchain', 'crypto', 'web3', 'machine learning', 'chatgpt', 'automation'],
                'channels': ['tech', 'ai', 'startup', 'silicon valley'],
                'description': 'Technology and innovation trends'
            },
            'Financial Markets': {
                'keywords': ['stocks', 'trading', 'investment', 'market', 'economy', 'finance', 'money'],
                'channels': ['finance', 'trading', 'market', 'investment'],
                'description': 'Financial and market trends'
            },
            'Entertainment & Media': {
                'keywords': ['movie', 'tv show', 'celebrity', 'entertainment', 'music', 'album', 'concert'],
                'channels': ['entertainment', 'celebrity', 'music', 'film'],
                'description': 'Entertainment industry trends'
            },
            'Gaming Culture': {
                'keywords': ['gaming', 'esports', 'streamer', 'twitch', 'game', 'console', 'pc gaming'],
                'channels': ['gaming', 'esports', 'twitch', 'gamedev'],
                'description': 'Gaming and esports trends'
            },
            'Food & Lifestyle': {
                'keywords': ['food', 'recipe', 'cooking', 'restaurant', 'diet', 'nutrition', 'lifestyle'],
                'channels': ['food', 'cooking', 'chef', 'lifestyle'],
                'description': 'Food and lifestyle trends'
            },
            'Political & Social': {
                'keywords': ['politics', 'election', 'social justice', 'activism', 'policy', 'government'],
                'channels': ['news', 'politics', 'activist', 'social'],
                'description': 'Political and social movements'
            },
            'Emerging Subcultures': {
                'keywords': ['underground', 'niche', 'alternative', 'indie', 'experimental', 'avant garde'],
                'channels': ['underground', 'alternative', 'indie', 'experimental'],
                'description': 'Emerging and niche cultural movements'
            }
        }
    
    def categorize_trend(self, title, description, channel, keywords=None):
        """Categorize a trend based on content analysis"""
        content = f"{title} {description} {channel}".lower()
        
        # Add search keywords if provided
        if keywords:
            content += f" {' '.join(keywords).lower()}"
        
        # Score each category
        category_scores = {}
        
        for category, data in self.cultural_categories.items():
            score = 0
            
            # Check keywords
            for keyword in data['keywords']:
                if keyword.lower() in content:
                    score += 2
            
            # Check channel names
            for channel_keyword in data['channels']:
                if channel_keyword.lower() in content:
                    score += 3
            
            category_scores[category] = score
        
        # Return the highest scoring category
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            if category_scores[best_category] > 0:
                return best_category
        
        return 'Emerging Subcultures'  # Default category
    
    def normalize_trend_name(self, raw_term):
        """Normalize search terms into clean trend names"""
        # Remove special characters and normalize
        cleaned = re.sub(r'[^\w\s]', '', raw_term)
        cleaned = ' '.join(cleaned.split())  # Remove extra spaces
        
        # Capitalize properly
        words = cleaned.split()
        normalized = ' '.join(word.capitalize() for word in words)
        
        return normalized
    
    def aggregate_trend_data(self, videos_data, trend_name):
        """Aggregate video data for a specific trend"""
        total_views = sum(video.get('view_count', 0) for video in videos_data)
        total_likes = sum(video.get('like_count', 0) for video in videos_data)
        total_comments = sum(video.get('comment_count', 0) for video in videos_data)
        
        # Calculate engagement rate
        engagement_rate = 0
        if total_views > 0:
            engagement_rate = (total_likes + total_comments) / total_views * 100
        
        # Find top performing video
        top_video = max(videos_data, key=lambda x: x.get('view_count', 0)) if videos_data else None
        
        # Calculate average trend score
        avg_trend_score = sum(video.get('trend_score', 0) for video in videos_data) / len(videos_data) if videos_data else 0
        
        return {
            'trend_name': trend_name,
            'total_videos': len(videos_data),
            'total_views': total_views,
            'total_likes': total_likes,
            'total_comments': total_comments,
            'engagement_rate': round(engagement_rate, 3),
            'avg_trend_score': round(avg_trend_score, 2),
            'top_video': {
                'title': top_video.get('title', '') if top_video else '',
                'views': top_video.get('view_count', 0) if top_video else 0,
                'video_id': top_video.get('video_id', '') if top_video else ''
            } if top_video else None
        }

def calculate_wave_score_for_trend(trend_data, sentiment_score=0.5):
    """Calculate WaveScore for a cultural trend"""
    from wave_score import calculate_wave_score
    
    # Use aggregated data for wave score calculation
    return calculate_wave_score(
        view_count=trend_data['total_views'],
        last_view_count=max(trend_data['total_views'] * 0.8, trend_data['total_views'] - 100000),
        likes=trend_data['total_likes'],
        comments=trend_data['total_comments'],
        sentiment_score=sentiment_score
    )

def process_cultural_trends(youtube_data, reddit_sentiment_data=None):
    """Main function to process and categorize cultural trends"""
    categorizer = TrendCategorizer()
    trend_groups = defaultdict(list)
    
    # Group videos by trend category
    for video in youtube_data:
        # Extract potential trend keywords from title
        title = video.get('title', '')
        description = video.get('description', '')
        channel = video.get('channel_title', '')
        
        # Categorize the trend
        category = categorizer.categorize_trend(title, description, channel)
        trend_groups[category].append(video)
    
    # Aggregate data for each trend category
    trend_insights = []
    
    for category, videos in trend_groups.items():
        if len(videos) >= 2:  # Only process categories with multiple videos
            aggregated_data = categorizer.aggregate_trend_data(videos, category)
            
            # Get sentiment score if available
            sentiment_score = 0.5  # Default neutral
            if reddit_sentiment_data and category in reddit_sentiment_data:
                sentiment_score = reddit_sentiment_data[category].get('sentiment_score', 0.5)
            
            # Calculate wave score
            wave_score = calculate_wave_score_for_trend(aggregated_data, sentiment_score)
            
            # Create trend insight record
            insight = {
                'trend_name': category,
                'category': category,
                'total_videos': aggregated_data['total_videos'],
                'total_reach': aggregated_data['total_views'],
                'engagement_rate': aggregated_data['engagement_rate'],
                'wave_score': wave_score,
                'sentiment_score': sentiment_score,
                'trend_score': aggregated_data['avg_trend_score'],
                'data_sources': ['YouTube'],
                'created_at': datetime.now().isoformat(),
                'top_content': aggregated_data['top_video']
            }
            
            if reddit_sentiment_data and category in reddit_sentiment_data:
                insight['data_sources'].append('Reddit')
            
            trend_insights.append(insight)
    
    return trend_insights
