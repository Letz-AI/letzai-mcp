import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, jsonText, paginationShape, queryString } from '../common.js';
import { isJobReady, LetzAiClient, LetzAiJob } from '../letzai-client.js';

export function registerImageTools(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'generate_image',
    {
      title: 'Generate an image',
      description:
        'Generate an image from a text prompt. Waits until the image is ready ' +
        'and returns its URL. Write the prompt as director\'s notes (subject, ' +
        'framing, angle, light, mood) — no quality-padding tags. To use a ' +
        'user-trained model, put its @handle in the prompt text (confirm it ' +
        'with list_models first; never invent one). Credits are deducted from ' +
        'the caller (or the given organization).',
      inputSchema: {
        prompt: z.string().min(1).describe('Text description of the image (director\'s notes; @handle for a trained model goes here)'),
        baseModel: z.string().optional().describe('Base model — canonical value from the letzai://models resource (e.g. seedream-4-5-251128); omit for the default. Never pass a friendly alias.'),
        width: z.number().int().min(480).max(2160).optional().describe('Width in px (480-2160, default 1600)'),
        height: z.number().int().min(480).max(2160).optional().describe('Height in px (480-2160, default 1600)'),
        quality: z.number().int().min(1).max(6).optional().describe('Quality level (1-6, default 2). Keep low unless the user asks for high quality/final — they pay per level.'),
        creativity: z.number().int().min(1).max(6).optional().describe('Creativity level (1-6, default 2)'),
        hasWatermark: z.boolean().optional().describe('Apply a watermark (default true)'),
        organizationId: z.string().uuid().optional().describe('Organization to deduct credits from (caller must be a member)'),
      },
    },
    async (args) => {
      try {
        const created = await client.request<LetzAiJob>('POST', '/images', args);
        const image = await client.poll<LetzAiJob>(`/images/${created.id}`, isJobReady);
        const url = image.imageVersions?.original ?? image.imageVersions?.['1920x1920'];
        return jsonText({ id: image.id, status: image.status, url, imageVersions: image.imageVersions });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'get_image',
    {
      title: 'Get an image',
      description: 'Get an image generation by id, including status/progress and result URLs.',
      inputSchema: { id: z.string().uuid().describe('Image id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('GET', `/images/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'list_images',
    {
      title: 'List images',
      description: 'List the caller\'s images with pagination and optional filters.',
      inputSchema: {
        ...paginationShape,
        status: z.string().optional().describe('Filter by status'),
        username: z.string().optional().describe('Filter by username'),
      },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/images${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'interrupt_image',
    {
      title: 'Interrupt an image generation',
      description: 'Stop an in-progress image generation.',
      inputSchema: { id: z.string().uuid().describe('Image id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('PUT', `/images/${id}/interruption`, {}));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'set_image_privacy',
    {
      title: 'Set image privacy',
      description: 'Change an image\'s privacy. Pass the privacy value accepted by the API (e.g. "public"/"private"/"not_listed"); invalid values return the allowed set.',
      inputSchema: {
        id: z.string().uuid().describe('Image id'),
        privacy: z.string().describe('Privacy value'),
      },
    },
    async ({ id, privacy }) => {
      try {
        return jsonText(await client.request('PUT', `/images/${id}/privacy`, { privacy }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
