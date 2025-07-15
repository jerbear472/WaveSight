#!/bin/bash

# WaveScope Setup Script
# Sets up the complete WaveScope Timeline environment

echo "🌊 WaveScope Timeline Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

echo -e "${GREEN}✅ Python 3 found${NC}"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is required but not installed${NC}"
    echo "Please install pip3 and try again"
    exit 1
fi

echo -e "${GREEN}✅ pip3 found${NC}"

# Install Python dependencies
echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
pip3 install -r requirements-python.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi

# Check if Node.js is installed (for the frontend)
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js found${NC}"
    
    # Install Node.js dependencies if package.json exists
    if [ -f "package.json" ]; then
        echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
        npm install
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
        else
            echo -e "${YELLOW}⚠️ Some Node.js dependencies may have failed${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Node.js not found - frontend features may be limited${NC}"
fi

# Check for .env file
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
else
    echo -e "${YELLOW}⚠️ .env file not found${NC}"
    echo "Creating .env template..."
    
    cat > .env << EOL
# WaveScope Environment Configuration
# Copy this file and fill in your actual values

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key_here

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Additional APIs
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Server Configuration
PORT=5000
NODE_ENV=development
EOL
    
    echo -e "${BLUE}📝 .env template created${NC}"
    echo -e "${YELLOW}Please edit .env file with your actual API keys${NC}"
fi

# Make scripts executable
chmod +x SERVER/run-wavescope-pipeline.py
chmod +x SERVER/youtube-supabase-enhanced.py

# Create log directory if it doesn't exist
mkdir -p logs

echo ""
echo -e "${GREEN}🎉 WaveScope Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Edit .env file with your API keys"
echo "2. Set up your Supabase database with CONFIG/enhanced_supabase_schema.sql"
echo "3. Test the pipeline:"
echo -e "   ${YELLOW}python3 SERVER/run-wavescope-pipeline.py --test${NC}"
echo "4. Run the complete pipeline:"
echo -e "   ${YELLOW}python3 SERVER/run-wavescope-pipeline.py${NC}"
echo "5. Open your dashboard:"
echo -e "   ${YELLOW}https://wavesight-9oo7.onrender.com${NC}"
echo ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo "- Enhanced schema: CONFIG/enhanced_supabase_schema.sql"
echo "- Pipeline modules: SERVER/*.py and SERVER/*.js"
echo "- Frontend: SCRIPTS/wavescope-timeline-d3.js"
echo ""
echo -e "${BLUE}🌊 Happy trend tracking!${NC}"