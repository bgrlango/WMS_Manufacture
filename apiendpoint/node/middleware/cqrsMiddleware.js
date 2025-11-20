/**
 * CQRS ENFORCEMENT MIDDLEWARE
 * Ensures Command Service only handles write operations
 * and provides proper error responses for misrouted requests
 */

const cqrsEnforcement = (req, res, next) => {
    const method = req.method;
    const path = req.path;
    
    // Log all command requests
    console.log(`🔧 COMMAND: ${method} ${path} from ${req.ip}`);
    
    // Enhanced JSON debugging for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        // Log headers for debugging
        const contentType = req.headers['content-type'];
        console.log(`📝 DEBUG: Content-Type: ${contentType}`);
        
        // Only log body if it's properly parsed
        if (req.body && Object.keys(req.body).length > 0) {
            const logBody = { ...req.body };
            // Redact sensitive information
            if (logBody.password) logBody.password = '[REDACTED]';
            console.log(`📝 DEBUG: Parsed Body:`, JSON.stringify(logBody, null, 2));
        } else {
            console.log(`📝 DEBUG: Body is empty or not parsed yet`);
        }
    }
    
    // Allow all methods on Command Service, but warn about GET requests to data endpoints
    if (method === 'GET' && (
        path.includes('/production/') || 
        path.includes('/inventory/') || 
        path.includes('/quality/') ||
        path.includes('/warehouse/') ||
        path.includes('/dashboard/')
    )) {
        console.log(`⚠️  WARNING: GET request to Command Service - Consider using Query Service`);
        
        return res.status(200).json({
            warning: "GET requests should typically use Query Service",
            message: "This request was processed, but consider using Query Service for better performance",
            queryServiceUrl: `http://localhost:2025${path}`,
            pattern: "CQRS Recommendation",
            currentService: "Command Service"
        });
    }
    
    // Allow health checks and auth endpoints
    if (path === '/' || 
        path === '/health' || 
        path.startsWith('/auth/') ||
        path === '/info' ||
        path === '/errors' ||
        path === '/cqrs') {
        return next();
    }
    
    // Log write operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        console.log(`✅ COMMAND: ${method} operation on ${path} - CQRS compliant`);
    }
    
    next();
};

// Error handling middleware for CQRS violations
const cqrsErrorHandler = (err, req, res, next) => {
    console.error(`❌ COMMAND SERVICE ERROR: ${err.message}`);
    console.error(`❌ REQUEST: ${req.method} ${req.url}`);
    console.error(`❌ STACK:`, err.stack);
    
    res.status(500).json({
        error: "Command Service Error",
        message: "An error occurred while processing your command",
        service: "Command Service",
        pattern: "CQRS",
        details: process.env.NODE_ENV === 'production' ? err.stack : 'Internal server error',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    cqrsEnforcement,
    cqrsErrorHandler
};
