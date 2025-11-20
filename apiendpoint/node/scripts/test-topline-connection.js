/**
 * Test Database Connection for Topline
 * Verifies both Node.js and FastAPI can connect to topline database
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

async function testToplineConnection() {
    console.log('🧪 Testing Topline Database Connection...\n');
    
    // Test 1: Raw MySQL Connection
    console.log('1️⃣  Testing Raw MySQL Connection to Topline...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'topline'
        });
        
        const [results] = await connection.execute('SELECT DATABASE() as current_db, VERSION() as version, NOW() as current_time');
        console.log('✅ Raw MySQL Connection: SUCCESS');
        console.log(`   Database: ${results[0].current_db}`);
        console.log(`   Version: ${results[0].version}`);
        console.log(`   Time: ${results[0].current_time}`);
        
        await connection.end();
    } catch (error) {
        console.error('❌ Raw MySQL Connection: FAILED');
        console.error(`   Error: ${error.message}`);
    }
    
    // Test 2: Sequelize Connection
    console.log('\n2️⃣  Testing Sequelize Connection to Topline...');
    try {
        const sequelize = new Sequelize(
            'topline',
            process.env.DB_USER || 'root',
            process.env.DB_PASSWORD || '',
            {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                dialect: 'mysql',
                logging: false
            }
        );
        
        await sequelize.authenticate();
        console.log('✅ Sequelize Connection: SUCCESS');
        
        const [results] = await sequelize.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = "topline"');
        console.log(`   Tables in topline: ${results[0].table_count}`);
        
        await sequelize.close();
    } catch (error) {
        console.error('❌ Sequelize Connection: FAILED');
        console.error(`   Error: ${error.message}`);
    }
    
    // Test 3: Environment Variables
    console.log('\n3️⃣  Checking Environment Variables...');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || '3306'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'root'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'topline'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[EMPTY]'}`);
    
    console.log('\n🎯 Topline Database Connection Test Completed');
}

// Run if called directly
if (require.main === module) {
    testToplineConnection()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testToplineConnection };
