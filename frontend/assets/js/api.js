/**
 * VERIFAI — Unified REST API Client
 * Provides seamless bridge between frontend interfaces and the Django REST backend.
 * Features automated token management, graceful offline fallback, and structured error handling.
 */

const VerifaiAPI = (() => {
  // Base configuration - Exclusively use IPv4 127.0.0.1 to avoid Windows localhost IPv6 connect failures
  const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';
  
  function getBaseUrl() {
    let url = window.VERIFAI_API_URL || localStorage.getItem('verifai_api_url') || DEFAULT_BASE_URL;
    if (url.includes('localhost:8000')) {
      url = url.replace('localhost:8000', '127.0.0.1:8000');
    }
    return url;
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

    console.log('[NETWORK] Fetching:', url, options.method || 'GET');
    try {
      const startTime = performance.now();
      const response = await fetch(url, {
        ...options,
        headers,
      });
      const duration = (performance.now() - startTime).toFixed(1);
      console.log(`[NETWORK] Received response in ${duration}ms:`, response.status, response.statusText);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('[NETWORK] Non-OK response:', response.status, data);
        // Handle 401 Unauthorized token expiry
        if (response.status === 401 && getTokens().refresh) {
          console.log('[NETWORK] Attempting token refresh on 401...');
          const refreshed = await refreshToken();
          if (refreshed) {
            console.log('[NETWORK] Token refreshed, retrying initial request...');
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
      console.error('[NETWORK EXCEPTION]:', err.name, err.message);
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
     * Predict authenticity of raw text.
     * Resilient to stale/expired tokens: if 401 occurs, retries anonymously without breaking prediction.
     */
    async predictText(text, headline = '') {
      try {
        return await request('/predictions/predict/', {
          method: 'POST',
          body: JSON.stringify({ text, headline }),
        });
      } catch (err) {
        // If the request fails with 401 (e.g. stale/expired JWT token),
        // retry the prediction request without the Authorization header since
        // the prediction endpoint allows unauthenticated requests (AllowAny).
        if (err.status === 401) {
          console.warn('[NETWORK] 401 received on prediction endpoint. Retrying anonymously without Authorization header...');
          const url = `${getBaseUrl()}/predictions/predict/`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ text, headline }),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            const errorMessage = data?.message || data?.detail || `HTTP ${response.status}: Request failed`;
            const retryErr = new Error(errorMessage);
            retryErr.status = response.status;
            retryErr.data = data;
            throw retryErr;
          }

          return data;
        }
        throw err;
      }
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
     * Submit prediction feedback / discrepancy report
     */
    async submitFeedback(predictionId, actualLabel, comment = '') {
      return request('/feedback/', {
        method: 'POST',
        body: JSON.stringify({
          prediction_id: predictionId,
          actual_label: actualLabel,
          comment: comment,
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
      if (data?.data?.tokens?.access) {
        setTokens(data.data.tokens.access, data.data.tokens.refresh);
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
      const data = await request('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (data?.data?.tokens?.access) {
        setTokens(data.data.tokens.access, data.data.tokens.refresh);
        if (data.data.user) {
          localStorage.setItem('verifai_user', JSON.stringify(data.data.user));
        }
      }
      return data;
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
