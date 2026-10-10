import { rememberExpiredSession } from '../components/Guards.jsx';
// One small wrapper around fetch: adds the login token and turns error replies into exceptions.
const TOKEN_KEY = 'vidyasutra.token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable: the session lasts until the tab is closed */ }
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Could not reach the server. Check your connection and try again.');
    this.status = status;
    this.body = body || {};
  }
}

const BASE = import.meta.env.VITE_API_URL || '';

// A short-lived cache for reads, so a page that was prefetched behind the
// navigation loader shows its data at once. Any write clears it.
const CACHE_MS = 4000;
const cache = new Map();
export const clearApiCache = () => cache.clear();

export function api(path, opts = {}) {
  const method = opts.method || 'GET';
  if (method !== 'GET' || opts.form) return request(path, opts);
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise.then((d) => (d == null ? d : structuredClone(d)));
  const promise = request(path, opts);
  cache.set(path, { at: Date.now(), promise });
  promise.catch(() => cache.delete(path));
  return promise.then((d) => (d == null ? d : structuredClone(d)));
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, null);
  }
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401) cache.clear();
    if (res.status === 401 && token) {
      rememberExpiredSession();
      setToken(null);
      window.dispatchEvent(new Event('vidyasutra:signed-out'));
    }
    throw new ApiError(res.status, data);
  }
  // Any change on the server can create alerts (new match, mismatch, status), so let the bell refresh.
  if (method !== 'GET') {
    cache.clear();
    window.dispatchEvent(new Event('vidyasutra:alerts-changed'));
  }
  return data;
}

// Fetches a document with the login token and returns an in-memory URL for previews.
// The caller revokes it with URL.revokeObjectURL when done.
export async function documentUrl(id) {
  const res = await fetch(`${BASE}/api/documents/${id}/file`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return URL.createObjectURL(await res.blob());
}

// Documents need the login token, so they are fetched and then opened from memory.
export async function openDocument(id) {
  const url = await documentUrl(id);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
