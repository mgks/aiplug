/**
 * Abstract Transport base class.
 *
 * A "transport" is a concrete adapter for one provider (openai, anthropic,
 * ollama, ...). The core client never imports a specific transport —
 * transports are loaded lazily by `src/registry.ts` based on the
 * entries in `data/registry.json`.
 *
 * Contract:
 *   - Every concrete transport MUST extend this class.
 *   - Every method MUST honour the `signal` abort parameter.
 *   - Streams MUST yield chunks without buffering the whole response.
 *   - Errors MUST be raised as `AIPlugError` (see `makeError` in errors.ts).
 */

import type {
  AudioRequest,
  AudioResponse,
  Capability,
  ChatRequest,
  ChatResponse,
  EmbeddingsRequest,
  EmbeddingsResponse,
  HealthInfo,
  ImageRequest,
  ImageResponse,
  ModelInfo,
  StreamChunk,
  TranscriptionRequest,
  TranscriptionResponse,
  TransportMetadata,
} from './types.js';
import { makeError } from './errors.js';

/** Subset of `AiplugConfig` that transports need. */
export interface TransportConfig {
  transport: string;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** User override merged with detected capabilities. */
  capabilities?: Capability[];
  /** Provider-specific options for the transport to consume. */
  providerOptions?: Record<string, unknown>;
}

/**
 * Type guard helper — transports re-use this to enforce "model present".
 * Throws `INVALID_CONFIGURATION` if the model field is empty.
 */
export function requireModel(config: TransportConfig): string {
  if (!config.model || typeof config.model !== 'string') {
    throw makeError(
      {
        code: 'INVALID_CONFIGURATION',
        transport: config.transport,
        message: `Transport "${config.transport}" requires a model id in config.model`,
      },
    );
  }
  return config.model;
}

/** Type guard helper — throws `AUTH_MISSING` when the API key is required. */
export function requireApiKey(config: TransportConfig, authMode: 'bearer' | 'x-api-key' | 'header'): string {
  if (!config.apiKey) {
    throw makeError({
      code: 'AUTH_MISSING',
      transport: config.transport,
      message: `Transport "${config.transport}" requires an API key for ${authMode} auth`,
    });
  }
  return config.apiKey;
}

/** Standard time-budget helper used by transport subclasses. */
export function withTimeout(signal: AbortSignal | undefined, ms: number | undefined): AbortSignal | undefined {
  if (ms === undefined || ms <= 0) return signal;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Timeout')), ms);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  controller.signal.addEventListener(
    'abort',
    () => clearTimeout(timer),
    { once: true },
  );
  return controller.signal;
}

/**
 * Abstract base class every transport extends. The constructor receives a
 * frozen `TransportConfig` snapshot — concrete transports MUST NOT mutate
 * `this.config` after construction.
 */
export abstract class Transport {
  public readonly config: Readonly<TransportConfig>;
  /** Lazily cached metadata; concrete transport sets it in its constructor. */
  protected metadata: TransportMetadata;

  protected constructor(config: TransportConfig, metadata: TransportMetadata) {
    this.config = Object.freeze({ ...config });
    this.metadata = metadata;
  }

  /* --------------------------------------------------------------------- */
  /* Abstract API surface (the only public methods of a transport)         */
  /* --------------------------------------------------------------------- */

  abstract chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;
  abstract stream(
    req: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterableIterator<StreamChunk>;
  abstract embeddings(req: EmbeddingsRequest, signal?: AbortSignal): Promise<EmbeddingsResponse>;
  abstract images(req: ImageRequest, signal?: AbortSignal): Promise<ImageResponse>;
  abstract audio(req: AudioRequest, signal?: AbortSignal): Promise<AudioResponse>;
  abstract transcription(
    req: TranscriptionRequest,
    signal?: AbortSignal,
  ): Promise<TranscriptionResponse>;
  abstract models(signal?: AbortSignal): Promise<ModelInfo[]>;
  abstract health(signal?: AbortSignal): Promise<HealthInfo>;
  abstract capabilities(): TransportMetadata;
}
