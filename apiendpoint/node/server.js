/**
 * CQRS COMMAND SERVICE (Node.js)
 * Handles: POST, PUT, DELETE operations only
 * Port: 8080
 */
// Robust env loader to handle differences between local and VM
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
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
    console.log(`[dotenv] loaded env from: ${loadedEnvFiles.join(', ')}`);
}
const express = require('express');
const cors = require('cors');

// Import middleware
const { cqrsEnforcement, cqrsErrorHandler } = require('./middleware/cqrsMiddleware');
const { setupMobileMiddleware } = require('./middleware/mobileMiddleware');
const { jsonParserMiddleware } = require('./middleware/jsonParserMiddleware');

// Import models dengan error handling
let sequelize, models;
try {
    const modelIndex = require('./models');
    sequelize = modelIndex.sequelize;
    models = modelIndex;
    console.log('✅ CQRS Command Service - Models loaded successfully');
} catch (error) {
    console.error('❌ Error loading models:', error);
    process.exit(1);
}

// Import semua routes
const authRoutes = require('./routes/authRoutes');
const productionRoutes = require('./routes/productionRoutes');
const qcRoutes = require('./routes/qcRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const statusRoutes = require('./routes/statusRoutes');
const qrRoutes = require('./routes/qrRoutes');

// ERP Enhancement Routes
const bomRoutes = require('./routes/bomRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

// Enhanced CQRS Routes
const warehouseEnhancedRoutes = require('./routes/warehouse');

// Mobile API Routes
const mobileRoutes = require('./routes/mobile');

const app = express();

// Trust proxy untuk mendapatkan IP yang benar dari nginx
app.set('trust proxy', true);

app.use(cors());

// Custom JSON parser middleware for better debugging
app.use('/api/production', jsonParserMiddleware);
app.use('/api/quality-control', jsonParserMiddleware);
app.use('/api/warehouse', jsonParserMiddleware);
app.use('/api/inventory', jsonParserMiddleware);
app.use('/auth', jsonParserMiddleware);

// Enhanced JSON parsing configuration
app.use(express.json({ 
    limit: '10mb',
    strict: false,  // Allow relaxed JSON parsing
    type: ['application/json', 'text/plain']
}));

// URL encoded parsing for form data
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Setup mobile middleware (compression, detection, optimization)
setupMobileMiddleware(app);

// Apply CQRS enforcement middleware AFTER body parsing
app.use(cqrsEnforcement);

// Middleware untuk CQRS Command Pattern - Log write operations
app.use((req, res, next) => {
    // Get real IP from various headers (nginx, cloudflare, etc)
    const realIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.ip;
    
    // Clean up IP (remove ::ffff: prefix for IPv4)
    req.clientIP = realIP ? realIP.replace(/^::ffff:/, '') : 'unknown';
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] COMMAND: ${req.method} ${req.url} from ${req.clientIP}`);
    
    // Only redirect GET requests that are not health checks or auth
    if (req.method === 'GET' && 
        !req.url.includes('/health') && 
        !req.url.includes('/info') &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/config-check')) {
        const queryUrl = `http://localhost:2025${req.url}`;
        return res.status(405).json({
            error: 'Method Not Allowed',
            message: 'GET operations should use Query Service on port 2025',
            queryServiceUrl: queryUrl,
            pattern: 'CQRS Separation'
        });
    }
    
    // Log request body for write operations only
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const logBody = { ...req.body };
        if (logBody.password) logBody.password = '[REDACTED]';
        console.log(`[${timestamp}] Command Body:`, JSON.stringify(logBody, null, 2));
    }
    
    next();
});

// Daftarkan semua routes langsung tanpa /api/command prefix untuk development
app.use('/auth', authRoutes);
app.use('/production', productionRoutes);
app.use('/quality-control', qcRoutes);
app.use('/delivery', deliveryRoutes);
app.use('/warehouse-legacy', warehouseRoutes);  // Legacy warehouse routes
app.use('/warehouse', warehouseEnhancedRoutes);  // Enhanced warehouse routes
app.use('/status', statusRoutes);
app.use('/qr', qrRoutes);  // QR Code routes

// ERP Enhancement Routes
app.use('/bom', bomRoutes);
app.use('/inventory', inventoryRoutes);

