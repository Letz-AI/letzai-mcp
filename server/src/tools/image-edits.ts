import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, jsonText, paginationShape, queryString } from '../common.js';
import { LetzAiClient, LetzAiJob } from '../letzai-client.js';

export function registerImageEditTools(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'edit_image',
    {
      title: 'Edit an image',
      description:
        'Create an image edit (e.g. inpainting/variation) from an existing image ' +
        '(by id or URL). Returns the created edit id + status — poll `get_image_edit` ' +
        'for the result.',
      inputSchema: {
        mode: z.string().max(32).describe('Edit mode'),
        originalImageCompletionId: z.string().uuid().optional().describe('Source image id'),
        originalImageCompletionIds: z.array(z.string().uuid()).optional().describe('Multiple source image ids'),
        imageUrl: z.string().url().optional().describe('Source image URL (alternative to an id)'),
        prompt: z.string().optional().describe('Edit prompt'),
        mask: z.string().optional().describe('Inpainting mask'),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        quantity: z.number().int().min(1).max(5).optional().describe('Number of results (1-5)'),
        organizationId: z.string().uuid().optional().describe('Organization to deduct credits from'),
      },
    },
    async (args) => {
      try {
        const created = await client.request<LetzAiJob>('POST', '/image-edits', args);
        return jsonText({ id: created.id, status: created.status ?? 'created', note: 'Poll get_image_edit for progress/result.' });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'get_image_edit',
    {
      title: 'Get an image edit',
      description: 'Get an image edit by id, including status and result URLs.',
      inputSchema: { id: z.string().uuid().describe('Image edit id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('GET', `/image-edits/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'list_image_edits',
    {
      title: 'List image edits',
      description: 'List the caller\'s image edits with pagination.',
      inputSchema: { ...paginationShape },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/image-edits${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
