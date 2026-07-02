/**
 * Stream normalisation utilities.
 *
 * Two wire formats are supported today:
 *   - Server-Sent Events (text/event-stream, "SSE")
 *   - Newline-Delimited JSON ("NDJSON" / "JSON lines")
 *
 * Both functions return an `AsyncIterableIterator<StreamChunk>` so callers
 * can `for await (const chunk of stream) ...` without caring which wire
 * format the provider uses.
 *
 * Rules:
 *   - Yield as soon as a chunk parses; do not buffer the whole stream.
 *   - Honour a passed-in AbortSignal — close the response body on abort
 *     and on early iterator return so the socket is released.
 *   - Errors raised by transports appear as `{ type: 'error', error }`.
 */

import { AIPlugError, makeError, snapshotError } from './errors.js';
import type { AIPlugErrorSnapshot } from './types.js';
import type { StreamChunk } from './types.js';

const TEXT_DECODER = new TextDecoder('utf-8');

/* ---------------------------------------------------------------------------
 * Public entry points
 * ------------------------------------------------------------------------- */

/**
 * Parse a `text/event-stream` response into StreamChunk events.
 *
 * The function intentionally does not assume any provider-specific schema —
 * it only enforces the SSE wire format. Each `data:` line is one JSON
 * object whose `type` field selects the StreamChunk variant.
 */
export async function* normalizeSSE(
  response: Response,
  signal?: AbortSignal,
): AsyncIterableIterator<StreamChunk> {
  if (!response.body) {
    yield errorChunk(
      makeError({
        code: 'STREAM_ERROR',
        transport: 'unknown',
        message: 'SSE response has no body',
        status: response.status,
      }),
    );
    return;
  }
  yield* parseEventStream(response.body, signal, response.status);
}

