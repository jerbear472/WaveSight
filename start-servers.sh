#!/bin/bash

# WaveSight Server Startup Script
echo "🚀 Starting WaveSight Dashboard Servers..."

# Kill any existing processes on the ports
echo "🧹 Cleaning up existing processes..."
pkill -f "python3 -m http.server 8080" 2>/dev/null
pkill -f "node.*youtube-api.js" 2>/dev/null
pkill -f "node.*tiktok-server.js" 2>/dev/null
sleep 2

# Start YouTube API server
echo "📺 Starting YouTube API Server on port 5003..."
cd SERVER
nohup node youtube-api.js > youtube-api.log 2>&1 &
YOUTUBE_PID=$!

# Start TikTok Integration server
echo "🎵 Starting TikTok Integration Server on port 5002..."
nohup node tiktok-server.js > tiktok-server.log 2>&1 &
TIKTOK_PID=$!
cd ..

# Wait for API servers to start
sleep 4

# Start web server for dashboard
echo "🌐 Starting Web Server on port 8080..."
nohup python3 -m http.server 8080 > web-server.log 2>&1 &
WEB_PID=$!

# Wait for servers to start
sleep 2

# Check if servers are running
echo "🔍 Checking server status..."

# Check YouTube API
if curl -s http://localhost:5003/api/health > /dev/null; then
    echo "✅ YouTube API Server: Running on http://localhost:5003"
else
    echo "❌ YouTube API Server: Failed to start"
fi

# Check TikTok Integration
if curl -s http://localhost:5002/health > /dev/null; then
    echo "✅ TikTok Integration Server: Running on http://localhost:5002"
else
    echo "❌ TikTok Integration Server: Failed to start"
fi

# Check Web Server
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Web Server: Running on http://localhost:8080"
else
    echo "❌ Web Server: Failed to start"
fi

echo ""
echo "🎯 WaveSight Dashboard URLs:"
echo "   📊 Dashboard: http://localhost:8080"
echo "   🔗 YouTube API Health: http://localhost:5003/api/health"
echo "   🎵 TikTok API Health: http://localhost:5002/health"
echo "   📈 YouTube Trending: http://localhost:5003/api/youtube-trending"
echo "   🔥 TikTok Viral Content: http://localhost:5002/api/viral-content"
echo ""
echo "📝 Server Logs:"
echo "   YouTube API: SERVER/youtube-api.log"
echo "   TikTok Integration: SERVER/tiktok-server.log"
echo "   Web Server: web-server.log"
echo ""
echo "⏹️ To stop servers: pkill -f 'python3 -m http.server' && pkill -f 'node.*youtube-api' && pkill -f 'node.*tiktok-server'"
echo ""
echo "🚀 Ready! Open http://localhost:8080 in your browser to view the dashboard."
echo "🎵 TikTok integration active - viral trends will appear in the timeline!"