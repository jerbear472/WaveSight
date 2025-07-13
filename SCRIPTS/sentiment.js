"""
Reddit Sentiment Analysis for WaveSight
Analyzes Reddit comments to gauge sentiment on trending topics
"""

import os
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
import praw
from praw.models import Submission
from supabase import create_client, Client
from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


@dataclass
class Config:
    """Application configuration"""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    openai_api_key: str = ""
    
    # Configurable parameters
    max_posts: int = 50
    max_comments_per_post: int = 20
    max_workers: int = 5
    sentiment_batch_size: int = 10
    
    # Rate limiting
    reddit_requests_per_minute: int = 60
    openai_requests_per_minute: int = 50
    
    # Retry configuration
    max_retries: int = 3
    retry_delay: int = 1
    
    def __post_init__(self):
        """Load from environment variables"""
        self.reddit_client_id = os.getenv("REDDIT_CLIENT_ID", "")
        self.reddit_client_secret = os.getenv("REDDIT_CLIENT_SECRET", "")
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        
        # Load optional configs
        self.max_posts = int(os.getenv("MAX_POSTS", "50"))
        self.max_comments_per_post = int(os.getenv("MAX_COMMENTS_PER_POST", "20"))
        self.max_workers = int(os.getenv("MAX_WORKERS", "5"))
    
    def validate(self) -> bool:
        """Validate required configuration"""
        required = [
            self.reddit_client_id,
            self.reddit_client_secret,
            self.supabase_url,
            self.supabase_key,
            self.openai_api_key
        ]
        return all(required)


@dataclass
class SentimentResult:
    """Represents a sentiment classification result"""
    text: str
    sentiment: str
    confidence: float
    metadata: Dict = field(default_factory=dict)


@dataclass
class TopicAnalysis:
    """Represents the complete analysis of a topic"""
    topic: str
    platform: str
    total_comments: int
    sentiment_yes: int
    sentiment_no: int
    sentiment_unclear: int
    confidence: float
    metadata: Dict
    timestamp: datetime


class RedditClient:
    """Handles Reddit API interactions with rate limiting and error handling"""
    
    def __init__(self, config: Config):
        self.config = config
        self.reddit = self._initialize_reddit()
        self.last_request_time = 0
        self.min_request_interval = 60.0 / config.reddit_requests_per_minute
    
    def _initialize_reddit(self) -> praw.Reddit:
        """Initialize Reddit client with error handling"""
        try:
            reddit = praw.Reddit(
                client_id=self.config.reddit_client_id,
                client_secret=self.config.reddit_client_secret,
                user_agent="WaveSight/2.0 (Sentiment Analysis Bot)",
                check_for_async=False  # Explicitly use synchronous mode
            )
            logger.info("✅ Reddit client initialized successfully")
            return reddit
        except Exception as e:
            logger.error(f"❌ Failed to initialize Reddit client: {e}")
            raise
    
    def _rate_limit(self):
        """Simple rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            time.sleep(self.min_request_interval - time_since_last)
        self.last_request_time = time.time()
    
    def search_posts(self, topic: str, subreddit: str = "all", limit: int = 20) -> List[Submission]:
        """Search Reddit posts with rate limiting and retry logic"""
        self._rate_limit()
        
        try:
            logger.info(f"🔍 Searching Reddit for topic: '{topic}' in r/{subreddit}")
            
            submissions = []
            search_params = {
                'limit': limit,
                'sort': 'relevance',
                'time_filter': 'week'  # Focus on recent discussions
            }
            
            for submission in self.reddit.subreddit(subreddit).search(topic, **search_params):
                submissions.append(submission)
            
            logger.info(f"📋 Found {len(submissions)} posts")
            return submissions
            
        except Exception as e:
            logger.error(f"❌ Error searching Reddit: {e}")
            return []
    
    def get_comments(self, submission: Submission, limit: int = 20) -> List[str]:
        """Extract comments from a submission"""
        try:
            submission.comments.replace_more(limit=0)
            comments = []
            
            for comment in submission.comments[:limit]:
                if hasattr(comment, 'body') and comment.body:
                    # Filter out deleted/removed comments
                    if comment.body not in ['[deleted]', '[removed]']:
                        comments.append(comment.body)
            
            return comments
            
        except Exception as e:
            logger.error(f"❌ Error extracting comments: {e}")
            return []


class SentimentAnalyzer:
    """Handles sentiment analysis using OpenAI with batching and caching"""
    
    def __init__(self, config: Config):
        self.config = config
        self.cache = {}  # Simple in-memory cache
        self.last_request_time = 0
        self.min_request_interval = 60.0 / config.openai_requests_per_minute
        
        # Initialize OpenAI client with new API
        try:
            self.client = OpenAI(api_key=config.openai_api_key)
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI client: {e}")
            raise
    
    def _rate_limit(self):
        """Simple rate limiting for OpenAI"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            time.sleep(self.min_request_interval - time_since_last)
        self.last_request_time = time.time()
    
    def classify_sentiment(self, text: str) -> SentimentResult:
        """Classify a single text's sentiment"""
        # Check cache first
        cache_key = hash(text[:100])  # Use first 100 chars for cache key
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        self._rate_limit()
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # More cost-effective than GPT-4
                messages=[
                    {
                        "role": "system", 
                        "content": """You are a sentiment classifier. Analyze the given text and determine if the author believes a specific event/outcome will happen.
                        
                        Respond with ONLY one of these three words:
                        - Yes: The author clearly believes it will happen
                        - No: The author clearly believes it won't happen
                        - Unclear: The sentiment is ambiguous, neutral, or off-topic
                        
                        Focus on the author's belief, not the topic itself."""
                    },
                    {
                        "role": "user", 
                        "content": f"Text: {text[:500]}"  # Limit text length
                    }
                ],
                temperature=0.1,  # Low temperature for consistency
                max_tokens=10
            )
            
            sentiment = response.choices[0].message.content.strip().capitalize()
            
            # Validate response
            if sentiment not in ['Yes', 'No', 'Unclear']:
                sentiment = 'Unclear'
            
            result = SentimentResult(
                text=text,
                sentiment=sentiment,
                confidence=1.0,  # Can be enhanced with probability scores
                metadata={'model': 'gpt-3.5-turbo'}
            )
            
            # Cache the result
            self.cache[cache_key] = result
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error in sentiment classification: {e}")
            return SentimentResult(text=text, sentiment='Unclear', confidence=0.0)
    
    def classify_batch(self, texts: List[str]) -> List[SentimentResult]:
        """Classify multiple texts in parallel"""
        results = []
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            future_to_text = {
                executor.submit(self.classify_sentiment, text): text 
                for text in texts
            }
            
            for future in as_completed(future_to_text):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    text = future_to_text[future]
                    logger.error(f"❌ Failed to classify text: {e}")
                    results.append(
                        SentimentResult(text=text, sentiment='Unclear', confidence=0.0)
                    )
        
        return results


