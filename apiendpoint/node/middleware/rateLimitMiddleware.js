/**
 * Rate Limit Middleware untuk Login
 * Mencegah brute force attacks
 * 
 * Configuration:
 * - Max 5 login attempts per 15 minutes
 * - Per IP address
 * - Message khusus dalam Bahasa Indonesia
 */

const rateLimit = require('express-rate-limit');

// ====== LOGIN RATE LIMITER ======
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/info';
  },
  keyGenerator: (req, res) => {
    // Use client IP as rate limit key
    return req.clientIP || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// ====== API CALL RATE LIMITER ======
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Terlalu banyak request, silakan coba lagi nanti.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't limit health checks
    return req.path === '/health' || req.path === '/info' || req.path === '/cqrs';
  }
});

// ====== STRICT RATE LIMITER (untuk endpoints sensitif) ======
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Hanya 10 requests per minute
  message: 'Terlalu banyak request untuk endpoint ini.',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  apiLimiter,
  strictLimiter
};
