import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/history.css';

export const History = () => {
  const [historyList, setHistoryList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [page, setPage] = useState(1);
  const [verdictFilter, setVerdictFilter] = useState(''); // '' | 'Real' | 'Fake'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Prediction Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (verdictFilter) filters.prediction = verdictFilter;
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const response = await api.getHistoryFiltered(page, filters);

      const results = response?.results || (Array.isArray(response) ? response : []);
      setHistoryList(results);
      setTotalCount(response?.count ?? results.length);
      setTotalPages(response?.total_pages ?? Math.max(1, Math.ceil((response?.count || results.length) / 10)));
    } catch (err) {
      console.error('[VerifAI History Error]:', err);
      setError('Unable to load verification history. Please verify the backend connection.');
    } finally {
      setLoading(false);
    }
  }, [page, verdictFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchDraft);
  };

  const handleVerdictChange = (verdict) => {
    setPage(1);
    setVerdictFilter(verdict);
  };

  const handleResetFilters = () => {
    setPage(1);
    setVerdictFilter('');
    setSearchQuery('');
    setSearchDraft('');
    setDateFrom('');
    setDateTo('');
  };

  const handleOpenDetails = async (record) => {
    setSelectedRecord(record);
    const recId = record.prediction_id || record.id;
    if (recId) {
      setLoadingDetail(true);
      try {
        const full = await api.getPredictionDetail(recId);
        if (full) {
          setSelectedRecord(full);
        }
      } catch (err) {
        console.warn('[History] Could not fetch detailed record:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const hasActiveFilters = Boolean(verdictFilter || searchQuery || dateFrom || dateTo);

  return (
    <div className="history-page">
      <div className="history-container">
        {/* Header */}
        <header className="history-header">
          <div>
            <h1 className="history-title">Prediction History</h1>
            <p className="history-desc">
              Audit log of previous news predictions, authenticity verdicts, and confidence ratings.
            </p>
          </div>
          <Link to="/detector" className="btn-primary btn-sm">
            Analyze News
          </Link>
        </header>

        {/* Filter Controls Toolbar */}
        <section className="history-toolbar" aria-label="History Filters">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="history-search-form">
            <input
              type="text"
              className="form-input history-search-input"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search news content or title..."
              aria-label="Search prediction history"
            />
            <button type="submit" className="btn-secondary btn-sm">
              Search
            </button>
          </form>

          {/* Verdict Filter Buttons */}
          <div className="history-verdict-filters" role="group" aria-label="Filter by verdict">
            <button
              type="button"
              className={`filter-btn ${verdictFilter === '' ? 'active' : ''}`}
              onClick={() => handleVerdictChange('')}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-btn ${verdictFilter === 'Real' ? 'active-real' : ''}`}
              onClick={() => handleVerdictChange('Real')}
            >
              Real News
            </button>
            <button
              type="button"
              className={`filter-btn ${verdictFilter === 'Fake' ? 'active-fake' : ''}`}
              onClick={() => handleVerdictChange('Fake')}
            >
              Fake News
            </button>
          </div>

          {/* Date Filtering */}
          <div className="history-date-filters">
            <div className="date-input-group">
              <label htmlFor="filter-date-from" className="date-label">From:</label>
              <input
                id="filter-date-from"
                type="date"
                className="form-input date-input"
                value={dateFrom}
                onChange={(e) => {
                  setPage(1);
                  setDateFrom(e.target.value);
                }}
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="filter-date-to" className="date-label">To:</label>
              <input
                id="filter-date-to"
                type="date"
                className="form-input date-input"
                value={dateTo}
                onChange={(e) => {
                  setPage(1);
                  setDateTo(e.target.value);
                }}
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn-link-reset"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        </section>

        {/* State 1: Loading */}
        {loading && (
          <div className="loading-screen" role="status" aria-live="polite">
            <div className="spinner" />
            <span className="loading-text">Loading prediction logs...</span>
          </div>
        )}

        {/* State 2: Error */}
        {!loading && error && (
          <div className="analysis-error-card" role="alert" style={{ marginBottom: '24px' }}>
            <span className="error-main-title">Failed to load history</span>
            <span className="error-subtitle">{error}</span>
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={fetchHistory}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* State 3: Empty State */}
        {!loading && !error && historyList.length === 0 && (
          <div className="history-empty-card">
            <h2 className="empty-title">
              {hasActiveFilters ? 'No Matching Records Found' : 'No Articles Analyzed Yet'}
            </h2>
            <p className="empty-desc">
              {hasActiveFilters
                ? 'No prediction records match the active search or filter criteria. Try resetting your filters.'
                : 'Your verified news articles and machine learning assessments will appear here automatically.'}
            </p>
            {hasActiveFilters ? (
              <button type="button" className="btn-secondary" onClick={handleResetFilters}>
                Clear Active Filters
              </button>
            ) : (
              <Link to="/detector" className="btn-primary">
                Analyze News
              </Link>
            )}
          </div>
        )}

        {/* State 4: Data Table */}
        {!loading && !error && historyList.length > 0 && (
          <>
            <div className="history-meta-bar">
              <span className="history-count-text">
                Showing <strong>{historyList.length}</strong> of <strong>{totalCount}</strong> prediction record{totalCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>News Content Preview</th>
                    <th>Verdict</th>
                    <th>Confidence</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item) => {
                    const isReal = item.prediction?.toUpperCase() === 'REAL';
                    const previewText = item.headline || item.input_text || 'Untitled Article';

                    return (
                      <tr key={item.prediction_id || item.id}>
                        <td className="history-date">{formatDate(item.created_at)}</td>
                        <td className="history-headline" title={previewText}>
                          {previewText.length > 85 ? `${previewText.slice(0, 85)}...` : previewText}
                        </td>
                        <td>
                          <span className={`badge-verdict ${isReal ? 'real' : 'fake'}`}>
                            {item.prediction?.toUpperCase()}
                          </span>
                        </td>
                        <td className="history-confidence">
                          {typeof item.confidence === 'number'
                            ? `${item.confidence.toFixed(1)}%`
                            : `${item.confidence}%`}
                        </td>
                        <td className="history-model">
                          {item.input_type === 'url' ? 'URL' : 'Text'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => handleOpenDetails(item)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="history-pagination">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  &larr; Previous
                </button>
                <span className="page-indicator">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Full Prediction Details Modal */}
      {selectedRecord && (
        <div className="modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-prediction-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="modal-prediction-title" className="modal-title">
                Prediction Audit Record
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close prediction details modal"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-verdict-strip">
                <div className="modal-verdict-badge-block">
                  <span className="modal-label">Classification Verdict</span>
                  <span
                    className={`badge-verdict ${
                      selectedRecord.prediction?.toUpperCase() === 'REAL' ? 'real' : 'fake'
                    }`}
                    style={{ fontSize: '0.9375rem', padding: '6px 12px' }}
                  >
                    {selectedRecord.prediction?.toUpperCase()}
                  </span>
                </div>

                <div className="modal-stat-block">
                  <span className="modal-label">Confidence Score</span>
                  <span className="modal-stat-val">
                    {typeof selectedRecord.confidence === 'number'
                      ? `${selectedRecord.confidence.toFixed(1)}%`
                      : `${selectedRecord.confidence}%`}
                  </span>
                </div>

                <div className="modal-stat-block">
                  <span className="modal-label">Date Evaluated</span>
                  <span className="modal-stat-val" style={{ fontSize: '0.875rem' }}>
                    {formatDate(selectedRecord.created_at)}
                  </span>
                </div>
              </div>

              {selectedRecord.probabilities && typeof selectedRecord.probabilities === 'object' && (
                <div className="modal-prob-distribution">
                  <span className="modal-label">Class Probability Distribution:</span>
                  <div className="prob-bars">
                    {Object.entries(selectedRecord.probabilities).map(([key, val]) => (
                      <div key={key} className="prob-item">
                        <span className="prob-key">{key}:</span>
                        <span className="prob-num">
                          {typeof val === 'number' ? `${(val * (val <= 1 ? 100 : 1)).toFixed(1)}%` : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-field-block">
                <span className="modal-label">Headline / Title:</span>
                <p className="modal-headline-text">
                  {selectedRecord.headline || 'Untitled Article'}
                </p>
              </div>

              <div className="modal-field-block">
                <span className="modal-label">Evaluated Article Content:</span>
                <div className="modal-text-content">
                  {selectedRecord.input_text || selectedRecord.headline || 'No content stored'}
                </div>
              </div>

              <div className="modal-meta-row">
                <span>Model Engine: <code>{selectedRecord.model_version || 'v1-baseline'}</code></span>
                <span>Modality: <code>{selectedRecord.input_type || 'text'}</code></span>
                {selectedRecord.word_count > 0 && (
                  <span>Word count: <code>{selectedRecord.word_count}</code></span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
