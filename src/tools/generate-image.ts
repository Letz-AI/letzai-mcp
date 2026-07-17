import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LetzAiClient } from '../letzai-client.js';

/**
 * `generate_image` — the Phase-1 MVP tool. Wraps `POST /images` + polling of
 * `GET /images/{id}` on the LetzAI public API. Parameter ranges mirror the
 * public API contract (width/height 480-2160, quality/creativity 1-6).
 */
export function registerGenerateImage(
  server: McpServer,
  client: LetzAiClient,
): void {
  server.registerTool(
    'generate_image',
    {
      title: 'Generate an image',
      description:
        'Generate an image from a text prompt using LetzAI. Blocks until the ' +
        'image is ready and returns its URL. Credits are deducted from the ' +
        'caller (or the given organization).',
      inputSchema: {
        prompt: z.string().min(1).describe('Text description of the image'),
        width: z.number().int().min(480).max(2160).optional()
          .describe('Width in px (480-2160, default 1600)'),
        height: z.number().int().min(480).max(2160).optional()
          .describe('Height in px (480-2160, default 1600)'),
        quality: z.number().int().min(1).max(6).optional()
          .describe('Quality level (1-6, default 2)'),
        creativity: z.number().int().min(1).max(6).optional()
          .describe('Creativity level (1-6, default 2)'),
        hasWatermark: z.boolean().optional()
          .describe('Apply a watermark (default true)'),
        organizationId: z.string().uuid().optional()
          .describe('Organization UUID to deduct credits from (caller must be a member)'),
      },
    },
    async (args) => {
      try {
        const created = await client.createImage(args);
        const image = await client.pollImage(created.id);
        const url = image.imageVersions?.original ?? image.imageVersions?.['1920x1920'];
        return {
          content: [
            {
              type: 'text',
              text: url
                ? `Image ready: ${url}`
                : `Image ${created.id} finished but returned no URL.`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            { type: 'text', text: `generate_image failed: ${(err as Error).message}` },
          ],
        };
      }
    },
  );
}
