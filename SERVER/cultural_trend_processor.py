
import os
import requests
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from trend_categorizer import TrendCategorizer, process_cultural_trends

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

def fetch_youtube_data():
    """Fetch recent YouTube trend data from database"""
    try:
        # Get data from last 7 days
        week_ago = datetime.now() - timedelta(days=7)
        
        response = supabase.table("youtube_trends")\
            .select("*")\
            .gte("published_at", week_ago.isoformat())\
            .order("published_at", desc=True)\
            .execute()
        
        print(f"📺 Fetched {len(response.data)} YouTube videos from last 7 days")
        return response.data
    
    except Exception as e:
        print(f"❌ Error fetching YouTube data: {e}")
        return []

def fetch_reddit_sentiment_data():
    """Fetch Reddit sentiment data via sentiment server"""
    try:
        # Call local sentiment analysis server
        sentiment_url = "http://0.0.0.0:5001/api/analyze-sentiment"
        
        # Analyze multiple trending topics
        topics = [
            "artificial intelligence AI",
            "cryptocurrency bitcoin",
            "fashion streetwear",
            "gaming esports",
            "wellness mindfulness"
        ]
        
        sentiment_results = {}
        
        for topic in topics:
            try:
                response = requests.post(sentiment_url, 
                    json={"topic": topic, "limit": 50}, 
                    timeout=30)
                
                if response.ok:
                    data = response.json()
                    if data.get('success'):
                        sentiment_results[topic] = data.get('data', {})
                        print(f"📊 Got sentiment for: {topic}")
                
            except Exception as topic_error:
                print(f"⚠️ Error analyzing {topic}: {topic_error}")
                continue
        
        print(f"🧠 Collected sentiment data for {len(sentiment_results)} topics")
        return sentiment_results
    
    except Exception as e:
        print(f"❌ Error fetching Reddit sentiment: {e}")
        return {}

def save_trend_insights(insights):
    """Save processed trend insights to database"""
    try:
        if not insights:
            print("ℹ️ No insights to save")
            return
        
        # Prepare data for insertion
        formatted_insights = []
        for insight in insights:
            formatted_insight = {
                'trend_name': insight['trend_name'],
                'category': insight['category'],
                'total_videos': insight['total_videos'],
                'total_reach': insight['total_reach'],
                'engagement_rate': insight['engagement_rate'],
                'wave_score': insight['wave_score'],
                'sentiment_score': insight['sentiment_score'],
                'trend_score': insight['trend_score'],
                'data_sources': json.dumps(insight['data_sources']),
                'analysis_date': datetime.now().isoformat(),
                'top_video_title': insight.get('top_content', {}).get('title', '') if insight.get('top_content') else '',
                'top_video_views': insight.get('top_content', {}).get('views', 0) if insight.get('top_content') else 0
            }
            formatted_insights.append(formatted_insight)
        
        # Insert into database
        response = supabase.table("trend_insights")\
            .upsert(formatted_insights, on_conflict='trend_name,analysis_date')\
            .execute()
        
        print(f"✅ Saved {len(formatted_insights)} trend insights to database")
        return response.data
    
    except Exception as e:
        print(f"❌ Error saving trend insights: {e}")
        return None

def run_cultural_trend_analysis():
    """Main function to run comprehensive cultural trend analysis"""
    print("🌊 Starting Cultural Trend Analysis...")
    print("=" * 50)
    
    # Step 1: Fetch YouTube data
    print("📺 Step 1: Fetching YouTube trend data...")
    youtube_data = fetch_youtube_data()
    
    if not youtube_data:
        print("❌ No YouTube data available")
        return
    
    # Step 2: Fetch Reddit sentiment data
    print("🧠 Step 2: Fetching Reddit sentiment data...")
    reddit_sentiment = fetch_reddit_sentiment_data()
    
    # Step 3: Process and categorize trends
    print("🏷️ Step 3: Processing and categorizing cultural trends...")
    trend_insights = process_cultural_trends(youtube_data, reddit_sentiment)
    
    if not trend_insights:
        print("⚠️ No trend insights generated")
        return
    
    # Step 4: Save to database
    print("💾 Step 4: Saving trend insights...")
    saved_insights = save_trend_insights(trend_insights)
    
    # Step 5: Summary
    print("\n📊 Cultural Trend Analysis Complete!")
    print("=" * 50)
    print(f"📺 YouTube videos analyzed: {len(youtube_data)}")
    print(f"🧠 Reddit sentiment topics: {len(reddit_sentiment)}")
    print(f"🏷️ Cultural trends identified: {len(trend_insights)}")
    print(f"💾 Insights saved: {len(saved_insights) if saved_insights else 0}")
    
    # Print top trends
    if trend_insights:
        print("\n🔥 Top Cultural Trends:")
        sorted_trends = sorted(trend_insights, key=lambda x: x['wave_score'], reverse=True)
        for i, trend in enumerate(sorted_trends[:5], 1):
            print(f"{i}. {trend['trend_name']} (Wave Score: {trend['wave_score']:.3f})")
    
    return trend_insights

if __name__ == "__main__":
    if not supabase:
        print("❌ Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY")
        exit(1)
    
    # Run the analysis
    run_cultural_trend_analysis()
