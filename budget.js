/* ============================================
   SPENDSENSE - Budget Page Logic
============================================ */

let radarChartInstance = null;

// ---- GET SPENDING FOR CATEGORY ----
function getCategorySpent(category, month, year) {
  const expenses = loadData('expenses', []);
  return expenses
    .filter(e => {
      const d = new Date(e.date);
      return e.category === category &&
             d.getMonth() + 1 === month &&
             d.getFullYear() === year;
    })
    .reduce((s, e) => s + e.amount, 0);
}

function getCurrentMonth() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// ---- RENDER BUDGET LIST ----
function renderBudgetList() {
  const container = document.getElementById('budgetList');
  if (!container) return;

  const budgets = loadData('budgets', []);
  const { month, year } = getCurrentMonth();

  if (budgets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3>No budgets set</h3>
        <p>Add a budget to start tracking your spending limits.</p>
      </div>`;
    return;
  }

  container.innerHTML = budgets.map(b => {
    const spent = getCategorySpent(b.category, month, year);
    const pct   = Math.min(Math.round((spent / b.limit) * 100), 150);
    const cat   = getCategoryInfo(b.category, b.customLabel);    const remaining = b.limit - spent;

    let barColor, statusBadge;
    if (pct > 100) {
      barColor = '#FF4757';
      statusBadge = `<span class="badge badge-danger"><i class="fas fa-fire"></i> Exceeded</span>`;
    } else if (pct === 100) {
      barColor = '#F0BC78';
      statusBadge = `<span class="badge badge-warning"><i class="fas fa-check"></i> Fully Used</span>`;
    } else if (pct >= b.threshold) {
      barColor = '#FFB347';
      statusBadge = `<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Warning</span>`;
    } else {
      barColor = '#43E97B';
      statusBadge = `<span class="badge badge-success"><i class="fas fa-check"></i> On Track</span>`;
    }

    return `
      <div class="budget-item" style="margin-bottom:12px">
        <div class="budget-item-header">
          <div class="budget-item-name">
            <span style="font-size:1.2rem">${cat.icon}</span>
            <div>
              <div style="font-weight:600">${cat.label}</div>
              ${statusBadge}
            </div>
          </div>
          <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <div style="font-size:1rem;font-weight:700;color:${barColor}">${formatCurrency(spent)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">of ${formatCurrency(b.limit)}</div>
            <div style="display:flex;gap:6px;margin-top:4px">
              <button style="background:rgba(108,99,255,0.15);color:var(--primary-light);border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.75rem" onclick="editBudget(${b.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button style="background:rgba(255,71,87,0.15);color:var(--danger);border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.75rem" onclick="deleteBudget(${b.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="progress-bar-wrap" style="margin:10px 0 6px">
          <div class="progress-bar-fill" style="width:${Math.min(pct,100)}%;background:${barColor}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted)">
          <span>${pct}% used</span>
          <span>${remaining >= 0 ? formatCurrency(remaining)+' remaining' : '<span style="color:#FF4757">'+formatCurrency(Math.abs(remaining))+' over budget</span>'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ---- OVERVIEW STATS ----
function renderBudgetStats() {
  const budgets = loadData('budgets', []);
  const { month, year } = getCurrentMonth();
  let onTrack = 0, nearLimit = 0, exceeded = 0;
  let totalSpent = 0, totalLimit = 0;

  budgets.forEach(b => {
    const spent = getCategorySpent(b.category, month, year);
    const pct = (spent / b.limit) * 100;
    totalSpent += spent;
    totalLimit += b.limit;
    if (pct > 100) exceeded++;
    else if (pct >= 75) nearLimit++;
    else onTrack++;
  });

  setElContent('onTrackCount', onTrack);
  setElContent('nearLimitCount', nearLimit);
  setElContent('exceededCount', exceeded);
  const avgPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  setElContent('avgUsage', avgPct + '%');
}

function setElContent(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ---- SALARY BAR ----
function renderSalaryBar() {
  const salary = loadData('salary', 0);
  const budgets = loadData('budgets', []);
  const { month, year } = getCurrentMonth();
  const totalAllocated = budgets.reduce((s, b) => {
    return s + getCategorySpent(b.category, month, year);
  }, 0);

  const pct = salary > 0 ? Math.min(Math.round((totalAllocated / salary) * 100), 100) : 0;

  setElContent('salaryDisplay', salary > 0 ? formatCurrency(salary) : 'Not set');
  setElContent('allocatedDisplay', formatCurrency(totalAllocated));
  setElContent('unallocatedDisplay', formatCurrency(Math.max(0, salary - totalAllocated)));

  const bar = document.getElementById('salaryProgressBar');
  if (bar) bar.style.width = pct + '%';

  const label = document.getElementById('salaryProgressLabel');
  if (label) {
    label.textContent = salary > 0
      ? `${pct}% of salary spent — ${formatCurrency(salary - totalAllocated)} available`
      : 'Set your salary above to track spending against it.';
  }
}

// ---- UPDATE SALARY ----
function updateSalary() {
  const val = parseInt(document.getElementById('salaryInput')?.value);
  if (!val || val < 1000) { showToast('Please enter a valid salary (min ₹1,000)', 'warning'); return; }
  saveData('salary', val);
  renderSalaryBar();
  renderRadarChart();
  showToast('Salary updated to ' + formatCurrency(val), 'success');
}

// ---- RADAR CHART ----
function renderRadarChart() {
  const ctx = document.getElementById('budgetRadarChart');
  if (!ctx) return;

  const budgets = loadData('budgets', []);
  if (budgets.length === 0) return;

  const { month, year } = getCurrentMonth();
  const labels = budgets.map(b => getCategoryInfo(b.category, b.customLabel).icon + ' ' + getCategoryInfo(b.category, b.customLabel).label);
  const limits  = budgets.map(b => b.limit);
  const spent   = budgets.map(b => getCategorySpent(b.category, month, year));

  if (radarChartInstance) radarChartInstance.destroy();
  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'Budget Limit',
          data: limits,
          borderColor: 'rgba(108,99,255,0.8)',
          backgroundColor: 'rgba(108,99,255,0.1)',
          pointBackgroundColor: 'rgba(108,99,255,0.8)',
          pointRadius: 4,
        },
        {
          label: 'Spent',
          data: spent,
          borderColor: 'rgba(255,101,132,0.8)',
          backgroundColor: 'rgba(255,101,132,0.1)',
          pointBackgroundColor: 'rgba(255,101,132,0.8)',
          pointRadius: 4,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#A7A9BE', font: { size: 11 }, boxWidth: 12 } },
        tooltip: { backgroundColor: '#1A1A2E', titleColor: '#fff', bodyColor: '#A7A9BE', borderColor: 'rgba(108,99,255,0.3)', borderWidth: 1, callbacks: { label: c => ' ' + formatCurrency(c.raw) } }
      },
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#A7A9BE', font: { size: 10 } },
          ticks: { display: false },
        }
      }
    }
  });
}

// ---- BUDGET ALERTS ----
function renderBudgetAlerts() {
  const container = document.getElementById('budgetAlerts');
  if (!container) return;

  const budgets = loadData('budgets', []);
  const { month, year } = getCurrentMonth();
  const alerts = [];

  budgets.forEach(b => {
    const spent = getCategorySpent(b.category, month, year);
    const pct = (spent / b.limit) * 100;
    const cat = getCategoryInfo(b.category, b.customLabel);
    if (pct > 100) {
      alerts.push({ type: 'danger', icon: '🔥', msg: `<strong>${cat.label} budget exceeded!</strong> You've spent ${formatCurrency(spent)} of ${formatCurrency(b.limit)}. Consider cutting down.` });
    } else if (pct === 100) {
      alerts.push({ type: 'warning', icon: '✅', msg: `<strong>${cat.label} fully used.</strong> You've spent exactly your ₹${formatCurrency(b.limit)} budget. No room left this month.` });
    } else if (pct >= b.threshold) {
      alerts.push({ type: 'warning', icon: '⚠️', msg: `<strong>${cat.label} at ${Math.round(pct)}%!</strong> Only ${formatCurrency(b.limit - spent)} remaining of ${formatCurrency(b.limit)} budget.` });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;background:rgba(67,233,123,0.08);border:1px solid rgba(67,233,123,0.2);border-radius:var(--radius-sm);font-size:0.85rem;color:var(--accent)">
        <i class="fas fa-check-circle"></i>
        <span><strong>All budgets are on track!</strong> You're spending wisely this month. Keep it up!</span>
      </div>`;
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:rgba(${a.type==='danger'?'255,71,87':'255,179,71'},0.08);border:1px solid rgba(${a.type==='danger'?'255,71,87':'255,179,71'},0.25);border-radius:var(--radius-sm);font-size:0.82rem;color:var(--${a.type==='danger'?'danger':'warning'});margin-bottom:8px">
      <span style="font-size:1rem">${a.icon}</span>
      <span>${a.msg}</span>
    </div>
  `).join('');
}

// ---- SMART TIPS ----
function renderSmartTips() {
  const container = document.getElementById('smartTipsList');
  if (!container) return;

  const budgets = loadData('budgets', []);
  const { month, year } = getCurrentMonth();
  const tips = [];

  budgets.forEach(b => {
    const spent = getCategorySpent(b.category, month, year);
    const pct = (spent / b.limit) * 100;
    const cat = getCategoryInfo(b.category, b.customLabel);

    if (b.category === 'food' && pct > 80) {
      tips.push({ icon: '🍱', text: 'Try meal prepping on weekends to cut food delivery costs by up to 40%.' });
    }
    if (b.category === 'entertainment' && pct > 75) {
      tips.push({ icon: '🎭', text: 'Look for free events, library memberships, or OTT family plans to save on entertainment.' });
    }
    if (b.category === 'shopping' && pct > 80) {
      tips.push({ icon: '🛍️', text: 'Use a 24-hour waiting rule before non-essential purchases to avoid impulse buying.' });
    }
    if (b.category === 'subscriptions' && pct > 70) {
      tips.push({ icon: '📺', text: 'Audit your subscriptions — the average person pays for 3–4 they never use.' });
    }
    if (b.category === 'transport' && pct > 75) {
      tips.push({ icon: '🚌', text: 'Consider using public transport or carpooling to cut down transport costs.' });
    }
  });

  if (tips.length === 0) {
    tips.push({ icon: '🌟', text: 'Great job! You\'re within all budget limits this month.' });
    tips.push({ icon: '💰', text: 'Consider increasing your savings rate by 5% — it adds up over time.' });
  }

  const salary = loadData('salary', 0);
  const totalSpent = budgets.reduce((s, b) => s + getCategorySpent(b.category, month, year), 0);
  const savingsRate = Math.round(((salary - totalSpent) / salary) * 100);
  if (savingsRate > 20) {
    tips.push({ icon: '📈', text: `You're saving ${savingsRate}% of your income this month. Consider investing the surplus!` });
  }

  container.innerHTML = tips.slice(0, 4).map(t => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--card-light);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <span style="font-size:1.2rem">${t.icon}</span>
      <span style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">${t.text}</span>
    </div>
  `).join('');
}

// ---- ADD BUDGET ----
// Categories where a budget limit alert makes no sense — fixed monthly commitments
const NO_ALERT_CATS = new Set(['rent','emi','insurance','health','utilities']);

function toggleThresholdField(category) {
  const group = document.getElementById('budgetThresholdGroup');
  if (!group) return;
  if (NO_ALERT_CATS.has(category)) {
    group.style.display = 'none';
    // Force threshold to 101 (never trigger) for fixed categories
    const sel = document.getElementById('budgetThreshold');
    if (sel) sel.value = '101';
  } else {
    group.style.display = 'block';
    const sel = document.getElementById('budgetThreshold');
    if (sel && sel.value === '101') sel.value = '80';
  }
}

// ---- CUSTOM BUDGET NAME TOGGLE ----
function toggleCustomBudgetName(val) {
  const group = document.getElementById('customBudgetNameGroup');
  const input = document.getElementById('customBudgetName');
  if (val === 'other') {
    group.style.display = 'block';
    input.required = true;
  } else {
    group.style.display = 'none';
    input.required = false;
    input.value = '';
  }
}

function addBudget(e) {
  e.preventDefault();
  let category  = document.getElementById('budgetCategory').value;
  const limit     = parseFloat(document.getElementById('budgetLimit').value);
  const threshold = parseInt(document.getElementById('budgetThreshold').value);

  // If "other" chosen, use the custom name as a unique category key
  let customLabel = null;
  if (category === 'other') {
    customLabel = document.getElementById('customBudgetName').value.trim();
    if (!customLabel) { showToast('Please enter a name for your custom category.', 'warning'); return; }
    // Slug-ify the name so it works as a consistent key (e.g. "Pet Care" → "custom_pet_care")
    category = 'custom_' + customLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  const budgets = loadData('budgets', []);
  if (budgets.some(b => b.category === category)) {
    showToast('Budget for this category already exists. Edit it instead.', 'warning');
    return;
  }

  let nextId = loadData('nextBudgetId', 8);
  budgets.push({ id: nextId++, category, limit, threshold, customLabel });
  saveData('budgets', budgets);
  saveData('nextBudgetId', nextId);

  closeModal('addBudgetModal');
  e.target.reset();
  toggleCustomBudgetName('');
  toggleThresholdField('');   // show threshold field again for next time
  loadBudgets();
  showToast(`Budget set for ${getCategoryInfo(category, customLabel).label}!`, 'success');
}

// ---- EDIT BUDGET ----
function editBudget(id) {
  const budgets = loadData('budgets', []);
  const b = budgets.find(bud => bud.id === id);
  if (!b) return;

  const cat = getCategoryInfo(b.category, b.customLabel);
  document.getElementById('editBudgetId').value       = b.id;
  document.getElementById('editBudgetCatDisplay').value = cat.icon + ' ' + cat.label;
  document.getElementById('editBudgetLimit').value    = b.limit;
  document.getElementById('editBudgetThreshold').value = b.threshold;
  openModal('editBudgetModal');
}

function saveEditBudget(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('editBudgetId').value);
  const budgets = loadData('budgets', []);
  const idx = budgets.findIndex(b => b.id === id);
  if (idx === -1) return;

  budgets[idx].limit     = parseFloat(document.getElementById('editBudgetLimit').value);
  budgets[idx].threshold = parseInt(document.getElementById('editBudgetThreshold').value);
  saveData('budgets', budgets);

  closeModal('editBudgetModal');
  loadBudgets();
  showToast('Budget updated!', 'success');
}

// ---- DELETE BUDGET ----
function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  const budgets = loadData('budgets', []).filter(b => b.id !== id);
  saveData('budgets', budgets);
  loadBudgets();
  showToast('Budget deleted.', 'info');
}

// ---- LOAD ALL (called on init) ----
function loadBudgets() {
  // Show current month label
  const monthLabel = document.getElementById('budgetMonthLabel');
  if (monthLabel) {
    monthLabel.textContent = new Date().toLocaleString('en-IN', { month:'long', year:'numeric' });
  }
  renderBudgetList();
  renderBudgetStats();
  renderSalaryBar();
  renderSmartTips();
  renderRadarChart();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function () {
  const session = requireAuth();
  if (!session) return;
  initPageData();

  const savedSalary = loadData('salary', 0);
  const salaryInput = document.getElementById('salaryInput');
  if (salaryInput && savedSalary > 0) salaryInput.value = savedSalary;

  loadBudgets();

  const params = new URLSearchParams(window.location.search);
  if (params.get('planner') === '1') setTimeout(() => openSmartPlanner(), 400);
});

// ================================================================
//  SMART BUDGET PLANNER — redesigned with user-entered amounts
// ================================================================

// Category definitions
// essential: must enter actual amount (rent, EMI, etc.)
// mustAsk:   strongly encouraged to enter (food, utilities)
// optional:  we suggest a number but user can override
const PLANNER_CATS = [
  { key:'rent',          icon:'🏠', label:'Rent / Housing',  type:'essential', hint:'Your exact monthly rent or home loan EMI',   suggestPct:0 },
  { key:'emi',           icon:'🏦', label:'EMI / Loan',       type:'essential', hint:'Any existing loan EMI you pay each month',    suggestPct:0 },
  { key:'insurance',     icon:'🛡️', label:'Insurance',        type:'essential', hint:'Total monthly insurance premiums',            suggestPct:0 },
  { key:'utilities',     icon:'💡', label:'Utilities',         type:'mustAsk',   hint:'Electricity, water, internet, gas combined',  suggestPct:0.05 },
  { key:'food',          icon:'🍔', label:'Food & Dining',     type:'mustAsk',   hint:'Groceries + eating out + food delivery',      suggestPct:0.18 },
  { key:'transport',     icon:'🚗', label:'Transport',         type:'mustAsk',   hint:'Petrol, auto, cab, metro monthly average',    suggestPct:0.08 },
  { key:'health',        icon:'🏥', label:'Healthcare',        type:'mustAsk',   hint:'Medicines, doctor visits, gym — monthly avg', suggestPct:0.05 },
  { key:'education',     icon:'📚', label:'Education / Fees',  type:'mustAsk',   hint:'Tuition, courses, books — enter monthly (e.g. annual fee ÷ 12)', suggestPct:0 },
  { key:'shopping',      icon:'🛒', label:'Shopping',          type:'optional',  hint:'Clothes, household items, etc.',              suggestPct:0.08 },
  { key:'entertainment', icon:'🎬', label:'Entertainment',     type:'optional',  hint:'Movies, events, outings',                     suggestPct:0.05 },
  { key:'subscriptions', icon:'📺', label:'Subscriptions',     type:'optional',  hint:'Netflix, Spotify, apps, etc.',                suggestPct:0.03 },
  { key:'personal',      icon:'💅', label:'Personal Care',     type:'optional',  hint:'Salon, grooming, self-care',                  suggestPct:0.03 },
];

// State
let plannerSelectedCats = []; // array of { key, userAmount (null = suggest) }
let generatedPlan = [];

// ---- Step indicator ----
function setStepIndicator(step) {
  const colors = ['var(--border)', 'var(--border)', 'var(--border)'];
  for (let i = 0; i < step; i++) colors[i] = 'var(--primary)';
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`stepDot${i}`);
    if (el) el.style.background = colors[i - 1];
  }
}

function openSmartPlanner() {
  const saved = loadData('salary', 0);
  if (saved > 0) document.getElementById('plannerSalary').value = saved;
  goToPlannerStep1();
  openModal('smartPlannerModal');
}

function goToPlannerStep1() {
  document.getElementById('plannerStep1').style.display = 'block';
  document.getElementById('plannerStep2').style.display = 'none';
  document.getElementById('plannerStep3').style.display = 'none';
  setStepIndicator(1);
}

function goToPlannerStep2() {
  const salary = parseFloat(document.getElementById('plannerSalary').value);
  if (!salary || salary < 1000) {
    showToast('Please enter a valid monthly salary (min ₹1,000)', 'warning');
    return;
  }
  const goalType = document.getElementById('plannerGoalType').value;
  if (goalType === 'custom') {
    const cp = parseInt(document.getElementById('plannerCustomSaving').value);
    if (!cp || cp < 5 || cp > 70) {
      showToast('Enter a savings % between 5 and 70', 'warning');
      return;
    }
  }

  renderCatAmountForm(salary);
  document.getElementById('plannerStep1').style.display = 'none';
  document.getElementById('plannerStep2').style.display = 'block';
  document.getElementById('plannerStep3').style.display = 'none';
  setStepIndicator(2);
}

function renderCatAmountForm(salary) {
  const container = document.getElementById('plannerCatAmounts');

  // Section labels
  const sections = [
    { title: '🔒 Fixed Essentials', subtitle: 'Enter your exact monthly amounts — we never guess these.', types: ['essential'] },
    { title: '📊 Variable Essentials', subtitle: 'Enter your average or leave blank — we\'ll suggest based on your salary.', types: ['mustAsk'] },
    { title: '💡 Optional Spending', subtitle: 'These are flexible. Leave blank and we\'ll suggest a reasonable amount.', types: ['optional'] },
  ];

  let html = '';
  sections.forEach(sec => {
    const cats = PLANNER_CATS.filter(c => sec.types.includes(c.type));
    html += `
      <div style="font-size:0.78rem;font-weight:700;color:var(--cream);text-transform:uppercase;letter-spacing:0.8px;margin-top:6px;margin-bottom:4px">${sec.title}</div>
      <div style="font-size:0.74rem;color:var(--text-muted);margin-bottom:10px">${sec.subtitle}</div>
    `;
    cats.forEach(c => {
      const suggest = c.suggestPct > 0 ? Math.round(salary * c.suggestPct / 100) * 100 : null;
      const prevSelected = plannerSelectedCats.find(s => s.key === c.key);
      const checked = prevSelected ? 'checked' : '';
      const prevVal  = prevSelected?.userAmount ?? '';

      html += `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--card-light);border:1.5px solid var(--border);border-radius:var(--radius-sm);transition:var(--transition)" id="planRow_${c.key}">
          <input type="checkbox" id="planCheck_${c.key}" ${checked}
            style="margin-top:3px;width:16px;height:16px;accent-color:var(--primary);flex-shrink:0;cursor:pointer"
            onchange="togglePlannerRow('${c.key}', ${c.type === 'essential' ? 'true' : 'false'})"/>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="font-size:1.1rem">${c.icon}</span>
              <span style="font-size:0.88rem;font-weight:600;color:var(--cream)">${c.label}</span>
              ${c.type === 'essential' ? '<span style="font-size:0.65rem;background:rgba(240,160,160,0.18);color:#F0A0A0;padding:1px 6px;border-radius:50px;font-weight:700">Required</span>' : ''}
              ${c.type === 'optional'  ? '<span style="font-size:0.65rem;background:rgba(240,188,120,0.18);color:#F0BC78;padding:1px 6px;border-radius:50px;font-weight:700">Optional</span>' : ''}
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px">${c.hint}</div>
            <div id="planAmountWrap_${c.key}" style="display:${prevSelected ? 'flex' : 'none'};align-items:center;gap:8px">
              <span style="font-size:0.85rem;color:var(--text-muted)">₹</span>
              <input type="number" id="planAmt_${c.key}" value="${prevVal}"
                placeholder="${suggest ? 'Leave blank — suggest ₹' + suggest.toLocaleString('en-IN') : 'Enter your monthly amount'}"
                min="0"
                style="flex:1;padding:7px 10px;background:var(--card-light);border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem;color:var(--cream);outline:none"
                onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"/>
              ${suggest ? `<span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap">Suggested: ₹${suggest.toLocaleString('en-IN')}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = html;

  // Restore previously checked state
  plannerSelectedCats.forEach(s => {
    const chk = document.getElementById(`planCheck_${s.key}`);
    if (chk) chk.checked = true;
    const wrap = document.getElementById(`planAmountWrap_${s.key}`);
    if (wrap) wrap.style.display = 'flex';
  });
}

function togglePlannerRow(key, isEssential) {
  const chk  = document.getElementById(`planCheck_${key}`);
  const wrap = document.getElementById(`planAmountWrap_${key}`);
  if (!chk || !wrap) return;

  if (chk.checked) {
    wrap.style.display = 'flex';
    const row = document.getElementById(`planRow_${key}`);
    if (row) row.style.borderColor = 'var(--primary)';
  } else {
    wrap.style.display = 'none';
    const row = document.getElementById(`planRow_${key}`);
    if (row) row.style.borderColor = 'var(--border)';
    const amtInput = document.getElementById(`planAmt_${key}`);
    if (amtInput) amtInput.value = '';
  }
}

function goToPlannerStep3() {
  // Collect selected categories + their entered amounts
  plannerSelectedCats = [];
  PLANNER_CATS.forEach(c => {
    const chk = document.getElementById(`planCheck_${c.key}`);
    if (chk && chk.checked) {
      const amtEl = document.getElementById(`planAmt_${c.key}`);
      const val   = amtEl ? parseFloat(amtEl.value) : NaN;
      plannerSelectedCats.push({
        key:        c.key,
        userAmount: isNaN(val) || val <= 0 ? null : val, // null = use suggestion
      });
    }
  });

  if (plannerSelectedCats.length === 0) {
    showToast('Select at least one spending category', 'warning');
    return;
  }

  // Essential categories must have an amount
  const missingEssential = plannerSelectedCats.filter(s => {
    const cat = PLANNER_CATS.find(c => c.key === s.key);
    return cat && cat.type === 'essential' && s.userAmount === null;
  });
  if (missingEssential.length > 0) {
    const names = missingEssential.map(s => PLANNER_CATS.find(c => c.key === s.key)?.label).join(', ');
    showToast(`Please enter the amount for: ${names}`, 'warning', 4000);
    return;
  }

  buildGeneratedPlan();
  renderPlanPreview();

  document.getElementById('plannerStep1').style.display = 'none';
  document.getElementById('plannerStep2').style.display = 'none';
  document.getElementById('plannerStep3').style.display = 'block';
  setStepIndicator(3);
}

function getSavingsPct() {
  const goalType = document.getElementById('plannerGoalType').value;
  switch(goalType) {
    case 'conservative': return 0.20;
    case 'moderate':     return 0.30;
    case 'aggressive':   return 0.40;
    case 'custom':       return (parseInt(document.getElementById('plannerCustomSaving').value) || 20) / 100;
    default:             return 0.20;
  }
}

function buildGeneratedPlan() {
  const salary      = parseFloat(document.getElementById('plannerSalary').value);
  const savingsPct  = getSavingsPct();
  const spendable   = salary * (1 - savingsPct);

  // Sum up user-entered amounts
  let userEnteredTotal = 0;
  plannerSelectedCats.forEach(s => {
    if (s.userAmount !== null) userEnteredTotal += s.userAmount;
  });

  // Budget left to distribute among "suggest" categories
  const suggestBudget   = Math.max(0, spendable - userEnteredTotal);
  const suggestCats     = plannerSelectedCats.filter(s => s.userAmount === null);
  const totalSuggestPct = suggestCats.reduce((sum, s) => {
    const cat = PLANNER_CATS.find(c => c.key === s.key);
    return sum + (cat?.suggestPct || 0.05);
  }, 0);

  generatedPlan = plannerSelectedCats.map(s => {
    const cat = PLANNER_CATS.find(c => c.key === s.key);
    let limit, isUserSet;

    if (s.userAmount !== null) {
      limit      = s.userAmount;
      isUserSet  = true;
    } else {
      // Proportional share of remaining suggest budget
      const weight = (cat?.suggestPct || 0.05) / (totalSuggestPct || 1);
      limit     = Math.max(100, Math.round((suggestBudget * weight) / 100) * 100);
      isUserSet = false;
    }

    return {
      key:       s.key,
      icon:      cat?.icon || '📦',
      label:     cat?.label || s.key,
      limit,
      threshold: 80,
      isUserSet,
    };
  });
}

function renderPlanPreview() {
  const salary     = parseFloat(document.getElementById('plannerSalary').value);
  const savingsPct = getSavingsPct();
  const savingsAmt = Math.round(salary * savingsPct);
  const spendable  = salary - savingsAmt;
  const totalAllocated = generatedPlan.reduce((s, b) => s + b.limit, 0);
  const unallocated    = spendable - totalAllocated;

  // Plan rows — colour-coded: teal border = user-set, yellow = suggested
  document.getElementById('plannerPreviewList').innerHTML = generatedPlan.map(b => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
      background:var(--card-light);
      border-left:4px solid ${b.isUserSet ? 'var(--primary)' : 'var(--warning)'};
      border-top:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);
      border-radius:0 var(--radius-sm) var(--radius-sm) 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.2rem">${b.icon}</span>
        <div>
          <div style="font-size:0.85rem;font-weight:600">${b.label}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">
            ${b.isUserSet
              ? '<i class="fas fa-user" style="margin-right:3px"></i>You entered this'
              : '<i class="fas fa-magic" style="margin-right:3px"></i>Our suggestion'}
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1rem;font-weight:700;color:${b.isUserSet ? 'var(--primary-dark)' : 'var(--warning)'}">
          ${formatCurrency(b.limit)}<span style="font-size:0.7rem;color:var(--text-muted)">/mo</span>
        </div>
      </div>
    </div>
  `).join('');

  // Summary box
  const overBudget = unallocated < 0;
  document.getElementById('plannerSavingsSummary').innerHTML = `
    <div style="background:${overBudget ? 'rgba(239,68,68,0.08)' : 'rgba(13,148,136,0.08)'};border:1px solid ${overBudget ? 'rgba(239,68,68,0.28)' : 'rgba(13,148,136,0.28)'};border-radius:var(--radius-sm);padding:12px 14px;font-size:0.82rem">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span>💰 Savings this month</span>
        <strong style="color:var(--success)">${formatCurrency(savingsAmt)} (${Math.round(savingsPct*100)}%)</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span>📊 Total budgeted</span>
        <strong>${formatCurrency(totalAllocated)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span>${overBudget ? '⚠️ Over-allocated by' : '✅ Unallocated buffer'}</span>
        <strong style="color:${overBudget ? 'var(--danger)' : 'var(--primary)'}">
          ${formatCurrency(Math.abs(unallocated))}
        </strong>
      </div>
      ${overBudget ? `<div style="margin-top:8px;font-size:0.75rem;color:var(--danger)">⚠️ Your planned spending exceeds the amount available after savings. Consider reducing some categories or lowering your savings target.</div>` : ''}
    </div>
  `;
}

function applyPlannerBudget() {
  if (generatedPlan.length === 0) return;
  const salary = parseFloat(document.getElementById('plannerSalary').value);
  saveData('salary', salary);
  let nextId = 1;
  const budgets = generatedPlan.map(b => ({
    id: nextId++, category: b.key, limit: b.limit, threshold: b.threshold, customLabel: null,
  }));
  saveData('budgets', budgets);
  saveData('nextBudgetId', nextId);
  const salaryInput = document.getElementById('salaryInput');
  if (salaryInput) salaryInput.value = salary;
  closeModal('smartPlannerModal');
  loadBudgets();
  showToast(`✨ Budget plan applied! ${budgets.length} categories set up.`, 'success', 4000);
}

// Toggle custom savings input visibility + step indicator wiring
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('plannerGoalType');
  if (sel) {
    sel.addEventListener('change', () => {
      const grp = document.getElementById('plannerCustomSavingGroup');
      if (grp) grp.style.display = sel.value === 'custom' ? 'block' : 'none';
    });
  }
});