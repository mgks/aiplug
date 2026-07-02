/**
 * Shared read/write of the global config file used by all transport-* commands.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { globalConfigDir } from '../../config.js';

export interface TransportEntry {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: Record<string, string>;
}

export interface GlobalConfig {
  active: string | null;
  transports: Record<string, TransportEntry>;
  profiles: Record<string, { transport: string; model?: string; apiKey?: string }>;
}

export function readGlobal(): GlobalConfig {
  const file = `${globalConfigDir()}/config.json`;
  if (!existsSync(file)) return { active: null, transports: {}, profiles: {} };
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as GlobalConfig;
  } catch {
    return { active: null, transports: {}, profiles: {} };
  }
}

export function writeGlobal(cfg: GlobalConfig): void {
  const dir = globalConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = `${dir}/config.json`;
  writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf-8');
}