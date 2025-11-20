/**
 * Enhanced Auth Controller
 * Tambahan: Refresh Token, Logout, Token Info
 */

let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}

const jwt = require('jsonwebtoken');
const { User, UserLog } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';

/**
 * POST /auth/login
 * Login user dan dapatkan JWT token + refresh token
 */
exports.login = async (req, res) => {
  try {
    // Validasi basic
    if (!req.body || !req.body.email || !req.body.password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email dan password diperlukan.',
        code: 'LOGIN_MISSING_CREDENTIALS'
      });
    }

    const { email, password } = req.body;
    console.log(`📝 Login attempt: ${email}`);

    // Ambil client IP
    const clientIP = req.clientIP || req.ip || 'unknown';
    console.log(`📍 Client IP: ${clientIP}`);

    // Cari user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`❌ User tidak ditemukan: ${email}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Email atau password salah.',
        code: 'LOGIN_INVALID_CREDENTIALS'
      });
    }

    // Cek user status
    if (user.status === 'disabled' || user.status === 'inactive') {
      console.log(`⛔ User disabled: ${email}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account sudah di-disable.',
        code: 'LOGIN_USER_DISABLED'
      });
    }

    console.log(`✅ User ditemukan: id=${user.id}, role=${user.role}, name=${user.full_name}`);

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`🔐 Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`❌ Invalid password untuk: ${email}`);
      
      // Log failed attempt (non-blocking)
      try {
        await UserLog.create({
          user_id: user.id,
          action: 'Login failed - invalid password',
          ip_address: clientIP,
          user_agent: req.get('user-agent') || 'unknown'
        });
      } catch (logErr) {
        console.error('Log failed attempt error:', logErr.message);
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Email atau password salah.',
        code: 'LOGIN_INVALID_CREDENTIALS'
      });
    }

    // Verify JWT_SECRET exists
    if (!JWT_SECRET || JWT_SECRET.trim() === '') {
      console.error('❌ JWT_SECRET tidak diset atau kosong');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Konfigurasi server tidak valid (JWT).',
        code: 'LOGIN_SERVER_CONFIG_ERROR'
      });
    }

    // Buat JWT token (short-lived, 8 jam)
    console.log('🔑 Membuat JWT token...');
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Buat Refresh token (long-lived, 7 hari)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'refresh'
      },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful login
    try {
      await UserLog.create({
        user_id: user.id,
        action: 'Login successful',
        ip_address: clientIP,
        user_agent: req.get('user-agent') || 'unknown'
      });
    } catch (logErr) {
      console.error('Log successful login error:', logErr.message);
    }

    console.log(`✅ Login berhasil: ${email} (${user.role}) dari ${clientIP}`);

    // Response
    return res.status(200).json({
      message: 'Login berhasil',
      token: token,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      expires_in: 28800, // 8 hours in seconds
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('❌ Error dalam login:', error.stack || error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan internal.',
      code: 'LOGIN_SERVER_ERROR'
    });
  }
};

/**
 * POST /auth/refresh
 * Refresh access token menggunakan refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token diperlukan.',
        code: 'REFRESH_MISSING_TOKEN'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Refresh token sudah kadaluarsa. Silakan login ulang.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token tidak valid.',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Cari user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak ditemukan.',
        code: 'REFRESH_USER_NOT_FOUND'
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`🔄 Token refreshed untuk user: ${user.email}`);

    return res.status(200).json({
      message: 'Token refreshed',
      token: newToken,
      expires_in: 28800,
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('Error dalam refresh token:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat refresh token.',
      code: 'REFRESH_SERVER_ERROR'
    });
  }
};

/**
 * POST /auth/logout
 * Logout user dan invalidate token
 */
exports.logout = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware
    const clientIP = req.clientIP || req.ip || 'unknown';

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak authenticated.',
        code: 'LOGOUT_NOT_AUTHENTICATED'
      });
    }

    // Log logout activity
    try {
      await UserLog.create({
        user_id: user.id,
        action: 'Logout',
        ip_address: clientIP,
        user_agent: req.get('user-agent') || 'unknown'
      });
    } catch (logErr) {
      console.error('Log logout error:', logErr.message);
    }

    console.log(`👋 Logout: ${user.email} dari ${clientIP}`);

    return res.status(200).json({
      message: 'Logout berhasil'
    });

  } catch (error) {
    console.error('Error dalam logout:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat logout.',
      code: 'LOGOUT_SERVER_ERROR'
    });
  }
};

/**
 * GET /auth/me
 * Get current user info dari token
 */
exports.getMe = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
        code: 'GETME_NOT_AUTHENTICATED'
      });
    }

    return res.status(200).json({
      message: 'User info retrieved',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        status: user.status
      },
      token_info: {
        issuedAt: req.token.issuedAt,
        expiresAt: req.token.expiresAt
      }
    });

  } catch (error) {
    console.error('Error dalam getMe:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan.',
      code: 'GETME_SERVER_ERROR'
    });
  }
};

/**
 * POST /auth/verify
 * Verify apakah token masih valid
 */
exports.verifyToken = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware

    if (!user) {
      return res.status(401).json({
        valid: false,
        message: 'Token tidak valid atau expired.'
      });
    }

    return res.status(200).json({
      valid: true,
      message: 'Token valid',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      expiresAt: req.token.expiresAt
    });

  } catch (error) {
    console.error('Error dalam verifyToken:', error.message);
    return res.status(500).json({
      valid: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * POST /auth/change-password
 * Change user password
 */
exports.changePassword = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
        code: 'CHANGEPWD_NOT_AUTHENTICATED'
      });
    }

    // Validasi
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password, new password, dan confirmation diperlukan.',
        code: 'CHANGEPWD_MISSING_FIELDS'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password baru dan konfirmasi tidak cocok.',
        code: 'CHANGEPWD_MISMATCH'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password baru minimal 6 karakter.',
        code: 'CHANGEPWD_TOO_SHORT'
      });
    }

    // Verifikasi current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password salah.',
        code: 'CHANGEPWD_CURRENT_INVALID'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update database
    await user.update({ password: hashedNewPassword });

    console.log(`🔑 Password changed untuk user: ${user.email}`);

    return res.status(200).json({
      message: 'Password berhasil diubah'
    });

  } catch (error) {
    console.error('Error dalam changePassword:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat mengubah password.',
      code: 'CHANGEPWD_SERVER_ERROR'
    });
  }
};
