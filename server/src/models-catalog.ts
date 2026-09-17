import { config } from './config.js';

export interface CatalogModel {
  key: string;
  displayName: string;
  category: 'image' | 'video' | 'upscale' | 'other';
  /** Value to pass as `baseModel` to the generation API. */
  baseModel: string;
  aliases: string[];
  enterpriseOnly: boolean;
}

interface RawModel {
  active?: boolean;
  displayName?: string;
  aliases?: string[];
  enterpriseOnly?: boolean;
  capabilities?: Record<string, unknown>;
  frontend?: { baseModel?: string };
}

function categorize(caps: string[]): CatalogModel['category'] {
  if (caps.includes('generation') || caps.includes('editing')) return 'image';
  if (caps.includes('video')) return 'video';
  if (caps.includes('upscaling')) return 'upscale';
  return 'other';
}

function distill(json: { models?: Record<string, RawModel> }): CatalogModel[] {
  const models = json.models ?? {};
  return Object.entries(models)
    .filter(([, m]) => m.active)
    .map(([key, m]) => {
      const caps = Object.keys(m.capabilities ?? {});
      return {
        key,
        displayName: m.displayName ?? key,
        category: categorize(caps),
        baseModel: m.frontend?.baseModel ?? key,
        aliases: m.aliases ?? [],
        enterpriseOnly: Boolean(m.enterpriseOnly),
      };
    })
    .filter((m) => m.category !== 'other');
}

let cache: { at: number; models: CatalogModel[] } | null = null;

/** Fetch + distill the base-model catalogue, cached with a short TTL. */
export async function getCatalog(): Promise<CatalogModel[]> {
  if (cache && Date.now() - cache.at < config.modelsCacheTtlMs) {
    return cache.models;
  }
  const res = await fetch(config.modelsJsonUrl);
  if (!res.ok) {
    if (cache) return cache.models; // serve stale rather than fail
    throw new Error(`Failed to fetch models catalogue (${res.status})`);
  }
  const models = distill((await res.json()) as { models?: Record<string, RawModel> });
  cache = { at: Date.now(), models };
  return models;
}

/** Compact human/LLM-readable catalogue grouped by category. */
export function renderCatalog(models: CatalogModel[]): string {
  const groups: Record<string, CatalogModel[]> = { image: [], video: [], upscale: [] };
  for (const m of models) groups[m.category]?.push(m);
  const section = (title: string, list: CatalogModel[]) =>
    list.length
      ? `\n## ${title}\n` +
        list
          .map(
            (m) =>
              `- ${m.displayName} — baseModel: \`${m.baseModel}\`` +
              (m.aliases.length ? ` (aliases: ${m.aliases.slice(0, 4).join(', ')})` : '') +
              (m.enterpriseOnly ? ' [enterprise-only]' : ''),
          )
          .join('\n')
      : '';
  return (
    'LetzAI base models. Pass the `baseModel` value to a generation tool; ' +
    'map the user\'s casual name (an alias) to the canonical baseModel.\n' +
    section('Image', groups.image) +
    section('Video', groups.video) +
    section('Upscale', groups.upscale)
  );
}
