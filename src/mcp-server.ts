import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LetzAiClient } from './letzai-client.js';
import { registerImageTools } from './tools/images.js';
import { registerImageEditTools } from './tools/image-edits.js';
import { registerVideoTools } from './tools/videos.js';
import { registerUpscaleTools } from './tools/upscale.js';
import { registerModelTools } from './tools/models.js';
import { registerUserAssetTools } from './tools/user-assets.js';

/**
 * Build a per-request MCP server bound to the caller's integration token.
 * Stateless: one server (and one {@link LetzAiClient}) is created per HTTP
 * request so the token never leaks across callers.
 */
export function buildMcpServer(token: string): McpServer {
  const server = new McpServer({ name: 'letzai', version: '0.1.0' });
  const client = new LetzAiClient(token);

  registerImageTools(server, client);
  registerImageEditTools(server, client);
  registerVideoTools(server, client);
  registerUpscaleTools(server, client);
  registerModelTools(server, client);
  registerUserAssetTools(server, client);

  return server;
}
