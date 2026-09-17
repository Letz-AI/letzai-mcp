# LetzAI MCP

Two MCP servers for [LetzAI](https://letz.ai), in one repo.

| | | |
|---|---|---|
| [`server/`](server) | **Hosted** — what runs at `https://mcp.letz.ai` | Remote, Streamable HTTP, multi-user |
| [`stdio/`](stdio) | **Local** — the original Claude Desktop integration | stdio, single user, your own API key |

## Hosted server (`server/`)

The one to point an MCP client at. Add `https://mcp.letz.ai/mcp` and authenticate
with a LetzAI integration token as a bearer token.

It is a thin, stateless adapter over the LetzAI public API: every request carries
the caller's own token, so permissions and credits resolve to that user or
organization. The server holds no key of its own. 24 tools cover image and video
generation, image editing, upscaling, trained models and user assets.

See [`server/README.md`](server/README.md) for the tool list and local development.

## Local stdio server (`stdio/`)

The original integration for Claude Desktop, which runs on your own machine with
your API key in the client config. Unchanged apart from its path. Prefer the
hosted server unless you specifically want a local process.

## Deployment

The hosted server runs on GKE (`letzai-prod-services-gcp`, namespace `mcp`), behind
the `mcp.letz.ai` ingress. Kubernetes manifests live in the `infrastructure` repo
under `gcp/workloads/mcp/`.

- **Dev** — every push to `main` that touches `server/` builds and rolls out to
  `mcp.dev.letz.ai` automatically.
- **Prod** — deliberate: run the *Deploy MCP (prod)* workflow, or push a `v*` tag.
