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

/**
 * Normalise a ChatMessage.content (string or ContentPart[]) into the
 * wire format expected by the standard OpenAI Chat Completions API.
 * Maps image_base64 to data URLs, camelCase imageUrl to image_url,
 * audio to input_audio, and videos / documents to standard wire parts.
 */
export function normalizeContentForOpenAI(content: ChatMessage['content']): unknown {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    switch (part.type) {
      case 'text':
        return { type: 'text', text: part.text };
      case 'image_url':
        return {
          type: 'image_url',
          image_url: {
            url: part.imageUrl.url,
            ...(part.imageUrl.detail ? { detail: part.imageUrl.detail } : {}),
          },
        };
      case 'image_base64':
        return {
          type: 'image_url',
          image_url: {
            url: `data:${part.mediaType};base64,${part.data}`,
          },
        };
      case 'video_url':
        return {
          type: 'video_url',
          video_url: { url: part.videoUrl.url },
        };
      case 'video_base64':
        return {
          type: 'video_url',
          video_url: { url: `data:${part.mediaType};base64,${part.data}` },
        };
      case 'audio':
        return {
          type: 'input_audio',
          input_audio: {
            data: part.data,
            format: part.mediaType.includes('wav') ? 'wav' : 'mp3',
          },
        };
      case 'audio_url':
        return {
          type: 'audio_url',
          audio_url: { url: part.audioUrl.url },
        };
      case 'document':
        return {
          type: 'file',
          file: {
            name: part.name ?? 'document',
            mime_type: part.mediaType,
            data: part.data,
          },
        };
      case 'file_url':
        return {
          type: 'file_url',
          file_url: {
            url: part.fileUrl.url,
            ...(part.fileUrl.name ? { name: part.fileUrl.name } : {}),
            ...(part.fileUrl.mimeType ? { mime_type: part.fileUrl.mimeType } : {}),
          },
        };
      default:
        return part;
    }
  });
}