# Hindustan Ganesh Mandal Karadaga — Donation & Expense Management Website

A complete, self-contained website for Hindustan Ganesh Mandal Karadaga to record donations, track
expenses, generate donor receipts, and show a public transparency summary.

- **Frontend:** plain HTML, CSS, JavaScript (no build step, works in any modern browser)
- **Backend:** Node.js + Express
- **Database:** SQLite, using Node's own **built-in** `node:sqlite` module (no separate
  database software to install, and nothing to compile — it ships inside Node.js itself)
- **Charts:** Chart.js (bundled locally — no internet needed once installed)

> **Node.js version requirement:** this project needs **Node.js v22.5 or newer**
> (v22 LTS or v24 LTS both work great) because it uses Node's built-in SQLite support.
> If you're on an older Node.js version, update it via https://nodejs.org first.

Once installed, the website runs **entirely on your own computer** and does **not**
need an internet connection to be used.

---

## 1. Install the required software (one-time)

You only need to do this once per computer.

1. **Install Node.js**
   - Go to https://nodejs.org
   - Download a Windows installer for **Node.js v22 or v24** (either the LTS button or
     the Current version both work — just avoid anything older than v22).
   - Accept the defaults and finish the installation.
   - To confirm it worked, open a **new** Command Prompt window (search "cmd" in the
     Start menu) and type:
     ```
     node -v
     npm -v
     ```
     You should see a version number 22.5.0 or higher (e.g. `v22.14.0` or `v24.19.0`).
     If you see an error, restart your computer and try again.

2. **Get the project folder**
   - Unzip the `ganpati-mandal` folder you received onto your computer, for example
     onto your Desktop, so you have a folder like:
     `C:\Users\<YourName>\Desktop\ganpati-mandal`

---

## 2. Install dependencies (one-time, needs internet)

1. Open **Command Prompt**.
2. Navigate into the project folder. For example, if it's on your Desktop:
   ```
   cd Desktop\ganpati-mandal
   ```
3. Install the required packages:
   ```
   npm install
   ```
   This downloads Express, Chart.js, and a couple of small helper packages into a
   `node_modules` folder. None of them need compiling (the SQLite database engine is
   already built into Node.js itself), so this step should finish in well under a
   minute with no errors, even on a machine with no developer tools installed.

---

## 3. Create/initialize the database and first admin account

Still in the same Command Prompt window, inside the project folder, run:

```
npm run init-db
```

This will:
- Create the SQLite database file (`data\mandal.db`) with all required tables
  (donations, expenses, categories, admins).
- Load the default expense categories (Ganpati Idol, Decoration, Sound System, etc.).
- Ask you to choose an **admin username** and **password** — type these in and
  press Enter after each. This becomes your login for managing the site.
  (Note: the password is shown on screen as you type it, since that's the most
  reliable way to enter it correctly on every version of Windows — just make sure
  no one's looking over your shoulder while you set it up.)

You only need to run this once. If you run it again later, it will simply tell you
that setup is already complete (it will not create a second admin or wipe your data).

> Forgot your password? Delete `data\mandal.db` and run `npm run init-db` again to
> start fresh — note this also deletes all donations/expenses, so only do this before
> you've entered real data, or back the file up first.

---

## 4. Start the website

In the same Command Prompt window:

```
npm start
```

You should see:
```
==============================================
 Hindustan Ganesh Mandal Karadaga
 Server running at: http://localhost:3000
==============================================
```

Leave this Command Prompt window open — closing it stops the website.

---

## 5. Open the website in your browser

Open any browser (Chrome, Edge, Firefox) and go to:

```
http://localhost:3000
```

Log in with the admin username and password you created in Step 3.

To let other computers/phones **on the same WiFi network** access it, find your
computer's local IP address (run `ipconfig` in Command Prompt and look for
"IPv4 Address", e.g. `192.168.1.5`), then visit `http://192.168.1.5:3000` from the
other device.

---

## 6. Using the website day-to-day