/** Parse a newline-delimited JSON response into StreamChunk events. */
export async function* normalizeJSONLines(
  response: Response,
  signal?: AbortSignal,
): AsyncIterableIterator<StreamChunk> {
  if (!response.body) {
    yield errorChunk(
      makeError({
        code: 'STREAM_ERROR',
        transport: 'unknown',
        message: 'NDJSON response has no body',
        status: response.status,
      }),
    );
    return;
  }
  yield* parseNDJSON(response.body, signal, response.status);
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/** Wrap an error into the stream-error chunk variant. */
function errorChunk(err: AIPlugError): StreamChunk {
  const snapshot: AIPlugErrorSnapshot = {
    code: err.code,
    message: err.message,
    retryable: err.retryable,
  };
  if (err.status !== undefined) snapshot.status = err.status;
  return { type: 'error', error: snapshot };
}

/** Whether a read failure was caused by signal abort. */
function isAbortError(err: unknown, signal: AbortSignal | undefined): boolean {
  if (signal?.aborted) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

/** Add an abort listener and return teardown fns. */
function attachAbort(
  signal: AbortSignal | undefined,
  onAbort: () => void,
): { detach: () => void } {
  if (!signal) return { detach: () => undefined };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  return {
    detach: () => signal.removeEventListener('abort', onAbort),
  };
}

/* ---------------------------------------------------------------------------
 * SSE parser
 * ------------------------------------------------------------------------- */

interface SSEEvent {
  event?: string;
  data: string;
}

async function* parseEventStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal | undefined,
  status: number,
): AsyncGenerator<StreamChunk, void, void> {
  const reader = body.getReader();
  let aborted = false;
  // Tracks whether the catch block already yielded a REQUEST_ABORTED chunk,
  // so the `finally` doesn't emit a second one for the same abort.
  let emittedAbort = false;
  const abortHandler = (): void => {
    aborted = true;
    try {
      void reader.cancel().catch(() => undefined);
    } catch {
      /* noop */
    }
  };
  const finalize = (): void => {
    try {
      void reader.cancel().catch(() => undefined);
    } catch {
      /* noop */
    }
  };
  const { detach } = attachAbort(signal, abortHandler);

  let buffer = '';
  let eventBuf: SSEEvent = { data: '' };
  try {
    if (aborted) {
      emittedAbort = true;
      yield errorChunk(
        makeError({
          code: 'REQUEST_ABORTED',
          transport: 'unknown',
          message: 'Stream aborted before reading started',
          status,
          cause: signal?.reason,
        }),
      );
      return;
    }
    while (true) {
      if (aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (aborted) break;
      buffer += TEXT_DECODER.decode(value, { stream: true });
      let sepIdx = buffer.indexOf('\n');
      while (sepIdx !== -1) {
        const rawLine = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 1);
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        processSSELine(line, eventBuf);
        if (line === '') {
          const event = consumeEvent(eventBuf);
          eventBuf = { data: '' };
          if (event && event.data !== '[DONE]') {
            const chunk = parseDataPayload(event.data, status);
            if (chunk) yield chunk;
          }
        }
        sepIdx = buffer.indexOf('\n');
      }
    }
    if (buffer.length > 0) {
      const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
      processSSELine(line, eventBuf);
      const event = consumeEvent(eventBuf);
      if (event && event.data !== '[DONE]') {
        const chunk = parseDataPayload(event.data, status);
        if (chunk) yield chunk;
      }
    }
  } catch (err) {
    if (isAbortError(err, signal)) {
      emittedAbort = true;
      yield errorChunk(
        makeError({
          code: 'REQUEST_ABORTED',
          transport: 'unknown',
          message: 'Stream aborted while reading',
          status,
          cause: err,
        }),
      );
    } else {
      yield errorChunk(
        makeError({
          code: 'STREAM_ERROR',
          transport: 'unknown',
          message: err instanceof Error ? err.message : 'SSE read failed',
          status,
          cause: err instanceof Error ? err : undefined,
        }),
      );
    }
  } finally {
    finalize();
    detach();
    if (aborted && !emittedAbort) {
      yield errorChunk(
        makeError({
          code: 'REQUEST_ABORTED',
          transport: 'unknown',
          message: 'Stream aborted before terminating',
          status,
          cause: signal?.reason,
        }),
      );
    }
  }
}

/** Process a single SSE line, mutating the mutable event buffer. */
function processSSELine(line: string, buf: SSEEvent): void {
  if (line === '' || line.startsWith(':')) return; // terminator / comment
  if (line.startsWith('event:')) {
    buf.event = line.slice(6).trim();
    return;
  }
  if (line.startsWith('data:')) {
    const piece = line.slice(5);
    buf.data = buf.data.length === 0 ? piece.trimStart() : `${buf.data}\n${piece.trimStart()}`;
    return;
  }
  // Other field names — ignore per SSE spec.
}

/** Read a single SSE event. Returns null if the event is empty / heartbeat. */
function consumeEvent(buf: SSEEvent): SSEEvent | null {
  if (buf.data === '' && !buf.event) return null;
  const out: SSEEvent = { data: buf.data };
  if (buf.event) out.event = buf.event;
  return out;
}

function parseDataPayload(raw: string, status: number): StreamChunk | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return errorChunk(
      makeError({
        code: 'INVALID_RESPONSE',
        transport: 'unknown',
        message: 'Failed to parse SSE data payload as JSON',
        status,
        details: { raw: raw.slice(0, 512) },
      }),
    );
  }
  return normaliseChunk(parsed, status);
}

/* ---------------------------------------------------------------------------
 * NDJSON parser
 * ------------------------------------------------------------------------- */

async function* parseNDJSON(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal | undefined,
  status: number,
): AsyncGenerator<StreamChunk, void, void> {
  const reader = body.getReader();
  let aborted = false;
  let emittedAbort = false;
  const abortHandler = (): void => {
    aborted = true;
    try {
      void reader.cancel().catch(() => undefined);
    } catch {
      /* noop */
    }
  };
  const finalize = (): void => {
    try {
      void reader.cancel().catch(() => undefined);
    } catch {
      /* noop */
    }
  };
  const { detach } = attachAbort(signal, abortHandler);

  let buffer = '';
  try {
    if (aborted) {
      emittedAbort = true;
      yield errorChunk(
        makeError({
          code: 'REQUEST_ABORTED',
          transport: 'unknown',
          message: 'Stream aborted before reading started',
          status,
          cause: signal?.reason,
        }),
      );
      return;
    }
    while (true) {
      if (aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (aborted) break;
      buffer += TEXT_DECODER.decode(value, { stream: true });
      let nlIdx = buffer.indexOf('\n');
      while (nlIdx !== -1) {
        const rawLine = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        const trimmed = line.trim();
        if (trimmed.length === 0) {
          nlIdx = buffer.indexOf('\n');
          continue;
        }
        const chunk = parseJSONLine(trimmed, status);
        if (chunk) yield chunk;
        nlIdx = buffer.indexOf('\n');
      }
    }
    if (buffer.trim().length > 0) {
      const chunk = parseJSONLine(buffer.trim(), status);
      if (chunk) yield chunk;
    }
  } catch (err) {
    if (isAbortError(err, signal)) {
      emittedAbort = true;
      yield errorChunk(
        makeError({
          code: 'REQUEST_ABORTED',
          transport: 'unknown',
          message: 'Stream aborted while reading',
          status,
          cause: err,
        }),
      );
    } else {
      yield errorChunk(
        makeError({
          code: 'STREAM_ERROR',
          transport: 'unknown',
          message: err instanceof Error ? err.message : 'NDJSON read failed',
          status,
          cause: err instanceof Error ? err : undefined,
        }),
      );
    }
  } finally {
    finalize();
    detach();
    if (aborted && !emittedAbort) {
      yield errorChunk(
        makeError({
          code: 'REQUEST_ABORTED',
          transport: 'unknown',
          message: 'Stream aborted before terminating',
          status,
          cause: signal?.reason,
        }),
      );
    }
  }
}

function parseJSONLine(raw: string, status: number): StreamChunk | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return errorChunk(
      makeError({
        code: 'INVALID_RESPONSE',
        transport: 'unknown',
        message: 'Failed to parse NDJSON line as JSON',
        status,
        details: { raw: raw.slice(0, 512) },
      }),
    );
  }
  return normaliseChunk(parsed, status);
}

