/**
 * AIPlug core client.
 *
 * The client is a thin façade around a single transport. It does:
 *   - Profile resolution (one transport + one config per client).
 *   - Lazy transport construction (the registry dynamic-imports it).
 *   - Methods that delegate directly to the transport.
 *
 * The client intentionally has NO:
 *   - Retries
 *   - Model fallback
 *   - Load balancing
 *   - Hidden routing logic
 *
 * Those live one layer up. If you want retries, wrap the client with one.
 */

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
} from './types.js';
import { AIPlugError, makeError } from './errors.js';
import { Transport } from './transport.js';
import { getEntry, loadTransport, type LoadedTransport } from './registry.js';
import {
  configSchema,
  describeProvider,
  listProviders,
  type ProviderConfigSchema,
  type ProviderDescriptor,
} from './introspect.js';

/** Construction-time options that are NOT part of `AiplugConfig`. */
export interface AIPlugOptions {
  /**
   * Optional pre-built `LoadedTransport`. If supplied, the client skips
   * registry resolution — useful for tests, embedded use cases, and
   * tooling that composes transports programmatically.
   */
  transport?: LoadedTransport;
}

export class AIPlug {
  /** The merged config the client is operating under. */
  public readonly config: AiplugConfig;
  /** Lazily loaded transport instance. */
  private _transport: Transport | null = null;
  private _transportLoader: Promise<Transport> | null = null;
  /** The entry that came back from the registry (if any). */
  private readonly _registryEntryName: string | null;

  constructor(config: AiplugConfig, options: AIPlugOptions = {}) {
    this.config = freezeConfig(config);

    if (options.transport) {
      this._transport = options.transport.transport;
      this._registryEntryName = options.transport.entry.module;
    } else {
      this._registryEntryName = null;
    }
  }

  /**
   * Force the transport to be materialised now. If the registry lookup,
   * dynamic import, or constructor throws, the resulting promise rejects
   * with an `AIPlugError`.
   */
  private async ready(): Promise<Transport> {
    if (this._transport) return this._transport;
    if (!this._transportLoader) {
      this._transportLoader = loadTransport(this.config.transport, this.config).then(
        (lt) => {
          this._transport = lt.transport;
          return lt.transport;
        },
      );
    }
    return this._transportLoader;
  }

  /* --------------------------------------------------------------------- */
  /* Public API surface                                                    */
  /* --------------------------------------------------------------------- */

  async chat(req: ChatRequest, opts: { signal?: AbortSignal } = {}): Promise<ChatResponse> {
    const t = await this.ready();
    return invoke(() => t.chat(req, opts.signal), `transport "${t.capabilities().name}"`);
  }

  async *stream(
    req: ChatRequest,
    opts: { signal?: AbortSignal } = {},
  ): AsyncIterableIterator<StreamChunk> {
    const t = await this.ready();
    // Wrap the iterator factory itself so synchronous throws (auth failure,
    // bad URL, invalid config in the transport constructor, etc.) are
    // converted into AIPlugError rather than leaking raw.
    let iter: AsyncIterableIterator<StreamChunk>;
    try {
      iter = t.stream(req, opts.signal);
    } catch (err) {
      throw wrapClientError(err, t.capabilities().name);
    }
    try {
      for await (const chunk of iter) {
        yield chunk;
        if (chunk.type === 'finish' || chunk.type === 'error') return;
      }
    } catch (err) {
      throw wrapClientError(err, t.capabilities().name);
    }
  }

