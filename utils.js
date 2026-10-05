/* ============================================
   SPENDSENSE — API Client + Shared Utilities
   Backend: http://localhost:4000/api
============================================ */

const API_BASE = 'http://localhost:4000/api';

// ── Token & Session (stored locally for fast UI) ──────
function getToken()        { return localStorage.getItem('ss_token') || null; }
function saveToken(t)      { localStorage.setItem('ss_token', t); }
function removeToken()     { localStorage.removeItem('ss_token'); }

function getSession() {
  try { return JSON.parse(localStorage.getItem('ss_session') || 'null'); }
  catch(e) { return null; }
}
function saveSession(user) { localStorage.setItem('ss_session', JSON.stringify(user)); }
function removeSession()   { localStorage.removeItem('ss_session'); }

// ── Core fetch wrapper ────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// ── Auth guard ────────────────────────────────────────
function requireAuth() {
  const session = getSession();
  const token   = getToken();
  if (!session || !token) {
    window.location.href = 'auth.html';
    return null;
  }
  return session;
}

function logout() {
  removeToken();
  removeSession();
  window.location.href = 'auth.html';
}

function initPageData() {
  applyUserGreeting();
}

// ================================================================
//  DATA API METHODS — all return Promises
// ================================================================

// Expenses
async function loadExpenses(month, year) {
  let qs = (month && year) ? `?month=${month}&year=${year}` : '';
  return apiFetch(`/expenses${qs}`);
}
async function apiAddExpense(data)       { return apiFetch('/expenses', { method:'POST', body:JSON.stringify(data) }); }
async function apiUpdateExpense(id, data){ return apiFetch(`/expenses/${id}`, { method:'PUT',  body:JSON.stringify(data) }); }
async function apiDeleteExpense(id)      { return apiFetch(`/expenses/${id}`, { method:'DELETE' }); }
async function apiResetExpenses()        { return apiFetch('/expenses',        { method:'DELETE' }); }

// Budgets
async function apiFetchBudgets()            { return apiFetch('/budgets'); }
async function apiAddBudget(data)           { return apiFetch('/budgets', { method:'POST', body:JSON.stringify(data) }); }
async function apiUpdateBudget(id, data)    { return apiFetch(`/budgets/${id}`, { method:'PUT',  body:JSON.stringify(data) }); }
async function apiDeleteBudget(id)          { return apiFetch(`/budgets/${id}`, { method:'DELETE' }); }
async function apiReplaceBudgets(budgets)   { return apiFetch('/budgets/replace', { method:'POST', body:JSON.stringify({ budgets }) }); }

// Goals
async function apiFetchGoals()              { return apiFetch('/goals'); }
async function apiAddGoal(data)             { return apiFetch('/goals', { method:'POST', body:JSON.stringify(data) }); }
async function apiUpdateGoal(id, data)      { return apiFetch(`/goals/${id}`, { method:'PUT',  body:JSON.stringify(data) }); }
async function apiAddFunds(id, amount)      { return apiFetch(`/goals/${id}/add-funds`, { method:'PATCH', body:JSON.stringify({ amount }) }); }
async function apiDeleteGoal(id)            { return apiFetch(`/goals/${id}`, { method:'DELETE' }); }

// Reminders
async function apiFetchReminders()          { return apiFetch('/reminders'); }
async function apiAddReminder(data)         { return apiFetch('/reminders', { method:'POST', body:JSON.stringify(data) }); }
async function apiPayReminder(id)           { return apiFetch(`/reminders/${id}/pay`, { method:'PATCH' }); }
async function apiDeleteReminder(id)        { return apiFetch(`/reminders/${id}`, { method:'DELETE' }); }

// Salary
async function apiFetchSalary()             { const d = await apiFetch('/salary'); return d.salary; }
async function apiSaveSalary(val)           { const d = await apiFetch('/salary', { method:'PUT', body:JSON.stringify({ salary: val }) }); return d.salary; }

