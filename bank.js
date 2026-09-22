/* ============================================
   SPENDSENSE - Bank & Pay Logic
   - No Razorpay
   - All transactions from real user data
   - Dynamic Pay From dropdown from linked accounts
   - Dynamic bank filter
   - 16 preset banks + custom "Other Bank" entry
============================================ */

let selectedBankCode  = '';
let selectedBankName  = '';
let selectedBankColor = '#6C63FF';
let lastPaymentData   = null;

// ---- TABS ----
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).style.display = 'block';
  btn.classList.add('active');
}

// ---- COLOUR HELPER ----
function darken(hex) {
  if (!hex || hex.length < 7) return '#333';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 40);
  const g = Math.max(0, ((n >> 8)  & 0xff) - 40);
  const b = Math.max(0, (n & 0xff) - 40);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---- UTILITY ----
function setElText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ================================================================
//  LINKED ACCOUNTS
// ================================================================
function renderBankCards() {
  const container = document.getElementById('bankCardsList');
  if (!container) return;

  const accounts = loadData('bankAccounts', []);
  setElText('linkedCount', accounts.length);
  const totalBal = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  setElText('totalBankBalance', formatCurrency(totalBal));

  if (accounts.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column:1/-1">
        <div class="empty-state">
          <div class="empty-icon">🏦</div>
          <h3>No accounts linked yet</h3>
          <p>Link your bank account to track balances and make payments.</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="openModal('linkBankModal')">
            <i class="fas fa-link"></i> Link Bank Account
          </button>
        </div>
      </div>`;
    populatePayFromDropdown([]);
    return;
  }

  container.innerHTML = accounts.map(a => `
    <div>
      <div class="bank-card" style="background:linear-gradient(135deg,${a.color || '#4A42CC'},${darken(a.color || '#4A42CC')})">
        <div>
          <div class="bank-card-bank">${a.bankFull}</div>
          <div class="bank-card-number">${a.accNumber}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <div style="font-size:0.7rem;opacity:0.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Balance</div>
            <div class="bank-card-balance">${formatCurrency(a.balance || 0)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.7rem;opacity:0.7;margin-bottom:4px">${a.accType} Account</div>
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button onclick="syncAccount(${a.id})" style="background:rgba(255,255,255,0.2);border:none;border-radius:6px;padding:6px 10px;color:white;cursor:pointer;font-size:0.75rem">
                <i class="fas fa-edit"></i> Update Balance
              </button>
              <button onclick="unlinkAccount(${a.id})" style="background:rgba(255,71,87,0.3);border:none;border-radius:6px;padding:6px 10px;color:white;cursor:pointer;font-size:0.75rem">
                <i class="fas fa-unlink"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:10px;padding:10px 14px;background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;font-size:0.8rem">
        <span style="color:var(--text-muted)"><i class="fas fa-clock" style="margin-right:4px"></i> Last synced: Just now</span>
        <span style="color:var(--accent)"><i class="fas fa-check-circle" style="margin-right:4px"></i> Active</span>
      </div>
    </div>`).join('');

  populatePayFromDropdown(accounts);
  populateBankFilter(accounts);
}

// ---- POPULATE PAY FROM DROPDOWN ----
function populatePayFromDropdown(accounts) {
  const sel = document.getElementById('payFromAccount');
  if (!sel) return;
  if (accounts.length === 0) {
    sel.innerHTML = '<option value="">— No accounts linked —</option>';
    return;
  }
  sel.innerHTML = accounts.map(a =>
    `<option value="${a.id}">${a.bankFull} (${a.accNumber}) — ${formatCurrency(a.balance || 0)}</option>`
  ).join('');
}

// ---- POPULATE BANK FILTER IN TRANSACTIONS TAB ----
function populateBankFilter(accounts) {
  const sel = document.getElementById('bankFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="">All Accounts</option>' +
    accounts.map(a => `<option value="${a.id}">${a.bankFull} (${a.accNumber})</option>`).join('');
}

// ================================================================
//  BANK TRANSACTIONS — from real user payment data
// ================================================================
function renderBankTransactions(filterAccId = '') {
  const tbody = document.getElementById('bankTxBody');
  if (!tbody) return;

  // Pull actual payments made by user
  const payments  = loadData('payments', []);
  const accounts  = loadData('bankAccounts', []);

  // Build rows from payments (debit) + salary credits
  const salary    = loadData('salary', 0);
  const rows      = [];

  // Salary credit entries (one per month present in expenses)
  if (salary > 0 && accounts.length > 0) {
    const primaryAcc = accounts[0];
    const now = new Date();
    rows.push({
      desc:    'Salary Credit',
      bank:    primaryAcc.bankFull,
      accId:   primaryAcc.id,
      date:    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,
      type:    'credit',
      amount:  salary,
    });
  }

  // Payment records as debits
  payments.forEach(p => {
    // Determine which account was used
    const accId  = parseInt(p.fromAccountId) || (accounts[0] ? accounts[0].id : 0);
    const acc    = accounts.find(a => a.id === accId);
    rows.push({
      desc:  p.description,
      bank:  acc ? acc.bankFull : 'SpendSense',
      accId: accId,
      date:  p.date,
      type:  'debit',
      amount: p.amount,
    });
  });

  // Also list expense entries as debits (user-added expenses)
  const expenses = loadData('expenses', []);
  expenses.slice(0, 10).forEach(e => {
    if (payments.some(p => p.description === e.name && p.amount === e.amount && p.date === e.date)) return; // don't duplicate
    const acc = accounts[0];
    rows.push({
      desc:  e.name,
      bank:  acc ? acc.bankFull : 'Bank',
      accId: acc ? acc.id : 0,
      date:  e.date,
      type:  'debit',
      amount: e.amount,
    });
  });

  // Sort newest first
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter by account if selected
  const filtered = filterAccId ? rows.filter(r => String(r.accId) === String(filterAccId)) : rows;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px">No transactions yet. Add expenses or link a bank account.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 20).map(t => `
    <tr>
      <td style="font-weight:500">${t.desc}</td>
      <td><span class="badge badge-primary" style="font-size:0.7rem">${t.bank}</span></td>
      <td style="color:var(--text-muted);font-size:0.8rem">${formatDate(t.date)}</td>
      <td><span class="badge ${t.type==='credit'?'badge-success':'badge-danger'}">${t.type==='credit'?'↑ Credit':'↓ Debit'}</span></td>
      <td style="font-weight:700;color:${t.type==='credit'?'var(--success)':'var(--danger)'}">
        ${t.type==='credit'?'+':'-'}${formatCurrency(t.amount)}
      </td>
    </tr>`).join('');
}

function filterBankTx() {
  renderBankTransactions(document.getElementById('bankFilter')?.value || '');
}

// ---- SYNC ----
function syncAccount(id) {
  const accounts = loadData('bankAccounts', []);
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;

  const newBalance = parseFloat(prompt(`Update balance for ${acc.bankFull} (${acc.accNumber}):\nEnter your current balance (₹):`, acc.balance || 0));
  if (isNaN(newBalance) || newBalance < 0) { showToast('Invalid balance entered.', 'warning'); return; }

  acc.balance = newBalance;
  saveData('bankAccounts', accounts);
  renderBankCards();
  renderBankTransactions();
  showToast('Balance updated!', 'success');
}

function syncAllAccounts() {
  showToast('Syncing all accounts…', 'info', 1500);
  setTimeout(() => {
    showToast('All accounts synced!', 'success');
    renderBankCards();
    renderBankTransactions();
  }, 2000);
}

// ---- UNLINK ----
function unlinkAccount(id) {
  if (!confirm('Unlink this account?')) return;
  const accounts = loadData('bankAccounts', []).filter(a => a.id !== id);
  saveData('bankAccounts', accounts);
  renderBankCards();
  renderBankTransactions();
  showToast('Account unlinked.', 'info');
}

// ================================================================
//  LINK BANK
// ================================================================
// IFSC prefix map — first 4 chars of IFSC are the bank code
const IFSC_PREFIXES = {
  HDFC:   'HDFC0',
  SBI:    'SBIN0',
  ICICI:  'ICIC0',
  AXIS:   'UTIB0',
  KOTAK:  'KKBK0',
  PNB:    'PUNB0',
  BOB:    'BARB0',
  OTHER:  'ABCD0',
};

function selectBank(code, name, color) {
  selectedBankCode  = code;
  selectedBankName  = name;
  selectedBankColor = color || '#6C63FF';

  // Show/hide custom bank name field
  const customWrap = document.getElementById('customBankNameWrap');
  if (customWrap) customWrap.style.display = code === 'OTHER' ? 'block' : 'none';

  // Update IFSC placeholder to match selected bank
  const ifscInput = document.getElementById('linkIfsc');
  if (ifscInput) {
    const prefix = IFSC_PREFIXES[code] || code.substring(0, 4).toUpperCase() + '0';
    ifscInput.placeholder = prefix + '001234';
  }

  document.getElementById('bankPickerGrid').style.display = 'none';
  document.getElementById('linkBankForm').style.display = 'block';
  document.getElementById('selectedBankDisplay').innerHTML = `
    <div style="width:36px;height:36px;border-radius:8px;background:${selectedBankColor};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${code === 'OTHER' ? '1.3rem' : '1rem'};flex-shrink:0">
      ${code === 'OTHER' ? '🏦' : name.charAt(0)}
    </div>
    <span style="font-weight:600">${code === 'OTHER' ? 'Custom Bank' : name}</span>
  `;
}

function showBankPicker() {
  document.getElementById('bankPickerGrid').style.display = 'grid';
  document.getElementById('linkBankForm').style.display   = 'none';
  const customWrap = document.getElementById('customBankNameWrap');
  if (customWrap) customWrap.style.display = 'none';
  selectedBankCode = '';
  selectedBankName = '';
}

function linkBankAccount(e) {
  e.preventDefault();

  // If "Other" bank, get custom name
  let finalBankName = selectedBankName;
  if (selectedBankCode === 'OTHER') {
    finalBankName = (document.getElementById('customBankName')?.value || '').trim();
    if (!finalBankName) { showToast('Please enter your bank name.', 'warning'); return; }
  }

  const accNum  = document.getElementById('linkAccNum').value.trim();
  const accType = document.getElementById('linkAccType').value;
  const ifsc    = document.getElementById('linkIfsc').value.trim();
  const mobile  = document.getElementById('linkMobile').value.trim();
  const balance = parseFloat(document.getElementById('linkBalance').value);

  if (!accNum || !ifsc || !mobile) { showToast('Please fill in all required fields.', 'warning'); return; }
  if (isNaN(balance) || balance < 0) { showToast('Please enter a valid balance amount.', 'warning'); return; }
  if (!/^\d{10}$/.test(mobile))    { showToast('Enter a valid 10-digit mobile number.', 'warning'); return; }

  showToast('Linking your account…', 'info', 2000);

  setTimeout(() => {
    const accounts = loadData('bankAccounts', []);
    let nextId = loadData('nextBankId', 1);
    const last4 = accNum.slice(-4).padStart(4, '*');

    accounts.push({
      id:       nextId++,
      bank:     selectedBankCode,
      bankFull: finalBankName,
      accType,
      accNumber: '****' + last4,
      balance,
      color:     selectedBankColor,
    });

    saveData('bankAccounts', accounts);
    saveData('nextBankId', nextId);
    closeModal('linkBankModal');
    showBankPicker();
    e.target.reset();
    if (document.getElementById('customBankName')) document.getElementById('customBankName').value = '';
    renderBankCards();
    renderBankTransactions();
    showToast(`${finalBankName} linked successfully! 🎉`, 'success');
  }, 2200);
}

// ================================================================
//  PAYMENT TYPE TOGGLE
// ================================================================
function togglePayType(type) {
  ['upiFields', 'bankFields', 'cardFields', 'billFields'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const map = { upi:'upiFields', bank:'bankFields', card:'cardFields', bill:'billFields' };
  const el = document.getElementById(map[type]);
  if (el) el.style.display = 'block';
}

// ================================================================
//  MAKE PAYMENT — purely internal, no Razorpay
// ================================================================
function makePayment(e) {
  e.preventDefault();
  const amount    = parseFloat(document.getElementById('payAmount').value);
  const remarks   = (document.getElementById('payRemarks').value || 'Payment').trim();
  const fromAccId = parseInt(document.getElementById('payFromAccount').value);
  const payType   = document.querySelector('input[name="payType"]:checked')?.value || 'upi';

  if (!amount || amount <= 0)  { showToast('Enter a valid amount.', 'warning');                return; }
  if (!fromAccId)              { showToast('Select a bank account to pay from.', 'warning');   return; }

  const accounts = loadData('bankAccounts', []);
  const acc = accounts.find(a => a.id === fromAccId);
  if (!acc) { showToast('Selected account not found.', 'danger'); return; }
  if ((acc.balance || 0) < amount) {
    showToast(`Insufficient balance! Available: ${formatCurrency(acc.balance || 0)}`, 'danger');
    return;
  }

  const btn = document.getElementById('payInternalBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…'; btn.disabled = true; }

  setTimeout(() => {
    if (btn) { btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pay Now'; btn.disabled = false; }

    // Deduct from account balance
    acc.balance -= amount;
    saveData('bankAccounts', accounts);

    // Save payment record
    const payments = loadData('payments', []);
    let nextId     = loadData('nextPaymentId', 1);
    const txnId    = 'SS' + Date.now().toString().slice(-8);
    const today    = new Date().toISOString().split('T')[0];

    const payRecord = {
      id:            nextId++,
      description:   remarks,
      type:          payType,
      amount,
      date:          today,
      method:        payType === 'upi' ? 'UPI' : payType === 'bank' ? 'Bank Transfer' : payType === 'card' ? 'Card' : 'Bill Pay',
      fromAccountId: fromAccId,
      fromBank:      acc.bankFull,
      txnId,
      status:        'success',
    };
    payments.unshift(payRecord);
    saveData('payments', payments);
    saveData('nextPaymentId', nextId);
    lastPaymentData = payRecord;

    // Log as expense
    const expenses = loadData('expenses', []);
    let nextExpId  = loadData('nextExpenseId', 1);
    expenses.push({
      id:       nextExpId++,
      name:     remarks,
      category: getBillCategory(payType, document.getElementById('billType')?.value),
      amount,
      date:     today,
      payment:  payRecord.method,
      notes:    `Paid via SpendSense · Txn: ${txnId}`,
    });
    saveData('expenses', expenses);
    saveData('nextExpenseId', nextExpId);

    // Show success modal
    document.getElementById('paySuccessMsg').textContent =
      `${formatCurrency(amount)} paid successfully for "${remarks}"`;
    document.getElementById('paySuccessDetails').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Amount</span><strong>${formatCurrency(amount)}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">From</span><strong>${acc.bankFull} (${acc.accNumber})</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Method</span><strong>${payRecord.method}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Date</span><strong>${formatDate(today)}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Transaction ID</span><strong>${txnId}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Status</span><span style="color:var(--success)"><i class="fas fa-check-circle"></i> Success</span></div>
      </div>`;
    openModal('paySuccessModal');

    renderRecentPayments();
    renderBankCards();
    renderBankTransactions();
    e.target.reset();
    togglePayType('upi'); // reset to UPI view
  }, 1600);
}

