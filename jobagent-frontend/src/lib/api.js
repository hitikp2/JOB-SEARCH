const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://finance-tracker-app-production-4dec.up.railway.app/api';

export async function api(path, opts = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('ja_token');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Upload file via multipart/form-data (no JSON Content-Type)
export async function apiUpload(path, formData) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('ja_token');
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ja_token');
  }
  return null;
}

export function setToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ja_token', token);
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ja_token');
  }
}
