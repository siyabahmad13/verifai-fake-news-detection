/**
 * VerifAI — News Test Controller
 * Handles article submission, ML inference via Django API, and result presentation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDetector();
});

let activePredictionRecord = null;

function initDetector() {
  const headlineInput = document.getElementById('headlineInput');
  const articleTextInput = document.getElementById('articleTextInput');
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
    updateCounts();
    if (resultCard) resultCard.style.display = 'none';
  });

  // Reset / Analyze Another
  resetAnalysisBtn?.addEventListener('click', () => {
    if (resultCard) resultCard.style.display = 'none';
    articleTextInput?.focus();
  });

  // Run Inference / Prediction
  analyzeBtn?.addEventListener('click', async () => {
    const text = articleTextInput?.value.trim() || '';
    const headline = headlineInput?.value.trim() || '';

    if (!text || text.length < 15) {
      showToast('Please enter at least 15 characters of article text.', 'error');
      articleTextInput?.focus();
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    try {
      const res = await window.VerifaiAPI.predictText(text, headline);
      const data = res?.data;

      if (!data) {
        throw new Error('Prediction API returned an empty response.');
      }

      activePredictionRecord = data;
      renderResult(data);
      showToast(`Analysis complete: ${data.prediction.toUpperCase()}.`, 'success');
      resultCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      showToast(err.message || 'Analysis failed. Please check backend connection.', 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze News';
    }
  });

  // Render Result in UI
  function renderResult(data) {
    if (!resultCard) return;

    const verdictBadge = document.getElementById('verdictBadge');
    const confidenceVal = document.getElementById('confidenceVal');

    const isReal = (data.prediction || '').toLowerCase() === 'real';

    if (verdictBadge) {
      verdictBadge.className = `verdict-badge ${isReal ? 'real' : 'fake'}`;
      verdictBadge.textContent = isReal ? 'REAL' : 'FAKE';
    }

    if (confidenceVal) {
      const confNum = Number(data.confidence) || 0;
      confidenceVal.textContent = `${confNum.toFixed(1)}%`;
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
      showToast('No active prediction to report.', 'error');
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
      showToast('Report submitted successfully.', 'success');
      closeFeedback();
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
