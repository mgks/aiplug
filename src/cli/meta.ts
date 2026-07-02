/**
 * Loader for `data/registry.meta.json` — the cosmetic-side registry data
 * (displayName, popularModels, envVar, notes) used by the CLI for pretty
 * output. Runtime transport loading never touches this file.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MetaEntry {
  displayName: string;
  category: string;
  popularModels: string[];
  envVar: string;
  notes: string;
  openaiCompatible: boolean;
  isAlias?: boolean;
}

let cached: Map<string, MetaEntry> | null = null;

function candidates(): string[] {
  return [
    join(process.cwd(), 'data/registry.meta.json'),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'registry.meta.json'),
  ];
}

/** Return the parsed meta map. Empty map if the file isn't found. */
export function getMeta(): Map<string, MetaEntry> {
  if (cached) return cached;
  for (const p of candidates()) {
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, 'utf-8')) as { providers?: Record<string, MetaEntry> };
      cached = new Map(Object.entries(parsed.providers ?? {}));
      return cached;
    }
  }
  cached = new Map();
  return cached;
}

/** Drop the cached map (test hook). */
export function clearMetaCache(): void {
  cached = null;
}