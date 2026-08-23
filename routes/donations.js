// routes/donations.js
const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];

function rupeesToPaise(value) {
    const n = Number(value);
    if (!isFinite(n)) return null;
    return Math.round(n * 100);
}
function paiseToRupees(paise) {
    return Math.round(paise) / 100;
}

function generateReceiptNumber() {
    const year = new Date().getFullYear();
    const row = db.prepare(
        "SELECT COUNT(*) AS c FROM donations WHERE receipt_number LIKE ?"
    ).get(`GM-${year}-%`);
    const next = row.c + 1;
    return `GM-${year}-${String(next).padStart(4, '0')}`;
}

function serialize(d) {
    return { ...d, amount: paiseToRupees(d.amount) };
}

// GET /api/donations?search=&from=&to=&method=&year=
router.get('/', requireAuth, (req, res) => {
    const { search, from, to, method, year } = req.query;
    let sql = 'SELECT * FROM donations WHERE 1=1';
    const params = [];

    if (search) {
        sql += ' AND donor_name LIKE ?';
        params.push(`%${search}%`);
    }
    if (from) {
        sql += ' AND date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND date <= ?';
        params.push(to);
    }
    if (method) {
        sql += ' AND payment_method = ?';
        params.push(method);
    }
    if (year && /^\d{4}$/.test(year)) {
        sql += " AND strftime('%Y', date) = ?";
        params.push(year);
    }
    sql += ' ORDER BY date DESC, id DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(serialize));
});

router.get('/:id', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Donation not found.' });
    res.json(serialize(row));
});

router.post('/', requireAuth, (req, res) => {
    const { donor_name, mobile, amount, date, payment_method, notes } = req.body || {};

    if (!donor_name || !donor_name.trim()) {
        return res.status(400).json({ error: 'Donor name is required.' });
    }
    if (!date) {
        return res.status(400).json({ error: 'Date is required.' });
    }
    if (!PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ error: 'Invalid payment method.' });
    }
    const paise = rupeesToPaise(amount);
    if (paise === null || paise <= 0) {
        return res.status(400).json({ error: 'Donation amount must be a positive number.' });
    }
    if (mobile && !/^[0-9+\-\s]{6,15}$/.test(mobile)) {
        return res.status(400).json({ error: 'Mobile number looks invalid.' });
    }

    const receiptNumber = generateReceiptNumber();

    const info = db.prepare(`
        INSERT INTO donations (receipt_number, donor_name, mobile, amount, date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(receiptNumber, donor_name.trim(), mobile ? mobile.trim() : null, paise, date, payment_method, notes ? notes.trim() : null);

    const created = db.prepare('SELECT * FROM donations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(serialize(created));
});

router.put('/:id', requireAuth, (req, res) => {
    const existing = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Donation not found.' });

    const { donor_name, mobile, amount, date, payment_method, notes } = req.body || {};

    if (!donor_name || !donor_name.trim()) {
        return res.status(400).json({ error: 'Donor name is required.' });
    }
    if (!date) {
        return res.status(400).json({ error: 'Date is required.' });
    }
    if (!PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ error: 'Invalid payment method.' });
    }
    const paise = rupeesToPaise(amount);
    if (paise === null || paise <= 0) {
        return res.status(400).json({ error: 'Donation amount must be a positive number.' });
    }
    if (mobile && !/^[0-9+\-\s]{6,15}$/.test(mobile)) {
        return res.status(400).json({ error: 'Mobile number looks invalid.' });
    }

    db.prepare(`
        UPDATE donations
        SET donor_name = ?, mobile = ?, amount = ?, date = ?, payment_method = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
    `).run(donor_name.trim(), mobile ? mobile.trim() : null, paise, date, payment_method, notes ? notes.trim() : null, req.params.id);

    const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    res.json(serialize(updated));
});

router.delete('/:id', requireAuth, (req, res) => {
    const existing = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Donation not found.' });
    db.prepare('DELETE FROM donations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
