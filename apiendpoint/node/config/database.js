const { Sequelize } = require('sequelize');
// Ensure env variables are loaded reliably across local/VM paths
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
];
for (const p of envCandidates) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p, override: false });
    }
}

let config = {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
};

// If running on Cloud Run, use Unix socket
if (process.env.CLOUD_SQL_CONNECTION_NAME) {
    config.dialectOptions = {
        socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`
    };
    // Use private IP if available
    if (process.env.DB_PRIVATE_HOST) {
        config.host = process.env.DB_PRIVATE_HOST;
    }
}

const sequelize = new Sequelize(config);

module.exports = sequelize;
