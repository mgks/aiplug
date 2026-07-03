/**
 * AIPlug public type surface.
 *
 * These types are the contract between user code, the core client, and any
 * individual transport implementation (openai, anthropic, ollama, etc.).
 *
 * Design rules:
 *   - No `any` in any of the shapes exported here.
 *   - `exactOptionalPropertyTypes` is on — optional properties must use
 *     `prop?: T` and never `prop: T | undefined` unless the consumer needs
 *     to distinguish "explicitly absent" from "default".
 *   - Tagged unions use a literal `type:` discriminator.
 */

/* ---------------------------------------------------------------------------
 * Roles & message shapes
 * ------------------------------------------------------------------------- */

/** Roles that can author a message in a chat. */
export type Role = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Multimodal content parts for messages. Providers that do not natively
 * support a given part type will receive a sensible degradation (e.g. an
 * image is dropped or summarised upstream by the transport).
 */
export type ContentPart =
  | { type: 'text'; text: string; cacheControl?: CacheControlHint }
  | {
        type: 'image_url';
        imageUrl: { url: string; detail?: 'auto' | 'low' | 'high' };
        cacheControl?: CacheControlHint;
    }
  | {
        type: 'image_base64';
        mediaType: string;
        /** Base64-encoded image bytes. */
        data: string;
        cacheControl?: CacheControlHint;
    }
  | {
        type: 'document';
        mediaType: string;
        /** Base64-encoded document bytes. */
        data: string;
        name?: string;
        cacheControl?: CacheControlHint;
    }
  | {
        type: 'audio';
        mediaType: string;
        /** Base64-encoded audio bytes. */
        data: string;
        cacheControl?: CacheControlHint;
    };

/**
 * Provider-neutral cache-control marker. Maps to the equivalent native
 * concept for each transport — `cache_control: { type: 'ephemeral' }`
 * for Anthropic/Bedrock, no marker for OpenAI (which infers cache from
 * repeated prefixes server-side), and the MiniMax/OpenRouter equivalent
 * for those providers.
 */
export type CacheControlHint =
    | { type: 'ephemeral'; ttlSeconds?: number }
    | { type: 'persistent' }
    | { type: 'never' };

/** A single entry in a chat log. */
export interface ChatMessage {
    role: Role;
    /**
     * Plain string for text-only turns; array of content parts for
     * multimodal turns (vision, audio, document). Transports serialise
     * to whatever wire shape their provider expects.
     */
    content: string | ContentPart[];
    /** Optional name to disambiguate tool / system actors. */
    name?: string;
    /** Present when this message carries the result of a tool call. */
    toolCallId?: string;
    /** Present on assistant messages that triggered tool calls. */
    toolCalls?: ToolCall[];
    /** Optional cache marker on the whole message. */
    cacheControl?: CacheControlHint;
}

/* ---------------------------------------------------------------------------
 * Tools
 * ------------------------------------------------------------------------- */

/** JSON-Schema-flavoured tool parameter definition. */
export interface ToolParameters {
  type: 'object';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  [key: string]: unknown;
}

/** Minimum JSON Schema surface we accept from tool definitions. */
export interface JsonSchema {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JsonSchema | unknown;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  nullable?: boolean;
  default?: unknown;
  [key: string]: unknown;
}

/** A tool the model may invoke. */
export interface ToolDefinition {
  name: string;
  description?: string;
  parameters: ToolParameters;
}

/** A model-emitted invocation of a tool. */
export interface ToolCall {
  /** Unique id within a single response; use it to send the tool result back. */
  id: string;
  name: string;
  /** Arguments already parsed into a JS value (best-effort JSON parse). */
  arguments: Record<string, unknown>;
  /** Raw arguments string for transports that need it for retry/round-trip. */
  rawArguments?: string;
}

/* ---------------------------------------------------------------------------
 * Requests
 * ------------------------------------------------------------------------- */

/** Sampling controls shared across chat-capable transports. */
export interface SamplingParams {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  /** Arbitrary provider-specific knobs. Transport authors MUST tolerate them. */
  providerOptions?: Record<string, unknown>;
}

