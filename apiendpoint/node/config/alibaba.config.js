/**
 * Alibaba Cloud Configuration
 * Handles RDS MySQL, OSS, and other Alibaba Cloud services
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.alibaba') });

module.exports = {
  // ==================================================
  // ALIBABA CLOUD CREDENTIALS
  // ==================================================
  credentials: {
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
    region: process.env.ALIBABA_REGION || 'ap-southeast-1',
  },

  // ==================================================
  // APSARADB RDS MYSQL CONNECTION
  // ==================================================
  mysql: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    // Connection pool
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'true',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
    
    // SSL/TLS Configuration (if enabled)
    ssl: process.env.DB_SSL_ENABLED === 'true' ? {
      ca: process.env.DB_SSL_CA_PATH,
      rejectUnauthorized: false,
    } : false,
    
    // Sequelize Options for ORM
    sequelize: {
      dialect: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      logging: process.env.NODE_ENV === 'production' ? false : console.log,
      pool: {
        max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  },

  // ==================================================
  // ALIBABA OSS (OBJECT STORAGE SERVICE)
  // ==================================================
  oss: {
    region: process.env.OSS_REGION || 'ap-southeast-1',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || process.env.ALIBABA_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || process.env.ALIBABA_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET_NAME,
    endpoint: process.env.OSS_ENDPOINT,
  },

  // ==================================================
  // ALIBABA MESSAGE QUEUE (Optional)
  // ==================================================
  mq: {
    enabled: !!process.env.MQ_ENDPOINT,
    endpoint: process.env.MQ_ENDPOINT,
    queueName: process.env.MQ_QUEUE_NAME,
    topicName: process.env.MQ_TOPIC_NAME,
    consumerGroup: process.env.MQ_CONSUMER_GROUP,
    username: process.env.MQ_USERNAME,
    password: process.env.MQ_PASSWORD,
  },

  // ==================================================
  // SERVICE CONFIGURATION
  // ==================================================
  services: {
    commandService: {
      port: parseInt(process.env.COMMAND_SERVICE_PORT) || 3108,
      host: process.env.COMMAND_SERVICE_HOST || '0.0.0.0',
    },
    queryService: {
      port: parseInt(process.env.QUERY_SERVICE_PORT) || 2025,
      host: process.env.QUERY_SERVICE_HOST || '0.0.0.0',
    },
  },

  // ==================================================
  // VPC & NETWORKING
  // ==================================================
  vpc: {
    vpcId: process.env.VPC_ID,
    securityGroupId: process.env.SECURITY_GROUP_ID,
    ecsInstanceId: process.env.ECS_INSTANCE_ID,
    ecsPrivateIp: process.env.ECS_PRIVATE_IP,
  },

  // ==================================================
  // LOG SERVICE (Optional)
  // ==================================================
  logService: {
    enabled: !!process.env.LOG_SERVICE_ENDPOINT,
    endpoint: process.env.LOG_SERVICE_ENDPOINT,
    project: process.env.LOG_SERVICE_PROJECT,
    logstore: process.env.LOG_SERVICE_LOGSTORE,
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
  },

  // ==================================================
  // BACKUP CONFIGURATION
  // ==================================================
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    frequency: process.env.BACKUP_FREQUENCY || 'daily',
    time: process.env.BACKUP_TIME || '02:00',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    location: process.env.BACKUP_LOCATION,
  },

  // ==================================================
  // SECURITY
  // ==================================================
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
  },

  // ==================================================
  // ENVIRONMENT
  // ==================================================
  environment: process.env.NODE_ENV || 'development',
};
