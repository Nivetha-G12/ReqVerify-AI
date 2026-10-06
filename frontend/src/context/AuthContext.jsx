import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5050/api';

  // simulatedRole feature removed — users see their actual assigned role

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let res;
    try {
      res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch (networkErr) {
      throw new Error('Unable to connect to the server. Please ensure the backend is running and try again.');
    }

    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(res.ok ? 'Unexpected server response' : `Server error (${res.status}). Please try again.`);
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  };

  const activeUser = user ? { ...user } : null;

  const value = {
    user: activeUser,
    actualUser: user,
    token,
    loading,
    login,
    logout,
    apiFetch,
    apiUrl: API_URL
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
