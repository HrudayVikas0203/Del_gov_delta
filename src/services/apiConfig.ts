export const PRODUCTION_API_BASE_URL = 'https://del-gov-delta.onrender.com';

export function resolveApiBaseUrl(rawUrl: string | undefined, isDev: boolean): string {
  const configured = rawUrl?.trim();
  if (!configured) {
    return isDev ? 'http://127.0.0.1:8000' : PRODUCTION_API_BASE_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error('VITE_API_URL must be an absolute HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('VITE_API_URL must use HTTP or HTTPS.');
  }
  if (!isDev && parsed.protocol !== 'https:') {
    throw new Error('VITE_API_URL must use HTTPS in production.');
  }

  const normalized = configured.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return normalized;
}

export function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api/v1${normalizedPath}`;
}

export function isRetryableMethod(method: string | undefined): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes((method || 'GET').toUpperCase());
}

export function shouldClearAuthentication(status: number): boolean {
  return status === 401;
}
