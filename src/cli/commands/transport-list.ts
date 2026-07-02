/**
 * aiplug transport list
 */

import { readGlobal } from './transport-shared.js';
import { print, printTable, makeOutput } from '../output.js';

export async function cmdTransportList(opts: { json: boolean }): Promise<void> {
  const out = makeOutput(opts.json);
  const cfg = readGlobal();
  const entries = Object.entries(cfg.transports);
  if (entries.length === 0) {
    if (out.json) print(out, { active: cfg.active, transports: [] });
    else process.stdout.write('No transports configured. Run `aiplug transport add <name>`.\n');
    return;
  }
  const rows = entries.map(([name, e]) => [
    cfg.active === name ? '*' : '',
    name,
    e.model ?? '',
    e.baseURL ?? '',
    e.apiKey ? '****' : '',
  ]);
  printTable(out, ['active', 'name', 'model', 'baseURL', 'apiKey'], rows);
}