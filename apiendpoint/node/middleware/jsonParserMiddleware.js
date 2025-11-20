/**
 * ENHANCED JSON PARSER MIDDLEWARE
 * Custom JSON parsing with better error handling and debugging
 */

const jsonParserMiddleware = (req, res, next) => {
    // Only process if content-type is JSON
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
        return next();
    }

    // Skip if body is already parsed
    if (req.body && Object.keys(req.body).length > 0) {
        return next();
    }

    let rawData = '';
    
    req.on('data', chunk => {
        rawData += chunk;
    });

    req.on('end', () => {
        try {
            // Log raw data for debugging
            console.log(`📝 JSON Parser: Raw data length: ${rawData.length}`);
            console.log(`📝 JSON Parser: Raw data: ${rawData.substring(0, 200)}${rawData.length > 200 ? '...' : ''}`);
            
            if (rawData.trim() === '') {
                req.body = {};
                return next();
            }

            // Clean the raw data
            const cleanData = rawData.trim();
            
            // Validate JSON structure
            if (!cleanData.startsWith('{') && !cleanData.startsWith('[')) {
                console.error(`❌ JSON Parser: Invalid JSON start character: ${cleanData.charAt(0)}`);
                return res.status(400).json({
                    error: 'Invalid JSON format',
                    message: 'JSON must start with { or [',
                    received: cleanData.substring(0, 50)
                });
            }

            // Parse JSON
            req.body = JSON.parse(cleanData);
            console.log(`✅ JSON Parser: Successfully parsed JSON`);
            console.log(`📝 JSON Parser: Parsed body:`, JSON.stringify(req.body, null, 2));
            
            next();
        } catch (error) {
            console.error(`❌ JSON Parser Error:`, error.message);
            console.error(`❌ Raw data that failed:`, rawData);
            
            return res.status(400).json({
                error: 'JSON Parsing Error',
                message: error.message,
                position: error.message.match(/position (\d+)/)?.[1] || 'unknown',
                received_length: rawData.length,
                received_preview: rawData.substring(0, 100),
                suggestions: [
                    'Check JSON format and syntax',
                    'Ensure proper Content-Type header',
                    'Verify no extra characters before/after JSON'
                ]
            });
        }
    });

    req.on('error', (error) => {
        console.error(`❌ Request parsing error:`, error);
        return res.status(400).json({
            error: 'Request Error',
            message: error.message
        });
    });
};

module.exports = { jsonParserMiddleware };
