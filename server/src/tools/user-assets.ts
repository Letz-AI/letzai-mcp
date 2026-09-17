import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, jsonText, paginationShape, queryString } from '../common.js';
import { LetzAiClient } from '../letzai-client.js';

/**
 * Read access to the caller's uploaded assets/images, so other tools can
 * reference them by id/URL. (Asset upload is a multipart flow and is not yet
 * exposed as an MCP tool.)
 */
export function registerUserAssetTools(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'list_user_assets',
    {
      title: 'List user assets',
      description: 'List the caller\'s uploaded assets with pagination.',
      inputSchema: { ...paginationShape },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/user-assets${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'get_user_asset',
    {
      title: 'Get a user asset',
      description: 'Get one of the caller\'s uploaded assets by id.',
      inputSchema: { id: z.string().uuid().describe('User asset id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('GET', `/user-assets/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'list_user_images',
    {
      title: 'List user images',
      description: 'List the caller\'s uploaded images with pagination.',
      inputSchema: { ...paginationShape },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/user-images${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
