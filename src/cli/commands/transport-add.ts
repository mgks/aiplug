/**
 * aiplug transport add <name> [--api-key=...] [--base-url=...] [--model=...]
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { globalConfigDir } from '../../config.js';
import { getEntry, listTransportNames } from '../../registry.js';
import { printOK, print, makeOutput, printError, hasFlag, readArg } from '../output.js';

interface TransportEntry {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: Record<string, string>;
}

interface GlobalConfig {
  active: string | null;
  transports: Record<string, TransportEntry>;
  profiles: Record<string, { transport: string; model?: string; apiKey?: string }>;
}

function readGlobal(): GlobalConfig {
  const file = `${globalConfigDir()}/config.json`;
  if (!existsSync(file)) return { active: null, transports: {}, profiles: {} };
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as GlobalConfig;
  } catch {
    return { active: null, transports: {}, profiles: {} };
  }
}

function writeGlobal(cfg: GlobalConfig): void {
  const dir = globalConfigDir();
  if (!existsSync(dir)) {
    // lazy mkdir
    require('node:fs').mkdirSync(dir, { recursive: true });
  }
  const file = `${dir}/config.json`;
  writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf-8');
}

async function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  const buf: string[] = [];
  return new Promise((resolve) => {
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      const s = chunk as unknown as string;
      buf.push(s);
      if (s.includes('\n')) {
        const out = buf.join('').trim();
        process.stdin.pause();
        resolve(out);
      }
    });
    process.stdin.on('end', () => resolve(buf.join('').trim()));
    process.stdin.resume();
  });
}

export async function cmdTransportAdd(opts: {
  json: boolean;
  yes: boolean;
  args: string[];
}): Promise<void> {
  const out = makeOutput(opts.json);
  const positional = opts.args.filter((a) => !a.startsWith('--'));
  const name = positional[0];
  if (!name) printError('INVALID_CONFIGURATION', 'transport add requires a name');

  const available = listTransportNames();
  if (!available.includes(name)) {
    printError('TRANSPORT_UNAVAILABLE', `Unknown transport "${name}". Available: ${available.join(', ')}`);
  }

  const cfg = readGlobal();
  if (cfg.transports[name] && !opts.yes && !hasFlag('--force', opts.args)) {
    printError('INVALID_CONFIGURATION', `Transport "${name}" already configured. Use --force to overwrite.`);
  }

  const apiKeyFlag = readArg('--api-key', opts.args);
  const baseURLFlag = readArg('--base-url', opts.args);
  const modelFlag = readArg('--model', opts.args);

  // Transports whose auth scheme is 'header' or 'none' don't require a key.
  const regEntry = (() => {
    try { return getEntry(name); } catch { return undefined; }
  })();
  const keyRequired = regEntry ? regEntry.auth === 'bearer' || regEntry.auth === 'x-api-key' : true;

  let apiKey = apiKeyFlag ?? process.env['AIPLUG_API_KEY'] ?? '';
  let baseURL = baseURLFlag ?? '';
  let model = modelFlag ?? '';

  if (!opts.yes) {
    if (!apiKey && keyRequired) apiKey = await prompt(`API key for ${name} (leave blank to skip): `);
    if (!baseURL && name !== 'openai-compatible') {
      baseURL = await prompt(`Base URL for ${name} (leave blank for default): `);
    }
    if (!model) model = await prompt(`Default model for ${name} (leave blank to skip): `);
  }

  const entry: TransportEntry = {};
  if (apiKey) entry.apiKey = apiKey;
  if (baseURL) entry.baseURL = baseURL;
  if (model) entry.model = model;
  cfg.transports[name] = entry;
  if (!cfg.active) cfg.active = name;
  writeGlobal(cfg);

  if (out.json) {
    print(out, { ok: true, transport: name, entry });
  } else {
    printOK(out, `Added transport "${name}"`);
    if (cfg.active === name) printOK(out, `"${name}" is now the active transport`);
  }
}