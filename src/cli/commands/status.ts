/**
 * aiplug status [--live]
 */

import { readGlobal } from './transport-shared.js';
import { loadTransport } from '../../registry.js';
import { colourise, print, printTable, makeOutput, hasFlag } from '../output.js';
import { getMeta } from '../meta.js';

export async function cmdStatus(opts: { json: boolean; args: string[] }): Promise<void> {
  const out = makeOutput(opts.json);
  const live = hasFlag('--live', opts.args);
  const cfg = readGlobal();
  const meta = getMeta();
  const entries = Object.entries(cfg.transports);
  if (entries.length === 0) {
    if (out.json) print(out, { active: cfg.active, transports: [] });
    else process.stdout.write('No transports configured.\n');
    return;
  }
  const rows: string[][] = [];
  for (const [name, e] of entries) {
    let status = live ? '?' : 'unknown';
    let latency = '';
    const m = meta.get(name);
    if (live) {
      try {
        const { transport } = await loadTransport(name, {
          transport: name,
          ...(e.apiKey !== undefined ? { apiKey: e.apiKey } : {}),
          ...(e.baseURL !== undefined ? { baseURL: e.baseURL } : {}),
          ...(e.model !== undefined ? { model: e.model } : {}),
        });
        const r = await transport.health();
        status = r.ok ? colourise('green', 'ok') : colourise('red', 'down');
        if (r.latencyMs !== undefined) latency = `${r.latencyMs}ms`;
      } catch (err) {
        status = colourise('red', `err: ${(err as Error).message}`);
      }
    }
    rows.push([cfg.active === name ? '*' : '', name, m?.displayName ?? name, e.model ?? '', status, latency]);
  }
  printTable(out, ['active', 'name', 'displayName', 'model', 'status', 'latency'], rows);
}