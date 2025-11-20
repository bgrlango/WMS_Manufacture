// Lightweight logger to avoid external deps
// Usage: const logger = require('../config/logger');
// logger.info('message'), logger.error('message', err)

const levels = ['error', 'warn', 'info', 'debug'];
const currentLevel = process.env.LOG_LEVEL || 'info';
const levelIndex = levels.indexOf(currentLevel);

function format(level, msg, meta) {
  const ts = new Date().toISOString();
  const metaStr = meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : '';
  return `${ts} [${level.toUpperCase()}] ${msg}${metaStr ? ' ' + metaStr : ''}`;
}

const logger = {
  error: (msg, meta) => {
    if (levelIndex >= 0) console.error(format('error', msg, meta));
  },
  warn: (msg, meta) => {
    if (levelIndex >= 1) console.warn(format('warn', msg, meta));
  },
  info: (msg, meta) => {
    if (levelIndex >= 2) console.log(format('info', msg, meta));
  },
  debug: (msg, meta) => {
    if (levelIndex >= 3) console.debug(format('debug', msg, meta));
  }
};

module.exports = logger;
