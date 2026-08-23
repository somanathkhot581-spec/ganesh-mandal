-- Ganpati Mandal Donation & Expense Management - Database Schema

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE NOT NULL,
    donor_name TEXT NOT NULL,
    mobile TEXT,
    amount INTEGER NOT NULL,           -- stored in paise (integer) to avoid float rounding errors
    date TEXT NOT NULL,                -- YYYY-MM-DD
    payment_method TEXT NOT NULL,      -- Cash / UPI / Bank Transfer / Other
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,           -- stored in paise (integer)
    date TEXT NOT NULL,                -- YYYY-MM-DD
    paid_to TEXT,
    payment_method TEXT NOT NULL,
    notes TEXT,
    receipt_file TEXT,                 -- filename of uploaded bill/receipt
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date);
CREATE INDEX IF NOT EXISTS idx_donations_name ON donations(donor_name);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
