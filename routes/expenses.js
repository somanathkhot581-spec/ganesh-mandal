// routes/expenses.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = crypto.randomBytes(8).toString('hex');
        cb(null, `expense-${Date.now()}-${unique}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXT.includes(ext)) {
            return cb(new Error('Only PDF, PNG, JPG, or WEBP files are allowed.'));
        }
        cb(null, true);
    }
});

function rupeesToPaise(value) {
    const n = Number(value);
    if (!isFinite(n)) return null;
    return Math.round(n * 100);
}
function paiseToRupees(paise) {
    return Math.round(paise) / 100;
}

function serialize(e) {
    return { ...e, amount: paiseToRupees(e.amount) };
}

// GET /api/expenses?search=&from=&to=&category=&year=
router.get('/', requireAuth, (req, res) => {
    const { search, from, to, category, year } = req.query;
    let sql = `
        SELECT expenses.*, categories.name AS category_name
        FROM expenses
        JOIN categories ON categories.id = expenses.category_id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        sql += ' AND (expenses.description LIKE ? OR expenses.paid_to LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (from) {
        sql += ' AND expenses.date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND expenses.date <= ?';
        params.push(to);
    }
    if (category) {
        sql += ' AND expenses.category_id = ?';
        params.push(category);
    }
    if (year && /^\d{4}$/.test(year)) {
        sql += " AND strftime('%Y', expenses.date) = ?";
        params.push(year);
    }
    sql += ' ORDER BY expenses.date DESC, expenses.id DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(serialize));
});

router.get('/:id', requireAuth, (req, res) => {
    const row = db.prepare(`
        SELECT expenses.*, categories.name AS category_name
        FROM expenses JOIN categories ON categories.id = expenses.category_id
        WHERE expenses.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Expense not found.' });
    res.json(serialize(row));
});

router.post('/', requireAuth, upload.single('receipt_file'), (req, res) => {
    try {
        const { category_id, description, amount, date, paid_to, payment_method, notes } = req.body || {};

        if (!category_id) return res.status(400).json({ error: 'Category is required.' });
        if (!date) return res.status(400).json({ error: 'Date is required.' });
        if (!PAYMENT_METHODS.includes(payment_method)) {
            return res.status(400).json({ error: 'Invalid payment method.' });
        }
        const paise = rupeesToPaise(amount);
        if (paise === null || paise <= 0) {
            return res.status(400).json({ error: 'Expense amount must be a positive number.' });
        }
        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id);
        if (!category) return res.status(400).json({ error: 'Selected category does not exist.' });

        const receiptFile = req.file ? req.file.filename : null;

        const info = db.prepare(`
            INSERT INTO expenses (category_id, description, amount, date, paid_to, payment_method, notes, receipt_file)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(category_id, description ? description.trim() : null, paise, date,
               paid_to ? paid_to.trim() : null, payment_method, notes ? notes.trim() : null, receiptFile);

        const created = db.prepare(`
            SELECT expenses.*, categories.name AS category_name
            FROM expenses JOIN categories ON categories.id = expenses.category_id
            WHERE expenses.id = ?
        `).get(info.lastInsertRowid);
        res.status(201).json(serialize(created));
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to save expense.' });
    }
});

router.put('/:id', requireAuth, upload.single('receipt_file'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Expense not found.' });

        const { category_id, description, amount, date, paid_to, payment_method, notes, remove_receipt } = req.body || {};

        if (!category_id) return res.status(400).json({ error: 'Category is required.' });
        if (!date) return res.status(400).json({ error: 'Date is required.' });
        if (!PAYMENT_METHODS.includes(payment_method)) {
            return res.status(400).json({ error: 'Invalid payment method.' });
        }
        const paise = rupeesToPaise(amount);
        if (paise === null || paise <= 0) {
            return res.status(400).json({ error: 'Expense amount must be a positive number.' });
        }
        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id);
        if (!category) return res.status(400).json({ error: 'Selected category does not exist.' });

        let receiptFile = existing.receipt_file;
        if (req.file) {
            if (existing.receipt_file) {
                const oldPath = path.join(UPLOAD_DIR, existing.receipt_file);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            receiptFile = req.file.filename;
        } else if (remove_receipt === 'true' && existing.receipt_file) {
            const oldPath = path.join(UPLOAD_DIR, existing.receipt_file);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            receiptFile = null;
        }

        db.prepare(`
            UPDATE expenses
            SET category_id = ?, description = ?, amount = ?, date = ?, paid_to = ?, payment_method = ?, notes = ?, receipt_file = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(category_id, description ? description.trim() : null, paise, date,
               paid_to ? paid_to.trim() : null, payment_method, notes ? notes.trim() : null, receiptFile, req.params.id);

        const updated = db.prepare(`
            SELECT expenses.*, categories.name AS category_name
            FROM expenses JOIN categories ON categories.id = expenses.category_id
            WHERE expenses.id = ?
        `).get(req.params.id);
        res.json(serialize(updated));
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update expense.' });
    }
});

router.delete('/:id', requireAuth, (req, res) => {
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Expense not found.' });
    if (existing.receipt_file) {
        const filePath = path.join(UPLOAD_DIR, existing.receipt_file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
