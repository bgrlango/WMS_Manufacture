/**
 * Enhanced Auth Middleware dengan Token Validation
 * Menambahkan verifikasi token yang lebih ketat
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

/**
 * Middleware untuk verifikasi JWT token
 * Mengecek:
 * - Format token (Bearer ...)
 * - Signature dan expiration
 * - User masih ada di database
 * - User belum di-disable
 */
const verifyAuthEnhanced = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    // Validasi header ada
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Akses Ditolak. Header Authorization tidak ditemukan.',
        code: 'AUTH_MISSING'
      });
    }

    // Validasi format Bearer
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Format Authorization header salah. Gunakan: Bearer <token>',
        code: 'AUTH_INVALID_FORMAT'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token || token.trim() === '') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token tidak ditemukan atau kosong.',
        code: 'AUTH_EMPTY_TOKEN'
      });
    }

    // Verifikasi token signature dan expiration
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token sudah kadaluarsa. Silakan login ulang.',
          code: 'AUTH_EXPIRED',
          expiredAt: error.expiredAt
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token tidak valid atau corrupt.',
          code: 'AUTH_INVALID_TOKEN'
        });
      }
      throw error;
    }

    // Validasi payload
    if (!decoded.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token payload tidak valid (user id missing).',
        code: 'AUTH_INVALID_PAYLOAD'
      });
    }

    // Cari user di database
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak ditemukan dalam sistem.',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    // Cek user status (optional - jika ada field 'status')
    if (user.status === 'disabled' || user.status === 'inactive') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account sudah di-disable.',
        code: 'AUTH_USER_DISABLED'
      });
    }

    // Attach user dan token metadata ke request
    req.user = user;
    req.token = {
      raw: token,
      decoded: decoded,
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000)
    };

    next();

  } catch (error) {
    console.error('Error dalam verifyAuthEnhanced:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat verifikasi token.',
      code: 'AUTH_VERIFICATION_ERROR'
    });
  }
};

/**
 * Middleware untuk optional authentication
 * Tidak reject jika token tidak ada, hanya attach user jika ada
 */
const verifyAuthOptional = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Token tidak ada, lanjut tanpa user context
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user && user.status !== 'disabled') {
        req.user = user;
        req.token = { raw: token, decoded };
      }
    } catch (error) {
      // Token invalid atau expired, skip silently
      console.log('Optional auth warning:', error.message);
    }

    next();

  } catch (error) {
    console.error('Error dalam verifyAuthOptional:', error.message);
    next(); // Always continue
  }
};

/**
 * Middleware untuk role-based authorization
 * @param {string|string[]} allowedRoles - Role yang diizinkan
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
        code: 'ROLE_AUTH_MISSING'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `User role "${userRole}" tidak memiliki akses ke resource ini. Required: ${roles.join(' atau ')}`,
        code: 'ROLE_FORBIDDEN',
        requiredRoles: roles,
        userRole: userRole
      });
    }

    next();
  };
};

/**
 * Middleware untuk permission-based authorization
 * @param {string|string[]} requiredPermissions - Permission yang diperlukan
 */
const authorizePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
        code: 'PERM_AUTH_MISSING'
      });
    }

    const userPermissions = req.user.permissions || [];
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    const hasPermission = permissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `User tidak memiliki permission untuk aksi ini. Required: ${permissions.join(' atau ')}`,
        code: 'PERM_FORBIDDEN',
        requiredPermissions: permissions,
        userPermissions: userPermissions
      });
    }

    next();
  };
};

module.exports = {
  verifyAuthEnhanced,
  verifyAuthOptional,
  authorizeRole,
  authorizePermission
};
