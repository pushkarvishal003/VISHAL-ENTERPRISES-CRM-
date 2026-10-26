/**
 * Vishal Enterprises CRM - Frontend API Client
 * Automatically attaches session token and handles errors
 */

const TOKEN_KEY = 've_crm_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text();
    if (!response.ok || contentType.includes('text/html')) {
      throw new Error(`Endpoint returned non-JSON response (${response.status}): ${endpoint}`);
    }
    data = text;
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Bulletproof currency and number formatter for Indian Rupee (₹)
 * Never throws on undefined, null, or NaN
 */
export function formatINR(val?: number | string | null): string {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

/**
 * Safe date and time formatter
 * Never throws on undefined or invalid dates
 */
export function formatDate(val?: string | number | Date | null): string {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('en-IN');
  } catch {
    return String(val);
  }
}

