/* ============================================
   SPENDSENSE - Goals Page Logic
============================================ */

const GOAL_CATS = {
  emergency:  { label: 'Emergency Fund',  icon: '🛡️', color: '#43E97B' },
  travel:     { label: 'Travel',          icon: '✈️', color: '#38F9D7' },
  gadget:     { label: 'Gadget',          icon: '📱', color: '#6C63FF' },
  education:  { label: 'Education',       icon: '📚', color: '#FFB347' },
  vehicle:    { label: 'Vehicle',         icon: '🚗', color: '#9B8FF0' },
  home:       { label: 'Home/Property',   icon: '🏠', color: '#FF6584' },
  investment: { label: 'Investment',      icon: '📈', color: '#43E97B' },
  wedding:    { label: 'Wedding',         icon: '💍', color: '#FF6B6B' },
  health:     { label: 'Health',          icon: '🏥', color: '#FF6584' },
  other:      { label: 'Other',           icon: '🎯', color: '#A7A9BE' },
};

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#FF4757', bg: 'rgba(255,71,87,0.12)' },
  medium: { label: 'Medium', color: '#FFB347', bg: 'rgba(255,179,71,0.12)' },
  low:    { label: 'Low',    color: '#43E97B', bg: 'rgba(67,233,123,0.12)' },
};

// ---- DATA ----
function getGoals() { return loadUserData('goals', []); }
function saveGoals(g) { saveUserData('goals', g); }

