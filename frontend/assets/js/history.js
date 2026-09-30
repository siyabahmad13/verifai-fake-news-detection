/**
 * VerifAI — History Controller
 * Fetches and displays the authenticated user's prediction history directly from Django REST API.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
});

async function loadHistory() {
  const tableBody = document.getElementById('historyTableBody');
  if (!tableBody) return;

  if (!window.isAuthenticated || !window.isAuthenticated()) {
    window.location.replace('login.html?redirect=history.html&auth=required');
    return;
  }

  try {
    const res = await window.VerifaiAPI.getHistory();
    // Paginated response: res.results or res.data.results
    const records = res?.results || res?.data?.results || res?.data || [];

    if (!Array.isArray(records) || records.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
            No predictions recorded yet. 
            <a href="detector.html" style="color: var(--text-primary); font-weight: 600; text-decoration: underline; margin-left: 6px;">
              Analyze an article
            </a>.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = records.map(record => {
      const isReal = (record.prediction || '').toLowerCase() === 'real';
      const badgeClass = isReal ? 'real' : 'fake';
      const badgeText = isReal ? 'REAL' : 'FAKE';

      const confNum = Number(record.confidence) || 0;
      const confText = `${confNum.toFixed(1)}%`;

      const headlineText = record.headline || record.input_text?.slice(0, 80) || 'Untitled Article';

      let formattedDate = '—';
      if (record.created_at) {
        const d = new Date(record.created_at);
        formattedDate = d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 0.875rem;">${formattedDate}</td>
          <td style="font-weight: 500; max-width: 440px;">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(headlineText)}
            </div>
          </td>
          <td>
            <span class="verdict-badge ${badgeClass}" style="padding: 4px 10px; font-size: 0.75rem;">
              ${badgeText}
            </span>
          </td>
          <td style="font-weight: 600; font-size: 0.938rem;">${confText}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load history:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 36px 24px; color: var(--fake-color);">
          Failed to load history from server. Ensure backend is running.
        </td>
      </tr>
    `;
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
