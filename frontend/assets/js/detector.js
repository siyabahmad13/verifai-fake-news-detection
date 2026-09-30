/**
 * VerifAI — News Test Controller (Rebuilt from scratch)
 * Single, deterministic event flow for ML news classification.
 * Completely independent, eliminates all disappearing-result bugs.
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

  const ANALYSIS_STEPS = [
    'Reading article content...',
    'Analyzing language patterns...',
    'Comparing learned patterns...',
    'Preparing prediction...'
  ];

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

  // 2. Clear Action
  clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAnalyzing) return;

    if (articleInput) articleInput.value = '';
    updateCharacterCount();

    if (validationMsg) {
      validationMsg.style.display = 'none';
      validationMsg.textContent = '';
    }

    stopStepAnimation();
    if (loadingSection) loadingSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    if (confidenceFill) confidenceFill.style.width = '0%';
    if (errorSection) errorSection.style.display = 'none';

    activePredictionId = null;
    articleInput?.focus();
  });

  // 3. Step Message Animation
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

  // 4. Primary Analysis Execution
  async function runAnalysis() {
    if (isAnalyzing) return;

    const text = articleInput?.value.trim() || '';

    // Validation
    if (!text || text.length < 15) {
      if (validationMsg) {
        validationMsg.textContent = 'Please enter at least 15 characters of article text.';
        validationMsg.style.display = 'block';
      }
      articleInput?.focus();
      return;
    }

    // Reset previous outcome states
    if (validationMsg) validationMsg.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    if (errorSection) errorSection.style.display = 'none';
    if (confidenceFill) confidenceFill.style.width = '0%';

    // Engage analyzing state
    isAnalyzing = true;
    if (analyzeBtn) {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analyzing...';
    }
    if (clearBtn) {
      clearBtn.disabled = true;
    }

    // Show loading state and begin steps
    if (loadingSection) loadingSection.style.display = 'block';
    startStepAnimation();

    // Natural step pacing combined with live Django ML inference
    const minStepDelay = new Promise((resolve) => setTimeout(resolve, 1400));
    const apiCall = window.VerifaiAPI.predictText(text);

    try {
      const [_, response] = await Promise.all([minStepDelay, apiCall]);
      const data = response?.data;

      if (!data || !data.prediction) {
        throw new Error('Prediction service returned an incomplete response.');
      }

      // Hide loading state
      stopStepAnimation();
      if (loadingSection) loadingSection.style.display = 'none';

      // Render persistent result
      renderResult(data);

    } catch (err) {
      stopStepAnimation();
      if (loadingSection) loadingSection.style.display = 'none';

      // Display clean error state
      if (errorSection) {
        if (errorMessage) {
          errorMessage.textContent = err.message || 'Please check your connection and try again.';
        }
        errorSection.style.display = 'block';
      }
    } finally {
      // Re-enable controls
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

  // Single click listener on Analyze button
  analyzeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    runAnalysis();
  });

  // 5. Render Result (Permanently visible until next analysis or user clicks Clear)
  function renderResult(data) {
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

    // 3. Why this result? — Factual explanation based on model training data
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

    // 5. Animate Horizontal Confidence Progress Bar
    if (confidenceFill) {
      confidenceFill.style.width = '0%';
      requestAnimationFrame(() => {
        confidenceFill.style.width = `${confVal.toFixed(1)}%`;
      });
    }
  }

  // 6. Feedback Modal Handlers (Discrepancy Reporting)
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
