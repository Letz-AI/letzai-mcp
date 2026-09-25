import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { missingScopes } from '../src/app.js';
import { buildMcpServer } from '../src/mcp-server.js';
import { parseScope, satisfies, SCOPES, TOOL_SCOPES } from '../src/scopes.js';

const call = (name: string) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {} } });

describe('scope map', () => {
  it('X-TOOLS-01 every registered tool declares a scope, and every declared tool exists', () => {
    const server = buildMcpServer('token') as unknown as { _registeredTools: Record<string, unknown> };
    const registered = Object.keys(server._registeredTools).sort();

    assert.equal(registered.length, 24);
    assert.deepEqual(Object.keys(TOOL_SCOPES).sort(), registered);
  });

  it('X-TOOLS-01 registering a tool with no declared scope throws', () => {
    const server = buildMcpServer('token');

    assert.throws(
      () => server.registerTool('brand_new_tool', { title: 'x', description: 'x', inputSchema: {} }, async () => ({ content: [] })),
      /has no entry in TOOL_SCOPES/,
    );
  });

  it('only uses scopes the authorization server knows', () => {
    for (const scope of Object.values(TOOL_SCOPES)) {
      assert.ok(SCOPES.includes(scope), scope);
    }
  });

  it('puts reads under read, spending under generate, and destructive or publishing actions under manage', () => {
    for (const [tool, scope] of Object.entries(TOOL_SCOPES)) {
      if (/^(get|list)_/.test(tool)) assert.equal(scope, 'letzai:read', tool);
      if (/^(delete|update|create)_|privacy/.test(tool)) assert.equal(scope, 'letzai:manage', tool);
    }
    assert.equal(TOOL_SCOPES.generate_image, 'letzai:generate');
    assert.equal(TOOL_SCOPES.generate_video, 'letzai:generate');
    assert.equal(TOOL_SCOPES.edit_image, 'letzai:generate');
    assert.equal(TOOL_SCOPES.upscale_image, 'letzai:generate');
  });
});

describe('satisfies', () => {
  it('honours the hierarchy: manage implies both; read and generate are independent', () => {
    assert.ok(satisfies(['letzai:manage'], 'letzai:read'));
    assert.ok(satisfies(['letzai:manage'], 'letzai:generate'));
    assert.ok(!satisfies(['letzai:read'], 'letzai:generate'));
    assert.ok(!satisfies(['letzai:generate'], 'letzai:read'));
    assert.ok(!satisfies(['letzai:read', 'letzai:generate'], 'letzai:manage'));
    assert.ok(!satisfies([], 'letzai:read'));
    assert.ok(!satisfies(['nonsense', 'offline_access'], 'letzai:read'));
  });

  it('parses a scope string', () => {
    assert.deepEqual(parseScope('letzai:read  letzai:generate'), ['letzai:read', 'letzai:generate']);
    assert.deepEqual(parseScope(undefined), []);
  });
});

describe('missingScopes', () => {
  it('finds nothing missing when the grant covers the call', () => {
    assert.deepEqual(missingScopes(call('list_images'), ['letzai:read']), []);
  });

  it('reports each missing scope once, across a batch', () => {
    const batch = [call('generate_image'), call('generate_video'), call('delete_model'), call('list_images')];

    assert.deepEqual(missingScopes(batch, ['letzai:read']), ['letzai:generate', 'letzai:manage']);
  });

  it('ignores everything that is not a tool call', () => {
    const body = [{ jsonrpc: '2.0', id: 1, method: 'initialize' }, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, { jsonrpc: '2.0', method: 'notifications/initialized' }];

    assert.deepEqual(missingScopes(body, []), []);
  });

  it('leaves an unknown tool for the MCP layer to reject', () => {
    assert.deepEqual(missingScopes(call('no_such_tool'), []), []);
  });

  it('copes with garbage', () => {
    for (const body of [null, undefined, 'text', 42, [null, 'x'], { method: 'tools/call' }, { method: 'tools/call', params: { name: 7 } }]) {
      assert.deepEqual(missingScopes(body, []), []);
    }
  });
});
