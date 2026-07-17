import { config } from './config.js';

export interface CreateImageArgs {
  prompt: string;
  width?: number;
  height?: number;
  quality?: number;
  creativity?: number;
  hasWatermark?: boolean;
  systemVersion?: number;
  mode?: string;
  /** Optional org to deduct credits from (caller must be a member). */
  organizationId?: string;
}

interface CreatedImage {
  id: string;
}

export interface LetzAiImage {
  id: string;
  status?: string;
  progress?: number;
  imageVersions?: Record<string, string> & { original?: string };
}

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

  async createImage(args: CreateImageArgs): Promise<CreatedImage> {
    const res = await fetch(`${config.apiBaseUrl}/images`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(
        `LetzAI createImage failed (${res.status}): ${await res.text()}`,
      );
    }
    return (await res.json()) as CreatedImage;
  }

  async getImage(id: string): Promise<LetzAiImage> {
    const res = await fetch(`${config.apiBaseUrl}/images/${id}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(
        `LetzAI getImage failed (${res.status}): ${await res.text()}`,
      );
    }
    return (await res.json()) as LetzAiImage;
  }

  /** Poll until the generation reports 100% / ready, or the timeout elapses. */
  async pollImage(id: string): Promise<LetzAiImage> {
    const start = Date.now();
    for (;;) {
      const image = await this.getImage(id);
      const done = (image.progress ?? 0) >= 100 || image.status === 'ready';
      if (done) return image;
      if (Date.now() - start > config.pollTimeoutMs) {
        throw new Error(
          `Image ${id} did not finish within ${config.pollTimeoutMs}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, config.pollIntervalMs));
    }
  }
}
