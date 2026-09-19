import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { clearTokenCache } from '../src/auth.js';
import { config } from '../src/config.js';
import { callTool, connectorToken, type FakeApi, initialize, type Mcp, RESOURCE, rpc, startFakeApi, startMcp } from './harness.js';

let api: FakeApi;
let mcp: Mcp;

before(async () => {
  api = await startFakeApi();
  mcp = await startMcp(api, { oauth: true });
});
after(async () => {
  await mcp.close();
  await api.close();
});
beforeEach(() => {
  api.tokens.clear();
  api.requests.length = 0;
  api.tokeninfoCalls = 0;
  clearTokenCache();
});

const live = (label: string, scope: string, aud = RESOURCE) => {
  const token = connectorToken(label);
  api.tokens.set(token, { aud, scope });

  return token;
};

describe('protected resource metadata (RFC 9728)', () => {
  it('X-PRM-01 names this server exactly, and its one authorization server', async () => {
    for (const path of ['/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource']) {
      const response = await fetch(`${mcp.url}${path}`);
      const body = await response.json();

      assert.equal(response.status, 200, path);
      // Claude compares this with the URL the user typed, as a string.
      assert.equal(body.resource, RESOURCE);
      // ...and uses only the first entry.
      assert.deepEqual(body.authorization_servers, [api.url]);
      assert.deepEqual(body.bearer_methods_supported, ['header']);
    }
  });

  it('X-PRM-02 lists the three scopes and never offline_access', async () => {
    const body = await (await fetch(`${mcp.url}/.well-known/oauth-protected-resource`)).json();

    assert.deepEqual(body.scopes_supported, ['letzai:read', 'letzai:generate', 'letzai:manage']);
    assert.ok(!JSON.stringify(body).includes('offline_access'));
  });
});

