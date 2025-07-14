#!/usr/bin/env python3
"""
WaveSight Main Application Entry Point for Render Deployment
Simplified single-service deployment for cloud hosting
"""

import os
import sys
from flask import Flask, render_template, send_from_directory, jsonify
from flask_cors import CORS

# Add SERVER directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'SERVER'))

# Import sentiment server components
try:
    from sentiment_server import create_sentiment_app
    SENTIMENT_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Sentiment server not available: {e}")
    SENTIMENT_AVAILABLE = False

def create_app():
    """Create and configure the Flask application for Render deployment"""
    app = Flask(__name__, 
                static_folder='.',
                template_folder='.')
    
    # Enable CORS for all routes
    CORS(app, origins=['*'])
    
    # Configure for production
    app.config['ENV'] = 'production'
    app.config['DEBUG'] = False
    
    @app.route('/')
    def dashboard():
        """Serve the main dashboard"""
        return send_from_directory('.', 'index.html')
    
    @app.route('/sentiment-dashboard.html')
    def sentiment_dashboard():
        """Serve the sentiment analysis dashboard"""
        return send_from_directory('.', 'sentiment-dashboard.html')
    
    @app.route('/cultural-compass.html')
    def cultural_compass():
        """Serve the cultural compass page"""
        return send_from_directory('.', 'cultural-compass.html')
    
    @app.route('/health')
    def health_check():
        """Health check endpoint for Render"""
        return jsonify({
            'status': 'healthy',
            'service': 'wavesight-main',
            'version': '1.0.0',
            'sentiment_available': SENTIMENT_AVAILABLE,
            'timestamp': '2024-07-14T00:00:00Z'
        })
    
    @app.route('/api/status')
    def api_status():
        """API status endpoint"""
        return jsonify({
            'api': 'active',
            'services': {
                'sentiment': SENTIMENT_AVAILABLE,
                'dashboard': True,
                'frontend': True
            }
        })
    
    # Serve static files
    @app.route('/<path:filename>')
    def static_files(filename):
        """Serve static files (CSS, JS, images, etc.)"""
        return send_from_directory('.', filename)
    
    # If sentiment server is available, register its routes
    if SENTIMENT_AVAILABLE:
        try:
            sentiment_app = create_sentiment_app()
            # Register sentiment routes under /api/sentiment
            @app.route('/api/sentiment/<path:path>', methods=['GET', 'POST'])
            def sentiment_proxy(path):
                """Proxy sentiment API requests"""
                return sentiment_app.test_client().open(f'/{path}', 
                                                       method=request.method,
                                                       data=request.data,
                                                       headers=request.headers)
        except Exception as e:
            print(f"⚠️ Could not integrate sentiment server: {e}")
    
    return app

if __name__ == '__main__':
    # Get port from environment (Render sets this)
    port = int(os.environ.get('PORT', 8080))
    
    print(f"🚀 Starting WaveSight on port {port}")
    print(f"📊 Sentiment analysis: {'✅ Available' if SENTIMENT_AVAILABLE else '❌ Unavailable'}")
    
    app = create_app()
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        threaded=True
    )