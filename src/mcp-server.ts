import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LetzAiClient } from './letzai-client.js';
import { registerGenerateImage } from './tools/generate-image.js';

/**
 * Build a per-request MCP server bound to the caller's integration token.
 * Stateless: one server (and one {@link LetzAiClient}) is created per HTTP
 * request so the token never leaks across callers.
 *
 * Future tools (video, edit, upscale, list_models, get_generation_status)
 * register here.
 */
export function buildMcpServer(token: string): McpServer {
  const server = new McpServer({ name: 'letzai', version: '0.1.0' });
  const client = new LetzAiClient(token);

  registerGenerateImage(server, client);

  return server;
}
