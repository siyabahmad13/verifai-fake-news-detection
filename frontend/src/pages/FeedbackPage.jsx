import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/feedback-page.css';

export const FeedbackPage = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getFeedbackList();
      const results = response?.results || (Array.isArray(response) ? response : []);
      setFeedbackList(results);
    } catch (err) {
      console.error('[VerifAI Feedback Error]:', err);
      setError('Unable to load discrepancy feedback reports. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

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

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        {/* Header */}
        <header className="feedback-page-header">
          <div>
            <h1 className="feedback-page-title">Prediction Feedback</h1>
            <p className="feedback-page-desc">
              Human-in-the-loop review log and discrepancy reports submitted to refine model evaluation accuracy.
            </p>
          </div>
          <Link to="/detector" className="btn-primary btn-sm">
            Analyze News
          </Link>
        </header>

        {/* Informational Guidance Banner */}
        <div className="feedback-guide-box">
          <div className="guide-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="guide-content">
            <h2 className="guide-title">How Prediction Feedback Works</h2>
            <p className="guide-text">
              Whenever you evaluate an article in the <strong>News Detector</strong>, you can confirm whether the verdict was accurate or contest it with an asserted label (Real or Fake) and citation notes. All feedback is logged here against the actual database record.
            </p>
          </div>
        </div>

        {/* State 1: Loading */}
        {loading && (
          <div className="loading-screen" role="status" aria-live="polite">
            <div className="spinner" />
            <span className="loading-text">Loading feedback reports...</span>
          </div>
        )}

        {/* State 2: Error */}
        {!loading && error && (
          <div className="analysis-error-card" role="alert" style={{ marginBottom: '24px' }}>
            <span className="error-main-title">Failed to load feedback records</span>
            <span className="error-subtitle">{error}</span>
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={fetchFeedback}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* State 3: Empty State */}
        {!loading && !error && feedbackList.length === 0 && (
          <div className="history-empty-card">
            <h2 className="empty-title">No Feedback Reports Filed Yet</h2>
            <p className="empty-desc">
              When you evaluate news articles in the News Detector, you can submit feedback on the prediction results. Your submitted feedback reports will appear here.
            </p>
            <Link to="/detector" className="btn-primary">
              Evaluate News Article
            </Link>
          </div>
        )}

        {/* State 4: Feedback List */}
        {!loading && !error && feedbackList.length > 0 && (
          <div className="feedback-list">
            {feedbackList.map((item) => {
              const isMatch = item.predicted_label?.toUpperCase() === item.actual_label?.toUpperCase();
              return (
                <article key={item.feedback_id || item.id} className="feedback-card">
                  <div className="feedback-card-top">
                    <div className="feedback-card-labels">
                      <div className="label-comparison">
                        <span className="label-tag">Model Predicted:</span>
                        <span className={`badge-verdict ${item.predicted_label?.toUpperCase() === 'REAL' ? 'real' : 'fake'}`}>
                          {item.predicted_label?.toUpperCase()}
                        </span>
                      </div>

                      <div className="label-comparison">
                        <span className="label-tag">User Asserted:</span>
                        <span className={`badge-verdict ${item.actual_label?.toUpperCase() === 'REAL' ? 'real' : 'fake'}`}>
                          {item.actual_label?.toUpperCase()}
                        </span>
                      </div>

                      <span className={`status-pill ${isMatch ? 'status-confirmed' : 'status-contested'}`}>
                        {isMatch ? 'Verified Correct' : 'Contested Error'}
                      </span>
                    </div>

                    <time className="feedback-card-date" dateTime={item.created_at}>
                      {formatDate(item.created_at)}
                    </time>
                  </div>

                  {item.prediction_headline && (
                    <div className="feedback-card-headline">
                      <span className="headline-label">Article Claim / Headline:</span>
                      <p className="headline-text">{item.prediction_headline}</p>
                    </div>
                  )}

                  {item.comment && (
                    <div className="feedback-card-comment">
                      <span className="comment-label">User Review Comment:</span>
                      <p className="comment-text">{item.comment}</p>
                    </div>
                  )}

                  <div className="feedback-card-footer">
                    <span className="feedback-status-meta">
                      Editorial Status: <strong className="status-name">{item.status || 'pending'}</strong>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
