/**
 * AIPlug error model.
 *
 * Every error surfaced through the public API (or thrown from a transport)
 * MUST be an `AIPlugError`. Other code paths may throw native types — those
 * are wrapped at the client boundary.
 *
 * Security: messages and `details` are redacted by `makeError` so they
 * cannot leak API keys, bearer tokens, or basic-auth credentials.
 */

import type { AIPlugErrorSnapshot } from './types.js';

/** Stable, machine-readable error codes. */
export type ErrorCode =
  | 'AUTH_INVALID'
  | 'AUTH_MISSING'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'NETWORK_TIMEOUT'
  | 'REQUEST_ABORTED'
  | 'INVALID_CONFIGURATION'
  | 'TRANSPORT_UNAVAILABLE'
  | 'UNSUPPORTED_CAPABILITY'
  | 'INVALID_RESPONSE'
  | 'STREAM_ERROR'
  | 'BILLING_REQUIRED';

/** Canonical cause codes for status-mapping. */
const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: 'INVALID_RESPONSE',
  401: 'AUTH_INVALID',
  402: 'BILLING_REQUIRED',
  403: 'AUTH_INVALID',
  404: 'MODEL_NOT_FOUND',
  408: 'NETWORK_TIMEOUT',
  413: 'INVALID_RESPONSE',
  414: 'INVALID_RESPONSE',
  429: 'RATE_LIMITED',
  500: 'TRANSPORT_UNAVAILABLE',
  502: 'TRANSPORT_UNAVAILABLE',
  503: 'TRANSPORT_UNAVAILABLE',
  504: 'NETWORK_TIMEOUT',
};

/** Codes that should be considered safe to retry. */
const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'RATE_LIMITED',
  'NETWORK_TIMEOUT',
  'TRANSPORT_UNAVAILABLE',
]);

/** Header names that carry secrets — values MUST be redacted. */
const SECRET_HEADER_PATTERNS: readonly RegExp[] = [
  /^authorization$/i,
  /^x-api-key$/i,
  /^x-auth-token$/i,
  /^api-key$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^proxy-authorization$/i,
];

/**
 * Patterns of substrings within an unknown string we should blank out.
 * Used by `redactString`. We intentionally err on the side of caution:
 * if the regex isn't sure, we redact.
 */
const REDACT_PATTERNS: readonly RegExp[] = [
  // Bearer / Basic header credentials
  /Bearer\s+[A-Za-z0-9._\-+/=]+/g,
  /Basic\s+[A-Za-z0-9._\-+/=]+/g,
  // sk-/gho-/ghp-/xox- style tokens
  /\b(sk-[A-Za-z0-9_\-]{16,})\b/g,
  /\b(gho_[A-Za-z0-9]{16,})\b/g,
  /\b(ghp_[A-Za-z0-9]{16,})\b/g,
  /\b(xox[abprs]-[A-Za-z0-9\-]{8,})\b/g,
  // key=value in query strings. `key=` alone (Google-style) and `apikey`,
  // `api_key`, `token`, `access_token`, `password` all match.
  /((?:api[_-]?key|token|access_token|password)=|(?<![A-Za-z0-9_])key=)[^\s&;"']+/gi,
  // basic auth in URL
  /\/\/[A-Za-z0-9._\-~%]+:[A-Za-z0-9._\-~%!$&'()*+,;=]+@/g,
  // cookie: name=value (covers Cookie / Set-Cookie headers)
  /(?:cookie|set-cookie):?\s+[A-Za-z0-9_\-]+=[^\s;,]*/gi,
];

/**
 * Recursively redact secrets from a value (typically used on `details`).
 * Strings are scrubbed with `REDACT_PATTERNS`. Objects/arrays are walked.
 * Other values are returned unchanged.
 */
export function redactSecrets(input: unknown): unknown {
  if (typeof input === 'string') {
    return redactString(input);
  }
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map(redactSecrets);
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = SECRET_HEADER_PATTERNS.some((p) => p.test(k)) ? '[REDACTED]' : redactSecrets(v);
    }
    return out;
  }
  return input;
}