// Map bill type to expense category
function getBillCategory(payType, billType) {
  if (payType !== 'bill') return 'other';
  const map = { electricity:'utilities', water:'utilities', internet:'utilities', gas:'utilities', mobile:'subscriptions', emi:'emi', insurance:'insurance' };
  return map[billType] || 'utilities';
}

// ---- RECEIPT ----
function downloadReceipt() {
  if (!lastPaymentData) return;
  const content = [
    'SPENDSENSE PAYMENT RECEIPT',
    '='.repeat(36),
    `Date           : ${formatDate(lastPaymentData.date)}`,
    `Description    : ${lastPaymentData.description}`,
    `Amount         : ${formatCurrency(lastPaymentData.amount)}`,
    `From Account   : ${lastPaymentData.fromBank || 'N/A'}`,
    `Method         : ${lastPaymentData.method}`,
    `Transaction ID : ${lastPaymentData.txnId || 'SS' + lastPaymentData.id}`,
    `Status         : SUCCESS`,
    '='.repeat(36),
    'Thank you for using SpendSense!',
  ].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([content], { type:'text/plain' })),
    download: `receipt_${lastPaymentData.txnId || lastPaymentData.id}.txt`,
  });
  a.click();
}

// ================================================================
//  RECENT PAYMENTS — only real user payments
// ================================================================
function renderRecentPayments() {
  const container = document.getElementById('recentPaymentsList');
  if (!container) return;
  const payments = loadData('payments', []).slice(0, 6);

  if (payments.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-icon" style="font-size:2rem">💸</div><p style="font-size:0.82rem">No payments yet.</p></div>';
    return;
  }

  const methodIcons = { UPI:'📲', 'Bank Transfer':'🏦', Card:'💳', 'Bill Pay':'📄', Internal:'💻' };
  container.innerHTML = payments.map(p => `
    <div class="payment-item">
      <div class="payment-item-icon">${methodIcons[p.method] || '💸'}</div>
      <div style="flex:1">
        <div style="font-size:0.85rem;font-weight:600">${p.description}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${formatDate(p.date)} · ${p.method}${p.fromBank ? ' · ' + p.fromBank : ''}</div>
      </div>
      <div style="font-weight:700;color:var(--danger)">−${formatCurrency(p.amount)}</div>
    </div>`).join('');
}

