// @aiplug:keep
/**
 * Zero-network mock transport for offline unit and integration testing.
 *
 * Provider slug: `mock`.
 *
 * Configurable via `providerOptions`:
 *   - `mockResponse`: Custom ChatResponse or string content to return.
 *   - `mockChunks`: Custom StreamChunk[] or string[] to yield during streaming.
 *   - `mockError`: Error to throw on invocation (simulating API failure).
 *   - `delayMs`: Milliseconds of artificial latency to simulate network wait.
 */

import { Transport, type TransportConfig } from '../../transport.js';
import type {
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

export interface MockProviderOptions {
  mockResponse?: string | Partial<ChatResponse>;
  mockChunks?: Array<string | StreamChunk>;
  mockError?: Error | { code: string; message: string };
  delayMs?: number;
}

export class MockTransport extends Transport {
  /** Log of all requests passed to chat() or stream() on this instance. */
  public readonly requests: ChatRequest[] = [];

  constructor(config: TransportConfig) {
    super(config, {
      name: 'mock',
      version: '1.0.0',
      capabilities: ['chat', 'streaming', 'tools', 'vision'],
      auth: 'none',
    });
  }

  override capabilities(): TransportMetadata {
    return {
      name: 'mock',
      version: '1.0.0',
      capabilities: ['chat', 'streaming', 'tools', 'vision', 'embeddings', 'images'],
      auth: 'none',
    };
  }

  private async maybeDelay(opts?: MockProviderOptions): Promise<void> {
    const ms = opts?.delayMs ?? (this.config.providerOptions as MockProviderOptions | undefined)?.delayMs;
    if (ms && ms > 0) {
      await new Promise((r) => setTimeout(r, ms));
    }
  }

  private checkMockError(opts?: MockProviderOptions): void {
    const err = opts?.mockError ?? (this.config.providerOptions as MockProviderOptions | undefined)?.mockError;
    if (err) {
      if (err instanceof Error) throw err;
      const error = new Error(err.message);
      (error as any).code = err.code;
      throw error;
    }
  }

  async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    if (signal?.aborted) {
      throw new Error('Request was aborted');
    }
    this.requests.push(req);
    const opts = (req.providerOptions ?? this.config.providerOptions ?? {}) as MockProviderOptions;
    await this.maybeDelay(opts);
    this.checkMockError(opts);

    if (typeof opts.mockResponse === 'string') {
      return {
        id: `mock-${Date.now()}`,
        model: req.model,
        message: {
          role: 'assistant',
          content: opts.mockResponse,
        },
        finishReason: 'stop',
      };
    }

    if (opts.mockResponse && typeof opts.mockResponse === 'object') {
      return {
        id: opts.mockResponse.id ?? `mock-${Date.now()}`,
        model: opts.mockResponse.model ?? req.model,
        message: opts.mockResponse.message ?? {
          role: 'assistant',
          content: 'Mock response',
        },
        finishReason: opts.mockResponse.finishReason ?? 'stop',
        ...(opts.mockResponse.usage ? { usage: opts.mockResponse.usage } : {}),
      };
    }

    // Default echo response
    const lastMsg = req.messages[req.messages.length - 1];
    const lastText = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content);
    return {
      id: `mock-${Date.now()}`,
      model: req.model,
      message: {
        role: 'assistant',
        content: `Mock echo: ${lastText}`,
      },
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    if (signal?.aborted) {
      throw new Error('Request was aborted');
    }
    this.requests.push(req);
    const opts = (req.providerOptions ?? this.config.providerOptions ?? {}) as MockProviderOptions;
    await this.maybeDelay(opts);
    this.checkMockError(opts);

    if (opts.mockChunks && opts.mockChunks.length > 0) {
      for (const chunk of opts.mockChunks) {
        if (typeof chunk === 'string') {
          yield { type: 'text-delta', delta: chunk };
        } else {
          yield chunk;
        }
      }
      yield { type: 'finish', reason: 'stop' };
      return;
    }

    const lastMsg = req.messages[req.messages.length - 1];
    const lastText = typeof lastMsg?.content === 'string' ? lastMsg.content : 'hello';
    const words = `Mock stream: ${lastText}`.split(' ');

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) throw new Error('Stream aborted');
      yield {
        type: 'text-delta',
        delta: (i > 0 ? ' ' : '') + words[i],
      };
    }
    yield {
      type: 'usage',
      usage: { promptTokens: 5, completionTokens: words.length, totalTokens: 5 + words.length },
    };
    yield {
      type: 'finish',
      reason: 'stop',
    };
  }

  async embeddings(req: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    return {
      model: req.model,
      embeddings: inputs.map((_, i) => ({
        index: i,
        vector: [0.1, 0.2, 0.3],
      })),
      usage: { promptTokens: inputs.length * 4, totalTokens: inputs.length * 4 },
    };
  }

  async images(req: ImageRequest): Promise<ImageResponse> {
    return {
      model: req.model,
      images: [new Uint8Array([1, 2, 3])],
      urls: ['https://example.com/mock-image.png'],
    };
  }

  async audio(req: AudioRequest): Promise<AudioResponse> {
    return {
      model: req.model,
      audio: new Uint8Array([0, 1, 2]),
      format: req.format ?? 'mp3',
    };
  }

  async transcription(req: TranscriptionRequest): Promise<TranscriptionResponse> {
    return {
      model: req.model,
      text: 'Mock transcription of audio',
    };
  }

  async models(): Promise<ModelInfo[]> {
    return [
      { id: 'mock-general-v1', transport: 'mock', capabilities: ['chat', 'streaming', 'tools'] },
      { id: 'mock-vision-v1', transport: 'mock', capabilities: ['chat', 'streaming', 'vision'] },
    ];
  }

  async health(): Promise<HealthInfo> {
    return {
      ok: true,
      latencyMs: 1,
    };
  }
}
