/**
 * API client — thin fetch wrapper. JWTs live in httpOnly cookies, so every
 * request just sends credentials; CSRF token (double-submit cookie) is
 * attached to state-changing requests.
 */

const API = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;
/** Time allowed for a streaming response to *start* (first byte / headers). */
const STREAM_CONNECT_TIMEOUT_MS = 60_000;

const NETWORK_ERROR_MESSAGE =
  'Could not reach the server — check your internet connection and try again.';
const TIMEOUT_MESSAGE = 'Request timed out — please check your connection and try again.';

function csrfToken(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  /** Abort after this many ms (default 30s). */
  timeoutMs?: number;
}

/**
 * Single-flight token refresh. When the access token expires, every in-flight
 * request gets a 401 at once; they must share ONE /auth/refresh call. Separate
 * calls would all present the same refresh token, and the server treats reuse
 * of a rotated token as theft and revokes the whole session.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    const token = csrfToken();
    refreshInFlight = fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { 'X-CSRF-Token': token } : {},
      signal: AbortSignal.timeout(10_000),
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function canRefresh(path: string): boolean {
  return path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/register';
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let detail: unknown = res.statusText;
  try {
    const data = await res.json();
    detail = data.detail ?? detail;
  } catch {
    /* not json (e.g. an HTML error page from a proxy) */
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    if (typeof detail !== 'string' || !detail || detail === res.statusText) {
      detail = 'The server is temporarily unavailable — please try again in a moment.';
    }
  }
  return new ApiError(res.status, typeof detail === 'string' ? detail : JSON.stringify(detail));
}

/** Map fetch() rejections (network failure, abort) to a user-facing ApiError. */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return new ApiError(0, TIMEOUT_MESSAGE);
  }
  if (err instanceof TypeError) return new ApiError(0, NETWORK_ERROR_MESSAGE);
  return new ApiError(0, err instanceof Error && err.message ? err.message : 'Unexpected error — please try again.');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const token = csrfToken();
    if (token) headers['X-CSRF-Token'] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    throw toApiError(err);
  }

  if (res.status === 401 && !retried && canRefresh(path) && (await refreshSession())) {
    // Retry once with the rotated cookies (and the new CSRF token).
    return request<T>(method, path, body, opts, true);
  }
  if (!res.ok) throw await errorFromResponse(res);
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw toApiError(err);
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts),
};

/**
 * POST that resolves once response headers arrive. The connect timeout only
 * covers that wait — a long streamed answer must not be cut off midway.
 */
async function rawStreamPost(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const token = csrfToken();
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) onAbort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException('Timed out', 'TimeoutError')),
    STREAM_CONNECT_TIMEOUT_MS,
  );
  try {
    return await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-Token': token } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Streaming POST for AI chat (SSE-ish text stream). Handles 401 token refresh once, matching request(). */
export async function* streamPost(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const send = async () => {
    try {
      return await rawStreamPost(path, body, signal);
    } catch (err) {
      // Let a caller-initiated abort propagate as-is (TutorTab ignores it).
      if (signal?.aborted) throw err;
      throw toApiError(err);
    }
  };

  let res = await send();
  if (res.status === 401 && canRefresh(path) && (await refreshSession())) {
    res = await send();
  }
  if (!res.ok || !res.body) throw await errorFromResponse(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
