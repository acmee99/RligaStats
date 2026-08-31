import React, { createContext, useContext, useEffect, useState } from 'react';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, getMe, login as loginRequest } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const clearAuth = () => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  };

  useEffect(() => {
    const restore = async () => {
      const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const response = await getMe();
        setUser(response.data);
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data));
      } catch {
        clearAuth();
      } finally {
        setReady(true);
      }
    };
    restore();

    const onLogout = () => clearAuth();
    window.addEventListener('rliga-auth-logout', onLogout);
    return () => window.removeEventListener('rliga-auth-logout', onLogout);
  }, []);

  const login = async (loginValue, password) => {
    const response = await loginRequest(loginValue, password);
    sessionStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: !!user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
