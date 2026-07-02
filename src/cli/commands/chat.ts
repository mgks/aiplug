/**
 * aiplug chat — minimal streaming REPL against the active transport.
 *
 * No onboarding, no banners, no colour noise. Direct line prompt, plain
 * streamed response, slash commands for model switching and history.
 *
 * Usage:
 *   aiplug chat                   Use the active transport's configured model.
 *   aiplug chat <model>           Override the model for this session.
 *   aiplug chat --model=<name>    Same, with explicit flag.
 *
 * In-session commands (slash-prefixed):
 *   /help                  Show available commands.
 *   /model <name>          Switch model mid-session.
 *   /clear                 Clear conversation history.
 *   /provider              Show active transport + model.
 *   /exit, /quit, /q       End the session.
 *
 * Signals:
 *   Ctrl+C during a stream  Aborts the current request, stays in REPL.
 *   Ctrl+C idle             Exits the REPL.
 *   Ctrl+D (EOF)            Exits the REPL.
 */

import { createInterface, type Interface as RLInterface } from 'node:readline';
import { readGlobal } from './transport-shared.js';
import { loadTransport } from '../../registry.js';
import { AIPlugError } from '../../errors.js';
import type { ChatMessage, StreamChunk } from '../../types.js';
import type { Transport } from '../../transport.js';

export async function cmdChat(opts: { json: boolean; args: string[] }): Promise<void> {
  const cfg = readGlobal();
  const active = cfg.active;
  if (!active || !cfg.transports[active]) {
    process.stderr.write(
      'No active transport. Run `aiplug transport add <name>` then `aiplug transport use <name>`.\n',
    );
    process.exit(3);
  }
  const entry = cfg.transports[active]!;

  // Resolve model: CLI flag > positional arg > entry default.
  let model =
    readFlag('--model', opts.args) ??
    opts.args.find((a) => !a.startsWith('--')) ??
    entry.model;
  if (!model) {
    process.stderr.write(
      'No model. Usage: `aiplug chat <model>` or set one via `aiplug transport add` / `--model`.\n',
    );
    process.exit(3);
  }

  let transport: Transport;
  try {
    const loaded = await loadTransport(active, {
      transport: active,
      ...(entry.apiKey !== undefined ? { apiKey: entry.apiKey } : {}),
      ...(entry.baseURL !== undefined ? { baseURL: entry.baseURL } : {}),
      model,
    });
    transport = loaded.transport;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    process.stderr.write(`Failed to load transport "${active}": ${e.message ?? 'unknown error'}\n`);
    process.exit(e.code === 'AUTH_MISSING' ? 2 : 1);
  }

  const presetSystemPrompt =
    'You are a concise test assistant. Keep answers brief, factual, and focused on the user request.';
  const messages: ChatMessage[] = [{ role: 'system', content: presetSystemPrompt }];
  const state: { controller: AbortController | null } = { controller: null };
  const rl: RLInterface = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  process.stdout.write(`aiplug chat — ${active} / ${model}\n`);
  process.stdout.write('Type /help for commands, Ctrl+D to exit.\n\n');

  const close = (): void => {
    rl.close();
    process.stdout.write('\n');
  };

  process.on('SIGINT', () => {
    if (state.controller) {
      state.controller.abort();
    } else {
      close();
      process.exit(0);
    }
  });

  const ask = (): Promise<string> =>
    new Promise((resolve) => {
      rl.question('you> ', (line) => resolve(line));
    });

  // Outer loop: read input, dispatch to command or send to model.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let input: string;
    try {
      input = await ask();
    } catch {
      // stdin closed (Ctrl+D / EOF).
      break;
    }
    const trimmed = input.trim();
    if (!trimmed) continue;

    if (trimmed === '/exit' || trimmed === '/quit' || trimmed === '/q') break;
    if (trimmed === '/help') {
      printHelp();
      continue;
    }
    if (trimmed === '/clear') {
      messages.length = 0;
      messages.push({ role: 'system', content: presetSystemPrompt });
      process.stdout.write('(history cleared)\n\n');
      continue;
    }
    if (trimmed === '/provider') {
      process.stdout.write(`${active} / ${model}\n\n`);
      continue;
    }
    if (trimmed.startsWith('/model')) {
      const next = trimmed.slice(5).trim();
      if (!next) {
        process.stdout.write(`(current model: ${model})\n\n`);
        continue;
      }
      model = next;
      process.stdout.write(`(model: ${model})\n\n`);
      continue;
    }

    messages.push({ role: 'user', content: trimmed });
    await send(transport, model, messages, state, active);
  }

  close();
}

/* ---------------------------------------------------------------------------
 * Internals
 * --------------------------------------------------------------------------- */

function readFlag(flag: string, args: string[]): string | undefined {
  const eq = `${flag}=`;
  for (const a of args) {
    if (a === flag) {
      const i = args.indexOf(a);
      const next = args[i + 1];
      return next !== undefined && !next.startsWith('--') ? next : undefined;
    }
    if (a.startsWith(eq)) return a.slice(eq.length);
  }
  return undefined;
}

