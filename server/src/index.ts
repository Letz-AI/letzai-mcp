import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `LetzAI MCP server listening on :${config.port} (proxying ${config.apiBaseUrl}, ` +
      `OAuth ${config.oauth.enabled ? `on for ${config.oauth.resource}` : 'off'})`,
  );
});
