/* ============================================
   SPENDSENSE - Authentication Logic
============================================ */

// ---- TAB SWITCH ----
function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('active',  tab === 'login');
  document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
  document.getElementById('loginTab').classList.toggle('active',   tab === 'login');
  document.getElementById('signupTab').classList.toggle('active',  tab === 'signup');
  clearErrors();
}
function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

// ---- PASSWORD TOGGLE ----
function togglePwd(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text'; icon.classList.replace('fa-eye','fa-eye-slash');
  } else {
    input.type = 'password'; icon.classList.replace('fa-eye-slash','fa-eye');
  }
}

// ---- PASSWORD STRENGTH ----
function checkStrength(val) {
  const segs  = ['s1','s2','s3','s4'];
  const label = document.getElementById('strengthLabel');
  let score   = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const colors = ['#F0A0A0','#F0BC78','#A8E6BF','#FCF1D0'];
  const labels = ['Weak','Fair','Good','Strong'];
  segs.forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < score ? colors[score-1] : 'rgba(255,255,255,0.08)';
  });
  if (label) {
    label.textContent = val.length > 0 ? (labels[score-1]||'Weak') : '';
    label.style.color = val.length > 0 ? (colors[score-1]||'#F0A0A0') : 'var(--text-dark)';
  }
}

// ---- USER STORAGE ----
function getUsers()        { return JSON.parse(localStorage.getItem('ss_users') || '[]'); }
function saveUsers(users)  { localStorage.setItem('ss_users', JSON.stringify(users)); }
function getUserByEmail(e) { return getUsers().find(u => u.email.toLowerCase() === e.toLowerCase()); }

// ---- SESSION ----
function createSession(user, remember) {
  const session = {
    uid: user.uid, email: user.email,
    firstName: user.firstName, lastName: user.lastName,
    phone: user.phone, avatar: user.avatar || '😊',
    createdAt: user.createdAt, loginTime: Date.now(),
  };
  localStorage.setItem('ss_session', JSON.stringify(session));
  if (remember) localStorage.setItem('ss_remember', user.email);
  else          localStorage.removeItem('ss_remember');
}
function getSession() {
  try { return JSON.parse(localStorage.getItem('ss_session') || 'null'); } catch(e) { return null; }
}
function logout() {
  localStorage.removeItem('ss_session');
  window.location.href = 'auth.html';
}
function requireAuth() {
  const session = getSession();
  if (!session || !session.uid) { window.location.href = 'auth.html'; return null; }
  return session;
}

// ---- GREETING ----
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
  const greetEl = document.getElementById('userGreeting');
  if (greetEl) greetEl.textContent = `${getGreeting()}, ${session.firstName} 👋`;
  document.querySelectorAll('.user-avatar-init').forEach(el => {
    const av = session.avatar;
    if (av && av.length <= 2 && /\p{Emoji}/u.test(av)) {
      el.textContent = av; el.style.fontSize = '1.2rem';
    } else {
      el.textContent = (session.firstName.charAt(0) + (session.lastName ? session.lastName.charAt(0) : '')).toUpperCase();
    }
  });
  const sn = document.getElementById('sidebarUserName');
  const sr = document.getElementById('sidebarUserRole');
  if (sn) sn.textContent = `${session.firstName} ${session.lastName || ''}`.trim();
  if (sr) sr.textContent  = session.uid === 'demo_user' ? 'Demo Account' : 'Free Plan';
}

// ---- USER-SCOPED KEY ----
function userKey(key) {
  const session = getSession();
  return session ? `ss_user_${session.uid}_${key}` : `ss_anon_${key}`;
}
function saveUserData(key, data) { localStorage.setItem(userKey(key), JSON.stringify(data)); }
function loadUserData(key, def)  {
  const s = localStorage.getItem(userKey(key));
  return s !== null ? JSON.parse(s) : def;
}

// ---- HANDLE LOGIN ----
function handleLogin(e) {
  e.preventDefault(); clearErrors();
  const email    = document.getElementById('lgEmail').value.trim();
  const pass     = document.getElementById('lgPass').value;
  const remember = document.getElementById('rememberMe')?.checked;
  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('lg-email-grp','lg-email-err','Enter a valid email.'); valid = false; }
  if (!pass) { setError('lg-pass-grp','lg-pass-err','Enter your password.'); valid = false; }
  if (!valid) return;
  const user = getUserByEmail(email);
  if (!user || user.password !== btoa(pass)) { setError('lg-pass-grp','lg-pass-err','Incorrect email or password.'); return; }
  const btn = document.getElementById('loginBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…'; btn.disabled = true;
  setTimeout(() => { createSession(user, remember); window.location.href = 'dashboard.html'; }, 800);
}

