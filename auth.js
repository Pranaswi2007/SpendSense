/* ============================================
   SPENDSENSE — Auth Logic (API-backed)
============================================ */

const API_BASE = 'http://localhost:4000/api';

// Standalone helpers (utils.js loads after auth.js so we define these here too)
function getToken()        { return localStorage.getItem('ss_token') || null; }
function saveToken(t)      { localStorage.setItem('ss_token', t); }
function getSession()      { try { return JSON.parse(localStorage.getItem('ss_session') || 'null'); } catch(e) { return null; } }
function saveSession(user) { localStorage.setItem('ss_session', JSON.stringify(user)); }
function removeToken()     { localStorage.removeItem('ss_token'); }
function removeSession()   { localStorage.removeItem('ss_session'); }

// ── Tab switch ────────────────────────────────────────
function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('active',  tab==='login');
  document.getElementById('signupForm').classList.toggle('active', tab==='signup');
  document.getElementById('loginTab').classList.toggle('active',   tab==='login');
  document.getElementById('signupTab').classList.toggle('active',  tab==='signup');
  clearErrors();
}
function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

// ── Password toggle ───────────────────────────────────
function togglePwd(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text'; icon.classList.replace('fa-eye','fa-eye-slash');
  } else {
    input.type = 'password'; icon.classList.replace('fa-eye-slash','fa-eye');
  }
}

// ── Password strength ─────────────────────────────────
function checkStrength(val) {
  const segs=['s1','s2','s3','s4'], label=document.getElementById('strengthLabel');
  let score=0;
  if(val.length>=8) score++;
  if(/[A-Z]/.test(val)) score++;
  if(/[0-9]/.test(val)) score++;
  if(/[^A-Za-z0-9]/.test(val)) score++;
  const colors=['#F0A0A0','#F0BC78','#A8E6BF','#FCF1D0'];
  const labels=['Weak','Fair','Good','Strong'];
  segs.forEach((id,i)=>{
    const el=document.getElementById(id);
    if(el) el.style.background = i<score ? colors[score-1] : 'rgba(255,255,255,0.08)';
  });
  if(label){ label.textContent=val.length>0?(labels[score-1]||'Weak'):''; label.style.color=val.length>0?(colors[score-1]||'#F0A0A0'):''; }
}

// ── Error helper ──────────────────────────────────────
function setError(groupId, errId, msg) {
  document.getElementById(groupId)?.classList.add('has-error');
  const el=document.getElementById(errId);
  if(el) el.textContent=msg;
}
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
document.addEventListener('click', e=>{
  if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});
function showToast(message, type='info', duration=3500) {
  const c=document.getElementById('toastContainer'); if(!c) return;
  const icons={success:'✅',warning:'⚠️',danger:'❌',info:'ℹ️'};
  const t=document.createElement('div'); t.className=`toast ${type}`;
  t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ t.style.animation='slideOutRight 0.3s ease forwards'; setTimeout(()=>t.remove(),300); },duration);
}

// ── Login ─────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault(); clearErrors();
  const email    = document.getElementById('lgEmail').value.trim();
  const password = document.getElementById('lgPass').value;
  const remember = document.getElementById('rememberMe')?.checked;

  let valid=true;
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setError('lg-email-grp','lg-email-err','Enter a valid email.'); valid=false; }
  if(!password){ setError('lg-pass-grp','lg-pass-err','Enter your password.'); valid=false; }
  if(!valid) return;

  const btn=document.getElementById('loginBtn');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Signing in…'; btn.disabled=true;

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message||'Login failed');

    saveToken(data.token);
    saveSession(data.user);
    if(remember) localStorage.setItem('ss_remember', email);
    else         localStorage.removeItem('ss_remember');

    showToast(`Welcome back, ${data.user.firstName}! 👋`,'success');
    setTimeout(()=>{ window.location.href='dashboard.html'; },700);
  } catch(err) {
    btn.innerHTML='<i class="fas fa-sign-in-alt"></i> Sign In'; btn.disabled=false;
    setError('lg-pass-grp','lg-pass-err', err.message||'Invalid email or password.');
  }
}

