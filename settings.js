/* ============================================
   SPENDSENSE - Settings Page Logic
============================================ */

let selectedAvatar = '😊';

// ---- LOAD USER DATA INTO FORM ----
function loadSettingsForm() {
  const session = getSession();
  if (!session) return;

  // Profile display
  document.getElementById('profileAvatarDisplay').textContent = session.avatar || '😊';
  document.getElementById('profileNameDisplay').textContent   = `${session.firstName} ${session.lastName}`;
  document.getElementById('profileEmailDisplay').textContent  = session.email;
  document.getElementById('profileMemberDisplay').textContent = `Member since ${new Date(session.createdAt).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}`;

  // Profile form
  document.getElementById('settingsFname').value = session.firstName;
  document.getElementById('settingsLname').value = session.lastName;
  document.getElementById('settingsEmail').value = session.email;
  document.getElementById('settingsPhone').value = session.phone || '';

  // Mark current avatar
  selectedAvatar = session.avatar || '😊';
  document.querySelectorAll('.av-opt').forEach(el => {
    el.classList.toggle('sel', el.textContent.trim() === selectedAvatar);
  });

  // Financial profile
  const salary = loadUserData('salary', '');
  const savingsGoal = loadUserData('savingsGoal', '20');
  if (document.getElementById('settingsSalary')) document.getElementById('settingsSalary').value = salary || '';
  if (document.getElementById('settingsSavingsGoal')) document.getElementById('settingsSavingsGoal').value = savingsGoal;

  // Notifications
  const notifPrefs = loadUserData('notifPrefs', { budget:true, reminders:true, weekly:false, goals:true });
  document.getElementById('notif_budget').checked    = notifPrefs.budget;
  document.getElementById('notif_reminders').checked = notifPrefs.reminders;
  document.getElementById('notif_weekly').checked    = notifPrefs.weekly;
  document.getElementById('notif_goals').checked     = notifPrefs.goals;
}

// ---- AVATAR SELECTION ----
function selectAvatar(el, emoji) {
  document.querySelectorAll('.av-opt').forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');
  selectedAvatar = emoji;
  document.getElementById('profileAvatarDisplay').textContent = emoji;
}

// ---- SAVE PROFILE ----
function saveProfile(e) {
  e.preventDefault();
  const session = getSession();
  if (!session) return;

  const firstName = document.getElementById('settingsFname').value.trim();
  const lastName  = document.getElementById('settingsLname').value.trim();
  const email     = document.getElementById('settingsEmail').value.trim();
  const phone     = document.getElementById('settingsPhone').value.trim();

  if (!firstName || !lastName || !email) { showToast('Please fill all required fields.', 'warning'); return; }

  // Update user record
  const users = JSON.parse(localStorage.getItem('ss_users') || '[]');
  const idx   = users.findIndex(u => u.uid === session.uid);
  if (idx !== -1) {
    users[idx].firstName = firstName;
    users[idx].lastName  = lastName;
    users[idx].email     = email;
    users[idx].phone     = phone;
    users[idx].avatar    = selectedAvatar;
    localStorage.setItem('ss_users', JSON.stringify(users));
  }

  // Update session
  const newSession = { ...session, firstName, lastName, email, phone, avatar: selectedAvatar };
  localStorage.setItem('ss_session', JSON.stringify(newSession));

  // Refresh display
  document.getElementById('profileNameDisplay').textContent = `${firstName} ${lastName}`;
  document.getElementById('profileEmailDisplay').textContent = email;
  applyUserGreeting();

  showToast('Profile updated successfully!', 'success');
}

// ---- CHANGE PASSWORD ----
function changePassword(e) {
  e.preventDefault();
  const session = getSession();
  const curr = document.getElementById('currPass').value;
  const newP  = document.getElementById('newPass').value;
  const conf  = document.getElementById('confPass').value;

  const users = JSON.parse(localStorage.getItem('ss_users') || '[]');
  const user  = users.find(u => u.uid === session.uid);
  if (!user) return;

  if (user.password !== btoa(curr)) { showToast('Current password is incorrect.', 'danger'); return; }
  if (newP.length < 8)              { showToast('New password must be at least 8 characters.', 'warning'); return; }
  if (newP !== conf)                { showToast('Passwords do not match.', 'warning'); return; }

  user.password = btoa(newP);
  localStorage.setItem('ss_users', JSON.stringify(users));

  document.getElementById('currPass').value = '';
  document.getElementById('newPass').value  = '';
  document.getElementById('confPass').value = '';
  showToast('Password changed successfully!', 'success');
}