// Mobile API Routes dengan unified integration
app.use('/mobile', mobileRoutes);

// Mobile command endpoints (unified with regular commands)
app.post('/mobile/sync', async (req, res) => {
    try {
        const { device_id, last_sync, data_types = [] } = req.body;
        
        // Validate device info
        if (!device_id) {
            return res.status(400).json({
                error: 'Device ID required',
                message: 'Mobile sync requires device identification'
            });
        }
        
        const sync_result = {
            sync_id: `sync_${Date.now()}`,
            device_id,
            timestamp: new Date().toISOString(),
            status: 'success',
            data_synchronized: data_types,
            next_sync_in: 300, // 5 minutes
            conflicts: [],
            warnings: []
        };
        
        console.log(`📱 Mobile sync completed for device: ${device_id}`);
        res.json(sync_result);
        
    } catch (error) {
        console.error('Mobile sync error:', error);
        res.status(500).json({
            error: 'Sync failed',
            message: error.message
        });
    }
});

app.post('/mobile/production/quick-update', async (req, res) => {
    try {
        const { order_id, status, quantity, device_id, operator_id } = req.body;
        
        // Mobile-optimized production update
        const update_result = {
            update_id: `mobile_${Date.now()}`,
            order_id,
            previous_status: 'in_progress',
            new_status: status,
            quantity_updated: quantity,
            timestamp: new Date().toISOString(),
            operator: operator_id,
            device: device_id,
            sync_required: false
        };
        
        console.log(`📱 Quick production update: ${order_id} -> ${status}`);
        res.json(update_result);
        
    } catch (error) {
        console.error('Mobile production update error:', error);
        res.status(500).json({
            error: 'Production update failed',
            message: error.message
        });
    }
});

app.post('/mobile/inventory/scan-update', async (req, res) => {
    try {
        const { barcode, location, quantity, type, device_id } = req.body;
        
        // Mobile barcode scan inventory update
        const scan_result = {
            scan_id: `scan_${Date.now()}`,
            barcode,
            item_found: true,
            previous_quantity: 150,
            new_quantity: quantity,
            location,
            type, // 'in', 'out', 'transfer', 'adjustment'
            device: device_id,
            timestamp: new Date().toISOString(),
            requires_verification: type === 'adjustment' && Math.abs(quantity - 150) > 50
        };
        
        console.log(`📱 Inventory scan: ${barcode} at ${location}`);
        res.json(scan_result);
        
    } catch (error) {
        console.error('Mobile inventory scan error:', error);
        res.status(500).json({
            error: 'Inventory scan failed',
            message: error.message
        });
    }
});

app.post('/mobile/quality/inspection-submit', async (req, res) => {
    try {
        const { inspection_id, results, photos, device_id, inspector_id } = req.body;
        
        // Mobile quality inspection submission
        const inspection_result = {
            submission_id: `inspect_${Date.now()}`,
            inspection_id,
            status: results.overall_result, // 'pass', 'fail', 'conditional'
            inspector: inspector_id,
            device: device_id,
            timestamp: new Date().toISOString(),
            photos_uploaded: photos ? photos.length : 0,
            automatic_workflow: results.overall_result === 'pass',
            requires_review: results.overall_result === 'fail'
        };
        
        console.log(`📱 Quality inspection: ${inspection_id} -> ${results.overall_result}`);
        res.json(inspection_result);
        
    } catch (error) {
        console.error('Mobile quality inspection error:', error);
        res.status(500).json({
            error: 'Quality inspection submission failed',
            message: error.message
        });
    }
});

app.post('/mobile/warehouse/task-complete', async (req, res) => {
    try {
        const { task_id, completion_data, device_id, worker_id } = req.body;
        
        // Mobile warehouse task completion
        const completion_result = {
            completion_id: `task_${Date.now()}`,
            task_id,
            status: 'completed',
            worker: worker_id,
            device: device_id,
            timestamp: new Date().toISOString(),
            completion_time: '15 minutes',
            next_task_available: true,
            location_verified: completion_data.location_scan || false
        };
        
        console.log(`📱 Warehouse task completed: ${task_id} by ${worker_id}`);
        res.json(completion_result);
        
    } catch (error) {
        console.error('Mobile warehouse task error:', error);
        res.status(500).json({
            error: 'Warehouse task completion failed',
            message: error.message
        });
    }
});