describe('authentication', () => {
  it('X-AUTH-01 answers a missing token with 401 and a challenge a client can act on', async () => {
    const response = await rpc(mcp, initialize);
    const challenge = response.headers.get('www-authenticate') ?? '';

    // Claude ignores WWW-Authenticate on anything but a 401.
    assert.equal(response.status, 401);
    assert.match(challenge, /^Bearer /);
    assert.ok(challenge.includes('resource_metadata="https://mcp.test/.well-known/oauth-protected-resource/mcp"'));
    assert.ok(challenge.includes('scope="letzai:read letzai:generate letzai:manage"'));
    assert.ok(!challenge.includes('offline_access'));
  });

  it('accepts a live connector token issued for this server', async () => {
    const response = await rpc(mcp, initialize, { token: live('ok', 'letzai:read') });

    assert.equal(response.status, 200);
    assert.equal(response.message.result.serverInfo.name, 'letzai');
  });

  it('X-AUTH-02 refuses a token issued for a different resource server', async () => {
    const response = await rpc(mcp, initialize, { token: live('elsewhere', 'letzai:manage', 'https://other.test/mcp') });

    assert.equal(response.status, 401);
    assert.ok((response.headers.get('www-authenticate') ?? '').includes('error="invalid_token"'));
  });

  it('X-AUTH-03 refuses a connector token the authorization server does not recognise', async () => {
    const response = await rpc(mcp, initialize, { token: connectorToken('revoked') });

    assert.equal(response.status, 401);
    assert.ok((response.headers.get('www-authenticate') ?? '').includes('error="invalid_token"'));
    assert.ok((response.headers.get('www-authenticate') ?? '').includes('resource_metadata='));
  });

  it('fails closed when the authorization server cannot be reached', async () => {
    const original = config.apiBaseUrl;
    config.apiBaseUrl = 'http://127.0.0.1:1';
    try {
      const response = await rpc(mcp, initialize, { token: connectorToken('unreachable') });

      assert.equal(response.status, 401);
    } finally {
      config.apiBaseUrl = original;
    }
  });

  it('X-AUTH-04 never reads a token from the query string', async () => {
    const token = live('query', 'letzai:manage');
    const response = await rpc(mcp, initialize, { path: `/mcp?access_token=${token}&token=${token}` });

    assert.equal(response.status, 401);
    assert.equal(api.tokeninfoCalls, 0);
  });

  it('ignores schemes other than Bearer', async () => {
    const response = await fetch(`${mcp.url}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Basic dXNlcjpwYXNz' },
      body: JSON.stringify(initialize),
    });

    assert.equal(response.status, 401);
  });
});

describe('scopes', () => {
  it('X-SCOPE-01 answers a tool call the token may not make with 403 insufficient_scope', async () => {
    const response = await rpc(mcp, callTool('generate_image', { prompt: 'a cat' }), { token: live('reader', 'letzai:read') });
    const challenge = response.headers.get('www-authenticate') ?? '';

    assert.equal(response.status, 403);
    assert.ok(challenge.includes('error="insufficient_scope"'));
    assert.ok(challenge.includes('scope="letzai:generate"'));
    assert.ok(challenge.includes('resource_metadata='));
    // Refused before it ran: the API never saw a generation request.
    assert.ok(!api.requests.some((request) => request.path === '/images'));
  });

  it('X-SCOPE-01 names every missing scope in one challenge, for a batch', async () => {
    const batch = [callTool('generate_image', { prompt: 'x' }, 1), callTool('delete_model', { id: '00000000-0000-4000-8000-000000000000' }, 2)];
    const response = await rpc(mcp, batch, { token: live('reader', 'letzai:read') });
    const challenge = response.headers.get('www-authenticate') ?? '';

    assert.equal(response.status, 403);
    assert.ok(challenge.includes('scope="letzai:generate letzai:manage"'));
  });

  it('X-SCOPE-02 manage implies read and generate', async () => {
    api.routes.set('GET /images', () => ({ status: 200, body: [] }));
    const response = await rpc(mcp, callTool('list_images'), { token: live('manager', 'letzai:manage') });

    assert.equal(response.status, 200);
    assert.ok(!response.message.result.isError);
  });

  it('read and generate do not imply each other', async () => {
    const generator = live('generator', 'letzai:generate');

    assert.equal((await rpc(mcp, callTool('list_images'), { token: generator })).status, 403);
  });

  it('lets initialize and tools/list through whatever the scopes', async () => {
    const token = live('narrow', 'letzai:read');

    assert.equal((await rpc(mcp, initialize, { token })).status, 200);
    const listed = await rpc(mcp, { jsonrpc: '2.0', id: 3, method: 'tools/list' }, { token });
    assert.equal(listed.status, 200);
    assert.equal(listed.message.result.tools.length, 24);
  });

  it('forwards the connector token to the API, which enforces everything again', async () => {
    api.routes.set('GET /images', () => ({ status: 200, body: [{ id: 'img-1' }] }));
    const token = live('forward', 'letzai:read');

    await rpc(mcp, callTool('list_images'), { token });

    const forwarded = api.requests.find((request) => request.path === '/images');
    assert.equal(forwarded?.authorization, `Bearer ${token}`);
  });

  it('surfaces an API refusal as a tool error, not a crash', async () => {
    api.routes.set('GET /images', () => ({ status: 403, body: { error: 'insufficient_scope' } }));
    const response = await rpc(mcp, callTool('list_images'), { token: live('denied', 'letzai:read') });

    assert.equal(response.status, 200);
    assert.equal(response.message.result.isError, true);
  });
});

describe('token check caching', () => {
  it('X-CACHE-01 checks a token once, then reuses the answer', async () => {
    const token = live('cached', 'letzai:read');

    await rpc(mcp, initialize, { token });
    await rpc(mcp, initialize, { token });
    await rpc(mcp, initialize, { token });

    assert.equal(api.tokeninfoCalls, 1);
  });

  it('X-CACHE-01 never caches a refusal', async () => {
    const token = connectorToken('later');

    assert.equal((await rpc(mcp, initialize, { token })).status, 401);
    api.tokens.set(token, { aud: RESOURCE, scope: 'letzai:read' });

    assert.equal((await rpc(mcp, initialize, { token })).status, 200);
  });

  it('X-CACHE-01 forgets a token once the cache entry expires, so revocation takes effect', async () => {
    config.oauth.tokenCacheTtlMs = 50;
    const token = live('short', 'letzai:read');
    try {
      assert.equal((await rpc(mcp, initialize, { token })).status, 200);
      api.tokens.delete(token);
      await new Promise((resolve) => setTimeout(resolve, 120));

      assert.equal((await rpc(mcp, initialize, { token })).status, 401);
    } finally {
      config.oauth.tokenCacheTtlMs = 60_000;
    }
  });

  it('never caches a token past its own expiry', async () => {
    const token = connectorToken('expiring');
    api.tokens.set(token, { aud: RESOURCE, scope: 'letzai:read', exp: Math.floor(Date.now() / 1000) });

    await rpc(mcp, initialize, { token });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await rpc(mcp, initialize, { token });

    assert.equal(api.tokeninfoCalls, 2);
  });
});

describe('X-COMPAT-01 integration tokens still work exactly as before', () => {
  it('passes an API key straight through, with no token check and no scope rules', async () => {
    api.routes.set('DELETE /models/00000000-0000-4000-8000-000000000000', () => ({ status: 204, body: null }));
    const response = await rpc(mcp, callTool('delete_model', { id: '00000000-0000-4000-8000-000000000000' }), { token: 'a-plain-integration-token' });

    assert.equal(response.status, 200);
    assert.equal(api.tokeninfoCalls, 0);
    assert.equal(api.requests.at(-1)?.authorization, 'Bearer a-plain-integration-token');
  });

  it('treats an ordinary JWT as an integration token', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const jwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: 'user-1' })}.sig`;

    assert.equal((await rpc(mcp, initialize, { token: jwt })).status, 200);
    assert.equal(api.tokeninfoCalls, 0);
  });
});

describe('other methods', () => {
  it('answers 405 for GET and DELETE on /mcp — this server is stateless', async () => {
    assert.equal((await fetch(`${mcp.url}/mcp`)).status, 405);
    assert.equal((await fetch(`${mcp.url}/mcp`, { method: 'DELETE' })).status, 405);
  });

  it('serves the landing page and a health check without authentication', async () => {
    assert.equal((await fetch(`${mcp.url}/`)).status, 200);
    assert.deepEqual(await (await fetch(`${mcp.url}/healthz`)).json(), { ok: true, service: 'letzai-mcp-server' });
  });

  it('does not advertise its framework', async () => {
    assert.equal((await fetch(`${mcp.url}/`)).headers.get('x-powered-by'), null);
  });
});
