// @aiplug:keep
/**
 * Multi-provider Fallback & Resilience Transport.
 *
 * Provider slug: `fallback`.
 *
 * Tries each provider in `chain` in sequence. If a provider returns a
 * rate-limit (429), timeout, network failure, or service outage, the
 * transport automatically fails over to the next configured provider
 * without disrupting the caller.
 */

import { Transport, type TransportConfig } from '../../transport.js';
import { makeError, AIPlugError } from '../../errors.js';
import { loadTransport, type LoadedTransport } from '../../registry.js';
import type {
  AiplugConfig,
  AudioRequest,
  AudioResponse,
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
} from '../../types.js';

export interface FallbackOptions {
  /** Ordered list of provider configurations to failover across. */
  chain: AiplugConfig[];
  /** Error codes that trigger fallback. Defaults to RATE_LIMITED, TRANSPORT_UNAVAILABLE, NETWORK_TIMEOUT. */
  fallbackOn?: string[];
  /** Optional callback fired when a failover occurs. */
  onFailover?: (from: string, to: string, error: Error) => void;
}

const DEFAULT_FALLBACK_CODES = [
  'RATE_LIMITED',
  'TRANSPORT_UNAVAILABLE',
  'NETWORK_TIMEOUT',
  'BILLING_REQUIRED',
];

export class FallbackTransport extends Transport {
  private readonly _chain: AiplugConfig[];
  private readonly _fallbackCodes: Set<string>;
  private readonly _onFailover?: (from: string, to: string, error: Error) => void;
  private readonly _loadedTransports = new Map<string, Promise<LoadedTransport>>();

