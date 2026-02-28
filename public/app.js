// ═══════════════════════════════════════════════════════════════
// CLAW CAPITAL — Dashboard Frontend Logic
// Premium reactive UI with animated counters and global metrics
// ═══════════════════════════════════════════════════════════════

const API = '';

// ─── State ───
let state = {
  treasury: null,
  portfolio: null,
  transactions: null,
  moltbook: null,
  strategy: null,
  loading: false
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  setupEventListeners();
  setInterval(loadAllData, 12000);
});

// ─── Load All Data ───
async function loadAllData() {
  try {
    const [treasury, portfolio, transactions, moltbook, strategy] = await Promise.all([
      fetchAPI('/api/treasury'),
      fetchAPI('/api/portfolio'),
      fetchAPI('/api/transactions'),
      fetchAPI('/api/moltbook'),
      fetchAPI('/api/strategy')
    ]);

    state.treasury = treasury.data;
    state.portfolio = portfolio.data;
    state.transactions = transactions.data;
    state.moltbook = moltbook.data;
    state.strategy = strategy.data;

    renderTreasury();
    renderGlobalBar();
    renderPortfolio();
    renderTransactions();
    renderMoltbook();
    updateCycleCount();
  } catch (error) {
    console.error('Data load failed:', error);
  }
}

// ─── Fetch Helper ───
async function fetchAPI(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res.json();
}

// ─── Event Listeners ───
function setupEventListeners() {
  document.getElementById('evalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await evaluateProject();
  });

  document.getElementById('cycleBtn').addEventListener('click', async () => {
    await runCycle();
  });
}