// ---- HANDLE SIGNUP ----
function handleSignup(e) {
  e.preventDefault(); clearErrors();
  const firstName = document.getElementById('sgFname').value.trim();
  const lastName  = document.getElementById('sgLname').value.trim();
  const email     = document.getElementById('sgEmail').value.trim();
  const phone     = document.getElementById('sgPhone').value.trim();
  const pass      = document.getElementById('sgPass').value;
  const cpass     = document.getElementById('sgCpass').value;
  const terms     = document.getElementById('termsCheck').checked;
  let valid = true;
  if (!firstName) { setError('sg-fname-grp','sg-fname-err','Enter your first name.'); valid = false; }
  if (!lastName)  { setError('sg-lname-grp','sg-lname-err','Enter your last name.');  valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('sg-email-grp','sg-email-err','Enter a valid email.'); valid = false; }
  if (!/^\d{10}$/.test(phone)) { setError('sg-phone-grp','sg-phone-err','Enter a valid 10-digit number.'); valid = false; }
  if (pass.length < 8) { setError('sg-pass-grp','sg-pass-err','Password must be at least 8 characters.'); valid = false; }
  if (pass !== cpass)  { setError('sg-cpass-grp','sg-cpass-err','Passwords do not match.'); valid = false; }
  if (!terms) { showToast('Please accept the Terms of Service.','warning'); valid = false; }
  if (!valid) return;
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) { setError('sg-email-grp','sg-email-err','An account with this email already exists.'); return; }
  const btn = document.getElementById('signupBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…'; btn.disabled = true;
  setTimeout(() => {
    const uid = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const newUser = { uid, firstName, lastName, email, phone, password: btoa(pass), createdAt: new Date().toISOString(), avatar: '😊' };
    users.push(newUser); saveUsers(users);
    createSession(newUser, false);
    showToast(`Welcome to SpendSense, ${firstName}! 🎉`, 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  }, 1000);
}

// ---- DEMO LOGIN ----
function demoLogin() {
  const users = getUsers();
  let demo = users.find(u => u.email === 'demo@spendsense.in');
  if (!demo) {
    demo = { uid:'demo_user', firstName:'Demo', lastName:'User', email:'demo@spendsense.in', phone:'9999999999', password:btoa('demo1234'), createdAt:new Date().toISOString(), avatar:'🚀' };
    users.push(demo); saveUsers(users);
  }
  createSession(demo, false);
  showToast('Welcome to the SpendSense Demo! 🚀','success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
}

// ---- FORGOT PASSWORD ----
function showForgotPassword() { openModal('forgotModal'); }
function sendResetLink() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) { showToast('Enter your email address.','warning'); return; }
  const user = getUserByEmail(email);
  if (!user) { showToast('No account found with that email.','danger'); return; }
  closeModal('forgotModal');
  showToast('Password reset link sent! Check your email.','success',5000);
}

// ---- HELPERS ----
function setError(groupId, errId, msg) {
  document.getElementById(groupId)?.classList.add('has-error');
  const el = document.getElementById(errId); if (el) el.textContent = msg;
}
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); });
function showToast(message, type='info', duration=3500) {
  const c = document.getElementById('toastContainer'); if (!c) return;
  const icons = {success:'✅',warning:'⚠️',danger:'❌',info:'ℹ️'};
  const t = document.createElement('div'); t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation='slideOutRight 0.3s ease forwards'; setTimeout(()=>t.remove(),300); }, duration);
}

// ---- PRE-FILL REMEMBERED EMAIL ----
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('loginForm')) return;
  const session = getSession();
  if (session && session.uid) { window.location.href = 'dashboard.html'; return; }
  const remembered = localStorage.getItem('ss_remember');
  if (remembered) {
    const el = document.getElementById('lgEmail'); if (el) el.value = remembered;
    const rem = document.getElementById('rememberMe'); if (rem) rem.checked = true;
  }
});
