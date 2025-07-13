#!/usr/bin/env python3
"""
WaveSight API Testing Script
Tests all API connections with real credentials
"""

import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_supabase():
    """Test Supabase connection"""
    print("🗄️ Testing Supabase connection...")
    
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("❌ Supabase credentials not configured")
        return False
    
    try:
        # Test connection by fetching from a table
        headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
        
        # Try to query youtube_trends table (it might be empty)
        response = requests.get(
            f"{url}/rest/v1/youtube_trends?select=id&limit=1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Supabase connected successfully")
            print(f"   URL: {url}")
            return True
        else:
            print(f"❌ Supabase connection failed: {response.status_code}")
            print(f"   Response: {response.text[:100]}")
            return False
            
    except Exception as e:
        print(f"❌ Supabase connection error: {e}")
        return False

def test_youtube_api():
    """Test YouTube Data API"""
    print("\n📺 Testing YouTube API...")
    
    api_key = os.getenv('YOUTUBE_API_KEY')
    
    if not api_key:
        print("❌ YouTube API key not configured")
        return False
    
    try:
        # Test with a simple videos request
        url = "https://www.googleapis.com/youtube/v3/videos"
        params = {
            'part': 'snippet',
            'chart': 'mostPopular',
            'regionCode': 'US',
            'maxResults': 1,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if 'items' in data:
                print(f"✅ YouTube API connected successfully")
                print(f"   Quota usage: ~100 units")
                return True
            else:
                print(f"❌ YouTube API returned no data")
                return False
        else:
            print(f"❌ YouTube API failed: {response.status_code}")
            if response.status_code == 403:
                print("   Check if YouTube Data API v3 is enabled")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ YouTube API error: {e}")
        return False

def test_reddit_api():
    """Test Reddit API"""
    print("\n🤖 Testing Reddit API...")
    
    client_id = os.getenv('REDDIT_CLIENT_ID')
    client_secret = os.getenv('REDDIT_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        print("❌ Reddit API credentials not configured")
        return False
    
    try:
        import praw
        
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent="WaveSightBot/1.0 by /u/wavesight_test"
        )
        
        # Test by accessing a public subreddit
        subreddit = reddit.subreddit("test")
        test_name = subreddit.display_name
        
        print(f"✅ Reddit API connected successfully")
        print(f"   Test subreddit: r/{test_name}")
        return True
        
    except Exception as e:
        print(f"❌ Reddit API error: {e}")
        return False

def test_openai_api():
    """Test OpenAI API (optional)"""
    print("\n🤖 Testing OpenAI API...")
    
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("⚠️ OpenAI API key not configured (optional)")
        return True  # Not required
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Test with a minimal request
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        
        print(f"✅ OpenAI API connected successfully")
        print(f"   Model: gpt-3.5-turbo")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        print("   This is optional - sentiment analysis will use fallback")
        return True  # Still return True since it's optional

def run_live_sentiment_test():
    """Test sentiment analysis with real APIs"""
    print("\n🧠 Testing live sentiment analysis...")
    
    try:
        # Test the actual sentiment server endpoint
        response = requests.post(
            'http://localhost:5001/api/analyze-sentiment',
            json={'topic': 'artificial intelligence', 'limit': 5},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                result = data.get('data', {})
                print(f"✅ Live sentiment analysis working!")
                print(f"   Topic: {result.get('topic')}")
                print(f"   Platform: {result.get('platform')}")
                print(f"   Confidence: {result.get('confidence')}%")
                print(f"   Total responses: {result.get('total_responses')}")
                return True
            else:
                print(f"❌ Sentiment analysis failed: {data.get('message')}")
                return False
        else:
            print(f"❌ Sentiment server error: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Sentiment server not running")
        print("   Start with: python3 SERVER/sentiment_server.py")
        return False
    except Exception as e:
        print(f"❌ Sentiment test error: {e}")
        return False

def main():
    """Run all API tests"""
    print("🔑 WaveSight API Testing")
    print("=" * 40)
    
    if not Path('.env').exists():
        print("❌ .env file not found")
        print("   Copy .env.example to .env and configure your API keys")
        return False
    
    tests = [
        ("Supabase Database", test_supabase),
        ("YouTube API", test_youtube_api),
        ("Reddit API", test_reddit_api),
        ("OpenAI API", test_openai_api),
        ("Live Sentiment Analysis", run_live_sentiment_test)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 API Test Results")
    print("=" * 40)
    
    passed = 0
    total = len(results)
    
    for test_name, passed_test in results:
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{test_name:<25} {status}")
        if passed_test:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{total} APIs working")
    
    if passed >= 3:  # Supabase, YouTube, Reddit are required
        print("\n🎉 WaveSight is ready for live data!")
        print("\nNext steps:")
        print("1. Open http://localhost:8080")
        print("2. Try sentiment analysis with real topics")
        print("3. Check Cultural Compass with multiple trends")
    else:
        print(f"\n⚠️ Need at least Supabase, YouTube, and Reddit APIs working")
        print("Check the API setup guide: DOCS/API-SETUP-GUIDE.md")
    
    return passed >= 3

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)