// ── Register ──────────────────────────────────────────
async function handleSignup(e) {
  e.preventDefault(); clearErrors();
  const firstName = document.getElementById('sgFname').value.trim();
  const lastName  = document.getElementById('sgLname').value.trim();
  const email     = document.getElementById('sgEmail').value.trim();
  const phone     = document.getElementById('sgPhone').value.trim();
  const pass      = document.getElementById('sgPass').value;
  const cpass     = document.getElementById('sgCpass').value;
  const terms     = document.getElementById('termsCheck').checked;

  let valid=true;
  if(!firstName){ setError('sg-fname-grp','sg-fname-err','Enter first name.');        valid=false; }
  if(!lastName) { setError('sg-lname-grp','sg-lname-err','Enter last name.');         valid=false; }
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setError('sg-email-grp','sg-email-err','Enter a valid email.'); valid=false; }
  if(!/^\d{10}$/.test(phone)){ setError('sg-phone-grp','sg-phone-err','Enter a 10-digit number.'); valid=false; }
  if(pass.length<8){ setError('sg-pass-grp','sg-pass-err','Min 8 characters.'); valid=false; }
  if(pass!==cpass) { setError('sg-cpass-grp','sg-cpass-err','Passwords do not match.'); valid=false; }
  if(!terms){ showToast('Please accept the Terms of Service.','warning'); valid=false; }
  if(!valid) return;

  const btn=document.getElementById('signupBtn');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Creating account…'; btn.disabled=true;

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ firstName, lastName, email, phone, password:pass, avatar:'😊' }),
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message||'Registration failed');

    saveToken(data.token);
    saveSession(data.user);
    showToast(`Welcome to SpendSense, ${firstName}! 🎉`,'success');
    setTimeout(()=>{ window.location.href='dashboard.html'; },800);
  } catch(err) {
    btn.innerHTML='<i class="fas fa-rocket"></i> Create Account'; btn.disabled=false;
    if(err.message.toLowerCase().includes('email'))
      setError('sg-email-grp','sg-email-err', err.message);
    else
      showToast(err.message||'Registration failed.','danger');
  }
}

// ── Demo login ────────────────────────────────────────
async function demoLogin() {
  const btn=document.querySelector('[onclick="demoLogin()"]');
  if(btn){ btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Loading…'; btn.disabled=true; }

  try {
    // Try login first; register if demo account doesn't exist yet
    let res = await fetch(`${API_BASE}/auth/login`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:'demo@spendsense.in', password:'demo1234' }),
    });
    if(!res.ok) {
      res = await fetch(`${API_BASE}/auth/register`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ firstName:'Demo', lastName:'User', email:'demo@spendsense.in',
          phone:'9999999999', password:'demo1234', avatar:'🚀' }),
      });
    }
    const data = await res.json();
    if(!res.ok) throw new Error(data.message||'Demo login failed');

    saveToken(data.token);
    saveSession(data.user);
    showToast('Welcome to the SpendSense Demo! 🚀','success');
    setTimeout(()=>{ window.location.href='dashboard.html'; },700);
  } catch(err) {
    if(btn){ btn.innerHTML='🚀 Try Demo'; btn.disabled=false; }
    showToast('Could not load demo. Is the server running on port 4000?','danger',5000);
  }
}

// ── Forgot password ───────────────────────────────────
function showForgotPassword() { openModal('forgotModal'); }
function sendResetLink() {
  const email=document.getElementById('forgotEmail').value.trim();
  if(!email){ showToast('Enter your email.','warning'); return; }
  closeModal('forgotModal');
  showToast('If an account exists, a reset link has been sent.','success',5000);
}

// ── Pre-fill remembered email + redirect if logged in ─
document.addEventListener('DOMContentLoaded', ()=>{
  // Only run on auth.html (loginForm exists)
  if(!document.getElementById('loginForm')) return;

  // Already logged in → go to dashboard
  if(getToken() && getSession()){
    window.location.href='dashboard.html'; return;
  }

  const remembered=localStorage.getItem('ss_remember');
  if(remembered){
    const el=document.getElementById('lgEmail');
    if(el) el.value=remembered;
    const rem=document.getElementById('rememberMe');
    if(rem) rem.checked=true;
  }
});
