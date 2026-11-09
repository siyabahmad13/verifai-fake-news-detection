import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/detector.css';

const ANALYSIS_STEPS = [
  'Ingesting article content...',
  'Extracting stylometric features & linguistic patterns...',
  'Evaluating against trained classification model...',
  'Calculating calibrated confidence score...',
];

const getStorageKey = (userId) => (userId ? `verifai_news_detector_state_${userId}` : null);

// Helper to safely load persisted state for the given user ONLY
const loadUserDetectorState = (userId) => {
  // Always remove un-scoped legacy keys to prevent cross-account leakage
  try {
    sessionStorage.removeItem('verifai_news_detector_state');
    sessionStorage.removeItem('verifai_news_test_state');
  } catch {}

  if (!userId) return null;

  try {
    const key = getStorageKey(userId);
    const saved = sessionStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);

    // Verify ownership: stored state MUST explicitly belong to current userId
    if (parsed && parsed.userId === userId) {
      return parsed;
    }

    // Ownership mismatch: remove contaminated record
    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
};

export const Detector = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Initialize state scoped to current user
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(ANALYSIS_STEPS[0]);
  const [error, setError] = useState(null);

  // Feedback State
  const [feedbackType, setFeedbackType] = useState(null); // 'correct' | 'incorrect'
  const [expectedLabel, setExpectedLabel] = useState(''); // 'Real' | 'Fake'
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // { success: boolean, message: string }

  const stepIntervalRef = useRef(null);

  // Reaction to user identity change or logout:
  // Reset all state when switching accounts or logging out
  useEffect(() => {
    if (!currentUserId) {
      setText('');
      setResult(null);
      setFeedbackType(null);
      setExpectedLabel('');
      setFeedbackComment('');
      setFeedbackStatus(null);
      setError(null);
      return;
    }

    const saved = loadUserDetectorState(currentUserId);
    if (saved) {
      setText(saved.text || '');
      setResult(saved.result || null);
    } else {
      setText('');
      setResult(null);
    }
    setFeedbackType(null);
    setExpectedLabel('');
    setFeedbackComment('');
    setFeedbackStatus(null);
    setError(null);
  }, [currentUserId]);

  // Listen for global logout event to instantly reset in-memory state
  useEffect(() => {
    const handleLogout = () => {
      setText('');
      setResult(null);
      setFeedbackType(null);
      setExpectedLabel('');
      setFeedbackComment('');
      setFeedbackStatus(null);
      setError(null);
      try {
        sessionStorage.clear();
      } catch {}
    };

    window.addEventListener('verifai_user_logout', handleLogout);
    return () => {
      window.removeEventListener('verifai_user_logout', handleLogout);
    };
  }, []);

  // Sync state to sessionStorage whenever result or text changes (scoped to current user)
  useEffect(() => {
    if (!currentUserId) return;
    const key = getStorageKey(currentUserId);
    if (!key) return;

    try {
      if (text || result) {
        const stateToSave = {
          userId: currentUserId,
          text,
          result: result ? { ...result, userId: currentUserId } : null,
        };
        sessionStorage.setItem(key, JSON.stringify(stateToSave));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[VerifAI] Could not save state to sessionStorage:', e);
    }
  }, [currentUserId, text, result]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, []);

  const handleClear = () => {
    setText('');
    setError(null);
    if (currentUserId) {
      const key = getStorageKey(currentUserId);
      if (key) sessionStorage.removeItem(key);
    }
  };

  const handleAnalyzeAnother = () => {
    setResult(null);
    setError(null);
    setText('');
    setFeedbackType(null);
    setExpectedLabel('');
    setFeedbackComment('');
    setFeedbackStatus(null);
    if (currentUserId) {
      const key = getStorageKey(currentUserId);
      if (key) sessionStorage.removeItem(key);
    }
  };

  const handleAnalyze = async () => {
    setError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please paste or enter the complete news article to analyze.');
      return;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      setError('The article text is too short. Please provide at least 5 words for accurate stylometric evaluation.');
      return;
    }

    if (trimmed.length < 15) {
      setError('The article text must be at least 15 characters long.');
      return;
    }

    setIsAnalyzing(true);
    let stepIndex = 0;
    setAnalysisStep(ANALYSIS_STEPS[0]);

    stepIntervalRef.current = setInterval(() => {
      stepIndex = (stepIndex + 1) % ANALYSIS_STEPS.length;
      setAnalysisStep(ANALYSIS_STEPS[stepIndex]);
    }, 450);

    try {
      const firstLine = trimmed.split('\n')[0].slice(0, 100);
      const responseData = await api.predictText(trimmed, firstLine);

      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }

      setResult({
        ...responseData,
        userId: currentUserId,
        testedSnippet: trimmed,
        evaluatedAt: new Date().toISOString(),
      });
      // Reset feedback form for new result
      setFeedbackType(null);
      setExpectedLabel('');
      setFeedbackComment('');
      setFeedbackStatus(null);
    } catch (err) {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
      console.error('[VerifAI Detector Error]:', err);
      setError(
        err.message && err.message.includes('backend')
          ? err.message
          : 'Unable to evaluate this article. Please verify that the backend server is running.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackType) return;

    if (feedbackType === 'incorrect' && !expectedLabel) {
      setFeedbackStatus({
        success: false,
        message: 'Please select the expected result (Real or Fake).',
      });
      return;
    }

    const predictionId = result?.prediction_id || result?.id;
    if (!predictionId) {
      setFeedbackStatus({
        success: false,
        message: 'Prediction record identifier not found.',
      });
      return;
    }

    const actualLabel = feedbackType === 'correct' ? result.prediction : expectedLabel;
    const defaultComment =
      feedbackType === 'correct'
        ? 'User verified model prediction as accurate.'
        : `User flagged prediction as incorrect; asserted label is ${expectedLabel}.`;
    const finalComment = feedbackComment.trim() ? feedbackComment.trim() : defaultComment;

    setFeedbackSubmitting(true);
    setFeedbackStatus(null);

    try {
      await api.submitFeedback(predictionId, actualLabel, finalComment);
      setFeedbackStatus({
        success: true,
        message: 'Feedback submitted successfully. Thank you for contributing to model evaluation.',
      });
    } catch (err) {
      console.error('[Feedback Submission Error]:', err);
      setFeedbackStatus({
        success: false,
        message: err.message || 'Failed to record feedback. Please try again.',
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isReal = result?.prediction?.toUpperCase() === 'REAL';

  return (
    <div className="detector-page">
      <div className="detector-container">
        {/* Workspace Header */}
        <header className="detector-header">
          <h1 className="detector-title">News Detector</h1>
          <p className="detector-desc">
            Enter or paste the complete news article into the workspace below for real-time authenticity classification and statistical confidence analysis.
          </p>
        </header>

        {/* State 1: Active Analysis Spinner */}
        {isAnalyzing && (
          <div className="analysis-progress-card" role="status" aria-live="polite">
            <div className="analysis-spinner" />
            <h2 className="analysis-title">ANALYZING NEWS ARTICLE</h2>
            <p className="analysis-step-message">{analysisStep}</p>
          </div>
        )}

        {/* State 2: Prediction Result Interface */}
        {!isAnalyzing && result && (
          <section className="result-card" aria-label="Analysis Result">
            <div className="result-card-header">
              <span className="result-header-label">PREDICTION ASSESSMENT</span>
              <div className="result-meta-tags">
                {result.model_version && (
                  <span className="result-model-badge">Engine: {result.model_version}</span>
                )}
                <span className="result-date-badge">
                  {new Date(result.evaluatedAt || result.created_at || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Verdict Banner */}
            <div className={`verdict-banner ${isReal ? 'real' : 'fake'}`}>
              <div className="verdict-classification">
                <span className="verdict-tag">Authenticity Verdict</span>
                <span className="verdict-value">{result.prediction?.toUpperCase()}</span>
                <span className="verdict-subtext">
                  {isReal
                    ? 'Article exhibits stylistic patterns consistent with credible reporting.'
                    : 'Article exhibits linguistic markers strongly correlated with fabricated or sensationalized claims.'}
                </span>
              </div>
              <div className="verdict-confidence-block">
                <span className="confidence-label">Model Confidence</span>
                <span className="confidence-score">
                  {typeof result.confidence === 'number' ? result.confidence.toFixed(1) : result.confidence}%
                </span>
              </div>
            </div>

            {/* Confidence Progress Meter */}
            <div className="confidence-meter" aria-hidden="true">
              <div
                className={`meter-fill ${isReal ? 'real' : 'fake'}`}
                style={{
                  width: `${Math.min(100, Math.max(10, result.confidence || 0))}%`,
                }}
              />
            </div>

            {/* Article Content Preview */}
            {result.testedSnippet && (
              <div className="snippet-block">
                <span className="snippet-label">Analyzed News Preview</span>
                <div className="tested-snippet">
                  {result.testedSnippet.length > 350
                    ? `${result.testedSnippet.slice(0, 350)}...`
                    : result.testedSnippet}
                </div>
              </div>
            )}

            {/* AI Uncertainty & Responsible AI Disclaimer */}
            <div className="result-disclaimer">
              <strong>Responsible AI Notice:</strong> The confidence score reflects statistical alignment with trained dataset patterns. It does not constitute an infallible determination of absolute fact. Always corroborate important claims with primary journalistic sources.
            </div>

            {/* Prediction Feedback Interface */}
            <section className="feedback-section" aria-label="Prediction Feedback">
              <div className="feedback-header">
                <h3 className="feedback-title">Prediction Feedback</h3>
                <span className="feedback-subtitle">Help improve VerifAI by verifying this result</span>
              </div>

              {feedbackStatus && (
                <div
                  className={`feedback-alert ${feedbackStatus.success ? 'feedback-alert-success' : 'feedback-alert-error'}`}
                  role="alert"
                >
                  {feedbackStatus.message}
                </div>
              )}

              {(!feedbackStatus || !feedbackStatus.success) && (
                <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                  <div className="feedback-choice-group">
                    <button
                      type="button"
                      className={`btn-feedback-choice ${feedbackType === 'correct' ? 'active-correct' : ''}`}
                      onClick={() => {
                        setFeedbackType('correct');
                        setExpectedLabel('');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Prediction is Correct
                    </button>

                    <button
                      type="button"
                      className={`btn-feedback-choice ${feedbackType === 'incorrect' ? 'active-incorrect' : ''}`}
                      onClick={() => {
                        setFeedbackType('incorrect');
                        setExpectedLabel(isReal ? 'Fake' : 'Real');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Prediction is Incorrect
                    </button>
                  </div>

                  {feedbackType === 'incorrect' && (
                    <div className="feedback-incorrect-details">
                      <label className="feedback-label">
                        Expected Authentic Classification:
                      </label>
                      <div className="feedback-label-selector">
                        <button
                          type="button"
                          className={`feedback-pill-btn ${expectedLabel.toUpperCase() === 'REAL' ? 'selected-real' : ''}`}
                          onClick={() => setExpectedLabel('Real')}
                        >
                          REAL News
                        </button>
                        <button
                          type="button"
                          className={`feedback-pill-btn ${expectedLabel.toUpperCase() === 'FAKE' ? 'selected-fake' : ''}`}
                          onClick={() => setExpectedLabel('Fake')}
                        >
                          FAKE News
                        </button>
                      </div>

                      <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                        <label className="form-label" htmlFor="feedback-comment">
                          Optional Justification or Citation
                        </label>
                        <textarea
                          id="feedback-comment"
                          className="form-input feedback-textarea"
                          rows={2}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Provide context, fact-check link, or source rationale..."
                        />
                      </div>
                    </div>
                  )}

                  {feedbackType && (
                    <div className="feedback-actions">
                      <button
                        type="submit"
                        className="btn-primary btn-sm"
                        disabled={feedbackSubmitting || (feedbackType === 'incorrect' && !expectedLabel)}
                      >
                        {feedbackSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </section>

            {/* Action Buttons */}
            <div className="result-actions">
              <button
                type="button"
                className="btn-primary btn-try-new"
                onClick={handleAnalyzeAnother}
              >
                Analyze Another News
              </button>
            </div>
          </section>
        )}

        {/* State 3: Simplified Input Workspace (Single Large Text Area) */}
        {!isAnalyzing && !result && (
          <div className="workspace-card">
            {error && (
              <div className="analysis-error-card" role="alert">
                <span className="error-main-title">Unable to analyze this article</span>
                <span className="error-subtitle">{error}</span>
              </div>
            )}

            <div className="textarea-container">
              <textarea
                className="textarea-article"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or enter the complete news article here..."
                aria-label="Complete news article content"
                rows={12}
                autoFocus
              />
            </div>

            <div className="workspace-footer">
              <div className="char-counter">
                <span>
                  <strong>{wordCount.toLocaleString()}</strong> word{wordCount !== 1 ? 's' : ''} &bull;{' '}
                  <strong>{charCount.toLocaleString()}</strong> character{charCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="workspace-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClear}
                  disabled={!text}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAnalyze}
                  disabled={!text.trim()}
                >
                  Analyze News
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Detector;
