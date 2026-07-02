/**
 * Live AWS Bedrock probe via aiplug — exercises the new
 * `bedrock-aws` transport against AWS Converse + ConverseStream.
 *
 * Reads AWS credentials from `~/.aws/credentials` via the AWS default
 * provider chain (set `AWS_REGION=us-east-1` etc, or rely on the
 * profile in `~/.aws/config`).
 *
 * Models tested:
 *   - `anthropic.claude-3-5-haiku-20241022` (anthropic on Bedrock)
 *   - `anthropic.claude-3-5-sonnet-20241022-v2:0`
 *
 * Usage:
 *   AWS_REGION=us-east-1 npx tsx scripts/probe-bedrock.ts
 */
import { AIPlug } from '../dist/index.js';

const REGION = process.env['AWS_REGION'] ?? 'us-east-1';
const MODELS = [
    process.env['AIPLUG_BEDROCK_MODEL'] ?? 'anthropic.claude-3-5-haiku-20241022',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
];

async function probeModel(modelId: string, path: 'chat' | 'stream'): Promise<void> {
    const ai = new AIPlug({
        transport: 'bedrock-aws',
        model: modelId,
        providerOptions: { region: REGION },
    });

    console.log(`\n=== ${path} against ${modelId} in ${REGION} ===`);
    try {
        if (path === 'chat') {
            const reply = await ai.chat({
                model: modelId,
                messages: [
                    { role: 'system', content: 'You are a concise test assistant.' },
                    { role: 'user', content: 'Reply with exactly: PONG from bedrock.' },
                ],
                sampling: { maxTokens: 32 },
            });
            console.log('reply:', JSON.stringify({
                content: reply.message.content,
                finishReason: reply.finishReason,
                usage: reply.usage,
            }));
        } else {
            for await (const chunk of ai.stream({
                model: modelId,
                messages: [
                    { role: 'system', content: 'You are a concise test assistant.' },
                    { role: 'user', content: 'Reply with exactly: PONG stream from bedrock.' },
                ],
                sampling: { maxTokens: 32 },
            })) {
                process.stdout.write(JSON.stringify(chunk) + '\n');
            }
            console.log();
        }
    } catch (err) {
        const e = err as { code?: string; status?: number; message?: string };
        console.log('error:', e.code, e.status, e.message);
    }
}

async function main(): Promise<void> {
    for (const m of MODELS) {
        await probeModel(m, 'chat');
        await probeModel(m, 'stream');
    }
}

main().catch((err) => {
    console.error('probe crashed:', err);
    process.exit(1);
});
