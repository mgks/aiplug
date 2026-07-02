/**
 * Generic OpenAI-compatible transport.
 *
 * Works against any server that speaks the OpenAI Chat Completions wire
 * format (Together, Groq, OpenRouter, Fireworks, llama.cpp server,
 * vLLM, LM Studio, local Ollama when configured to expose OpenAI mode, …).
 *
 * Differs from `OpenAITransport` only in:
 *   - baseURL is required (no sensible default)
 *   - organization header is optional
 *
 * Inherits all chat / stream / embeddings / images / audio / models logic.
 */

import { OpenAITransport } from '../openai/index.js';
import { makeError } from '../../errors.js';
import type { OpenAIProviderConfig } from '../openai/capabilities.js';
import { METADATA as OPENAI_METADATA } from '../openai/capabilities.js';
import type { TransportMetadata } from '../../types.js';

export interface OpenAICompatibleConfig extends OpenAIProviderConfig {
  baseURL: string; // explicitly required
}

const COMPAT_METADATA: TransportMetadata = {
  ...OPENAI_METADATA,
  name: 'openai-compatible',
  auth: 'bearer',
};

export class OpenAICompatibleTransport extends OpenAITransport {
  constructor(config: OpenAICompatibleConfig) {
    if (!config.baseURL) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: 'openai-compatible',
        message: 'openai-compatible transport requires an explicit baseURL',
      });
    }
    super(config);
  }

  override capabilities(): TransportMetadata {
    return COMPAT_METADATA;
  }
}