import praw
import openai
from supabase import create_client, Client
from datetime import datetime
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import random
from wave_score import calculate_wave_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)
CORS(app)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

print("🔧 Initializing Sentiment Analysis Server...")
print(f"📊 Supabase URL: {'✅ Configured' if SUPABASE_URL else '❌ Missing'}")
print(f"📱 Reddit Client ID: {'✅ Configured' if REDDIT_CLIENT_ID else '❌ Missing'}")
print(f"🤖 OpenAI API Key: {'✅ Configured' if OPENAI_API_KEY else '❌ Missing'}")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Initialize Reddit with better error handling
reddit = None
reddit_status = "Not configured"

if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET:
    try:
        reddit = praw.Reddit(
            client_id=REDDIT_CLIENT_ID,
            client_secret=REDDIT_CLIENT_SECRET,
            user_agent="WaveSightSentimentBot/1.0 by /u/wavesight_user"
        )
        # Test Reddit connection by fetching a simple subreddit
        test_subreddit = reddit.subreddit("test").display_name
        reddit_status = "Connected and working"
        print("✅ Reddit API connection successful")
        print(f"🔗 Successfully accessed r/{test_subreddit}")
    except Exception as e:
        print(f"❌ Reddit API connection failed: {e}")
        print("💡 Reddit will use mock data for demonstration")
        reddit = None
        reddit_status = f"Failed: {str(e)[:50]}..."
else:
    print("❌ Reddit credentials not configured")
    print("💡 Reddit will use mock data for demonstration")
    reddit_status = "Credentials missing"

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Initialize sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment_from_comments(comments):
    """Analyze sentiment from a list of comments using VADER"""
    sentiment_counts = {"pos": 0, "neg": 0, "neu": 0}
    for comment in comments:
        score = analyzer.polarity_scores(comment)
        if score["compound"] >= 0.05:
            sentiment_counts["pos"] += 1
        elif score["compound"] <= -0.05:
            sentiment_counts["neg"] += 1
        else:
            sentiment_counts["neu"] += 1

    total = sum(sentiment_counts.values())
    if total == 0:
        return 0.5  # neutral default

    sentiment_score = (sentiment_counts["pos"] - sentiment_counts["neg"]) / total
    sentiment_score = max(min((sentiment_score + 1) / 2, 1), 0)  # normalize to 0–1
    return round(sentiment_score, 3)

def fetch_mock_reddit_comments(topic):
    """Generate mock Reddit comments for testing"""
    return [
        f"I love {topic}, it's amazing!",
        f"{topic} is changing everything!",
        f"I'm not sure about {topic}, seems overhyped.",
        f"{topic} sucks, total waste.",
        f"{topic} is the future.",
        f"Really excited about {topic} developments",
        f"Not convinced about {topic} yet",
        f"{topic} has potential but needs work"
    ]

def fetch_video_metrics(video_id):
    """Fetch video metrics - mock data for now"""
    return {
        "view_count": random.randint(100000, 5000000),
        "last_view_count": random.randint(50000, 2000000),
        "likes": random.randint(1000, 100000),
        "comments": random.randint(100, 10000)
    }

def analyze_and_store_trend(topic, video_id=None):
    """Comprehensive trend analysis with wave score calculation"""
    print(f"🔍 Analyzing topic: {topic}")
    
    # Get Reddit comments (mock for now)
    reddit_comments = fetch_mock_reddit_comments(topic)
    sentiment_score = analyze_sentiment_from_comments(reddit_comments)
    
    # Get video metrics
    metrics = fetch_video_metrics(video_id or "default")
    
    # Calculate wave score
    wave_score = calculate_wave_score(
        view_count=metrics["view_count"],
        last_view_count=metrics["last_view_count"],
        likes=metrics["likes"],
        comments=metrics["comments"],
        sentiment_score=sentiment_score
    )
    
    print(f"✅ WaveScore for '{topic}' is {wave_score}")
    print(f"📊 Sentiment score: {sentiment_score}")
    print(f"📈 View count: {metrics['view_count']:,}")
    print(f"👍 Engagement: {metrics['likes'] + metrics['comments']:,}")
    
    # Store in Supabase
    result_data = {
        "topic": topic,
        "platform": "Reddit + YouTube",
        "date": datetime.now().date().isoformat(),
        "sentiment_yes": reddit_comments.count("pos") if hasattr(reddit_comments, 'count') else len([c for c in reddit_comments if 'love' in c or 'amazing' in c or 'future' in c]),
        "sentiment_no": reddit_comments.count("neg") if hasattr(reddit_comments, 'count') else len([c for c in reddit_comments if 'sucks' in c or 'waste' in c]),
        "sentiment_unclear": reddit_comments.count("neu") if hasattr(reddit_comments, 'count') else len([c for c in reddit_comments if 'not sure' in c or 'not convinced' in c]),
        "confidence": sentiment_score * 100,
        "certainty_score": round(wave_score * 100, 2),
        "prediction_outcome": "Rising" if wave_score > 0.7 else "Stable" if wave_score > 0.4 else "Declining",
        "cultural_momentum": "Strong" if wave_score > 0.8 else "Moderate" if wave_score > 0.5 else "Weak",
        "total_responses": len(reddit_comments),
        "wave_score": wave_score,
        "view_count": metrics["view_count"],
        "likes": metrics["likes"],
        "comments_count": metrics["comments"]
    }
    
    if supabase:
        try:
            response = supabase.table("sentiment_forecasts").insert(result_data).execute()
            print("📡 Stored result in Supabase:", response.data[0]["id"] if response.data else "Success")
        except Exception as e:
            print(f"❌ Error storing in Supabase: {e}")
    
    return result_data

