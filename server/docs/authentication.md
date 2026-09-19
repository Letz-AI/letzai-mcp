# Authentication

The hosted server accepts two kinds of bearer token on `POST /mcp`.

| | Connector token (OAuth) | Integration token (API key) |
|---|---|---|
| How the user gets one | Adds the server URL in their MCP client, logs in to LetzAI, approves | Creates a key in LetzAI settings and pastes it into the client |
| Lifetime | 1 hour, refreshed automatically by the client | Does not expire |
| Permissions | The scopes the user approved | Everything the user can do |
| Who pays | The account the user chose when connecting | The user, or an `organizationId` passed per call |
| Revoked from | LetzAI → Settings → Connected apps | LetzAI → Settings → API keys |

Both work side by side. OAuth is what lets someone connect with nothing but the URL; API keys
remain for scripts, CI and any client that cannot do OAuth. (Claude can also carry an API key
as a request header — its `static_headers` connector auth.)

## How the OAuth flow reaches this server

This server is the **resource server**. The **authorization server** is the LetzAI API. This
server never sees a password, never shows a login page and never issues a token.

1. A client calls `POST /mcp` with no token and gets:

   ```http
   HTTP/1.1 401 Unauthorized
   WWW-Authenticate: Bearer resource_metadata="https://mcp.letz.ai/.well-known/oauth-protected-resource/mcp",
                            scope="letzai:read letzai:generate letzai:manage"
   ```

   It must be a `401` — Claude ignores `WWW-Authenticate` on any other status.

2. The client fetches that document (RFC 9728). It names this server and its authorization
   server:

   ```json
   {
     "resource": "https://mcp.letz.ai/mcp",
     "authorization_servers": ["https://api.letz.ai"],
     "scopes_supported": ["letzai:read", "letzai:generate", "letzai:manage"],
     "bearer_methods_supported": ["header"]
   }
   ```

   `resource` must equal the URL the user typed **exactly** — Claude compares them as strings,
   path included. Only the first `authorization_servers` entry is used. The document is served
   at both `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-protected-resource`,
   because clients probe in that order.

3. The client runs the authorization-code flow against the API (discovery, PKCE, consent on
   letz.ai) and comes back with an access token whose audience is this server.

4. On each request this server confirms the token with `GET {api}/oauth/tokeninfo`, sending the
   token itself as the bearer, and checks `aud` is its own URI. A token issued for any other
   resource is refused, however valid it is.

5. The same token is forwarded to the LetzAI API for the actual work. The API enforces scopes,
   the paying account and revocation again, on every call — this server is a convenience
   layer in front of those checks, not a replacement for them.

### Why token checks go through the API

Connector tokens are signed with a symmetric key that only the API holds. Verifying them here
would mean copying that key into a stateless proxy whose source is public. `tokeninfo` is
authenticated by the token it describes, so **this server holds no secret at all**.

Successful checks are cached for `LETZAI_OAUTH_TOKEN_CACHE_TTL_MS` (60 s), keyed by a hash of
the token. Refusals are never cached. An entry never outlives the token's own expiry. If the
API cannot be reached, a connector token is refused — it fails closed.

## Scopes

| Scope | Lets a client | Tools |
|---|---|---|
| `letzai:read` | See the user's content | `get_*`, `list_*` |
| `letzai:generate` | Spend credits | `generate_image`, `generate_video`, `edit_image`, `upscale_image`, `interrupt_image` |
| `letzai:manage` | Publish, delete, train | `set_*_privacy`, `delete_*`, `create_model`, `update_model` |

`letzai:manage` implies the other two. `read` and `generate` are independent.

The full table is [`src/scopes.ts`](../src/scopes.ts). **Every tool must be in it**: registering
one that is not throws when the server is built, so a new tool cannot ship without a decision
about what it requires. The test suite checks the table against the registered tools in both
directions.

A tool call the token does not cover is answered before the tool runs:

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer resource_metadata="…", error="insufficient_scope", scope="letzai:manage"
```

Every missing scope is named in that one challenge — for a JSON-RPC batch, across the whole
batch — so a client can ask the user once. `initialize` and `tools/list` need no scope.

API keys carry no scopes and are not subject to any of this.

## Turning it on

OAuth is **off by default**: with `LETZAI_OAUTH_ENABLED` unset there is no metadata document, a
missing token gets a bare `WWW-Authenticate: Bearer`, and nothing sends a client looking for a
flow that does not exist.

Order matters:

1. The API's authorization server is enabled, with this server's URI in `OAUTH_ALLOWED_RESOURCES`.
2. Then, here: `LETZAI_OAUTH_ENABLED=true` and `LETZAI_MCP_RESOURCE_URI` set to the public URL.

Doing it the other way round advertises an authorization server that answers 404. To roll back,
unset `LETZAI_OAUTH_ENABLED`; connections already made simply stop being offered, and API keys
are unaffected throughout.

| Variable | Default | |
|---|---|---|
| `LETZAI_OAUTH_ENABLED` | `false` | Master switch. |
| `LETZAI_MCP_RESOURCE_URI` | `https://mcp.letz.ai/mcp` | Canonical URI of this server. |
| `LETZAI_AUTHORIZATION_SERVER` | `LETZAI_API_BASE_URL` | Issuer advertised to clients. |
| `LETZAI_OAUTH_TOKEN_CACHE_TTL_MS` | `60000` | Reuse window for a successful token check. |

In the Kubernetes deployment these go in `gcp/workloads/mcp/deployment.yaml` in the
`infrastructure` repo.

## Testing

```bash
npm test          # 40 tests, against a fake LetzAI API — no network, no credentials
npm run typecheck # source and tests
```

`test/resource-server.test.ts` covers the behaviour above; `test/oauth-off.test.ts` proves the
server is unchanged with the flag off; `test/scopes.test.ts` holds the scope table to account.
The end-to-end flow against a real authorization server is exercised from the API repo
(`test/oauth/conformance/`).