// Legacy routes dengan prefix untuk production dengan nginx
app.use('/api/command/auth', authRoutes);
app.use('/api/command/production', productionRoutes);
app.use('/api/command/quality-control', qcRoutes);
app.use('/api/command/delivery', deliveryRoutes);
app.use('/api/command/warehouse-legacy', warehouseRoutes);  // Legacy
app.use('/api/command/warehouse', warehouseEnhancedRoutes);  // Enhanced
app.use('/api/command/status', statusRoutes);
app.use('/api/command/bom', bomRoutes);
app.use('/api/command/inventory', inventoryRoutes);
app.use('/api/command/qr', qrRoutes);  // QR Code routes

// CQRS Command Service Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ERP Command Service',
        pattern: 'CQRS - Command Side',
        operations: ['POST', 'PUT', 'DELETE', 'PATCH'],
        timestamp: new Date().toISOString(),
        companion: 'Query Service on port 2025'
    });
});

// Prefixed alias for production path consistency
app.get('/api/command/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ERP Command Service',
        pattern: 'CQRS - Command Side',
        operations: ['POST', 'PUT', 'DELETE', 'PATCH'],
        timestamp: new Date().toISOString(),
        companion: 'Query Service on port 2025'
    });
});

// Service info endpoint
app.get('/info', (req, res) => {
    res.json({
        service: 'ERP Command Service',
        pattern: 'CQRS Architecture',
        version: '2.0.0',
        description: 'Write operations for Manufacturing ERP',
        operations: ['CREATE', 'UPDATE', 'DELETE', 'POST', 'PUT', 'PATCH'],
        blocked_operations: ['GET (for data endpoints)'],
        endpoints: {
            auth: {
                login: 'POST /auth/login'
            },
            production: {
                orders: 'POST /production/orders',
                output: 'POST /production/output',
                update: 'PUT /production/orders/:id'
            },
            quality_control: {
                records: 'POST /quality-control/records',
                update: 'PUT /quality-control/records/:id'
            },
            warehouse: {
                deliveries: 'POST /warehouse/deliveries',
                transfers: 'POST /warehouse/transfers',
                returns: 'POST /warehouse/returns'
            },
            inventory: {
                update: 'PUT /inventory/balances',
                locations: 'POST /inventory/locations'
            },
            bom: {
                create: 'POST /bom',
                update: 'PUT /bom/:id'
            }
        },
        companion_service: {
            name: 'Query Service',
            port: 2025,
            operations: ['READ', 'LIST', 'SEARCH'],
            url: 'http://localhost:2025'
        },
        nginx_production_paths: {
            command_prefix: '/api/command',
            query_prefix: '/api/query'
        },
        cqrs_compliance: {
            enforcement: 'enabled',
            read_redirects: 'automatic',
            error_handling: 'detailed'
        }
    });
});

// Prefixed alias for service info
app.get('/api/command/info', (req, res) => {
    res.json({
        service: 'ERP Command Service',
        pattern: 'CQRS Architecture',
        version: '2.0.0',
        description: 'Write operations for Manufacturing ERP',
        operations: ['CREATE', 'UPDATE', 'DELETE', 'POST', 'PUT', 'PATCH'],
        blocked_operations: ['GET (for data endpoints)'],
        endpoints: {
            auth: { login: 'POST /auth/login' },
            production: { orders: 'POST /production/orders', output: 'POST /production/output', update: 'PUT /production/orders/:id' },
            quality_control: { records: 'POST /quality-control/records', update: 'PUT /quality-control/records/:id' },
            warehouse: { deliveries: 'POST /warehouse/deliveries', transfers: 'POST /warehouse/transfers', returns: 'POST /warehouse/returns' },
            inventory: { update: 'PUT /inventory/balances', locations: 'POST /inventory/locations' },
            bom: { create: 'POST /bom', update: 'PUT /bom/:id' }
        },
        companion_service: { name: 'Query Service', port: 2025, operations: ['READ', 'LIST', 'SEARCH'], url: 'http://localhost:2025' },
        nginx_production_paths: { command_prefix: '/api/command', query_prefix: '/api/query' },
        cqrs_compliance: { enforcement: 'enabled', read_redirects: 'automatic', error_handling: 'detailed' }
    });
});

