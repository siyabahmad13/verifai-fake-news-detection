/**
 * VERIFAI — Unified REST API Client
 * Provides seamless bridge between frontend interfaces and the Django REST backend.
 * Features automated token management, graceful offline fallback, and structured error handling.
 */

const VerifaiAPI = (() => {
  // Base configuration
  const DEFAULT_BASE_URL = 'http://localhost:8000/api';
  
  function getBaseUrl() {
    return window.VERIFAI_API_URL || localStorage.getItem('verifai_api_url') || DEFAULT_BASE_URL;
  }

  function getTokens() {
    return {
      access: localStorage.getItem('verifai_access_token'),
      refresh: localStorage.getItem('verifai_refresh_token'),
    };
  }

  function setTokens(access, refresh) {
    if (access) localStorage.setItem('verifai_access_token', access);
    if (refresh) localStorage.setItem('verifai_refresh_token', refresh);
  }

  function clearAuth() {
    localStorage.removeItem('verifai_access_token');
    localStorage.removeItem('verifai_refresh_token');
    localStorage.removeItem('verifai_user');
  }

  function getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const { access } = getTokens();
    if (access) {
      headers['Authorization'] = `Bearer ${access}`;
    }
    return headers;
  }

  /**
   * Generic Fetch Wrapper with JSON decoding and error wrapping
   */
  async function request(endpoint, options = {}) {
    const url = `${getBaseUrl()}${endpoint}`;
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle 401 Unauthorized token expiry
        if (response.status === 401 && getTokens().refresh) {
          const refreshed = await refreshToken();
          if (refreshed) {
            // Retry initial request once with refreshed token
            return request(endpoint, options);
          }
        }

        const errorMessage = data?.message || data?.detail || `HTTP ${response.status}: Request failed`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      // Re-throw with enriched offline flag if network failed completely
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const offlineErr = new Error('Backend service unavailable. Using local fallback engine.');
        offlineErr.isOffline = true;
        throw offlineErr;
      }
      throw err;
    }
  }

  /**
   * Attempt token refresh
   */
  async function refreshToken() {
    const { refresh } = getTokens();
    if (!refresh) return false;

    try {
      const res = await fetch(`${getBaseUrl()}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.access, data.refresh || refresh);
        return true;
      }
    } catch (e) {
      // Ignore refresh failure
    }
    clearAuth();
    return false;
  }

  /* ==========================================================================
     Public API Methods
     ========================================================================== */

  return {
    getBaseUrl,
    getTokens,
    setTokens,
    clearAuth,

    /**
     * Check if the backend REST server is reachable and model is loaded
     */
    async checkHealth() {
      try {
        const res = await fetch(`${getBaseUrl()}/health/`, { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          return await res.json();
        }
        return { status: 'unhealthy', online: false };
      } catch (e) {
        return { status: 'offline', online: false };
      }
    },

    /**
     * Predict authenticity of raw text
     */
    async predictText(text, headline = '') {
      return request('/predictions/predict/', {
        method: 'POST',
        body: JSON.stringify({ text, headline }),
      });
    },

    /**
     * Scrape URL and predict authenticity
     */
    async predictUrl(url) {
      return request('/predictions/predict-url/', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
    },

    /**
     * Fetch user prediction history
     */
    async getHistory(params = {}) {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/predictions/history/?${query}` : '/predictions/history/';
      return request(endpoint, { method: 'GET' });
    },

    /**
     * Get single prediction audit detail
     */
    async getPrediction(id) {
      return request(`/predictions/history/${id}/`, { method: 'GET' });
    },

    /**
     * Submit prediction feedback
     */
    async submitFeedback(predictionId, isAccurate, comment = '') {
      return request('/feedback/', {
        method: 'POST',
        body: JSON.stringify({
          prediction: predictionId,
          is_accurate: isAccurate,
          user_comment: comment,
        }),
      });
    },

    /**
     * User Authentication: Login
     */
    async login(email, password) {
      const data = await request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data?.data?.access) {
        setTokens(data.data.access, data.data.refresh);
        if (data.data.user) {
          localStorage.setItem('verifai_user', JSON.stringify(data.data.user));
        }
      }
      return data;
    },

    /**
     * User Authentication: Register
     */
    async register(userData) {
      return request('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    /**
     * Fetch current user profile
     */
    async getProfile() {
      return request('/auth/me/', { method: 'GET' });
    },
  };
})();

// Attach to window
window.VerifaiAPI = VerifaiAPI;
