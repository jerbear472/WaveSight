
def calculate_wave_score(view_count, last_view_count, likes, comments, sentiment_score):
    """
    Calculate a comprehensive wave score based on multiple metrics
    Returns a score between 0 and 1
    """
    # Growth factor (how much views have increased)
    growth_factor = 0
    if last_view_count > 0:
        growth_rate = (view_count - last_view_count) / last_view_count
        growth_factor = min(growth_rate, 2.0) / 2.0  # Cap at 100% growth
    
    # Engagement factor (likes + comments relative to views)
    engagement_factor = 0
    if view_count > 0:
        engagement_rate = (likes + comments) / view_count
        engagement_factor = min(engagement_rate * 1000, 1.0)  # Scale to 0-1
    
    # Volume factor (absolute view count scaled)
    volume_factor = min(view_count / 10000000, 1.0)  # Scale to 0-1, max at 10M views
    
    # Calculate weighted wave score
    wave_score = (
        growth_factor * 0.3 +       # 30% weight for growth
        engagement_factor * 0.25 +   # 25% weight for engagement
        volume_factor * 0.25 +       # 25% weight for volume
        sentiment_score * 0.2        # 20% weight for sentiment
    )
    
    return round(wave_score, 3)
