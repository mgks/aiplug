/**
 * aiplug config — show the resolved effective config (after all precedence layers).
 */

import { load } from '../../config.js';
import { print, makeOutput, printError } from '../output.js';

/** Strip secret-bearing fields so JSON-mode output never leaks them. */
function maskSecrets(ctx: ReturnType<typeof load>): unknown {
  if (!ctx.config) return ctx;
  const { apiKey: _omit, headers: _omit2, ...safe } = ctx.config;
  return { ...ctx, config: safe };
}

export async function cmdConfig(opts: { json: boolean }): Promise<void> {
  const out = makeOutput(opts.json);
  try {
    const ctx = await load({});
    const cfg = ctx.config ?? { transport: '<unset>' } as { transport: string };
    if (out.json) print(out, maskSecrets(ctx), { pretty: true });
    else {
      process.stdout.write(`transport: ${cfg.transport ?? '<unset>'}\n`);
      if (ctx.config?.model) process.stdout.write(`model:     ${ctx.config.model}\n`);
      if (ctx.config?.baseURL) process.stdout.write(`baseURL:   ${ctx.config.baseURL}\n`);
      if (ctx.config?.apiKey) process.stdout.write(`apiKey:    ****\n`);
      if (ctx.config?.source) process.stdout.write(`source:    ${ctx.config.source}\n`);
      process.stdout.write(`\nProfiles: ${Object.keys(ctx.profiles).join(', ') || '(none)'}\n`);
    }
  } catch (err) {
    const e = err as { code?: string; message?: string };
    printError(e.code ?? 'INVALID_CONFIGURATION', e.message ?? 'Failed to load config');
  }
}