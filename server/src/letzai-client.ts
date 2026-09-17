import { config } from './config.js';

export interface LetzAiJob {
  id: string;
  status?: string;
  progress?: number;
  imageVersions?: Record<string, string> & { original?: string };
  [key: string]: unknown;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Thin authenticated adapter over the LetzAI public API. One instance per
 * request, carrying the caller's integration token (forwarded from the MCP
 * client's `Authorization` header) — the server never holds a global key, so
 * credits and permissions resolve to the connecting user/org.
 */
export class LetzAiClient {
  constructor(private readonly token: string) {}

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.token}`,
    };
  }

  /** Authenticated JSON request against the public API. Throws on non-2xx. */
  async request<T = unknown>(
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `LetzAI ${method} ${path} failed (${res.status}): ${await res.text()}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Poll a GET endpoint until `isDone`, or the configured timeout elapses. */
  async poll<T>(path: string, isDone: (r: T) => boolean): Promise<T> {
    const start = Date.now();
    for (;;) {
      const r = await this.request<T>('GET', path);
      if (isDone(r)) return r;
      if (Date.now() - start > config.pollTimeoutMs) {
        throw new Error(`Timed out polling ${path} after ${config.pollTimeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  }
}

/** A generation job is finished once it reports 100% progress or `ready`. */
export const isJobReady = (r: LetzAiJob): boolean =>
  (r.progress ?? 0) >= 100 || r.status === 'ready';
