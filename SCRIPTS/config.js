/**
 * WaveSight Frontend Configuration
 * This file contains configuration that is safe to expose to the frontend
 * DO NOT put sensitive keys here - only public configuration
 */

// Check if we're in a development environment
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');

// Configuration object
window.WaveSightConfig = {
  // Environment detection
  environment: isDevelopment ? 'development' : 'production',
  
  // API Configuration
  api: {
    baseUrl: isDevelopment ? 'http://localhost' : window.location.origin,
    sentimentServer: isDevelopment ? 'http://localhost:5001' : window.location.origin,
    youtubeServer: isDevelopment ? 'http://localhost:5000' : window.location.origin,
    timeout: 30000
  },
  
  // Supabase Configuration (Public values only)
  supabase: {
    // These will be set by a configuration endpoint or build process
    url: null,
    anonKey: null
  },
  
  // Chart Configuration
  chart: {
    maxTrends: 8,
    animationDuration: 1500,
    colors: [
      '#5ee3ff', '#8b5cf6', '#ec4899', '#f97316', '#10b981', 
      '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f472b6'
    ]
  },
  
  // Cache Configuration
  cache: {
    defaultTtl: 300000, // 5 minutes
    trendsDataTtl: 60000, // 1 minute
    sentimentDataTtl: 180000 // 3 minutes
  },
  
  // UI Configuration
  ui: {
    refreshInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 2000,
    animationSpeed: 1500
  },
  
  // Feature Flags
  features: {
    realTimeUpdates: true,
    culturalCompass: true,
    alertSystem: true,
    exportData: true,
    darkMode: true
  },
  
  // Default settings
  defaults: {
    region: 'US',
    category: 'all',
    timeRange: '1_week',
    maxResults: 50
  }
};

// Configuration loader function
window.WaveSightConfig.load = async function() {
  try {
    // Try to load configuration from a config endpoint
    const response = await fetch('/api/config');
    if (response.ok) {
      const serverConfig = await response.json();
      
      // Merge server configuration (only safe public values)
      if (serverConfig.supabase) {
        this.supabase.url = serverConfig.supabase.url;
        this.supabase.anonKey = serverConfig.supabase.anonKey;
      }
      
      console.log('✅ Configuration loaded from server');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Could not load server configuration:', error.message);
  }
  
  // Fallback: Look for configuration in meta tags or localStorage
  const metaUrl = document.querySelector('meta[name="supabase-url"]');
  const metaKey = document.querySelector('meta[name="supabase-key"]');
  
  if (metaUrl && metaKey) {
    this.supabase.url = metaUrl.content;
    this.supabase.anonKey = metaKey.content;
    console.log('✅ Configuration loaded from meta tags');
    return true;
  }
  
  // Check localStorage for development
  const storedConfig = localStorage.getItem('wavesight-config');
  if (storedConfig) {
    try {
      const parsed = JSON.parse(storedConfig);
      if (parsed.supabase) {
        this.supabase.url = parsed.supabase.url;
        this.supabase.anonKey = parsed.supabase.anonKey;
        console.log('✅ Configuration loaded from localStorage');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Invalid configuration in localStorage');
    }
  }
  
  console.error('❌ No configuration found. Please set up Supabase credentials.');
  return false;
};

// Validation function
window.WaveSightConfig.validate = function() {
  if (!this.supabase.url || !this.supabase.anonKey) {
    console.error('❌ Missing Supabase configuration');
    return false;
  }
  
  console.log('✅ Configuration validated successfully');
  return true;
};

// Development helper function
window.WaveSightConfig.setDevelopmentConfig = function(url, key) {
  if (this.environment === 'development') {
    this.supabase.url = url;
    this.supabase.anonKey = key;
    
    // Store in localStorage for persistence
    localStorage.setItem('wavesight-config', JSON.stringify({
      supabase: { url, anonKey: key }
    }));
    
    console.log('✅ Development configuration set');
    return true;
  }
  
  console.warn('⚠️ Development configuration can only be set in development mode');
  return false;
};

// Auto-load configuration when script loads
document.addEventListener('DOMContentLoaded', () => {
  window.WaveSightConfig.load();
});

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.WaveSightConfig;
}