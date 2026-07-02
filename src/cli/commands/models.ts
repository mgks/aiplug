/**
 * aiplug models
 */

import { readGlobal } from './transport-shared.js';
import { loadTransport } from '../../registry.js';
import { print, printTable, makeOutput, printError } from '../output.js';
import { getMeta } from '../meta.js';

export async function cmdModels(opts: { json: boolean }): Promise<void> {
  const out = makeOutput(opts.json);
  const cfg = readGlobal();
  const active = cfg.active;
  if (!active || !cfg.transports[active]) {
    printError('INVALID_CONFIGURATION', 'No active transport configured. Run `aiplug transport add <name>`.');
  }
  const entry = cfg.transports[active]!;
  const meta = getMeta().get(active);
  try {
    const { transport } = await loadTransport(active, {
      transport: active,
      ...(entry.apiKey !== undefined ? { apiKey: entry.apiKey } : {}),
      ...(entry.baseURL !== undefined ? { baseURL: entry.baseURL } : {}),
      ...(entry.model !== undefined ? { model: entry.model } : {}),
    });
    const models = await transport.models();
    if (models.length === 0) {
      process.stdout.write(`Transport "${active}" returned no models.\n`);
      if (meta?.popularModels?.length) {
        process.stdout.write('Popular models (no /models endpoint):\n');
        for (const m of meta.popularModels) process.stdout.write(`  ${m}\n`);
      }
      return;
    }
    const rows = models.map((m) => [m.id, m.transport, m.capabilities.join(',')]);
    const headers = ['id', 'transport', 'capabilities'];
    if (meta) rows.forEach((r) => r.splice(1, 0, meta.displayName));
    headers.splice(1, 0, 'displayName');
    printTable(out, headers, rows);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    printError(e.code ?? 'TRANSPORT_UNAVAILABLE', e.message ?? 'Failed to list models');
  }
}