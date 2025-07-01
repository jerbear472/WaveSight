// Cultural Compass Configuration
let compassData = [];
let filteredData = [];
let currentTooltip = null;

// Initialize Cultural Compass
document.addEventListener('DOMContentLoaded', function() {
    console.log('🧭 Initializing Cultural Compass...');

    // Ensure compass always shows something
    try {
        initializeCompass();
        loadSentimentTrends(); // Load trends from sentiment analysis
        loadEnhancedData();
        updateMetrics();
    } catch (error) {
        console.error('❌ Error initializing compass:', error);
        // Fallback initialization
        createSampleCompassData();
        updateCompass();
        updateMetrics();
    }
});

// Initialize compass with default settings
function initializeCompass() {
    // Set up event listeners
    document.getElementById('xAxisSelect').addEventListener('change', updateCompass);
    document.getElementById('yAxisSelect').addEventListener('change', updateCompass);
    document.getElementById('colorSelect').addEventListener('change', updateCompass);
    document.getElementById('topicFilter').addEventListener('input', filterTrends);

    // Initialize with sample data if no real data available
    createSampleCompassData();
}

// Load compass data from sentiment analysis
async function loadCompassData() {
    try {
        console.log('📊 Loading sentiment data for Cultural Compass...');

        // Always show sample data first for immediate visualization
        createSampleCompassData();
        updateCompass();
        updateMetrics();

        // Try to fetch from sentiment analysis server
        try {
            const response = await fetch('http://0.0.0.0:5001/api/health');

            if (response.ok) {
                console.log('✅ Sentiment server available, fetching real data...');
                document.getElementById('serverStatus').innerHTML = '✅ Connected to Reddit sentiment analysis server';
                document.getElementById('serverStatus').style.background = '#059669';
                await fetchRealSentimentData();
                updateCompass();
                updateMetrics();
            } else {
                console.log('⚠️ Sentiment server not available, keeping sample data');
                document.getElementById('serverStatus').innerHTML = '⚠️ Using sample data - Start "Sentiment Analysis Server" for live Reddit data';
                document.getElementById('serverStatus').style.background = '#D97706';
            }
        } catch (serverError) {
            console.log('⚠️ Sentiment server not running, using sample data');
            document.getElementById('serverStatus').innerHTML = '⚠️ Using sample data - Start "Sentiment Analysis Server" for live Reddit data';
            document.getElementById('serverStatus').style.background = '#D97706';
        }

    } catch (error) {
        console.error('❌ Error loading compass data:', error);
        createSampleCompassData();
        updateCompass();
        updateMetrics();
    }
}

// Fetch real sentiment data from multiple Reddit topics
async function fetchRealSentimentData() {
    const culturalTopics = [
        'artificial intelligence AI',
        'cryptocurrency bitcoin',
        'climate change sustainability',
        'mental health therapy',
        'fashion streetwear',
        'gaming esports',
        'social media influencer',
        'remote work productivity',
        'plant based vegan',
        'minimalism declutter',
        'fitness wellness',
        'indie music vinyl',
        'craft beer brewing',
        'urban gardening',
        'digital nomad travel'
    ];

    const sentimentPromises = culturalTopics.map(async (topic) => {
        try {
            const response = await fetch('http://0.0.0.0:5001/api/analyze-sentiment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, limit: 30 })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    return processTopicForCompass(topic, result.data);
                }
            }
        } catch (error) {
            console.log(`⚠️ Failed to analyze ${topic}:`, error.message);
        }
        return null;
    });

    const results = await Promise.all(sentimentPromises);
    compassData = results.filter(item => item !== null);

    console.log(`📊 Loaded ${compassData.length} topics for Cultural Compass`);
}

