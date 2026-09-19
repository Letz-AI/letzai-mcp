# LetzAI MCP Server (`mcp.letz.ai`)

Phase 1 of [#966](https://github.com/Letz-AI/api/issues/966) — a **hosted, remote** MCP server that exposes LetzAI generation as tools any MCP client (Claude, etc.) can connect to. See the full plan in [`doc/plans/mcp-server-connectors-plan.md`](../doc/plans/mcp-server-connectors-plan.md).

This replaces the old local **stdio** `letzai-mcp` (Claude-Desktop-only, per-user API key in an env var) with a multi-tenant **Streamable HTTP** service where the caller's LetzAI integration token arrives per-request in the `Authorization` header.

## Status

**Working tool set (24 tools) — build + boot verified.** HTTP transport, per-request bearer auth, and tools across all public-API resources. Build (`tsc`) is clean and `tools/list` returns the full set; individual tool *calls* still need a live smoke test against a real integration token (they spend credits). Authentication, scopes and the OAuth resource-server behaviour are covered by `npm test` (40 tests, no network).

## Architecture

- **Transport:** Streamable HTTP (stateless — one MCP server + transport per request).
- **Auth:** a bearer token per request, of either kind — a **connector token** obtained through OAuth (add the URL, log in to LetzAI, approve; no key to paste) or a LetzAI **integration token** (API key). Either way the token is forwarded to the LetzAI public API, which enforces permissions and deducts credits. The server holds **no** key or secret of its own. OAuth is behind `LETZAI_OAUTH_ENABLED` and off by default. See [`docs/authentication.md`](docs/authentication.md).
- **Tools are thin adapters** over the existing public API — no generation logic is reimplemented.

## Tools (24)

Thin adapters over the public API — grouped by resource. Generation tools that can be slow (video/edit/upscale) return the created id immediately; poll the matching `get_*`. `generate_image` blocks until ready and returns the URL.

| Resource | Tools |
| --- | --- |
| Images | `generate_image`, `get_image`, `list_images`, `interrupt_image`, `set_image_privacy` |
| Image edits | `edit_image`, `get_image_edit`, `list_image_edits` |
| Videos | `generate_video`, `get_video`, `list_videos`, `set_video_privacy` |
| Upscale | `upscale_image`, `get_upscale`, `list_upscales`, `delete_upscale` |
| Models | `list_models`, `get_model`, `create_model`, `update_model`, `delete_model` |
| User assets | `list_user_assets`, `get_user_asset`, `list_user_images` |

Not yet exposed (multipart upload / niche): asset upload (`POST /user-assets`, `/user-images`), model thumbnail, image-edit mask fetch, prompt-privacy variants.

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