/** Common chat request shape, normalised across providers. */
export interface ChatRequest {
  /** Model id; interpreted by the active transport. */
  model: string;
  messages: ChatMessage[];
  /** Tools the model may call. */
  tools?: ToolDefinition[];
  /** Force a specific tool call (provider-specific behaviour). */
  toolChoice?: 'auto' | 'none' | 'required' | { name: string };
  sampling?: SamplingParams;
  /** Pass-through provider options for transports that need them. */
  providerOptions?: Record<string, unknown>;
  /** Optional caller-supplied id to log / de-dupe. */
  requestId?: string;
}

/** Single-message image generation request. */
export interface ImageRequest {
  model: string;
  prompt: string;
  /** Optional negative prompt for diffusion models that support it. */
  negativePrompt?: string;
  /** Pixel size of the generated image (provider-specific mapping). */
  size?: string;
  /** Number of images to generate. */
  n?: number;
  /** Caller-supplied extra options. */
  providerOptions?: Record<string, unknown>;
}

/** Text-to-speech request. */
export interface AudioRequest {
  model: string;
  input: string;
  /** Output voice name/id; transport-specific. */
  voice?: string;
  /** Output format; transport-specific (mp3, opus, pcm, ...). */
  format?: string;
  /** Playback speed multiplier. */
  speed?: number;
  providerOptions?: Record<string, unknown>;
}

/** Speech-to-text (audio transcription) request. */
export interface TranscriptionRequest {
  model: string;
  /** Raw bytes of the audio file. */
  audio: Uint8Array;
  /** Optional filename / extension hint; helps disambiguate formats. */
  filename?: string;
  /** Optional MIME type. */
  mimeType?: string;
  /** Optional language hint (BCP-47 e.g. "en"). */
  language?: string;
  providerOptions?: Record<string, unknown>;
}

/** Text embedding request. */
export interface EmbeddingsRequest {
  model: string;
  input: string | string[];
  /** Encoding format hint. */
  encodingFormat?: 'float' | 'base64';
  providerOptions?: Record<string, unknown>;
}

/* ---------------------------------------------------------------------------
 * Responses
 * ------------------------------------------------------------------------- */

/** Token usage counts; provider-specific values may be missing. */
export interface Usage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** Tokens read from a provider-side cache (Anthropic, Bedrock, MiniMax). */
  cacheReadTokens?: number;
  /** Tokens written into a provider-side cache. */
  cacheWriteTokens?: number;
  /** Reasoning tokens, when the provider reports them separately (MiniMax M3). */
  reasoningTokens?: number;
  [key: string]: unknown;
}

/** Non-streaming chat completion response. */
export interface ChatResponse {
  id?: string;
  model: string;
  message: ChatMessage;
  /** Latency reported by the transport (ms). Optional. */
  latencyMs?: number;
  /** Reason the model stopped generating. */
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | string;
  usage?: Usage;
  /** Raw provider payload for transports that want to surface it. */
  raw?: unknown;
}

/** Embedding result for a single input. */
export interface Embedding {
  index: number;
  vector: number[];
  /** Raw provider payload slice for this embedding. */
  raw?: unknown;
}

export interface EmbeddingsResponse {
  model: string;
  embeddings: Embedding[];
  usage?: Usage;
  raw?: unknown;
}

/** Generated image. */
export interface ImageResponse {
  model: string;
  /** Raw image bytes; provider-specific decode up to the transport. */
  images: Uint8Array[];
  /** Optional base64 / URL mirrors if the provider returns both. */
  base64?: string[];
  urls?: string[];
  mimeType?: string;
  revisedPrompt?: string;
  raw?: unknown;
}

/** Text-to-speech output. */
export interface AudioResponse {
  model: string;
  audio: Uint8Array;
  mimeType?: string;
  format?: string;
  raw?: unknown;
}

/** Speech-to-text output. */
export interface TranscriptionResponse {
  model: string;
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
  raw?: unknown;
}

