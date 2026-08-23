// public/js/common.js
// Shared helpers used across all pages.

const Money = {
    format(rupees) {
        const n = Number(rupees) || 0;
        return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
};

const Api = {
    async request(url, options = {}) {
        const opts = Object.assign({ credentials: 'same-origin' }, options);
        const res = await fetch(url, opts);
        let data = null;
        try { data = await res.json(); } catch (e) { /* no body */ }
        if (!res.ok) {
            const message = (data && data.error) || `Request failed (${res.status})`;
            const err = new Error(message);
            err.status = res.status;
            throw err;
        }
        return data;
    },
    get(url) {
        return this.request(url);
    },
    post(url, body) {
        return this.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    },
    postForm(url, formData) {
        return this.request(url, { method: 'POST', body: formData });
    },
    put(url, body) {
        return this.request(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    },
    putForm(url, formData) {
        return this.request(url, { method: 'PUT', body: formData });
    },
    del(url) {
        return this.request(url, { method: 'DELETE' });
    }
};

function toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3800);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d)) return isoDate;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function paymentBadgeClass(method) {
    switch (method) {
        case 'Cash': return 'cash';
        case 'UPI': return 'upi';
        case 'Bank Transfer': return 'bank';
        default: return 'other';
    }
}

// Fetches available years (years that actually have data) and fills a <select> with
// "All Years" + every year from 2020 through 2030 (so admins can plan/record for
// future Utsav years too), merged with any actual data years outside that range.
// Returns the list of years (strings, descending) it produced.
async function populateYearSelect(selectEl, { includeAll = true, selected = 'all' } = {}) {
    let dataYears = [];
    try {
        dataYears = await Api.get('/api/reports/years');
    } catch (e) { /* ignore, fall back to the generated range below */ }

    const RANGE_START = 2020;
    const RANGE_END = 2030;
    const rangeYears = [];
    for (let y = RANGE_END; y >= RANGE_START; y--) rangeYears.push(String(y));

    const years = Array.from(new Set([...rangeYears, ...dataYears])).sort((a, b) => b.localeCompare(a));

    const options = [];
    if (includeAll) options.push(`<option value="all">All Years</option>`);
    years.forEach(y => options.push(`<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`));
    selectEl.innerHTML = options.join('');
    const desiredValue = selected === 'latest' && dataYears.length ? dataYears[0] : selected;
    if ([...selectEl.options].some(o => o.value === desiredValue)) {
        selectEl.value = desiredValue;
    }
    return years;
}

// Simple confirm modal (replaces window.confirm with a nicer UI + guarantees "confirm before delete")
function confirmAction({ title = 'Are you sure?', message = '', confirmText = 'Delete', danger = true } = {}) {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal">
                <h3>${escapeHtml(title)}</h3>
                <p class="muted">${escapeHtml(message)}</p>
                <div class="form-actions">
                    <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) { cleanup(false); }
        });
        backdrop.querySelector('[data-action="cancel"]').onclick = () => cleanup(false);
        backdrop.querySelector('[data-action="confirm"]').onclick = () => cleanup(true);
        function cleanup(result) {
            backdrop.remove();
            resolve(result);
        }
    });
}

// Guard: redirect to login if session missing. Call at top of every protected page.
async function requireLogin() {
    try {
        const status = await Api.get('/api/auth/session');
        if (!status.loggedIn) {
            window.location.href = '/login.html';
            return null;
        }
        return status;
    } catch (e) {
        window.location.href = '/login.html';
        return null;
    }
}

async function wireLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        try {
            await Api.post('/api/auth/logout', {});
        } catch (e) { /* ignore */ }
        window.location.href = '/login.html';
    });
}

function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.app-nav a').forEach(a => {
        if (a.getAttribute('href') === path) a.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    wireLogout();
});