// ─── Evaluate Project ───
async function evaluateProject() {
  const btn = document.getElementById('evalBtn');
  const name = document.getElementById('projectName').value.trim();
  const description = document.getElementById('projectDescription').value.trim();
  const category = document.getElementById('projectCategory').value;

  if (!name || !description) return;

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Analyzing with Gemini AI...';

  try {
    const result = await fetchAPI('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ project_name: name, description, category })
    });

    if (result.success) {
      renderEvalResult(result.data);
      const dec = result.data.evaluation.investment_decision;
      const icon = dec === 'invest' ? '🦅' : dec === 'conditional_invest' ? '⚡' : '🛡️';
      showToast(`${icon} ${name}: ${dec.replace('_', ' ').toUpperCase()} — Score: ${result.data.evaluation.overall_score}`,
        dec === 'reject' ? 'error' : 'success');
      loadAllData();
      // Clear form
      document.getElementById('projectName').value = '';
      document.getElementById('projectDescription').value = '';
    } else {
      showToast(`Evaluation failed: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '⚡ Evaluate & Deploy Capital';
}

// ─── Run Autonomous Cycle ───
async function runCycle() {
  const btn = document.getElementById('cycleBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Autonomous Scanning...';

  try {
    const result = await fetchAPI('/api/cycle', { method: 'POST' });

    if (result.success) {
      const d = result.data;
      const dec = d.evaluation.investment_decision;
      showToast(`🔄 Cycle #${d.cycle}: ${d.scanned_project} → ${dec.replace('_', ' ').toUpperCase()} (${d.evaluation.overall_score})`, 'info');
      loadAllData();
    } else {
      showToast(`Cycle failed: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`Cycle error: ${error.message}`, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔄 Run Autonomous Capital Cycle';
}

// ─── Render Global Metrics Bar ───
function renderGlobalBar() {
  if (!state.treasury || !state.portfolio || !state.strategy) return;

  setText('globalTreasury', `${fmtNum(state.treasury.total)} $SURGE`);
  setText('globalDeployed', `${fmtNum(state.treasury.invested)} $SURGE`);
  setText('globalUtil', `${state.treasury.utilization_pct || 0}%`);
  setText('globalInvestments', state.portfolio.total_investments || 0);
  setText('globalCycles', state.strategy.cycle_count || 0);
}

// ─── Render Treasury ───
function renderTreasury() {
  if (!state.treasury) return;
  const t = state.treasury;

  animateValue('treasuryTotal', t.total, '$SURGE');
  animateValue('treasuryAvailable', t.available, '$SURGE');
  animateValue('treasuryInvested', t.invested, '$SURGE');
  animateValue('treasuryUtil', t.utilization_pct || 0, '%');

  // Utilization bar
  const utilBar = document.getElementById('utilBar');
  if (utilBar) {
    const pct = t.utilization_pct || 0;
    utilBar.style.width = `${pct}%`;
    utilBar.style.background = pct > 60 ? 'var(--gradient-danger)' : 'var(--gradient-primary)';
  }
}

function animateValue(id, value, suffix) {
  const el = document.getElementById(id);
  if (!el) return;
  const formatted = typeof value === 'number' ? fmtNum(value) : value;
  el.innerHTML = `${formatted}<span class="stat-suffix">${suffix}</span>`;
}

// ─── Render Portfolio ───
function renderPortfolio() {
  if (!state.portfolio) return;
  const container = document.getElementById('portfolioTable');
  const badge = document.getElementById('portfolioCount');
  const investments = state.portfolio.investments || [];

  badge.textContent = `${investments.length} INVESTMENT${investments.length !== 1 ? 'S' : ''}`;

  if (investments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <div>No investments yet.<br>Evaluate a project to begin capital deployment.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="portfolio-table">
      <thead>
        <tr>
          <th>Project</th>
          <th>Category</th>
          <th>Score</th>
          <th>Amount</th>
          <th>Decision</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${investments.slice().reverse().map(inv => `
          <tr>
            <td style="font-weight:600;">${esc(inv.project_name)}</td>
            <td style="color:var(--text-tertiary);font-size:0.78rem;">${esc(inv.category || '—')}</td>
            <td class="score-cell ${getScoreClass(inv.overall_score)}">${inv.overall_score}</td>
            <td class="amount-cell">${fmtNum(inv.amount)} $SURGE</td>
            <td><span class="decision-badge decision-${inv.investment_decision === 'conditional_invest' ? 'conditional' : inv.investment_decision}">${inv.investment_decision.replace('_', ' ')}</span></td>
            <td style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.65rem;">${fmtTime(inv.timestamp)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ─── Render Transactions ───
function renderTransactions() {
  if (!state.transactions) return;
  const container = document.getElementById('txFeed');
  const badge = document.getElementById('txCount');
  const txs = state.transactions.transactions || [];

  badge.textContent = `${txs.length} TX${txs.length !== 1 ? 'S' : ''}`;

  if (txs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔗</div>
        <div>On-chain transactions will appear here.</div>
      </div>`;
    return;
  }

  container.innerHTML = txs.slice().reverse().slice(0, 20).map(tx => {
    const iconClass = tx.type === 'investment' ? (tx.decision === 'reject' ? 'reject' : 'invest') : tx.type === 'transfer' ? 'transfer' : 'token';
    const icon = tx.type === 'investment' ? (tx.decision === 'reject' ? '✗' : '✓') : tx.type === 'transfer' ? '→' : '◆';
    const amountClass = tx.decision === 'reject' || tx.status === 'rejected' ? 'negative' : 'positive';

    return `
      <div class="tx-item">
        <div class="tx-icon ${iconClass}">${icon}</div>
        <div class="tx-details">
          <div class="tx-type">${fmtTxType(tx)}${tx.project ? ` · ${esc(tx.project)}` : tx.recipient ? ` · ${esc(tx.recipient)}` : ''}</div>
          <div class="tx-hash">${tx.tx_hash || '—'}</div>
        </div>
        <div>
          <div class="tx-amount ${amountClass}">${tx.amount > 0 ? `${fmtNum(tx.amount)} $SURGE` : 'REJECTED'}</div>
          <div class="tx-time">${fmtTime(tx.timestamp)}</div>
        </div>
      </div>`;
  }).join('');
}

// ─── Render Moltbook ───
function renderMoltbook() {
  if (!state.moltbook) return;
  const container = document.getElementById('moltbookFeed');
  const badge = document.getElementById('moltbookCount');
  const posts = state.moltbook.posts || [];

  badge.textContent = `${posts.length} POST${posts.length !== 1 ? 'S' : ''}`;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <div>Moltbook posts will appear here<br>after capital actions.</div>
      </div>`;
    return;
  }

  container.innerHTML = posts.slice().reverse().slice(0, 15).map(post => `
    <div class="feed-item">
      <div class="feed-text">${esc(post.text)}</div>
      <div class="feed-meta">
        <span>${fmtTime(post.timestamp)}</span>
        ${post.score !== null && post.score !== undefined ? `<span>Score: ${post.score}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Render Evaluation Result ───
function renderEvalResult(data) {
  const container = document.getElementById('evalResult');
  const ev = data.evaluation;
  const decisionClass = ev.investment_decision === 'invest' ? 'score-high' : ev.investment_decision === 'conditional_invest' ? 'score-mid' : 'score-low';

  container.style.display = 'block';
  container.innerHTML = `
    <div class="eval-result">
      <div class="eval-header">
        <div>
          <div class="eval-project-name">${esc(ev.project_name)}</div>
          <span class="decision-badge decision-${ev.investment_decision === 'conditional_invest' ? 'conditional' : ev.investment_decision}" style="margin-top:6px;display:inline-flex;">
            ${ev.investment_decision.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div class="eval-score ${decisionClass}">${ev.overall_score}</div>
      </div>

      <div class="scores-grid">
        ${scoreItem('Autonomy', ev.autonomy_score)}
        ${scoreItem('Revenue', ev.revenue_potential)}
        ${scoreItem('Token Util', ev.token_utility_strength)}
        ${scoreItem('Moat', ev.competitive_moat)}
        ${scoreItem('Ecosystem', ev.ecosystem_alignment)}
        ${scoreItem('Execution', ev.execution_feasibility)}
        ${scoreItem('Risk', ev.risk_score, true)}
        ${scoreItem('Allocation', ev.allocation_percentage + '%', false, true)}
      </div>

      <div class="eval-thesis">${esc(ev.investment_thesis || ev.strategic_reasoning || '')}</div>

      ${data.transaction && data.transaction.tx_hash ? `
        <div style="margin-top:10px;font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);">
          TX: ${data.transaction.tx_hash}
        </div>
      ` : ''}
    </div>`;
}

function scoreItem(label, value, isRisk = false, isRaw = false) {
  let colorClass = '';
  if (isRaw) {
    colorClass = 'score-high';
  } else if (isRisk) {
    const v = parseFloat(value);
    colorClass = v >= 7 ? 'score-low' : v >= 4 ? 'score-mid' : 'score-high';
  } else {
    const v = parseFloat(value);
    colorClass = v >= 7 ? 'score-high' : v >= 5 ? 'score-mid' : 'score-low';
  }

  const barColor = isRisk
    ? (parseFloat(value) >= 7 ? 'var(--accent-red)' : parseFloat(value) >= 4 ? 'var(--accent-amber)' : 'var(--accent-primary)')
    : (parseFloat(value) >= 7 ? 'var(--accent-primary)' : parseFloat(value) >= 5 ? 'var(--accent-amber)' : 'var(--accent-red)');

  return `
    <div class="score-item">
      <div class="score-item-label">${label}</div>
      <div class="score-item-value ${colorClass}">${isRaw ? value : parseFloat(value).toFixed(1)}</div>
      ${!isRaw ? `
        <div class="score-bar">
          <div class="score-bar-fill" style="width:${Math.min(100, parseFloat(value) * 10)}%; background:${barColor};"></div>
        </div>
      ` : ''}
    </div>`;
}

// ─── Update Cycle Count ───
function updateCycleCount() {
  if (!state.strategy) return;
  document.getElementById('cycleCount').textContent = `CYCLES: ${state.strategy.cycle_count || 0}`;
}

// ─── Helpers ───
function getScoreClass(score) {
  if (score >= 7.5) return 'score-high';
  if (score >= 6.0) return 'score-mid';
  return 'score-low';
}

function fmtTxType(tx) {
  return { investment: 'Investment', transfer: 'Transfer', token_launch: 'Token Launch' }[tx.type] || tx.type;
}

function fmtNum(n) {
  return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
