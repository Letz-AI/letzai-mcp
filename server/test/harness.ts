import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { clearTokenCache } from '../src/auth.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';

/** A stand-in for the LetzAI public API: `/oauth/tokeninfo`, plus whatever routes a test adds. */
export interface FakeApi {
  url: string;
  /** Connector tokens the fake authorization server considers live. */
  tokens: Map<string, { aud: string; scope: string; exp?: number }>;
  requests: Array<{ method: string; path: string; authorization?: string }>;
  tokeninfoCalls: number;
  routes: Map<string, (request: IncomingMessage) => { status: number; body: unknown }>;
  close(): Promise<void>;
}

export const RESOURCE = 'https://mcp.test/mcp';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Shaped like a connector token (`typ: at+jwt`). The fake API decides whether it is live. */
export const connectorToken = (label: string) =>
  `${encode({ alg: 'HS256', typ: 'at+jwt' })}.${encode({ label })}.signature`;

export async function startFakeApi(): Promise<FakeApi> {
  const api: FakeApi = {
    url: '',
    tokens: new Map(),
    requests: [],
    tokeninfoCalls: 0,
    routes: new Map(),
    close: async () => undefined,
  };

  const server: Server = createServer((request, response) => {
    const path = (request.url ?? '').split('?')[0];
    const authorization = request.headers.authorization;
    api.requests.push({ method: request.method ?? '', path, authorization });

    const reply = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };

    if (path === '/oauth/tokeninfo') {
      api.tokeninfoCalls += 1;
      const token = authorization?.replace(/^Bearer /, '') ?? '';
      const live = api.tokens.get(token);
      if (!live) return reply(401, { message: 'Invalid token' });

      return reply(200, {
        active: true,
        aud: live.aud,
        scope: live.scope,
        sub: 'user-1',
        client_id: 'https://client.test/client.json',
        exp: live.exp ?? Math.floor(Date.now() / 1000) + 3600,
      });
    }

    const route = api.routes.get(`${request.method} ${path}`);
    if (route) {
      const { status, body } = route(request);

      return reply(status, body);
    }

    reply(404, { message: 'not found' });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  api.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  api.close = () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });

  return api;
}

export interface Mcp {
  url: string;
  close(): Promise<void>;
}

export async function startMcp(api: FakeApi, options: { oauth: boolean }): Promise<Mcp> {
  config.apiBaseUrl = api.url;
  config.oauth.enabled = options.oauth;
  config.oauth.resource = RESOURCE;
  config.oauth.authorizationServer = api.url;
  config.oauth.tokenCacheTtlMs = 60_000;
  clearTokenCache();

  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export interface RpcResult {
  status: number;
  headers: Headers;
  /** The JSON-RPC message, whether the server answered with JSON or as a single SSE event. */
  message: any;
}

export async function rpc(
  mcp: Mcp,
  body: unknown,
  options: { token?: string; path?: string } = {},
): Promise<RpcResult> {
  const response = await fetch(`${mcp.url}${options.path ?? '/mcp'}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let message: unknown;
  try {
    message = JSON.parse(text);
  } catch {
    const data = text.split('\n').find((line) => line.startsWith('data: '));
    message = data ? JSON.parse(data.slice('data: '.length)) : undefined;
  }

  return { status: response.status, headers: response.headers, message };
}

export const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
};

export const callTool = (name: string, args: Record<string, unknown> = {}, id = 2) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name, arguments: args },
});
