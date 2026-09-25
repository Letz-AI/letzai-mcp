/**
 * What a connector (OAuth) token needs in order to call each tool.
 *
 * Mirrors the scope map on the LetzAI public API, which enforces the same rules again on
 * every call — this table is not the security boundary. It exists so the server can answer
 * with a proper `insufficient_scope` challenge *before* running a tool, which is what lets a
 * client ask the user for more access instead of just showing an error.
 *
 * Every tool must appear here. Registering one that does not throws at startup, so a new tool
 * cannot ship without someone deciding what it requires.
 */
export type Scope = 'letzai:read' | 'letzai:generate' | 'letzai:manage';

export const SCOPES: Scope[] = ['letzai:read', 'letzai:generate', 'letzai:manage'];

export const TOOL_SCOPES: Record<string, Scope> = {
  // images
  generate_image: 'letzai:generate',
  get_image: 'letzai:read',
  list_images: 'letzai:read',
  interrupt_image: 'letzai:generate',
  set_image_privacy: 'letzai:manage',
  // image edits
  edit_image: 'letzai:generate',
  get_image_edit: 'letzai:read',
  list_image_edits: 'letzai:read',
  // videos
  generate_video: 'letzai:generate',
  get_video: 'letzai:read',
  list_videos: 'letzai:read',
  set_video_privacy: 'letzai:manage',
  // upscales
  upscale_image: 'letzai:generate',
  get_upscale: 'letzai:read',
  list_upscales: 'letzai:read',
  delete_upscale: 'letzai:manage',
  // trained models
  list_models: 'letzai:read',
  get_model: 'letzai:read',
  create_model: 'letzai:manage',
  update_model: 'letzai:manage',
  delete_model: 'letzai:manage',
  // uploads
  list_user_assets: 'letzai:read',
  get_user_asset: 'letzai:read',
  list_user_images: 'letzai:read',
};

/** `manage` implies the other two; `read` and `generate` are independent. */
const IMPLIES: Record<Scope, Scope[]> = {
  'letzai:read': ['letzai:read'],
  'letzai:generate': ['letzai:generate'],
  'letzai:manage': ['letzai:read', 'letzai:generate', 'letzai:manage'],
};

export function satisfies(granted: readonly string[], required: Scope): boolean {
  return granted.some((scope) => IMPLIES[scope as Scope]?.includes(required));
}

export function parseScope(scope: string | undefined): string[] {
  return (scope ?? '').split(' ').filter(Boolean);
}
