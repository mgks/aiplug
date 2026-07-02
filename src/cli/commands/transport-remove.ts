/**
 * aiplug transport remove <name> [--force]
 */

import { readGlobal, writeGlobal } from './transport-shared.js';
import { printOK, print, makeOutput, printError, hasFlag } from '../output.js';

export async function cmdTransportRemove(opts: {
  json: boolean;
  yes: boolean;
  args: string[];
}): Promise<void> {
  const out = makeOutput(opts.json);
  const positional = opts.args.filter((a) => !a.startsWith('--'));
  const name = positional[0];
  if (!name) printError('INVALID_CONFIGURATION', 'transport remove requires a name');

  const cfg = readGlobal();
  if (!cfg.transports[name]) {
    printError('INVALID_CONFIGURATION', `Transport "${name}" is not configured.`);
  }
  if (!opts.yes && !hasFlag('--force', opts.args)) {
    printError('INVALID_CONFIGURATION', 'Refusing to remove without --force.');
  }
  delete cfg.transports[name];
  if (cfg.active === name) cfg.active = Object.keys(cfg.transports)[0] ?? null;
  writeGlobal(cfg);

  if (out.json) {
    print(out, { ok: true, removed: name, active: cfg.active });
  } else {
    printOK(out, `Removed transport "${name}"`);
  }
}