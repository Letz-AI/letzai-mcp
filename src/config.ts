export const config = {
  /** Base URL of the LetzAI public API that tools proxy to. */
  apiBaseUrl: process.env.LETZAI_API_BASE_URL ?? 'https://api.letz.ai',
  /** Port the MCP HTTP server listens on. */
  port: Number(process.env.PORT ?? 3010),
  /** Poll interval / timeout for async generation jobs. */
  pollIntervalMs: Number(process.env.LETZAI_POLL_INTERVAL_MS ?? 3000),
  pollTimeoutMs: Number(process.env.LETZAI_POLL_TIMEOUT_MS ?? 180_000),
} as const;
