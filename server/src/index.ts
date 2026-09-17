import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Request, type Response } from 'express';
import { config } from './config.js';
import { landingHtml } from './landing.js';
import { buildMcpServer } from './mcp-server.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Human-facing landing page / user guide (same host as the MCP protocol).
app.get('/', (_req: Request, res: Response) => {
  res.type('html').send(landingHtml);
});

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'letzai-mcp-server' });
});

/**
 * Extract the caller's LetzAI integration token from the Authorization header.
 * MVP auth: bearer integration token (validated downstream by the LetzAI API on
 * every tool call). Phase 1.5 swaps/augments this with OAuth 2.1.
 */
function bearerToken(req: Request): string | undefined {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
}

function unauthorized(res: Response): void {
  res
    .status(401)
    .set('WWW-Authenticate', 'Bearer')
    .json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: a LetzAI integration token is required (Authorization: Bearer <token>).',
      },
      id: null,
    });
}

// Streamable HTTP MCP endpoint. Stateless: a fresh server + transport per POST,
// so each request is isolated to its own token.
app.post('/mcp', async (req: Request, res: Response) => {
  const token = bearerToken(req);
  if (!token) return unauthorized(res);

  const server = buildMcpServer(token);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: `Internal error: ${(err as Error).message}` },
        id: null,
      });
    }
  }
});

// Stateless mode does not support the SSE stream (GET) or session teardown (DELETE).
const methodNotAllowed = (_req: Request, res: Response): void => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
    id: null,
  });
};
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `LetzAI MCP server listening on :${config.port} (proxying ${config.apiBaseUrl})`,
  );
});
