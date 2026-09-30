/**
 * VerifAI — News Test Controller
 * Handles article submission, ML inference via Django API, and persistent result presentation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDetector();
});

let activePredictionRecord = null;

function initDetector() {
  const form = document.getElementById('newsTestForm');
  const articleTextInput = document.getElementById('articleTextInput');
  const charWordCounter = document.getElementById('charWordCounter');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultCard = document.getElementById('resultCard');
  const verdictBadge = document.getElementById('verdictBadge');
  const confidenceVal = document.getElementById('confidenceVal');

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

  // Clear Input Button
  clearInputBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (articleTextInput) articleTextInput.value = '';
    updateCounts();
    if (resultCard) resultCard.style.display = 'none';
    activePredictionRecord = null;
    articleTextInput?.focus();
  });

  // Core Analysis Submission Function
  async function performAnalysis(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const text = articleTextInput?.value.trim() || '';

    if (!text || text.length < 15) {
      showToast('Please enter at least 15 characters of article text.', 'error');
      articleTextInput?.focus();
      return;
    }

    // Indicate loading state on button without hiding the previous result prematurely
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    try {
      const res = await window.VerifaiAPI.predictText(text);
      const data = res?.data;

      if (!data) {
        throw new Error('Prediction API returned an empty response.');
      }

      // Update active state
      activePredictionRecord = data;

      // Render Result permanently
      renderResult(data);

      showToast(`Analysis complete: ${data.prediction.toUpperCase()}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Analysis failed. Please check backend connection.', 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze News';
    }
  }

  // Intercept form submit and button click
  form?.addEventListener('submit', performAnalysis);
  analyzeBtn?.addEventListener('click', performAnalysis);

  // Render Result in UI - NEVER hides until manually cleared or new analysis completes
  function renderResult(data) {
    if (!resultCard || !verdictBadge || !confidenceVal) return;

    const isReal = (data.prediction || '').toLowerCase() === 'real';

    verdictBadge.className = `verdict-badge ${isReal ? 'real' : 'fake'}`;
    verdictBadge.textContent = isReal ? 'REAL' : 'FAKE';

    const confNum = Number(data.confidence) || 0;
    confidenceVal.textContent = `${confNum.toFixed(1)}%`;

    resultCard.style.display = 'block';
  }

  // Feedback Modal Handlers
  openFeedbackModalBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (feedbackModal) feedbackModal.classList.add('open');
  });

  const closeFeedback = (e) => {
    if (e) e.preventDefault();
    if (feedbackModal) feedbackModal.classList.remove('open');
  };

  closeFeedbackModalBtn?.addEventListener('click', closeFeedback);
  cancelFeedbackBtn?.addEventListener('click', closeFeedback);

  submitFeedbackBtn?.addEventListener('click', async (e) => {
    if (e) e.preventDefault();
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