// ================================================================
//  SAVED PAYEES
// ================================================================
function renderSavedPayees() {
  const container = document.getElementById('savedPayeesList');
  if (!container) return;
  const payees = loadData('payees', []);

  if (payees.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:12px">No saved payees yet. Pay someone to save them.</p>';
    return;
  }

  container.innerHTML = payees.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--card-light);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <div style="width:34px;height:34px;border-radius:50%;background:var(--gradient-1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0;color:white">
        ${p.name.charAt(0).toUpperCase()}
      </div>
      <div style="flex:1">
        <div style="font-size:0.85rem;font-weight:600">${p.name}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${p.upi}</div>
      </div>
      <button onclick="quickPay('${p.name}','${p.upi}')" style="background:rgba(67,233,123,0.15);color:var(--accent);border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.75rem;font-weight:600">
        Pay
      </button>
    </div>`).join('');
}

function quickPay(name, upi) {
  switchTab('payments', document.querySelectorAll('.tab-btn')[1]);
  const upiInput = document.getElementById('upiId');
  if (upiInput) upiInput.value = upi;
  const upiRadio = document.querySelector('input[value="upi"]');
  if (upiRadio) upiRadio.checked = true;
  togglePayType('upi');
  const rem = document.getElementById('payRemarks');
  if (rem) rem.value = `Payment to ${name}`;
  showToast(`Ready to pay ${name}`, 'info');
}

// ================================================================
//  REMINDERS
// ================================================================
function renderReminders() {
  const container = document.getElementById('remindersList');
  const upcoming  = document.getElementById('upcomingList');
  if (!container) return;

  const reminders = loadData('reminders', []);

  if (reminders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px">
        <div class="empty-icon">⏰</div>
        <h3>No reminders yet</h3>
        <p>Add payment reminders to never miss a due date.</p>
      </div>`;
    if (upcoming) upcoming.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">No upcoming payments.</p>';
    return;
  }

  const sorted = [...reminders].sort((a, b) => new Date(a.date) - new Date(b.date));

  container.innerHTML = sorted.map(r => {
    const days = daysUntil(r.date);
    const cat  = getCategoryInfo(r.category);
    let urgency, urgencyColor;
    if (r.paid)        { urgency = 'Paid ✓';   urgencyColor = 'var(--success)'; }
    else if (days < 0) { urgency = 'Overdue';  urgencyColor = 'var(--danger)'; }
    else if (days <=3) { urgency = 'Due Soon'; urgencyColor = 'var(--warning)'; }
    else               { urgency = `${days}d left`; urgencyColor = 'var(--text-muted)'; }

    return `
      <div class="reminder-item">
        <div class="reminder-icon ${cat.colorClass}">${cat.icon}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.88rem">${r.title}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${formatDate(r.date)} · ${r.recurrence}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:0.9rem">${formatCurrency(r.amount)}</div>
          <div style="font-size:0.72rem;color:${urgencyColor};font-weight:600">${urgency}</div>
        </div>
        <div style="display:flex;gap:4px;margin-left:8px">
          ${!r.paid ? `<button onclick="payReminder(${r.id})" style="background:rgba(67,233,123,0.15);color:var(--accent);border:none;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:0.72rem" title="Pay Now"><i class="fas fa-check"></i></button>` : ''}
          <button onclick="deleteReminder(${r.id})" style="background:rgba(255,71,87,0.15);color:var(--danger);border:none;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:0.72rem" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  if (upcoming) {
    const next30 = sorted.filter(r => !r.paid && daysUntil(r.date) >= 0 && daysUntil(r.date) <= 30);
    upcoming.innerHTML = next30.length === 0
      ? '<p style="color:var(--text-muted);font-size:0.82rem">No upcoming payments in 30 days.</p>'
      : next30.map(r => {
          const d = daysUntil(r.date);
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--card-light);border:1px solid var(--border);border-radius:var(--radius-sm)">
              <div style="display:flex;gap:10px;align-items:center">
                <span style="font-size:1.1rem">${getCategoryInfo(r.category).icon}</span>
                <div>
                  <div style="font-size:0.85rem;font-weight:600">${r.title}</div>
                  <div style="font-size:0.72rem;color:var(--text-muted)">Due ${formatDate(r.date)}</div>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700">${formatCurrency(r.amount)}</div>
                <div style="font-size:0.72rem;color:${d<=3?'var(--warning)':'var(--text-muted)'}">${d===0?'Today':`${d} days`}</div>
              </div>
            </div>`;
        }).join('');
  }
}

