import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = window.API_BASE;

const PUBLIC_AUTH_PATHS = [
  '/api/login',
  '/api/login/biometric',
  '/api/register',
  '/api/forgot-password',
  '/api/register/send-otp',
  '/api/register/verify-otp',
];

const isPublicAuthRequest = (url = '') =>
  PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(({ sessionExpired: expired = false } = {}) => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (expired) {
      setSessionExpired(true);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const login = (userData, token) => {
    setSessionExpired(false);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  // Restore session from stored token on app load / refresh
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setSessionExpired(true);
        } else if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Clear session only when the server rejects an authenticated request (expired/invalid token)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const requestUrl = error.config?.url || '';
        if (
          error.response?.status === 401 &&
          !isPublicAuthRequest(requestUrl) &&
          localStorage.getItem('token')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setSessionExpired(true);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        loading,
        sessionExpired,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