  constructor(config: TransportConfig) {
    super(config, {
      name: 'fallback',
      version: '1.0.0',
      capabilities: ['chat', 'streaming', 'tools', 'vision', 'embeddings', 'images'],
      auth: 'none',
    });

    const opts = (config.providerOptions ?? {}) as unknown as Partial<FallbackOptions>;
    if (!opts.chain || !Array.isArray(opts.chain) || opts.chain.length === 0) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: 'fallback',
        message: 'fallback transport requires a non-empty `providerOptions.chain` array of AiplugConfig entries.',
      });
    }

    this._chain = opts.chain;
    this._fallbackCodes = new Set(opts.fallbackOn ?? DEFAULT_FALLBACK_CODES);
    if (opts.onFailover) {
      this._onFailover = opts.onFailover;
    }
  }

  override capabilities(): TransportMetadata {
    return {
      name: 'fallback',
      version: '1.0.0',
      capabilities: ['chat', 'streaming', 'tools', 'vision', 'embeddings', 'images'],
      auth: 'none',
    };
  }

  private async getTransport(cfg: AiplugConfig, index: number): Promise<Transport> {
    const key = `${cfg.transport}-${index}`;
    if (!this._loadedTransports.has(key)) {
      this._loadedTransports.set(key, loadTransport(cfg.transport, cfg));
    }
    const loaded = await this._loadedTransports.get(key)!;
    return loaded.transport;
  }

  private shouldFallback(err: unknown): boolean {
    if (err instanceof AIPlugError) {
      return this._fallbackCodes.has(err.code);
    }
    const code = (err as any)?.code;
    if (typeof code === 'string' && this._fallbackCodes.has(code)) {
      return true;
    }
    const status = (err as any)?.status ?? (err as any)?.statusCode;
    if (status === 429 || status === 503 || status === 502 || status === 504) {
      return true;
    }
    return false;
  }

  async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    let lastError: unknown = null;

    for (let i = 0; i < this._chain.length; i++) {
      const cfg = this._chain[i]!;
      const effectiveReq: ChatRequest = {
        ...req,
        model: cfg.model ?? req.model,
      };

      try {
        const transport = await this.getTransport(cfg, i);
        return await transport.chat(effectiveReq, signal);
      } catch (err) {
        lastError = err;
        const isLast = i === this._chain.length - 1;
        if (!isLast && this.shouldFallback(err)) {
          const nextCfg = this._chain[i + 1]!;
          if (this._onFailover) {
            this._onFailover(cfg.transport, nextCfg.transport, err as Error);
          }
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    let lastError: unknown = null;

    for (let i = 0; i < this._chain.length; i++) {
      const cfg = this._chain[i]!;
      const effectiveReq: ChatRequest = {
        ...req,
        model: cfg.model ?? req.model,
      };

      try {
        const transport = await this.getTransport(cfg, i);
        const iter = transport.stream(effectiveReq, signal);

        // Probe the first chunk before committing to this stream
        const first = await iter.next();
        if (first.done) {
          return;
        }

        yield first.value;

        // Yield the rest of the stream
        for await (const chunk of iter) {
          yield chunk;
        }
        return;
      } catch (err) {
        lastError = err;
        const isLast = i === this._chain.length - 1;
        if (!isLast && this.shouldFallback(err)) {
          const nextCfg = this._chain[i + 1]!;
          if (this._onFailover) {
            this._onFailover(cfg.transport, nextCfg.transport, err as Error);
          }
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  async embeddings(req: EmbeddingsRequest, signal?: AbortSignal): Promise<EmbeddingsResponse> {
    for (let i = 0; i < this._chain.length; i++) {
      try {
        const t = await this.getTransport(this._chain[i]!, i);
        return await t.embeddings(req, signal);
      } catch (err) {
        if (i === this._chain.length - 1 || !this.shouldFallback(err)) throw err;
      }
    }
    throw makeError({ code: 'TRANSPORT_UNAVAILABLE', transport: 'fallback', message: 'All fallback embeddings failed' });
  }

  async images(req: ImageRequest, signal?: AbortSignal): Promise<ImageResponse> {
    for (let i = 0; i < this._chain.length; i++) {
      try {
        const t = await this.getTransport(this._chain[i]!, i);
        return await t.images(req, signal);
      } catch (err) {
        if (i === this._chain.length - 1 || !this.shouldFallback(err)) throw err;
      }
    }
    throw makeError({ code: 'TRANSPORT_UNAVAILABLE', transport: 'fallback', message: 'All fallback images failed' });
  }

  async audio(req: AudioRequest, signal?: AbortSignal): Promise<AudioResponse> {
    for (let i = 0; i < this._chain.length; i++) {
      try {
        const t = await this.getTransport(this._chain[i]!, i);
        return await t.audio(req, signal);
      } catch (err) {
        if (i === this._chain.length - 1 || !this.shouldFallback(err)) throw err;
      }
    }
    throw makeError({ code: 'TRANSPORT_UNAVAILABLE', transport: 'fallback', message: 'All fallback audio failed' });
  }

  async transcription(req: TranscriptionRequest, signal?: AbortSignal): Promise<TranscriptionResponse> {
    for (let i = 0; i < this._chain.length; i++) {
      try {
        const t = await this.getTransport(this._chain[i]!, i);
        return await t.transcription(req, signal);
      } catch (err) {
        if (i === this._chain.length - 1 || !this.shouldFallback(err)) throw err;
      }
    }
    throw makeError({ code: 'TRANSPORT_UNAVAILABLE', transport: 'fallback', message: 'All fallback transcription failed' });
  }

  async models(): Promise<ModelInfo[]> {
    for (let i = 0; i < this._chain.length; i++) {
      try {
        const t = await this.getTransport(this._chain[i]!, i);
        return await t.models();
      } catch {
        // try next
      }
    }
    return [];
  }

  async health(): Promise<HealthInfo> {
    for (let i = 0; i < this._chain.length; i++) {
      try {
        const t = await this.getTransport(this._chain[i]!, i);
        return await t.health();
      } catch {
        // try next
      }
    }
    return {
      ok: false,
      error: 'All transports in fallback chain failed health check',
    };
  }
}