// ---- RENDER GOALS GRID ----
function renderGoalsGrid() {
  const grid = document.getElementById('goalsGrid');
  const goals = getGoals();

  // Update stats
  const total     = goals.length;
  const completed = goals.filter(g => g.saved >= g.target).length;
  const active    = total - completed;
  const totalSaved = goals.reduce((s, g) => s + (g.saved || 0), 0);

  setTxt('totalGoals', total);
  setTxt('completedGoals', completed);
  setTxt('activeGoals', active);
  setTxt('totalSavedGoals', formatCurrency(totalSaved));

  if (goals.length === 0) {
    grid.innerHTML = `
      <div class="card" style="grid-column:1/-1;text-align:center;padding:60px 24px">
        <div style="font-size:3rem;margin-bottom:16px">🎯</div>
        <h3 style="margin-bottom:8px">No goals yet</h3>
        <p style="color:var(--text-muted);margin-bottom:24px">Set your first financial goal and start working towards it!</p>
        <button class="btn btn-primary" onclick="openModal('addGoalModal')">
          <i class="fas fa-plus"></i> Create First Goal
        </button>
      </div>`;
    document.getElementById('goalChartRow').style.display = 'none';
    return;
  }

  document.getElementById('goalChartRow').style.display = 'grid';

  const sorted = [...goals].sort((a,b) => {
    const pr = { high:0, medium:1, low:2 };
    return (pr[a.priority]||1) - (pr[b.priority]||1);
  });

  grid.innerHTML = sorted.map(g => {
    const cat  = GOAL_CATS[g.category] || GOAL_CATS.other;
    const prio = PRIORITY_CONFIG[g.priority] || PRIORITY_CONFIG.medium;
    const pct  = Math.min(Math.round((g.saved / g.target) * 100), 100);
    const done = g.saved >= g.target;
    const daysLeft = daysUntil(g.targetDate);
    const monthlyNeeded = daysLeft > 0 ? Math.ceil((g.target - g.saved) / (daysLeft / 30)) : 0;

    return `
      <div class="card" style="position:relative;overflow:hidden;${done ? 'border-color:rgba(67,233,123,0.5)' : ''}">
        ${done ? `<div style="position:absolute;top:12px;right:12px;background:rgba(67,233,123,0.15);color:var(--accent);border-radius:50px;padding:4px 10px;font-size:0.72rem;font-weight:700"><i class="fas fa-check"></i> Completed!</div>` : ''}
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
          <div style="font-size:2rem;flex-shrink:0">${cat.icon}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${g.name}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="badge" style="background:rgba(108,99,255,0.12);color:var(--primary-light)">${cat.label}</span>
              <span class="badge" style="background:${prio.bg};color:${prio.color}">${prio.label} Priority</span>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem">
          <span style="color:var(--text-muted)">Progress</span>
          <span style="font-weight:700;color:${cat.color}">${pct}%</span>
        </div>
        <div class="progress-bar-wrap" style="height:10px;margin-bottom:12px">
          <div class="progress-bar-fill" style="width:${pct}%;background:${done ? 'var(--gradient-2)' : `linear-gradient(90deg,${cat.color},${cat.color}99)`}"></div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:16px">
          <div>
            <div style="font-size:1.1rem;font-weight:800;color:${cat.color}">${formatCurrency(g.saved)}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">saved of ${formatCurrency(g.target)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.85rem;font-weight:600;color:${daysLeft < 0 ? 'var(--danger)' : daysLeft < 30 ? 'var(--warning)' : 'var(--text-muted)'}">
              ${daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due Today' : `${daysLeft} days left`}
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted)">by ${formatDate(g.targetDate)}</div>
          </div>
        </div>

        ${!done && monthlyNeeded > 0 ? `
          <div style="background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.15);border-radius:6px;padding:8px 12px;font-size:0.78rem;color:var(--text-muted);margin-bottom:14px">
            💡 Save <strong style="color:var(--primary-light)">${formatCurrency(monthlyNeeded)}/month</strong> to reach this goal on time
          </div>` : ''}

        ${g.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;font-style:italic">"${g.notes}"</div>` : ''}

        <div style="display:flex;gap:8px">
          ${!done ? `<button class="btn btn-success btn-sm" style="flex:1" onclick="openAddFunds(${g.id})"><i class="fas fa-plus"></i> Add Funds</button>` : ''}
          <button class="btn btn-secondary btn-sm" ${done?'style="flex:1"':''} onclick="editGoal(${g.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm" style="background:rgba(255,71,87,0.12);color:var(--danger);border:none;border-radius:50px;padding:8px 14px;cursor:pointer" onclick="deleteGoal(${g.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  renderGoalCharts(goals);
}

// ---- CHARTS ----
function renderGoalCharts(goals) {
  // Progress bar chart
  const ctx1 = document.getElementById('goalProgressChart');
  if (ctx1 && goals.length > 0) {
    if (window._goalProgressChart) window._goalProgressChart.destroy();
    window._goalProgressChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: goals.map(g => g.name.length > 12 ? g.name.slice(0,12)+'…' : g.name),
        datasets: [
          { label: 'Saved', data: goals.map(g => g.saved), backgroundColor: goals.map(g => (GOAL_CATS[g.category]||GOAL_CATS.other).color + 'CC'), borderRadius: 6 },
          { label: 'Target', data: goals.map(g => g.target), backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#A7A9BE', font: { size: 11 } } }, tooltip: { backgroundColor: '#1A1A2E', titleColor: '#fff', bodyColor: '#A7A9BE', borderColor: 'rgba(108,99,255,0.3)', borderWidth: 1, callbacks: { label: c => ' ' + formatCurrency(c.raw) } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#A7A9BE', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE', font: { size: 10 }, callback: v => '₹' + (v/1000).toFixed(0) + 'K' } } }
      }
    });
  }

  // Category donut
  const ctx2 = document.getElementById('goalCatChart');
  if (ctx2 && goals.length > 0) {
    const catTotals = {};
    goals.forEach(g => { catTotals[g.category] = (catTotals[g.category] || 0) + (g.saved || 0); });
    if (window._goalCatChart) window._goalCatChart.destroy();
    window._goalCatChart = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: Object.keys(catTotals).map(k => (GOAL_CATS[k]||GOAL_CATS.other).icon + ' ' + (GOAL_CATS[k]||GOAL_CATS.other).label),
        datasets: [{ data: Object.values(catTotals), backgroundColor: Object.keys(catTotals).map(k => (GOAL_CATS[k]||GOAL_CATS.other).color), borderWidth: 3, borderColor: '#1A1A2E', hoverOffset: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { labels: { color: '#A7A9BE', font: { size: 10 } } }, tooltip: { backgroundColor: '#1A1A2E', titleColor: '#fff', bodyColor: '#A7A9BE', borderColor: 'rgba(108,99,255,0.3)', borderWidth: 1, callbacks: { label: c => ' ' + formatCurrency(c.raw) } } } }
    });
  }
}

