import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, jsonText, paginationShape, queryString } from '../common.js';
import { LetzAiClient, LetzAiJob } from '../letzai-client.js';

export function registerVideoTools(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'generate_video',
    {
      title: 'Generate a video',
      description:
        'Generate a video from a prompt, optionally seeded by an existing image ' +
        '(by id or URL) or asset URLs. Video generation is slow — returns the ' +
        'created video id + status; poll `get_video` for the result.',
      inputSchema: {
        prompt: z.string().min(1).describe('Text description of the video'),
        originalImageCompletionId: z.string().uuid().optional().describe('Seed image id'),
        imageUrl: z.string().url().optional().describe('Seed image URL'),
        imageUrls: z.array(z.string()).optional().describe('Multiple seed image URLs'),
        assetUrls: z.array(z.string()).optional().describe('Input asset URLs (e.g. face images)'),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        resolution: z.number().int().optional(),
        baseModel: z.string().optional().describe('Base model identifier'),
        hidePrompt: z.boolean().optional(),
        organizationId: z.string().uuid().optional().describe('Organization to deduct credits from'),
      },
    },
    async (args) => {
      try {
        const created = await client.request<LetzAiJob>('POST', '/videos', args);
        return jsonText({ id: created.id, status: created.status ?? 'created', note: 'Poll get_video for progress/result.' });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'get_video',
    {
      title: 'Get a video',
      description: 'Get a video by id, including status/progress and result URLs.',
      inputSchema: { id: z.string().uuid().describe('Video id') },
    },
    async ({ id }) => {
      try {
        return jsonText(await client.request('GET', `/videos/${id}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'list_videos',
    {
      title: 'List videos',
      description: 'List the caller\'s videos with pagination.',
      inputSchema: { ...paginationShape },
    },
    async (args) => {
      try {
        return jsonText(await client.request('GET', `/videos${queryString(args)}`));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'set_video_privacy',
    {
      title: 'Set video privacy',
      description: 'Change a video\'s privacy (pass the API-accepted value).',
      inputSchema: {
        id: z.string().uuid().describe('Video id'),
        privacy: z.string().describe('Privacy value'),
      },
    },
    async ({ id, privacy }) => {
      try {
        return jsonText(await client.request('PUT', `/videos/${id}/privacy`, { privacy }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