// Process topic sentiment data for compass placement
function processTopicForCompass(topic, sentimentData) {
    const confidence = sentimentData.confidence || 50;
    const totalResponses = sentimentData.total_responses || 0;
    const momentum = sentimentData.cultural_momentum || 'Stable';
    const prediction = sentimentData.prediction_outcome || 'Uncertain';

    // Calculate positions based on topic characteristics
    const coordinates = calculateCulturalCoordinates(topic, sentimentData);

    return {
        id: topic.replace(/\s+/g, '_'),
        name: formatTopicName(topic),
        topic: topic,
        x: coordinates.x,
        y: coordinates.y,
        sentiment: confidence,
        velocity: calculateVelocity(confidence, totalResponses),
        momentum: momentum,
        prediction: prediction,
        responses: totalResponses,
        category: categorizeByTopic(topic),
        color: getColorBySentiment(confidence)
    };
}

// Calculate cultural coordinates based on topic and sentiment
function calculateCulturalCoordinates(topic, sentimentData) {
    let x = 0; // mainstream (-1) to underground (+1)
    let y = 0; // traditional (-1) to disruptive (+1)

    const topicLower = topic.toLowerCase();
    const confidence = sentimentData.confidence || 50;
    const momentum = (sentimentData.cultural_momentum || '').toLowerCase();

    // X-axis: Mainstream vs Underground
    if (topicLower.includes('ai') || topicLower.includes('crypto')) {
        x = 0.3; // Somewhat mainstream but still emerging
    } else if (topicLower.includes('climate') || topicLower.includes('mental health')) {
        x = -0.4; // More mainstream acceptance
    } else if (topicLower.includes('streetwear') || topicLower.includes('indie')) {
        x = 0.7; // More underground/niche
    } else if (topicLower.includes('remote work') || topicLower.includes('fitness')) {
        x = -0.2; // Trending mainstream
    } else {
        x = (Math.random() - 0.5) * 1.6; // Random between -0.8 and 0.8
    }

    // Y-axis: Traditional vs Disruptive
    if (topicLower.includes('ai') || topicLower.includes('crypto') || topicLower.includes('digital nomad')) {
        y = 0.6; // Highly disruptive
    } else if (topicLower.includes('climate') || topicLower.includes('sustainability')) {
        y = 0.4; // Moderately disruptive
    } else if (topicLower.includes('craft beer') || topicLower.includes('vinyl')) {
        y = -0.3; // Somewhat traditional/nostalgic
    } else if (topicLower.includes('fitness') || topicLower.includes('wellness')) {
        y = -0.1; // Slightly traditional but evolving
    } else {
        y = (Math.random() - 0.5) * 1.6; // Random between -0.8 and 0.8
    }

    // Adjust based on sentiment confidence and momentum
    if (momentum.includes('rising')) {
        y += 0.2; // Rising trends are more disruptive
    } else if (momentum.includes('declining')) {
        y -= 0.2; // Declining trends become more traditional
    }

    if (confidence > 70) {
        x -= 0.1; // High confidence suggests mainstream adoption
    } else if (confidence < 40) {
        x += 0.1; // Low confidence suggests niche/underground
    }

    // Ensure values stay within bounds
    x = Math.max(-0.9, Math.min(0.9, x));
    y = Math.max(-0.9, Math.min(0.9, y));

    return { x, y };
}

// Calculate velocity score
function calculateVelocity(confidence, responses) {
    const baseVelocity = confidence / 100;
    const responseBoost = Math.min(responses / 100, 1);
    return Math.min(baseVelocity + responseBoost * 0.3, 1);
}

// Categorize topics
function categorizeByTopic(topic) {
    const topicLower = topic.toLowerCase();

    if (topicLower.includes('ai') || topicLower.includes('crypto') || topicLower.includes('digital')) {
        return 'Technology';
    } else if (topicLower.includes('fashion') || topicLower.includes('music') || topicLower.includes('indie')) {
        return 'Creative';
    } else if (topicLower.includes('health') || topicLower.includes('fitness') || topicLower.includes('wellness')) {
        return 'Lifestyle';
    } else if (topicLower.includes('climate') || topicLower.includes('sustainability') || topicLower.includes('plant')) {
        return 'Environmental';
    } else if (topicLower.includes('work') || topicLower.includes('productivity')) {
        return 'Professional';
    } else {
        return 'Cultural';
    }
}