/* ---------------------------------------------------------------------------
 * Wire-format → StreamChunk mapper
 * ------------------------------------------------------------------------- */

/**
 * Translate a parsed JSON object into a StreamChunk. The mapping is
 * deliberately tolerant: the wire formats from different providers vary,
 * so we look for many possible shapes and pick the most informative one.
 */
function normaliseChunk(parsed: unknown, status: number): StreamChunk | null {
  if (parsed === null || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;

  // 1. Explicit `type` field wins.
  if (typeof obj.type === 'string') {
    return mapTypedChunk(obj, status);
  }

  // 2. OpenAI / Anthropic delta-style framing
  if (typeof obj.delta === 'object' && obj.delta !== null) {
    return mapOpenAIDelta(obj);
  }
  // OpenAI-style response: `{choices: [{delta: ...}, ...]}`
  if (Array.isArray(obj.choices)) {
    return mapOpenAIChoices(obj);
  }
  const cbd = obj.content_block_delta as Record<string, unknown> | undefined;
  const cbdDelta = cbd?.delta as Record<string, unknown> | undefined;
  if (Array.isArray(cbdDelta?.input_json)) {
    return mapAnthropicToolDelta(obj);
  }

  // 3. Plain text frame
  if (typeof obj.text === 'string') {
    return { type: 'text-delta', delta: obj.text };
  }

  // 4. Usage-only frame
  if (obj.usage && typeof obj.usage === 'object') {
    return { type: 'usage', usage: obj.usage as { [k: string]: unknown } };
  }

  // 5. Done / stop reason
  if (typeof obj.done === 'boolean' || typeof obj.stop_reason === 'string') {
    const reason = (obj.stop_reason ?? obj.finish_reason ?? 'stop') as string;
    return { type: 'finish', reason };
  }

  // 6. Error frame from a provider
  if (obj.error && typeof obj.error === 'object') {
    const errObj = obj.error as Record<string, unknown>;
    const code = typeof errObj.code === 'string' ? errObj.code : 'INVALID_RESPONSE';
    const message = typeof errObj.message === 'string' ? errObj.message : 'Provider streamed an error';
    return {
      type: 'error',
      error: { code, message, retryable: false, ...(typeof status === 'number' ? { status } : {}) },
    };
  }
  return null;
}

function mapTypedChunk(obj: Record<string, unknown>, status: number): StreamChunk | null {
  const t = obj.type;
  switch (t) {
    case 'text-delta':
    case 'content_block_delta': {
      const text =
        typeof obj.delta === 'string'
          ? obj.delta
          : typeof (obj.delta as Record<string, unknown> | undefined)?.text === 'string'
            ? ((obj.delta as Record<string, string>).text as string)
            : '';
      if (text) return { type: 'text-delta', delta: text };
      return null;
    }
    case 'tool-call':
    case 'tool_use': {
      const tcCandidate = obj.toolCall ?? obj.tool_use ?? obj;
      const tc = tcCandidate as Record<string, unknown>;
      if (tc && typeof tc.id === 'string' && typeof tc.name === 'string') {
        const args = parseArgs(tc.input ?? tc.arguments);
        return {
          type: 'tool-call',
          toolCall: {
            id: tc.id,
            name: tc.name,
            arguments: args.value,
            ...(args.raw !== undefined ? { rawArguments: args.raw } : {}),
          },
        };
      }
      return null;
    }
    case 'usage':
      return { type: 'usage', usage: (obj.usage as { [k: string]: unknown }) ?? {} };
    case 'finish':
    case 'message_stop':
    case 'response.done':
    case 'done': {
      const reason = (obj.reason ?? obj.finish_reason ?? obj.stop_reason ?? 'stop') as string;
      return { type: 'finish', reason };
    }
    case 'error': {
      const errObj = (obj.error as Record<string, unknown> | undefined) ?? obj;
      const code = typeof errObj.code === 'string' ? errObj.code : 'INVALID_RESPONSE';
      const message =
        typeof errObj.message === 'string' ? errObj.message : 'Provider streamed an error';
      return {
        type: 'error',
        error: { code, message, retryable: false, ...(typeof status === 'number' ? { status } : {}) },
      };
    }
    default:
      return null;
  }
}

function mapOpenAIDelta(obj: Record<string, unknown>): StreamChunk | null {
  const delta = obj.delta as Record<string, unknown> | undefined;
  // Finish / stop reason lives at the choice level, NOT inside the delta.
  if (typeof obj.finish_reason === 'string' || typeof obj.stop_reason === 'string') {
    return {
      type: 'finish',
      reason: ((obj.finish_reason ?? obj.stop_reason) as string) || 'stop',
    };
  }
  if (!delta) return null;
  // Tool call delta — OpenAI style
  if (Array.isArray(delta.tool_calls)) {
    const first = (delta.tool_calls[0] ?? {}) as Record<string, unknown>;
    if (typeof first.id === 'string' || typeof delta.role === 'string') {
      const firstFn = first.function as Record<string, unknown> | undefined;
      const deltaFn = delta.function as Record<string, unknown> | undefined;
      const args = parseArgs(firstFn?.['arguments'] ?? deltaFn?.['arguments']);
      const name =
        typeof firstFn?.name === 'string'
          ? (firstFn.name as string)
          : typeof deltaFn?.name === 'string'
            ? (deltaFn.name as string)
            : '';
      const toolCall: import('./types.js').ToolCall = {
        id: (first.id as string) || '',
        name,
        arguments: args.value,
      };
      if (args.raw !== undefined) toolCall.rawArguments = args.raw;
      return { type: 'tool-call', toolCall };
    }
  }
  if (typeof delta.content === 'string' && delta.content.length > 0) {
    return { type: 'text-delta', delta: delta.content };
  }
  if (obj.usage && typeof obj.usage === 'object') {
    return { type: 'usage', usage: obj.usage as { [k: string]: unknown } };
  }
  return null;
}

/** OpenAI wraps each fragment in `{ choices: [{delta, finish_reason, ...}] }`. */
function mapOpenAIChoices(obj: Record<string, unknown>): StreamChunk | null {
  const choices = obj.choices as Array<Record<string, unknown>>;
  const first = choices[0];
  if (!first) return null;
  return mapOpenAIDelta({ ...first, ...obj } as Record<string, unknown>);
}

function mapAnthropicToolDelta(obj: Record<string, unknown>): StreamChunk | null {
  const block = obj.content_block_delta as Record<string, unknown> | undefined;
  const delta = block?.delta as Record<string, unknown> | undefined;
  const partial = Array.isArray(delta?.input_json) ? (delta.input_json as string[]).join('') : '';
  if (!partial) return null;
  return {
    type: 'tool-call',
    toolCall: {
      id: '',
      name: '',
      arguments: {},
      rawArguments: partial,
    },
  };
}

interface ParsedArgs {
  value: Record<string, unknown>;
  raw?: string;
}

function parseArgs(input: unknown): ParsedArgs {
  if (input === undefined || input === null) return { value: {} };
  if (typeof input === 'object' && !Array.isArray(input)) {
    return { value: input as Record<string, unknown> };
  }
  if (typeof input !== 'string') return { value: {} };
  if (input.length === 0) return { value: {} };
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { value: parsed as Record<string, unknown>, raw: input };
    }
    return { value: {}, raw: input };
  } catch {
    return { value: {}, raw: input };
  }
}

/** Re-export so transports don't import from `./errors.js` only to get it. */
export { snapshotError };
