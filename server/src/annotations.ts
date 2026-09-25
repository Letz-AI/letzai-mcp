import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

/**
 * How each tool behaves, told to the client (MCP `ToolAnnotations`). Clients use these to
 * decide what they may run without asking — Claude, for one, treats a read-only tool very
 * differently from one that deletes — and connector directories require them on every tool.
 *
 * They are hints, never a security boundary: scopes are (see scopes.ts), enforced by the API.
 * Every tool must appear here; registering one that does not throws at startup.
 *
 * `openWorldHint` is false throughout: every tool acts on the caller's own LetzAI account,
 * not on the open web.
 */
const READ: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** Creates something new and spends credits. Nothing existing is changed or lost. */
const SPENDS_CREDITS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/** Changes a setting on something that exists; setting it twice is the same as once. */
const CHANGES_SETTING: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** Cannot be undone. */
const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  // images
  generate_image: SPENDS_CREDITS,
  get_image: READ,
  list_images: READ,
  interrupt_image: DESTRUCTIVE, // an interrupted generation cannot be resumed
  set_image_privacy: CHANGES_SETTING,
  // image edits
  edit_image: SPENDS_CREDITS,
  get_image_edit: READ,
  list_image_edits: READ,
  // videos
  generate_video: SPENDS_CREDITS,
  get_video: READ,
  list_videos: READ,
  set_video_privacy: CHANGES_SETTING,
  // upscales
  upscale_image: SPENDS_CREDITS,
  get_upscale: READ,
  list_upscales: READ,
  delete_upscale: DESTRUCTIVE,
  // trained models
  list_models: READ,
  get_model: READ,
  create_model: SPENDS_CREDITS,
  update_model: DESTRUCTIVE, // overwrites the model's fields; the old values are gone
  delete_model: DESTRUCTIVE,
  // uploads
  list_user_assets: READ,
  get_user_asset: READ,
  list_user_images: READ,
};