/** Redact secret-shaped substrings from a single string. */
export function redactString(input: string): string {
  let out = input;
  for (const pattern of REDACT_PATTERNS) {
    out = out.replace(pattern, (match) => {
      if (match.startsWith('//') && match.includes('@')) {
        // URL basic auth — preserve scheme/host, redact creds
        return match.replace(/:[^@]*@/, ':[REDACTED]@');
      }
      if (/^(api[_-]?key|token|access_token|password)\s*=/i.test(match)) {
        return match.replace(/=\s*[^\s&;"']+/, '=[REDACTED]');
      }
      return '[REDACTED]';
    });
  }
  return out;
}

/** Redact known-secret header values. Returns a copy, leaves originals intact. */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const isSecret = SECRET_HEADER_PATTERNS.some((p) => p.test(k));
    out[k] = isSecret ? '[REDACTED]' : redactString(v);
  }
  return out;
}

/**
 * Snapshot of an error suitable for embedding in a `StreamChunk`
 * (which is plain-data and serialisable).
 */
export function snapshotError(err: AIPlugError): AIPlugErrorSnapshot {
  const snapshot: AIPlugErrorSnapshot = {
    code: err.code,
    message: err.message,
    retryable: err.retryable,
  };
  if (err.status !== undefined) snapshot.status = err.status;
  return snapshot;
}

/**
 * AIPlug's typed error. All public methods throw this — never raw
 * `Error` or `any`. Transports should call `makeError` to construct one.
 */
export class AIPlugError extends Error {
  public readonly code: ErrorCode;
  public readonly transport: string;
  public readonly status?: number;
  public readonly retryable: boolean;
  public readonly details?: unknown;
  public override readonly cause?: unknown;

  constructor(init: {
    code: ErrorCode;
    message: string;
    transport: string;
    status?: number;
    retryable?: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(init.message);
    this.name = 'AIPlugError';
    this.code = init.code;
    this.transport = init.transport;
    if (init.status !== undefined) this.status = init.status;
    this.retryable = init.retryable ?? RETRYABLE_CODES.has(init.code);
    if (init.details !== undefined) this.details = redactSecrets(init.details);
    if (init.cause !== undefined) this.cause = redactCause(init.cause);
  }

  /**
   * User-facing provider slug (e.g. `'minimax'`, `'bedrock-aws'`). For aiplug
   * the provider slug and transport name are the same, so this is an alias
   * for `transport` kept on the error for clarity at call sites.
   */
  get provider(): string {
    return this.transport;
  }

  /** Plain-data view, suitable for logs / transport across boundaries. */
  toSnapshot(): AIPlugErrorSnapshot {
    const snap = snapshotError(this);
    return { ...snap, provider: this.transport };
  }
}

/**
 * Factory: build an AIPlugError from discrete inputs, or coerce
 * an arbitrary thrown value (e.g. from `fetch`) into one.
 *
 * HTTP status mapping (when no explicit code is given):
 *   400 → INVALID_RESPONSE        401/403 → AUTH_INVALID
 *   404 → MODEL_NOT_FOUND        408/504 → NETWORK_TIMEOUT
 *   413/414 → INVALID_RESPONSE   429 → RATE_LIMITED
 *   5xx → TRANSPORT_UNAVAILABLE
 */
export function makeError(
  codeOrInput:
    | ErrorCode
    | {
        code?: ErrorCode;
        message?: string;
        transport: string;
        status?: number;
        retryable?: boolean;
        details?: unknown;
        cause?: unknown;
      },
  fallbackMessage?: string,
  extra?: { cause?: unknown; details?: unknown },
): AIPlugError {
  // Form 1: (code, message, extras?) called as positional
  if (typeof codeOrInput === 'string') {
    return buildError({
      code: codeOrInput,
      message: fallbackMessage ?? 'AIPlug error',
      transport: 'unknown',
      ...(extra ?? {}),
    });
  }
  // Form 2: object input
  const input = codeOrInput;
  let code = input.code;
  const status = input.status;
  if (!code && status !== undefined) {
    code = STATUS_TO_CODE[status] ?? 'TRANSPORT_UNAVAILABLE';
  }
  if (!code) code = 'TRANSPORT_UNAVAILABLE';
  return buildError({
    code,
    message: input.message ?? fallbackMessage ?? defaultMessageFor(code),
    transport: input.transport,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.retryable !== undefined ? { retryable: input.retryable } : {}),
    ...(input.details !== undefined ? { details: input.details } : {}),
    ...(input.cause !== undefined ? { cause: input.cause } : {}),
  });
}

