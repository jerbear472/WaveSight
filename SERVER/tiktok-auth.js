// TikTok Research API Authentication Service
// Handles client access tokens with automatic refresh and secure management

const fetch = require('node-fetch');
const Redis = require('redis');

class TikTokAuthService {
  constructor() {
    this.baseUrl = 'https://open.tiktokapis.com';
    this.clientKey = process.env.TIKTOK_CLIENT_KEY;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshInterval = null;
    
    // Redis client for token caching
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redis.on('error', (err) => {
      console.warn('⚠️ Redis connection failed, using memory storage:', err.message);
      this.useMemoryStorage = true;
    });
    
    this.redis.on('connect', () => {
      console.log('✅ TikTok Auth Service connected to Redis');
    });
    
    // Validate credentials
    if (!this.clientKey || !this.clientSecret) {
      console.warn('⚠️ TikTok API credentials not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET');
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      console.log('🔑 TikTok Auth Service initialized with credentials');
    }
  }

  // Initialize the auth service
  async init() {
    if (!this.isConfigured) {
      console.log('🚫 TikTok Auth Service: No credentials configured, running in demo mode');
      return false;
    }

    try {
      // Try to load existing token from cache
      const cachedToken = await this.loadCachedToken();
      
      if (cachedToken && this.isTokenValid(cachedToken)) {
        this.accessToken = cachedToken.access_token;
        this.tokenExpiry = new Date(cachedToken.expires_at);
        console.log('🔄 Loaded cached TikTok token, expires:', this.tokenExpiry.toISOString());
      } else {
        // Get new token
        await this.refreshToken();
      }
      
      // Start automatic refresh scheduler
      this.startTokenRefreshScheduler();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize TikTok Auth Service:', error);
      return false;
    }
  }

  // Get client access token using Client Credentials flow
  async refreshToken() {
    if (!this.isConfigured) {
      throw new Error('TikTok API credentials not configured');
    }

    try {
      console.log('🔄 Refreshing TikTok access token...');
      
      const response = await fetch(`${this.baseUrl}/v2/oauth/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        },
        body: new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${data.error_description || data.error || 'Unknown error'}`);
      }

      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      // Store token details
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      
      // Cache the token
      await this.cacheToken({
        access_token: this.accessToken,
        expires_at: this.tokenExpiry.toISOString(),
        expires_in: data.expires_in,
        token_type: data.token_type || 'Bearer'
      });

      console.log(`✅ TikTok token refreshed successfully, expires: ${this.tokenExpiry.toISOString()}`);
      console.log(`🔑 Token type: ${data.token_type || 'Bearer'}, expires in: ${data.expires_in}s`);
      
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidToken() {
    if (!this.isConfigured) {
      throw new Error('TikTok API credentials not configured');
    }

    // Check if token exists and is valid
    if (!this.accessToken || !this.isTokenValid()) {
      await this.refreshToken();
    }

    return this.accessToken;
  }

  // Check if current token is valid (with 5-minute buffer)
  isTokenValid(token = null) {
    if (token) {
      const expiryTime = new Date(token.expires_at);
      return expiryTime.getTime() > Date.now() + (5 * 60 * 1000); // 5-minute buffer
    }
    
    if (!this.tokenExpiry) return false;
    return this.tokenExpiry.getTime() > Date.now() + (5 * 60 * 1000); // 5-minute buffer
  }

  // Cache token in Redis or memory
  async cacheToken(tokenData) {
    const cacheKey = 'tiktok:access_token';
    const cacheValue = JSON.stringify(tokenData);
    
    if (this.useMemoryStorage) {
      // Fallback to memory storage
      this.memoryCache = tokenData;
      return;
    }

    try {
      await this.redis.setex(cacheKey, 7000, cacheValue); // Cache for ~2 hours (slightly less than token expiry)
      console.log('💾 TikTok token cached in Redis');
    } catch (error) {
      console.warn('⚠️ Failed to cache token in Redis:', error.message);
      this.memoryCache = tokenData; // Fallback to memory
    }
  }

  // Load cached token from Redis or memory
  async loadCachedToken() {
    const cacheKey = 'tiktok:access_token';
    
    if (this.useMemoryStorage && this.memoryCache) {
      return this.memoryCache;
    }

    try {
      const cachedValue = await this.redis.get(cacheKey);
      if (cachedValue) {
        const tokenData = JSON.parse(cachedValue);
        console.log('📦 Loaded TikTok token from Redis cache');
        return tokenData;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load token from Redis:', error.message);
      if (this.memoryCache) {
        return this.memoryCache;
      }
    }
    
    return null;
  }

  // Start automatic token refresh scheduler
  startTokenRefreshScheduler() {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 60 minutes (safety margin before 2-hour expiry)
    this.refreshInterval = setInterval(async () => {
      try {
        console.log('⏰ Scheduled TikTok token refresh...');
        await this.refreshToken();
      } catch (error) {
        console.error('❌ Scheduled token refresh failed:', error);
      }
    }, 60 * 60 * 1000); // 60 minutes

    console.log('🕐 TikTok token refresh scheduler started (every 60 minutes)');
  }

  // Stop the refresh scheduler
  stopTokenRefreshScheduler() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🛑 TikTok token refresh scheduler stopped');
    }
  }

  // Cleanup method
  async cleanup() {
    this.stopTokenRefreshScheduler();
    if (this.redis && !this.useMemoryStorage) {
      await this.redis.quit();
    }
  }

  // Get authorization header for API requests
  getAuthHeader() {
    if (!this.accessToken) {
      throw new Error('No valid access token available');
    }
    
    return {
      'Authorization': `Bearer ${this.accessToken}`
    };
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConfigured) {
        return {
          status: 'warning',
          message: 'TikTok API credentials not configured',
          configured: false
        };
      }

      const hasValidToken = this.accessToken && this.isTokenValid();
      
      return {
        status: hasValidToken ? 'healthy' : 'warning',
        message: hasValidToken ? 'TikTok Auth Service operational' : 'Token needs refresh',
        configured: true,
        hasToken: !!this.accessToken,
        tokenValid: hasValidToken,
        tokenExpiry: this.tokenExpiry ? this.tokenExpiry.toISOString() : null
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        configured: this.isConfigured
      };
    }
  }
}

// Export singleton instance
const tiktokAuth = new TikTokAuthService();

module.exports = {
  TikTokAuthService,
  tiktokAuth
};