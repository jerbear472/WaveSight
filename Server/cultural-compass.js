
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
