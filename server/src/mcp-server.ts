import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LETZAI_INSTRUCTIONS } from './instructions.js';
import { LetzAiClient } from './letzai-client.js';
import { getCatalog, renderCatalog } from './models-catalog.js';
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
 *
 * Ships the "skill" layer alongside the raw tools: server `instructions`
 * (prompt-craft, baseModel-vs-@handle, cost defaults) and a `letzai://models`
 * resource so the model knows the base-model catalogue.
 */
export function buildMcpServer(token: string): McpServer {
  const server = new McpServer(
    { name: 'letzai', version: '0.1.0' },
    { instructions: LETZAI_INSTRUCTIONS },
  );
  const client = new LetzAiClient(token);

  server.registerResource(
    'letzai-models',
    'letzai://models',
    {
      title: 'LetzAI base models',
      description:
        'Catalogue of available base models (image/video/upscale) with their ' +
        'canonical baseModel value and aliases. Pass a baseModel to a generation tool.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: 'text/markdown', text: renderCatalog(await getCatalog()) },
      ],
    }),
  );

  registerImageTools(server, client);
  registerImageEditTools(server, client);
  registerVideoTools(server, client);
  registerUpscaleTools(server, client);
  registerModelTools(server, client);
  registerUserAssetTools(server, client);

  return server;
}
