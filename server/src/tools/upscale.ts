import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, jsonText, paginationShape, queryString } from '../common.js';
import { LetzAiClient, LetzAiJob } from '../letzai-client.js';

export function registerUpscaleTools(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'upscale_image',
    {
      title: 'Upscale an image or asset',
      description:
        'Upscale an existing image/asset (by id or URL). Returns the created ' +
        'upscale id + status; poll `get_upscale` for the result.',
      inputSchema: {
        imageId: z.string().uuid().optional().describe('Source image id'),
        imageUrl: z.string().url().optional().describe('Source image URL'),
        assetId: z.string().uuid().optional().describe('Source asset id'),
        assetUrl: z.string().url().optional().describe('Source asset URL'),
        type: z.string().optional().describe('Asset type (default "image")'),
        prompt: z.string().optional(),
        mode: z.string().max(32).optional().describe('Upscale mode'),
        size: z.number().min(2).max(1024).optional().describe('Target size multiplier (2-1024)'),
        strength: z.number().min(1).max(5).optional().describe('Strength (1-5, default 1)'),
        organizationId: z.string().uuid().optional().describe('Organization to deduct credits from'),
      },
    },
    async (args) => {
      try {
        const created = await client.request<LetzAiJob>('POST', '/upscale', args);
        return jsonText({ id: created.id, status: created.status ?? 'created', note: 'Poll get_upscale for progress/result.' });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'get_upscale',
    {
      title: 'Get an upscale',
      description: 'Get an upscale job by id, including status and result URLs.',
      inputSchema: { id: z.string().uuid().describe('Upscale id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('GET', `/upscale/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'list_upscales',
    {
      title: 'List upscales',
      description: 'List the caller\'s upscale jobs with pagination.',
      inputSchema: { ...paginationShape },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/upscale${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'delete_upscale',
    {
      title: 'Delete an upscale',
      description: 'Delete an upscale job by id.',
      inputSchema: { id: z.string().uuid().describe('Upscale id') },
    },
    async ({ id }) => {
      try {
        await client.request('DELETE', `/upscale/${id}`);
        return jsonText({ id, deleted: true });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
