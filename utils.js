/* ============================================
   SPENDSENSE - Shared Utility Functions
============================================ */

// ---- SIDEBAR ----
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

// ---- MODAL ----
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

// ---- TOAST ----
function showToast(message, type='info', duration=3500) {
  const container = document.getElementById('toastContainer'); if (!container) return;
  const icons = {success:'✅',warning:'⚠️',danger:'❌',info:'ℹ️'};
  const toast = document.createElement('div'); toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation='slideOutRight 0.3s ease forwards'; setTimeout(()=>toast.remove(),300); }, duration);
}

// ---- FORMATTING ----
function formatCurrency(amount) {
  return '₹' + Number(amount||0).toLocaleString('en-IN', {minimumFractionDigits:0});
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
}
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {day:'numeric',month:'short'});
}
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dateStr); due.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000*60*60*24));
}

// ---- CATEGORIES ----
const CATEGORIES = {
  food:          {label:'Food & Dining',  icon:'🍔',colorClass:'cat-food'},
  entertainment: {label:'Entertainment',  icon:'🎬',colorClass:'cat-entertainment'},
  shopping:      {label:'Shopping',       icon:'🛒',colorClass:'cat-shopping'},
  subscriptions: {label:'Subscriptions',  icon:'📺',colorClass:'cat-subscriptions'},
  transport:     {label:'Transport',      icon:'🚗',colorClass:'cat-transport'},
  health:        {label:'Healthcare',     icon:'🏥',colorClass:'cat-health'},
  utilities:     {label:'Utilities',      icon:'💡',colorClass:'cat-utilities'},
  rent:          {label:'Rent',           icon:'🏠',colorClass:'cat-other'},
  emi:           {label:'EMI / Loan',     icon:'🏦',colorClass:'cat-other'},
  insurance:     {label:'Insurance',      icon:'🛡️',colorClass:'cat-other'},
  other:         {label:'Other',          icon:'📦',colorClass:'cat-other'},
};
function getCategoryInfo(key, customLabel) {
  if (CATEGORIES[key]) return CATEGORIES[key];
  const label = customLabel || key.replace(/^custom_/,'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  return {label, icon:'📦', colorClass:'cat-other'};
}

// ---- AUTH HELPERS ----
function getSession() {
  try { return JSON.parse(localStorage.getItem('ss_session')||'null'); } catch(e) { return null; }
}
function requireAuth() {
  const session = getSession();
  if (!session || !session.uid) { window.location.href='auth.html'; return null; }
  return session;
}
function logout() {
  localStorage.removeItem('ss_session');
  window.location.href = 'auth.html';
}

// ---- PER-USER DATA STORAGE ----
function userKey(key) {
  const session = getSession();
  return session ? `ss_user_${session.uid}_${key}` : `ss_anon_${key}`;
}
function saveData(key, data)     { localStorage.setItem(userKey(key), JSON.stringify(data)); }
function saveUserData(key, data) { saveData(key, data); }
function loadData(key, def=null) {
  const s = localStorage.getItem(userKey(key));
  return s !== null ? JSON.parse(s) : def;
}
function loadUserData(key, def)  { return loadData(key, def); }

// ---- GREETING + SIDEBAR ----
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}
function applyUserGreeting() {
  const session = getSession(); if (!session) return;
  const firstName = session.firstName || 'Friend';
  const lastName  = session.lastName  || '';
  const initials  = (firstName.charAt(0)+(lastName?lastName.charAt(0):'')).toUpperCase();
  const greetEl = document.getElementById('userGreeting');
  if (greetEl) greetEl.textContent = `${getGreeting()}, ${firstName} 👋`;
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.querySelectorAll('.user-avatar-init').forEach(el => {
    const av = session.avatar;
    if (av && av.length<=2 && /\p{Emoji}/u.test(av)) { el.textContent=av; el.style.fontSize='1.2rem'; }
    else el.textContent = initials;
  });
  const sn = document.getElementById('sidebarUserName');
  const sr = document.getElementById('sidebarUserRole');
  if (sn) sn.textContent = `${firstName} ${lastName}`.trim();
  if (sr) sr.textContent  = session.uid==='demo_user' ? 'Demo Account' : 'Free Plan';
}