function payReminder(id) {
  const reminders = loadData('reminders', []);
  const r = reminders.find(rem => rem.id === id);
  if (!r) return;
  r.paid = true;
  saveData('reminders', reminders);
  switchTab('payments', document.querySelectorAll('.tab-btn')[1]);
  const rem = document.getElementById('payRemarks');
  const amt = document.getElementById('payAmount');
  if (rem) rem.value = r.title;
  if (amt) amt.value = r.amount;
  showToast(`Ready to pay: ${r.title} — ${formatCurrency(r.amount)}`, 'info', 4000);
  renderReminders();
}

function deleteReminder(id) {
  if (!confirm('Delete this reminder?')) return;
  saveData('reminders', loadData('reminders', []).filter(r => r.id !== id));
  renderReminders();
  showToast('Reminder deleted.', 'info');
}

function addReminder(e) {
  e.preventDefault();
  const reminders = loadData('reminders', []);
  let nextId = loadData('nextReminderId', 1);
  reminders.push({
    id:         nextId++,
    title:      document.getElementById('remTitle').value.trim(),
    amount:     parseFloat(document.getElementById('remAmount').value),
    date:       document.getElementById('remDate').value,
    category:   document.getElementById('remCategory').value,
    recurrence: document.getElementById('remRecurrence').value,
    paid:       false,
  });
  saveData('reminders', reminders);
  saveData('nextReminderId', nextId);
  closeModal('addReminderModal');
  e.target.reset();
  renderReminders();
  showToast('Reminder added!', 'success');
}

// ================================================================
//  INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function () {
  const session = requireAuth();
  if (!session) return;
  initPageData();
  renderBankCards();
  renderBankTransactions();
  renderRecentPayments();
  renderSavedPayees();
  renderReminders();
});