function printHelp(): void {
  process.stdout.write(
    [
      'Commands:',
      '  /help           Show this help',
      '  /model <name>   Switch model for the rest of the session',
      '  /provider       Show active transport and model',
      '  /clear          Clear conversation history',
      '  /exit, /quit    End the session',
      '',
      'Signals:',
      '  Ctrl+C  abort current stream (or exit if idle)',
      '  Ctrl+D  exit',
      '',
    ].join('\n'),
  );
}

async function send(
  transport: Transport,
  model: string,
  messages: ChatMessage[],
  state: { controller: AbortController | null },
  transportName: string,
): Promise<void> {
  const controller = new AbortController();
  state.controller = controller;
  let acc = '';
  let reasoningAcc = '';
  let toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
  let cacheRead = 0;
  let cacheWrite = 0;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let aborted = false;
  // ANSI dim for reasoning chunks when stderr is a TTY.
  const dim = process.stderr.isTTY ? (s: string) => `\x1b[2m${s}\x1b[0m` : (s: string) => s;
  try {
    const iter = transport.stream({ model, messages }, controller.signal);
    for await (const chunk of iter) {
      switch (chunk.type) {
        case 'text-delta': {
          if (acc === '' && !chunk.delta.startsWith('\n')) {
            // First chunk of a fresh reply: prefix with newline so reasoning
            // (rendered dim above) doesn't crash into the prompt.
            process.stdout.write('\n');
          }
          process.stdout.write(chunk.delta);
          acc += chunk.delta;
          break;
        }
        case 'reasoning-delta': {
          if (reasoningAcc === '') {
            // First reasoning chunk: announce it on its own line.
            process.stdout.write(dim('\n  …thinking…\n'));
          }
          process.stdout.write(dim(chunk.delta));
          reasoningAcc += chunk.delta;
          break;
        }
        case 'tool-call-delta': {
          const existing = toolCalls.find((t) => t.id === chunk.toolCallId);
          if (existing) {
            existing.arguments += chunk.argumentsDelta;
          } else {
            toolCalls.push({ id: chunk.toolCallId, name: '', arguments: chunk.argumentsDelta });
          }
          break;
        }
        case 'cache-read': {
          cacheRead = chunk.cacheReadTokens;
          break;
        }
        case 'cache-write': {
          cacheWrite = chunk.cacheWriteTokens;
          break;
        }
        case 'usage': {
          if (chunk.usage.promptTokens !== undefined) promptTokens = chunk.usage.promptTokens;
          if (chunk.usage.completionTokens !== undefined) completionTokens = chunk.usage.completionTokens;
          if (chunk.usage.cacheReadTokens !== undefined) cacheRead = chunk.usage.cacheReadTokens;
          if (chunk.usage.cacheWriteTokens !== undefined) cacheWrite = chunk.usage.cacheWriteTokens;
          break;
        }
        case 'tool-call': {
          // Finalised tool call from the foundation. We track but don't print
          // yet — the chat REPL is text-first; tool results are appended on
          // subsequent turns via `messages.push`.
          if (chunk.toolCall.id && chunk.toolCall.name) {
            const existing = toolCalls.find((t) => t.id === chunk.toolCall.id);
            if (existing) {
              existing.name = chunk.toolCall.name;
            } else {
              toolCalls.push({
                id: chunk.toolCall.id,
                name: chunk.toolCall.name,
                arguments: JSON.stringify(chunk.toolCall.arguments),
              });
            }
          }
          break;
        }
        case 'error': {
          process.stdout.write(`\n(error: ${chunk.error.message})\n\n`);
          acc = '';
          return;
        }
        case 'finish': {
          // Loop exits naturally on iterator completion.
          break;
        }
      }
    }
  } catch (err) {
    if (err instanceof AIPlugError && err.code === 'REQUEST_ABORTED') {
      aborted = true;
    } else if (controller.signal.aborted) {
      aborted = true;
    } else {
      const e = err as { message?: string };
      process.stdout.write(`\n(error: ${e.message ?? 'unknown'})\n`);
    }
  } finally {
    state.controller = null;
  }
  if (aborted) {
    process.stdout.write(`\n(aborted — ${acc.length} chars received)\n\n`);
    acc = '';
    return;
  }
  if (acc.length > 0 || toolCalls.length > 0) {
    const assistant: ChatMessage = { role: 'assistant', content: acc };
    if (toolCalls.length > 0) {
      assistant.toolCalls = toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: (() => { try { return JSON.parse(tc.arguments); } catch { return {}; } })(),
        rawArguments: tc.arguments,
      }));
    }
    messages.push(assistant);
    process.stdout.write('\n');
    // Footer: token usage + cache deltas when present.
    const parts: string[] = [];
    if (promptTokens !== undefined && completionTokens !== undefined) {
      parts.push(`prompt=${promptTokens} completion=${completionTokens}`);
    }
    if (cacheRead > 0) parts.push(`cache_read=${cacheRead}`);
    if (cacheWrite > 0) parts.push(`cache_write=${cacheWrite}`);
    if (parts.length > 0) process.stdout.write(dim(`  (${parts.join(', ')})\n`));
    process.stdout.write('\n');
  } else {
    process.stdout.write(`\n(no response from ${transportName})\n\n`);
  }
}