/* ============================================
   SPENDSENSE - Expenses Page Logic
============================================ */

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let filteredExpenses = [];
let activeChipCategory = '';

// ---- CHARTS ----
function renderExpenseTrendChart() {
  const ctx = document.getElementById('expTrendChart');
  if (!ctx) return;
  const months = 6;
  const labels = [];
  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const now = new Date(); const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('en-IN', { month: 'short' }));
    const exps = loadData('expenses', []).filter(e => {
      const ed = new Date(e.date);
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
    });
    data.push(exps.reduce((s, e) => s + e.amount, 0));
  }
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total Spent',
        data,
        backgroundColor: 'rgba(108,99,255,0.6)',
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(108,99,255,0.9)',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + formatCurrency(c.raw) }, backgroundColor: '#1A1A2E', titleColor: '#fff', bodyColor: '#A7A9BE', borderColor: 'rgba(108,99,255,0.3)', borderWidth: 1 } },
      scales: { x: { grid: { display: false }, ticks: { color: '#A7A9BE', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE', font: { size: 11 }, callback: v => '₹' + (v/1000).toFixed(0) + 'K' } } }
    }
  });
}

function renderCategoryBarChart() {
  const ctx = document.getElementById('catBarChart');
  if (!ctx) return;
  const expenses = loadData('expenses', []).filter(e => {
    const d = new Date(e.date);
    const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totals = {};
  expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const CAT_COLORS = { food:'#FF6B6B', entertainment:'#8B85FF', shopping:'#FFB347', subscriptions:'#38F9D7', transport:'#43E97B', health:'#FF6584', utilities:'#9B8FF0', other:'#A7A9BE' };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => getCategoryInfo(k).icon + ' ' + getCategoryInfo(k).label),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: sorted.map(([k]) => CAT_COLORS[k] || '#A7A9BE'),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + formatCurrency(c.raw) }, backgroundColor: '#1A1A2E', titleColor: '#fff', bodyColor: '#A7A9BE', borderColor: 'rgba(108,99,255,0.3)', borderWidth: 1 } },
      scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE', font: { size: 10 }, callback: v => '₹' + (v/1000).toFixed(0) + 'K' } }, y: { grid: { display: false }, ticks: { color: '#A7A9BE', font: { size: 10 } } } }
    }
  });
}

