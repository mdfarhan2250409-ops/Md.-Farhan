/**
 * Unified Production API Client
 * - Environment-aware URL resolution (no hardcoded localhost/port)
 * - Safe response validation with strict JSON vs HTML detection
 * - Meaningful error messages for SPA fallback or reverse proxy misconfigurations
 */

const RAW_API_URL = import.meta.env.VITE_API_URL;
export const API_BASE_URL = RAW_API_URL ? String(RAW_API_URL).trim().replace(/\/+$/, '') : '';

/**
 * Resolves an API path to an absolute or domain-relative URL
 * - If path is already a full URL, returns it as-is
 * - If VITE_API_URL is configured (e.g. backend hosted on separate domain), prefixes with it
 * - Defaults to same-domain relative URL (e.g. /api/auth/forgot-password-request)
 */
export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

export interface ApiFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Safely executes an API fetch and validates that the response is JSON, not an HTML SPA fallback.
 */
export async function safeApiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiFetchResult<T>> {
  try {
    const targetUrl = resolveApiUrl(endpoint);
    const res = await fetch(targetUrl, options);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const text = await res.text();

    let parsedData: any = {};
    const trimmed = text.trim();
    const isHtml =
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<');

    if (isJson) {
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = {
          success: false,
          error: 'Failed to parse JSON response from server.'
        };
      }
    } else if (isHtml) {
      // Meaningful error when production server/reverse proxy returns index.html for API requests
      parsedData = {
        success: false,
        error: 'Production API is not responding correctly.'
      };
    } else {
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = {
          success: false,
          error: trimmed || `Request failed with HTTP status ${res.status}`
        };
      }
    }

    const isSuccess = res.ok && parsedData?.success !== false;
    return {
      ok: isSuccess,
      status: res.status,
      data: parsedData as T
    };
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: netErr?.message || 'Network request failed. Please check your internet connection.'
      } as unknown as T
    };
  }
}
