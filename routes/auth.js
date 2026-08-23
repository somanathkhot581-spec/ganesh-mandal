// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());
    if (!admin) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const ok = bcrypt.compareSync(password, admin.password_hash);
    if (!ok) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.adminId = admin.id;
    req.session.username = admin.username;
    res.json({ success: true, username: admin.username });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

router.get('/session', (req, res) => {
    if (req.session && req.session.adminId) {
        return res.json({ loggedIn: true, username: req.session.username });
    }
    res.json({ loggedIn: false });
});

module.exports = router;
