/**
 * Anthropic provider metadata.
 *
 * Auth: `x-api-key: $ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`
 * Default base URL: https://api.anthropic.com
 *
 * Reference: https://docs.anthropic.com/en/api/messages
 */

import type { Capability, TransportMetadata } from '../../types.js';
import type { TransportConfig } from '../../transport.js';

export interface AnthropicProviderConfig extends TransportConfig {
  /** Anthropic API version header. Defaults to 2023-06-01. */
  apiVersion?: string;
}

export const CAPABILITIES: Capability[] = [
  'chat',
  'streaming',
  'tools',
  'vision',
];

export const METADATA: TransportMetadata = {
  name: 'anthropic',
  version: '0.1.0',
  capabilities: CAPABILITIES,
  defaultBaseURL: 'https://api.anthropic.com',
  auth: 'x-api-key',
  authHeader: 'x-api-key',
};