// Get color by sentiment score
function getColorBySentiment(sentiment) {
    if (sentiment >= 75) return '#10B981'; // Green - positive
    if (sentiment >= 60) return '#06B6D4'; // Cyan - optimistic
    if (sentiment >= 40) return '#F59E0B'; // Yellow - neutral
    if (sentiment >= 25) return '#EF4444'; // Red - negative
    return '#6B7280'; // Gray - unclear
}

// Format topic name for display
function formatTopicName(topic) {
    return topic.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Create sample compass data for demonstration
function createSampleCompassData() {
    console.log('🎭 Creating sample Cultural Compass data...');

    compassData = [
        {
            id: 'ai_culture', name: 'AI Integration', topic: 'artificial intelligence',
            x: 0.3, y: 0.7, sentiment: 78, velocity: 0.85, momentum: 'Rising',
            prediction: 'Likely', responses: 150, category: 'Technology', color: '#10B981'
        },
        {
            id: 'crypto_adoption', name: 'Crypto Adoption', topic: 'cryptocurrency',
            x: 0.5, y: 0.4, sentiment: 62, velocity: 0.72, momentum: 'Stable',
            prediction: 'Uncertain', responses: 89, category: 'Technology', color: '#06B6D4'
        },
        {
            id: 'climate_action', name: 'Climate Action', topic: 'climate change',
            x: -0.3, y: 0.6, sentiment: 71, velocity: 0.68, momentum: 'Rising',
            prediction: 'Likely', responses: 203, category: 'Environmental', color: '#10B981'
        },
        {
            id: 'mental_health', name: 'Mental Health Awareness', topic: 'mental health',
            x: -0.4, y: 0.2, sentiment: 83, velocity: 0.79, momentum: 'Strong',
            prediction: 'Likely', responses: 267, category: 'Lifestyle', color: '#10B981'
        },
        {
            id: 'streetwear', name: 'Streetwear Culture', topic: 'streetwear fashion',
            x: 0.7, y: -0.1, sentiment: 69, velocity: 0.64, momentum: 'Stable',
            prediction: 'Uncertain', responses: 78, category: 'Creative', color: '#06B6D4'
        },
        {
            id: 'remote_work', name: 'Remote Work Culture', topic: 'remote work',
            x: -0.2, y: 0.3, sentiment: 74, velocity: 0.71, momentum: 'Rising',
            prediction: 'Likely', responses: 156, category: 'Professional', color: '#10B981'
        },
        {
            id: 'plant_based', name: 'Plant-Based Living', topic: 'plant based diet',
            x: 0.1, y: 0.4, sentiment: 67, velocity: 0.58, momentum: 'Stable',
            prediction: 'Uncertain', responses: 112, category: 'Lifestyle', color: '#06B6D4'
        },
        {
            id: 'gaming_culture', name: 'Gaming/Esports', topic: 'gaming esports',
            x: -0.1, y: 0.1, sentiment: 76, velocity: 0.81, momentum: 'Strong',
            prediction: 'Likely', responses: 189, category: 'Creative', color: '#10B981'
        },
        {
            id: 'minimalism', name: 'Minimalism Movement', topic: 'minimalism',
            x: 0.4, y: -0.3, sentiment: 72, velocity: 0.55, momentum: 'Stable',
            prediction: 'Likely', responses: 95, category: 'Lifestyle', color: '#10B981'
        },
        {
            id: 'vinyl_revival', name: 'Vinyl/Analog Revival', topic: 'vinyl records',
            x: 0.6, y: -0.5, sentiment: 81, velocity: 0.47, momentum: 'Stable',
            prediction: 'Likely', responses: 67, category: 'Creative', color: '#10B981'
        }
    ];

    filteredData = [...compassData];
}

// Update compass visualization
function updateCompass() {
    const chart = document.getElementById('compassChart');
    const xAxis = document.getElementById('xAxisSelect').value;
    const yAxis = document.getElementById('yAxisSelect').value;
    const colorDimension = document.getElementById('colorSelect').value;

    updateAxisLabels(xAxis, yAxis);
    clearTrendPoints();
    renderTrendPoints(colorDimension);
    updateLegend();
}

// Update axis labels based on selection
function updateAxisLabels(xAxis, yAxis) {
    const labels = {
        mainstream: { left: 'Underground', right: 'Mainstream' },
        appeal: { left: 'Subcultural Depth', right: 'Mass Appeal' },
        adoption: { left: 'Early Adopter', right: 'Late Majority' },
        traditional: { top: 'Disruptive', bottom: 'Traditional' },
        sentiment: { top: 'Ironic/Detached', bottom: 'Sentimental' },
        energy: { top: 'High Energy', bottom: 'Chill/Laid Back' }
    };

    document.getElementById('leftLabel').textContent = labels[xAxis].left;
    document.getElementById('rightLabel').textContent = labels[xAxis].right;
    document.getElementById('topLabel').textContent = labels[yAxis].top;
    document.getElementById('bottomLabel').textContent = labels[yAxis].bottom;
}

// Clear existing trend points
function clearTrendPoints() {
    const existingPoints = document.querySelectorAll('.trend-point');
    existingPoints.forEach(point => point.remove());
}

// Render trend points on compass
function renderTrendPoints(colorDimension) {
    const chart = document.getElementById('compassChart');
    const chartRect = chart.getBoundingClientRect();

    filteredData.forEach(trend => {
        const point = document.createElement('div');
        point.className = 'trend-point';
        point.style.backgroundColor = getPointColor(trend, colorDimension);

        // Convert coordinates to pixel positions
        const x = ((trend.x + 1) / 2) * (chartRect.width - 32) + 16;
        const y = ((1 - trend.y) / 2) * (chartRect.height - 32) + 16;

        point.style.left = `${x}px`;
        point.style.top = `${y}px`;

        // Add event listeners
        point.addEventListener('mouseenter', (e) => showTooltip(e, trend));
        point.addEventListener('mouseleave', hideTooltip);
        point.addEventListener('click', () => showTrendDetail(trend));

        chart.appendChild(point);
    });
}

// Get point color based on dimension
function getPointColor(trend, dimension) {
    switch (dimension) {
        case 'sentiment':
            return trend.color;
        case 'velocity':
            const velocity = trend.velocity;
            if (velocity >= 0.8) return '#FF6B6B'; // High velocity - red
            if (velocity >= 0.6) return '#FFE66D'; // Medium velocity - yellow
            return '#4ECDC4'; // Low velocity - teal
        case 'momentum':
            const momentum = trend.momentum.toLowerCase();
            if (momentum.includes('strong') || momentum.includes('rising')) return '#FF9F43';
            if (momentum.includes('stable')) return '#54A0FF';
            return '#5F27CD';
        default:
            return trend.color;
    }
}

// Show tooltip on hover
function showTooltip(event, trend) {
    const tooltip = document.getElementById('trendTooltip');
    const colorDimension = document.getElementById('colorSelect').value;

    tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #5ee3ff;">
            ${trend.name}
        </div>
        <div style="margin-bottom: 4px;">
            <strong>Sentiment:</strong> ${trend.sentiment}% confidence
        </div>
        <div style="margin-bottom: 4px;">
            <strong>Velocity:</strong> ${(trend.velocity * 100).toFixed(1)}%
        </div>
        <div style="margin-bottom: 4px;">
            <strong>Momentum:</strong> ${trend.momentum}
        </div>
        <div style="margin-bottom: 4px;">
            <strong>Category:</strong> ${trend.category}
        </div>
        <div style="margin-bottom: 4px;">
            <strong>Responses:</strong> ${trend.responses}
        </div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 8px;">
            Click for detailed analysis
        </div>
    `;

    tooltip.style.left = `${event.pageX + 15}px`;
    tooltip.style.top = `${event.pageY - 10}px`;
    tooltip.classList.add('show');
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('trendTooltip');
    tooltip.classList.remove('show');
}

// Show detailed trend analysis
function showTrendDetail(trend) {
    alert(`Detailed analysis for ${trend.name}:\n\n` +
          `Cultural Position: ${trend.x > 0 ? 'Underground' : 'Mainstream'} & ${trend.y > 0 ? 'Disruptive' : 'Traditional'}\n` +
          `Sentiment Score: ${trend.sentiment}%\n` +
          `Viral Velocity: ${(trend.velocity * 100).toFixed(1)}%\n` +
          `Cultural Momentum: ${trend.momentum}\n` +
          `Prediction: ${trend.prediction}\n` +
          `Community Responses: ${trend.responses}\n\n` +
          `This trend represents ${trend.category.toLowerCase()} culture and is positioned in the ` +
          `${trend.x > 0 ? 'underground' : 'mainstream'} ${trend.y > 0 ? 'disruptive' : 'traditional'} quadrant.`);
}

// Filter trends based on search
function filterTrends() {
    const filter = document.getElementById('topicFilter').value.toLowerCase();

    if (!filter) {
        filteredData = [...compassData];
    } else {
        filteredData = compassData.filter(trend => 
            trend.name.toLowerCase().includes(filter) ||
            trend.topic.toLowerCase().includes(filter) ||
            trend.category.toLowerCase().includes(filter)
        );
    }

    updateCompass();
    updateMetrics();
}

// Analyze specific topic
async function analyzeTopic() {
    const topicInput = document.getElementById('topicFilter');
    const topic = topicInput.value.trim();

    if (!topic) {
        alert('Please enter a topic to analyze');
        return;
    }

    console.log(`🔍 Analyzing cultural position for: ${topic}`);

    try {
        // Check if sentiment server is available
        const healthResponse = await fetch('http://0.0.0.0:5001/api/health');

        if (!healthResponse.ok) {
            alert('Sentiment analysis server not available. Please start the "Sentiment Analysis Server" workflow.');
            return;
        }

        // Analyze topic sentiment
        const response = await fetch('http://0.0.0.0:5001/api/analyze-sentiment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, limit: 50 })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const newTrend = processTopicForCompass(topic, result.data);

                // Remove existing trend with same topic if exists
                compassData = compassData.filter(trend => trend.topic !== topic);

                // Add new trend
                compassData.push(newTrend);
                filteredData = [...compassData];

                updateCompass();
                updateMetrics();

                alert(`✅ Added "${formatTopicName(topic)}" to Cultural Compass!\n\n` +
                      `Position: ${newTrend.x > 0 ? 'Underground' : 'Mainstream'} & ${newTrend.y > 0 ? 'Disruptive' : 'Traditional'}\n` +
                      `Sentiment: ${newTrend.sentiment}%\n` +
                      `Velocity: ${(newTrend.velocity * 100).toFixed(1)}%`);

                topicInput.value = '';
            } else {
                alert('Failed to analyze topic sentiment');
            }
        } else {
            alert('Error connecting to sentiment analysis service');
        }

    } catch (error) {
        console.error('❌ Error analyzing topic:', error);
        alert('Error analyzing topic. Please check that the sentiment server is running.');
    }
}

// Update metrics display
function updateMetrics() {
    const totalTrends = filteredData.length;
    const avgSentiment = totalTrends > 0 ? 
        Math.round(filteredData.reduce((sum, trend) => sum + trend.sentiment, 0) / totalTrends) : 0;
    const viralTrends = filteredData.filter(trend => trend.velocity >= 0.7).length;
    const emergingTrends = filteredData.filter(trend => trend.x > 0.3 && trend.velocity >= 0.5).length;

    document.getElementById('totalTrends').textContent = totalTrends;
    document.getElementById('avgSentiment').textContent = `${avgSentiment}%`;
    document.getElementById('viralTrends').textContent = viralTrends;
    document.getElementById('emergingTrends').textContent = emergingTrends;
}

// Check for new sentiment trends every 10 seconds
setInterval(() => {
    const currentCount = compassData.length;
    loadSentimentTrends();
    
    if (compassData.length > currentCount) {
        console.log(`🔄 Found ${compassData.length - currentCount} new trends from sentiment analysis`);
        updateCompass();
        updateMetrics();
    }
}, 10000);

// Update legend
function updateLegend() {
    const legend = document.getElementById('trendLegend');
    const categories = [...new Set(filteredData.map(trend => trend.category))];

    legend.innerHTML = categories.map(category => {
        const categoryTrends = filteredData.filter(trend => trend.category === category);
        const avgSentiment = categoryTrends.reduce((sum, trend) => sum + trend.sentiment, 0) / categoryTrends.length;
        const color = getColorBySentiment(avgSentiment);

        return `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${color};"></div>
                <span>${category} (${categoryTrends.length})</span>
            </div>
        `;
    }).join('');
}

// Load trends from sentiment analysis (localStorage)
function loadSentimentTrends() {
    try {
        const sentimentTrends = JSON.parse(localStorage.getItem('compassTrends') || '[]');
        
        if (sentimentTrends.length > 0) {
            console.log(`🧭 Loading ${sentimentTrends.length} trends from sentiment analysis...`);
            
            // Merge with existing compass data, avoiding duplicates
            sentimentTrends.forEach(trend => {
                const existingIndex = compassData.findIndex(existing => existing.topic === trend.topic);
                if (existingIndex >= 0) {
                    // Update existing trend
                    compassData[existingIndex] = trend;
                } else {
                    // Add new trend
                    compassData.push(trend);
                }
            });
            
            filteredData = [...compassData];
            
            // Update status message
            const serverStatus = document.getElementById('serverStatus');
            if (serverStatus) {
                serverStatus.innerHTML = `✅ Loaded ${sentimentTrends.length} trends from Reddit sentiment analysis + sample data`;
                serverStatus.style.background = '#059669';
            }
            
            console.log(`✅ Integrated ${sentimentTrends.length} sentiment trends with compass data`);
        }
    } catch (error) {
        console.log('⚠️ Could not load sentiment trends:', error);
    }
}

// Make functions globally available
window.analyzeTopic = analyzeTopic;
window.showAboutModal = showAboutModal;
window.toggleMobileMenu = toggleMobileMenu;
window.loadSentimentTrends = loadSentimentTrends;

// Mobile menu toggle function
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    const menuBtn = document.getElementById('menuBtn');
    
    if (navLinks.classList.contains('show')) {
        navLinks.classList.remove('show');
        menuBtn.textContent = '☰';
    } else {
        navLinks.classList.add('show');
        menuBtn.textContent = '✕';
    }
}

// About modal function
function showAboutModal() {
    alert('🧭 WaveSight Cultural Compass\n\n' +
          'Interactive mapping of cultural trends based on:\n' +
          '• Reddit sentiment analysis\n' +
          '• Social momentum tracking\n' +
          '• Multi-dimensional cultural positioning\n\n' +
          'Navigate trends across Mainstream ↔ Underground and Traditional ↔ Disruptive axes.');
}

// Load enhanced cultural trend data
async function loadEnhancedData() {
    console.log('🚀 Loading enhanced cultural compass data...');

    try {
        // Mock function - replace with actual data fetching from Reddit API
        async function fetchEnhancedCulturalTrends() {
            // Simulate fetching data from Reddit API
            return new Promise(resolve => {
                setTimeout(() => {
                    const mockData = [
                        {
                            id: 'ai_revolution',
                            name: 'AI Revolution',
                            engagement: 5200000,
                            sentiment: 0.85,
                            subredditSpread: 120,
                            momentum: 'Rising',
                            disruptionScore: 0.9,
                            mainstreamScore: 0.6,
                            velocity: 0.78
                        },
                        {
                            id: 'crypto_winter',
                            name: 'Crypto Winter',
                            engagement: 3800000,
                            sentiment: 0.35,
                            subredditSpread: 95,
                            momentum: 'Declining',
                            disruptionScore: 0.7,
                            mainstreamScore: 0.8,
                            velocity: 0.45
                        },
                        {
                            id: 'sustainable_living',
                            name: 'Sustainable Living',
                            engagement: 4500000,
                            sentiment: 0.75,
                            subredditSpread: 110,
                            momentum: 'Stable',
                            disruptionScore: 0.5,
                            mainstreamScore: 0.9,
                            velocity: 0.62
                        }
                    ];
                    resolve(mockData);
                }, 1000);
            });
        }

        const culturalTrends = await fetchEnhancedCulturalTrends();

        if (culturalTrends && culturalTrends.length > 0) {
            // Store the enhanced data globally
            window.culturalTrendsData = culturalTrends;

            // Mock function - replace with actual drawing logic
            function drawCompass(trends) {
                console.log('Drawing compass with enhanced data:', trends);
            }

            // Render the compass with enhanced data
            drawCompass(culturalTrends);

            // Update metrics with real data
            updateEnhancedMetrics(culturalTrends);

            console.log('✅ Enhanced cultural compass loaded successfully');
        } else {
            console.log('⚠️ No cultural trend data available');
        }

    } catch (error) {
        console.error('❌ Error loading enhanced data:', error);
    }
}

// Update metrics with enhanced cultural trend data
function updateEnhancedMetrics(trends) {
    if (!trends || trends.length === 0) return;

    // Calculate aggregate metrics
    const totalEngagement = trends.reduce((sum, trend) => sum + (trend.engagement || 0), 0);
    const avgSentiment = trends.reduce((sum, trend) => sum + (trend.sentiment || 0.5), 0) / trends.length;
    const totalSubreddits = trends.reduce((sum, trend) => sum + (trend.subredditSpread || 0), 0);
    const avgVelocity = trends.reduce((sum, trend) => sum + (trend.velocity || 0), 0) / trends.length;

    // Count trends by momentum
    const risingTrends = trends.filter(t => t.momentum === 'Rising').length;
    const stableTrends = trends.filter(t => t.momentum === 'Stable').length;
    const decliningTrends = trends.filter(t => t.momentum === 'Declining').length;

    // Find most disruptive and mainstream trends
    const mostDisruptive = trends.reduce((max, trend) => 
        (trend.disruptionScore || 0) > (max.disruptionScore || 0) ? trend : max, trends[0]);
    const mostMainstream = trends.reduce((max, trend) => 
        (trend.mainstreamScore || 0) > (max.mainstreamScore || 0) ? trend : max, trends[0]);

    // Update DOM elements
    const metricsContainer = document.querySelector('.metrics-container');
    if (metricsContainer) {
        metricsContainer.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${trends.length}</div>
                <div class="metric-label">Cultural Trends</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(totalEngagement / 1000000).toFixed(1)}M</div>
                <div class="metric-label">Total Engagement</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(avgSentiment * 100).toFixed(0)}%</div>
                <div class="metric-label">Avg Sentiment</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${totalSubreddits}</div>
                <div class="metric-label">Communities</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${avgVelocity.toFixed(2)}</div>
                <div class="metric-label">Avg Velocity</div>
            </div>
            <div class="metric-card momentum-card">
                <div class="momentum-stats">
                    <div class="momentum-item rising">↗ ${risingTrends}</div>
                    <div class="momentum-item stable">→ ${stableTrends}</div>
                    <div class="momentum-item declining">↘ ${decliningTrends}</div>
                </div>
                <div class="metric-label">Momentum</div>
            </div>
        `;
    }

    // Update insights
    const insightsContainer = document.querySelector('.insights-container');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
            <div class="insight-card">
                <h4>🚀 Most Disruptive</h4>
                <p><strong>${mostDisruptive.name}</strong></p>
                <p>Disruption Score: ${(mostDisruptive.disruptionScore * 100)?.toFixed(0) || 'N/A'}%</p>
            </div>
            <div class="insight-card">
                <h4>📈 Most Mainstream</h4>
                <p><strong>${mostMainstream.name}</strong></p>
                <p>Mainstream Score: ${(mostMainstream.mainstreamScore * 100)?.toFixed(0) || 'N/A'}%</p>
            </div>
            <div class="insight-card">
                <h4>🔥 Highest Velocity</h4>
                <p><strong>${trends.reduce((max, trend) => (trend.velocity || 0) > (max.velocity || 0) ? trend : max, trends[0]).name}</strong></p>
                <p>Cultural momentum building rapidly</p>
            </div>
        `;
    }
}