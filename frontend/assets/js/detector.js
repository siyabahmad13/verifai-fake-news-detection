/**
 * VerifAI — News Detector Controller
 * Handles article text & URL ingestion, ML inference via API, and feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDetector();
});

let currentMode = 'text'; // 'text' | 'url'
let activePredictionRecord = null;

function initDetector() {
  const tabTextBtn = document.getElementById('tabTextBtn');
  const tabUrlBtn = document.getElementById('tabUrlBtn');
  const textModeContainer = document.getElementById('textModeContainer');
  const urlModeContainer = document.getElementById('urlModeContainer');

  const headlineInput = document.getElementById('headlineInput');
  const articleTextInput = document.getElementById('articleTextInput');
  const articleUrlInput = document.getElementById('articleUrlInput');
  const charWordCounter = document.getElementById('charWordCounter');
  const clearInputBtn = document.getElementById('clearInputBtn');

  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultCard = document.getElementById('resultCard');
  const resetAnalysisBtn = document.getElementById('resetAnalysisBtn');

  const openFeedbackModalBtn = document.getElementById('openFeedbackModalBtn');
  const feedbackModal = document.getElementById('feedbackModal');
  const closeFeedbackModalBtn = document.getElementById('closeFeedbackModalBtn');
  const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');

  // Mode Tabs Switching
  tabTextBtn?.addEventListener('click', () => {
    currentMode = 'text';
    tabTextBtn.classList.add('active');
    tabUrlBtn?.classList.remove('active');
    if (textModeContainer) textModeContainer.style.display = 'block';
    if (urlModeContainer) urlModeContainer.style.display = 'none';
  });

  tabUrlBtn?.addEventListener('click', () => {
    currentMode = 'url';
    tabUrlBtn.classList.add('active');
    tabTextBtn?.classList.remove('active');
    if (urlModeContainer) urlModeContainer.style.display = 'block';
    if (textModeContainer) textModeContainer.style.display = 'none';
  });

  // Word & Character Counter
  const updateCounts = () => {
    if (!articleTextInput || !charWordCounter) return;
    const text = articleTextInput.value.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = articleTextInput.value.length;
    charWordCounter.textContent = `${words} words • ${chars} characters`;
  };

  articleTextInput?.addEventListener('input', updateCounts);

  // Clear Input
  clearInputBtn?.addEventListener('click', () => {
    if (headlineInput) headlineInput.value = '';
    if (articleTextInput) articleTextInput.value = '';
    if (articleUrlInput) articleUrlInput.value = '';
    updateCounts();
    if (resultCard) resultCard.style.display = 'none';
    showToast('Input cleared.', 'info');
  });

  // Reset / Analyze Another
  resetAnalysisBtn?.addEventListener('click', () => {
    if (resultCard) resultCard.style.display = 'none';
    if (currentMode === 'text') {
      articleTextInput?.focus();
    } else {
      articleUrlInput?.focus();
    }
  });

  // Run Inference / Prediction
  analyzeBtn?.addEventListener('click', async () => {
    let payloadText = '';
    let payloadHeadline = '';
    let payloadUrl = '';

    if (currentMode === 'text') {
      payloadText = articleTextInput?.value.trim() || '';
      payloadHeadline = headlineInput?.value.trim() || '';

      if (payloadText.length < 15) {
        showToast('Please enter at least 15 characters of article text.', 'error');
        articleTextInput?.focus();
        return;
      }
    } else {
      payloadUrl = articleUrlInput?.value.trim() || '';
      if (!payloadUrl || !payloadUrl.startsWith('http')) {
        showToast('Please enter a valid HTTP or HTTPS article URL.', 'error');
        articleUrlInput?.focus();
        return;
      }
    }

    // Set Loading State
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing content...';

    try {
      let responseData = null;

      if (currentMode === 'text') {
        const res = await window.VerifaiAPI.predictText(payloadText, payloadHeadline);
        responseData = res.data;
      } else {
        const res = await window.VerifaiAPI.predictUrl(payloadUrl);
        responseData = res.data;
      }

      if (!responseData) {
        throw new Error('Prediction service returned an empty response.');
      }

      activePredictionRecord = responseData;
      renderResult(responseData, currentMode === 'text' ? payloadText : payloadUrl);

      // Record to client history storage
      const record = {
        id: responseData.prediction_id || `scan-${Date.now().toString().slice(-4)}`,
        timestamp: responseData.created_at || new Date().toISOString(),
        headline: responseData.headline || (currentMode === 'text' ? payloadText.slice(0, 70) : payloadUrl),
        verdict: responseData.prediction,
        confidence: responseData.confidence,
        input_type: currentMode,
        word_count: responseData.word_count || 0
      };
      saveScanRecord(record);

      showToast(`Analysis complete: Classified as ${responseData.prediction}.`, 'success');

      // Scroll to result smoothly
      resultCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      console.error('Prediction failed:', err);
      showToast(err.message || 'Failed to complete analysis. Ensure backend is running.', 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze';
    }
  });

  // Render Result in UI
  function renderResult(data, contentPreview) {
    if (!resultCard) return;

    const verdictBadge = document.getElementById('verdictBadge');
    const confidenceVal = document.getElementById('confidenceVal');
    const detailSource = document.getElementById('detailSource');
    const detailWords = document.getElementById('detailWords');
    const detailModel = document.getElementById('detailModel');
    const analyzedPreview = document.getElementById('analyzedPreview');

    const isReal = (data.prediction || '').toLowerCase() === 'real';

    if (verdictBadge) {
      verdictBadge.className = `verdict-badge ${isReal ? 'real' : 'fake'}`;
      verdictBadge.textContent = isReal ? 'Likely Real' : 'Likely Fake';
    }

    if (confidenceVal) {
      const confNum = Number(data.confidence) || 0;
      confidenceVal.textContent = `${confNum.toFixed(1)}%`;
    }

    if (detailSource) {
      detailSource.textContent = (data.input_type || currentMode).toUpperCase();
    }

    if (detailWords) {
      detailWords.textContent = `${data.word_count || 0} words`;
    }

    if (detailModel) {
      detailModel.textContent = data.model_version || 'v1-baseline';
    }

    if (analyzedPreview) {
      analyzedPreview.textContent = contentPreview || data.headline || 'No preview available.';
    }

    resultCard.style.display = 'block';
  }

  // Feedback Modal Handlers
  openFeedbackModalBtn?.addEventListener('click', () => {
    if (feedbackModal) feedbackModal.classList.add('open');
  });

  const closeFeedback = () => {
    if (feedbackModal) feedbackModal.classList.remove('open');
  };

  closeFeedbackModalBtn?.addEventListener('click', closeFeedback);
  cancelFeedbackBtn?.addEventListener('click', closeFeedback);

  submitFeedbackBtn?.addEventListener('click', async () => {
    if (!activePredictionRecord || !activePredictionRecord.prediction_id) {
      showToast('No active prediction record to report.', 'error');
      closeFeedback();
      return;
    }

    const actualLabel = document.getElementById('feedbackActualLabel')?.value || 'Real';
    const comment = document.getElementById('feedbackComment')?.value.trim() || '';

    submitFeedbackBtn.disabled = true;
    submitFeedbackBtn.textContent = 'Submitting...';

    try {
      await window.VerifaiAPI.submitFeedback(
        activePredictionRecord.prediction_id,
        actualLabel,
        comment
      );
      showToast('Thank you. Discrepancy report recorded successfully.', 'success');
      closeFeedback();
      const commentInput = document.getElementById('feedbackComment');
      if (commentInput) commentInput.value = '';
    } catch (err) {
      showToast(err.message || 'Failed to submit feedback.', 'error');
    } finally {
      submitFeedbackBtn.disabled = false;
      submitFeedbackBtn.textContent = 'Submit Report';
    }
  });
}