Next time you want to use the site, you only need Steps 4 and 5:
1. Open Command Prompt in the project folder (`cd Desktop\ganpati-mandal`)
2. Run `npm start`
3. Open `http://localhost:3000` in your browser

To stop the server, click the Command Prompt window and press `Ctrl + C`.

### What you can do once logged in
- **Dashboard** — totals, balance, donor/expense counts, recent activity, income vs expense chart.
- **Donations** — add/edit/delete donations, search & filter, print/save a receipt as PDF (via the "Receipt" button → browser's Print dialog → "Save as PDF").
- **Expenses** — add/edit/delete expenses, attach a bill/receipt file (PDF or image), filter by date/category.
- **Categories** — add your own custom expense categories in addition to the built-in ones.
- **Reports** — charts for expenses by category, donations over time, monthly income vs expenses, and a top-donors table.
- **Public Page** (`/public.html`) — a read-only summary (totals + expense breakdown, no donor phone numbers) you can share publicly. Turn it on/off from the Reports page.

All monetary amounts are validated (must be greater than zero) and every delete
action asks for confirmation first.

---

## Project structure

```
ganpati-mandal/
├── server.js              Main Express server
├── package.json
├── db/
│   ├── schema.sql          Database table definitions
│   ├── database.js         DB connection + auto-setup
│   └── init-db.js          First-time setup script (creates admin)
├── middleware/
│   └── authMiddleware.js   Login-required guard for admin API routes
├── routes/
│   ├── auth.js              Login / logout / session check
│   ├── donations.js         Donation CRUD + search/filter + receipt numbers
│   ├── expenses.js          Expense CRUD + search/filter + file upload
│   ├── categories.js        Category management
│   └── reports.js           Dashboard totals, full reports, public summary
├── public/                  Frontend (plain HTML/CSS/JS)
│   ├── login.html, dashboard.html, donations.html, expenses.html,
│   │   categories.html, reports.html, public.html, receipt.html
│   ├── css/style.css
│   └── js/ (common.js, layout.js)
├── data/                    SQLite database file lives here (created on setup)
└── uploads/                 Uploaded expense bills/receipts are stored here
```

## Troubleshooting

- **`Cannot find module 'node:sqlite'` or a SQLite-related startup error** — Your
  Node.js version is older than v22.5. Update Node.js from https://nodejs.org (v22 or
  v24), close and reopen Command Prompt, confirm with `node -v`, then run `npm install`
  again from inside the project folder.

- **You see a yellow warning line like `ExperimentalWarning: SQLite is an experimental
  feature`** — This is expected and harmless; the app will run normally. It's just
  Node.js reminding you that its built-in SQLite support is still being finalized.

- **`npm error enoent Could not read package.json`** — You're running `npm install` or
  `npm start` from the wrong folder. Navigate (in File Explorer) into the folder that
  directly contains `package.json` and `server.js` — sometimes unzipping creates an
  extra nested folder with the same name — then open Command Prompt from inside *that*
  exact folder (click the address bar, type `cmd`, press Enter) before running commands.

- **"Port 3000 already in use"** — Another program is using that port. Either close
  it, or start this app on a different port:
  ```
  set PORT=4000
  npm start
  ```
  then open `http://localhost:4000` instead.

- **Forgot to run `npm run init-db`** — The login page will show a message telling
  you no admin account exists yet if you try to open it before setup.

- **Antivirus/Firewall prompt when running `npm start`** — Choose "Allow access."
  The app only listens on your own computer/local network; it doesn't send any data
  outside your network.

---

## Notes on data & security

- All money values are stored internally as whole paise (integers) to avoid
  floating-point rounding problems, and are converted to rupees for display.
- Passwords are hashed with bcrypt before being stored — plain-text passwords are
  never saved.
- Only logged-in administrators can add/edit/delete donations or expenses, manage
  categories, or view the admin dashboard/reports. The public page never shows
  donor phone numbers or notes.
- This app is designed for **local/trusted-network use** by a Mandal committee. If
  you want to make it reachable from the public internet, ask a technical volunteer
  to help you set up HTTPS and a proper hosting environment first.
