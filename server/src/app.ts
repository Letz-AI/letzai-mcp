import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Express, type Request, type Response } from 'express';
import {
  authenticate,
  bearerToken,
  type Caller,
  challenge,
  InvalidTokenError,
  protectedResourceMetadata,
  resourceMetadataUrl,
} from './auth.js';
import { config } from './config.js';
import { landingHtml } from './landing.js';
import { buildMcpServer } from './mcp-server.js';
import { satisfies, type Scope, TOOL_SCOPES } from './scopes.js';

function rpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null });
}

/**
 * The scopes a request needs beyond what the caller holds. Looks inside the JSON-RPC body —
 * a single call or a batch — because a missing scope has to be answered at the HTTP layer
 * (403 + WWW-Authenticate) for a client to recognise it and ask the user for more access.
 * Every missing scope is reported at once, as the MCP spec asks.
 */
export function missingScopes(body: unknown, granted: readonly string[]): Scope[] {
  const messages = Array.isArray(body) ? body : [body];
  const missing = new Set<Scope>();

  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    const { method, params } = message as { method?: string; params?: { name?: string } };
    if (method !== 'tools/call' || typeof params?.name !== 'string') continue;

    const required = TOOL_SCOPES[params.name];
    // An unknown tool is left for the MCP layer to reject as unknown.
    if (required && !satisfies(granted, required)) {
      missing.add(required);
    }
  }

  return [...missing];
}

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Human-facing landing page / user guide (same host as the MCP protocol).
  app.get('/', (_req: Request, res: Response) => {
    res.type('html').send(landingHtml);
  });

  app.get('/healthz', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'letzai-mcp-server' });
  });

  if (config.oauth.enabled) {
    // RFC 9728 puts the document at /.well-known/oauth-protected-resource{/path}. Claude
    // probes the path-suffixed form first and the bare form second; serve both.
    const metadata = (_req: Request, res: Response) => {
      res.set('Cache-Control', 'public, max-age=3600').json(protectedResourceMetadata());
    };
    app.get(new URL(resourceMetadataUrl()).pathname, metadata);
    app.get('/.well-known/oauth-protected-resource', metadata);
  }

  // Streamable HTTP MCP endpoint. Stateless: a fresh server + transport per POST,
  // so each request is isolated to its own token.
  app.post('/mcp', async (req: Request, res: Response) => {
    // Header only. A token in the query string is never read (MCP spec, and common sense:
    // URLs end up in logs).
    const token = bearerToken(req.header('authorization'));
    if (!token) {
      res.set('WWW-Authenticate', challenge());
      return rpcError(res, 401, -32001, config.oauth.enabled
        ? 'Unauthorized: connect your LetzAI account, or send a LetzAI API key as a bearer token.'
        : 'Unauthorized: a LetzAI integration token is required (Authorization: Bearer <token>).');
    }

    let caller: Caller;
    try {
      caller = await authenticate(token);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        res.set('WWW-Authenticate', challenge({ error: 'invalid_token', description: 'The access token is invalid or expired.' }));
        return rpcError(res, 401, -32001, 'Unauthorized: the access token is invalid or expired.');
      }
      throw err;
    }

    if (caller.kind === 'oauth') {
      const missing = missingScopes(req.body, caller.scopes);
      if (missing.length > 0) {
        res.set('WWW-Authenticate', challenge({
          error: 'insufficient_scope',
          description: 'This tool needs more access than was granted.',
          scope: missing.join(' '),
        }));
        return rpcError(res, 403, -32003, `Forbidden: this tool requires ${missing.join(' ')}.`);
      }
    }

    const server = buildMcpServer(caller.token);
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
        rpcError(res, 500, -32603, `Internal error: ${(err as Error).message}`);
      }
    }
  });

  // Stateless mode does not support the SSE stream (GET) or session teardown (DELETE).
  const methodNotAllowed = (_req: Request, res: Response): void => {
    rpcError(res, 405, -32000, 'Method not allowed. Use POST /mcp.');
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  return app;
}
