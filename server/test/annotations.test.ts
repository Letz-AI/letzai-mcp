import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { TOOL_ANNOTATIONS } from '../src/annotations.js';
import { buildMcpServer } from '../src/mcp-server.js';
import { TOOL_SCOPES } from '../src/scopes.js';

async function listTools() {
  const server = buildMcpServer('token');
  const client = new Client({ name: 'annotations-test', version: '0.0.0' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools;
}

describe('tool annotations', () => {
  it('X-TOOLS-02 every tool reaches the client with its annotations and a title', async () => {
    const tools = await listTools();

    assert.equal(tools.length, 24);
    assert.deepEqual(Object.keys(TOOL_ANNOTATIONS).sort(), tools.map((tool) => tool.name).sort());
    for (const tool of tools) {
      assert.ok(tool.annotations, `${tool.name} has no annotations`);
      assert.equal(typeof tool.annotations.readOnlyHint, 'boolean', tool.name);
      assert.equal(typeof tool.annotations.destructiveHint, 'boolean', tool.name);
      assert.equal(tool.annotations.openWorldHint, false, tool.name);
      assert.ok(tool.annotations.title, `${tool.name} has no title`);
    }
  });

  it('X-TOOLS-02 registering a tool with a scope but no annotations throws', () => {
    const server = buildMcpServer('token');
    TOOL_SCOPES.brand_new_tool = 'letzai:read';
    try {
      assert.throws(
        () => server.registerTool('brand_new_tool', { title: 'x', description: 'x', inputSchema: {} }, async () => ({ content: [] })),
        /has no entry in TOOL_ANNOTATIONS/,
      );
    } finally {
      delete TOOL_SCOPES.brand_new_tool;
    }
  });

  it('agrees with the scopes: read-only exactly when the scope is read', () => {
    for (const [tool, scope] of Object.entries(TOOL_SCOPES)) {
      assert.equal(TOOL_ANNOTATIONS[tool].readOnlyHint, scope === 'letzai:read', tool);
    }
  });

  it('marks every delete as destructive, and nothing that only creates', () => {
    for (const [tool, annotations] of Object.entries(TOOL_ANNOTATIONS)) {
      if (tool.startsWith('delete_')) {
        assert.equal(annotations.destructiveHint, true, tool);
      }
      if (TOOL_SCOPES[tool] === 'letzai:generate' && tool !== 'interrupt_image') {
        assert.equal(annotations.destructiveHint, false, tool);
        assert.equal(annotations.idempotentHint, false, `${tool}: calling it twice spends credits twice`);
      }
    }
  });
});
