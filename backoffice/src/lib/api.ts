const API_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('bo_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('bo_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

export function setToken(token: string) {
  localStorage.setItem('bo_token', token);
}

export function getToken() {
  return localStorage.getItem('bo_token');
}

export function clearToken() {
  localStorage.removeItem('bo_token');
}

export function isAuthenticated() {
  return !!getToken();
}
