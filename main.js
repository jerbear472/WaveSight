import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// 1. Supabase config
const supabase = createClient(
  'https://artdirswzxxskcdvstse.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGRpcnN3enh4c2tjZHZzdHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDEyNzIsImV4cCI6MjA2NjYxNzI3Mn0.EMe92Rv83KHZajS155vH8PyZZWWD4TuzkCeR3UwGVHo'
);

// 2. YouTube config
const YOUTUBE_;
const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=5&regionCode=US&key=${YOUTUBE_API_KEY}`;

async function fetchYouTubeTrends() {
  const response = await fetch(url);
  const data = await response.json();

  for (const item of data.items) {
    const video = {
      video_id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      published_at: item.snippet.publishedAt
    };

    const { error } = await supabase.from('youtube_trends').insert(video);
    if (error) console.error('❌ Error inserting:', error.message);
    else console.log('✅ Inserted:', video.title);
  }
}

fetchYouTubeTrends();