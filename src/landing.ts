/**
 * Human-facing landing page served at GET / — the public face of mcp.letz.ai
 * (the same host that serves the MCP protocol at POST /mcp). Self-contained
 * HTML/CSS, no external assets. Mirrors doc/mcp-user-guide.md.
 */
export const landingHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LetzAI MCP — Generate images & video from your chat</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --fg:#111; --muted:#666; --card:#f6f6f7; --border:#e5e5e8; --accent:#5b5bd6; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0e0e11; --fg:#eee; --muted:#9a9aa5; --card:#17171c; --border:#26262e; --accent:#8f8fff; } }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--fg); }
  .wrap { max-width:820px; margin:0 auto; padding:48px 20px 80px; }
  h1 { font-size:2rem; margin:0 0 .3em; }
  h2 { font-size:1.25rem; margin:2em 0 .6em; }
  p.lead { font-size:1.15rem; color:var(--muted); }
  code, pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.9em; }
  code { background:var(--card); padding:.15em .4em; border-radius:4px; }
  pre { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:14px 16px; overflow-x:auto; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px 18px; margin:12px 0; }
  .card h3 { margin:0 0 .4em; font-size:1rem; }
  ul { padding-left:1.2em; }
  .ex { color:var(--fg); }
  .ex li { margin:.25em 0; }
  a { color:var(--accent); }
  .pill { display:inline-block; background:var(--accent); color:#fff; border-radius:999px; padding:.15em .7em; font-size:.8rem; }
  table { border-collapse:collapse; width:100%; }
  td,th { border:1px solid var(--border); padding:8px 10px; text-align:left; vertical-align:top; }
  footer { margin-top:48px; color:var(--muted); font-size:.9rem; border-top:1px solid var(--border); padding-top:16px; }
</style>
</head>
<body>
<div class="wrap">
  <span class="pill">LetzAI MCP</span>
  <h1>Generate images &amp; video from your chat</h1>
  <p class="lead">Connect LetzAI to Claude, Cursor, or any MCP client — then just ask: <em>"make me an image of a neon city at dusk."</em> Your agent does the rest.</p>

  <h2>1 · Get your token</h2>
  <p>You need a <strong>LetzAI account with credits</strong> and a <strong>personal integration token</strong>: on <a href="https://letz.ai">letz.ai</a> → <strong>Settings → API / Integration tokens → Create token</strong>. Copy it and keep it secret — it acts on your account.</p>

  <h2>2 · Connect your client</h2>
  <p>Point your client at <code>https://mcp.letz.ai/mcp</code> with header <code>Authorization: Bearer YOUR_TOKEN</code>.</p>
  <div class="card">
    <h3>Claude (web / desktop) — Connectors</h3>
    Settings → <strong>Connectors</strong> → <strong>Add custom connector</strong> → URL <code>https://mcp.letz.ai/mcp</code>, Authorization <code>Bearer YOUR_TOKEN</code>.
  </div>
  <div class="card">
    <h3>Claude Desktop — config file</h3>
    <pre>{
  "mcpServers": {
    "letzai": {
      "url": "https://mcp.letz.ai/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}</pre>
    Restart Claude Desktop.
  </div>
  <div class="card">
    <h3>Cursor / other MCP clients</h3>
    Add an MCP server: URL <code>https://mcp.letz.ai/mcp</code>, header <code>Authorization: Bearer YOUR_TOKEN</code>.
  </div>

  <h2>3 · What you can ask</h2>
  <p>You talk in plain language — the agent picks the tool. For example:</p>
  <ul class="ex">
    <li>🖼️ <em>"Generate an image of a red maple leaf on a white background."</em></li>
    <li>✏️ <em>"Take image &lt;id&gt; and remove the background."</em></li>
    <li>🎬 <em>"Animate this image into a 5-second clip."</em></li>
    <li>🔍 <em>"Upscale image &lt;id&gt; to 4×."</em></li>
    <li>🧑 <em>"Generate a portrait using my model &lt;id&gt;."</em> · <em>"List my models."</em></li>
    <li>📋 <em>"Show my last 10 images."</em> · <em>"Is image &lt;id&gt; done yet?"</em></li>
  </ul>
  <p style="color:var(--muted)">Images return a URL when ready. Videos, edits, and upscales take longer — the agent gives you an id, then you can ask "is it done?". On an org plan, say "charge my organization" to spend org credits.</p>

  <h2>4 · Credits &amp; troubleshooting</h2>
  <table>
    <tr><th>Situation</th><th>What to do</th></tr>
    <tr><td>Generations spend credits</td><td>Same as the website — top up on <a href="https://letz.ai">letz.ai</a>.</td></tr>
    <tr><td>"Unauthorized" (401)</td><td>Token missing/expired/mistyped — recreate it and re-paste <code>Bearer YOUR_TOKEN</code>.</td></tr>
    <tr><td>"Out of credits" (402)</td><td>Top up credits on letz.ai.</td></tr>
    <tr><td>Tools don't appear</td><td>Check the URL and that the connector is enabled; restart the client.</td></tr>
  </table>
  <p style="color:var(--muted);margin-top:1em">Your token acts on your account — treat it like a password and revoke it anytime in Settings. The server never stores it.</p>

  <footer>
    LetzAI MCP · <a href="https://letz.ai">letz.ai</a> · This URL also speaks the MCP protocol at <code>POST /mcp</code>.
  </footer>
</div>
</body>
</html>`;
