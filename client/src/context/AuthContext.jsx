import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lotInfo, setLotInfo] = useState(null);

  const checkAuth = async () => {
    try {
      const data = await api.getMe();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadLotInfo = async () => {
    try {
      const data = await api.getLotInfo();
      if (data && data.lot) {
        setLotInfo(data.lot);
      }
    } catch (err) {
      console.warn('Failed to fetch lot info:', err);
    }
  };

  useEffect(() => {
    checkAuth();
    loadLotInfo();
  }, []);

  const loginDev = async (customUser) => {
    setLoading(true);
    try {
      const res = await api.devLogin(customUser);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        lotInfo,
        loginDev,
        logout,
        refreshAuth: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
