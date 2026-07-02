/**
 * Google Gemini (Google AI Studio) provider metadata.
 *
 * Two surfaces:
 *   - Native Gemini API:  POST {baseURL}/v1beta/models/{model}:generateContent
 *                         with ?key=API_KEY
 *   - OpenAI-compatible:  https://generativelanguage.googleapis.com/v1beta/openai
 *                         (the OpenAI-compatible adapter handles this one).
 *
 * This adapter covers the native Gemini surface because the chat shape differs
 * (multi-part `contents[]` blocks, function calling via `tools[].functionDeclarations`,
 * SSE via ":streamGenerateContent?alt=sse").
 */

import type { Capability, TransportMetadata } from '../../types.js';
import type { TransportConfig } from '../../transport.js';

export interface GeminiProviderConfig extends TransportConfig {
  // API key is passed as a `?key=` query parameter, not a header.
}

export const CAPABILITIES: Capability[] = [
  'chat',
  'streaming',
  'tools',
  'vision',
  'embeddings',
];

export const METADATA: TransportMetadata = {
  name: 'gemini',
  version: '0.1.0',
  capabilities: CAPABILITIES,
  defaultBaseURL: 'https://generativelanguage.googleapis.com',
  auth: 'header',
  authHeader: 'x-goog-api-key',
};