// ---- SEED DEFAULT DATA ----
function initDefaultData() {
  if (loadData('initialized')) return;
  const session    = getSession();
  const isDemoUser = session && session.uid === 'demo_user';
  if (isDemoUser) {
    const expenses = [
      {id:1,  name:'Swiggy Order',     category:'food',         amount:450,  date:'2026-09-16',payment:'UPI',        notes:''},
      {id:2,  name:'Netflix',          category:'subscriptions',amount:649,  date:'2026-09-15',payment:'Card',       notes:'Monthly sub'},
      {id:3,  name:'Amazon Order',     category:'shopping',     amount:2399, date:'2026-09-14',payment:'UPI',        notes:'Headphones'},
      {id:4,  name:'Ola Cab',          category:'transport',    amount:185,  date:'2026-09-13',payment:'Wallet',     notes:''},
      {id:5,  name:'Big Bazaar',       category:'shopping',     amount:3200, date:'2026-09-12',payment:'Card',       notes:'Monthly groceries'},
      {id:6,  name:'Apollo Pharmacy',  category:'health',       amount:780,  date:'2026-09-11',payment:'Cash',       notes:''},
      {id:7,  name:'Electricity Bill', category:'utilities',    amount:1250, date:'2026-09-10',payment:'NetBanking', notes:''},
      {id:8,  name:'Dominos Pizza',    category:'food',         amount:680,  date:'2026-09-09',payment:'UPI',        notes:''},
      {id:9,  name:'Myntra',           category:'shopping',     amount:1899, date:'2026-09-08',payment:'Card',       notes:'Shirt'},
      {id:10, name:'Spotify',          category:'subscriptions',amount:119,  date:'2026-09-07',payment:'Card',       notes:''},
      {id:11, name:'Petrol',           category:'transport',    amount:2000, date:'2026-09-06',payment:'Cash',       notes:''},
      {id:12, name:'Zomato',           category:'food',         amount:520,  date:'2026-09-05',payment:'UPI',        notes:''},
      {id:13, name:'Movie Tickets',    category:'entertainment',amount:900,  date:'2026-09-04',payment:'UPI',        notes:'PVR IMAX'},
      {id:14, name:'Reliance Fresh',   category:'food',         amount:1450, date:'2026-09-03',payment:'Card',       notes:''},
      {id:15, name:'YouTube Premium',  category:'subscriptions',amount:189,  date:'2026-09-02',payment:'Card',       notes:''},
      {id:16, name:'Auto Rickshaw',    category:'transport',    amount:80,   date:'2026-09-01',payment:'Cash',       notes:''},
      {id:17, name:'Gym Membership',   category:'health',       amount:2000, date:'2026-08-28',payment:'NetBanking', notes:''},
      {id:18, name:"H&M Shopping",     category:'shopping',     amount:3499, date:'2026-08-25',payment:'Card',       notes:''},
      {id:19, name:'Café Coffee Day',  category:'food',         amount:340,  date:'2026-08-22',payment:'UPI',        notes:''},
      {id:20, name:'Amazon Prime',     category:'subscriptions',amount:299,  date:'2026-08-20',payment:'Card',       notes:''},
    ];
    saveData('expenses',      expenses);
    saveData('nextExpenseId', 21);
    saveData('budgets', [
      {id:1,category:'food',         limit:10000,threshold:80},
      {id:2,category:'shopping',     limit:10000,threshold:80},
      {id:3,category:'entertainment',limit:3000, threshold:75},
      {id:4,category:'subscriptions',limit:2000, threshold:80},
      {id:5,category:'transport',    limit:5000, threshold:80},
      {id:6,category:'health',       limit:4000, threshold:101},
      {id:7,category:'utilities',    limit:3000, threshold:101},
    ]);
    saveData('nextBudgetId',   8);
    saveData('salary',         85000);
    saveData('reminders', [
      {id:1,title:'Netflix',         amount:649,  date:'2026-10-15',category:'subscriptions',recurrence:'monthly',paid:false},
      {id:2,title:'Electricity Bill',amount:1250, date:'2026-10-10',category:'utilities',    recurrence:'monthly',paid:false},
      {id:3,title:'Home Loan EMI',   amount:18000,date:'2026-10-05',category:'emi',          recurrence:'monthly',paid:false},
    ]);
    saveData('nextReminderId', 4);
    saveData('goals',          []);
    saveData('nextGoalId',     1);
  } else {
    saveData('expenses',      []);
    saveData('budgets',       []);
    saveData('reminders',     []);
    saveData('goals',         []);
    saveData('salary',        0);
    saveData('nextExpenseId', 1);
    saveData('nextBudgetId',  1);
    saveData('nextReminderId',1);
    saveData('nextGoalId',    1);
  }
  saveData('initialized', true);
}

function initPageData() {
  initDefaultData();
  applyUserGreeting();
}
