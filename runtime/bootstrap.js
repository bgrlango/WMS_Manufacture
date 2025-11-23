#!/usr/bin/env node

/**
 * Alibaba Cloud Function Compute Bootstrap
 * Entry point for Express.js/Node.js Command Service
 * Handles HTTP requests on port 9000
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Logging setup
const log = (level, msg) => {
    const timestamp = new Date().toISOString();
    console.log(`[${level}] ${timestamp} - bootstrap - ${msg}`);
};

log('INFO', '=' + '='.repeat(68));
log('INFO', '🚀 BOOTSTRAP INITIALIZATION');
log('INFO', '=' + '='.repeat(68));

// Environment variables
log('INFO', `Node.js version: ${process.version}`);
log('INFO', `Working directory: ${process.cwd()}`);
log('INFO', `Environment: ${process.env.NODE_ENV || 'development'}`);
log('INFO', `FC_FUNCTION_NAME: ${process.env.FC_FUNCTION_NAME || 'NOT SET'}`);

// Determine code directory
const CODE_DIR = process.env.CODE_DIR || '/code' || path.dirname(__filename);
const SCRIPT_DIR = __dirname;

log('INFO', `CODE_DIR: ${CODE_DIR}`);
log('INFO', `SCRIPT_DIR: ${SCRIPT_DIR}`);

// Check if bootstrap.js exists
const bootstrapPath = path.join(CODE_DIR, 'bootstrap.js');
if (!fs.existsSync(bootstrapPath) && CODE_DIR !== SCRIPT_DIR) {
    log('WARN', `bootstrap.js not found at ${bootstrapPath}, using ${SCRIPT_DIR}`);
}

// Import server or app
let app;
let handler;

try {
    // Try to import Express app or handler from multiple locations
    const potentialPaths = [
        path.join(CODE_DIR, 'server.js'),
        path.join(CODE_DIR, 'app.js'),
        path.join(CODE_DIR, 'index.js'),
        path.join(SCRIPT_DIR, 'server.js'),
        path.join(SCRIPT_DIR, 'app.js'),
    ];
    
    let serverLoaded = false;
    for (const filePath of potentialPaths) {
        if (fs.existsSync(filePath)) {
            try {
                const module = require(filePath);
                if (module.app || module.default) {
                    app = module.app || module.default;
                    log('INFO', `✓ Express app imported from ${filePath}`);
                    serverLoaded = true;
                    break;
                }
            } catch (e) {
                log('WARN', `Failed to import ${filePath}: ${e.message}`);
            }
        }
    }
    
    if (!serverLoaded) {
        log('WARN', 'No Express app found, creating default HTTP handler');
        // Default simple HTTP handler
        app = null;
    }
} catch (error) {
    log('ERROR', `Failed to import server: ${error.message}`);
    app = null;
}

// HTTP Handler for Alibaba FC
async function handler(request, response) {
    try {
        const urlParts = url.parse(request.url, true);
        const method = request.method;
        const pathname = urlParts.pathname;
        const query = urlParts.query;
        
        log('INFO', `${method} ${pathname}`);
        
        // Health check endpoint
        if (pathname === '/health' || pathname === '/') {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({
                status: 'ok',
                service: 'wms-nodejs-command-service',
                timestamp: new Date().toISOString()
            }));
            return;
        }
        
        // If Express app is loaded, use it
        if (app && typeof app === 'function') {
            // Express middleware style
            app(request, response);
            return;
        }
        
        // Default 404
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            error: 'Not Found',
            path: pathname,
            method: method
        }));
        
    } catch (error) {
        log('ERROR', `Handler error: ${error.message}`);
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            error: 'Internal Server Error',
            message: error.message
        }));
    }
}

// Export handler for Alibaba FC (CRITICAL)
module.exports = { handler };

// Run server if this is main module
if (require.main === module) {
    const PORT = parseInt(process.env.FC_PORT || process.env.PORT || '9000', 10);
    const HOST = process.env.FC_HOST || process.env.HOST || '0.0.0.0';
    
    const server = http.createServer(handler);
    
    server.on('error', (error) => {
        log('ERROR', `Server error: ${error.message}`);
        process.exit(1);
    });
    
    server.listen(PORT, HOST, () => {
        log('INFO', '=' + '='.repeat(68));
        log('INFO', '✅ WMS Manufacturing Command Service (Node.js)');
        log('INFO', `   Environment: Alibaba Function Compute`);
        log('INFO', `   Listening on: http://${HOST}:${PORT}`);
        log('INFO', `   Health Check: http://${HOST}:${PORT}/health`);
        log('INFO', '=' + '='.repeat(68));
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        log('INFO', 'SIGTERM received, shutting down gracefully...');
        server.close(() => {
            log('INFO', 'Server closed');
            process.exit(0);
        });
    });
    
    process.on('SIGINT', () => {
        log('INFO', 'SIGINT received, shutting down gracefully...');
        server.close(() => {
            log('INFO', 'Server closed');
            process.exit(0);
        });
    });
}