function buildError(args: {
  code: ErrorCode;
  message: string;
  transport: string;
  status?: number;
  retryable?: boolean;
  details?: unknown;
  cause?: unknown;
}): AIPlugError {
  return new AIPlugError({
    code: args.code,
    message: redactString(args.message),
    transport: args.transport,
    ...(args.status !== undefined ? { status: args.status } : {}),
    ...(args.retryable !== undefined ? { retryable: args.retryable } : {}),
    ...(args.details !== undefined ? { details: args.details } : {}),
    ...(args.cause !== undefined ? { cause: args.cause } : {}),
  });
}

/**
 * Walk an `Error.cause` chain and redact `.message` and `.stack` in place.
 * Identity is preserved so callers can still compare `cause === original`.
 * Cyclic chains are guarded.
 */
function redactCause(value: unknown, seen: Set<unknown> = new Set()): unknown {
  if (!(value instanceof Error)) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  // Use defineProperty so the typically-readonly Error.message can still
  // be replaced. Skip on absolute readonly.
  try {
    Object.defineProperty(value, 'message', {
      value: redactString(value.message),
      configurable: true,
      writable: true,
    });
  } catch {
    /* truly readonly; leave it */
  }
  if (value.stack) {
    try {
      Object.defineProperty(value, 'stack', {
        value: redactString(value.stack),
        configurable: true,
        writable: true,
      });
    } catch {
      /* ignore */
    }
  }
  // Recurse on the cause chain.
  if (value.cause !== undefined) value.cause = redactCause(value.cause, seen);
  return value;
}

function defaultMessageFor(code: ErrorCode): string {
  switch (code) {
    case 'AUTH_INVALID':
      return 'Authentication failed';
    case 'AUTH_MISSING':
      return 'Authentication credentials are missing';
    case 'MODEL_NOT_FOUND':
      return 'Requested model is not available on this transport';
    case 'RATE_LIMITED':
      return 'Rate limit exceeded';
    case 'NETWORK_TIMEOUT':
      return 'Network request timed out';
    case 'REQUEST_ABORTED':
      return 'Request was aborted by the caller';
    case 'INVALID_CONFIGURATION':
      return 'Invalid AIPlug configuration';
    case 'TRANSPORT_UNAVAILABLE':
      return 'Transport is unavailable or returned an error';
    case 'UNSUPPORTED_CAPABILITY':
      return 'Requested capability is not supported on this transport';
    case 'INVALID_RESPONSE':
      return 'Provider returned an invalid or unexpected response';
    case 'STREAM_ERROR':
      return 'Stream terminated abnormally';
    case 'BILLING_REQUIRED':
      return 'Provider rejected the request due to insufficient account balance or credit';
  }
}

/**
 * Wrap a thrown value (from `await ...` or a stream) into an AIPlugError.
 * Native `AIPlugError`s pass through; native `Error`s are wrapped under
 * `TRANSPORT_UNAVAILABLE` with the original preserved as `cause`.
 */
export function wrapThrown(value: unknown, transport: string): AIPlugError {
  if (value instanceof AIPlugError) return value;
  if (value instanceof Error) {
    return makeError({
      code: 'TRANSPORT_UNAVAILABLE',
      message: value.message,
      transport,
      cause: value,
    });
  }
  return makeError({
    code: 'TRANSPORT_UNAVAILABLE',
    message: typeof value === 'string' ? value : 'Unexpected non-Error throw',
    transport,
    details: { thrown: value },
  });
}
