/**
 * Single-shot Bedrock chat probe. Prints the full upstream error body
 * on a non-2xx so we can see exactly why AWS rejected the request.
 */
import { AIPlug } from '../dist/index.js';

const REGION = process.env['AWS_REGION'] ?? 'us-east-1';
const MODEL = process.env['AIPLUG_BEDROCK_MODEL'] ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

async function main(): Promise<void> {
  const ai = new AIPlug({
    transport: 'bedrock-aws',
    model: MODEL,
    providerOptions: { region: REGION },
  });
  try {
    const r = await ai.chat({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with exactly: PONG' }],
      sampling: { maxTokens: 16 },
    });
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    const err = e as { code?: string; status?: number; message?: string; details?: { body?: string } };
    console.log('error code:', err.code);
    console.log('error status:', err.status);
    console.log('error message:', err.message);
    console.log('error body:', err.details?.body?.slice(0, 1000));
  }
}

main();
