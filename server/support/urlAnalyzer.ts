import http from 'http';
import https from 'https';
import dns from 'dns';
import { URL } from 'url';
import net from 'net';

export interface FetchedUrlResult {
  success: boolean;
  url: string;
  normalizedUrl: string;
  isOtlUrl: boolean;
  otlResourceSlug?: string;
  title?: string;
  description?: string;
  textSnippet?: string;
  fullCleanText?: string;
  charCount?: number;
  statusCode?: number;
  contentType?: string;
  error?: string;
  requiresAuth?: boolean;
  cached?: boolean;
  fetchedAt: string;
}

interface CacheEntry {
  result: FetchedUrlResult;
  expiresAt: number;
}

const URL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Checks if an IP address is private, loopback, link-local, or reserved (SSRF protection).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  // Normalize IPv6-mapped IPv4 (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private-Use)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-Local, AWS/GCP metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private-Use: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;
    // 192.0.2.0/24 (Documentation / TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;
    // 192.168.0.0/16 (Private-Use)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Network benchmark tests)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (Documentation / TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;
    // 203.0.113.0/24 (Documentation / TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved for future use)
    if (a >= 240) return true;
    // 255.255.255.255/32 (Broadcast)
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // Unspecified
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
    // Unique local addresses (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local addresses (fe80::/10)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // IPv4-compatible IPv6
    if (lower.startsWith('::ffff:0:')) return true;

    return false;
  }

  return true;
}

/**
 * Validates hostname against known blacklisted domains and internal metadata endpoints.
 */