// ---- RENDER TABLE ----
function renderTable() {
  const tbody = document.getElementById('expenseTableBody');
  const emptyState = document.getElementById('emptyExpenses');
  const tableWrap = document.getElementById('expenseTableWrap');

  if (!tbody) return;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredExpenses.slice(start, start + ITEMS_PER_PAGE);

  if (filteredExpenses.length === 0) {
    emptyState.style.display = 'block';
    tableWrap.style.display = 'none';
    document.getElementById('paginationInfo').textContent = '';
    document.getElementById('paginationBtns').innerHTML = '';
    renderSummaryStats(); // reset stat cards to ₹0
    return;
  }

  emptyState.style.display = 'none';
  tableWrap.style.display = 'block';

  const paymentIcons = { UPI: '📲', Card: '💳', Cash: '💵', NetBanking: '🖥️', Wallet: '👛' };

  tbody.innerHTML = pageItems.map(e => {
    const cat = getCategoryInfo(e.category);
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="expense-category-icon ${cat.colorClass}" style="width:32px;height:32px;font-size:0.9rem">${cat.icon}</span>
            <div>
              <div style="font-weight:600;font-size:0.875rem">${e.name}</div>
              ${e.notes ? `<div style="font-size:0.72rem;color:var(--text-muted)">${e.notes}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span class="badge badge-primary">${cat.label}</span></td>
        <td style="color:var(--text-muted);font-size:0.8rem">${formatDate(e.date)}</td>
        <td style="font-size:0.8rem">${paymentIcons[e.payment]||''} ${e.payment}</td>
        <td><span style="font-weight:700;color:var(--danger)">−${formatCurrency(e.amount)}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" style="padding:4px 10px;background:rgba(108,99,255,0.15);color:var(--primary-light);border:none;border-radius:6px;cursor:pointer" onclick="editExpense(${e.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm" style="padding:4px 10px;background:rgba(255,71,87,0.15);color:var(--danger);border:none;border-radius:6px;cursor:pointer" onclick="deleteExpense(${e.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination();
  renderSummaryStats();
}

function renderPagination() {
  const total = filteredExpenses.length;
  const pages = Math.ceil(total / ITEMS_PER_PAGE);
  const info = document.getElementById('paginationInfo');
  const btns = document.getElementById('paginationBtns');

  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, total);
  info.textContent = `Showing ${start}–${end} of ${total} transactions`;

  btns.innerHTML = '';
  if (pages <= 1) return;

  const addBtn = (label, page, disabled, active) => {
    const b = document.createElement('button');
    b.innerHTML = label;
    b.disabled = disabled;
    b.style.cssText = `padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:${active?'var(--primary)':'var(--card-light)'};color:${active?'white':'var(--text-muted)'};cursor:${disabled?'default':'pointer'};font-size:0.8rem;transition:var(--transition)`;
    if (!disabled) b.onclick = () => { currentPage = page; renderTable(); };
    btns.appendChild(b);
  };

  addBtn('<i class="fas fa-chevron-left"></i>', currentPage - 1, currentPage === 1, false);
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - currentPage) <= 1) {
      addBtn(p, p, false, p === currentPage);
    } else if (Math.abs(p - currentPage) === 2) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.cssText = 'padding:6px 8px;color:var(--text-muted);font-size:0.8rem';
      btns.appendChild(dots);
    }
  }
  addBtn('<i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage === pages, false);
}

function renderSummaryStats() {
  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const count = filteredExpenses.length;
  const avg = count > 0 ? Math.round(total / 30) : 0;

  // find top category
  const catTotals = {};
  filteredExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];

  setEl('totalThisMonth', formatCurrency(total));
  setEl('totalTxCount', count);
  setEl('avgDaily', formatCurrency(avg));
  if (topCat) {
    const cat = getCategoryInfo(topCat[0]);
    setEl('topCategoryAmount', formatCurrency(topCat[1]));
    const el = document.querySelector('.stat-card.orange .stat-label');
    if (el) el.textContent = 'Top: ' + cat.label;
  }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ---- FILTER ----
function filterExpenses() {
  const search = (document.getElementById('txSearch')?.value || '').toLowerCase();
  const cat    = document.getElementById('catFilter')?.value || activeChipCategory;
  const monthEl = document.getElementById('monthFilter');
  const month  = parseInt(monthEl?.value || (new Date().getMonth() + 1));

  const all = loadData('expenses', []);
  filteredExpenses = all.filter(e => {
    const d = new Date(e.date);
    const matchMonth  = d.getMonth() + 1 === month;
    const matchCat    = !cat || e.category === cat;
    const matchSearch = !search || e.name.toLowerCase().includes(search) || e.category.toLowerCase().includes(search);
    return matchMonth && matchCat && matchSearch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  currentPage = 1;
  renderTable();
}

function setChip(el, cat) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeChipCategory = cat;
  const catFilter = document.getElementById('catFilter');
  if (catFilter) catFilter.value = cat;
  filterExpenses();
}

// ---- BUDGET HINT (shown when category is selected in Add Expense modal) ----
function showBudgetHint(category) {
  const hint = document.getElementById('budgetHint');
  if (!hint) return;

  if (!category) { hint.innerHTML = ''; return; }

  const budgets  = loadData('budgets', []);
  const budget   = budgets.find(b => b.category === category);
  const hint_div = hint;

  if (!budget) {
    hint_div.innerHTML = `
      <div style="font-size:0.78rem;color:var(--text-muted);padding:6px 10px;background:rgba(252,241,208,0.06);border-radius:6px;border:1px solid rgba(252,241,208,0.10)">
        <i class="fas fa-info-circle" style="margin-right:5px"></i>No budget set for this category.
        <a href="budget.html" style="color:var(--secondary);margin-left:4px;text-decoration:underline">Set one →</a>
      </div>`;
    return;
  }

  // Calculate how much already spent this month in this category
  const now      = new Date();
  const expenses = loadData('expenses', []);
  const spent    = expenses
    .filter(e => {
      const d = new Date(e.date);
      return e.category === category &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  const remaining = budget.limit - spent;
  const pct       = Math.round((spent / budget.limit) * 100);
  const isOver    = remaining < 0;
  const barColor  = isOver ? '#F0A0A0' : pct >= budget.threshold ? '#F0BC78' : '#A8E6BF';
  const textColor = isOver ? '#F0A0A0' : pct >= budget.threshold ? '#F0BC78' : '#A8E6BF';

  hint_div.innerHTML = `
    <div style="padding:8px 12px;background:rgba(252,241,208,0.07);border:1px solid rgba(252,241,208,0.14);border-radius:6px;font-size:0.78rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="color:var(--text-muted)">
          <i class="fas fa-wallet" style="margin-right:4px"></i>Budget: <strong style="color:var(--cream)">${formatCurrency(budget.limit)}/mo</strong>
        </span>
        <span style="color:${textColor};font-weight:600">
          ${isOver
            ? `⚠️ ${formatCurrency(Math.abs(remaining))} over budget`
            : `${formatCurrency(remaining)} remaining`}
        </span>
      </div>
      <div style="background:rgba(252,241,208,0.10);border-radius:50px;height:5px;overflow:hidden">
        <div style="width:${Math.min(pct,100)}%;height:100%;background:${barColor};border-radius:50px;transition:width 0.5s ease"></div>
      </div>
      <div style="color:var(--text-muted);margin-top:4px">${formatCurrency(spent)} spent of ${formatCurrency(budget.limit)} (${pct}%)</div>
    </div>`;
}

// ---- ADD EXPENSE ----
async function addExpense(e) {
  e.preventDefault();

  const name     = document.getElementById('expName').value.trim();
  const amount   = parseFloat(document.getElementById('expAmount').value);
  const date     = document.getElementById('expDate').value;
  const category = document.getElementById('expCategory').value;
  const payment  = document.getElementById('expPayment').value;
  const notes    = document.getElementById('expNotes').value.trim();

  try {
    const newExp = await apiAddExpense({ name, amount, date, category, payment, notes });
    const expenses = loadData('expenses', []);
    expenses.unshift({ ...newExp, id: newExp._id });
    saveData('expenses', expenses);

    closeModal('addExpenseModal');
    e.target.reset();
    const hint = document.getElementById('budgetHint');
    if (hint) hint.innerHTML = '';
    filterExpenses();
    showToast(`Expense "${name}" added!`, 'success');
    checkBudgetAfterAdd(category, amount);
  } catch(err) {
    showToast(err.message || 'Could not add expense.', 'danger');
  }
}

function checkBudgetAfterAdd(category, amount) {
  const budgets  = loadData('budgets', []);
  const expenses = loadData('expenses', []).filter(ex => {
    const d = new Date(ex.date);
    const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && ex.category === category;
  });
  const total = expenses.reduce((s, ex) => s + ex.amount, 0);
  const budget = budgets.find(b => b.category === category);
  if (!budget) return;

  const pct = (total / budget.limit) * 100;
  if (pct > 100) {
    showToast(`🚨 You've exceeded your ${getCategoryInfo(category).label} budget!`, 'danger', 5000);
  } else if (pct === 100) {
    showToast(`✅ ${getCategoryInfo(category).label} budget fully used — ₹0 remaining.`, 'warning', 4000);
  } else if (pct >= budget.threshold) {
    showToast(`⚠️ ${getCategoryInfo(category).label} budget at ${Math.round(pct)}%! Consider reducing spend.`, 'warning', 5000);
  }
}

// ---- EDIT EXPENSE ----
function editExpense(id) {
  const expenses = loadData('expenses', []);
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  document.getElementById('editExpId').value     = exp.id;
  document.getElementById('editExpName').value   = exp.name;
  document.getElementById('editExpAmount').value = exp.amount;
  document.getElementById('editExpDate').value   = exp.date;
  document.getElementById('editExpCategory').value = exp.category;
  document.getElementById('editExpPayment').value  = exp.payment;

  openModal('editExpenseModal');
}

async function saveEditExpense(e) {
  e.preventDefault();
  const id = document.getElementById('editExpId').value;
  const data = {
    name:     document.getElementById('editExpName').value.trim(),
    amount:   parseFloat(document.getElementById('editExpAmount').value),
    date:     document.getElementById('editExpDate').value,
    category: document.getElementById('editExpCategory').value,
    payment:  document.getElementById('editExpPayment').value,
  };
  try {
    const updated = await apiUpdateExpense(id, data);
    const expenses = loadData('expenses', []);
    const idx = expenses.findIndex(ex => (ex._id || ex.id) === id);
    if (idx !== -1) expenses[idx] = { ...updated, id: updated._id };
    saveData('expenses', expenses);
    closeModal('editExpenseModal');
    filterExpenses();
    showToast('Expense updated!', 'success');
  } catch(err) {
    showToast(err.message || 'Could not update expense.', 'danger');
  }
}
  filterExpenses();
  showToast('Expense updated!', 'success');
}

// ---- DELETE EXPENSE ----
async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  try {
    await apiDeleteExpense(id);
    const expenses = loadData('expenses', []).filter(e => (e._id || e.id) !== id);
    saveData('expenses', expenses);
    filterExpenses();
    showToast('Expense deleted.', 'info');
  } catch(err) {
    showToast(err.message || 'Could not delete expense.', 'danger');
  }
}

