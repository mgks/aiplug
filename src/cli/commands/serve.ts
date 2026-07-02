/**
 * aiplug serve [--port=3711] [--host=127.0.0.1]
 */

import { readArg, hasFlag, printError } from '../output.js';
import { startServer } from '../../server/index.js';

export async function cmdServe(opts: { json: boolean; args: string[] }): Promise<void> {
  const portArg = readArg('--port', opts.args);
  const hostArg = readArg('--host', opts.args);
  const port = portArg ? Number.parseInt(portArg, 10) : 3711;
  if (!Number.isFinite(port)) printError('INVALID_CONFIGURATION', `--port must be a number`);
  const host = hostArg ?? '127.0.0.1';

  try {
    await startServer({ port, host, printPort: hasFlag('--print-port', opts.args) });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    printError(e.code ?? 'TRANSPORT_UNAVAILABLE', e.message ?? 'Server failed to start');
  }
}