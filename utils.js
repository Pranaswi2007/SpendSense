/* ============================================
   SPENDSENSE - Shared Utility Functions
   Per-user data isolation + auth guard
============================================ */

// ---- SIDEBAR TOGGLE ----
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// ---- MODAL ----
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

// ---- TOAST NOTIFICATIONS ----
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success:'✅', warning:'⚠️', danger:'❌', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- FORMATTING ----
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dateStr); due.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// ---- CATEGORY HELPERS ----
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
  // Custom user-defined category (key starts with "custom_")
  const label = customLabel || key.replace(/^custom_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { label, icon: '📦', colorClass: 'cat-other' };
}

// ================================================================
//  AUTH HELPERS  (mirrors auth.js — safe to call on every page)
// ================================================================
function getSession() {
  try { return JSON.parse(localStorage.getItem('ss_session') || 'null'); }
  catch(e) { return null; }
}

function requireAuth() {
  const session = getSession();
  if (!session || !session.uid) { window.location.href = 'auth.html'; return null; }
  return session;
}

function logout() {
  localStorage.removeItem('ss_session');
  window.location.href = 'auth.html';
}

// ================================================================
//  PER-USER DATA STORAGE
//  All reads/writes are scoped to the logged-in user's UID so
//  two different accounts never share data.
// ================================================================
function userKey(key) {
  const session = getSession();
  return session ? `ss_user_${session.uid}_${key}` : `ss_anon_${key}`;
}

function saveData(key, data)       { localStorage.setItem(userKey(key), JSON.stringify(data)); }
function saveUserData(key, data)   { saveData(key, data); }   // alias used by settings.js / goals.js

function loadData(key, defaultVal = null) {
  const stored = localStorage.getItem(userKey(key));
  return stored !== null ? JSON.parse(stored) : defaultVal;
}
function loadUserData(key, defaultVal = null) { return loadData(key, defaultVal); }

// ================================================================
//  PERSONALIZED GREETING + SIDEBAR USER INFO
// ================================================================
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
  const initials  = (firstName.charAt(0) + (session.lastName ? session.lastName.charAt(0) : '')).toUpperCase();

  // Topbar greeting
  const greetEl = document.getElementById('userGreeting');
  if (greetEl) greetEl.textContent = `${getGreeting()}, ${firstName} 👋`;

  // Topbar subtitle date
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  // All avatar initials
  document.querySelectorAll('.user-avatar-init').forEach(el => {
    const av = session.avatar;
    // If it's an emoji avatar show that, otherwise show initials
    if (av && av.length <= 2 && /\p{Emoji}/u.test(av)) {
      el.textContent = av;
      el.style.fontSize = '1.2rem';
    } else {
      el.textContent = initials;
    }
  });

  // Sidebar user block
  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarRole = document.getElementById('sidebarUserRole');
  if (sidebarName) sidebarName.textContent = `${firstName} ${session.lastName || ''}`.trim();
  if (sidebarRole) {
    // Demo user gets "Demo Account", others get "Free Plan"
    const plan = session.uid === 'demo_user' ? 'Demo Account' : 'Free Plan';
    sidebarRole.textContent = plan;
  }
}

