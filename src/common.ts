import { z } from 'zod';

/** Shared pagination params matching the public API's list endpoints. */
export const paginationShape = {
  page: z.number().int().min(1).optional().describe('Page number (default 1)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Items per page (1-50, default 10)'),
  sortBy: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
};

/** Wrap any JSON payload as an MCP text result. */
export function jsonText(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Standard error result so a failed API call surfaces cleanly to the client. */
export function errorResult(err: unknown) {
  return {
    isError: true,
    content: [
      { type: 'text' as const, text: `Error: ${(err as Error).message}` },
    ],
  };
}

/** Build a `?a=1&b=2` query string, dropping undefined/null values. */
export function queryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