/* ---------------------------------------------------------------------------
 * Models & transport metadata
 * ------------------------------------------------------------------------- */

/** A single feature flag a transport exposes. Extend as transports add more. */
export type Capability =
  | 'chat'
  | 'streaming'
  | 'tools'
  | 'vision'
  | 'embeddings'
  | 'images'
  | 'audio-tts'
  | 'audio-stt'
  | 'json-mode'
  | 'function-calling'
  | 'reasoning'
  | 'prompt-cache'
  | 'pdf-input'
  | 'audio-input';

/** Static metadata a transport publishes about itself. */
export interface TransportMetadata {
  /** Transport identifier (e.g. "openai"). */
  name: string;
  /** Human-readable version string from the package. */
  version: string;
  /** List of capabilities this transport supports natively. */
  capabilities: Capability[];
  /** Default base URL the transport points at when none is configured. */
  defaultBaseURL?: string;
  /** Authentication scheme the transport expects. */
  auth?: 'bearer' | 'x-api-key' | 'header' | 'none';
  /** Custom header name when `auth === 'header'`. */
  authHeader?: string;
}

/** A single model description, exposed via `transport.models()`. */
export interface ModelInfo {
  /** Provider-assigned model id (e.g. "gpt-4o-mini"). */
  id: string;
  /** Owning transport name. */
  transport: string;
  /** Capability hints for this specific model. */
  capabilities: Capability[];
  /** Free-form metadata from the provider (window, deprecation, etc.). */
  metadata?: Record<string, unknown>;
}

/* ---------------------------------------------------------------------------
 * Streaming
 * ------------------------------------------------------------------------- */

/** Discriminated union of everything a chat stream can yield. */
export type StreamChunk =
  | { type: 'text-delta'; delta: string; accumulated?: string }
  | { type: 'reasoning-delta'; delta: string; accumulated?: string }
  | {
        type: 'tool-call-delta';
        toolCallId: string;
        /** Partial JSON arguments accumulated so far. */
        argumentsDelta: string;
    }
  | {
        type: 'cache-read';
        cacheReadTokens: number;
        accumulated?: number;
    }
  | {
        type: 'cache-write';
        cacheWriteTokens: number;
        /** TTL the cache entry was created with, if known. */
        ttlSeconds?: number;
    }
  | { type: 'tool-call'; toolCall: ToolCall }
  | {
        type: 'usage';
        usage: Usage;
    }
  | {
        type: 'finish';
        reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | string;
    }
  | {
        type: 'error';
        error: AIPlugErrorSnapshot;
    };

/** Minimal serialisable view of an AIPlugError for inclusion in a stream. */
export interface AIPlugErrorSnapshot {
  code: string;
  message: string;
  status?: number;
  retryable: boolean;
  /** Provider slug the error originated from. */
  provider?: string;
}

/* ---------------------------------------------------------------------------
 * Health check
 * ------------------------------------------------------------------------- */

export interface HealthInfo {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

/* ---------------------------------------------------------------------------
 * Client / config
 * ------------------------------------------------------------------------- */

/** Source the configuration was loaded from — useful for debugging. */
export type ConfigSource = 'cli' | 'env' | 'project-file' | 'global-file' | 'defaults';

/** Resolved configuration after precedence merge. */
export interface AiplugConfig {
  /** Which transport to instantiate. */
  transport: string;
  /** API key / bearer token. Optional for transports with auth === "none". */
  apiKey?: string;
  /** Specific model id to use by default. */
  model?: string;
  /** Base URL override. Falls back to transport defaultBaseURL. */
  baseURL?: string;
  /** Extra request headers to send on every request. */
  headers?: Record<string, string>;
  /** Extra timeout in milliseconds for any single request. */
  timeoutMs?: number;
  /** Where this config ultimately came from. Set by the config loader. */
  source?: ConfigSource;
  /** User-provided capability overrides (caps probing). */
  capabilities?: Capability[];
  /** Pass-through for transport-specific options. */
  providerOptions?: Record<string, unknown>;
}
