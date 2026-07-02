/**
 * Smoke test — verifies the package's public surface is importable and
 * the AIPlug class can be constructed.
 *
 * Run with: `npm run smoke`.
 */

import { AIPlug, parseArgs, loadConfig } from '../dist/index.js';

async function main(): Promise<void> {
  const results: string[] = [];
  results.push(`typeof AIPlug -> ${typeof AIPlug}`);

  const { config, profiles } = loadConfig({ argv: ['--model=test-model'] });
  results.push(`loadConfig -> transport=${config.transport} model=${config.model ?? '(none)'}`);
  results.push(`loadConfig profiles -> ${Object.keys(profiles).join(', ') || '(none)'}`);

  const parsed = parseArgs(['--transport=openai', '--api-key=sk-x', 'positional']);
  results.push(`parseArgs flags.transport -> ${parsed.flags['transport']}`);
  results.push(`parseArgs positional[0] -> ${parsed.positional[0]}`);

  // Construction does not require a real transport when no calls are made.
  // We use a stub transport by passing a profile that won't be resolved.
  try {
    const client = new AIPlug({ transport: 'openai-compatible', baseURL: 'http://localhost:9999' });
    results.push(`AIPlug.constructor -> ${client.config.transport}`);
  } catch (err) {
    results.push(`AIPlug.constructor -> ERROR: ${(err as Error).message}`);
  }

  process.stdout.write(results.join('\n') + '\n');
}

main().catch((err) => {
  process.stderr.write(`smoke: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