export function isBlacklistedHostname(hostname: string): boolean {
  if (!hostname) return true;
  const lower = hostname.toLowerCase().trim();

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localdomain') ||
    lower === 'metadata.google.internal' ||
    lower === 'metadata' ||
    lower === '169.254.169.254'
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a given URL belongs to Online Task Lab (OTL).
 */
export function isOtlWebsiteUrl(parsedUrl: URL): boolean {
  const host = parsedUrl.hostname.toLowerCase();
  if (
    host === 'onlinetasklab.com' ||
    host.endsWith('.onlinetasklab.com') ||
    host.includes('onlinetasklab')
  ) {
    return true;
  }

  // Current dev preview domain
  if (host.includes('.run.app') || host.includes('aistudio')) {
    return true;
  }

  return false;
}

/**
 * Extracts product/category slug or path from an OTL URL.
 */
export function extractOtlResourceSlug(parsedUrl: URL): string | undefined {
  const pathname = parsedUrl.pathname;
  // e.g. /product/capcut-pro or /resource/123 or /item/xyz
  const match = pathname.match(/\/(?:product|resource|item|preset|prompt|app|details)\/([^/?#]+)/i);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  // or direct slug if not root
  const trimmed = pathname.replace(/^\/|\/$/g, '');
  if (trimmed && !['about', 'contact', 'terms', 'privacy', 'search', 'admin', 'login'].includes(trimmed.toLowerCase())) {
    return decodeURIComponent(trimmed);
  }

  return undefined;
}

/**
 * Extracts all URLs found in a user's text message.
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];

  // Match http, https and bare domains like onlinetasklab.com/product/xxx
  const urlRegex = /\b(?:https?:\/\/)[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s)\]>]*)?/gi;
  const matches = text.match(urlRegex) || [];

  const unique = Array.from(new Set(matches.map(u => u.trim())));
  return unique;
}

/**
 * Resolves a hostname via DNS and ensures all resolved IP addresses are safe public addresses.
 */
async function resolveAndValidateDns(hostname: string): Promise<string> {
  if (isBlacklistedHostname(hostname)) {
    throw new Error(`Access to internal or reserved host "${hostname}" is prohibited.`);
  }

  // If already an IP
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Access to private/internal IP address "${hostname}" is prohibited.`);
    }
    return hostname;
  }

  try {
    const lookup = await dns.promises.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      throw new Error(`DNS resolution failed for hostname "${hostname}".`);
    }

    for (const record of lookup) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(`Host "${hostname}" resolved to private/internal IP "${record.address}", which is blocked for security.`);
      }
    }

    return lookup[0].address;
  } catch (err: any) {
    throw new Error(`DNS lookup error for "${hostname}": ${err.message}`);
  }
}

/**
 * HTML content cleaner: strips scripts, styles, SVGs, tags, and extracts clean readable text.
 */
export function extractCleanContentFromHtml(html: string): {
  title?: string;
  description?: string;
  cleanText: string;
} {
  let title: string | undefined;
  let description: string | undefined;

  // 1. Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // 2. Extract meta description
  const metaDescMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
    html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i) ||
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/i);
  if (metaDescMatch) {
    description = metaDescMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // 3. Strip dangerous & noise blocks
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // 4. Convert block elements to newlines
  text = text.replace(/<(?:p|div|section|article|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 5. Strip all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 6. Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // 7. Clean excessive blank lines and whitespace
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cleanText = lines.join('\n\n').trim();

  return {
    title,
    description,
    cleanText
  };
}

/**
 * Safely fetches a URL with SSRF checks, redirect follow, size limits, and timeout.
 */
export async function fetchAndAnalyzeUrl(rawUrl: string): Promise<FetchedUrlResult> {
  const trimmed = rawUrl.trim();

  // Check cache first
  const cached = URL_CACHE.get(trimmed);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.result,
      cached: true
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch (err: any) {
    return {
      success: false,
      url: trimmed,
      normalizedUrl: trimmed,
      isOtlUrl: false,
      error: `Invalid URL format: ${err.message}`,
      fetchedAt: new Date().toISOString()
    };
  }

  // Protocol enforcement: Only HTTP and HTTPS
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      success: false,
      url: trimmed,
      normalizedUrl: parsedUrl.href,
      isOtlUrl: false,
      error: `Unsupported protocol "${parsedUrl.protocol}". Only http:// and https:// are permitted.`,
      fetchedAt: new Date().toISOString()
    };
  }

  const isOtl = isOtlWebsiteUrl(parsedUrl);
  const otlSlug = extractOtlResourceSlug(parsedUrl);

  let currentUrl = parsedUrl;
  let redirectCount = 0;
  const maxRedirects = 4;
  const timeoutMs = 8000;
  const maxBytes = 2 * 1024 * 1024; // 2MB max

  while (redirectCount <= maxRedirects) {
    // 1. SSRF DNS & IP verification on every hop
    try {
      await resolveAndValidateDns(currentUrl.hostname);
    } catch (dnsErr: any) {
      return {
        success: false,
        url: trimmed,
        normalizedUrl: currentUrl.href,
        isOtlUrl: isOtl,
        otlResourceSlug: otlSlug,
        error: dnsErr.message,
        fetchedAt: new Date().toISOString()
      };
    }

    // 2. Perform HTTP request with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl.href, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual', // handle redirects manually to check each hop
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OTL-Support-Bot/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8'
        }
      });

      clearTimeout(timer);

      // Handle redirects manually
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Received HTTP ${response.status} redirect without Location header.`);
        }

        const nextUrl = new URL(location, currentUrl.href);
        if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
          throw new Error(`Redirect target protocol "${nextUrl.protocol}" is not permitted.`);
        }

        currentUrl = nextUrl;
        redirectCount++;
        continue;
      }

      const contentType = response.headers.get('content-type') || '';

      // Check HTTP status
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          url: trimmed,
          normalizedUrl: currentUrl.href,
          isOtlUrl: isOtl,
          otlResourceSlug: otlSlug,
          statusCode: response.status,
          contentType,
          requiresAuth: true,
          error: `This page requires authentication or has restricted access (HTTP ${response.status}).`,
          fetchedAt: new Date().toISOString()
        };
      }

      if (!response.ok) {
        return {
          success: false,
          url: trimmed,
          normalizedUrl: currentUrl.href,
          isOtlUrl: isOtl,
          otlResourceSlug: otlSlug,
          statusCode: response.status,
          contentType,
          error: `Failed to retrieve page: HTTP ${response.status} (${response.statusText || 'Error'})`,
          fetchedAt: new Date().toISOString()
        };
      }

      // Read response body safely with size cap
      const rawHtml = await response.text();
      if (rawHtml.length > maxBytes) {
        throw new Error(`Page response size exceeded safe limit of 2MB.`);
      }

      const extracted = extractCleanContentFromHtml(rawHtml);

      // Truncate to maximum 12,000 characters for AI prompt safety
      const charLimit = 12000;
      const truncatedText = extracted.cleanText.length > charLimit
        ? extracted.cleanText.substring(0, charLimit) + '\n\n... [Content truncated for length]'
        : extracted.cleanText;

      const snippet = truncatedText.slice(0, 300).trim();

      const result: FetchedUrlResult = {
        success: true,
        url: trimmed,
        normalizedUrl: currentUrl.href,
        isOtlUrl: isOtl,
        otlResourceSlug: otlSlug,
        title: extracted.title || currentUrl.hostname,
        description: extracted.description,
        textSnippet: snippet,
        fullCleanText: truncatedText,
        charCount: truncatedText.length,
        statusCode: response.status,
        contentType,
        fetchedAt: new Date().toISOString()
      };

      // Store in memory cache
      URL_CACHE.set(trimmed, {
        result,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      return result;
    } catch (fetchErr: any) {
      clearTimeout(timer);
      const isTimeout = fetchErr.name === 'AbortError';
      const msg = isTimeout
        ? `Request timed out after ${timeoutMs / 1000} seconds.`
        : (fetchErr.message || 'Unknown network error');

      return {
        success: false,
        url: trimmed,
        normalizedUrl: currentUrl.href,
        isOtlUrl: isOtl,
        otlResourceSlug: otlSlug,
        error: msg,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  return {
    success: false,
    url: trimmed,
    normalizedUrl: currentUrl.href,
    isOtlUrl: isOtl,
    otlResourceSlug: otlSlug,
    error: `Exceeded maximum redirect limit (${maxRedirects}).`,
    fetchedAt: new Date().toISOString()
  };
}
