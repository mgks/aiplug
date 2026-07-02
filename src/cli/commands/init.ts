/**
 * aiplug init — create the global config directory and seed empty config.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { globalConfigDir } from '../../config.js';
import { printOK, print, makeOutput } from '../output.js';

export async function cmdInit(opts: { json: boolean; yes: boolean }): Promise<void> {
  const out = makeOutput(opts.json);
  const dir = globalConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const cfgFile = `${dir}/config.json`;
  if (!existsSync(cfgFile)) {
    writeFileSync(
      cfgFile,
      JSON.stringify({ active: null, transports: {}, profiles: {} }, null, 2),
      'utf-8',
    );
  }
  if (out.json) {
    print(out, { ok: true, configDir: dir, configFile: cfgFile });
  } else {
    printOK(out, `Config directory: ${dir}`);
    printOK(out, `Config file: ${cfgFile}`);
    process.stdout.write('\nNext steps:\n');
    process.stdout.write('  aiplug transport add anthropic   # or openai / ollama / openai-compatible\n');
    process.stdout.write('  aiplug transport list\n');
    process.stdout.write('  aiplug serve\n');
  }
}