class SupabaseClient:
    """Handles Supabase database operations"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = self._initialize_client()
    
    def _initialize_client(self) -> Client:
        """Initialize Supabase client"""
        try:
            client = create_client(self.config.supabase_url, self.config.supabase_key)
            logger.info("✅ Supabase client initialized")
            return client
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase: {e}")
            raise
    
    def insert_analysis(self, analysis: TopicAnalysis) -> bool:
        """Insert analysis results into Supabase"""
        try:
            data = {
                "topic": analysis.topic,
                "platform": analysis.platform,
                "date": analysis.timestamp.date().isoformat(),
                "sentiment_yes": analysis.sentiment_yes,
                "sentiment_no": analysis.sentiment_no,
                "sentiment_unclear": analysis.sentiment_unclear,
                "confidence": analysis.confidence,
                "total_comments": analysis.total_comments,
                "metadata": analysis.metadata,
                "created_at": analysis.timestamp.isoformat()
            }
            
            response = self.client.table("sentiment_forecasts").insert(data).execute()
            
            if response.data:
                logger.info("✅ Analysis results saved to Supabase")
                return True
            else:
                logger.error("❌ Failed to save to Supabase: No data returned")
                return False
                
        except Exception as e:
            logger.error(f"❌ Supabase insertion error: {e}")
            return False
    
    def get_recent_analyses(self, topic: str, days: int = 7) -> List[Dict]:
        """Retrieve recent analyses for a topic"""
        try:
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            response = self.client.table("sentiment_forecasts") \
                .select("*") \
                .eq("topic", topic) \
                .gte("created_at", cutoff_date) \
                .execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            logger.error(f"❌ Error retrieving analyses: {e}")
            return []


class RedditSentimentAnalyzer:
    """Main orchestrator for Reddit sentiment analysis"""
    
    def __init__(self, config: Config):
        self.config = config
        self.reddit_client = RedditClient(config)
        self.sentiment_analyzer = SentimentAnalyzer(config)
        self.supabase_client = SupabaseClient(config)
    
    def analyze_topic(
        self, 
        topic: str, 
        subreddits: Optional[List[str]] = None,
        time_filter: str = 'week'
    ) -> Optional[TopicAnalysis]:
        """Perform complete sentiment analysis for a topic"""
        
        start_time = time.time()
        logger.info(f"🚀 Starting analysis for topic: '{topic}'")
        
        # Default subreddits if none specified
        if not subreddits:
            subreddits = ['all']
        
        all_comments = []
        post_count = 0
        
        # Collect comments from multiple subreddits
        for subreddit in subreddits:
            posts = self.reddit_client.search_posts(
                topic=topic,
                subreddit=subreddit,
                limit=self.config.max_posts // len(subreddits)
            )
            
            for post in posts:
                comments = self.reddit_client.get_comments(
                    post, 
                    limit=self.config.max_comments_per_post
                )
                all_comments.extend(comments)
                post_count += 1
        
        if not all_comments:
            logger.warning(f"⚠️ No comments found for topic: '{topic}'")
            return None
        
        logger.info(f"📊 Analyzing {len(all_comments)} comments from {post_count} posts")
        
        # Perform sentiment analysis
        sentiment_results = self.sentiment_analyzer.classify_batch(all_comments)
        
        # Aggregate results
        sentiment_counts = Counter(result.sentiment for result in sentiment_results)
        
        yes_count = sentiment_counts.get('Yes', 0)
        no_count = sentiment_counts.get('No', 0)
        unclear_count = sentiment_counts.get('Unclear', 0)
        total = len(sentiment_results)
        
        # Calculate confidence (percentage of decisive responses)
        decisive_total = yes_count + no_count
        if decisive_total > 0:
            confidence = round((yes_count / decisive_total) * 100, 2)
        else:
            confidence = 0.0
        
        # Create analysis result
        analysis = TopicAnalysis(
            topic=topic,
            platform="Reddit",
            total_comments=total,
            sentiment_yes=yes_count,
            sentiment_no=no_count,
            sentiment_unclear=unclear_count,
            confidence=confidence,
            metadata={
                'subreddits': subreddits,
                'post_count': post_count,
                'analysis_duration': round(time.time() - start_time, 2),
                'time_filter': time_filter
            },
            timestamp=datetime.now(timezone.utc)
        )
        
        # Save to database
        success = self.supabase_client.insert_analysis(analysis)
        
        if success:
            logger.info(f"""
            ✅ Analysis complete!
            📊 Results: Yes={yes_count}, No={no_count}, Unclear={unclear_count}
            🎯 Confidence: {confidence}%
            ⏱️ Duration: {analysis.metadata['analysis_duration']}s
            """)
        
        return analysis
    
    def analyze_multiple_topics(self, topics: List[str]) -> List[TopicAnalysis]:
        """Analyze multiple topics in sequence"""
        results = []
        
        for topic in topics:
            try:
                analysis = self.analyze_topic(topic)
                if analysis:
                    results.append(analysis)
                
                # Brief pause between topics to respect rate limits
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Failed to analyze topic '{topic}': {e}")
        
        return results


def main():
    """Main entry point"""
    # Load configuration
    config = Config()
    
    # Validate configuration
    if not config.validate():
        logger.error("❌ Missing required environment variables")
        print("\nRequired environment variables:")
        print("- REDDIT_CLIENT_ID")
        print("- REDDIT_CLIENT_SECRET")
        print("- SUPABASE_URL")
        print("- SUPABASE_KEY")
        print("- OPENAI_API_KEY")
        return
    
    # Initialize analyzer
    try:
        analyzer = RedditSentimentAnalyzer(config)
    except Exception as e:
        logger.error(f"❌ Failed to initialize analyzer: {e}")
        return
    
    # Interactive mode
    while True:
        print("\n" + "="*50)
        print("Reddit Sentiment Analyzer")
        print("="*50)
        print("1. Analyze single topic")
        print("2. Analyze multiple topics")
        print("3. View recent analyses")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == '1':
            topic = input("Enter topic to analyze: ").strip()
            if topic:
                try:
                    analyzer.analyze_topic(topic)
                except Exception as e:
                    logger.error(f"❌ Analysis failed: {e}")
        
        elif choice == '2':
            topics_input = input("Enter topics (comma-separated): ").strip()
            topics = [t.strip() for t in topics_input.split(',') if t.strip()]
            if topics:
                analyzer.analyze_multiple_topics(topics)
        
        elif choice == '3':
            topic = input("Enter topic to view history: ").strip()
            if topic:
                recent = analyzer.supabase_client.get_recent_analyses(topic)
                if recent:
                    print(f"\nRecent analyses for '{topic}':")
                    for analysis in recent:
                        print(f"- {analysis['date']}: {analysis['confidence']}% confidence")
                else:
                    print(f"No recent analyses found for '{topic}'")
        
        elif choice == '4':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid option")


if __name__ == "__main__":
    main()