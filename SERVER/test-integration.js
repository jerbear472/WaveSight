// Test script to verify WaveSight dashboard integration
const axios = require('axios');

async function testIntegration() {
  console.log('🧪 Testing WaveSight Dashboard Integration...\n');
  
  try {
    // Test 1: API Health Check
    console.log('1. Testing API Health...');
    const healthResponse = await axios.get('http://localhost:5003/api/health');
    console.log('✅ API Health:', healthResponse.data.status);
    console.log('   Services:', healthResponse.data.services);
    
    // Test 2: YouTube Trending Data
    console.log('\n2. Testing YouTube Trending Data...');
    const trendingResponse = await axios.get('http://localhost:5003/api/youtube-trending?maxResults=5');
    console.log('✅ Trending Data Retrieved');
    console.log('   Success:', trendingResponse.data.success);
    console.log('   Data Count:', trendingResponse.data.data.length);
    console.log('   Message:', trendingResponse.data.message);
    
    // Test 3: Sample Data Structure
    console.log('\n3. Sample Trending Video:');
    const sampleVideo = trendingResponse.data.data[0];
    console.log('   Title:', sampleVideo.title);
    console.log('   Category:', sampleVideo.trend_category);
    console.log('   Views:', sampleVideo.view_count.toLocaleString());
    console.log('   Wave Score:', sampleVideo.wave_score);
    console.log('   Platform:', sampleVideo.platform_origin);
    
    // Test 4: Web Server
    console.log('\n4. Testing Web Server...');
    try {
      const webResponse = await axios.get('http://localhost:8080');
      console.log('✅ Web Server: Running');
    } catch (error) {
      console.log('❌ Web Server: Not responding');
    }
    
    console.log('\n🎉 Integration Test Complete!');
    console.log('\n🚀 Ready to use:');
    console.log('   Dashboard: http://localhost:8080');
    console.log('   API: http://localhost:5003');
    
  } catch (error) {
    console.error('❌ Integration Test Failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure servers are running:');
      console.log('   Run: ./start-servers.sh');
    }
  }
}

testIntegration();