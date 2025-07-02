
import time
import schedule
import threading
from youtube_alert_system import YouTubeAlertSystem
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AlertScheduler:
    def __init__(self):
        """Initialize the alert scheduler"""
        self.alert_system = YouTubeAlertSystem()
        self.is_running = False
        
    def quick_scan(self):
        """Run a quick alert scan (every 15 minutes)"""
        logger.info("⚡ Running quick alert scan...")
        self.alert_system.run_alert_scan()
        
    def deep_scan(self):
        """Run a comprehensive deep scan (hourly)"""
        logger.info("🔍 Running deep alert scan...")
        # Update criteria for more sensitive detection
        self.alert_system.update_criteria(
            min_view_count=25000,
            min_wave_score=0.5,
            max_hours_old=6
        )
        self.alert_system.run_alert_scan()
        
        # Reset to normal criteria
        self.alert_system.update_criteria(
            min_view_count=100000,
            min_wave_score=0.7,
            max_hours_old=24
        )
        
    def daily_report(self):
        """Generate daily alert summary"""
        logger.info("📊 Generating daily alert report...")
        alerts = self.alert_system.get_recent_alerts(hours=24)
        
        critical_count = len([a for a in alerts if a['severity'] == 'CRITICAL'])
        high_count = len([a for a in alerts if a['severity'] == 'HIGH'])
        
        logger.info(f"📈 Daily Summary: {len(alerts)} total alerts")
        logger.info(f"   🔥 Critical: {critical_count}")
        logger.info(f"   ⚠️ High: {high_count}")
        
    def start_scheduler(self):
        """Start the alert scheduling system"""
        self.is_running = True
        
        # Schedule different types of scans
        schedule.every(15).minutes.do(self.quick_scan)
        schedule.every().hour.do(self.deep_scan)
        schedule.every().day.at("09:00").do(self.daily_report)
        
        logger.info("🚀 Alert scheduler started")
        logger.info("   ⚡ Quick scans: Every 15 minutes")
        logger.info("   🔍 Deep scans: Every hour")
        logger.info("   📊 Daily reports: 9:00 AM")
        
        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
            
    def stop_scheduler(self):
        """Stop the alert scheduling system"""
        self.is_running = False
        logger.info("⏹️ Alert scheduler stopped")

def run_continuous_monitoring():
    """Run the alert system in continuous monitoring mode"""
    scheduler = AlertScheduler()
    
    try:
        # Start in a separate thread to allow for graceful shutdown
        scheduler_thread = threading.Thread(target=scheduler.start_scheduler)
        scheduler_thread.daemon = True
        scheduler_thread.start()
        
        logger.info("✅ Continuous monitoring started. Press Ctrl+C to stop.")
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("🛑 Shutdown requested...")
        scheduler.stop_scheduler()
        
if __name__ == "__main__":
    run_continuous_monitoring()