// ================================================================
//  SEED DEFAULT DEMO DATA  (only for the DEMO account)
//  New real users get a completely empty dashboard.
// ================================================================
function initDefaultData() {
  // Already seeded for this user?
  if (loadData('initialized')) return;

  const session = getSession();
  const isDemoUser = session && session.uid === 'demo_user';

  if (isDemoUser) {
    // Seed rich sample data for demo
    const expenses = [
      { id:1,  name:'Swiggy Order',      category:'food',          amount:450,  date:'2026-09-16', payment:'UPI',        notes:'' },
      { id:2,  name:'Netflix',           category:'subscriptions', amount:649,  date:'2026-09-15', payment:'Card',       notes:'Monthly sub' },
      { id:3,  name:'Amazon Order',      category:'shopping',      amount:2399, date:'2026-09-14', payment:'UPI',        notes:'Headphones' },
      { id:4,  name:'Ola Cab',           category:'transport',     amount:185,  date:'2026-09-13', payment:'Wallet',     notes:'' },
      { id:5,  name:'Big Bazaar',        category:'shopping',      amount:3200, date:'2026-09-12', payment:'Card',       notes:'Monthly groceries' },
      { id:6,  name:'Apollo Pharmacy',   category:'health',        amount:780,  date:'2026-09-11', payment:'Cash',       notes:'' },
      { id:7,  name:'Electricity Bill',  category:'utilities',     amount:1250, date:'2026-09-10', payment:'NetBanking', notes:'' },
      { id:8,  name:'Dominos Pizza',     category:'food',          amount:680,  date:'2026-09-09', payment:'UPI',        notes:'' },
      { id:9,  name:'Myntra',            category:'shopping',      amount:1899, date:'2026-09-08', payment:'Card',       notes:'Shirt' },
      { id:10, name:'Spotify',           category:'subscriptions', amount:119,  date:'2026-09-07', payment:'Card',       notes:'' },
      { id:11, name:'Petrol',            category:'transport',     amount:2000, date:'2026-09-06', payment:'Cash',       notes:'' },
      { id:12, name:'Zomato',            category:'food',          amount:520,  date:'2026-09-05', payment:'UPI',        notes:'' },
      { id:13, name:'Movie Tickets',     category:'entertainment', amount:900,  date:'2026-09-04', payment:'UPI',        notes:'PVR IMAX' },
      { id:14, name:'Reliance Fresh',    category:'food',          amount:1450, date:'2026-09-03', payment:'Card',       notes:'' },
      { id:15, name:'YouTube Premium',   category:'subscriptions', amount:189,  date:'2026-09-02', payment:'Card',       notes:'' },
      { id:16, name:'Auto Rickshaw',     category:'transport',     amount:80,   date:'2026-09-01', payment:'Cash',       notes:'' },
      { id:17, name:'Gym Membership',    category:'health',        amount:2000, date:'2026-08-28', payment:'NetBanking', notes:'' },
      { id:18, name:"H&M Shopping",      category:'shopping',      amount:3499, date:'2026-08-25', payment:'Card',       notes:'' },
      { id:19, name:'Café Coffee Day',   category:'food',          amount:340,  date:'2026-08-22', payment:'UPI',        notes:'' },
      { id:20, name:'Amazon Prime',      category:'subscriptions', amount:299,  date:'2026-08-20', payment:'Card',       notes:'' },
    ];
    saveData('expenses', expenses);
    saveData('nextExpenseId', 21);

    saveData('budgets', [
      { id:1, category:'food',          limit:10000, threshold:80 },
      { id:2, category:'shopping',      limit:10000, threshold:80 },
      { id:3, category:'entertainment', limit:3000,  threshold:75 },
      { id:4, category:'subscriptions', limit:2000,  threshold:80 },
      { id:5, category:'transport',     limit:5000,  threshold:80 },
      { id:6, category:'health',        limit:4000,  threshold:80 },
      { id:7, category:'utilities',     limit:3000,  threshold:90 },
    ]);
    saveData('nextBudgetId', 8);
    saveData('salary', 85000);

    saveData('reminders', [
      { id:1, title:'Netflix',         amount:649,  date:'2026-10-15', category:'subscriptions', recurrence:'monthly', paid:false },
      { id:2, title:'Electricity Bill',amount:1250, date:'2026-10-10', category:'utilities',     recurrence:'monthly', paid:false },
      { id:3, title:'Home Loan EMI',   amount:18000,date:'2026-10-05', category:'emi',           recurrence:'monthly', paid:false },
    ]);
    saveData('nextReminderId', 4);

    saveData('bankAccounts', [
      { id:1, bank:'HDFC', bankFull:'HDFC Bank',           accType:'Savings', accNumber:'****4521', balance:98450, color:'#004C97' },
      { id:2, bank:'SBI',  bankFull:'State Bank of India', accType:'Salary',  accNumber:'****7830', balance:26110, color:'#22409A' },
    ]);
    saveData('nextBankId', 3);

    saveData('payments', [
      { id:1, description:'Electricity Bill', type:'bill', amount:1250, date:'2026-09-10', method:'NetBanking', status:'success' },
      { id:2, description:'Priya Sharma',     type:'upi',  amount:500,  date:'2026-09-08', method:'UPI',        status:'success' },
    ]);
    saveData('nextPaymentId', 3);

    saveData('payees', [
      { id:1, name:'Priya Sharma',   upi:'priya@upi',   type:'upi' },
      { id:2, name:'Raj Landlord',   upi:'raj@upi',     type:'upi' },
    ]);
    saveData('nextPayeeId', 3);

  } else {
    // Real new user — seed EMPTY data so dashboard is fresh
    saveData('expenses',    []);
    saveData('budgets',     []);
    saveData('reminders',   []);
    saveData('bankAccounts',[]);
    saveData('payments',    []);
    saveData('payees',      []);
    saveData('goals',       []);
    saveData('salary',      0);
    saveData('nextExpenseId',  1);
    saveData('nextBudgetId',   1);
    saveData('nextReminderId', 1);
    saveData('nextBankId',     1);
    saveData('nextPaymentId',  1);
    saveData('nextPayeeId',    1);
    saveData('nextGoalId',     1);
  }

  saveData('initialized', true);
}

// Run after session is confirmed (called by each page after requireAuth)
function initPageData() {
  initDefaultData();
  applyUserGreeting();
}