// Profile
async function apiUpdateProfile(data)       { return apiFetch('/auth/profile',  { method:'PUT',    body:JSON.stringify(data) }); }
async function apiChangePassword(data)      { return apiFetch('/auth/password', { method:'PUT',    body:JSON.stringify(data) }); }
async function apiDeleteAccount()           { return apiFetch('/auth/account',  { method:'DELETE' }); }

// ================================================================
//  IN-MEMORY CACHE — pages load data once into this cache
//  so the rest of the page JS (loadData/saveData) still works
// ================================================================
const _cache = {};
function saveData(key, val) { _cache[key] = val; }
function loadData(key, def) { return _cache[key] !== undefined ? _cache[key] : def; }
function saveUserData(key, val)      { saveData(key, val); }
function loadUserData(key, def)      { return loadData(key, def); }

// ── Helper used by settings.js reset ─────────────────
async function apiResetAllData() {
  await Promise.all([
    apiFetch('/expenses', { method:'DELETE' }),
    apiFetch('/budgets/replace', { method:'POST', body:JSON.stringify({ budgets:[] }) }),
    apiFetch('/goals',     { method:'GET' }).then(gs => Promise.all(gs.map(g => apiFetch(`/goals/${g._id}`, { method:'DELETE' })))),
    apiFetch('/reminders', { method:'GET' }).then(rs => Promise.all(rs.map(r => apiFetch(`/reminders/${r._id}`, { method:'DELETE' })))),
    apiFetch('/salary',    { method:'PUT', body:JSON.stringify({ salary:0 }) }),
  ]);
}

// ================================================================
//  FORMATTING
// ================================================================
function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits:0 });
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dateStr); due.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000*60*60*24));
}

// ================================================================
//  CATEGORIES
// ================================================================
const CATEGORIES = {
  food:          { label:'Food & Dining',  icon:'🍔', colorClass:'cat-food' },
  entertainment: { label:'Entertainment',  icon:'🎬', colorClass:'cat-entertainment' },
  shopping:      { label:'Shopping',       icon:'🛒', colorClass:'cat-shopping' },
  subscriptions: { label:'Subscriptions',  icon:'📺', colorClass:'cat-subscriptions' },
  transport:     { label:'Transport',      icon:'🚗', colorClass:'cat-transport' },
  health:        { label:'Healthcare',     icon:'🏥', colorClass:'cat-health' },
  utilities:     { label:'Utilities',      icon:'💡', colorClass:'cat-utilities' },
  rent:          { label:'Rent',           icon:'🏠', colorClass:'cat-other' },
  emi:           { label:'EMI / Loan',     icon:'🏦', colorClass:'cat-other' },
  insurance:     { label:'Insurance',      icon:'🛡️', colorClass:'cat-other' },
  other:         { label:'Other',          icon:'📦', colorClass:'cat-other' },
};
function getCategoryInfo(key, customLabel) {
  if (CATEGORIES[key]) return CATEGORIES[key];
  const label = customLabel || key.replace(/^custom_/,'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  return { label, icon:'📦', colorClass:'cat-other' };
}

// ================================================================
//  UI HELPERS
// ================================================================
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

function showToast(message, type='info', duration=3500) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const icons = { success:'✅', warning:'⚠️', danger:'❌', info:'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function applyUserGreeting() {
  const session = getSession();
  if (!session) return;
  const firstName = session.firstName || 'Friend';
  const lastName  = session.lastName  || '';
  const initials  = (firstName.charAt(0) + (lastName ? lastName.charAt(0):'')).toUpperCase();

  const greetEl = document.getElementById('userGreeting');
  if (greetEl) greetEl.textContent = `${getGreeting()}, ${firstName} 👋`;

  const dateEl = document.getElementById('topbarDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN',
    { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  document.querySelectorAll('.user-avatar-init').forEach(el => {
    const av = session.avatar;
    if (av && av.length <= 2 && /\p{Emoji}/u.test(av)) {
      el.textContent = av; el.style.fontSize = '1.2rem';
    } else { el.textContent = initials; }
  });

  const sn = document.getElementById('sidebarUserName');
  const sr = document.getElementById('sidebarUserRole');
  if (sn) sn.textContent = `${firstName} ${lastName}`.trim();
  if (sr) sr.textContent  = 'Free Plan';
}
