/**
 * Ollama provider metadata.
 *
 * Auth: none (local-first)
 * Default base URL: http://localhost:11434
 *
 * Reference: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type { Capability, TransportMetadata } from '../../types.js';
import type { TransportConfig } from '../../transport.js';

export interface OllamaProviderConfig extends TransportConfig {
  // No apiKey — Ollama is local. We ignore any apiKey the user supplies.
}

export const CAPABILITIES: Capability[] = [
  'chat',
  'streaming',
  'embeddings',
  'tools',
];

export const METADATA: TransportMetadata = {
  name: 'ollama',
  version: '0.1.0',
  capabilities: CAPABILITIES,
  defaultBaseURL: 'http://localhost:11434',
  auth: 'none',
};