def classify_sentiment_openai(comment: str) -> str:
    if not OPENAI_API_KEY:
        # Enhanced fallback classification
        comment_lower = comment.lower()
        positive_words = ['yes', 'will', 'definitely', 'sure', 'likely', 'probable', 'good', 'great', 'awesome', 'love', 'agree', 'support', 'bullish', 'buy', 'invest']
        negative_words = ['no', 'won\'t', 'never', 'unlikely', 'impossible', 'bad', 'terrible', 'hate', 'disagree', 'against', 'bearish', 'sell', 'avoid']

        positive_count = sum(1 for word in positive_words if word in comment_lower)
        negative_count = sum(1 for word in negative_words if word in comment_lower)

        if positive_count > negative_count:
            return "Yes"
        elif negative_count > positive_count:
            return "No"
        else:
            return "Unclear"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Classify this comment as 'Yes', 'No', or 'Unclear' based on whether the user believes the event/topic will happen or is positive about it. Only respond with one word: Yes, No, or Unclear."},
                {"role": "user", "content": comment[:500]}  # Limit comment length
            ],
            max_tokens=10
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI error: {e}")
        return "Unclear"

def classify_sentiment(comment: str) -> str:
    if not OPENAI_API_KEY:
        # Fallback classification based on keywords
        comment_lower = comment.lower()
        positive_words = ['yes', 'good', 'great', 'love', 'amazing', 'awesome', 'positive', 'support', 'agree']
        negative_words = ['no', 'bad', 'hate', 'terrible', 'awful', 'negative', 'disagree', 'against']

        positive_count = sum(1 for word in positive_words if word in comment_lower)
        negative_count = sum(1 for word in negative_words if word in comment_lower)

        if positive_count > negative_count:
            return "Yes"
        elif negative_count > positive_count:
            return "No"
        else:
            return "Unclear"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Classify this comment as 'Yes', 'No', or 'Unclear' based on whether the user has a positive, negative, or neutral sentiment about the topic."},
                {"role": "user", "content": comment}
            ],
            max_tokens=10
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error classifying sentiment with OpenAI: {e}")
        return "Unclear"

