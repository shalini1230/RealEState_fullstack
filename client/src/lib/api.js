const BASE = 'http://localhost:3000';

function authHeaders() {
  const session = JSON.parse(localStorage.getItem('session') || 'null');
  return session?.access_token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    : { 'Content-Type': 'application/json' };
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.error || 'Request failed');
  return data;
}