// Quick configuration check to detect env differences between local and VM
app.get('/config-check', (req, res) => {
    const required = ['DB_HOST','DB_USER','DB_NAME','DB_PORT','JWT_SECRET'];
    const envStatus = Object.fromEntries(required.map(k => [k, process.env[k] ? 'OK' : 'MISSING']));
    res.json({
        env: envStatus,
        port: process.env.PORT || 3108,
        node_env: process.env.NODE_ENV || 'unset',
        cqrs: 'command-service',
    });
});

// Prefixed alias to access via nginx path
app.get('/api/command/config-check', (req, res) => {
    const required = ['DB_HOST','DB_USER','DB_NAME','DB_PORT','JWT_SECRET'];
    const envStatus = Object.fromEntries(required.map(k => [k, process.env[k] ? 'OK' : 'MISSING']));
    res.json({
        env: envStatus,
        port: process.env.PORT || 3108,
        node_env: process.env.NODE_ENV || 'unset',
        cqrs: 'command-service',
    });
});

// CQRS information endpoint
app.get('/cqrs', (req, res) => {
    res.json({
        pattern: 'Command Query Responsibility Segregation',
        architecture: {
            command_service: {
                port: 3108,
                responsibilities: ['CREATE', 'UPDATE', 'DELETE'],
                database_access: 'Read-write',
                methods_allowed: ['POST', 'PUT', 'DELETE', 'PATCH']
            },
            query_service: {
                port: 2025,
                responsibilities: ['READ', 'LIST', 'SEARCH', 'GET'],
                database_access: 'Read-only',
                methods_allowed: ['GET', 'OPTIONS']
            }
        },
        benefits: [
            'Scalability - separate read/write scaling',
            'Security - isolated command operations', 
            'Performance - optimized for write operations',
            'Maintenance - clear separation of concerns'
        ],
        enforcement: {
            middleware: 'cqrsEnforcement',
            status: 'enabled',
            read_redirects: 'automatic'
        },
        compliance: 'strict'
    });
});

// Error handling endpoint
app.get('/errors', (req, res) => {
    res.json({
        error_handling: {
            method_not_allowed: {
                code: 405,
                message: 'GET operations should use Query Service',
                solution: 'Redirect to http://localhost:2025'
            },
            database_errors: {
                code: 500,
                message: 'Database connection or transaction error',
                solution: 'Check database status and retry'
            },
            authentication_errors: {
                code: 401,
                message: 'Authentication required',
                solution: 'Provide valid JWT token in Authorization header'
            },
            validation_errors: {
                code: 400,
                message: 'Invalid request data',
                solution: 'Check request body and required fields'
            },
            server_errors: {
                code: 500,
                message: 'Internal server error',
                solution: 'Check server logs and database connection'
            }
        },
        troubleshooting: {
            health_check: '/health',
            service_info: '/info',
            cqrs_info: '/cqrs',
            logs: 'Check terminal output for detailed logs'
        },
        support: {
            cqrs_pattern: 'Commands use this service, Queries use port 2025',
            database: 'Ensure XAMPP MySQL is running',
            authentication: 'Use JWT tokens from auth/login endpoint'
        }
    });
});

// Apply CQRS error handling middleware
app.use(cqrsErrorHandler);

const PORT = process.env.PORT || 3108;

console.log('🔄 Starting server initialization...');
console.log('📊 Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: PORT,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    CLOUD_SQL_CONNECTION_NAME: process.env.CLOUD_SQL_CONNECTION_NAME
});

// Start server first to handle health checks
const server = app.listen(PORT, () => {
    console.log(`🎯 Command Service running on port ${PORT}`);
    console.log(`📝 Operations: POST, PUT, DELETE, PATCH`);
    console.log(`🔗 Companion: Query Service on port 2025`);
    console.log(`🏭 Pattern: CQRS - Command Side`);
});

// Then try to connect to database
console.log('🔌 Attempting database connection...');
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connection established');
        console.log('🚀 CQRS Command Service fully initialized');
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        console.error('Stack trace:', err.stack);
        // Don't exit process, just log error
        console.log('⚠️ Server will continue running without database connection');
    });