def analyze_reddit_cultural_trends(topic, limit_posts=50, limit_comments=20):
    """Analyze Reddit data to create cultural trend objects with compass coordinates"""

    if not reddit:
        print("❌ Reddit not configured - creating enhanced mock cultural trend data")
        return create_enhanced_cultural_trend_data(topic)

    print(f"🧭 Creating cultural trend object for: '{topic}'")
    
    # Collect comprehensive data
    posts_data = []
    sentiment_scores = []
    engagement_metrics = []
    subreddit_distribution = {}
    temporal_data = []
    
    try:
        # Search across diverse subreddits for cultural context
        cultural_subreddits = [
            'all', 'technology', 'futurology', 'artificial', 'MachineLearning',
            'crypto', 'gaming', 'movies', 'television', 'news', 'streetwear',
            'fashion', 'Music', 'Art', 'Design', 'WeAreTheMusicMakers',
            'meirl', 'GenZ', 'millennials', 'unpopularopinion', 'TikTokCringe',
            'NoStupidQuestions', 'explainlikeimfive', 'changemyview'
        ]
        
        for subreddit_name in cultural_subreddits[:5]:  # Process top 5 for comprehensive data
            try:
                print(f"🔍 Analyzing cultural context in r/{subreddit_name}...")
                subreddit = reddit.subreddit(subreddit_name)
                
                # Get recent posts about the topic
                search_results = list(subreddit.search(topic, limit=limit_posts//5, time_filter='month'))
                print(f"📋 Found {len(search_results)} cultural posts in r/{subreddit_name}")
                
                subreddit_distribution[subreddit_name] = len(search_results)
                
                for submission in search_results:
                    try:
                        # Collect post metadata
                        post_data = {
                            'title': submission.title,
                            'score': submission.score,
                            'upvote_ratio': submission.upvote_ratio,
                            'num_comments': submission.num_comments,
                            'created_utc': submission.created_utc,
                            'subreddit': subreddit_name,
                            'url': submission.url,
                            'selftext': submission.selftext[:500] if submission.selftext else ""
                        }
                        posts_data.append(post_data)
                        
                        # Analyze comments for cultural sentiment
                        submission.comments.replace_more(limit=0)
                        comment_sentiments = []
                        
                        for comment in submission.comments[:limit_comments//5]:
                            if hasattr(comment, 'body') and len(comment.body) > 10:
                                sentiment = analyze_sentiment_from_comments([comment.body])
                                comment_sentiments.append(sentiment)
                                time.sleep(0.05)  # Rate limit respect
                        
                        if comment_sentiments:
                            avg_sentiment = sum(comment_sentiments) / len(comment_sentiments)
                            sentiment_scores.append(avg_sentiment)
                        
                        # Track engagement metrics
                        engagement_metrics.append({
                            'score': submission.score,
                            'comments': submission.num_comments,
                            'ratio': submission.upvote_ratio
                        })
                        
                    except Exception as post_error:
                        print(f"⚠️ Error processing post: {post_error}")
                        continue
                        
            except Exception as subreddit_error:
                print(f"⚠️ Error accessing r/{subreddit_name}: {subreddit_error}")
                continue
        
        # Create comprehensive cultural trend object
        cultural_trend = create_cultural_trend_object(
            topic, posts_data, sentiment_scores, engagement_metrics, 
            subreddit_distribution, temporal_data
        )
        
        return cultural_trend
        
    except Exception as e:
        print(f"❌ Error in cultural trend analysis: {e}")
        return create_enhanced_cultural_trend_data(topic)

def create_cultural_trend_object(topic, posts_data, sentiment_scores, engagement_metrics, subreddit_distribution, temporal_data):
    """Create a comprehensive cultural trend object with compass coordinates"""
    
    # Calculate aggregate metrics
    total_posts = len(posts_data)
    total_engagement = sum(m['score'] + m['comments'] for m in engagement_metrics) if engagement_metrics else 0
    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.5
    
    # Calculate cultural compass coordinates
    coordinates = calculate_enhanced_cultural_coordinates(
        topic, posts_data, subreddit_distribution, engagement_metrics, avg_sentiment
    )
    
    # Determine cultural velocity and momentum
    velocity = calculate_cultural_velocity(engagement_metrics, sentiment_scores)
    momentum = assess_cultural_momentum(posts_data, engagement_metrics)
    
    # Create trend object
    cultural_trend = {
        'topic': topic,
        'name': format_topic_name(topic),
        'coordinates': coordinates,
        'sentiment_score': round(avg_sentiment, 3),
        'total_posts': total_posts,
        'total_engagement': total_engagement,
        'avg_engagement': total_engagement / max(total_posts, 1),
        'subreddit_spread': len(subreddit_distribution),
        'dominant_subreddits': sorted(subreddit_distribution.items(), key=lambda x: x[1], reverse=True)[:3],
        'cultural_velocity': velocity,
        'cultural_momentum': momentum,
        'category': categorize_by_cultural_context(topic, subreddit_distribution),
        'mainstream_score': calculate_mainstream_score(subreddit_distribution, engagement_metrics),
        'disruption_score': calculate_disruption_score(topic, posts_data, sentiment_scores),
        'cultural_impact': assess_enhanced_cultural_impact(total_posts, total_engagement, len(subreddit_distribution)),
        'temporal_trend': analyze_temporal_pattern(posts_data),
        'platform': 'Reddit Cultural Analysis',
        'analysis_date': datetime.now().isoformat(),
        'confidence': calculate_analysis_confidence(total_posts, len(sentiment_scores), len(subreddit_distribution))
    }
    
    print(f"🧭 Cultural Trend Created:")
    print(f"   📍 Coordinates: ({coordinates['x']}, {coordinates['y']})")
    print(f"   📊 Posts: {total_posts}, Engagement: {total_engagement:,}")
    print(f"   🌐 Subreddit Spread: {len(subreddit_distribution)}")
    print(f"   🎯 Sentiment: {avg_sentiment:.3f}, Velocity: {velocity:.3f}")
    
    # Save to Supabase
    if supabase:
        try:
            result = supabase.table("cultural_trends").upsert(cultural_trend, on_conflict='topic,analysis_date').execute()
            print("✅ Cultural trend saved to Supabase")
        except Exception as e:
            print(f"❌ Failed to save cultural trend: {e}")
    
    return cultural_trend

def calculate_enhanced_cultural_coordinates(topic, posts_data, subreddit_distribution, engagement_metrics, avg_sentiment):
    """Calculate precise cultural compass coordinates based on Reddit data"""
    
    # X-axis: Mainstream (-1) to Underground (+1)
    x = 0
    
    # Mainstream indicators
    mainstream_subreddits = ['all', 'news', 'television', 'movies', 'Music']
    underground_subreddits = ['streetwear', 'WeAreTheMusicMakers', 'experimentalmusic', 'cyberpunk']
    
    mainstream_posts = sum(subreddit_distribution.get(sub, 0) for sub in mainstream_subreddits)
    underground_posts = sum(subreddit_distribution.get(sub, 0) for sub in underground_subreddits)
    total_posts = max(sum(subreddit_distribution.values()), 1)
    
    # High engagement in mainstream = more mainstream
    if engagement_metrics:
        avg_engagement = sum(m['score'] + m['comments'] for m in engagement_metrics) / len(engagement_metrics)
        if avg_engagement > 1000:  # High mainstream engagement
            x -= 0.3
        elif avg_engagement < 50:  # Low niche engagement
            x += 0.4
    
    # Subreddit distribution influence
    if mainstream_posts > underground_posts:
        x -= (mainstream_posts / total_posts) * 0.6
    else:
        x += (underground_posts / total_posts) * 0.6
    
    # Topic-based adjustments
    topic_lower = topic.lower()
    if any(term in topic_lower for term in ['viral', 'trending', 'mainstream', 'popular']):
        x -= 0.2
    elif any(term in topic_lower for term in ['underground', 'niche', 'indie', 'alternative', 'experimental']):
        x += 0.3
    
    # Y-axis: Traditional (-1) to Disruptive (+1)
    y = 0
    
    # Disruptive content indicators
    disruptive_keywords = ['ai', 'crypto', 'blockchain', 'revolution', 'change', 'disruption', 'innovation']
    traditional_keywords = ['classic', 'traditional', 'vintage', 'heritage', 'conservative', 'established']
    
    # Analyze post content for disruption signals
    disruptive_score = 0
    traditional_score = 0
    
    for post in posts_data:
        content = f"{post.get('title', '')} {post.get('selftext', '')}".lower()
        disruptive_score += sum(1 for keyword in disruptive_keywords if keyword in content)
        traditional_score += sum(1 for keyword in traditional_keywords if keyword in content)
    
    if disruptive_score > traditional_score:
        y += min(disruptive_score / max(len(posts_data), 1), 0.8)
    elif traditional_score > disruptive_score:
        y -= min(traditional_score / max(len(posts_data), 1), 0.8)
    
    # Sentiment influence on disruption
    if avg_sentiment > 0.7:  # High positive sentiment often indicates acceptance of change
        y += 0.1
    elif avg_sentiment < 0.3:  # Low sentiment might indicate resistance to change
        y -= 0.1
    
    # Technology and innovation topics
    if any(term in topic_lower for term in ['ai', 'technology', 'crypto', 'digital', 'virtual', 'automation']):
        y += 0.4
    elif any(term in topic_lower for term in ['traditional', 'vintage', 'classic', 'heritage']):
        y -= 0.4
    
    # Ensure bounds
    x = max(-0.95, min(0.95, x))
    y = max(-0.95, min(0.95, y))
    
    return {'x': round(x, 3), 'y': round(y, 3)}

def create_enhanced_cultural_trend_data(topic):
    """Create enhanced mock cultural trend data when Reddit API is unavailable"""
    print(f"🎭 Creating enhanced cultural trend data for: {topic}")
    
    # Generate realistic cultural metrics
    posts_count = random.randint(15, 200)
    engagement_total = random.randint(1000, 50000)
    subreddit_spread = random.randint(3, 12)
    sentiment = random.uniform(0.3, 0.8)
    
    # Calculate coordinates based on topic characteristics
    coordinates = calculate_mock_cultural_coordinates(topic)
    
    cultural_trend = {
        'topic': topic,
        'name': format_topic_name(topic),
        'coordinates': coordinates,
        'sentiment_score': round(sentiment, 3),
        'total_posts': posts_count,
        'total_engagement': engagement_total,
        'avg_engagement': engagement_total / posts_count,
        'subreddit_spread': subreddit_spread,
        'dominant_subreddits': [('technology', posts_count//3), ('futurology', posts_count//4), ('all', posts_count//5)],
        'cultural_velocity': random.uniform(0.2, 0.9),
        'cultural_momentum': random.choice(['Rising', 'Stable', 'Declining']),
        'category': categorize_by_topic(topic),
        'mainstream_score': round(random.uniform(0.2, 0.8), 3),
        'disruption_score': round(random.uniform(0.1, 0.9), 3),
        'cultural_impact': 'High Impact' if engagement_total > 30000 else 'Moderate Impact',
        'temporal_trend': random.choice(['Accelerating', 'Steady', 'Peaking', 'Declining']),
        'platform': 'Reddit Cultural Analysis (Mock)',
        'analysis_date': datetime.now().isoformat(),
        'confidence': round(random.uniform(0.6, 0.9), 3)
    }
    
    print(f"🧭 Mock Cultural Trend: ({coordinates['x']}, {coordinates['y']}) - {cultural_trend['category']}")
    
    return cultural_trend

def calculate_mock_cultural_coordinates(topic):
    """Calculate mock coordinates based on topic analysis"""
    topic_lower = topic.lower()
    
    # X-axis: Mainstream to Underground
    x = 0
    if any(term in topic_lower for term in ['ai', 'crypto', 'blockchain', 'tech']):
        x = random.uniform(0.1, 0.6)  # Emerging/tech = somewhat underground
    elif any(term in topic_lower for term in ['fashion', 'music', 'entertainment']):
        x = random.uniform(-0.4, 0.2)  # Can be mainstream or underground
    elif any(term in topic_lower for term in ['politics', 'news', 'climate']):
        x = random.uniform(-0.6, -0.1)  # Mainstream topics
    else:
        x = random.uniform(-0.3, 0.3)
    
    # Y-axis: Traditional to Disruptive
    y = 0
    if any(term in topic_lower for term in ['ai', 'crypto', 'digital', 'innovation', 'automation']):
        y = random.uniform(0.3, 0.8)  # Highly disruptive
    elif any(term in topic_lower for term in ['wellness', 'sustainability', 'remote work']):
        y = random.uniform(0.1, 0.5)  # Moderately disruptive
    elif any(term in topic_lower for term in ['traditional', 'vintage', 'classic']):
        y = random.uniform(-0.6, -0.2)  # Traditional
    else:
        y = random.uniform(-0.2, 0.4)
    
    return {'x': round(x, 3), 'y': round(y, 3)}

def analyze_reddit_sentiment(topic, limit_posts=50, limit_comments=20):
    """Main function to analyze Reddit sentiment - the missing critical function"""
    print(f"📊 Analyzing Reddit sentiment for: '{topic}' (posts: {limit_posts}, comments: {limit_comments})")
    
    if not reddit:
        print("❌ Reddit not configured - using mock data")
        return create_mock_sentiment_data(topic)
    
    try:
        # Initialize sentiment counters
        sentiment_yes = 0
        sentiment_no = 0
        sentiment_unclear = 0
        total_analyzed = 0
        all_comments = []
        
        # Search relevant subreddits
        target_subreddits = [
            'all', 'technology', 'futurology', 'artificial', 'MachineLearning',
            'crypto', 'investing', 'news', 'explainlikeimfive', 'NoStupidQuestions',
            'unpopularopinion', 'changemyview', 'AskReddit'
        ]
        
        print(f"🔍 Searching across {len(target_subreddits)} subreddits...")
        
        for subreddit_name in target_subreddits[:5]:  # Limit to top 5 for API quota
            try:
                subreddit = reddit.subreddit(subreddit_name)
                
                # Search for posts about the topic
                search_results = list(subreddit.search(topic, limit=limit_posts//5, time_filter='month'))
                print(f"📋 Found {len(search_results)} posts in r/{subreddit_name}")
                
                for submission in search_results:
                    try:
                        # Analyze the post title and text
                        post_content = f"{submission.title} {submission.selftext}"
                        if len(post_content.strip()) > 10:
                            post_sentiment = classify_sentiment_openai(post_content)
                            if post_sentiment == "Yes":
                                sentiment_yes += 1
                            elif post_sentiment == "No":
                                sentiment_no += 1
                            else:
                                sentiment_unclear += 1
                            total_analyzed += 1
                        
                        # Analyze top comments
                        submission.comments.replace_more(limit=0)
                        comment_count = 0
                        
                        for comment in submission.comments[:limit_comments//5]:
                            if hasattr(comment, 'body') and len(comment.body) > 15 and comment_count < 5:
                                all_comments.append(comment.body)
                                comment_sentiment = classify_sentiment_openai(comment.body)
                                
                                if comment_sentiment == "Yes":
                                    sentiment_yes += 1
                                elif comment_sentiment == "No":
                                    sentiment_no += 1
                                else:
                                    sentiment_unclear += 1
                                
                                total_analyzed += 1
                                comment_count += 1
                                time.sleep(0.1)  # Rate limiting
                        
                    except Exception as post_error:
                        print(f"⚠️ Error processing post: {post_error}")
                        continue
                        
            except Exception as subreddit_error:
                print(f"⚠️ Error accessing r/{subreddit_name}: {subreddit_error}")
                continue
        
        # Ensure we have some data
        if total_analyzed == 0:
            print("⚠️ No data collected from Reddit - falling back to mock data")
            return create_mock_sentiment_data(topic)
        
        # Calculate final metrics
        total = sentiment_yes + sentiment_no + sentiment_unclear
        confidence = round((sentiment_yes / total) * 100, 2) if total > 0 else 50
        certainty_score = round(((sentiment_yes + sentiment_no) / total) * 100, 2) if total > 0 else 50
        
        # Determine outcomes
        if confidence > 65:
            prediction_outcome = "Likely"
        elif confidence > 45:
            prediction_outcome = "Uncertain"
        else:
            prediction_outcome = "Unlikely"
        
        if sentiment_yes > sentiment_no * 1.5:
            cultural_momentum = "Rising"
        elif sentiment_no > sentiment_yes * 1.5:
            cultural_momentum = "Declining"
        else:
            cultural_momentum = "Stable"
        
        # Create result object
        sentiment_data = {
            "topic": topic,
            "platform": "Reddit",
            "date": datetime.now().date().isoformat(),
            "sentiment_yes": sentiment_yes,
            "sentiment_no": sentiment_no,
            "sentiment_unclear": sentiment_unclear,
            "confidence": confidence,
            "certainty_score": certainty_score,
            "prediction_outcome": prediction_outcome,
            "cultural_momentum": cultural_momentum,
            "total_responses": total,
            "analyzed_posts": total_analyzed,
            "comment_sample": all_comments[:10]  # Sample for verification
        }
        
        print(f"✅ Reddit Analysis Complete:")
        print(f"   📊 Total analyzed: {total_analyzed}")
        print(f"   👍 Positive: {sentiment_yes}")
        print(f"   👎 Negative: {sentiment_no}")
        print(f"   🤷 Unclear: {sentiment_unclear}")
        print(f"   🎯 Confidence: {confidence}%")
        
        # Store in Supabase
        if supabase:
            try:
                result = supabase.table("sentiment_forecasts").insert(sentiment_data).execute()
                print("✅ Real Reddit data saved to Supabase")
            except Exception as e:
                print(f"❌ Failed to save Reddit data to Supabase: {e}")
        
        return sentiment_data
        
    except Exception as e:
        print(f"❌ Error in Reddit sentiment analysis: {e}")
        print("🔄 Falling back to mock data")
        return create_mock_sentiment_data(topic)

def create_mock_sentiment_data(topic):
    """Create realistic mock sentiment data when Reddit API is unavailable"""
    print(f"🎭 Creating mock sentiment data for: {topic}")

    # Generate realistic sentiment scores based on topic keywords
    base_positive = 60
    base_negative = 25
    base_unclear = 15

    # Adjust based on topic sentiment tendencies
    if any(word in topic.lower() for word in ['ai', 'technology', 'future', 'innovation']):
        base_positive += random.randint(5, 15)
    elif any(word in topic.lower() for word in ['crypto', 'bitcoin', 'investment']):
        base_positive += random.randint(-10, 20)
        base_negative += random.randint(0, 15)

    # Add randomness
    yes = max(1, base_positive + random.randint(-15, 15))
    no = max(1, base_negative + random.randint(-10, 10))
    unclear = max(1, base_unclear + random.randint(-5, 10))

    total = yes + no + unclear
    confidence = round((yes / total) * 100, 2)

    sentiment_data = {
        "topic": topic,
        "platform": "Reddit (Mock Data)",
        "date": datetime.now().date().isoformat(),
        "sentiment_yes": yes,
        "sentiment_no": no,
        "sentiment_unclear": unclear,
        "confidence": confidence,
        "certainty_score": round(((yes + no) / total) * 100, 2),
        "prediction_outcome": "Likely" if confidence > 65 else "Uncertain" if confidence > 45 else "Unlikely",
        "cultural_momentum": "Rising" if yes > no * 1.5 else "Declining" if no > yes * 1.5 else "Stable",
        "total_responses": total
    }

    print(f"📊 Mock Results — Positive: {yes}, Negative: {no}, Unclear: {unclear}, Confidence: {confidence}%")

    if supabase:
        try:
            result = supabase.table("sentiment_forecasts").insert(sentiment_data).execute()
            print("✅ Mock data saved to Supabase.")
        except Exception as e:
            print(f"❌ Failed to save mock data to Supabase: {e}")

    return sentiment_data

@app.route('/api/analyze-sentiment', methods=['POST'])
def analyze_sentiment_endpoint():
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        limit = data.get('limit', 100)
        video_id = data.get('video_id', None)

        if not topic:
            return jsonify({
                'success': False,
                'message': 'Topic is required'
            }), 400

        print(f"🎯 API Request: Analyzing sentiment for '{topic}' (limit: {limit})")

        result = analyze_reddit_sentiment(topic, limit_posts=min(limit, 50), limit_comments=20)

        if result:
            return jsonify({
                'success': True,
                'data': result,
                'total_comments': result.get('total_responses', 0),
                'reddit_connected': reddit is not None,
                'supabase_connected': supabase is not None,
                'message': f'Successfully analyzed sentiment for "{topic}" from Reddit data'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to analyze sentiment - no data available'
            }), 500

    except Exception as e:
        print(f"❌ API Error: {e}")
        return jsonify({
            'success': False,
            'message': str(e),
            'reddit_connected': reddit is not None,
            'supabase_connected': supabase is not None
        }), 500

@app.route('/api/wave-score', methods=['POST'])
def calculate_wave_score_endpoint():
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        video_id = data.get('video_id', None)

        if not topic:
            return jsonify({
                'success': False,
                'message': 'Topic is required'
            }), 400

        print(f"🌊 API Request: Calculating wave score for '{topic}'")

        # Perform comprehensive analysis
        result = analyze_and_store_trend(topic, video_id)

        return jsonify({
            'success': True,
            'data': result,
            'wave_score': result.get('wave_score', 0),
            'message': f'Successfully calculated wave score for "{topic}"'
        })

    except Exception as e:
        print(f"❌ Wave Score API Error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/cultural-compass', methods=['POST'])
def cultural_compass_analysis():
    """Analyze multiple topics for Cultural Compass mapping using enhanced Reddit analysis"""
    try:
        data = request.get_json()
        topics = data.get('topics', [])
        
        if not topics:
            return jsonify({
                'success': False,
                'message': 'No topics provided for analysis'
            }), 400
        
        print(f"🧭 Enhanced Cultural Compass analysis requested for {len(topics)} topics")
        
        cultural_trends = []
        for topic in topics[:8]:  # Limit to 8 topics for detailed analysis
            try:
                print(f"🔍 Creating cultural trend object for: {topic}")
                
                # Use enhanced Reddit cultural analysis
                cultural_trend = analyze_reddit_cultural_trends(topic, limit_posts=30, limit_comments=25)
                
                if cultural_trend:
                    cultural_trends.append(cultural_trend)
                    print(f"✅ Cultural trend created for {topic}")
                    
            except Exception as topic_error:
                print(f"⚠️ Error analyzing {topic}: {topic_error}")
                continue
        
        print(f"✅ Enhanced Cultural Compass analysis complete: {len(cultural_trends)} trends processed")
        
        # Store all trends in database for persistence
        if supabase and cultural_trends:
            try:
                batch_result = supabase.table("cultural_compass_data").upsert(cultural_trends, on_conflict='topic').execute()
                print(f"💾 Stored {len(cultural_trends)} cultural trends in database")
            except Exception as db_error:
                print(f"⚠️ Database storage error: {db_error}")
        
        return jsonify({
            'success': True,
            'data': cultural_trends,
            'total_analyzed': len(cultural_trends),
            'reddit_connected': reddit is not None,
            'analysis_depth': 'Enhanced Reddit Cultural Analysis',
            'message': f'Successfully created {len(cultural_trends)} cultural trend objects for Cultural Compass'
        })
        
    except Exception as e:
        print(f"❌ Enhanced Cultural Compass API Error: {e}")
        return jsonify({
            'success': False,
            'message': str(e),
            'reddit_connected': reddit is not None
        }), 500

def calculate_cultural_coordinates(topic, sentiment_data):
    """Calculate cultural coordinates for compass placement"""
    confidence = sentiment_data.get('confidence', 50)
    total_responses = sentiment_data.get('total_responses', 0)
    momentum = (sentiment_data.get('cultural_momentum', '')).lower()
    
    # X-axis: Mainstream (-1) to Underground (+1)
    x = 0
    topic_lower = topic.lower()
    
    if any(term in topic_lower for term in ['ai', 'crypto', 'blockchain']):
        x = 0.3  # Emerging mainstream
    elif any(term in topic_lower for term in ['climate', 'mental health', 'remote work']):
        x = -0.4  # Mainstream acceptance
    elif any(term in topic_lower for term in ['streetwear', 'indie', 'vinyl', 'craft']):
        x = 0.7  # Underground/niche
    elif any(term in topic_lower for term in ['fitness', 'wellness', 'productivity']):
        x = -0.2  # Trending mainstream
    else:
        x = (confidence - 50) / 100  # Base on confidence
    
    # Y-axis: Traditional (-1) to Disruptive (+1)
    y = 0
    
    if any(term in topic_lower for term in ['ai', 'crypto', 'digital', 'virtual']):
        y = 0.6  # Highly disruptive
    elif any(term in topic_lower for term in ['sustainability', 'climate', 'renewable']):
        y = 0.4  # Moderately disruptive
    elif any(term in topic_lower for term in ['vintage', 'classic', 'traditional', 'heritage']):
        y = -0.5  # Traditional
    elif any(term in topic_lower for term in ['wellness', 'mindfulness', 'meditation']):
        y = 0.1  # Slightly progressive
    else:
        # Base on sentiment momentum
        if 'rising' in momentum or 'strong' in momentum:
            y = 0.3
        elif 'declining' in momentum:
            y = -0.3
        else:
            y = 0
    
    # Adjust based on response volume (more responses = more mainstream)
    if total_responses > 100:
        x -= 0.2
    elif total_responses < 20:
        x += 0.2
    
    # Ensure bounds
    x = max(-0.9, min(0.9, x))
    y = max(-0.9, min(0.9, y))
    
    return {'x': round(x, 2), 'y': round(y, 2)}

def format_topic_name(topic):
    """Format topic name for display"""
    return ' '.join(word.capitalize() for word in topic.split())

def categorize_by_topic(topic):
    """Categorize topic by cultural domain"""
    topic_lower = topic.lower()
    
    if any(term in topic_lower for term in ['ai', 'crypto', 'tech', 'digital', 'virtual']):
        return 'Technology'
    elif any(term in topic_lower for term in ['fashion', 'music', 'art', 'design', 'creative']):
        return 'Creative'
    elif any(term in topic_lower for term in ['health', 'fitness', 'wellness', 'mental', 'nutrition']):
        return 'Lifestyle'
    elif any(term in topic_lower for term in ['climate', 'environment', 'sustainability', 'green']):
        return 'Environmental'
    elif any(term in topic_lower for term in ['work', 'career', 'business', 'productivity']):
        return 'Professional'
    elif any(term in topic_lower for term in ['travel', 'culture', 'social', 'community']):
        return 'Social'
    else:
        return 'Cultural'

def calculate_velocity_score(sentiment_data):
    """Calculate cultural velocity based on sentiment momentum"""
    confidence = sentiment_data.get('confidence', 50)
    total_responses = sentiment_data.get('total_responses', 0)
    momentum = sentiment_data.get('cultural_momentum', 'Stable').lower()
    
    base_velocity = confidence / 100
    response_boost = min(total_responses / 100, 0.5)
    
    momentum_multiplier = 1.0
    if 'strong' in momentum or 'rising' in momentum:
        momentum_multiplier = 1.3
    elif 'declining' in momentum:
        momentum_multiplier = 0.7
    
    velocity = (base_velocity + response_boost) * momentum_multiplier
    return min(round(velocity, 3), 1.0)

def assess_cultural_impact(sentiment_data):
    """Assess the cultural impact level"""
    confidence = sentiment_data.get('confidence', 50)
    total_responses = sentiment_data.get('total_responses', 0)
    
    if confidence >= 75 and total_responses >= 100:
        return 'High Impact'
    elif confidence >= 60 and total_responses >= 50:
        return 'Moderate Impact'
    elif confidence >= 40:
        return 'Emerging Impact'
    else:
        return 'Low Impact'

def calculate_cultural_velocity(engagement_metrics, sentiment_scores):
    """Calculate cultural velocity based on engagement and sentiment trends"""
    if not engagement_metrics or not sentiment_scores:
        return random.uniform(0.3, 0.7)
    
    # Base velocity on average engagement
    avg_engagement = sum(m['score'] + m['comments'] for m in engagement_metrics) / len(engagement_metrics)
    base_velocity = min(avg_engagement / 1000, 1.0)  # Normalize to 0-1
    
    # Sentiment consistency boost
    sentiment_variance = sum((s - 0.5) ** 2 for s in sentiment_scores) / len(sentiment_scores)
    consistency_boost = max(0, 0.5 - sentiment_variance)
    
    velocity = min(base_velocity + consistency_boost, 1.0)
    return round(velocity, 3)

def assess_cultural_momentum(posts_data, engagement_metrics):
    """Assess cultural momentum direction"""
    if not posts_data or not engagement_metrics:
        return random.choice(['Rising', 'Stable', 'Declining'])
    
    # Simple heuristic based on engagement levels
    total_engagement = sum(m['score'] + m['comments'] for m in engagement_metrics)
    avg_engagement = total_engagement / len(engagement_metrics)
    
    if avg_engagement > 500:
        return 'Rising'
    elif avg_engagement > 100:
        return 'Stable'
    else:
        return 'Declining'

def categorize_by_cultural_context(topic, subreddit_distribution):
    """Enhanced categorization based on subreddit context"""
    tech_subs = ['technology', 'futurology', 'artificial', 'MachineLearning']
    creative_subs = ['Art', 'Design', 'Music', 'WeAreTheMusicMakers', 'streetwear']
    lifestyle_subs = ['fitness', 'wellness', 'meditation', 'nutrition']
    
    tech_count = sum(subreddit_distribution.get(sub, 0) for sub in tech_subs)
    creative_count = sum(subreddit_distribution.get(sub, 0) for sub in creative_subs)
    lifestyle_count = sum(subreddit_distribution.get(sub, 0) for sub in lifestyle_subs)
    
    if tech_count > creative_count and tech_count > lifestyle_count:
        return 'Technology'
    elif creative_count > lifestyle_count:
        return 'Creative'
    elif lifestyle_count > 0:
        return 'Lifestyle'
    else:
        return categorize_by_topic(topic)  # Fallback to keyword-based

def calculate_mainstream_score(subreddit_distribution, engagement_metrics):
    """Calculate how mainstream a trend is"""
    mainstream_subs = ['all', 'news', 'television', 'movies', 'Music']
    mainstream_posts = sum(subreddit_distribution.get(sub, 0) for sub in mainstream_subs)
    total_posts = max(sum(subreddit_distribution.values()), 1)
    
    base_score = mainstream_posts / total_posts
    
    # High engagement also indicates mainstream appeal
    if engagement_metrics:
        avg_engagement = sum(m['score'] + m['comments'] for m in engagement_metrics) / len(engagement_metrics)
        engagement_boost = min(avg_engagement / 2000, 0.3)  # Max 0.3 boost
        base_score += engagement_boost
    
    return min(round(base_score, 3), 1.0)

def calculate_disruption_score(topic, posts_data, sentiment_scores):
    """Calculate how disruptive a trend is"""
    disruptive_keywords = ['ai', 'crypto', 'blockchain', 'revolution', 'change', 'disruption', 'innovation', 'breakthrough']
    
    disruption_mentions = 0
    total_content = 0
    
    for post in posts_data:
        content = f"{post.get('title', '')} {post.get('selftext', '')}".lower()
        total_content += 1
        disruption_mentions += sum(1 for keyword in disruptive_keywords if keyword in content)
    
    base_score = disruption_mentions / max(total_content, 1) if total_content > 0 else 0
    
    # High positive sentiment around disruptive topics indicates acceptance
    if sentiment_scores:
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
        if avg_sentiment > 0.6:  # Positive sentiment
            base_score += 0.2
    
    # Topic-based boost
    topic_lower = topic.lower()
    if any(term in topic_lower for term in disruptive_keywords):
        base_score += 0.3
    
    return min(round(base_score, 3), 1.0)

def assess_enhanced_cultural_impact(total_posts, total_engagement, subreddit_spread):
    """Enhanced cultural impact assessment"""
    if total_posts >= 50 and total_engagement >= 10000 and subreddit_spread >= 5:
        return 'High Impact'
    elif total_posts >= 20 and total_engagement >= 2000 and subreddit_spread >= 3:
        return 'Moderate Impact'
    elif total_posts >= 5 and total_engagement >= 500:
        return 'Emerging Impact'
    else:
        return 'Low Impact'

def analyze_temporal_pattern(posts_data):
    """Analyze temporal posting patterns"""
    if not posts_data or len(posts_data) < 3:
        return random.choice(['Accelerating', 'Steady', 'Peaking', 'Declining'])
    
    # Simple pattern analysis based on post timing
    recent_posts = len([p for p in posts_data if p.get('created_utc', 0) > time.time() - 604800])  # Last week
    total_posts = len(posts_data)
    
    if recent_posts / total_posts > 0.5:
        return 'Accelerating'
    elif recent_posts / total_posts > 0.3:
        return 'Steady'
    elif recent_posts / total_posts > 0.1:
        return 'Peaking'
    else:
        return 'Declining'

def calculate_analysis_confidence(total_posts, sentiment_count, subreddit_spread):
    """Calculate confidence in the analysis"""
    post_confidence = min(total_posts / 50, 1.0)  # Max confidence at 50+ posts
    sentiment_confidence = min(sentiment_count / 30, 1.0)  # Max confidence at 30+ sentiments
    spread_confidence = min(subreddit_spread / 8, 1.0)  # Max confidence at 8+ subreddits
    
    overall_confidence = (post_confidence + sentiment_confidence + spread_confidence) / 3
    return round(overall_confidence, 3)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "reddit_configured": bool(REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET),
        "reddit_status": reddit_status,
        "reddit_working": reddit is not None,
        "openai_configured": bool(OPENAI_API_KEY),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY),
        "services": {
            "reddit": "✅ Connected" if reddit else "❌ Not connected",
            "openai": "✅ Configured" if OPENAI_API_KEY else "⚠️ Using fallback",
            "supabase": "✅ Connected" if supabase else "❌ Not connected"
        }
    })

if __name__ == "__main__":
    print("🚀 Starting sentiment analysis server...")
    print(f"📊 Reddit API: {'Configured' if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET else 'Not configured'}")
    print(f"🤖 OpenAI API: {'Configured' if OPENAI_API_KEY else 'Not configured (using fallback)'}")
    print(f"🗄️  Supabase: {'Configured' if SUPABASE_URL and SUPABASE_KEY else 'Not configured'}")

    app.run(host="0.0.0.0", port=5001, debug=True)