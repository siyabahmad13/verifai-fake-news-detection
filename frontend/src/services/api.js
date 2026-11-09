/**
 * VerifAI Centralized API Service
 * Enforces IPv4 (127.0.0.1) and handles stale token auto-retry on AllowAny prediction routes.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const TOKEN_KEY = 'verifai_access_token';
const REFRESH_KEY = 'verifai_refresh_token';
const USER_KEY = 'verifai_user';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const saveAuthData = (tokens, user) => {
  const previousUser = getSavedUser();
  if (previousUser && user && previousUser.id !== user.id) {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('[VerifAI API] Could not clear sessionStorage on account switch:', e);
    }
  }
  if (tokens?.access) localStorage.setItem(TOKEN_KEY, tokens.access);
  if (tokens?.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('[VerifAI API] Could not clear sessionStorage on logout:', e);
  }
};

export const getSavedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Low-level HTTP fetch wrapper
 */
async function request(endpoint, options = {}, { allowAnonymousFallback = false, isRetry = false } = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error('Unable to connect to VerifAI backend. Please ensure the server is running at ' + API_BASE_URL);
  }

  // Handle 401 Unauthorized
  if (response.status === 401 && !isRetry) {
    // If route allows anonymous fallback (such as AllowAny prediction endpoint)
    if (allowAnonymousFallback && token) {
      console.warn('[VerifAI API] 401 received with token on AllowAny endpoint. Retrying anonymously.');
      const headersWithoutAuth = { ...headers };
      delete headersWithoutAuth['Authorization'];
      return request(endpoint, { ...options, headers: headersWithoutAuth, skipAuth: true }, { isRetry: true });
    }

    // Otherwise attempt token refresh for authenticated routes
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccess = refreshData.access || refreshData.data?.access;
          if (newAccess) {
            localStorage.setItem(TOKEN_KEY, newAccess);
            headers['Authorization'] = `Bearer ${newAccess}`;
            return request(endpoint, { ...options, headers }, { isRetry: true });
          }
        }
      } catch (refreshErr) {
        console.warn('[VerifAI API] Token refresh failed:', refreshErr);
      }
    }

    // If refresh failed and this is a strictly authenticated route, clear auth
    if (!allowAnonymousFallback) {
      clearAuthData();
      window.dispatchEvent(new Event('verifai_auth_change'));
    }
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    // Log the actual Django error response body clearly to the browser console
    console.error(`[Django API Error ${response.status} at ${endpoint}]:`, JSON.stringify(payload));

    let detailedErrors = '';
    if (payload?.errors && typeof payload.errors === 'object') {
      const errorList = Object.entries(payload.errors).map(([field, msgs]) => {
        const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
        return field === 'non_field_errors' ? text : `${field}: ${text}`;
      });
      if (errorList.length > 0) {
        detailedErrors = errorList.join(' | ');
      }
    }

    const errorMsg =
      detailedErrors ||
      payload?.message ||
      payload?.detail ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = payload;
    error.errors = payload?.errors;
    throw error;
  }

  return payload;
}

export const api = {
  // Authentication
  async register(name, email, password) {
    const trimmedName = (name || '').trim();
    const nameParts = trimmedName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload = {
      name: trimmedName,
      first_name: firstName,
      last_name: lastName,
      email: (email || '').trim().toLowerCase(),
      password,
    };

    const res = await request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
    const tokens = res.data?.tokens;
    const user = res.data?.user;
    if (tokens && user) {
      saveAuthData(tokens, user);
    }
    return res.data;
  },

  async login(email, password) {
    const res = await request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    const tokens = res.data?.tokens;
    const user = res.data?.user;
    if (tokens && user) {
      saveAuthData(tokens, user);
    }
    return res.data;
  },

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await request('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch (e) {
      console.warn('[VerifAI API] Backend logout notification failed:', e);
    } finally {
      clearAuthData();
    }
  },

  async getMe() {
    const res = await request('/api/auth/me/');
    return res.data;
  },

  // Predictions (AllowAny: anonymous retry enabled)
  async predictText(text, headline = '') {
    const res = await request(
      '/api/predictions/predict/',
      {
        method: 'POST',
        body: JSON.stringify({ text, headline }),
      },
      { allowAnonymousFallback: true }
    );
    return res.data;
  },

  async predictUrl(url) {
    const res = await request(
      '/api/predictions/predict-url/',
      {
        method: 'POST',
        body: JSON.stringify({ url }),
      },
      { allowAnonymousFallback: true }
    );
    return res.data;
  },

  // History (Authenticated)
  async getHistory(page = 1) {
    const res = await request(`/api/predictions/history/?page=${page}`);
    return res.data;
  },

  async getPredictionDetail(id) {
    const res = await request(`/api/predictions/${id}/`);
    return res.data;
  },

  // Feedback (Authenticated)
  async submitFeedback(predictionId, actualLabel, comment = '') {
    const res = await request('/api/feedback/', {
      method: 'POST',
      body: JSON.stringify({
        prediction_id: predictionId,
        actual_label: actualLabel,
        comment,
      }),
    });
    return res.data;
  },

  async getFeedbackList() {
    const res = await request('/api/feedback/');
    return res.data;
  },

  // Stats (Authenticated)
  async getStats() {
    const res = await request('/api/predictions/stats/');
    return res.data;
  },

  // Filtered History (Authenticated)
  async getHistoryFiltered(page = 1, filters = {}) {
    const params = new URLSearchParams({ page });
    if (filters.prediction) params.append('prediction', filters.prediction);
    if (filters.search) params.append('search', filters.search);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    const res = await request(`/api/predictions/history/?${params.toString()}`);
    return res.data;
  },
};

export default api;
