import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS = process.env.MAX_RESULTS || 50;
const REGIONS = (process.env.REGIONS || 'US,GB,CA').split(',');

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_ANON_KEY:', SUPABASE_KEY ? '✅' : '❌');
  console.error('   YOUTUBE_API_KEY:', YOUTUBE_API_KEY ? '✅' : '❌');
  console.error('📝 Please check your .env file');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchYouTubeTrends() {
  console.log(`🚀 Starting YouTube trends fetch for regions: ${REGIONS.join(', ')}`);
  
  let totalInserted = 0;
  let totalErrors = 0;

  // Fetch trends for each region
  for (const region of REGIONS) {
    try {
      console.log(`\n📍 Fetching trends for ${region}...`);
      
      // YouTube API URL with additional fields
      const url = `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet,statistics&` +
        `chart=mostPopular&` +
        `maxResults=${MAX_RESULTS}&` +
        `regionCode=${region}&` +
        `key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        console.log(`⚠️  No videos found for ${region}`);
        continue;
      }

      // Process videos in batch
      const videos = data.items.map(item => ({
        video_id: item.id,
        title: item.snippet.title,
        description: item.snippet.description?.substring(0, 2000), // Limit description
        channel_title: item.snippet.channelTitle,
        published_at: item.snippet.publishedAt,
        thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        view_count: parseInt(item.statistics?.viewCount || 0),
        like_count: parseInt(item.statistics?.likeCount || 0),
        comment_count: parseInt(item.statistics?.commentCount || 0),
        region_code: region,
        fetched_at: new Date().toISOString()
      }));

      // Batch upsert to Supabase
      const { error } = await supabase
        .from('youtube_trends')
        .upsert(videos, { 
          onConflict: 'video_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Database error for ${region}:`, error.message);
        totalErrors += videos.length;
      } else {
        console.log(`✅ Inserted ${videos.length} videos from ${region}`);
        totalInserted += videos.length;
        
        // Log top 3 trending videos
        console.log(`\n📊 Top trending in ${region}:`);
        videos.slice(0, 3).forEach((video, index) => {
          console.log(`  ${index + 1}. ${video.title} (${video.view_count.toLocaleString()} views)`);
        });
      }

      // Small delay between regions to avoid rate limiting
      if (REGIONS.indexOf(region) < REGIONS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Error processing ${region}:`, error.message);
      totalErrors++;
    }
  }

  // Summary
  console.log('\n📈 Fetch Summary:');
  console.log(`  ✅ Successfully inserted: ${totalInserted} videos`);
  console.log(`  ❌ Errors: ${totalErrors}`);
  console.log(`  🌍 Regions processed: ${REGIONS.length}`);
}

// Run the fetcher
fetchYouTubeTrends()
  .then(() => {
    console.log('\n✨ YouTube trends fetch completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });