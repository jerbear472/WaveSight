#!/usr/bin/env python3
"""
Enhanced YouTube to Supabase Integration for WaveScope Timeline
Integrates with the advanced pipeline and WaveScore generation
"""

import os
import datetime
import json
import time
from typing import List, Dict, Optional
from googleapiclient.discovery import build
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class YouTubeSupabaseIntegrator:
    def __init__(self):
        """Initialize the YouTube to Supabase integrator with enhanced features"""
        
        # YouTube API setup
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        if not self.youtube_api_key:
            raise ValueError("YOUTUBE_API_KEY not found in environment variables")
        
        self.youtube = build("youtube", "v3", developerKey=self.youtube_api_key)
        
        # Supabase setup
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
            
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Category mapping for WaveScope
        self.category_mapping = {
            "1": "Film & Animation",
            "2": "Autos & Vehicles", 
            "10": "Music",
            "15": "Pets & Animals",
            "17": "Sports",
            "19": "Travel & Events",
            "20": "Gaming",
            "22": "People & Blogs",
            "23": "Comedy",
            "24": "Entertainment",
            "25": "News & Politics",
            "26": "Howto & Style",
            "27": "Education",
            "28": "Science & Technology",
            "29": "Nonprofits & Activism"
        }
        
        # WaveScope category normalization
        self.wavescope_categories = {
            "Science & Technology": "Technology",
            "Gaming": "Gaming", 
            "Music": "Music",
            "Entertainment": "Entertainment",
            "News & Politics": "News & Politics",
            "Education": "Education",
            "Comedy": "Entertainment",
            "Film & Animation": "Entertainment",
            "Sports": "Sports"
        }
        
        logger.info("🚀 Enhanced YouTube-Supabase Integrator initialized")

    def fetch_trending_videos(self, region="US", max_results=50, category_id=None):
        """Fetch trending videos with enhanced metadata"""
        logger.info(f"📺 Fetching trending videos for region: {region}")
        
        try:
            # Get trending videos
            request = self.youtube.videos().list(
                part="snippet,statistics,contentDetails",
                chart="mostPopular",
                maxResults=max_results,
                regionCode=region,
                videoCategoryId=category_id
            )
            response = request.execute()
            videos = response.get("items", [])
            
            logger.info(f"✅ Fetched {len(videos)} trending videos")
            return videos
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch trending videos: {e}")
            return []

    def fetch_video_statistics(self, video_ids: List[str]):
        """Fetch detailed statistics for videos"""
        if not video_ids:
            return {}
            
        try:
            # Batch video statistics request
            request = self.youtube.videos().list(
                part="statistics,contentDetails",
                id=",".join(video_ids)
            )
            response = request.execute()
            
            # Create lookup dict
            stats_lookup = {}
            for item in response.get("items", []):
                stats_lookup[item["id"]] = {
                    "statistics": item.get("statistics", {}),
                    "contentDetails": item.get("contentDetails", {})
                }
            
            return stats_lookup
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch video statistics: {e}")
            return {}

    def calculate_wavescope_metrics(self, video_data: Dict, statistics: Dict) -> Dict:
        """Calculate WaveScope-compatible metrics"""
        
        # Extract basic stats
        stats = statistics.get("statistics", {})
        content = statistics.get("contentDetails", {})
        
        view_count = int(stats.get("viewCount", 0))
        like_count = int(stats.get("likeCount", 0))
        comment_count = int(stats.get("commentCount", 0))
        
        # Calculate engagement metrics
        engagement_rate = 0
        if view_count > 0:
            engagement_rate = ((like_count + comment_count) / view_count) * 100
        
        # Calculate time-based metrics
        published_date = datetime.datetime.fromisoformat(
            video_data["snippet"]["publishedAt"].replace('Z', '+00:00')
        )
        hours_old = (datetime.datetime.now(datetime.timezone.utc) - published_date).total_seconds() / 3600
        
        # Growth rate (views per hour)
        growth_rate = view_count / max(hours_old, 1)
        
        # Viral velocity calculation
        viral_velocity = min(100, (growth_rate / 10000) * 100) if growth_rate > 0 else 0
        
        # Basic trend score calculation
        trend_score = min(100, (
            (engagement_rate * 0.4) +
            (viral_velocity * 0.3) +
            (min(view_count / 1000000, 1) * 30) +  # Reach factor
            (min(hours_old / 24, 1) * 10)  # Recency factor
        ))
        
        return {
            "view_count": view_count,
            "like_count": like_count,
            "comment_count": comment_count,
            "engagement_rate": round(engagement_rate, 4),
            "growth_rate": round(growth_rate, 2),
            "viral_velocity": round(viral_velocity, 2),
            "trend_score": round(trend_score, 2),
            "hours_old": round(hours_old, 2)
        }

    def normalize_category(self, category_id: str) -> str:
        """Normalize YouTube category to WaveScope category"""
        youtube_category = self.category_mapping.get(category_id, "General")
        return self.wavescope_categories.get(youtube_category, "General")

    def insert_to_raw_ingestion(self, video_data: Dict, statistics: Dict) -> bool:
        """Insert video data into raw_ingestion_data table"""
        
        try:
            snippet = video_data["snippet"]
            video_id = video_data["id"]
            
            # Calculate WaveScope metrics
            metrics = self.calculate_wavescope_metrics(video_data, statistics)
            
            # Normalize category
            category = self.normalize_category(snippet.get("categoryId", "1"))
            
            # Prepare raw ingestion data
            raw_data = {
                "source": "youtube",
                "platform_source": "youtube", 
                "content_id": video_id,
                "title": snippet["title"],
                "category": category,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "published_at": snippet["publishedAt"],
                "raw_metrics": {
                    "view_count": metrics["view_count"],
                    "like_count": metrics["like_count"], 
                    "comment_count": metrics["comment_count"],
                    "engagement_rate": metrics["engagement_rate"]
                },
                "normalized_metrics": {
                    "reach_estimate": metrics["view_count"],
                    "engagement_score": metrics["engagement_rate"],
                    "growth_rate": metrics["growth_rate"],
                    "viral_velocity": metrics["viral_velocity"]
                },
                "metadata": {
                    "channel_id": snippet["channelId"],
                    "channel_title": snippet["channelTitle"],
                    "description": snippet.get("description", "")[:500],  # Truncate
                    "thumbnails": snippet.get("thumbnails", {}),
                    "duration": statistics.get("contentDetails", {}).get("duration"),
                    "youtube_category_id": snippet.get("categoryId")
                }
            }
            
            # Insert into raw_ingestion_data table
            result = self.supabase.table("raw_ingestion_data").upsert(
                raw_data, 
                on_conflict="content_id,source,timestamp"
            ).execute()
            
            if result.data:
                logger.info(f"✅ Inserted to raw_ingestion: {snippet['title'][:50]}...")
                return True
            else:
                logger.warning(f"⚠️ Failed to insert: {snippet['title'][:50]}...")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error inserting video data: {e}")
            return False

    def insert_to_legacy_table(self, video_data: Dict) -> bool:
        """Insert to legacy youtube_trends table for backward compatibility"""
        
        try:
            snippet = video_data["snippet"]
            video_id = video_data["id"]
            
            # Check if already exists
            existing = self.supabase.table("youtube_trends").select("id").eq("video_id", video_id).execute()
            
            if not existing.data:
                legacy_data = {
                    "video_id": video_id,
                    "title": snippet["title"],
                    "description": snippet.get("description", "")[:1000],  # Truncate for legacy
                    "published_at": snippet["publishedAt"],
                    "channel_id": snippet["channelId"],
                    "channel_title": snippet["channelTitle"]
                }
                
                self.supabase.table("youtube_trends").insert(legacy_data).execute()
                logger.info(f"✅ Inserted to legacy table: {snippet['title'][:50]}...")
                return True
            else:
                logger.info(f"⚠️ Already exists in legacy table: {snippet['title'][:50]}...")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error inserting to legacy table: {e}")
            return False

    def process_videos_batch(self, videos: List[Dict]) -> Dict:
        """Process a batch of videos with enhanced pipeline integration"""
        
        if not videos:
            return {"processed": 0, "raw_inserted": 0, "legacy_inserted": 0}
        
        logger.info(f"🔄 Processing batch of {len(videos)} videos...")
        
        # Get video IDs for statistics batch request
        video_ids = [video["id"] for video in videos]
        
        # Fetch detailed statistics
        statistics_lookup = self.fetch_video_statistics(video_ids)
        
        processed = 0
        raw_inserted = 0
        legacy_inserted = 0
        
        for video in videos:
            video_id = video["id"]
            stats = statistics_lookup.get(video_id, {})
            
            try:
                # Insert to enhanced raw ingestion table
                if self.insert_to_raw_ingestion(video, stats):
                    raw_inserted += 1
                
                # Insert to legacy table for backward compatibility
                if self.insert_to_legacy_table(video):
                    legacy_inserted += 1
                
                processed += 1
                
                # Rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"❌ Error processing video {video_id}: {e}")
        
        logger.info(f"✅ Batch processed: {processed} videos, {raw_inserted} raw insertions, {legacy_inserted} legacy insertions")
        
        return {
            "processed": processed,
            "raw_inserted": raw_inserted, 
            "legacy_inserted": legacy_inserted
        }

    def fetch_by_categories(self, categories: List[str] = None, region="US", max_per_category=20) -> Dict:
        """Fetch trending videos by multiple categories"""
        
        if categories is None:
            # Focus on WaveScope-relevant categories
            categories = ["28", "20", "24", "10", "25"]  # Tech, Gaming, Entertainment, Music, News
        
        all_results = {
            "total_processed": 0,
            "total_raw_inserted": 0,
            "total_legacy_inserted": 0,
            "by_category": {}
        }
        
        for category_id in categories:
            category_name = self.category_mapping.get(category_id, f"Category_{category_id}")
            logger.info(f"📂 Fetching {category_name} (ID: {category_id})")
            
            try:
                videos = self.fetch_trending_videos(
                    region=region,
                    max_results=max_per_category,
                    category_id=category_id
                )
                
                if videos:
                    results = self.process_videos_batch(videos)
                    all_results["by_category"][category_name] = results
                    all_results["total_processed"] += results["processed"]
                    all_results["total_raw_inserted"] += results["raw_inserted"]
                    all_results["total_legacy_inserted"] += results["legacy_inserted"]
                    
                # Rate limiting between categories
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Error processing category {category_name}: {e}")
        
        return all_results

    def run_enhanced_ingestion(self, region="US", include_categories=True) -> Dict:
        """Run the complete enhanced ingestion process"""
        
        logger.info("🚀 Starting Enhanced YouTube Ingestion for WaveScope Timeline")
        start_time = time.time()
        
        try:
            if include_categories:
                # Fetch by categories for better data diversity
                results = self.fetch_by_categories(region=region)
            else:
                # Fetch general trending
                videos = self.fetch_trending_videos(region=region, max_results=50)
                results = self.process_videos_batch(videos)
                results = {
                    "total_processed": results["processed"],
                    "total_raw_inserted": results["raw_inserted"],
                    "total_legacy_inserted": results["legacy_inserted"],
                    "by_category": {"general": results}
                }
            
            elapsed_time = time.time() - start_time
            
            logger.info("🎉 Enhanced YouTube Ingestion Complete!")
            logger.info(f"📊 Total Videos Processed: {results['total_processed']}")
            logger.info(f"📊 Raw Ingestion Inserts: {results['total_raw_inserted']}")
            logger.info(f"📊 Legacy Table Inserts: {results['total_legacy_inserted']}")
            logger.info(f"⏱️ Processing Time: {elapsed_time:.2f} seconds")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Enhanced ingestion failed: {e}")
            raise

def main():
    """Main execution function"""
    
    try:
        # Initialize integrator
        integrator = YouTubeSupabaseIntegrator()
        
        # Run enhanced ingestion
        results = integrator.run_enhanced_ingestion(
            region="US",
            include_categories=True
        )
        
        # Print summary
        print("\n" + "="*50)
        print("📈 WAVESCOPE INGESTION SUMMARY")
        print("="*50)
        print(f"✅ Videos Processed: {results['total_processed']}")
        print(f"📊 Raw Data Inserted: {results['total_raw_inserted']}")
        print(f"🔄 Legacy Records: {results['total_legacy_inserted']}")
        print("\n📂 By Category:")
        
        for category, stats in results.get("by_category", {}).items():
            print(f"   {category}: {stats['processed']} videos")
        
        print("="*50)
        print("🌊 Ready for WaveScope Timeline Processing!")
        print("="*50)
        
    except Exception as e:
        logger.error(f"❌ Main execution failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())