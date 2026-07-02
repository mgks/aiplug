/**
 * aiplug health
 */

import { readGlobal } from './transport-shared.js';
import { loadTransport } from '../../registry.js';
import { colourise, print, makeOutput, printError } from '../output.js';

export async function cmdHealth(opts: { json: boolean }): Promise<void> {
  const out = makeOutput(opts.json);
  const cfg = readGlobal();
  const active = cfg.active;
  if (!active || !cfg.transports[active]) {
    printError('INVALID_CONFIGURATION', 'No active transport. Run `aiplug transport add <name>` then `aiplug transport use <name>`.');
  }
  const entry = cfg.transports[active]!;
  try {
    const { transport } = await loadTransport(active, {
      transport: active,
      ...(entry.apiKey !== undefined ? { apiKey: entry.apiKey } : {}),
      ...(entry.baseURL !== undefined ? { baseURL: entry.baseURL } : {}),
      ...(entry.model !== undefined ? { model: entry.model } : {}),
    });
    const r = await transport.health();
    if (out.json) print(out, { active, ...r });
    else if (r.ok) process.stdout.write(`${colourise('green', '\u2713')} ${active} OK${r.latencyMs !== undefined ? ` (${r.latencyMs}ms)` : ''}\n`);
    else {
      process.stdout.write(`${colourise('red', '\u2717')} ${active} FAILED: ${r.error ?? 'unknown'}\n`);
      process.exit(2);
    }
  } catch (err) {
    const e = err as { code?: string; message?: string };
    printError(e.code ?? 'TRANSPORT_UNAVAILABLE', e.message ?? 'Health check failed');
  }
}