/**
 * OpenAI-compatible provider metadata — capability set is the same as OpenAI
 * because the wire format is identical; only the endpoint differs.
 */

export { METADATA as OPENAI_COMPATIBLE_METADATA } from '../openai/capabilities.js';
export type { OpenAIProviderConfig as OpenAICompatibleConfig } from '../openai/capabilities.js';
import { CAPABILITIES as OPENAI_CAPS } from '../openai/capabilities.js';
import type { TransportMetadata } from '../../types.js';

export const CAPABILITIES = OPENAI_CAPS;
export const METADATA: TransportMetadata = {
  name: 'openai-compatible',
  version: '0.1.0',
  capabilities: CAPABILITIES,
  auth: 'bearer',
};