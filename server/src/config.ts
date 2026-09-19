const apiBaseUrl = process.env.LETZAI_API_BASE_URL ?? 'https://api.letz.ai';

export const config = {
  /** Base URL of the LetzAI public API that tools proxy to. */
  apiBaseUrl,
  /** Port the MCP HTTP server listens on. */
  port: Number(process.env.PORT ?? 3010),
  /** Poll interval / timeout for async generation jobs. */
  pollIntervalMs: Number(process.env.LETZAI_POLL_INTERVAL_MS ?? 3000),
  pollTimeoutMs: Number(process.env.LETZAI_POLL_TIMEOUT_MS ?? 180_000),
  /** Public base-model catalogue (kept in sync with the frontend). */
  modelsJsonUrl:
    process.env.LETZAI_MODELS_JSON_URL ?? 'https://letz.ai/docs/models.json',
  modelsCacheTtlMs: Number(process.env.LETZAI_MODELS_CACHE_TTL_MS ?? 3_600_000),

  oauth: {
    /**
     * Off by default, and it must only be switched on once the API's authorization server
     * is (OAUTH_SERVER_ENABLED there). Advertising OAuth before the API can serve it would
     * send every client into a discovery flow that ends in a 404.
     */
    enabled: process.env.LETZAI_OAUTH_ENABLED === 'true',
    /**
     * This server's canonical URI (RFC 8707). It has to equal, exactly, the URL users type
     * into their MCP client — Claude compares them as strings — and the API must list it in
     * OAUTH_ALLOWED_RESOURCES.
     */
    resource: process.env.LETZAI_MCP_RESOURCE_URI ?? 'https://mcp.letz.ai/mcp',
    /** Issuer of the authorization server. Clients use only the first one listed. */
    authorizationServer: process.env.LETZAI_AUTHORIZATION_SERVER ?? apiBaseUrl,
    /** How long a positive token check is reused. Revocation is visible within this. */
    tokenCacheTtlMs: Number(process.env.LETZAI_OAUTH_TOKEN_CACHE_TTL_MS ?? 60_000),
  },
};
