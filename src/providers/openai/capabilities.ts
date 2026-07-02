/**
 * OpenAI provider metadata.
 *
 * Reference: https://platform.openai.com/docs/api-reference
 * Auth: `Authorization: Bearer $OPENAI_API_KEY`
 * Default base URL: https://api.openai.com/v1
 */

import type { Capability, TransportMetadata } from '../../types.js';
import type { TransportConfig } from '../../transport.js';

export interface OpenAIProviderConfig extends TransportConfig {
  /** Override the default OpenAI organization header. */
  organization?: string;
}

export const CAPABILITIES: Capability[] = [
  'chat',
  'streaming',
  'tools',
  'vision',
  'embeddings',
  'images',
  'audio-tts',
  'audio-stt',
  'json-mode',
  'function-calling',
];

export const METADATA: TransportMetadata = {
  name: 'openai',
  version: '0.1.0',
  capabilities: CAPABILITIES,
  defaultBaseURL: 'https://api.openai.com/v1',
  auth: 'bearer',
};