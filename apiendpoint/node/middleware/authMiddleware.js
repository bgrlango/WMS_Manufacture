const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

const verifyAuth = async (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    const authHeader = req.header('Authorization');

    // Prioritas 2: Cek JWT Token (untuk Web dan Android)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Hapus "Bearer "
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findByPk(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Token tidak valid, user tidak ditemukan.' });
            }
            req.user = user;
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
        }
    }

    // Jika tidak ada keduanya
    return res.status(401).json({ message: 'Akses Ditolak. Tidak ada kredensial yang disediakan.' });
};

module.exports = verifyAuth;
