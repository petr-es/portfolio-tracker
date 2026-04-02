const REPO     = 'petr-es/portfolio-tracker';
const WORKFLOW = 'update-prices.yml';
const btn      = document.getElementById('update-btn');
const label    = document.getElementById('update-label');
let pollTimer  = null;

function setBtnState(state) {
  btn.className = state ? 'state-' + state : '';
  btn.disabled  = state === 'loading';
  const icon = document.getElementById('update-icon');
  if (state === 'loading') {
    label.textContent = LANG.btnUpdating;
  } else if (state === 'success') {
    icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    label.textContent = LANG.btnDone;
    setTimeout(() => setBtnState(null), 4000);
  } else {
    resetIcon();
    label.textContent = LANG.btnUpdate;
  }
}

function resetIcon() {
  document.getElementById('update-icon').innerHTML =
    '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>';
}

function showToast(message) {
  const existing = document.getElementById('update-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.innerHTML =
    `<span class="toast-msg">${message}</span>` +
    `<button class="toast-retry" onclick="dismissToast();triggerUpdate()">${LANG.toastRetry}</button>` +
    `<button class="toast-close" onclick="dismissToast()">×</button>`;
  document.body.appendChild(toast);
}

function dismissToast() {
  const t = document.getElementById('update-toast');
  if (t) t.remove();
}

async function applyFreshPrices() {
  const [pricesRes, historyRes] = await Promise.all([
    fetch(`scripts/prices.js?_=${Date.now()}`, { cache: 'no-store' }),
    fetch(`history.js?_=${Date.now()}`, { cache: 'no-store' }),
  ]);
  const pricesText  = await pricesRes.text();
  const historyText = await historyRes.text();
  window.PRICES        = new Function(pricesText  + '; return PRICES;')();
  window.PRICE_HISTORY = new Function(historyText + '; return PRICE_HISTORY;')();
  ['tbl-assets', 'tbl-brokers', 'tbl-prices'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
  ['donut-assets', 'donut-brokers'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
  render(window.PRICES, ASSETS);
  initHistorySelect();
}

async function pollLatestRun(triggeredAfter, token) {
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    setBtnState(null);
    showToast(LANG.toastUpdateFailed);
    return;
  }
  const { workflow_runs } = await res.json();
  const run = workflow_runs[0];
  if (!run || new Date(run.created_at) < triggeredAfter) {
    pollTimer = setTimeout(() => pollLatestRun(triggeredAfter, token), 3000);
    return;
  }
  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      try { await applyFreshPrices(); } catch (e) { console.error('applyFreshPrices:', e); }
      setBtnState('success');
    } else {
      setBtnState(null);
      showToast(LANG.toastUpdateFailed);
    }
  } else {
    pollTimer = setTimeout(() => pollLatestRun(triggeredAfter, token), 3000);
  }
}

function getToken() {
  let token = localStorage.getItem('gh_token');
  if (!token) {
    token = prompt('GitHub Personal Access Token (scope: workflow):\nUloží se pouze do localStorage tohoto prohlížeče.');
    if (!token) return null;
    localStorage.setItem('gh_token', token.trim());
  }
  return token;
}

async function triggerUpdate() {
  dismissToast();
  const token = getToken();
  if (!token) return;
  clearTimeout(pollTimer);
  setBtnState('loading');
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    }
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) localStorage.removeItem('gh_token');
    setBtnState(null);
    showToast(LANG.toastTokenError);
    return;
  }
  // Nastav triggeredAt až PO dispatch a odečti 5s buffer proti clock skew
  const triggeredAt = new Date(Date.now() - 5000);
  setTimeout(() => pollLatestRun(triggeredAt, token), 4000);
}
