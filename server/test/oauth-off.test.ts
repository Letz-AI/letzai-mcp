import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { connectorToken, type FakeApi, initialize, type Mcp, rpc, startFakeApi, startMcp } from './harness.js';

/**
 * With LETZAI_OAUTH_ENABLED off — the default, and the state production stays in until the
 * API's authorization server is switched on — this server must behave exactly as it did
 * before OAuth existed.
 */
let api: FakeApi;
let mcp: Mcp;

before(async () => {
  api = await startFakeApi();
  mcp = await startMcp(api, { oauth: false });
});
after(async () => {
  await mcp.close();
  await api.close();
});

describe('with OAuth off', () => {
  it('serves no OAuth metadata', async () => {
    assert.equal((await fetch(`${mcp.url}/.well-known/oauth-protected-resource`)).status, 404);
    assert.equal((await fetch(`${mcp.url}/.well-known/oauth-protected-resource/mcp`)).status, 404);
  });

  it('challenges with a bare Bearer, as it always has — nothing sends a client into a flow that does not exist', async () => {
    const response = await rpc(mcp, initialize);

    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Bearer');
  });

  it('accepts an integration token', async () => {
    assert.equal((await rpc(mcp, initialize, { token: 'an-integration-token' })).status, 200);
  });

  it('does not check or scope even a token shaped like a connector token', async () => {
    const response = await rpc(mcp, initialize, { token: connectorToken('whatever') });

    assert.equal(response.status, 200);
    assert.equal(api.tokeninfoCalls, 0);
  });
});
