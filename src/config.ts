export const config = {
  /** Base URL of the LetzAI public API that tools proxy to. */
  apiBaseUrl: process.env.LETZAI_API_BASE_URL ?? 'https://api.letz.ai',
  /** Port the MCP HTTP server listens on. */
  port: Number(process.env.PORT ?? 3010),
  /** Poll interval / timeout for async generation jobs. */
  pollIntervalMs: Number(process.env.LETZAI_POLL_INTERVAL_MS ?? 3000),
  pollTimeoutMs: Number(process.env.LETZAI_POLL_TIMEOUT_MS ?? 180_000),
  /** Public base-model catalogue (kept in sync with the frontend). */
  modelsJsonUrl:
    process.env.LETZAI_MODELS_JSON_URL ?? 'https://letz.ai/docs/models.json',
  modelsCacheTtlMs: Number(process.env.LETZAI_MODELS_CACHE_TTL_MS ?? 3_600_000),
} as const;
