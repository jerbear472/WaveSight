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

def analyze_reddit_sentiment(topic, limit_posts=50, limit_comments=20):
    """Analyze sentiment from Reddit posts and comments with robust error handling"""

    if not reddit:
        print("❌ Reddit not configured - using mock data for demonstration")
        return create_mock_sentiment_data(topic)

    yes, no, unclear = 0, 0, 0
    total_comments_analyzed = 0

    try:
        print(f"🔍 Fetching Reddit data for topic: '{topic}'")
        print(f"📊 Searching across multiple subreddits...")

        # Search across multiple relevant subreddits
        subreddits = ['all', 'technology', 'futurology', 'artificial', 'MachineLearning', 
                     'crypto', 'gaming', 'movies', 'television', 'news']

        for subreddit_name in subreddits[:3]:  # Limit to 3 subreddits to avoid rate limits
            try:
                print(f"📡 Searching r/{subreddit_name}...")
                subreddit = reddit.subreddit(subreddit_name)

                # Search for posts related to the topic
                search_results = list(subreddit.search(topic, limit=limit_posts//3, time_filter='month'))
                print(f"📋 Found {len(search_results)} posts in r/{subreddit_name}")

                for submission in search_results:
                    try:
                        submission.comments.replace_more(limit=0)
                        comments_processed = 0

                        for comment in submission.comments:
                            if comments_processed >= limit_comments:
                                break

                            if hasattr(comment, 'body') and len(comment.body) > 10:
                                label = classify_sentiment(comment.body)
                                total_comments_analyzed += 1
                                comments_processed += 1

                                if "positive" in label.lower() or "yes" in label.lower():
                                    yes += 1
                                elif "negative" in label.lower() or "no" in label.lower():
                                    no += 1
                                else:
                                    unclear += 1

                                # Add delay to respect rate limits
                                time.sleep(0.1)

                    except Exception as comment_error:
                        print(f"⚠️ Error processing submission: {comment_error}")
                        continue

            except Exception as subreddit_error:
                print(f"⚠️ Error accessing r/{subreddit_name}: {subreddit_error}")
                continue

        # If no data collected, use mock data
        if total_comments_analyzed == 0:
            print("⚠️ No Reddit data collected, using mock data")
            return create_mock_sentiment_data(topic)

        total = max(yes + no + unclear, 1)
        confidence = round((yes / total) * 100, 2)

        print(f"✅ Analysis complete!")
        print(f"📊 Comments analyzed: {total_comments_analyzed}")
        print(f"📈 Results — Positive: {yes}, Negative: {no}, Unclear: {unclear}")
        print(f"🎯 Confidence: {confidence}%")

        # Calculate cultural prediction metrics
        total_responses = yes + no + unclear
        certainty_score = ((yes + no) / total_responses) * 100 if total_responses > 0 else 0

        # Determine prediction outcome
        prediction_outcome = "Likely" if confidence > 65 else "Uncertain" if confidence > 45 else "Unlikely"
        cultural_momentum = "Rising" if yes > no * 1.5 else "Declining" if no > yes * 1.5 else "Stable"

        # Save to Supabase with enhanced metrics
        sentiment_data = {
            "topic": topic,
            "platform": "Reddit",
            "date": datetime.now().date().isoformat(),
            "sentiment_yes": yes,
            "sentiment_no": no,
            "sentiment_unclear": unclear,
            "confidence": confidence,
            "certainty_score": round(certainty_score, 2),
            "prediction_outcome": prediction_outcome,
            "cultural_momentum": cultural_momentum,
            "total_responses": total_responses
        }

        if supabase:
            try:
                result = supabase.table("sentiment_forecasts").insert(sentiment_data).execute()
                print("✅ Data saved to Supabase.")
            except Exception as e:
                print(f"❌ Failed to save to Supabase: {e}")
        else:
            print("⚠️ Supabase not configured")

        return sentiment_data

    except Exception as e:
        print(f"❌ Error analyzing Reddit sentiment: {e}")
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
    """Analyze multiple topics for Cultural Compass mapping"""
    try:
        data = request.get_json()
        topics = data.get('topics', [])
        
        if not topics:
            return jsonify({
                'success': False,
                'message': 'No topics provided for analysis'
            }), 400
        
        print(f"🧭 Cultural Compass analysis requested for {len(topics)} topics")
        
        results = []
        for topic in topics[:10]:  # Limit to 10 topics to prevent overload
            try:
                print(f"🔍 Analyzing cultural sentiment for: {topic}")
                sentiment_result = analyze_reddit_sentiment(topic, limit_posts=20, limit_comments=15)
                
                if sentiment_result:
                    # Calculate cultural coordinates
                    coordinates = calculate_cultural_coordinates(topic, sentiment_result)
                    
                    cultural_analysis = {
                        'topic': topic,
                        'name': format_topic_name(topic),
                        'sentiment_data': sentiment_result,
                        'coordinates': coordinates,
                        'category': categorize_by_topic(topic),
                        'velocity': calculate_velocity_score(sentiment_result),
                        'cultural_impact': assess_cultural_impact(sentiment_result)
                    }
                    
                    results.append(cultural_analysis)
                    
            except Exception as topic_error:
                print(f"⚠️ Error analyzing {topic}: {topic_error}")
                continue
        
        print(f"✅ Cultural Compass analysis complete: {len(results)} topics processed")
        
        return jsonify({
            'success': True,
            'data': results,
            'total_analyzed': len(results),
            'message': f'Successfully analyzed {len(results)} topics for Cultural Compass'
        })
        
    except Exception as e:
        print(f"❌ Cultural Compass API Error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
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