/**
 * aiplug transport test <name>
 */

import { readGlobal } from './transport-shared.js';
import { loadTransport } from '../../registry.js';
import { colourise, print, makeOutput, printError } from '../output.js';

export async function cmdTransportTest(opts: { json: boolean; args: string[] }): Promise<void> {
  const out = makeOutput(opts.json);
  const positional = opts.args.filter((a) => !a.startsWith('--'));
  const name = positional[0];
  if (!name) printError('INVALID_CONFIGURATION', 'transport test requires a name');

  const cfg = readGlobal();
  const entry = cfg.transports[name];
  if (!entry) printError('INVALID_CONFIGURATION', `Transport "${name}" not configured`);

  const instanceConfig = {
    transport: name,
    ...(entry.apiKey !== undefined ? { apiKey: entry.apiKey } : {}),
    ...(entry.baseURL !== undefined ? { baseURL: entry.baseURL } : {}),
    ...(entry.model !== undefined ? { model: entry.model } : {}),
    ...(entry.headers !== undefined ? { headers: entry.headers } : {}),
  };

  try {
    const { transport } = await loadTransport(name, instanceConfig);
    const result = await transport.health();
    if (out.json) {
      print(out, { name, ...result });
    } else {
      if (result.ok) {
        process.stdout.write(`${colourise('green', '\u2713')} ${name} OK${result.latencyMs !== undefined ? ` (${result.latencyMs}ms)` : ''}\n`);
      } else {
        process.stdout.write(`${colourise('red', '\u2717')} ${name} FAILED: ${result.error ?? 'unknown'}\n`);
        process.exit(2);
      }
    }
  } catch (err) {
    const e = err as { code?: string; message?: string };
    printError(e.code ?? 'TRANSPORT_UNAVAILABLE', e.message ?? `Could not load transport "${name}"`);
  }
}