export function normalizeApiBaseUrl(value) {
  const normalized = (value || '').trim().replace(/\/+$/, '');

  if (!normalized) return '';

  if (/(^|\/)api$/i.test(normalized)) {
    throw new Error(
      'VITE_API_BASE_URL must not end in /api; API paths already include that prefix.'
    );
  }

  return normalized;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
