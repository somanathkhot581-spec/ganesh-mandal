// db/database.js
// Central SQLite connection using Node's BUILT-IN node:sqlite module.
// This ships inside Node.js itself (v22.5+, no flag needed since v22.13/v23.4) so there is
// nothing to compile and no native build tools required on Windows - it just works.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'mandal.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Make sure schema exists every time the server starts (safe / idempotent - uses IF NOT EXISTS).
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

const DEFAULT_CATEGORIES = [
    'Ganpati Idol',
    'Decoration',
    'Sound System',
    'Lighting',
    'Prasad',
    'Flowers',
    'Pooja Material',
    'Electricity',
    'Transport',
    'Advertisement',
    'Cultural Programs',
    'Cleaning',
    'Other'
];

function seedDefaultCategories() {
    const insert = db.prepare('INSERT OR IGNORE INTO categories (name, is_custom) VALUES (?, 0)');
    // node:sqlite has no db.transaction() helper (unlike better-sqlite3), so wrap manually.
    db.exec('BEGIN');
    try {
        for (const c of DEFAULT_CATEGORIES) insert.run(c);
        db.exec('COMMIT');
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
}
seedDefaultCategories();

module.exports = db;
