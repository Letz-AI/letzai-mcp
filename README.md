# LetzAI MCP Server (`mcp.letz.ai`)

Phase 1 of [#966](https://github.com/Letz-AI/api/issues/966) — a **hosted, remote** MCP server that exposes LetzAI generation as tools any MCP client (Claude, etc.) can connect to. See the full plan in [`doc/plans/mcp-server-connectors-plan.md`](../doc/plans/mcp-server-connectors-plan.md).

This replaces the old local **stdio** `letzai-mcp` (Claude-Desktop-only, per-user API key in an env var) with a multi-tenant **Streamable HTTP** service where the caller's LetzAI integration token arrives per-request in the `Authorization` header.

## Status

**MVP scaffold — not yet build-verified.** Contains the HTTP transport, per-request bearer auth, and the first tool (`generate_image`) wired to the public API. Next: `npm install && npm run build`, then a live smoke test.

## Architecture

- **Transport:** Streamable HTTP (stateless — one MCP server + transport per request).
- **Auth (MVP):** `Authorization: Bearer <LetzAI integration token>`; the token is forwarded to the LetzAI public API, which enforces permissions and deducts credits. The server holds **no** global key. (Phase 1.5: OAuth 2.1.)
- **Tools are thin adapters** over the existing public API — no generation logic is reimplemented.

## Tools

| Tool | Wraps | Status |
| --- | --- | --- |
| `generate_image` | `POST /images` + poll `GET /images/{id}` | scaffolded |
| `generate_video`, `edit_image`, `upscale`, `list_models`, `get_generation_status` | — | planned |

## Run locally

```bash
cp .env.example .env
npm install
npm run build && npm start   # or: npm run dev
```

## Connect a client

Point any MCP client at the server's `/mcp` endpoint with your integration token:

```
URL:  https://mcp.letz.ai/mcp   (local: http://localhost:3010/mcp)
Header: Authorization: Bearer <your LetzAI integration token>
```

Inspect locally with `npm run inspector`.

## Config

| Env | Default | Purpose |
| --- | --- | --- |
| `LETZAI_API_BASE_URL` | `https://api.letz.ai` | Public API the tools call |
| `PORT` | `3010` | Listen port |
| `LETZAI_POLL_TIMEOUT_MS` | `180000` | Max wait for an async generation |
