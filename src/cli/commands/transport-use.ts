/**
 * aiplug transport use <name> [--force]
 */

import { readGlobal, writeGlobal } from './transport-shared.js';
import { print, printOK, makeOutput, printError, hasFlag } from '../output.js';

export async function cmdTransportUse(opts: { json: boolean; yes: boolean; args: string[] }): Promise<void> {
  const out = makeOutput(opts.json);
  const positional = opts.args.filter((a) => !a.startsWith('--'));
  const name = positional[0];
  if (!name) printError('INVALID_CONFIGURATION', 'transport use requires a name');
  const cfg = readGlobal();
  if (!cfg.transports[name]) {
    printError('INVALID_CONFIGURATION', `Transport "${name}" is not configured`);
  }
  cfg.active = name;
  writeGlobal(cfg);
  if (out.json) print(out, { ok: true, active: name });
  else printOK(out, `Active transport set to "${name}"`);
  void hasFlag; void opts.yes;
}