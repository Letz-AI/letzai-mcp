import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, jsonText, paginationShape, queryString } from '../common.js';
import { LetzAiClient } from '../letzai-client.js';

export function registerModelTools(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'list_models',
    {
      title: 'List models',
      description: 'List models with pagination and optional search.',
      inputSchema: {
        ...paginationShape,
        search: z.string().optional().describe('Search term'),
      },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/models${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'get_model',
    {
      title: 'Get a model',
      description: 'Get a model by id.',
      inputSchema: { id: z.string().describe('Model id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('GET', `/models/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'create_model',
    {
      title: 'Create (train) a model',
      description:
        'Create a new trained model. `class` and enum-like fields accept the ' +
        'API-accepted values (invalid values return the allowed set). Provide ' +
        'training images via `trainingDataUrls`.',
      inputSchema: {
        name: z.string().min(1).describe('Model name'),
        class: z.string().describe('Model class (API-accepted value)'),
        privacy: z.string().optional().describe('Privacy (API-accepted value)'),
        type: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
        settings: z.array(z.string()).optional().describe('Content settings (API-accepted values)'),
        trainingDataUrls: z.array(z.string().url()).min(1).max(50).optional().describe('Training image URLs (1-50)'),
      },
    },
    async (args) => {
      try {
        return jsonText(await client.request('POST', '/models', args));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'update_model',
    {
      title: 'Update a model',
      description: 'Update a model\'s editable fields (only provided fields change).',
      inputSchema: {
        id: z.string().describe('Model id'),
        name: z.string().optional(),
        privacy: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
        settings: z.array(z.string()).optional(),
      },
    },
    async ({ id, ...patch }) => {
      try {
        return jsonText(await client.request('PATCH', `/models/${id}`, patch));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'delete_model',
    {
      title: 'Delete a model',
      description: 'Delete a model by id.',
      inputSchema: { id: z.string().describe('Model id') },
    },
    async ({ id }) => {
      try {
        await client.request('DELETE', `/models/${id}`);
        return jsonText({ id, deleted: true });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