// ---- EXPORT CSV ----
function exportCSV() {
  const rows = [['ID','Description','Category','Amount','Date','Payment','Notes']];
  filteredExpenses.forEach(e => {
    rows.push([e.id, e.name, getCategoryInfo(e.category).label, e.amount, e.date, e.payment, e.notes || '']);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spendsense_expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Expenses exported as CSV!', 'success');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async function () {
  const session = requireAuth();
  if (!session) return;
  applyUserGreeting();

  // Load all expenses + budgets from API into cache
  try {
    const [expenses, budgets] = await Promise.all([
      loadExpenses(),
      apiFetchBudgets(),
    ]);
    const norm = arr => arr.map(x => ({ ...x, id: x._id || x.id }));
    saveData('expenses', norm(expenses));
    saveData('budgets',  norm(budgets));
  } catch(err) {
    showToast('Could not load data. Is the server running?', 'danger', 5000);
  }

  // Populate month filter
  const monthFilter = document.getElementById('monthFilter');
  if (monthFilter) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    monthNames.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = name;
      if (i + 1 === currentMonth) opt.selected = true;
      monthFilter.appendChild(opt);
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('expDate');
  if (dateInput) dateInput.value = today;

  const params = new URLSearchParams(window.location.search);
  const searchQ = params.get('search');
  if (searchQ) {
    const txSearch = document.getElementById('txSearch');
    if (txSearch) txSearch.value = searchQ;
  }

  filterExpenses();
  renderExpenseTrendChart();
  renderCategoryBarChart();
});