// ---- ADD GOAL ----
function addGoal(e) {
  e.preventDefault();
  const goals = getGoals();
  let nextId = loadUserData('nextGoalId', 1);

  const goal = {
    id: nextId++,
    name:       document.getElementById('goalName').value.trim(),
    category:   document.getElementById('goalCategory').value,
    target:     parseFloat(document.getElementById('goalTarget').value),
    saved:      parseFloat(document.getElementById('goalSaved').value || '0'),
    targetDate: document.getElementById('goalDate').value,
    priority:   document.getElementById('goalPriority').value,
    notes:      document.getElementById('goalNotes').value.trim(),
    createdAt:  new Date().toISOString(),
  };

  goals.push(goal);
  saveGoals(goals);
  saveUserData('nextGoalId', nextId);
  closeModal('addGoalModal');
  e.target.reset();
  renderGoalsGrid();
  showToast(`Goal "${goal.name}" created!`, 'success');
}

// ---- ADD FUNDS ----
function openAddFunds(id) {
  const goal = getGoals().find(g => g.id === id);
  if (!goal) return;
  document.getElementById('addFundsGoalId').value = id;
  document.getElementById('addFundsGoalInfo').innerHTML = `
    <strong>${goal.name}</strong><br/>
    <span style="color:var(--text-muted)">Saved: ${formatCurrency(goal.saved)} / Target: ${formatCurrency(goal.target)}</span>
  `;
  document.getElementById('addFundsAmount').value = '';
  openModal('addFundsModal');
}

function addFundsToGoal() {
  const id     = parseInt(document.getElementById('addFundsGoalId').value);
  const amount = parseFloat(document.getElementById('addFundsAmount').value);
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'warning'); return; }

  const goals = getGoals();
  const g = goals.find(g => g.id === id);
  if (!g) return;
  g.saved = (g.saved || 0) + amount;

  saveGoals(goals);
  closeModal('addFundsModal');
  renderGoalsGrid();

  if (g.saved >= g.target) {
    showToast(`🎉 Goal "${g.name}" completed! You did it!`, 'success', 5000);
  } else {
    showToast(`${formatCurrency(amount)} added to "${g.name}"!`, 'success');
  }
}

// ---- EDIT GOAL ----
function editGoal(id) {
  const goal = getGoals().find(g => g.id === id);
  if (!goal) return;
  document.getElementById('goalName').value     = goal.name;
  document.getElementById('goalCategory').value = goal.category;
  document.getElementById('goalTarget').value   = goal.target;
  document.getElementById('goalSaved').value    = goal.saved;
  document.getElementById('goalDate').value     = goal.targetDate;
  document.getElementById('goalPriority').value = goal.priority;
  document.getElementById('goalNotes').value    = goal.notes || '';

  // Change form submit to update
  const form = document.querySelector('#addGoalModal form');
  form.onsubmit = (e) => { e.preventDefault(); updateGoal(id, e); };
  document.querySelector('#addGoalModal .modal-title').textContent = '✏️ Edit Goal';
  openModal('addGoalModal');
}

function updateGoal(id, e) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return;
  goals[idx] = {
    ...goals[idx],
    name:       document.getElementById('goalName').value.trim(),
    category:   document.getElementById('goalCategory').value,
    target:     parseFloat(document.getElementById('goalTarget').value),
    saved:      parseFloat(document.getElementById('goalSaved').value || '0'),
    targetDate: document.getElementById('goalDate').value,
    priority:   document.getElementById('goalPriority').value,
    notes:      document.getElementById('goalNotes').value.trim(),
  };
  saveGoals(goals);
  closeModal('addGoalModal');

  // Reset form to add mode
  const form = document.querySelector('#addGoalModal form');
  form.onsubmit = addGoal;
  document.querySelector('#addGoalModal .modal-title').textContent = '🎯 New Financial Goal';
  form.reset();

  renderGoalsGrid();
  showToast('Goal updated!', 'success');
}

// ---- DELETE GOAL ----
function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  saveGoals(getGoals().filter(g => g.id !== id));
  renderGoalsGrid();
  showToast('Goal deleted.', 'info');
}

// ---- HELPERS ----
function setTxt(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  initPageData();
  applyUserGreeting();

  const d = new Date(); d.setMonth(d.getMonth() + 6);
  const df = document.getElementById('goalDate');
  if (df) df.value = d.toISOString().split('T')[0];

  renderGoalsGrid();
});