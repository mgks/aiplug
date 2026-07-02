/**
 * Live minimax probe via aiplug. Two paths:
 *
 *  1. `ai.models()` — hits `GET /v1/models`, returns the upstream model
 *     catalogue as `ModelInfo[]`. Works without chat-completion balance.
 *  2. `ai.chat()` / `ai.stream()` — runs a real conversation if the
 *     account has balance; surfaces the upstream `402 insufficient_balance`
 *     as a typed `AIPlugError` if it does not.
 *
 * Usage:
 *   AIPLUG_MINIMAX_API_KEY=… npx tsx scripts/probe-minimax.ts
 */
import { AIPlug } from '../dist/index.js';

const TOKEN = process.env['AIPLUG_MINIMAX_API_KEY']?.trim();
const MODEL = process.env['AIPLUG_MINIMAX_MODEL'] ?? 'MiniMax-M3';

async function probeModels(ai: AIPlug): Promise<void> {
  console.log(`\n=== ai.models() — upstream catalogue ===`);
  try {
    const models = await ai.models();
    for (const m of models) console.log(` - ${m.id} (${m.transport})`);
  } catch (err) {
    const e = err as { code?: string; status?: number; message?: string };
    console.log('models error:', e.code, e.status, e.message);
  }
}

async function probeChat(ai: AIPlug): Promise<void> {
  console.log(`\n=== ai.stream() against ${MODEL} ===`);
  try {
    const stream = ai.stream({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a concise test assistant.' },
        { role: 'user', content: 'Reply with exactly: PONG from minimax.' },
      ],
    });
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') process.stdout.write(chunk.delta);
      if (chunk.type === 'finish') console.log('\n[finish]', chunk.reason);
      if (chunk.type === 'usage') console.log('\n[usage]', chunk.usage);
      if (chunk.type === 'error') console.log('\n[error]', chunk.error);
    }
  } catch (err) {
    const e = err as { code?: string; status?: number; message?: string };
    console.log('stream error:', e.code, e.status, e.message);
  }
}

async function main(): Promise<void> {
  if (!TOKEN) {
    console.log('set AIPLUG_MINIMAX_API_KEY to run this probe.');
    process.exit(2);
  }

  const ai = new AIPlug({
    transport: 'minimax',
    apiKey: TOKEN,
    model: MODEL,
  });
  console.log('capabilities:', ai.capabilities());

  await probeModels(ai);
  await probeChat(ai);
}

main().catch((err) => {
  console.error('probe crashed:', err);
  process.exit(1);
});
