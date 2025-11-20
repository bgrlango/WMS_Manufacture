/**
 * Alibaba Cloud Helper Functions
 * For RDS MySQL, OSS, and other Alibaba Cloud operations
 */

const path = require('path');
const alibabaConfig = require('../config/alibaba.config');

/**
 * Test connection ke Alibaba RDS MySQL
 */
async function testRDSConnection() {
  try {
    const mysql = require('mysql2/promise');
    
    const connection = await mysql.createConnection({
      host: alibabaConfig.mysql.host,
      port: alibabaConfig.mysql.port,
      user: alibabaConfig.mysql.user,
      password: alibabaConfig.mysql.password,
      database: alibabaConfig.mysql.database,
    });

    const [results] = await connection.execute('SELECT 1 as connection_test');
    await connection.end();

    console.log('✅ Alibaba RDS MySQL - Connected successfully');
    console.log('   Host:', alibabaConfig.mysql.host);
    console.log('   Port:', alibabaConfig.mysql.port);
    console.log('   Database:', alibabaConfig.mysql.database);
    return true;
  } catch (error) {
    console.error('❌ Alibaba RDS MySQL - Connection failed');
    console.error('   Error:', error.message);
    return false;
  }
}

/**
 * Test OSS Connection
 */
async function testOSSConnection() {
  try {
    const AlibabaOSS = require('ali-oss');
    
    const client = new AlibabaOSS(alibabaConfig.oss);
    
    // Test by listing buckets
    const result = await client.get('test');
    
    console.log('✅ Alibaba OSS - Connected successfully');
    console.log('   Endpoint:', alibabaConfig.oss.endpoint);
    console.log('   Bucket:', alibabaConfig.oss.bucket);
    console.log('   Region:', alibabaConfig.oss.region);
    return true;
  } catch (error) {
    console.warn('⚠️  Alibaba OSS - Connection warning (bucket may be empty)');
    if (error.code === 'NoSuchKey' || error.code === 'NoSuchBucket') {
      console.log('   Bucket exists but is empty - this is normal');
      return true;
    }
    console.error('   Error:', error.message);
    return false;
  }
}

/**
 * Test Alibaba Cloud Credentials
 */
async function testAlibabaCredentials() {
  try {
    const hasAccessKey = !!alibabaConfig.credentials.accessKeyId && 
                         alibabaConfig.credentials.accessKeyId !== 'your_access_key_id_here';
    const hasAccessSecret = !!alibabaConfig.credentials.accessKeySecret && 
                           alibabaConfig.credentials.accessKeySecret !== 'your_access_key_secret_here';
    
    if (!hasAccessKey || !hasAccessSecret) {
      console.error('❌ Alibaba Credentials - Not configured');
      console.error('   Please update ALIBABA_ACCESS_KEY_ID and ALIBABA_ACCESS_KEY_SECRET in .env.alibaba');
      return false;
    }

    console.log('✅ Alibaba Credentials - Configured');
    console.log('   Region:', alibabaConfig.credentials.region);
    console.log('   Access Key ID: ' + alibabaConfig.credentials.accessKeyId.substring(0, 5) + '***');
    return true;
  } catch (error) {
    console.error('❌ Alibaba Credentials - Error');
    console.error('   Error:', error.message);
    return false;
  }
}

/**
 * Verify all Alibaba Cloud connections
 */
async function verifyAllConnections() {
  console.log('\n🔍 Verifying Alibaba Cloud connections...\n');
  
  const credentialsOk = await testAlibabaCredentials();
  const rdsOk = await testRDSConnection();
  const ossOk = await testOSSConnection();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Alibaba Cloud Connection Summary:');
  console.log('='.repeat(60));
  console.log(`  RDS MySQL:  ${rdsOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  OSS:        ${ossOk ? '✅ OK' : '⚠️  WARNING'}`);
  console.log(`  Credentials: ${credentialsOk ? '✅ OK' : '❌ FAILED'}`);
  console.log('='.repeat(60) + '\n');

  return credentialsOk && rdsOk && ossOk;
}

/**
 * Backup database to Alibaba OSS
 */
async function backupDatabaseToOSS() {
  try {
    const fs = require('fs');
    const child_process = require('child_process');
    const { DateTime } = require('luxon');

    const timestamp = DateTime.now().toFormat('yyyy-MM-dd-HHmmss');
    const fileName = `wms_backup_${timestamp}.sql`;
    const localPath = path.join(__dirname, `../../..`, 'backups', fileName);

    // Create backups directory if not exists
    const backupsDir = path.dirname(localPath);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Dump MySQL database
    console.log('⏳ Dumping database...');
    const command = `mysqldump -h ${alibabaConfig.mysql.host} -u ${alibabaConfig.mysql.user} -p${alibabaConfig.mysql.password} ${alibabaConfig.mysql.database} > "${localPath}"`;
    
    child_process.execSync(command, { stdio: 'inherit' });

    // Upload to OSS
    console.log('⏳ Uploading to Alibaba OSS...');
    const AlibabaOSS = require('ali-oss');
    const client = new AlibabaOSS(alibabaConfig.oss);

    await client.put(`backups/${fileName}`, localPath);

    console.log(`✅ Backup successful: ${fileName}`);
    console.log(`   Backup file: ${localPath}`);
    console.log(`   OSS Location: backups/${fileName}`);

    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    return false;
  }
}

/**
 * Get database connection info for display
 */
function getDatabaseInfo() {
  return {
    host: alibabaConfig.mysql.host,
    port: alibabaConfig.mysql.port,
    database: alibabaConfig.mysql.database,
    connectionType: 'Alibaba RDS MySQL',
    region: alibabaConfig.credentials.region,
    ssl: alibabaConfig.mysql.ssl ? 'Enabled' : 'Disabled',
  };
}

/**
 * Initialize Alibaba Cloud services
 */
async function initializeAlibabaCloud() {
  console.log('🚀 Initializing Alibaba Cloud services...');
  
  try {
    const allOk = await verifyAllConnections();
    
    if (!allOk) {
      console.warn('⚠️  Some Alibaba Cloud services are not properly configured');
      console.warn('   Please check your .env.alibaba file and credentials');
    }

    return {
      rds: alibabaConfig.mysql,
      oss: alibabaConfig.oss,
      credentials: alibabaConfig.credentials,
      initialized: allOk,
    };
  } catch (error) {
    console.error('❌ Failed to initialize Alibaba Cloud:', error.message);
    return { initialized: false };
  }
}

module.exports = {
  testRDSConnection,
  testOSSConnection,
  testAlibabaCredentials,
  verifyAllConnections,
  backupDatabaseToOSS,
  getDatabaseInfo,
  initializeAlibabaCloud,
  config: alibabaConfig,
};
