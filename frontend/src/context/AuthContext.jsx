import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getAccessToken, getSavedUser, clearAuthData } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getSavedUser());
  const [loading, setLoading] = useState(true);

  // Sync profile from backend if access token is present
  const checkAuth = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.warn('[VerifAI Auth] Could not fetch current profile:', err);
      // If 401 or invalid token, clean up
      if (err.status === 401) {
        clearAuthData();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      setUser(getSavedUser());
    };

    window.addEventListener('verifai_auth_change', handleAuthChange);
    return () => {
      window.removeEventListener('verifai_auth_change', handleAuthChange);
    };
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setUser(res.user);
    return res;
  };

  const signup = async (name, email, password) => {
    const res = await api.register(name, email, password);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearAuthData();
      setUser(null);
      window.dispatchEvent(new CustomEvent('verifai_user_logout'));
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user && getAccessToken()),
    login,
    signup,
    logout,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
