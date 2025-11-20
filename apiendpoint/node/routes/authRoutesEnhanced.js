/**
 * Updated Auth Routes dengan Rate Limiting dan Enhanced Auth
 * 
 * Endpoints:
 * POST /auth/login - Login dan dapatkan token
 * POST /auth/refresh - Refresh access token
 * POST /auth/logout - Logout user
 * GET /auth/me - Get current user info
 * POST /auth/verify - Verify token validity
 * POST /auth/change-password - Change password
 */

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authControllerEnhanced');

// Import middleware
const { loginLimiter } = require('../middleware/rateLimitMiddleware');
const { verifyAuthEnhanced } = require('../middleware/authMiddlewareEnhanced');

// ============================================================
// PUBLIC ENDPOINTS (tanpa authentication)
// ============================================================

/**
 * POST /auth/login
 * Login user dan dapatkan JWT token
 * 
 * Rate Limited: 5 attempts per 15 minutes
 */
router.post('/login', loginLimiter, authController.login);

/**
 * POST /auth/refresh
 * Refresh access token menggunakan refresh token
 * 
 * Body: { refreshToken: "..." }
 */
router.post('/refresh', authController.refreshToken);

/**
 * POST /auth/verify
 * Verify token validity tanpa authentication requirement
 */
router.post('/verify', authController.verifyToken);

// ============================================================
// PROTECTED ENDPOINTS (memerlukan JWT authentication)
// ============================================================

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', verifyAuthEnhanced, authController.getMe);

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', verifyAuthEnhanced, authController.logout);

/**
 * POST /auth/change-password
 * Change user password
 * 
 * Body: { currentPassword: "...", newPassword: "...", confirmPassword: "..." }
 */
router.post('/change-password', verifyAuthEnhanced, authController.changePassword);

module.exports = router;
