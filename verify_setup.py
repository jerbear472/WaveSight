#!/usr/bin/env python3
"""
WaveSight Setup Verification Script
Tests that all components are working correctly
"""

import os
import sys
import importlib
from pathlib import Path

def check_imports():
    """Check that all required Python packages can be imported"""
    print("🔍 Checking Python imports...")
    
    required_packages = [
        ('flask', 'Flask web framework'),
        ('flask_cors', 'Flask CORS support'),
        ('praw', 'Reddit API client'),
        ('openai', 'OpenAI API client'),
        ('supabase', 'Supabase client'),
        ('vaderSentiment.vaderSentiment', 'VADER sentiment analyzer'),
        ('requests', 'HTTP requests library'),
        ('dotenv', 'Environment variable loader')
    ]
    
    all_good = True
    for package, description in required_packages:
        try:
            importlib.import_module(package)
            print(f"✅ {package} - {description}")
        except ImportError as e:
            print(f"❌ {package} - {description} (Error: {e})")
            all_good = False
    
    return all_good

def check_files():
    """Check that all required files exist"""
    print("\n📁 Checking file structure...")
    
    required_files = [
        ('.env', 'Environment configuration file'),
        ('CONFIG/supabase_schema.sql', 'Database schema'),
        ('SERVER/sentiment_server.py', 'Sentiment analysis server'),
        ('SCRIPTS/config.js', 'Frontend configuration'),
        ('SCRIPTS/script.js', 'Main dashboard script'),
        ('index.html', 'Main dashboard page'),
        ('sentiment-dashboard.html', 'Sentiment analysis page'),
        ('cultural-compass.html', 'Cultural compass page'),
        ('style.css', 'Main stylesheet')
    ]
    
    all_good = True
    for file_path, description in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path} - {description}")
        else:
            print(f"❌ {file_path} - {description} (Missing)")
            all_good = False
    
    return all_good

def check_env_template():
    """Check that .env file has the correct structure"""
    print("\n⚙️ Checking environment configuration...")
    
    env_file = Path('.env')
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'YOUTUBE_API_KEY',
        'REDDIT_CLIENT_ID',
        'REDDIT_CLIENT_SECRET'
    ]
    
    env_content = env_file.read_text()
    all_good = True
    
    for var in required_vars:
        if f"{var}=" in env_content:
            if f"{var}=your-" in env_content or f"{var}=https://your-" in env_content:
                print(f"⚠️ {var} - Template value (needs configuration)")
            else:
                print(f"✅ {var} - Configured")
        else:
            print(f"❌ {var} - Missing from .env file")
            all_good = False
    
    return all_good

def test_sentiment_analysis():
    """Test sentiment analysis functionality with mock data"""
    print("\n🧠 Testing sentiment analysis...")
    
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
        
        test_texts = [
            "I love this new technology!",
            "This is terrible and awful",
            "I'm not sure about this trend"
        ]
        
        for text in test_texts:
            score = analyzer.polarity_scores(text)
            print(f"✅ '{text}' → {score['compound']:.2f}")
        
        return True
    except Exception as e:
        print(f"❌ Sentiment analysis test failed: {e}")
        return False

def test_wave_score():
    """Test wave score calculation"""
    print("\n🌊 Testing Wave Score calculation...")
    
    try:
        # Import the wave score module
        sys.path.append('SERVER')
        from wave_score import calculate_wave_score
        
        # Test with sample data
        test_score = calculate_wave_score(
            view_count=1000000,
            last_view_count=500000,
            likes=50000,
            comments=2000,
            sentiment_score=0.7
        )
        
        print(f"✅ Wave Score test: {test_score:.3f}")
        return True
    except Exception as e:
        print(f"❌ Wave Score test failed: {e}")
        return False

def test_server_import():
    """Test that server can be imported without errors"""
    print("\n🖥️ Testing server import...")
    
    try:
        sys.path.append('SERVER')
        # Just test imports, don't start the server
        import sentiment_server
        print("✅ Sentiment server imports successfully")
        return True
    except Exception as e:
        print(f"❌ Server import failed: {e}")
        return False

def main():
    """Run all verification tests"""
    print("🌊 WaveSight Setup Verification")
    print("=" * 40)
    
    tests = [
        ("Python Imports", check_imports),
        ("File Structure", check_files),
        ("Environment Config", check_env_template),
        ("Sentiment Analysis", test_sentiment_analysis),
        ("Wave Score Calculation", test_wave_score),
        ("Server Import", test_server_import)
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
    print("\n📊 Verification Summary")
    print("=" * 40)
    
    passed = 0
    total = len(results)
    
    for test_name, passed_test in results:
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{test_name:<25} {status}")
        if passed_test:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! WaveSight is ready to use.")
        print("\nNext steps:")
        print("1. Configure API keys in .env file")
        print("2. Set up Supabase database with CONFIG/supabase_schema.sql")
        print("3. Start the services:")
        print("   python3 SERVER/sentiment_server.py")
        print("4. Open index.html in your browser")
    else:
        print(f"\n⚠️ {total - passed} tests failed. Check the errors above.")
        print("Run python3 setup.py again if needed.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)