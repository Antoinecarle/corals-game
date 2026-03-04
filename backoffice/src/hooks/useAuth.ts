import { useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../lib/api';

interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<Admin>('/auth/me')
      .then(setAdmin)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; admin: Admin }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setAdmin(res.admin);
    return res.admin;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
    window.location.href = '/login';
  }, []);

  return { admin, loading, login, logout, isAuthenticated: !!admin };
}
