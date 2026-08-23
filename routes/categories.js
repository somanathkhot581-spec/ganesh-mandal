// routes/categories.js
const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public read - needed so donation/expense forms and public page can show category names
router.get('/', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(categories);
});

router.post('/', requireAuth, (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required.' });
    }
    const clean = name.trim();
    const existing = db.prepare('SELECT * FROM categories WHERE name = ? COLLATE NOCASE').get(clean);
    if (existing) {
        return res.status(409).json({ error: 'This category already exists.' });
    }
    const info = db.prepare('INSERT INTO categories (name, is_custom) VALUES (?, 1)').run(clean);
    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
});

router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const inUse = db.prepare('SELECT COUNT(*) AS c FROM expenses WHERE category_id = ?').get(id).c;
    if (inUse > 0) {
        return res.status(400).json({ error: `Cannot delete: ${inUse} expense(s) use this category.` });
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true });
});

module.exports = router;
