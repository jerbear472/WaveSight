#!/bin/bash

# WaveSight TikTok Integration Startup Script

echo "🎵 Starting WaveSight TikTok Integration..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "SERVER/tiktok-server.js" ]; then
    echo "❌ Please run this script from the WaveSight root directory"
    exit 1
fi

# Check environment variables
if [ -z "$TIKTOK_CLIENT_KEY" ] || [ -z "$TIKTOK_CLIENT_SECRET" ]; then
    echo "⚠️  TikTok API credentials not set. The server will run in demo mode."
    echo "💡 To enable TikTok integration:"
    echo "   export TIKTOK_CLIENT_KEY='your_client_key'"
    echo "   export TIKTOK_CLIENT_SECRET='your_client_secret'"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "SERVER/node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    cd SERVER
    npm install
    cd ..
    echo "✅ Dependencies installed"
fi

# Check if Redis is running (optional)
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running (token caching enabled)"
    else
        echo "⚠️  Redis not running (using memory storage for tokens)"
    fi
else
    echo "⚠️  Redis not installed (using memory storage for tokens)"
fi

# Start the TikTok server
echo "🚀 Starting TikTok API server on port 5002..."
cd SERVER
node tiktok-server.js &
TIKTOK_PID=$!

# Start the main WaveSight dashboard
echo "🌊 Starting main WaveSight dashboard..."
cd ..
python3 -m http.server 8080 &
DASHBOARD_PID=$!

echo ""
echo "✅ WaveSight with TikTok integration is now running!"
echo ""
echo "🔗 Dashboard: http://localhost:8080"
echo "🎵 TikTok API: http://localhost:5002"
echo "🏥 Health Check: http://localhost:5002/health"
echo ""
echo "📊 TikTok Integration Features:"
echo "   • Viral trend detection across 5+ categories"
echo "   • Real-time growth analysis and viral scoring"
echo "   • Automatic category trend updates"
echo "   • Cross-platform correlation with YouTube"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down WaveSight services..."
    kill $TIKTOK_PID 2>/dev/null
    kill $DASHBOARD_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait