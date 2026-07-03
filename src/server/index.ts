/**
 * AIPlug HTTP server.
 *
 * Exposes an OpenAI-compatible API on `127.0.0.1:3711` by default so any
 * OpenAI client SDK can point at it without changes. The active transport
 * (from the global config) serves the actual upstream call.
 *
 * Endpoints:
 *   POST /v1/chat/completions   (OpenAI Chat Completions; SSE when stream=true)
 *   POST /v1/responses          (alias for /v1/chat/completions)
 *   POST /v1/embeddings
 *   POST /v1/images/generations
 *   POST /v1/audio/speech
 *   POST /v1/audio/transcriptions
 *   GET  /v1/models
 *   GET  /healthz
 *   GET  /v1/providers          (provider list — for host UIs)
 *   GET  /v1/providers/:slug    (single provider config schema)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadTransport } from '../registry.js';
import { readGlobal } from '../cli/commands/transport-shared.js';
import { makeError } from '../errors.js';
import {
  configSchema,
  describeProvider,
  listProviders,
} from '../introspect.js';
import type { AiplugConfig, ChatRequest, ImageRequest, AudioRequest, TranscriptionRequest, EmbeddingsRequest } from '../types.js';
import type { Transport } from '../transport.js';

export interface ServeOptions {
  port: number;
  host: string;
  /** Print the actual bound port to stdout (used with --port=0 for ephemeral). */
  printPort?: boolean;
}

interface ServerContext {
  transport: Transport;
  transportName: string;
  /** Default model from the active global-config entry, used when a request omits `model`. */
  defaultModel?: string;
}

async function loadActive(): Promise<ServerContext> {
  const cfg = readGlobal();
  const active = cfg.active;
  if (!active || !cfg.transports[active]) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: 'No active transport configured. Run `aiplug transport add <name>` then `aiplug transport use <name>`.',
    });
  }
  const entry = cfg.transports[active]!;
  const instanceConfig: AiplugConfig = {
    transport: active,
    ...(entry.apiKey !== undefined ? { apiKey: entry.apiKey } : {}),
    ...(entry.baseURL !== undefined ? { baseURL: entry.baseURL } : {}),
    ...(entry.model !== undefined ? { model: entry.model } : {}),
    ...(entry.headers !== undefined ? { headers: entry.headers } : {}),
  };
  const { transport } = await loadTransport(active, instanceConfig);
  const ctx: ServerContext = { transport, transportName: active };
  if (entry.model !== undefined) ctx.defaultModel = entry.model;
  return ctx;
}

/* ---------------------------------------------------------------------------
 * Request body reading
 * ------------------------------------------------------------------------- */

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf-8');
}

function sendJSON(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text, 'utf-8'),
  });
  res.end(text);
}

function sendError(res: ServerResponse, status: number, code: string, message: string): void {
  sendJSON(res, status, { error: { type: code, code, message, param: null } });
}

/* ---------------------------------------------------------------------------
 * OpenAI-compatible routes
 * ------------------------------------------------------------------------- */

async function handleChatCompletions(ctx: ServerContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try {
    const raw = await readBody(req);
    body = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    sendError(res, 400, 'invalid_request_error', 'invalid JSON body');
    return;
  }
  // Fall back to the active transport's configured model; never to a URL.
  const model = typeof body['model'] === 'string' ? body['model'] : ctx.defaultModel ?? '';
  const stream = body['stream'] === true;
  const chatReq: ChatRequest = (() => {
    const r: ChatRequest = {
      model,
      messages: Array.isArray(body['messages'])
        ? (body['messages'] as ChatRequest['messages'])
        : [],
    };
    if (Array.isArray(body['tools'])) {
      const tools = body['tools'] as ChatRequest['tools'];
      if (tools !== undefined) r.tools = tools;
    }
    if (body['tool_choice'] !== undefined) {
      const tc = body['tool_choice'] as ChatRequest['toolChoice'];
      if (tc !== undefined) r.toolChoice = tc;
    }
    if (body['temperature'] !== undefined || body['max_tokens'] !== undefined) {
      const sampling: NonNullable<ChatRequest['sampling']> = {};
      if (body['temperature'] !== undefined) sampling.temperature = Number(body['temperature']);
      if (body['max_tokens'] !== undefined) sampling.maxTokens = Number(body['max_tokens']);
      r.sampling = sampling;
    }
    return r;
  })();

  if (stream) {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    const ac = new AbortController();
    req.on('close', () => ac.abort());
    try {
      for await (const chunk of ctx.transport.stream(chatReq, ac.signal)) {
        if (chunk.type === 'text-delta') {
          const data = {
            id: `aiplug-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: { content: chunk.delta }, finish_reason: null }],
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } else if (chunk.type === 'tool-call') {
          const data = {
            id: `aiplug-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
              index: 0,
              delta: {
                tool_calls: [{
                  index: 0,
                  id: chunk.toolCall.id,
                  type: 'function',
                  function: { name: chunk.toolCall.name, arguments: chunk.toolCall.rawArguments ?? JSON.stringify(chunk.toolCall.arguments) },
                }],
              },
              finish_reason: null,
            }],
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } else if (chunk.type === 'usage') {
          const data = {
            id: `aiplug-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: {}, finish_reason: null }],
            ...(chunk.usage ? { usage: chunk.usage } : {}),
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } else if (chunk.type === 'finish') {
          const data = {
            id: `aiplug-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: {}, finish_reason: chunk.reason }],
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const e = err as { code?: string; message?: string; status?: number };
      const data = {
        error: {
          type: e.code ?? 'internal_error',
          code: e.code ?? 'INTERNAL_ERROR',
          message: e.message ?? 'stream failed',
          param: null,
        },
      };
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        res.end();
      } catch {
        /* noop */
      }
    }
    return;
  }

  try {
    const resp = await ctx.transport.chat(chatReq);
    // Wrap into OpenAI ChatCompletion shape.
    sendJSON(res, 200, {
      id: resp.id ?? `aiplug-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: resp.model,
      choices: [{
        index: 0,
        message: {
          role: resp.message.role,
          content: resp.message.content,
          ...(resp.message.toolCalls ? { tool_calls: resp.message.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.rawArguments ?? JSON.stringify(tc.arguments) },
          })) } : {}),
        },
        finish_reason: resp.finishReason ?? 'stop',
      }],
      ...(resp.usage ? { usage: resp.usage } : {}),
    });
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'chat failed');
  }
}

async function handleEmbeddings(ctx: ServerContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try {
    const raw = await readBody(req);
    body = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    sendError(res, 400, 'invalid_request_error', 'invalid JSON body');
    return;
  }
  const model = typeof body['model'] === 'string' ? body['model'] : '';
  const input = body['input'] as string | string[] | undefined;
  if (typeof model !== 'string' || input === undefined) {
    sendError(res, 400, 'invalid_request_error', 'embeddings requires model + input');
    return;
  }
  const embReq: EmbeddingsRequest = { model, input };
  try {
    const data = await ctx.transport.embeddings(embReq);
    sendJSON(res, 200, {
      object: 'list',
      data: data.embeddings.map((e) => ({ object: 'embedding', embedding: e.vector, index: e.index })),
      model: data.model,
      ...(data.usage ? { usage: data.usage } : {}),
    });
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'embeddings failed');
  }
}

async function handleImages(ctx: ServerContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try {
    const raw = await readBody(req);
    body = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    sendError(res, 400, 'invalid_request_error', 'invalid JSON body');
    return;
  }
  const model = typeof body['model'] === 'string' ? body['model'] : '';
  const prompt = typeof body['prompt'] === 'string' ? body['prompt'] : '';
  if (!model || !prompt) {
    sendError(res, 400, 'invalid_request_error', 'images/generations requires model + prompt');
    return;
  }
  const imgReq: ImageRequest = {
    model,
    prompt,
    ...(typeof body['n'] === 'number' ? { n: body['n'] } : {}),
    ...(typeof body['size'] === 'string' ? { size: body['size'] } : {}),
  };
  try {
    const data = await ctx.transport.images(imgReq);
    const items: Array<{ b64_json?: string; url?: string }> = [];
    for (const b64 of data.base64 ?? []) items.push({ b64_json: b64 });
    for (const u of data.urls ?? []) items.push({ url: u });
    sendJSON(res, 200, {
      created: Math.floor(Date.now() / 1000),
      data: items,
    });
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'images failed');
  }
}

async function handleAudioSpeech(ctx: ServerContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try {
    const raw = await readBody(req);
    body = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    sendError(res, 400, 'invalid_request_error', 'invalid JSON body');
    return;
  }
  const model = typeof body['model'] === 'string' ? body['model'] : '';
  const input = typeof body['input'] === 'string' ? body['input'] : '';
  if (!model || !input) {
    sendError(res, 400, 'invalid_request_error', 'audio/speech requires model + input');
    return;
  }
  const audioReq: AudioRequest = {
    model,
    input,
    ...(typeof body['voice'] === 'string' ? { voice: body['voice'] } : {}),
    ...(typeof body['response_format'] === 'string' ? { format: body['response_format'] } : {}),
    ...(typeof body['speed'] === 'number' ? { speed: body['speed'] } : {}),
  };
  try {
    const data = await ctx.transport.audio(audioReq);
    res.writeHead(200, {
      'content-type': data.mimeType ?? 'audio/mpeg',
      'content-length': data.audio.byteLength,
    });
    res.end(Buffer.from(data.audio));
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'audio/speech failed');
  }
}

async function handleAudioTranscriptions(ctx: ServerContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Minimal multipart parser for `file` and `model` fields. The OpenAI multipart
  // format is well-known; we parse just enough to forward to the transport.
  const ctype = req.headers['content-type'] ?? '';
  const match = /boundary=(.+)$/.exec(ctype);
  if (!match || !match[1]) {
    sendError(res, 400, 'invalid_request_error', 'multipart/form-data required');
    return;
  }
  const boundary = `--${match[1].trim()}`;
  const raw = await readBody(req);
  const parts = raw.split(boundary);
  let model = '';
  let audio: Uint8Array | null = null;
  let filename = 'audio.mp3';
  for (const part of parts) {
    if (!part || part === '--' || part === '\r\n') continue;
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd);
    const content = part.slice(headerEnd + 4).replace(/\r\n$/, '');
    const nameMatch = /name="([^"]+)"/.exec(headerText);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    if (fieldName === 'model') model = content;
    else if (fieldName === 'file') {
      audio = new Uint8Array(Buffer.from(content, 'binary'));
      const filenameMatch = /filename="([^"]+)"/.exec(headerText);
      if (filenameMatch) filename = filenameMatch[1]!;
    }
  }
  if (!model || !audio) {
    sendError(res, 400, 'invalid_request_error', 'transcriptions requires model + file');
    return;
  }
  const txReq: TranscriptionRequest = { model, audio, filename };
  try {
    const data = await ctx.transport.transcription(txReq);
    sendJSON(res, 200, { text: data.text, ...(data.language !== undefined ? { language: data.language } : {}) });
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'transcription failed');
  }
}

async function handleModels(ctx: ServerContext, res: ServerResponse): Promise<void> {
  try {
    const models = await ctx.transport.models();
    sendJSON(res, 200, {
      object: 'list',
      data: models.map((m) => ({ id: m.id, object: 'model', created: 0, owned_by: m.transport })),
    });
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'list models failed');
  }
}

/* ---------------------------------------------------------------------------
 * Server bootstrap
 * ------------------------------------------------------------------------- */

/**
 * Start the OpenAI-compatible HTTP server. Resolves to the underlying
 * `http.Server` once it's listening, so callers (especially tests) can
 * shut it down deterministically. SIGINT/SIGTERM still trigger graceful
 * shutdown if no caller owns the handle.
 */
export async function startServer(opts: ServeOptions): Promise<import('node:http').Server> {
  const ctx = await loadActive();

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const pathname = url.pathname;

      if (pathname === '/healthz' && req.method === 'GET') {
        sendJSON(res, 200, { ok: true, transport: ctx.transportName });
        return;
      }

      if (req.method !== 'POST') {
        if (pathname === '/v1/models' && req.method === 'GET') return handleModels(ctx, res);
        if (pathname === '/v1/providers' && req.method === 'GET') {
          sendJSON(res, 200, { providers: listProviders() });
          return;
        }
        if (pathname === '/v1/detect' && req.method === 'GET') {
          // Auto-detect providers and local runtimes. Time-bound scan
          // (~1s per probe); safe to call from any UI surface.
          const { detect } = await import('../detect.js');
          sendJSON(res, 200, await detect());
          return;
        }
        if (pathname?.startsWith('/v1/providers/') && req.method === 'GET') {
          const slug = decodeURIComponent(pathname.slice('/v1/providers/'.length));
          try {
            sendJSON(res, 200, {
              descriptor: describeProvider(slug),
              config: configSchema(slug),
            });
          } catch (err) {
            const e = err as { code?: string; message?: string; status?: number };
            sendError(res, e.status ?? 404, e.code ?? 'not_found', e.message ?? 'unknown provider');
          }
          return;
        }
        sendError(res, 405, 'method_not_allowed', `Method ${req.method} not allowed`);
        return;
      }

      if (pathname === '/v1/chat/completions' || pathname === '/v1/responses') {
        await handleChatCompletions(ctx, req, res);
        return;
      }
      if (pathname === '/v1/embeddings') {
        await handleEmbeddings(ctx, req, res);
        return;
      }
      if (pathname === '/v1/images/generations') {
        await handleImages(ctx, req, res);
        return;
      }
      if (pathname === '/v1/audio/speech') {
        await handleAudioSpeech(ctx, req, res);
        return;
      }
      if (pathname === '/v1/audio/transcriptions') {
        await handleAudioTranscriptions(ctx, req, res);
        return;
      }
      sendError(res, 404, 'not_found', `No route for ${pathname}`);
    } catch (err) {
      const e = err as { code?: string; message?: string; status?: number };
      sendError(res, e.status ?? 500, e.code ?? 'internal_error', e.message ?? 'internal error');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, opts.host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const addr = server.address();
  const boundPort = typeof addr === 'object' && addr ? addr.port : opts.port;
  const banner = `aiplug server listening on http://${opts.host}:${boundPort} (transport: ${ctx.transportName})\n`;
  process.stdout.write(banner);
  if (opts.printPort) {
    process.stdout.write(`PORT=${boundPort}\n`);
  }

  // Graceful shutdown.
  const shutdown = (): void => {
    process.stdout.write('\nShutting down...\n');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}