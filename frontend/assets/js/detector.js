/**
 * VerifAI — News Test Controller
 * Persistent, tab-switching resistant state machine for ML news classification.
 * 
 * States:
 *   INITIAL   → User inputs news text
 *   ANALYZING → Live backend ML inference with dynamic step indicators
 *   RESULT    → Permanent result presentation (survives tab switches, blur, window minimization)
 *               Only cleared when the user explicitly clicks "Try New News".
 */

document.addEventListener('DOMContentLoaded', () => {
  initNewsTest();
});

function initNewsTest() {
  // DOM Elements
  const articleInput = document.getElementById('articleTextInput');
  const charCounter = document.getElementById('charCounter');
  const validationMsg = document.getElementById('validationMsg');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const clearBtn = document.getElementById('clearBtn');

  const loadingSection = document.getElementById('loadingSection');
  const loadingStepText = document.getElementById('loadingStepText');

  const resultSection = document.getElementById('resultSection');
  const verdictBadge = document.getElementById('verdictBadge');
  const confidenceValue = document.getElementById('confidenceValue');
  const confidenceFill = document.getElementById('confidenceFill');
  const whyResultText = document.getElementById('whyResultText');
  const tryNewNewsBtn = document.getElementById('tryNewNewsBtn');

  const errorSection = document.getElementById('errorSection');
  const errorMessage = document.getElementById('errorMessage');

  const openFeedbackBtn = document.getElementById('openFeedbackBtn');
  const feedbackModal = document.getElementById('feedbackModal');
  const closeFeedbackModalBtn = document.getElementById('closeFeedbackModalBtn');
  const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');

  // Internal State
  let isAnalyzing = false;
  let activePredictionId = null;
  let stepTimer = null;

  const STORAGE_KEY = 'verifai_news_test_state';

  const ANALYSIS_STEPS = [
    'Reading article content...',
    'Analyzing language patterns...',
    'Comparing learned patterns...',
    'Preparing prediction...'
  ];

  // Storage Helpers for persistent result survival across tab discarding/reloads
  function saveState(data, text) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        data,
        text,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function getSavedState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSavedState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  // 1. Character Counter
  function updateCharacterCount() {
    if (!articleInput || !charCounter) return;
    const count = articleInput.value.length;
    charCounter.textContent = `${count} character${count === 1 ? '' : 's'}`;
  }

  articleInput?.addEventListener('input', () => {
    updateCharacterCount();
    if (validationMsg && validationMsg.style.display !== 'none') {
      validationMsg.style.display = 'none';
      validationMsg.textContent = '';
    }
  });

  // 2. Loading Step Messages
  function startStepAnimation() {
    stopStepAnimation();
    let currentStep = 0;
    if (loadingStepText) {
      loadingStepText.textContent = ANALYSIS_STEPS[0];
    }

    stepTimer = setInterval(() => {
      currentStep++;
      if (currentStep < ANALYSIS_STEPS.length) {
        if (loadingStepText) {
          loadingStepText.textContent = ANALYSIS_STEPS[currentStep];
        }
      } else {
        clearInterval(stepTimer);
        stepTimer = null;
      }
    }, 400);
  }

  function stopStepAnimation() {
    if (stepTimer) {
      clearInterval(stepTimer);
      stepTimer = null;
    }
  }

  // 3. Render Completed Result (State: RESULT)
  function renderResult(data, submittedText, animate = true) {
    if (!resultSection) return;

    activePredictionId = data.prediction_id || null;
    const isReal = (data.prediction || '').toLowerCase() === 'real';

    // 1. Verdict Badge
    if (verdictBadge) {
      verdictBadge.className = `verdict-badge ${isReal ? 'real' : 'fake'}`;
      verdictBadge.textContent = isReal ? 'REAL' : 'FAKE';
    }

    // 2. Confidence Metric
    const confVal = Math.max(0, Math.min(100, Number(data.confidence) || 0));
    if (confidenceValue) {
      confidenceValue.textContent = `${confVal.toFixed(1)}%`;
    }

    // 3. Why this result? — Factual model-based pattern attribution
    if (whyResultText) {
      if (isReal) {
        whyResultText.textContent =
          'The submitted text contains language and patterns that were more similar to real-news examples learned during model training.';
      } else {
        whyResultText.textContent =
          'The submitted text contains language and patterns that were more similar to fake-news examples learned during model training.';
      }
    }

    // 4. Reveal Result Section
    resultSection.style.display = 'block';

    // 5. Progress bar width
    if (confidenceFill) {
      if (animate) {
        confidenceFill.style.width = '0%';
        requestAnimationFrame(() => {
          confidenceFill.style.width = `${confVal.toFixed(1)}%`;
        });
      } else {
        confidenceFill.style.width = `${confVal.toFixed(1)}%`;
      }
    }

    // 6. Persist to session storage so switching tabs or browser discarding never loses it
    saveState(data, submittedText);
  }

  // 4. Reset to Initial State (State: INITIAL)
  // ONLY triggered when the user explicitly clicks "Try New News" or "Clear"
  function resetToInitialState() {
    clearSavedState();
    activePredictionId = null;
    stopStepAnimation();

    // 1. Hide result
    if (resultSection) resultSection.style.display = 'none';

    // 2. Clear article textarea
    if (articleInput) articleInput.value = '';

    // 3. Reset character count
    updateCharacterCount();

    // 4. Clear explanation & confidence
    if (whyResultText) whyResultText.textContent = '';
    if (confidenceValue) confidenceValue.textContent = '0.0%';
    if (confidenceFill) confidenceFill.style.width = '0%';

    // 5. Remove loading & error states
    if (loadingSection) loadingSection.style.display = 'none';
    if (errorSection) errorSection.style.display = 'none';
    if (validationMsg) {
      validationMsg.style.display = 'none';
      validationMsg.textContent = '';
    }

    // 6. Enable Analyze News again & focus textarea
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze News';
    }
    if (clearBtn) {
      clearBtn.disabled = false;
    }

    articleInput?.focus();
  }

  // "Try New News" button handler
  tryNewNewsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitialState();
  });

  // Secondary Clear button handler for initial input state
  clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAnalyzing) return;
    resetToInitialState();
  });

  // 5. Primary Analysis Trigger
  async function runAnalysis() {
    if (isAnalyzing) return;

    const text = articleInput?.value.trim() || '';

    // Validate minimum input
    if (!text || text.length < 15) {
      if (validationMsg) {
        validationMsg.textContent = 'Please enter at least 15 characters of article text.';
        validationMsg.style.display = 'block';
      }
      articleInput?.focus();
      return;
    }

    // Transition to ANALYZING state
    if (validationMsg) validationMsg.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    if (errorSection) errorSection.style.display = 'none';
    if (confidenceFill) confidenceFill.style.width = '0%';

    isAnalyzing = true;
    if (analyzeBtn) {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analyzing...';
    }
    if (clearBtn) {
      clearBtn.disabled = true;
    }

    if (loadingSection) loadingSection.style.display = 'block';
    startStepAnimation();

    const minStepDelay = new Promise((resolve) => setTimeout(resolve, 1400));
    const apiCall = window.VerifaiAPI.predictText(text);

    try {
      const [_, response] = await Promise.all([minStepDelay, apiCall]);
      const data = response?.data;

      if (!data || !data.prediction) {
        throw new Error('Prediction service returned an incomplete response.');
      }

      // Hide loading
      stopStepAnimation();
      if (loadingSection) loadingSection.style.display = 'none';

      // Transition to RESULT state
      renderResult(data, text, true);

    } catch (err) {
      stopStepAnimation();
      if (loadingSection) loadingSection.style.display = 'none';

      if (errorSection) {
        if (errorMessage) {
          errorMessage.textContent = err.message || 'Please check your connection and try again.';
        }
        errorSection.style.display = 'block';
      }
    } finally {
      isAnalyzing = false;
      if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze News';
      }
      if (clearBtn) {
        clearBtn.disabled = false;
      }
    }
  }

  analyzeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    runAnalysis();
  });

  // 6. Tab Switching & Page Visibility Guard
  // Ensures that when the user switches tabs, minimizes the browser, or returns,
  // the completed result is NEVER hidden.
  function ensureActiveResultVisible() {
    const saved = getSavedState();
    if (saved && saved.data) {
      if (resultSection && resultSection.style.display !== 'block') {
        if (articleInput && !articleInput.value) {
          articleInput.value = saved.text || '';
          updateCharacterCount();
        }
        renderResult(saved.data, saved.text || '', false);
      }
    }
  }

  // Restore on initial load if user already had an active prediction in this session
  const existingSaved = getSavedState();
  if (existingSaved && existingSaved.data) {
    if (articleInput && !articleInput.value) {
      articleInput.value = existingSaved.text || '';
    }
    updateCharacterCount();
    renderResult(existingSaved.data, existingSaved.text || '', false);
  } else {
    updateCharacterCount();
  }

  // Re-verify on tab focus / visibilitychange / pageshow
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ensureActiveResultVisible();
    }
  });

  window.addEventListener('pageshow', () => {
    ensureActiveResultVisible();
  });

  // 7. Feedback Modal Handlers (Discrepancy Reporting)
  openFeedbackBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (feedbackModal) feedbackModal.classList.add('open');
  });

  const closeFeedbackModal = (e) => {
    if (e) e.preventDefault();
    if (feedbackModal) feedbackModal.classList.remove('open');
  };

  closeFeedbackModalBtn?.addEventListener('click', closeFeedbackModal);
  cancelFeedbackBtn?.addEventListener('click', closeFeedbackModal);

  submitFeedbackBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!activePredictionId) {
      showToast('No active prediction to report.', 'error');
      closeFeedbackModal();
      return;
    }

    const actualLabel = document.getElementById('feedbackActualLabel')?.value || 'Real';
    const comment = document.getElementById('feedbackComment')?.value.trim() || '';

    submitFeedbackBtn.disabled = true;
    submitFeedbackBtn.textContent = 'Submitting...';

    try {
      await window.VerifaiAPI.submitFeedback(activePredictionId, actualLabel, comment);
      showToast('Report submitted successfully.', 'success');
      closeFeedbackModal();
      const commentInput = document.getElementById('feedbackComment');
      if (commentInput) commentInput.value = '';
    } catch (err) {
      showToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      submitFeedbackBtn.disabled = false;
      submitFeedbackBtn.textContent = 'Submit';
    }
  });
}
