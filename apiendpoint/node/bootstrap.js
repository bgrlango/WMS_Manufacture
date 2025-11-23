/**
 * Alibaba Cloud Function Compute Bootstrap
 * Entry point for custom Node.js runtime
 * 
 * This bootstrap handles:
 * - Server initialization
 * - Environment configuration
 * - Database connections
 * - Request routing to Express app
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Initialize logging
console.log('[FC Bootstrap] Starting Alibaba Cloud Function Compute bootstrap...');
console.log(`[FC Bootstrap] Node.js version: ${process.version}`);
console.log(`[FC Bootstrap] Current working directory: ${process.cwd()}`);

// Load environment variables
const dotenv = require('dotenv');
const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
        console.log(`[FC Bootstrap] Loaded .env from: ${envPath}`);
        break;
    }
}

// Import the Express app
let app;
try {
    app = require('./server-express');
    console.log('[FC Bootstrap] Express app imported successfully');
} catch (error) {
    console.error('[FC Bootstrap] Failed to import Express app:', error);
    process.exit(1);
}

// Port for Function Compute (always use 9000)
const FC_PORT = process.env.FC_PORT || 9000;

// Create HTTP server
const server = http.createServer(app);

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[FC Bootstrap] SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('[FC Bootstrap] Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[FC Bootstrap] SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('[FC Bootstrap] Server closed');
        process.exit(0);
    });
});

// Start the server
server.listen(FC_PORT, '0.0.0.0', () => {
    console.log(`[FC Bootstrap] ✅ Function Compute server listening on port ${FC_PORT}`);
    console.log(`[FC Bootstrap] Endpoint: http://0.0.0.0:${FC_PORT}`);
    console.log('[FC Bootstrap] Ready to handle function invocations');
});

server.on('error', (error) => {
    console.error('[FC Bootstrap] Server error:', error);
    process.exit(1);
});

// Export for potential direct invocation
module.exports = { app, server };
