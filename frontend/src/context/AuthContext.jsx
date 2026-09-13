import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('bps_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetchApi('/auth/me')
      .then(res => {
        if (res.success && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        localStorage.removeItem('bps_token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (identifier, password) => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });

    if (res.success && res.token) {
      localStorage.setItem('bps_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const signup = async (data) => {
    const res = await fetchApi('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (res.success && res.token) {
      localStorage.setItem('bps_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const adminLogin = async (email, password) => {
    const res = await fetchApi('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.success && res.token) {
      localStorage.setItem('bps_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('bps_token');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
        isSuperAdmin: user?.role === 'super_admin',
        isDelivery: user?.role === 'delivery',
        login,
        adminLogin,
        signup,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
