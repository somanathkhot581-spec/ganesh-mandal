// server.js
// Hindustan Ganesh Mandal Karadaga Donation & Expense Management - main server entry point.

const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');

const db = require('./db/database'); // ensures DB + tables exist on boot

const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const expenseRoutes = require('./routes/expenses');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const { requireAuth } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (local single-machine app; MemoryStore is fine here)
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8 // 8 hours
    }
}));

// Serve Chart.js locally from node_modules so the app works fully offline after `npm install`.
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

// Serve uploaded expense bills/receipts (only reachable if you know the filename; kept simple for a local app)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);

// Quick way for the frontend to know if any admin exists yet
app.get('/api/setup-status', (req, res) => {
    const count = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
    res.json({ adminExists: count > 0 });
});

// Fallback: any unknown non-API route serves the SPA-ish index for convenience
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (path.extname(req.path)) return next(); // let static handle real files (css/js/img) or 404
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Basic error handler (e.g. multer file-type errors)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
    console.log('==============================================');
    console.log(' Hindustan Ganesh Mandal Karadaga');
    console.log(` Server running at: http://localhost:${PORT}`);
    console.log('==============================================');
});
