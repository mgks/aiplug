/**
 * Public barrel — re-exports every symbol intended for consumer use.
 * Internal helpers (private to the implementation files) are NOT
 * re-exported here.
 */

export * from './types.js';
export {
  AIPlugError,
  makeError,
  wrapThrown,
  redactSecrets,
  redactString,
  redactHeaders,
  snapshotError,
  type ErrorCode,
} from './errors.js';
export {
  Transport,
  type TransportConfig,
  requireModel,
  requireApiKey,
  withTimeout,
} from './transport.js';
export {
  normalizeSSE,
  normalizeJSONLines,
} from './streaming.js';
export {
  detect as detectCapabilities,
  clearCache as clearCapabilityCache,
  type CapabilityReport,
  type CapabilitySource,
} from './capabilities.js';
export {
  load as loadConfig,
  parseArgs,
  globalConfigDir,
  resolveEnvRef,
  type LoadOptions,
  type LoadedConfig,
  type ProfileMap,
  type ParsedArgs,
} from './config.js';
export {
  getRegistry,
  getEntry,
  listTransportNames,
  loadTransport,
  __setRegistryPathForTests,
  __setImporterForTests,
  type RegistryFile,
  type RegistryEntry,
  type LoadedTransport,
} from './registry.js';
export { AIPlug, type AIPlugOptions } from './client.js';
export {
  createLLMAdapter,
  toAIPlugMessages,
  toAIPlugTools,
  toLLMResponse,
  asSnapshot,
  type LLMAdapter,
  type LLMAdapterConfig,
  type LLMAdapterToolDefinition,
  type LLMMessage,
  type LLMResponse,
  type MessageRole,
  type StopReason,
  type TokenUsage,
} from './llm-adapter.js';
export {
  listProviders,
  describeProvider,
  configSchema,
  type ProviderDescriptor,
  type ProviderConfigSchema,
  type ConfigField,
  type ConfigFieldKind,
} from './introspect.js';