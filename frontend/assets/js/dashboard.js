/**
 * VerifAI — Dashboard & History Controller
 * Powers metrics overview, history tables, search/filter, and detail modals.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDashboardAndHistory();
});

let cachedRecords = [];

async function initDashboardAndHistory() {
  await loadRecords();
  renderDashboardKPIs();
  renderRecentTable();
  renderHistoryTable();

  // Search input on history page
  const searchInput = document.getElementById('historySearchInput');
  searchInput?.addEventListener('input', () => {
    renderHistoryTable();
  });

  // Filter select on history page
  const filterSelect = document.getElementById('verdictFilterSelect');
  filterSelect?.addEventListener('change', () => {
    renderHistoryTable();
  });

  // Clear history button
  const clearBtn = document.getElementById('clearHistoryBtn');
  clearBtn?.addEventListener('click', () => {
    if (confirm('Clear local history records? This cannot be undone.')) {
      clearAllScans();
      cachedRecords = [];
      renderDashboardKPIs();
      renderRecentTable();
      renderHistoryTable();
      showToast('History records cleared.', 'info');
    }
  });

  // Modal close handlers
  const modal = document.getElementById('scanDetailsModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const closeFooterBtn = document.getElementById('closeModalFooterBtn');

  const closeModal = () => {
    if (modal) modal.classList.remove('open');
  };

  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * Fetch records from backend API or local cache
 */
async function loadRecords() {
  // Always load local records first
  let localData = getScanHistory();

  // If backend API client is available and user is authenticated, sync with server
  if (window.VerifaiAPI && localStorage.getItem('verifai_access_token')) {
    try {
      const res = await window.VerifaiAPI.getHistory();
      if (res && Array.isArray(res.data)) {
        // Map backend schema to standard record schema
        const apiRecords = res.data.map(item => ({
          id: item.prediction_id,
          timestamp: item.created_at,
          headline: item.headline || 'Direct Text Ingestion',
          verdict: item.prediction,
          confidence: item.confidence,
          input_type: item.input_type || 'text',
          word_count: item.word_count || 0
        }));

        // Merge backend records with local
        const ids = new Set(apiRecords.map(r => r.id));
        const nonDuplicateLocal = localData.filter(r => !ids.has(r.id));
        cachedRecords = [...apiRecords, ...nonDuplicateLocal];
        return;
      }
    } catch (e) {
      console.warn('Backend history sync notice:', e.message);
    }
  }

  cachedRecords = localData || [];
}

/**
 * Render Dashboard Overview KPIs
 */
function renderDashboardKPIs() {
  const totalEl = document.getElementById('kpiTotal');
  const realEl = document.getElementById('kpiReal');
  const fakeEl = document.getElementById('kpiFake');

  if (!totalEl) return;

  const total = cachedRecords.length;
  let realCount = 0;
  let fakeCount = 0;

  cachedRecords.forEach(r => {
    const verdict = (r.verdict || '').toLowerCase();
    if (verdict === 'real') realCount++;
    else if (verdict === 'fake') fakeCount++;
  });

  totalEl.textContent = total;
  if (realEl) realEl.textContent = realCount;
  if (fakeEl) fakeEl.textContent = fakeCount;
}

/**
 * Render Recent Analyses on Dashboard
 */
function renderRecentTable() {
  const tbody = document.getElementById('recentTableBody');
  if (!tbody) return;

  const recent = cachedRecords.slice(0, 6);

  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 36px;">
          No analyses recorded yet. <a href="detector.html" style="text-decoration: underline; color: var(--text-primary); font-weight: 500;">Check an article</a> to get started.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recent.map(record => {
    const isReal = (record.verdict || '').toLowerCase() === 'real';
    const dateStr = formatDate(record.timestamp);
    const headline = escapeHtml(record.headline || 'News text claim');
    const conf = Number(record.confidence || 0).toFixed(1);

    return `
      <tr>
        <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.813rem; white-space: nowrap;">
          ${dateStr}
        </td>
        <td class="table-headline" title="${headline}">
          ${headline}
        </td>
        <td>
          <span class="verdict-badge ${isReal ? 'real' : 'fake'}" style="padding: 3px 8px; font-size: 0.75rem;">
            ${isReal ? 'Real' : 'Fake'}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 600;">
          ${conf}%
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="viewRecordDetail('${record.id}')" type="button">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Full History on History Page
 */
function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  const searchVal = document.getElementById('historySearchInput')?.value.trim().toLowerCase() || '';
  const filterVal = document.getElementById('verdictFilterSelect')?.value || 'ALL';

  let filtered = cachedRecords.filter(record => {
    const verdict = (record.verdict || '').toUpperCase();
    if (filterVal !== 'ALL' && verdict !== filterVal) {
      return false;
    }

    if (searchVal) {
      const matchText = ((record.headline || '') + ' ' + (record.verdict || '')).toLowerCase();
      if (!matchText.includes(searchVal)) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 36px;">
          No records found matching your filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(record => {
    const isReal = (record.verdict || '').toLowerCase() === 'real';
    const dateStr = formatDate(record.timestamp);
    const headline = escapeHtml(record.headline || 'News article content');
    const conf = Number(record.confidence || 0).toFixed(1);
    const type = (record.input_type || 'text').toUpperCase();

    return `
      <tr>
        <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.813rem; white-space: nowrap;">
          ${dateStr}
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
          ${type}
        </td>
        <td class="table-headline" title="${headline}">
          ${headline}
        </td>
        <td>
          <span class="verdict-badge ${isReal ? 'real' : 'fake'}" style="padding: 3px 8px; font-size: 0.75rem;">
            ${isReal ? 'Real' : 'Fake'}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 600;">
          ${conf}%
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="viewRecordDetail('${record.id}')" type="button">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Open Detail Modal for a Record
 */
window.viewRecordDetail = function(recordId) {
  const record = cachedRecords.find(r => r.id === recordId);
  if (!record) return;

  const modal = document.getElementById('scanDetailsModal');
  const body = document.getElementById('scanDetailsBody');
  if (!modal || !body) return;

  const isReal = (record.verdict || '').toLowerCase() === 'real';
  const conf = Number(record.confidence || 0).toFixed(1);
  const headline = escapeHtml(record.headline || 'Article Text');
  const dateStr = formatDate(record.timestamp);

  body.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Headline / Subject</div>
      <h4 style="font-size: 1.1rem; line-height: 1.4;">${headline}</h4>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px; background-color: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); margin-bottom: 20px;">
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Prediction</div>
        <div class="verdict-badge ${isReal ? 'real' : 'fake'}" style="margin-top: 4px; padding: 3px 8px; font-size: 0.75rem;">
          ${isReal ? 'Likely Real' : 'Likely Fake'}
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Confidence</div>
        <div style="font-family: var(--font-mono); font-weight: 700; font-size: 1rem; margin-top: 4px;">
          ${conf}%
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Date</div>
        <div style="font-family: var(--font-mono); font-size: 0.813rem; color: var(--text-secondary); margin-top: 6px;">
          ${dateStr}
        </div>
      </div>
    </div>

    <div>
      <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Record ID</div>
      <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); word-break: break-all;">
        ${record.id}
      </div>
    </div>
  `;

  modal.classList.add('open');
};

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr.slice(0, 16);
    return d.toISOString().replace('T', ' ').slice(0, 16);
  } catch (e) {
    return String(isoStr).slice(0, 16);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
