// Prefer native bcrypt; fall back to bcryptjs if native module isn't available
let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    // eslint-disable-next-line no-console
    console.warn('bcrypt native module not available, falling back to bcryptjs');
    bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const { User, UserLog } = require('../models');

exports.login = async (req, res) => {
    try {
        // Validasi basic
        if (!req.body || !req.body.email || !req.body.password) {
            console.log('Missing email or password');
            return res.status(400).json({ message: 'Email dan password diperlukan.' });
        }

        const { email, password } = req.body;
        console.log('Login attempt:', email);

        // Ambil IP address yang sudah diproses dari middleware
        const clientIP = req.clientIP || 'unknown';
        console.log('Client IP:', clientIP);

        // Cari user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User tidak ditemukan:', email);
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        console.log('User ditemukan ID:', user.id, 'Role:', user.role, 'Name:', user.full_name);

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('Password salah untuk:', email);
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        // Buat log dengan IP address dan full_name sebagai user_agent (non-blocking on failure)
        console.log('Membuat log dengan IP:', clientIP, 'User Agent:', user.full_name);
        try {
            await UserLog.create({
                user_id: user.id,
                action: 'Login successful',
                ip_address: clientIP,
                user_agent: user.full_name // Menggunakan full_name dari tabel user
            });
        } catch (logErr) {
            console.error('Gagal menulis user_log (diabaikan):', logErr?.message || logErr);
        }

        // Buat JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.trim() === '') {
            console.error('JWT_SECRET tidak terpasang atau kosong. Cek file .env dan konfigurasi proses.');
            return res.status(500).json({ message: 'Konfigurasi server tidak valid (JWT).' });
        }

        console.log('Membuat JWT token...');
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '8h' });

        console.log('Login berhasil untuk:', email, '(' + user.role + ')', 'IP:', clientIP);
        res.json({ 
            message: 'Login berhasil', 
            token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            }
        });

    } catch (error) {
        console.error('Error dalam login:', error?.stack || error?.message || error);
        res.status(500).json({ message: 'Terjadi kesalahan internal.' });
    }
};
