const API_PREFIX = '/api';

function normalizePath(path: string) {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
}

export function toApiUrl(path: string) {
  return `${API_PREFIX}${normalizePath(path)}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(toApiUrl(path), init);
}

export async function apiFetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Request failed');
  }
  return data as T;
}
