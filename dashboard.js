/* ============================================
   SPENDSENSE - Dashboard Logic
   Handles new-user onboarding + returning user dashboard
============================================ */

const CAT_COLORS = {
  food:'#FF6B6B', entertainment:'#8B85FF', shopping:'#FFB347',
  subscriptions:'#38F9D7', transport:'#43E97B', health:'#FF6584',
  utilities:'#9B8FF0', other:'#A7A9BE',
};

// ---- HELPERS ----
function getMonthExpenses(month, year) {
  return loadData('expenses', []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}
function getCategoryTotals(expenses) {
  const t = {};
  expenses.forEach(e => { t[e.category] = (t[e.category] || 0) + e.amount; });
  return t;
}
function animateValue(id, end, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200, startTime = performance.now();
  function update(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = formatter(Math.round(end * ease));
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ================================================================
//  ONBOARDING — shown to brand-new users with empty data
// ================================================================
function renderOnboarding() {
  const session = getSession();
  const firstName = session ? session.firstName : 'there';
  document.getElementById('dashboardContent').innerHTML = `
    <div class="onboarding-card">
      <div style="font-size:3rem;margin-bottom:16px">🎉</div>
      <h2 style="font-size:1.6rem;margin-bottom:8px">Welcome to SpendSense, ${firstName}!</h2>
      <p style="color:var(--text-muted);font-size:0.95rem;max-width:480px;margin:0 auto">
        Your financial dashboard is all set. Follow these steps to get started and take control of your money.
      </p>
      <div class="onboarding-steps">
        <div class="ob-step" onclick="window.location='budget.html'">
          <div class="ob-step-num">01</div>
          <h3>Set Your Salary</h3>
          <p>Tell us your monthly income so we can calculate budgets and savings targets.</p>
          <div style="margin-top:12px"><span class="btn btn-primary btn-sm">Go →</span></div>
        </div>
        <div class="ob-step" onclick="window.location='budget.html?planner=1'">
          <div class="ob-step-num">02</div>
          <h3>✨ Smart Budget Planner</h3>
          <p>Tell us your spending categories and we'll auto-generate your monthly budget in seconds.</p>
          <div style="margin-top:12px"><span class="btn btn-primary btn-sm">Plan Now →</span></div>
        </div>
        <div class="ob-step" onclick="window.location='expenses.html'">
          <div class="ob-step-num">03</div>
          <h3>Add Your Expenses</h3>
          <p>Log what you've spent so SpendSense can track and analyse your finances.</p>
          <div style="margin-top:12px"><span class="btn btn-primary btn-sm">Go →</span></div>
        </div>
        <div class="ob-step" onclick="window.location='goals.html'">
          <div class="ob-step-num">04</div>
          <h3>Set a Financial Goal</h3>
          <p>Plan for a trip, gadget, emergency fund or anything else. We'll tell you how to get there.</p>
          <div style="margin-top:12px"><span class="btn btn-primary btn-sm">Go →</span></div>
        </div>
      </div>
    </div>

    <!-- Quick actions even for new users -->
    <div class="card" style="max-width:480px">
      <div class="section-title" style="margin-bottom:16px">Quick Actions</div>
      <div class="quick-actions-grid">
        <button class="quick-action-btn" onclick="window.location='expenses.html'">
          <div class="qa-icon" style="background:rgba(13,148,136,0.15);color:var(--primary)"><i class="fas fa-plus"></i></div>
          <span>Add Expense</span>
        </button>
        <button class="quick-action-btn" onclick="window.location='budget.html?planner=1'">
          <div class="qa-icon" style="background:rgba(16,185,129,0.15);color:var(--accent)"><i class="fas fa-magic"></i></div>
          <span>Smart Planner</span>
        </button>
        <button class="quick-action-btn" onclick="window.location='budget.html'">
          <div class="qa-icon" style="background:rgba(245,158,11,0.15);color:var(--warning)"><i class="fas fa-sliders-h"></i></div>
          <span>Set Budget</span>
        </button>
        <button class="quick-action-btn" onclick="window.location='goals.html'">
          <div class="qa-icon" style="background:rgba(244,63,94,0.15);color:var(--secondary)"><i class="fas fa-bullseye"></i></div>
          <span>New Goal</span>
        </button>
      </div>
    </div>`;
}

// ================================================================
//  FULL DASHBOARD — returning users with data
// ================================================================
function renderFullDashboard() {
  document.getElementById('dashboardContent').innerHTML = `
    <!-- BUDGET ALERT BANNER (populated by JS) -->
    <div id="alertBanner" style="display:none" class="alert-banner">
      <i class="fas fa-exclamation-triangle"></i>
      <div id="alertBannerText"></div>
      <button onclick="dismissAlert()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1rem;margin-left:auto;opacity:0.7"><i class="fas fa-times"></i></button>
    </div>

    <!-- STAT CARDS -->
    <div class="stat-grid">
      <div class="stat-card purple fade-in">
        <div class="stat-icon purple"><i class="fas fa-wallet"></i></div>
        <div class="stat-value" id="statSalary">₹0</div>
        <div class="stat-label">Monthly Salary</div>
        <div class="stat-change up" id="statSalaryChange"></div>
      </div>
      <div class="stat-card green fade-in">
        <div class="stat-icon green"><i class="fas fa-piggy-bank"></i></div>
        <div class="stat-value" id="statSavings">₹0</div>
        <div class="stat-label">Remaining Balance</div>
        <div class="stat-change" id="statSavingsChange"></div>
      </div>
      <div class="stat-card orange fade-in">
        <div class="stat-icon orange"><i class="fas fa-credit-card"></i></div>
        <div class="stat-value" id="statSpent">₹0</div>
        <div class="stat-label">Total Spent (This Month)</div>
        <div class="stat-change" id="statSpentChange"></div>
      </div>
      <div class="stat-card blue fade-in">
        <div class="stat-icon blue"><i class="fas fa-piggy-bank"></i></div>
        <div class="stat-value" id="statBalance">₹0</div>
        <div class="stat-label">Saved This Month</div>
        <div class="stat-change up" id="statBalanceChange"></div>
      </div>
    </div>

    <!-- CHARTS ROW -->
    <div class="grid-2" style="margin-bottom:32px">
      <div class="card">
        <div class="section-header">
          <div class="section-title">Spending Overview</div>
          <select class="form-control" style="width:auto;padding:6px 12px;font-size:0.8rem" onchange="updateLineChart(this.value)">
            <option value="6">Last 6 Months</option>
            <option value="3">Last 3 Months</option>
            <option value="12">Last 12 Months</option>
          </select>
        </div>
        <div class="chart-container" style="height:240px"><canvas id="lineChart"></canvas></div>
      </div>
      <div class="card">
        <div class="section-header">
          <div class="section-title">Category Breakdown</div>
          <span class="badge badge-primary" id="chartMonthLabel">This Month</span>
        </div>
        <div id="donutWrap" style="display:flex;gap:20px;align-items:center">
          <div class="chart-container" style="height:220px;width:220px;flex-shrink:0"><canvas id="donutChart"></canvas></div>
          <div id="legendList" style="flex:1;display:flex;flex-direction:column;gap:10px"></div>
        </div>
        <div id="donutEmpty" style="display:none" class="empty-state" style="padding:32px">
          <div class="empty-icon">📊</div>
          <p>No expenses this month yet.</p>
          <a href="expenses.html" class="btn btn-primary btn-sm" style="margin-top:12px">Add Expense</a>
        </div>
      </div>
    </div>

    <!-- TRANSACTIONS + SIDE PANEL -->
    <div class="grid-2">
      <div class="card">
        <div class="section-header">
          <div class="section-title">Recent Transactions</div>
          <a href="expenses.html" class="btn btn-secondary btn-sm">View All</a>
        </div>
        <div class="expense-list" id="recentTxList"></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:24px">
        <div class="card">
          <div class="section-header">
            <div class="section-title">Budget Health</div>
            <a href="budget.html" class="btn btn-secondary btn-sm">Manage</a>
          </div>
          <div id="budgetHealthList"></div>
        </div>
        <div class="card">
          <div class="section-title" style="margin-bottom:16px">Quick Actions</div>
          <div class="quick-actions-grid">
            <button class="quick-action-btn" onclick="window.location='expenses.html'">
              <div class="qa-icon" style="background:rgba(13,148,136,0.15);color:var(--primary)"><i class="fas fa-plus"></i></div>
              <span>Add Expense</span>
            </button>
            <button class="quick-action-btn" onclick="window.location='budget.html?planner=1'">
              <div class="qa-icon" style="background:rgba(16,185,129,0.15);color:var(--accent)"><i class="fas fa-magic"></i></div>
              <span>Smart Planner</span>
            </button>
            <button class="quick-action-btn" onclick="window.location='budget.html'">
              <div class="qa-icon" style="background:rgba(245,158,11,0.15);color:var(--warning)"><i class="fas fa-sliders-h"></i></div>
              <span>Set Budget</span>
            </button>
            <button class="quick-action-btn" onclick="window.location='goals.html'">
              <div class="qa-icon" style="background:rgba(244,63,94,0.15);color:var(--secondary)"><i class="fas fa-bullseye"></i></div>
              <span>My Goals</span>
            </button>
          </div>
        </div>
      </div>
    </div>`;

  // Now populate dynamic bits
  renderStatCards();
  renderLineChart(6);
  renderDonutChart();
  renderRecentTransactions();
  renderBudgetHealth();
  renderAlertBanner();
  buildNotifications();
}

// ---- STAT CARDS ----
function renderStatCards() {
  const salary     = loadData('salary', 0);
  const now        = new Date();
  const expenses   = getMonthExpenses(now.getMonth() + 1, now.getFullYear());
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining  = salary - totalSpent;
  // "Saved this month" = what's left after spending (capped at 0)
  const savedThisMonth = Math.max(0, remaining);

  animateValue('statSalary',  salary,         formatCurrency);
  animateValue('statSpent',   totalSpent,     formatCurrency);
  animateValue('statSavings', Math.max(0, remaining), formatCurrency);
  animateValue('statBalance', savedThisMonth, formatCurrency);

  const spentPct = salary > 0 ? Math.round((totalSpent / salary) * 100) : 0;
  const spentEl  = document.getElementById('statSpentChange');
  if (spentEl) {
    spentEl.className = 'stat-change ' + (spentPct > 80 ? 'down' : 'up');
    spentEl.innerHTML = `<i class="fas fa-${spentPct > 80 ? 'arrow-up' : 'check'}"></i> ${spentPct}% of salary`;
  }

  const savEl = document.getElementById('statSavingsChange');
  if (savEl && salary > 0) {
    const pct = Math.round((remaining / salary) * 100);
    savEl.className = 'stat-change ' + (pct >= 20 ? 'up' : 'down');
    savEl.innerHTML = `<i class="fas fa-${pct >= 20 ? 'arrow-up' : 'arrow-down'}"></i> ${pct}% savings rate`;
  }

  const balEl = document.getElementById('statBalanceChange');
  if (balEl && salary > 0) {
    const savPct = Math.round((savedThisMonth / salary) * 100);
    balEl.className = 'stat-change ' + (savPct >= 20 ? 'up' : 'down');
    balEl.innerHTML = `<i class="fas fa-${savPct >= 20 ? 'smile' : 'info-circle'}"></i> ${savPct}% of salary saved`;
  }
}

// ---- LINE CHART ----
let lineChartInst = null;
function renderLineChart(months = 6) {
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  const now    = new Date();
  const labels = [], data = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('en-IN', { month:'short' }));
    const exps = getMonthExpenses(d.getMonth() + 1, d.getFullYear());
    data.push(exps.reduce((s, e) => s + e.amount, 0));
  }
  const salary     = loadData('salary', 0);
  const budgetLine = new Array(months).fill(salary);

  if (lineChartInst) lineChartInst.destroy();
  lineChartInst = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Spent', data, borderColor:'#FF6584', backgroundColor:'rgba(255,101,132,0.1)', fill:true, tension:0.45, pointBackgroundColor:'#FF6584', pointRadius:5, pointHoverRadius:7 },
      { label:'Salary', data:budgetLine, borderColor:'#6C63FF', borderDash:[6,4], backgroundColor:'transparent', pointRadius:0, tension:0 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#A7A9BE', font:{ size:11 }, boxWidth:12 } }, tooltip:{ backgroundColor:'#1A1A2E', titleColor:'#fff', bodyColor:'#A7A9BE', borderColor:'rgba(108,99,255,0.3)', borderWidth:1, callbacks:{ label:c=>' '+formatCurrency(c.raw) } } },
      scales:{ x:{ grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#A7A9BE', font:{ size:11 } } }, y:{ grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#A7A9BE', font:{ size:11 }, callback:v=>'₹'+(v/1000).toFixed(0)+'K' } } }
    }
  });
}
function updateLineChart(months) { renderLineChart(parseInt(months)); }

// ---- DONUT CHART ----
let donutChartInst = null;
function renderDonutChart() {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;
  const now = new Date();
  const expenses = getMonthExpenses(now.getMonth() + 1, now.getFullYear());
  const totals   = getCategoryTotals(expenses);
  const keys     = Object.keys(totals);

  const donutWrap  = document.getElementById('donutWrap');
  const donutEmpty = document.getElementById('donutEmpty');

  if (keys.length === 0) {
    if (donutWrap)  donutWrap.style.display  = 'none';
    if (donutEmpty) donutEmpty.style.display = 'block';
    return;
  }
  if (donutWrap)  donutWrap.style.display  = 'flex';
  if (donutEmpty) donutEmpty.style.display = 'none';

  const labels = keys.map(k => getCategoryInfo(k).label);
  const data   = keys.map(k => totals[k]);
  const colors = keys.map(k => CAT_COLORS[k] || '#A7A9BE');
  const total  = data.reduce((s, v) => s + v, 0);

  if (donutChartInst) donutChartInst.destroy();
  donutChartInst = new Chart(ctx, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:3, borderColor:'#1A1A2E', hoverOffset:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'65%',
      plugins:{ legend:{ display:false }, tooltip:{ backgroundColor:'#1A1A2E', titleColor:'#fff', bodyColor:'#A7A9BE', borderColor:'rgba(108,99,255,0.3)', borderWidth:1, callbacks:{ label:c=>' '+formatCurrency(c.raw) } } }
    }
  });

  const legend = document.getElementById('legendList');
  if (legend) {
    legend.innerHTML = keys.map((k, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.8rem">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0;display:inline-block"></span>
          <span style="color:var(--text-muted)">${labels[i]}</span>
        </div>
        <span style="font-weight:600">${Math.round(data[i]/total*100)}%</span>
      </div>`).join('');
  }
}

// ---- RECENT TRANSACTIONS ----
function renderRecentTransactions() {
  const list = document.getElementById('recentTxList');
  if (!list) return;
  const expenses = loadData('expenses', []);
  const recent   = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>No transactions yet</p><a href="expenses.html" class="btn btn-primary btn-sm" style="margin-top:12px">Add First Expense</a></div>`;
    return;
  }
  list.innerHTML = recent.map(e => {
    const cat = getCategoryInfo(e.category);
    return `<div class="expense-item">
      <div class="expense-category-icon ${cat.colorClass}">${cat.icon}</div>
      <div class="expense-info">
        <div class="expense-name">${e.name}</div>
        <div class="expense-meta">${formatDate(e.date)} &nbsp;·&nbsp; ${e.payment}</div>
      </div>
      <div class="expense-amount debit">−${formatCurrency(e.amount)}</div>
    </div>`;
  }).join('');
}

// ---- BUDGET HEALTH ----
function renderBudgetHealth() {
  const container = document.getElementById('budgetHealthList');
  if (!container) return;
  const budgets  = loadData('budgets', []);
  const now      = new Date();
  const expenses = getMonthExpenses(now.getMonth() + 1, now.getFullYear());
  const totals   = getCategoryTotals(expenses);

  if (budgets.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px 16px">
        <div style="font-size:2.4rem;margin-bottom:10px">✨</div>
        <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:6px">No budgets set yet</h3>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;line-height:1.5">
          Let our <strong>Smart Planner</strong> build your entire budget in 30 seconds — just tell us your salary and spending categories.
        </p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <a href="budget.html?planner=1" class="btn btn-primary btn-sm"><i class="fas fa-magic"></i> Auto-Plan My Budget</a>
          <a href="budget.html" class="btn btn-secondary btn-sm">Manual Setup</a>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = budgets.slice(0, 5).map(b => {
    const spent = totals[b.category] || 0;
    const pct   = Math.min(Math.round((spent / b.limit) * 100), 100);
    const cat   = getCategoryInfo(b.category, b.customLabel);
    const color = pct > 100 ? '#FF4757' : pct >= b.threshold ? '#FFB347' : '#43E97B';
    return `<div class="budget-item">
      <div class="budget-item-header">
        <div class="budget-item-name"><span>${cat.icon}</span><span>${cat.label}</span></div>
        <div class="budget-amounts">
          <div class="budget-spent" style="color:${color}">${formatCurrency(spent)}</div>
          <div class="budget-limit">of ${formatCurrency(b.limit)}</div>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${Math.min(pct,100)}%;background:${pct>100?'#FF4757':pct===100?'#FFB347':pct>=b.threshold?'#FFB347':'var(--gradient-2)'}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-top:4px;color:var(--text-muted)">
        <span>${pct}% used</span>
        <span>${pct>100?'<span style="color:#FF4757">Exceeded!</span>':pct===100?'<span style="color:#FFB347">Fully used</span>':formatCurrency(b.limit-spent)+' left'}</span>
      </div>
    </div>`;
  }).join('');
}

// ---- ALERT BANNER ----
function renderAlertBanner() {
  const budgets  = loadData('budgets', []);
  const now      = new Date();
  const expenses = getMonthExpenses(now.getMonth() + 1, now.getFullYear());
  const totals   = getCategoryTotals(expenses);
  const exceeded = budgets.filter(b => (totals[b.category] || 0) > b.limit);
  const warned   = budgets.filter(b => { const pct = ((totals[b.category] || 0) / b.limit) * 100; return pct >= b.threshold && pct < 100; });

  const banner   = document.getElementById('alertBanner');
  const bannerTx = document.getElementById('alertBannerText');
  if (!banner) return;

  if (exceeded.length > 0) {
    banner.style.display = 'flex';
    banner.style.background = 'rgba(255,71,87,0.1)';
    banner.style.borderColor = 'rgba(255,71,87,0.35)';
    banner.style.color = 'var(--danger)';
    bannerTx.innerHTML = `<strong>Budget Exceeded!</strong> ${exceeded.map(b => getCategoryInfo(b.category, b.customLabel).label).join(', ')} ${exceeded.length>1?'are':'is'} over budget this month. <a href="budget.html" style="color:var(--danger);font-weight:600;margin-left:8px">Review →</a>`;
  } else if (warned.length > 0) {
    banner.style.display = 'flex';
    bannerTx.innerHTML = `<strong>Budget Alert!</strong> ${warned.map(b => { const pct=Math.round(((totals[b.category]||0)/b.limit)*100); return `${getCategoryInfo(b.category, b.customLabel).label} at ${pct}%`; }).join(', ')}. <a href="budget.html" style="color:var(--warning);font-weight:600;margin-left:8px">Review Budget →</a>`;
  }
}
function dismissAlert() {
  const b = document.getElementById('alertBanner');
  if (b) { b.style.animation = 'slideOutRight 0.3s ease forwards'; setTimeout(() => b.style.display='none', 300); }
}

// ---- NOTIFICATIONS ----
function dismissAllNotifs() {
  // Save the keys of every notification currently visible
  const list = document.getElementById('notifList');
  const keys = list ? Array.from(list.querySelectorAll('[data-notif-key]')).map(el => el.dataset.notifKey) : [];

  const dismissed = loadData('dismissedNotifKeys', []);
  const merged    = [...new Set([...dismissed, ...keys])];
  saveData('dismissedNotifKeys', merged);

  // Clear badge immediately — don't close the modal so user sees "all caught up"
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
  if (list)  list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px">You\'re all caught up! 🎉</p>';
}

function buildNotifications() {
  const budgets   = loadData('budgets', []);
  const now       = new Date();
  const expenses  = getMonthExpenses(now.getMonth() + 1, now.getFullYear());
  const totals    = getCategoryTotals(expenses);
  const reminders = loadData('reminders', []);

  // Load previously dismissed notification keys
  const dismissed = new Set(loadData('dismissedNotifKeys', []));

  const allNotifs = [];

  budgets.forEach(b => {
    const pct  = ((totals[b.category] || 0) / b.limit) * 100;
    const label = getCategoryInfo(b.category, b.customLabel).label;
    if (pct > 100) {
      allNotifs.push({ key:`budget_exceeded_${b.category}`, type:'danger',  icon:'fas fa-fire',  title:`${label} Exceeded!`, msg:`Spent ${formatCurrency(totals[b.category]||0)} of ${formatCurrency(b.limit)} budget.` });
    } else if (pct === 100) {
      allNotifs.push({ key:`budget_full_${b.category}`,    type:'warning', icon:'fas fa-check-circle', title:`${label} fully used`, msg:`You've spent exactly your ${formatCurrency(b.limit)} budget.` });
    } else if (pct >= b.threshold) {
      allNotifs.push({ key:`budget_warn_${b.category}_${Math.round(pct)}`, type:'warning', icon:'fas fa-exclamation-triangle', title:`${label} at ${Math.round(pct)}%`, msg:`${formatCurrency(b.limit-(totals[b.category]||0))} remaining.` });
    }
  });

  // Reminders always show (time-sensitive — can't dismiss a bill due tomorrow)
  reminders.filter(r => !r.paid && daysUntil(r.date) <= 3 && daysUntil(r.date) >= 0)
    .forEach(r => allNotifs.push({ key:`reminder_${r.id}`, type:'info', icon:'fas fa-bell', title:`${r.title} Due Soon`, msg:`${formatCurrency(r.amount)} due on ${formatDate(r.date)}.` }));

  // Filter out dismissed ones (except reminders — always show those)
  const visibleNotifs = allNotifs.filter(n => n.type === 'info' || !dismissed.has(n.key));

  const badge = document.getElementById('notifBadge');
  if (badge) { badge.style.display = visibleNotifs.length > 0 ? 'flex' : 'none'; badge.textContent = visibleNotifs.length; }

  const list = document.getElementById('notifList');
  if (list) {
    list.innerHTML = visibleNotifs.length === 0
      ? '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px">You\'re all caught up! 🎉</p>'
      : visibleNotifs.map(n => `
          <div class="notif-item ${n.type}" data-notif-key="${n.key}">
            <i class="${n.icon}"></i>
            <div><strong>${n.title}</strong><p>${n.msg}</p></div>
          </div>`).join('');
  }
}
function showNotifications() { openModal('notifModal'); }

// ---- DASHBOARD SEARCH ----
function dashboardSearch(query) {
  if (!query.trim()) return;
  window.location.href = `expenses.html?search=${encodeURIComponent(query.trim())}`;
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function () {
  const session = requireAuth();
  if (!session) return;
  initPageData(); // seeds data + applies greeting

  const expenses = loadData('expenses', []);
  const salary   = loadData('salary', 0);
  const hasData  = expenses.length > 0 || salary > 0;
  // Show onboarding only for brand-new users who have never been initialized.
  // After a reset, initialized=true so we always render the dashboard (with zeros).
  const neverSetUp = !loadData('initialized');

  if (hasData || !neverSetUp) {
    renderFullDashboard();
  } else {
    renderOnboarding();
  }
});