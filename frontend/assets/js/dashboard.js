/**
 * VERIFAI — User Dashboard & Analytics Controller
 * Calculates verification statistics, updates visual distribution meters,
 * renders history tables with real-time filtering and audit modals.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

let currentFilter = 'ALL';
let currentSearch = '';

function initDashboard() {
  renderDashboardStats();
  renderScanTable();

  // Search input
  const searchInput = document.getElementById('historySearch');
  searchInput?.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    renderScanTable();
  });

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'ALL';
      renderScanTable();
    });
  });

  // Clear History
  const clearBtn = document.getElementById('clearHistoryBtn');
  clearBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your local verification history? This cannot be undone.')) {
      clearAllScans();
      renderDashboardStats();
      renderScanTable();
      showToast('Scan history cleared.', 'info');
    }
  });

  // Export History
  const exportBtn = document.getElementById('exportHistoryBtn');
  exportBtn?.addEventListener('click', () => {
    exportHistoryData();
  });
}

function renderDashboardStats() {
  const history = getScanHistory();
  const total = history.length;

  let realCount = 0;
  let fakeCount = 0;
  let warnCount = 0;
  let totalConfidence = 0;

  history.forEach(item => {
    if (item.verdict === 'REAL') realCount++;
    else if (item.verdict === 'FAKE') fakeCount++;
    else warnCount++;
    totalConfidence += Number(item.confidence || 0);
  });

  const avgConfidence = total > 0 ? (totalConfidence / total).toFixed(1) : '0.0';
  const realPct = total > 0 ? Math.round((realCount / total) * 100) : 0;
  const fakePct = total > 0 ? Math.round((fakeCount / total) * 100) : 0;
  const warnPct = total > 0 ? Math.round((warnCount / total) * 100) : 0;

  // Update Metric Cards
  const totalEl = document.getElementById('metricTotalScans');
  const realEl = document.getElementById('metricRealScans');
  const fakeEl = document.getElementById('metricFakeScans');
  const confEl = document.getElementById('metricAvgConfidence');

  if (totalEl) totalEl.textContent = total;
  if (realEl) realEl.textContent = realCount;
  if (fakeEl) fakeEl.textContent = fakeCount;
  if (confEl) confEl.textContent = `${avgConfidence}%`;

  // Update Distribution Bar
  const realSegment = document.getElementById('distRealSegment');
  const fakeSegment = document.getElementById('distFakeSegment');
  const warnSegment = document.getElementById('distWarnSegment');

  if (realSegment) realSegment.style.width = `${realPct}%`;
  if (fakeSegment) fakeSegment.style.width = `${fakePct}%`;
  if (warnSegment) warnSegment.style.width = `${warnPct}%`;

  // Update Legend Values
  const legReal = document.getElementById('legendRealVal');
  const legFake = document.getElementById('legendFakeVal');
  const legWarn = document.getElementById('legendWarnVal');

  if (legReal) legReal.textContent = `${realCount} (${realPct}%)`;
  if (legFake) legFake.textContent = `${fakeCount} (${fakePct}%)`;
  if (legWarn) legWarn.textContent = `${warnCount} (${warnPct}%)`;
}

function renderScanTable() {
  const tbody = document.getElementById('scanTableBody');
  const emptyState = document.getElementById('tableEmptyState');
  if (!tbody) return;

  const history = getScanHistory();

  const filtered = history.filter(item => {
    const matchesFilter = currentFilter === 'ALL' || item.verdict === currentFilter;
    const matchesSearch = !currentSearch ||
      item.headline.toLowerCase().includes(currentSearch) ||
      item.id.toLowerCase().includes(currentSearch);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = filtered.map(item => {
    let badgeClass = 'badge-neutral';
    if (item.verdict === 'REAL') badgeClass = 'badge-real';
    if (item.verdict === 'FAKE') badgeClass = 'badge-fake';
    if (item.verdict === 'QUESTIONABLE') badgeClass = 'badge-warn';

    return `
      <tr>
        <td class="timestamp-cell">${escapeHTML(item.timestamp)}</td>
        <td>
          <div class="article-headline-cell" title="${escapeHTML(item.headline)}">
            ${escapeHTML(item.headline)}
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
            ${item.wordCount || 120} words &bull; ${escapeHTML(item.source || 'Direct Text')}
          </div>
        </td>
        <td>
          <span class="badge ${badgeClass}">
            <span class="status-dot"></span>
            ${item.verdict}
          </span>
        </td>
        <td class="score-cell">${item.confidence}%</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="viewScanDetails('${item.id}')">Inspect</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--text-muted);" title="Delete" onclick="removeScan('${item.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function viewScanDetails(id) {
  const history = getScanHistory();
  const item = history.find(s => s.id === id);
  if (!item) return;

  const modalBody = document.getElementById('scanDetailsBody');
  if (modalBody) {
    modalBody.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-family:var(--font-family-mono); font-size:12px; color:var(--text-muted);">${item.id} &bull; ${item.timestamp}</div>
            <h4 style="font-size:16px; margin-top:4px; font-weight:600;">${escapeHTML(item.headline)}</h4>
          </div>
          <span class="badge ${item.verdict === 'REAL' ? 'badge-real' : item.verdict === 'FAKE' ? 'badge-fake' : 'badge-warn'}">
            ${item.verdict}
          </span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:var(--bg-subtle); padding:12px; border-radius:6px; border:1px solid var(--border-color);">
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Confidence Level</div>
            <div style="font-size:18px; font-weight:bold; font-family:var(--font-family-mono);">${item.confidence}%</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Credibility Index</div>
            <div style="font-size:18px; font-weight:bold; font-family:var(--font-family-mono);">${item.credibilityScore || 85} / 100</div>
          </div>
        </div>

        <div>
          <div style="font-size:12px; font-weight:600; margin-bottom:6px;">Origin / Provenance</div>
          <p style="font-size:13px; color:var(--text-secondary); background:var(--bg-card); border:1px solid var(--border-color); padding:8px 12px; border-radius:4px;">
            ${escapeHTML(item.source || 'Direct Raw Input')}
          </p>
        </div>

        <div>
          <div style="font-size:12px; font-weight:600; margin-bottom:6px;">Verification Methodology</div>
          <p style="font-size:12px; color:var(--text-secondary); line-height:1.5;">
            Evaluated against the VERIFAI ensemble pipeline utilizing linguistic tokenization, named-entity attribution consistency, and stylometric bias metrics trained on ISOT & WELFake corpora.
          </p>
        </div>
      </div>
    `;
  }

  openModal('scanDetailsModal');
}

function removeScan(id) {
  deleteScanRecord(id);
  renderDashboardStats();
  renderScanTable();
  showToast('Record deleted.', 'info');
}

function exportHistoryData() {
  const history = getScanHistory();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `verifai_audit_history_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Audit records exported as JSON.', 'success');
}

window.viewScanDetails = viewScanDetails;
window.removeScan = removeScan;

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
