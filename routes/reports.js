// routes/reports.js
const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

function paiseToRupees(paise) {
    return Math.round(paise || 0) / 100;
}

// Normalizes a ?year= query param: a 4-digit year string, or null/undefined/"all" for no filter.
function parseYear(yearParam) {
    if (!yearParam || yearParam === 'all') return null;
    const y = String(yearParam).trim();
    return /^\d{4}$/.test(y) ? y : null;
}

function computeTotals(year) {
    const yearClause = year ? "WHERE strftime('%Y', date) = ?" : '';
    const params = year ? [year] : [];

    const totalDonations = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM donations ${yearClause}`).get(...params).s;
    const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM expenses ${yearClause}`).get(...params).s;
    const donorCount = db.prepare(`SELECT COUNT(DISTINCT donor_name COLLATE NOCASE) AS c FROM donations ${yearClause}`).get(...params).c;
    const expenseCount = db.prepare(`SELECT COUNT(*) AS c FROM expenses ${yearClause}`).get(...params).c;
    return {
        totalDonations: paiseToRupees(totalDonations),
        totalExpenses: paiseToRupees(totalExpenses),
        remainingBalance: paiseToRupees(totalDonations - totalExpenses),
        donorCount,
        expenseCount
    };
}

// ---- List of years that have data (used to populate year selectors everywhere) ----
router.get('/years', (req, res) => {
    const rows = db.prepare(`
        SELECT DISTINCT strftime('%Y', date) AS year FROM donations
        UNION
        SELECT DISTINCT strftime('%Y', date) AS year FROM expenses
        ORDER BY year DESC
    `).all();
    res.json(rows.map(r => r.year).filter(Boolean));
});

// ---- Admin dashboard summary ----
router.get('/dashboard', requireAuth, (req, res) => {
    const year = parseYear(req.query.year);
    const yearClause = year ? "WHERE strftime('%Y', date) = ?" : '';
    const params = year ? [year] : [];

    const totals = computeTotals(year);

    const recentDonations = db.prepare(
        `SELECT * FROM donations ${yearClause} ORDER BY date DESC, id DESC LIMIT 5`
    ).all(...params).map(d => ({ ...d, amount: paiseToRupees(d.amount) }));

    const recentExpenses = db.prepare(`
        SELECT expenses.*, categories.name AS category_name
        FROM expenses JOIN categories ON categories.id = expenses.category_id
        ${year ? "WHERE strftime('%Y', expenses.date) = ?" : ''}
        ORDER BY date DESC, expenses.id DESC LIMIT 5
    `).all(...params).map(e => ({ ...e, amount: paiseToRupees(e.amount) }));

    res.json({ ...totals, year: year || 'all', recentDonations, recentExpenses });
});

// ---- Full reports (admin) ----
router.get('/full', requireAuth, (req, res) => {
    const year = parseYear(req.query.year);
    const donationYearClause = year ? "WHERE strftime('%Y', date) = ?" : '';
    const expenseYearClause = year ? "WHERE strftime('%Y', expenses.date) = ?" : '';
    const params = year ? [year] : [];

    const totals = computeTotals(year);

    const donationsByDate = db.prepare(`
        SELECT date, SUM(amount) AS total FROM donations ${donationYearClause}
        GROUP BY date ORDER BY date ASC
    `).all(...params).map(r => ({ date: r.date, total: paiseToRupees(r.total) }));

    const expensesByCategory = db.prepare(`
        SELECT categories.name AS category, SUM(expenses.amount) AS total
        FROM expenses JOIN categories ON categories.id = expenses.category_id
        ${expenseYearClause}
        GROUP BY categories.id ORDER BY total DESC
    `).all(...params).map(r => ({ category: r.category, total: paiseToRupees(r.total) }));

    const topDonors = db.prepare(`
        SELECT donor_name, SUM(amount) AS total, COUNT(*) AS donationCount
        FROM donations ${donationYearClause}
        GROUP BY donor_name ORDER BY total DESC LIMIT 10
    `).all(...params).map(r => ({ donor_name: r.donor_name, total: paiseToRupees(r.total), donationCount: r.donationCount }));

    const monthlyDonations = db.prepare(`
        SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
        FROM donations ${donationYearClause}
        GROUP BY month ORDER BY month ASC
    `).all(...params).map(r => ({ month: r.month, total: paiseToRupees(r.total) }));

    const monthlyExpenses = db.prepare(`
        SELECT strftime('%Y-%m', expenses.date) AS month, SUM(expenses.amount) AS total
        FROM expenses ${expenseYearClause}
        GROUP BY month ORDER BY month ASC
    `).all(...params).map(r => ({ month: r.month, total: paiseToRupees(r.total) }));

    res.json({
        ...totals,
        year: year || 'all',
        donationsByDate,
        expensesByCategory,
        topDonors,
        monthlyDonations,
        monthlyExpenses
    });
});

// ---- Public transparency page (no auth) ----
// Shows donor names + amounts, and the full expense list, for public accountability.
// Never includes donor mobile numbers, donation/expense notes, or uploaded bill files.
router.get('/public', (req, res) => {
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'public_page_enabled'").get();
    const enabled = settingRow ? settingRow.value === 'true' : true; // default ON

    if (!enabled) {
        return res.json({ enabled: false });
    }

    const year = parseYear(req.query.year);
    const donationYearClause = year ? "WHERE strftime('%Y', date) = ?" : '';
    const expenseYearClause = year ? "WHERE strftime('%Y', expenses.date) = ?" : '';
    const params = year ? [year] : [];

    const totals = computeTotals(year);

    const expenseBreakdown = db.prepare(`
        SELECT categories.name AS category, SUM(expenses.amount) AS total
        FROM expenses JOIN categories ON categories.id = expenses.category_id
        ${expenseYearClause}
        GROUP BY categories.id ORDER BY total DESC
    `).all(...params).map(r => ({ category: r.category, total: paiseToRupees(r.total) }));

    // Public donor honor roll: name + amount + date only (never mobile number or notes).
    const donationsList = db.prepare(`
        SELECT donor_name, amount, date FROM donations
        ${donationYearClause}
        ORDER BY date DESC, id DESC
    `).all(...params).map(d => ({ donor_name: d.donor_name, amount: paiseToRupees(d.amount), date: d.date }));

    // Public expense list: category, description, amount, date, paid to (never internal notes or bill files).
    const expensesList = db.prepare(`
        SELECT categories.name AS category, expenses.description, expenses.amount, expenses.date, expenses.paid_to
        FROM expenses JOIN categories ON categories.id = expenses.category_id
        ${expenseYearClause}
        ORDER BY expenses.date DESC, expenses.id DESC
    `).all(...params).map(e => ({
        category: e.category, description: e.description, amount: paiseToRupees(e.amount),
        date: e.date, paid_to: e.paid_to
    }));

    res.json({
        enabled: true,
        year: year || 'all',
        totalDonations: totals.totalDonations,
        totalExpenses: totals.totalExpenses,
        remainingBalance: totals.remainingBalance,
        donorCount: totals.donorCount,
        expenseBreakdown,
        donationsList,
        expensesList
    });
});

// ---- Toggle public page visibility (admin) ----
router.post('/public/toggle', requireAuth, (req, res) => {
    const { enabled } = req.body || {};
    db.prepare(`
        INSERT INTO settings (key, value) VALUES ('public_page_enabled', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(enabled ? 'true' : 'false');
    res.json({ success: true, enabled: !!enabled });
});

module.exports = router;
