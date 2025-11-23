/**
 * Updated server.js for local development
 * Uses the separated Express app (server-express.js)
 */

const app = require('./server-express');
const http = require('http');

// Determine if running in Function Compute
const isRunningInFC = process.env.FC_FUNCTION_NAME !== undefined;

// Port selection
const PORT = process.env.PORT || (isRunningInFC ? 9000 : 3108);
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer(app);

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, HOST, () => {
    const env = isRunningInFC ? 'Function Compute' : 'Local Development';
    console.log(`\n✅ WMS Manufacturing Command Service started`);
    console.log(`   Environment: ${env}`);
    console.log(`   Listening on: ${HOST}:${PORT}`);
    console.log(`   URL: http://${HOST}:${PORT}`);
    console.log(`   API: http://${HOST}:${PORT}/api/v1/health\n`);
});

server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});

module.exports = { app, server };
