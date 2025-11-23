/**
 * Function Compute Handler for Alibaba Cloud
 * Handles function invocations from Alibaba FC
 */

const app = require('./server-express');

/**
 * HTTP function handler for Alibaba Function Compute
 * Automatically invoked for HTTP triggers
 * 
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
async function handler(req, res) {
    try {
        // Log incoming request
        console.log(`[FC Handler] ${req.method} ${req.path}`);
        
        // Pass to Express app
        return app(req, res);
    } catch (error) {
        console.error('[FC Handler] Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
}

/**
 * Event-based handler for Alibaba Function Compute
 * Used for asynchronous processing
 * 
 * @param {Object} event - Event data
 * @param {Object} context - Function context
 * @returns {Promise}
 */
async function eventHandler(event, context) {
    try {
        console.log('[FC Event Handler] Processing event:', event);
        
        // Process event based on type
        const { eventType, data } = event;
        
        switch (eventType) {
            case 'production_order_created':
                console.log('[FC Event Handler] Processing production order creation');
                // Handle production order creation
                break;
                
            case 'qc_inspection_completed':
                console.log('[FC Event Handler] Processing QC inspection');
                // Handle QC completion
                break;
                
            case 'delivery_created':
                console.log('[FC Event Handler] Processing delivery creation');
                // Handle delivery creation
                break;
                
            default:
                console.log('[FC Event Handler] Unknown event type:', eventType);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Event processed successfully',
                eventType: eventType
            })
        };
    } catch (error) {
        console.error('[FC Event Handler] Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Event processing failed',
                message: error.message
            })
        };
    }
}

module.exports = {
    handler,      // HTTP function handler
    eventHandler, // Event-based handler
    app          // Express app for testing
};