  async embeddings(
    req: EmbeddingsRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<EmbeddingsResponse> {
    const t = await this.ready();
    return invoke(() => t.embeddings(req, opts.signal), `transport "${t.capabilities().name}"`);
  }

  async images(
    req: ImageRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ImageResponse> {
    const t = await this.ready();
    return invoke(() => t.images(req, opts.signal), `transport "${t.capabilities().name}"`);
  }

  async audio(
    req: AudioRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<AudioResponse> {
    const t = await this.ready();
    return invoke(() => t.audio(req, opts.signal), `transport "${t.capabilities().name}"`);
  }

  async transcription(
    req: TranscriptionRequest,
    opts: { signal?: AbortSignal } = {},
  ): Promise<TranscriptionResponse> {
    const t = await this.ready();
    return invoke(() => t.transcription(req, opts.signal), `transport "${t.capabilities().name}"`);
  }

  async models(): Promise<ModelInfo[]> {
    const t = await this.ready();
    return invoke(() => t.models(), `transport "${t.capabilities().name}"`);
  }

  async health(): Promise<HealthInfo> {
    const t = await this.ready();
    return invoke(() => t.health(), `transport "${t.capabilities().name}"`);
  }

  capabilities(): TransportMetadata {
    // Reading capabilities must NOT trigger the dynamic import — use static
    // info from the registry entry if we don't have a transport yet. The
    // registry is a sync JSON lookup so this is safe.
    if (this._transport) return this._transport.capabilities();
    let entry;
    try {
      entry = getEntry(this.config.transport);
    } catch {
      // Unknown transport: fall back to the legacy stub.
      return {
        name: this.config.transport,
        version: '0.0.0',
        capabilities: this.config.capabilities ? [...this.config.capabilities] : [],
        auth: 'none',
      };
    }
    const meta: TransportMetadata = {
      name: this.config.transport,
      version: '0.0.0',
      capabilities: this.config.capabilities ? [...this.config.capabilities] : [],
      auth: entry.auth,
    };
    if (entry.authHeader) meta.authHeader = entry.authHeader;
    if (entry.defaultBaseURL !== null) meta.defaultBaseURL = entry.defaultBaseURL;
    return meta;
  }

  /* ---------------------------------------------------------------------------
   * Provider introspection
   *
   * Synchronous, registry-only — never instantiates a transport. Safe to
   * call before any credentials are configured, so a host UI can list
   * providers + render the right config form at startup.
   * --------------------------------------------------------------------------- */

  /** Every provider aiplug knows about, sorted by category then name. */
  static providers(): ProviderDescriptor[] {
    return listProviders();
  }

  /** Single provider descriptor. Throws on unknown slug. */
  static describeProvider(slug: string): ProviderDescriptor {
    return describeProvider(slug);
  }

  /**
   * Field-level schema for the configuration UI. Tells the host which
   * fields to render (with type, label, required/optional, env-var
   * fallback, secret flag).
   */
  static configSchema(slug: string): ProviderConfigSchema {
    return configSchema(slug);
  }

  /**
   * Auto-detect which providers + local runtimes are reachable on this
   * machine. Scans process env, common dotenv files, the AWS shared
   * credentials file, and probes known local-runtime HTTP ports. Never
   * returns credential values — just presence + a masked prefix.
   */
  static async detect(): Promise<import('./detect.js').DetectionReport> {
    const { detect } = await import('./detect.js');
    return detect();
  }
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

async function invoke<T>(fn: () => Promise<T>, who: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw wrapClientError(err, who);
  }
}

function wrapClientError(value: unknown, who: string): AIPlugError {
  if (value instanceof AIPlugError) return value;
  if (value instanceof Error) {
    return makeError({
      code: 'TRANSPORT_UNAVAILABLE',
      transport: who,
      message: value.message,
      cause: value,
    });
  }
  return makeError({
    code: 'TRANSPORT_UNAVAILABLE',
    transport: who,
    message: typeof value === 'string' ? value : 'Unexpected non-Error throw',
    details: { thrown: value },
  });
}

function freezeConfig(config: AiplugConfig): AiplugConfig {
  const copy: AiplugConfig = { ...config };
  if (copy.headers) copy.headers = Object.freeze({ ...copy.headers });
  if (copy.capabilities) copy.capabilities = [...copy.capabilities];
  return Object.freeze(copy);
}
