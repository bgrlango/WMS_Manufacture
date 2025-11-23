/**
 * Express Application Module (separated from bootstrap)
 * Can be used by both local server and Function Compute bootstrap
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Load environment variables
const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
];

const loadedEnvFiles = [];
for (const p of envCandidates) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p, override: false });
        loadedEnvFiles.push(p);
    }
}

if (loadedEnvFiles.length) {
    console.log(`[Express] Loaded env from: ${loadedEnvFiles.join(', ')}`);
}

// Import middleware
const { cqrsEnforcement, cqrsErrorHandler } = require('./middleware/cqrsMiddleware');
const { setupMobileMiddleware } = require('./middleware/mobileMiddleware');
const { jsonParserMiddleware } = require('./middleware/jsonParserMiddleware');

// Import models
let sequelize, models;
try {
    const modelIndex = require('./models');
    sequelize = modelIndex.sequelize;
    models = modelIndex;
    console.log('✅ Models loaded successfully');
} catch (error) {
    console.error('❌ Error loading models:', error);
    throw error;
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const productionRoutes = require('./routes/productionRoutes');
const qcRoutes = require('./routes/qcRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const statusRoutes = require('./routes/statusRoutes');
const qrRoutes = require('./routes/qrRoutes');
const bomRoutes = require('./routes/bomRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const warehouseEnhancedRoutes = require('./routes/warehouse');
const mobileRoutes = require('./routes/mobile');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration for Function Compute
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For'],
    maxAge: 86400
};

app.use(cors(corsOptions));

// Custom JSON parser middleware
app.use('/api/production', jsonParserMiddleware);
app.use('/api/quality-control', jsonParserMiddleware);
app.use('/api/warehouse', jsonParserMiddleware);
app.use('/api/inventory', jsonParserMiddleware);
app.use('/auth', jsonParserMiddleware);

// Body parsing
app.use(express.json({
    limit: '10mb',
    strict: false,
    type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// Mobile middleware
setupMobileMiddleware(app);

// CQRS enforcement
app.use(cqrsEnforcement);

// Request logging
app.use((req, res, next) => {
    const realIP = req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress;

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        console.log(`  IP: ${realIP} | UA: ${userAgent}`);
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'WMS Manufacturing Command Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'command',
        version: '1.0.0',
        database: sequelize ? 'connected' : 'disconnected'
    });
});

// Routes - Development/Local paths
app.use('/auth', authRoutes);
app.use('/production', productionRoutes);
app.use('/quality-control', qcRoutes);
app.use('/delivery', deliveryRoutes);
app.use('/warehouse-legacy', warehouseRoutes);
app.use('/warehouse', warehouseEnhancedRoutes);
app.use('/status', statusRoutes);
app.use('/qr', qrRoutes);
app.use('/bom', bomRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/mobile', mobileRoutes);

// Routes - Production/Function Compute paths
app.use('/api/command/auth', authRoutes);
app.use('/api/command/production', productionRoutes);
app.use('/api/command/quality-control', qcRoutes);
app.use('/api/command/delivery', deliveryRoutes);
app.use('/api/command/warehouse-legacy', warehouseRoutes);
app.use('/api/command/warehouse', warehouseEnhancedRoutes);
app.use('/api/command/status', statusRoutes);
app.use('/api/command/bom', bomRoutes);
app.use('/api/command/inventory', inventoryRoutes);
app.use('/api/mobile', mobileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            code: err.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Endpoint not found',
            path: req.path,
            method: req.method
        }
    });
});

module.exports = app;
