/**
 * Mobile API Middleware (Simplified Version)
 * Device detection, compression, and mobile optimization
 */
const compression = require('compression');
const rateLimit = require('express-rate-limit');

/**
 * Setup mobile middleware for Express app
 */
function setupMobileMiddleware(app) {
    // Compression middleware for mobile bandwidth optimization
    app.use(compression({
        filter: shouldCompress,
        threshold: 1024 // Only compress if larger than 1KB
    }));

    // Mobile device detection middleware
    app.use(mobileDetection);

    // Rate limiting for mobile apps
    const mobileRateLimit = rateLimit({
        windowMs: parseInt(process.env.MOBILE_RATE_LIMIT_WINDOW) || 60000, // 1 minute
        max: parseInt(process.env.MOBILE_RATE_LIMIT_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
        message: {
            error: 'Too Many Requests',
            message: 'You have exceeded the mobile API rate limit.',
            retryAfter: '1 minute'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    app.use('/mobile', mobileRateLimit);

    console.log('✅ Mobile middleware initialized successfully');
}

/**
 * Compression filter function
 */
function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        return false;
    }
    return compression.filter(req, res);
}

/**
 * Mobile device detection middleware
 */
function mobileDetection(req, res, next) {
    const userAgent = req.headers['user-agent'] || '';
    const mobileHeader = req.headers['x-mobile-app'] === 'true';
    
    // Simple mobile detection
    const isMobile = mobileHeader || 
                    /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);
    
    req.isMobile = isMobile;
    req.deviceId = req.headers['x-device-id'] || 'unknown';
    req.appVersion = req.headers['x-app-version'] || '1.0.0';
    
    if (isMobile) {
        res.set('X-Mobile-Optimized', 'true');
    }
    
    next();
}

module.exports = {
    setupMobileMiddleware,
    mobileDetection
};
