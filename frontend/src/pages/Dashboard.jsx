import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/dashboard.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const displayName = user?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Researcher';

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, historyData] = await Promise.all([
          api.getStats().catch((err) => {
            console.error('[Dashboard] Failed to fetch stats:', err);
            return null;
          }),
          api.getHistory(1).catch((err) => {
            console.error('[Dashboard] Failed to fetch history:', err);
            return null;
          }),
        ]);

        if (isMounted) {
          if (statsData) {
            setStats(statsData);
          } else if (historyData) {
            // Fallback calculation from history records if stats endpoint fails
            const allItems = historyData.results || [];
            setStats({
              total_predictions: historyData.count || allItems.length,
              real_count: allItems.filter((i) => i.prediction?.toUpperCase() === 'REAL').length,
              fake_count: allItems.filter((i) => i.prediction?.toUpperCase() === 'FAKE').length,
              feedback_count: 0,
            });
          }

          const rawResults = historyData?.results || (Array.isArray(historyData) ? historyData : []);
          setRecentPredictions(rawResults.slice(0, 4));
        }
      } catch (err) {
        if (isMounted) {
          console.error('[Dashboard] Error loading data:', err);
          setError('Unable to load dashboard records. Please verify the backend service is running.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
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

  return (
    <div className="dash-container">
      {/* Welcome Section */}
      <section className="dash-welcome-card">
        <div className="dash-welcome-text">
          <h1 className="dash-welcome-title">Welcome back, {displayName}</h1>
          <p className="dash-welcome-desc">
            Monitor real-time classification metrics, inspect recent verification logs, and audit machine learning predictions.
          </p>
        </div>
        <Link to="/detector" className="btn-primary dash-cta-btn">
          Analyze News
        </Link>
      </section>

      {error && (
        <div className="form-error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <section className="dash-stats-grid" aria-label="Verification Statistics">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Predictions</span>
            
          </div>
          <div className="stat-value">
            {loading ? '—' : (stats?.total_predictions ?? 0).toLocaleString()}
          </div>
          <span className="stat-caption">All verified articles evaluated</span>
        </div>

        <div className="stat-card stat-real">
          <div className="stat-header">
            <span className="stat-label">Real News</span>
            
          </div>
          <div className="stat-value text-real">
            {loading ? '—' : (stats?.real_count ?? 0).toLocaleString()}
          </div>
          <span className="stat-caption">Verified authentic claims</span>
        </div>

        <div className="stat-card stat-fake">
          <div className="stat-header">
            <span className="stat-label">Fake News</span>
            
          </div>
          <div className="stat-value text-fake">
            {loading ? '—' : (stats?.fake_count ?? 0).toLocaleString()}
          </div>
          <span className="stat-caption">Misinformation flags identified</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Feedback Submitted</span>
            
          </div>
          <div className="stat-value">
            {loading ? '—' : (stats?.feedback_count ?? 0).toLocaleString()}
          </div>
          <span className="stat-caption">Discrepancy reports filed</span>
        </div>
      </section>

      {/* Main Content Split: Recent Predictions + Quick Actions */}
      <div className="dash-grid-two">
        {/* Recent Predictions */}
        <section className="dash-panel" aria-label="Recent Predictions">
          <div className="dash-panel-header">
            <div>
              <h2 className="dash-panel-title">Recent Predictions</h2>
              <p className="dash-panel-sub">Latest news evaluations from your audit history</p>
            </div>
            <Link to="/history" className="dash-link-action">
              View Full History &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="dash-loading-state">
              <div className="spinner" />
              <span>Loading latest predictions...</span>
            </div>
          ) : recentPredictions.length === 0 ? (
            <div className="dash-empty-state">
              <p className="dash-empty-title">No predictions recorded yet</p>
              <p className="dash-empty-desc">
                Your evaluated articles will appear here automatically as soon as you analyze your first news story.
              </p>
              <Link to="/detector" className="btn-primary btn-sm" style={{ marginTop: '12px' }}>
                Analyze First Article
              </Link>
            </div>
          ) : (
            <div className="recent-list">
              {recentPredictions.map((item) => {
                const isReal = item.prediction?.toUpperCase() === 'REAL';
                const preview = item.headline || item.input_text || 'Untitled Content';

                return (
                  <article key={item.prediction_id || item.id} className="recent-item">
                    <div className="recent-item-header">
                      <span className={`badge-verdict ${isReal ? 'real' : 'fake'}`}>
                        {item.prediction?.toUpperCase()}
                      </span>
                      <span className="recent-confidence">
                        {typeof item.confidence === 'number'
                          ? `${item.confidence.toFixed(1)}% confidence`
                          : `${item.confidence}% confidence`}
                      </span>
                      <time className="recent-date" dateTime={item.created_at}>
                        {formatDate(item.created_at)}
                      </time>
                    </div>

                    <p className="recent-snippet" title={preview}>
                      {preview.length > 140 ? `${preview.slice(0, 140)}...` : preview}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Action Panel */}
        <aside className="dash-panel dash-quick-action" aria-label="Quick Actions">
          <div className="dash-panel-header">
            <h2 className="dash-panel-title">Quick Action</h2>
          </div>

          <p className="dash-quick-desc">
            Instantly evaluate the authenticity of an article using VerifAI's supervised machine learning engine.
          </p>

          <Link to="/detector" className="btn-primary dash-action-btn">
            Analyze News
          </Link>

          <div className="dash-quick-links">
            <span className="dash-quick-links-title">Quick Navigation</span>
            <Link to="/history" className="dash-quick-link-item">
              <span className="dash-quick-bullet">&bull;</span>
              Browse Complete History
            </Link>
            <Link to="/feedback" className="dash-quick-link-item">
              <span className="dash-quick-bullet">&bull;</span>
              Submitted Feedback Reports
            </Link>
            <Link to="/profile" className="dash-quick-link-item">
              <span className="dash-quick-bullet">&bull;</span>
              Manage Account &amp; Profile
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
