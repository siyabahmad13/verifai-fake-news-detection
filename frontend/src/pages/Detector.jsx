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

const URL_ANALYSIS_STEPS = [
  'Connecting to provided URL...',
  'Scraping and cleaning article text...',
  'Extracting stylometric features & linguistic patterns...',
  'Evaluating against trained classification model...',
];

const getStorageKey = (userId) => (userId ? `verifai_news_detector_state_${userId}` : null);

// Helper to safely load persisted state for the given user ONLY
const loadUserDetectorState = (userId) => {
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

    if (parsed && parsed.userId === userId) {
      return parsed;
    }

    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
};

export const Detector = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Active Tab: 'news' | 'url'
  const [activeTab, setActiveTab] = useState('news');

  // Input states
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  // Result & Analysis state
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
  useEffect(() => {
    if (!currentUserId) {
      setText('');
      setUrl('');
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
      setUrl(saved.url || '');
      setActiveTab(saved.activeTab || 'news');
      setResult(saved.result || null);
    } else {
      setText('');
      setUrl('');
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
      setUrl('');
      setActiveTab('news');
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

  // Sync state to sessionStorage whenever result, text, url or activeTab changes
  useEffect(() => {
    if (!currentUserId) return;
    const key = getStorageKey(currentUserId);
    if (!key) return;

    try {
      if (text || url || result) {
        const stateToSave = {
          userId: currentUserId,
          activeTab,
          text,
          url,
          result: result ? { ...result, userId: currentUserId } : null,
        };
        sessionStorage.setItem(key, JSON.stringify(stateToSave));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[VerifAI] Could not save state to sessionStorage:', e);
    }
  }, [currentUserId, activeTab, text, url, result]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, []);

  const handleClear = () => {
    if (activeTab === 'news') {
      setText('');
    } else {
      setUrl('');
    }
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
    setUrl('');
    setFeedbackType(null);
    setExpectedLabel('');
    setFeedbackComment('');
    setFeedbackStatus(null);
    if (currentUserId) {
      const key = getStorageKey(currentUserId);
      if (key) sessionStorage.removeItem(key);
    }
  };

  const handleAnalyzeText = async () => {
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
          : err.message || 'Unable to evaluate this article. Please verify that the backend server is running.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please enter a valid news article URL.');
      return;
    }

    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      setError('Please enter a full URL including http:// or https://');
      return;
    }

    setIsAnalyzing(true);
    let stepIndex = 0;
    setAnalysisStep(URL_ANALYSIS_STEPS[0]);

    stepIntervalRef.current = setInterval(() => {
      stepIndex = (stepIndex + 1) % URL_ANALYSIS_STEPS.length;
      setAnalysisStep(URL_ANALYSIS_STEPS[stepIndex]);
    }, 450);

    try {
      const responseData = await api.predictUrl(trimmedUrl);

      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }

      setResult({
        ...responseData,
        userId: currentUserId,
        testedSnippet: responseData.headline || trimmedUrl,
        testedUrl: trimmedUrl,
        evaluatedAt: new Date().toISOString(),
      });
      setFeedbackType(null);
      setExpectedLabel('');
      setFeedbackComment('');
      setFeedbackStatus(null);
    } catch (err) {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
      console.error('[VerifAI URL Detector Error]:', err);
      setError(
        err.message && err.message.includes('backend')
          ? err.message
          : err.message || 'Unable to retrieve and verify article from this URL. Please check the URL or paste article text directly.'
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
            Verify news authenticity and statistical confidence using direct article text or live web article URL.
          </p>
        </header>

        {/* Tab Navigation Switcher */}
        {!isAnalyzing && !result && (
          <div className="detector-tabs-bar" role="tablist" aria-label="Detection Mode">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'news'}
              className={`detector-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('news');
                setError(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>News Text Detection</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'url'}
              className={`detector-tab-btn ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('url');
                setError(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>URL-Based Detection</span>
            </button>
          </div>
        )}

        {/* State 1: Active Analysis Spinner */}
        {isAnalyzing && (
          <div className="analysis-progress-card" role="status" aria-live="polite">
            <div className="analysis-spinner" />
            <h2 className="analysis-title">
              {activeTab === 'url' ? 'ANALYZING NEWS ARTICLE FROM URL' : 'ANALYZING NEWS ARTICLE'}
            </h2>
            <p className="analysis-step-message">{analysisStep}</p>
          </div>
        )}

        {/* State 2: Prediction Result Interface */}
        {!isAnalyzing && result && (
          <section className="result-card" aria-label="Analysis Result">
            <div className="result-card-header">
              <span className="result-header-label">PREDICTION ASSESSMENT</span>
              <div className="result-meta-tags">
                {result.input_type && (
                  <span className="result-modality-badge">
                    {result.input_type === 'url' ? 'Modality: URL' : 'Modality: Text'}
                  </span>
                )}
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

            {/* URL Source / Article Snippet Preview */}
            {(result.url || result.testedUrl) && (
              <div className="snippet-block">
                <span className="snippet-label">Source URL Verified</span>
                <div className="tested-url-display">
                  <a href={result.url || result.testedUrl} target="_blank" rel="noopener noreferrer" className="url-link">
                    {result.url || result.testedUrl}
                  </a>
                </div>
              </div>
            )}

            {result.testedSnippet && (
              <div className="snippet-block">
                <span className="snippet-label">
                  {result.input_type === 'url' ? 'Article Title / Extracted Lead' : 'Analyzed News Preview'}
                </span>
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
                {result.input_type === 'url' ? 'Analyze Another URL' : 'Analyze Another News'}
              </button>
            </div>
          </section>
        )}

        {/* State 3: Input Workspaces (Tab 1: News Text | Tab 2: URL) */}
        {!isAnalyzing && !result && activeTab === 'news' && (
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
                  onClick={handleAnalyzeText}
                  disabled={!text.trim()}
                >
                  Analyze News
                </button>
              </div>
            </div>
          </div>
        )}

        {!isAnalyzing && !result && activeTab === 'url' && (
          <div className="workspace-card url-workspace-card">
            {error && (
              <div className="analysis-error-card" role="alert">
                <span className="error-main-title">Unable to analyze URL</span>
                <span className="error-subtitle">{error}</span>
              </div>
            )}

            <div className="url-input-container">
              <label htmlFor="article-url-input" className="url-input-label">
                Article Web Address (URL)
              </label>
              <div className="url-input-wrapper">
                <span className="url-icon-prefix">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <input
                  id="article-url-input"
                  type="url"
                  className="url-input-field"
                  placeholder="https://example.com/news/article-headline"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAnalyzeUrl();
                    }
                  }}
                  autoFocus
                />
              </div>
              <p className="url-helper-text">
                VerifAI will fetch the article text from the URL, extract its content, and evaluate authenticity.
              </p>
            </div>

            <div className="workspace-footer">
              <div className="char-counter">
                <span>{url.trim() ? `${url.trim().length} characters` : 'Enter a public news URL'}</span>
              </div>

              <div className="workspace-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClear}
                  disabled={!url}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAnalyzeUrl}
                  disabled={!url.trim()}
                >
                  Analyze URL
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
