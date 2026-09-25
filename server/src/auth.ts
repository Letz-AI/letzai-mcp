import { createHash } from 'node:crypto';
import { config } from './config.js';
import { parseScope, SCOPES } from './scopes.js';

/**
 * Authentication for the MCP endpoint.
 *
 * Two kinds of bearer token arrive here:
 *
 *  - **Integration tokens** — LetzAI API keys, pasted into the client by the user. Not checked
 *    here at all: the LetzAI API validates them on every tool call, exactly as before OAuth.
 *  - **Connector tokens** — issued by the LetzAI authorization server through the OAuth flow.
 *    These announce themselves (`typ: at+jwt`), and the MCP spec requires a resource server to
 *    confirm a token was issued *for it* before acting on it.
 *
 * Confirmation is a call to the API's `/oauth/tokeninfo`, authenticated by the token itself.
 * This server therefore holds no secret of its own — which matters, because it is a stateless
 * proxy whose source is public.
 */
export type Caller =
  | { kind: 'integration'; token: string }
  | { kind: 'oauth'; token: string; scopes: string[] };

export class InvalidTokenError extends Error {}

export function bearerToken(authorization: string | undefined): string | undefined {
  const [scheme, token] = (authorization ?? '').split(' ');

  return scheme === 'Bearer' && token ? token : undefined;
}

export function looksLikeConnectorToken(token: string): boolean {
  try {
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));

    return header?.typ === 'at+jwt';
  } catch {
    return false;
  }
}

interface CacheEntry {
  scopes: string[];
  until: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 5000;

/** Keyed by a hash, so a heap dump of this process is not a list of live tokens. */
const cacheKey = (token: string) => createHash('sha256').update(token).digest('hex');

export function clearTokenCache(): void {
  cache.clear();
}

export async function authenticate(token: string): Promise<Caller> {
  if (!config.oauth.enabled || !looksLikeConnectorToken(token)) {
    return { kind: 'integration', token };
  }

  const key = cacheKey(token);
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) {
    return { kind: 'oauth', token, scopes: cached.scopes };
  }
  cache.delete(key);

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/oauth/tokeninfo`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Unreachable API: fail closed. A connector token we cannot confirm is not confirmed.
    throw new InvalidTokenError('token could not be verified');
  }

  if (!response.ok) {
    throw new InvalidTokenError('token is not active');
  }

  const info = (await response.json()) as { active?: boolean; aud?: string; scope?: string; exp?: number };

  // The audience check is the point of all this: a token minted for some other LetzAI
  // resource server must not work here, however valid it is.
  if (info.active !== true || info.aud !== config.oauth.resource) {
    throw new InvalidTokenError('token was not issued for this server');
  }

  const scopes = parseScope(info.scope);
  const expiresAt = typeof info.exp === 'number' ? info.exp * 1000 : Date.now();

  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.clear();
  }
  cache.set(key, { scopes, until: Math.min(Date.now() + config.oauth.tokenCacheTtlMs, expiresAt) });

  return { kind: 'oauth', token, scopes };
}

/** RFC 9728. Where an MCP client learns which authorization server to use. */
export function protectedResourceMetadata() {
  return {
    resource: config.oauth.resource,
    authorization_servers: [config.oauth.authorizationServer],
    // No `offline_access`: a refresh token is not something this resource requires, and the
    // MCP spec says resource servers should not list it.
    scopes_supported: SCOPES,
    bearer_methods_supported: ['header'],
    resource_name: 'LetzAI',
    resource_documentation: 'https://mcp.letz.ai/',
  };
}

export function resourceMetadataUrl(): string {
  const resource = new URL(config.oauth.resource);

  return `${resource.origin}/.well-known/oauth-protected-resource${resource.pathname === '/' ? '' : resource.pathname}`;
}

const quote = (value: string) => `"${value.replace(/["\\]/g, '')}"`;

/** RFC 6750 §3, plus the `resource_metadata` parameter of RFC 9728 §5.1. */
export function challenge(options: { error?: string; description?: string; scope?: string } = {}): string {
  if (!config.oauth.enabled) {
    return 'Bearer';
  }

  const parts = [`resource_metadata=${quote(resourceMetadataUrl())}`];
  if (options.error) parts.push(`error=${quote(options.error)}`);
  if (options.description) parts.push(`error_description=${quote(options.description)}`);
  // All three, so the user decides at the consent screen rather than the client deciding for
  // them. LetzAI's consent page leaves `manage` unticked by default.
  parts.push(`scope=${quote(options.scope ?? SCOPES.join(' '))}`);

  return `Bearer ${parts.join(', ')}`;
}
