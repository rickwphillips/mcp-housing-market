/**
 * Shared fetch utilities with caching and error handling.
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Redact secrets (e.g. api_key) from a URL before it appears in any error
 * message. Error strings from these helpers propagate up to tool output, so an
 * unredacted key would be leaked to the client on any non-200 response.
 */
function redactUrl(url: string): string {
  return url.replace(/([?&](?:api_key|apikey|key|token)=)[^&]*/gi, "$1REDACTED");
}

/**
 * Fetch a URL with caching. Returns cached data if available and not expired.
 * Throws on network or HTTP errors with descriptive messages.
 */
export async function cachedFetch(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as string;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MCP-Housing-Market/1.0; +https://github.com/rickwphillips/mcp-housing-market)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching ${redactUrl(url)}: ${response.statusText}`
    );
  }

  const text = await response.text();
  cache.set(url, { data: text, timestamp: Date.now() });
  return text;
}

/**
 * Fetch JSON from a URL with caching.
 */
export async function cachedFetchJson<T = unknown>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MCP-Housing-Market/1.0; +https://github.com/rickwphillips/mcp-housing-market)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching ${redactUrl(url)}: ${response.statusText}`
    );
  }

  const json = (await response.json()) as T;
  cache.set(url, { data: json, timestamp: Date.now() });
  return json;
}

/**
 * Clear all cached data.
 */
export function clearCache(): void {
  cache.clear();
}
