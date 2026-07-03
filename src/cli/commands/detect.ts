/**
 * aiplug detect — scan the local environment for available providers
 * and local runtimes.
 *
 * Walks process env, common dotenv locations, the AWS shared credentials
 * file, and probes known local-runtime HTTP ports. Never returns
 * credential values — just presence + a masked prefix.
 *
 * Usage:
 *   aiplug detect          # human-readable report
 *   aiplug detect --json   # machine-readable
 */

import { AIPlug } from '../../client.js';
import { colourise, print, makeOutput, printError } from '../output.js';
import type { DetectedProvider, DetectedLocalTool } from '../../detect.js';

export async function cmdDetect(opts: { json: boolean }): Promise<void> {
    const out = makeOutput(opts.json);
    try {
        const report = await AIPlug.detect();

        if (opts.json) {
            print(out, report);
            return;
        }

        // Human-readable.
        process.stdout.write(`\n${colourise('bold', 'Provider auto-detection')}\n`);
        process.stdout.write(`  scanned: ${report.scannedAt}  (${report.durationMs}ms)\n\n`);

        if (report.providers.length === 0) {
            process.stdout.write(`  ${colourise('dim', 'no provider credentials detected')}\n`);
            process.stdout.write(`  ${colourise('dim', 'set one of the aiplug-known env vars (e.g. MINIMAX_API_KEY, OPENAI_API_KEY) to make it show up here.')}\n\n`);
        } else {
            for (const p of report.providers) {
                const sourceTag = sourceLabel(p.source);
                process.stdout.write(`  ${colourise('green', '\u2713')} ${p.displayName.padEnd(28)}  ${colourise('cyan', p.slug.padEnd(18))}  ${colourise('dim', p.hint)}\n`);
                process.stdout.write(`    ${colourise('dim', `via ${sourceTag}${p.sourcePath ? ` (${p.sourcePath})` : ''}`)}\n`);
            }
            process.stdout.write('\n');
        }

        process.stdout.write(`${colourise('bold', 'Local runtimes')}\n\n`);
        if (report.localTools.length === 0) {
            process.stdout.write(`  ${colourise('dim', 'no local runtimes detected on common ports (11434, 1234, 8000, 8080, 1337)')}\n`);
            process.stdout.write(`  ${colourise('dim', 'start Ollama, LM Studio, vLLM, or llama.cpp to surface them here.')}\n\n`);
        } else {
            for (const t of report.localTools) {
                process.stdout.write(`  ${colourise('green', '\u2713')} ${t.displayName.padEnd(18)}  ${colourise('cyan', t.slug.padEnd(18))}  ${colourise('dim', t.baseURL)}\n`);
                if (t.availableModels && t.availableModels.length > 0) {
                    const sample = t.availableModels.slice(0, 3).join(', ');
                    const more = t.availableModels.length > 3 ? `, +${t.availableModels.length - 3} more` : '';
                    process.stdout.write(`    ${colourise('dim', `models: ${sample}${more}`)}\n`);
                }
                if (t.version) {
                    process.stdout.write(`    ${colourise('dim', `version: ${t.version}`)}\n`);
                }
            }
            process.stdout.write('\n');
        }
    } catch (err) {
        const e = err as { code?: string; message?: string };
        printError(e.code ?? 'INVALID_RESPONSE', e.message ?? 'Detection failed');
    }
}

function sourceLabel(s: DetectedProvider['source']): string {
    switch (s) {
        case 'env':           return 'process env';
        case 'dotenv':        return 'dotenv file';
        case 'aws-profile':   return 'AWS shared credentials';
        case 'config-file':   return 'config file';
        case 'process-env':   return 'process env';
    }
}