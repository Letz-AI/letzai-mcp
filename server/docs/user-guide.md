# LetzAI MCP — User Guide

Use LetzAI to **generate images and videos straight from your AI chat** — Claude, Cursor, or any MCP-compatible client. You connect once with a token, then just ask in plain language: *"make me an image of a neon city at dusk."* Your agent does the rest.

> **Availability:** production endpoint `https://mcp.letz.ai/mcp` (rolling out). For testing today, dev is live at `https://mcp.dev.letz.ai/mcp`.

---

## 1. What you'll need

1. A **LetzAI account** with credits (generations spend credits, same as on the website).
2. A **LetzAI integration token** — your personal API key:
   - Go to **letz.ai → Settings → API / Integration tokens → Create token**, name it (e.g. "Claude"), and copy it. Keep it secret; it acts on your account.

---

## 2. Connect your client

Point your client at the MCP URL and paste your token. Pick your app:

### Claude (web / desktop) — Connectors
Settings → **Connectors** → **Add custom connector**:
- **URL:** `https://mcp.letz.ai/mcp`
- **Authorization:** `Bearer YOUR_TOKEN`

### Claude Desktop (config file)
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "letzai": {
      "url": "https://mcp.letz.ai/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```
Restart Claude Desktop.

### Cursor / other MCP clients
Add an MCP server with URL `https://mcp.letz.ai/mcp` and header `Authorization: Bearer YOUR_TOKEN`.

Once connected, you'll see LetzAI tools available in the client. **You don't call them by name** — just talk to your agent.

---

## 3. What you can ask (examples)

You interact in natural language; the agent picks the right tool. A few things you can say:

**🖼️ Generate images**
- *"Generate an image of a red maple leaf on a white background."*
- *"Make a 2160×2160 portrait of a cyberpunk street, high quality."*
- *"Give me 3 variations of a minimalist logo for a coffee brand."*

**✏️ Edit / inpaint**
- *"Take image `<id>` and remove the background."*
- *"Change the sky in this image to a sunset."*

**🎬 Videos**
- *"Animate this image into a 5-second clip."*
- *"Make a video of waves rolling onto a beach."*

**🔍 Upscale**
- *"Upscale image `<id>` to 4×."*

**🧑 Your own models**
- *"List my models."*
- *"Generate a portrait using my model `<id>`."*
- *"Train a new model on these images: `<urls>`."*

**📋 Manage your creations**
- *"Show my last 10 images."* · *"What's the status of image `<id>`?"* · *"Make image `<id>` private."*

Tips:
- **Size/quality:** just say *"bigger"*, *"higher quality"*, *"more creative"* — the agent maps these to parameters.
- **Images** come back as a URL once ready. **Videos, edits, and upscales** can take a while — the agent returns an id immediately and you can ask *"is it done yet?"*.
- **Organizations:** if you're on an org plan, say *"charge my organization <name>"* to spend org credits.

---

## 4. Credits & billing

- Every generation **spends credits from your LetzAI account** (or your organization's), exactly like the website.
- If you're out of credits you'll get an "out of credits" message — top up on letz.ai.
- Images may include a **watermark** depending on your plan; you can ask to disable it if your plan allows.

---

## 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Unauthorized" / 401 | Your token is missing/expired/mistyped. Recreate it and re-paste `Bearer YOUR_TOKEN`. |
| Tools don't appear | Re-check the URL (`https://mcp.letz.ai/mcp`) and that the connector is enabled; restart the client. |
| "Out of credits" (402) | Top up credits on letz.ai. |
| A video/edit "isn't done" | It's still generating — ask again in a bit, or *"get the status of `<id>`"*. |
| A generation failed | Try a simpler prompt or different size; check the error message the agent shows. |

---

## 6. Privacy & safety

- Your integration token acts on **your** account — treat it like a password. You can **revoke** it anytime in letz.ai → Settings → API tokens.
- The MCP server never stores your token; it's used only to talk to the LetzAI API on your behalf for each request.

---

**Supported clients:** any MCP-compatible client (Claude web/desktop, Cursor, and others). If your client speaks MCP over HTTP, it works.
