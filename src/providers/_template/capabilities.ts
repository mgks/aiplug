/**
 * Provider-specific capability metadata.
 *
 * Every transport folder exports a `METADATA` constant and a
 * `ProviderConfig` interface. The `Transport` abstract class consumes both.
 */

import type { Capability, TransportMetadata } from '../../types.js';
import type { TransportConfig } from '../../transport.js';

export interface ProviderConfig extends TransportConfig {
  // Provider-specific keys go here, e.g.:
  // apiKey: string;
  // baseURL?: string;
}

export const CAPABILITIES: Capability[] = [];

export const METADATA: TransportMetadata = {
  name: 'template',
  version: '0.1.0',
  capabilities: CAPABILITIES,
  auth: 'none',
};