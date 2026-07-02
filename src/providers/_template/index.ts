/**
 * Template Transport subclass — copy this folder to add a new provider.
 *
 * Replace `<NAME>` with the transport identifier, and fill in the
 * capability set + endpoint URLs in `capabilities.ts`.
 */

import { Transport, requireApiKey, requireModel } from '../../transport.js';
import { makeError } from '../../errors.js';
import { normalizeSSE } from '../../streaming.js';
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
import { METADATA, type ProviderConfig } from './capabilities.js';

export class TemplateTransport extends Transport {
  constructor(config: ProviderConfig) {
    super(config, METADATA);
  }

  override async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    requireModel(this.config);
    throw makeError({
      code: 'UNSUPPORTED_CAPABILITY',
      transport: METADATA.name,
      message: 'chat() not implemented in template transport',
    });
  }

  override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    throw makeError({
      code: 'UNSUPPORTED_CAPABILITY',
      transport: METADATA.name,
      message: 'stream() not implemented in template transport',
    });
    yield* normalizeSSE(new Response()); // unreachable
  }

  override async embeddings(req: EmbeddingsRequest, signal?: AbortSignal): Promise<EmbeddingsResponse> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'embeddings() not implemented' });
  }

  override async images(req: ImageRequest, signal?: AbortSignal): Promise<ImageResponse> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'images() not implemented' });
  }

  override async audio(req: AudioRequest, signal?: AbortSignal): Promise<AudioResponse> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'audio() not implemented' });
  }

  override async transcription(req: TranscriptionRequest, signal?: AbortSignal): Promise<TranscriptionResponse> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'transcription() not implemented' });
  }

  override async models(signal?: AbortSignal): Promise<ModelInfo[]> {
    return [];
  }

  override async health(signal?: AbortSignal): Promise<HealthInfo> {
    return { ok: false, error: 'not implemented' };
  }

  override capabilities(): TransportMetadata {
    return METADATA;
  }
}

// Re-export the ProviderConfig type so consumers can type their configs.
export type { ProviderConfig };