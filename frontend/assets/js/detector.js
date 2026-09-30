/**
 * VerifAI — News Test Controller
 * Handles article submission, loading feedback, ML inference via Django API,
 * dynamic explanations, and persistent result presentation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDetector();
});

let activePredictionRecord = null;

function initDetector() {
  const articleTextInput = document.getElementById('articleTextInput');
  const charWordCounter = document.getElementById('charWordCounter');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingCard = document.getElementById('loadingCard');
  const resultCard = document.getElementById('resultCard');
  const verdictBadge = document.getElementById('verdictBadge');
  const confidenceVal = document.getElementById('confidenceVal');
  const explanationText = document.getElementById('explanationText');

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
    if (loadingCard) loadingCard.style.display = 'none';
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

    // 1. Immediately activate analysis loading state
    if (analyzeBtn) {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analyzing...';
    }

    // Hide any previous result and display the subtle loading indicator
    if (resultCard) resultCard.style.display = 'none';
    if (loadingCard) loadingCard.style.display = 'flex';

    try {
      // 2. Query Django prediction API
      const res = await window.VerifaiAPI.predictText(text);
      const data = res?.data;

      if (!data) {
        throw new Error('Prediction API returned an empty response.');
      }

      activePredictionRecord = data;

      // 3. Remove loading state and display persistent result
      if (loadingCard) loadingCard.style.display = 'none';
      renderResult(data);

    } catch (err) {
      if (loadingCard) loadingCard.style.display = 'none';
      showToast(err.message || 'Analysis failed. Please check backend connection.', 'error');
    } finally {
      if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze News';
      }
    }
  }

  // Intercept analyze button click
  analyzeBtn?.addEventListener('click', performAnalysis);

  // Render Result in UI - Stays permanently until next analysis or user clicks Clear
  function renderResult(data) {
    if (!resultCard || !verdictBadge || !confidenceVal || !explanationText) return;

    const isReal = (data.prediction || '').toLowerCase() === 'real';

    // 1. Prediction Verdict Badge
    verdictBadge.className = `verdict-badge ${isReal ? 'real' : 'fake'}`;
    verdictBadge.textContent = isReal ? 'REAL' : 'FAKE';

    // 2. Confidence Metric
    const confNum = Number(data.confidence) || 0;
    confidenceVal.textContent = `${confNum.toFixed(1)}%`;

    // 3. "Why this result?" Contextual Explanation
    if (isReal) {
      explanationText.textContent = 
        'This article was classified as Real because the language and text patterns in the submitted content were more similar to patterns learned from real-news examples in the training data.';
    } else {
      explanationText.textContent = 
        'This article was classified as Fake because the language and text patterns in the submitted content were more similar to patterns learned from fake-news examples in the training data.';
    }

    // 4. Reveal Result Card
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
