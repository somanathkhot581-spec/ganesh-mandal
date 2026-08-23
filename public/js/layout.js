// public/js/layout.js
// Injects the shared header + nav into any page that has a <div id="layout-root"></div>

function renderLayout(username) {
    const root = document.getElementById('layout-root');
    if (!root) return;
    root.innerHTML = `
        <header class="app-header">
            <div class="brand">
                <div class="om">ॐ</div>
                <div class="brand-text">
                    <h1>Hindustan Ganesh Mandal Karadaga</h1>
                    <span>Donation &amp; Expense Manager</span>
                </div>
            </div>
            <div class="header-actions">
                <span class="who">👤 ${escapeHtml(username || '')}</span>
                <button class="btn-logout" id="logout-btn">Logout</button>
            </div>
        </header>
        <nav class="app-nav">
            <a href="dashboard.html">Dashboard</a>
            <a href="donations.html">Donations</a>
            <a href="expenses.html">Expenses</a>
            <a href="categories.html">Categories</a>
            <a href="reports.html">Reports</a>
            <a href="public.html" target="_blank" rel="noopener">Public Page ↗</a>
        </nav>
    `;
    setActiveNav();
    wireLogout();
}

async function initProtectedPage() {
    const session = await requireLogin();
    if (!session) return null;
    renderLayout(session.username);
    return session;
}
