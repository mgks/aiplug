/**
 * Shared helpers for provider implementations.
 *
 * Kept in `_shared.ts` (not under any specific provider) so it can be
 * imported without dragging provider-specific deps into one another.
 */

import type { AIPlugError } from '../errors.js';
import { makeError } from '../errors.js';
import type { ChatMessage, ContentPart } from '../types.js';

/**
 * Build a `RequestInit` while honouring `exactOptionalPropertyTypes`.
 * Passing `signal: undefined` to fetch is a type error under strict
 * settings, so we omit the property when no signal was supplied.
 */
export function buildRequestInit(opts: {
  method: string;
  headers: Record<string, string>;
  body?: BodyInit | null | undefined;
  signal?: AbortSignal | undefined;
}): RequestInit {
  const init: RequestInit = { method: opts.method, headers: opts.headers };
  if (opts.body !== undefined && opts.body !== null) init.body = opts.body;
  if (opts.signal) init.signal = opts.signal;
  return init;
}

/** Wrap any thrown value into an AIPlugError attributed to `transport`. */
export function wrapFetchError(err: unknown, transport: string): AIPlugError {
  const e = err as Error & { code?: string; name?: string };
  const code =
    e.code === 'ECONNREFUSED' || e.name === 'TypeError' || e.message?.includes('fetch failed')
      ? 'TRANSPORT_UNAVAILABLE'
      : e.name === 'AbortError'
        ? 'REQUEST_ABORTED'
        : 'NETWORK_TIMEOUT';
  return makeError({
    code,
    transport,
    message: e.message ?? 'Network request failed',
    cause: err,
    retryable: true,
  });
}

/** Map an HTTP status to an AIPlugError code. */
export function codeForStatus(status: number): 'AUTH_INVALID' | 'BILLING_REQUIRED' | 'MODEL_NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'TRANSPORT_UNAVAILABLE' {
  if (status === 401 || status === 403) return 'AUTH_INVALID';
  if (status === 402) return 'BILLING_REQUIRED';
  if (status === 404) return 'MODEL_NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'TRANSPORT_UNAVAILABLE';
  return 'INVALID_RESPONSE';
}

/**
 * Flatten a `ChatMessage.content` value (string or ContentPart[]) into a
 * plain string. Providers that don't yet support multimodal inputs use
 * this at the body-building boundary so the rest of the transport can
 * keep treating content as `string`.
 *
 * Concatenates every `text` part in order. Non-text parts (images,
 * documents, audio) are dropped from the text view — transports that
 * can carry them should branch on `Array.isArray(content)` instead of
 * calling this helper.
 */
export function extractText(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((p): p is ContentPart & { type: 'text' } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/**
 * True if a message carries any non-text content (vision, audio, document,
 * image). Transports can use this to short-circuit text-only fast paths.
 */
export function hasNonTextContent(content: ChatMessage['content']): boolean {
  if (typeof content === 'string') return false;
  return Array.isArray(content) && content.some((p) => p.type !== 'text');
}