
console.log('🔍 Testing environment variables:');
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'SET ✅' : 'MISSING ❌');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET ✅' : 'MISSING ❌');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET ✅' : 'MISSING ❌');

if (process.env.YOUTUBE_API_KEY) {
  console.log('YouTube API key length:', process.env.YOUTUBE_API_KEY.length);
  console.log('YouTube API key starts with:', process.env.YOUTUBE_API_KEY.substring(0, 10) + '...');
}
