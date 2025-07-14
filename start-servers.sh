#!/bin/bash

# WaveSight Server Startup Script
echo "🚀 Starting WaveSight Dashboard Servers..."

# Kill any existing processes on the ports
echo "🧹 Cleaning up existing processes..."
pkill -f "python3 -m http.server 8080" 2>/dev/null
pkill -f "node.*youtube-api.js" 2>/dev/null
sleep 2

# Start YouTube API server
echo "📺 Starting YouTube API Server on port 5003..."
cd SERVER
nohup node youtube-api.js > youtube-api.log 2>&1 &
YOUTUBE_PID=$!
cd ..

# Wait for API server to start
sleep 3

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

# Check Web Server
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Web Server: Running on http://localhost:8080"
else
    echo "❌ Web Server: Failed to start"
fi

echo ""
echo "🎯 WaveSight Dashboard URLs:"
echo "   📊 Dashboard: http://localhost:8080"
echo "   🔗 API Health: http://localhost:5003/api/health"
echo "   📈 Trending Data: http://localhost:5003/api/youtube-trending"
echo ""
echo "📝 Server Logs:"
echo "   YouTube API: SERVER/youtube-api.log"
echo "   Web Server: web-server.log"
echo ""
echo "⏹️ To stop servers: pkill -f 'python3 -m http.server' && pkill -f 'node.*youtube-api'"
echo ""
echo "🚀 Ready! Open http://localhost:8080 in your browser to view the dashboard."