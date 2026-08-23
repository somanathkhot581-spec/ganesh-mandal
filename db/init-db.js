// db/init-db.js
// Run with: npm run init-db
// Creates the SQLite database (if it doesn't exist) and walks the user through
// creating the first administrator account.
//
// NOTE: password entry here is plain (visible as you type), not masked. An earlier
// version tried to hide keystrokes manually, but Backspace is sent as a different
// character on Windows vs Mac/Linux terminals, which could silently corrupt the
// typed password. Visible input is simple and 100% reliable across all terminals -
// just make sure no one is looking over your shoulder while you set it up.

const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('./database'); // importing this already creates tables + default categories

function ask(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
    console.log('==============================================');
    console.log(' Hindustan Ganesh Mandal Karadaga - Database Setup');
    console.log('==============================================');

    const existingAdmins = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
    if (existingAdmins > 0) {
        console.log(`Database already has ${existingAdmins} admin account(s).`);
        console.log('Setup already complete. You can start the server with: npm start');
        process.exit(0);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    let username = '';
    while (!username) {
        username = (await ask(rl, 'Choose an admin username: ')).trim();
        if (!username) console.log('Username cannot be empty.');
    }

    let password = '';
    while (password.length < 6) {
        password = (await ask(rl, 'Choose an admin password (min 6 characters, will be visible as you type): ')).trim();
        if (password.length < 6) console.log('Password too short, try again.');
    }

    const confirm = (await ask(rl, 'Confirm password (type it again): ')).trim();
    if (confirm !== password) {
        console.log('Passwords do not match. Please run "npm run init-db" again.');
        rl.close();
        process.exit(1);
    }

    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);

    console.log('==============================================');
    console.log(' Admin account created successfully!');
    console.log(` Username: ${username}`);
    console.log(' You can now start the website with: npm start');
    console.log('==============================================');

    rl.close();
    process.exit(0);
}

main().catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
});