// ---- FINANCIAL PROFILE ----
function saveFinancialProfile() {
  const salary      = document.getElementById('settingsSalary').value;
  const savingsGoal = document.getElementById('settingsSavingsGoal').value;
  if (salary) saveUserData('salary', parseFloat(salary));
  if (savingsGoal) saveUserData('savingsGoal', parseInt(savingsGoal));
  showToast('Financial profile saved!', 'success');
}

// ---- NOTIFICATIONS ----
function saveNotifications() {
  saveUserData('notifPrefs', {
    budget:    document.getElementById('notif_budget').checked,
    reminders: document.getElementById('notif_reminders').checked,
    weekly:    document.getElementById('notif_weekly').checked,
    goals:     document.getElementById('notif_goals').checked,
  });
  showToast('Notification preferences saved!', 'success');
}

// ---- APPEARANCE ----
function selectAccent(el, color) {
  document.querySelectorAll('.color-swatch').forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');
  document.documentElement.style.setProperty('--primary', color);
  saveUserData('accentColor', color);
}
function saveAppearance() {
  saveUserData('dateFormat', document.getElementById('settingsDateFmt').value);
  showToast('Appearance saved!', 'success');
}

// ---- PRIVACY ----
function savePrivacy() {
  saveUserData('privacy', {
    twofa:      document.getElementById('twofa').checked,
    loginNotif: document.getElementById('loginNotif').checked,
    dataShare:  document.getElementById('dataShare').checked,
  });
  showToast('Privacy settings saved!', 'success');
}

// ---- EXPORT DATA ----
function exportAllData() {
  const expenses = loadUserData('expenses', []);
  if (!expenses.length) { showToast('No data to export yet.', 'info'); return; }
  const rows = [['ID','Name','Category','Amount','Date','Payment','Notes']];
  expenses.forEach(e => rows.push([e.id, e.name, e.category, e.amount, e.date, e.payment, e.notes||'']));
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'spendsense_data.csv';
  a.click();
  showToast('Data exported!', 'success');
}

// ---- IMPORT DATA ----
function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const lines = ev.target.result.split('\n').slice(1); // skip header
    const existing = loadUserData('expenses', []);
    let nextId = loadUserData('nextExpenseId', 1);
    let count = 0;
    lines.forEach(line => {
      if (!line.trim()) return;
      const cols = line.split(',').map(c => c.replace(/"/g,'').trim());
      if (cols.length >= 5) {
        existing.push({ id: nextId++, name: cols[1]||'Import', category: cols[2]||'other', amount: parseFloat(cols[3])||0, date: cols[4]||new Date().toISOString().split('T')[0], payment: cols[5]||'Cash', notes: cols[6]||'' });
        count++;
      }
    });
    saveUserData('expenses', existing);
    saveUserData('nextExpenseId', nextId);
    showToast(`${count} expenses imported!`, 'success');
  };
  reader.readAsText(file);
}

// ---- RESET DATA ----
function resetAllData() {
  if (!confirm('⚠️ This will delete ALL your expenses, budgets, goals and reminders. This cannot be undone. Are you absolutely sure?')) return;
  const session = getSession(); if (!session) return;
  const prefix = `ss_user_${session.uid}_`;
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
  const emptyKeys = ['expenses','budgets','reminders','goals'];
  emptyKeys.forEach(k => localStorage.setItem(`${prefix}${k}`, JSON.stringify([])));
  ['nextExpenseId','nextBudgetId','nextReminderId','nextGoalId'].forEach(k => localStorage.setItem(`${prefix}${k}`, JSON.stringify(1)));
  localStorage.setItem(`${prefix}salary`,      JSON.stringify(0));
  localStorage.setItem(`${prefix}initialized`, JSON.stringify(true));
  showToast('All data reset. Starting fresh!', 'info');
  setTimeout(() => window.location.href = 'dashboard.html', 1500);
}

// ---- DELETE ACCOUNT ----
function deleteAccount() {
  if (!confirm('⛔ This will permanently delete your SpendSense account and ALL data. This CANNOT be undone. Confirm?')) return;
  const session = getSession(); if (!session) return;
  const prefix = `ss_user_${session.uid}_`;
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
  const users = JSON.parse(localStorage.getItem('ss_users')||'[]').filter(u => u.uid !== session.uid);
  localStorage.setItem('ss_users', JSON.stringify(users));
  localStorage.removeItem('ss_session');
  showToast('Account deleted. Goodbye!', 'info');
  setTimeout(() => window.location.href = 'auth.html', 1500);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  applyUserGreeting();
  loadSettingsForm();
});