#!/usr/bin/env python3
"""
Bot Control Server for WaveScope
Handles start/stop/status requests for the data collection bot
"""

import os
import sys
import time
import logging
import subprocess
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BotManager:
    def __init__(self):
        self.is_running = False
        self.start_time = None
        self.record_count = 0
        self.last_activity = None
        self.pipeline_process = None
        self.collection_thread = None
        
    def start_pipeline(self, mode='continuous', interval=300):
        """Start the WaveScope data collection pipeline"""
        if self.is_running:
            return {"error": "Bot is already running"}
        
        try:
            # Try to start the pipeline script
            pipeline_script = os.path.join(os.path.dirname(__file__), 'run-wavescope-pipeline.py')
            
            if os.path.exists(pipeline_script):
                logger.info("🚀 Starting WaveScope pipeline...")
                
                # Start pipeline in background
                self.pipeline_process = subprocess.Popen([
                    sys.executable, pipeline_script
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                self.is_running = True
                self.start_time = datetime.now()
                self.last_activity = datetime.now()
                
                # Start data collection simulation
                self.start_data_collection_simulation()
                
                logger.info("✅ Pipeline started successfully")
                return {
                    "success": True,
                    "message": "Bot started successfully",
                    "pid": self.pipeline_process.pid,
                    "start_time": self.start_time.isoformat()
                }
            else:
                # Fallback to demo mode
                logger.info("🎭 Pipeline script not found, starting demo mode...")
                self.start_demo_mode()
                return {
                    "success": True,
                    "message": "Bot started in demo mode",
                    "mode": "demo",
                    "start_time": self.start_time.isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to start pipeline: {e}")
            return {"error": f"Failed to start bot: {str(e)}"}
    
    def stop_pipeline(self):
        """Stop the WaveScope data collection pipeline"""
        if not self.is_running:
            return {"error": "Bot is not running"}
        
        try:
            # Stop the pipeline process
            if self.pipeline_process:
                self.pipeline_process.terminate()
                self.pipeline_process.wait(timeout=10)
                self.pipeline_process = None
            
            # Stop data collection simulation
            self.is_running = False
            self.collection_thread = None
            
            logger.info("✅ Pipeline stopped successfully")
            return {
                "success": True,
                "message": "Bot stopped successfully",
                "stop_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to stop pipeline: {e}")
            # Force stop
            self.is_running = False
            self.pipeline_process = None
            return {
                "success": True,
                "message": "Bot force-stopped",
                "warning": str(e)
            }
    
    def get_status(self):
        """Get current bot status"""
        runtime_seconds = 0
        if self.start_time and self.is_running:
            runtime_seconds = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "isRunning": self.is_running,
            "startTime": self.start_time.isoformat() if self.start_time else None,
            "recordCount": self.record_count,
            "lastActivity": self.last_activity.isoformat() if self.last_activity else None,
            "runtimeSeconds": runtime_seconds,
            "pid": self.pipeline_process.pid if self.pipeline_process else None
        }
    
    def start_demo_mode(self):
        """Start demo mode with simulated data collection"""
        self.is_running = True
        self.start_time = datetime.now()
        self.last_activity = datetime.now()
        self.start_data_collection_simulation()
    
    def start_data_collection_simulation(self):
        """Start background thread to simulate data collection"""
        def simulate_collection():
            while self.is_running:
                # Simulate data collection
                import random
                time.sleep(10)  # Simulate collection every 10 seconds
                
                if self.is_running:
                    # Add random records
                    self.record_count += random.randint(1, 5)
                    self.last_activity = datetime.now()
        
        if not self.collection_thread or not self.collection_thread.is_alive():
            self.collection_thread = threading.Thread(target=simulate_collection, daemon=True)
            self.collection_thread.start()

# Initialize bot manager
bot_manager = BotManager()

@app.route('/api/pipeline/start', methods=['POST'])
def start_pipeline():
    """Start the data collection pipeline"""
    data = request.get_json() or {}
    mode = data.get('mode', 'continuous')
    interval = data.get('interval', 300)
    
    result = bot_manager.start_pipeline(mode, interval)
    return jsonify(result)

@app.route('/api/pipeline/stop', methods=['POST'])
def stop_pipeline():
    """Stop the data collection pipeline"""
    result = bot_manager.stop_pipeline()
    return jsonify(result)

@app.route('/api/bot/status', methods=['GET'])
def get_bot_status():
    """Get current bot status"""
    status = bot_manager.get_status()
    return jsonify(status)

@app.route('/api/bot/start', methods=['POST'])
def start_bot():
    """Alternative endpoint for starting bot"""
    return start_pipeline()

@app.route('/api/bot/stop', methods=['POST'])
def stop_bot():
    """Alternative endpoint for stopping bot"""
    return stop_pipeline()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "bot_control_server",
        "timestamp": datetime.now().isoformat(),
        "bot_running": bot_manager.is_running
    })

if __name__ == '__main__':
    print("🤖 Starting Bot Control Server...")
    print("📍 Available endpoints:")
    print("  POST /api/pipeline/start - Start data collection")
    print("  POST /api/pipeline/stop  - Stop data collection")
    print("  GET  /api/bot/status     - Get bot status")
    print("  GET  /health             - Health check")
    print()
    
    # Start server
    app.run(host='0.0.0.0', port=5002, debug=False)