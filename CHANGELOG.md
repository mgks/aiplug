# Changelog

## 0.2.0 — 2026-10-25

Major catalog expansion and core runtime enhancements:

### Provider Catalog Expansion (490+ Providers)
- Registry expanded from 116 to 490 providers, covering over 930 alias routes.
- Added verified hosted inference engines, compute clusters, specialized gateways, and frontier labs (Crusoe, Hetzner, Vultr, Abacus, Amazon Nova, Krutrim, BetterToken, LinkAGI, WebWright, XHuoAPI, Jev Agent, ModelRush, and hundreds more).
- Endpoint corrections and compatibility flag updates across existing providers (Xiaomi, Liquid, WandB, Vertex AI, AIMLAPI, 302.ai).
- Alias collision resolution and addition of clean shorthand aliases (`ds`, `zai`, `pplx`, `cf`, `vag`, `zm`, `samba`, `mdl`, `scw`).
- Standardized MiniMax and Bedrock configurations while maintaining full backward compatibility.

### Multimodal & Rich Media Transport
- Expanded `ChatMessage.content` and `ContentPart` to support video (`video_url`, `video_base64`), audio (`audio`, `audio_url`), documents/PDFs (`document`), and files (`file_url`).
- Added automatic multimodal wire-format normalizer in `_shared.ts` for OpenAI-compatible, Anthropic, and Gemini transports.
- Added `video-input` and `document-input` to `Capability` flags.

### Live Streaming Ergonomics
- New `client.streamText(req, opts)` async iterator yielding pure string text deltas directly (`for await (const delta of client.streamText(req))`), eliminating manual delta discrimination boilerplate.

### Unified Model Specifier (`provider/model`)
- New `AIPlug.fromModel('provider/model', options)` static factory method to instantiate clients cleanly from a single model specifier string (e.g. `'groq/llama-3.3-70b-versatile'` or `'anthropic/claude-3-7-sonnet'`).

### Pluggable Middleware / Interceptors Pipeline
- Added `AIPlugMiddleware` and `client.use(middleware)` pipeline support.
- Enables non-intrusive request/response lifecycle interception for logging, latency tracing, OpenTelemetry integration, rate-limiting, and cost estimation.
- Configurable via `AIPlugOptions.middlewares`.

### Multi-Provider Fallback & Resilience Transport
- New built-in `FallbackTransport` (`transport: 'fallback'`).
- Automatically routes and fails over across an ordered chain of providers when encountering rate-limits (HTTP 429), timeouts, network errors, or provider outages.
- Factory method `AIPlug.fallback(chain, options)` for one-line multi-provider resilience.

### Zero-Network Mock Transport
- New built-in `MockTransport` (`transport: 'mock'`) for deterministic offline unit testing, CI pipelines, and downstream integration verification.
- Supports configurable responses, stream chunks, artificial latency, and simulated error conditions.

### Dynamic Live Model Querying & In-Memory Provider Search
- New `searchProviders(query, options)` function with smart exact/prefix relevance ranking, filtering by category and capability.
- New `client.searchModels(query)` method for dynamically searching live model endpoints.
- New `AIPlug.getDynamicModels(transportOrConfig, apiKey)` static helper.
- New server endpoints: `GET /v1/providers/search` and `GET /v1/providers/:slug/models`.

## 0.1.0 — 2026-07-03

First public release. Universal transport-pluggable AI client runtime:


### Stream protocol
- New `StreamChunk` variants: `reasoning-delta` (split reasoning from final answer), `tool-call-delta` (incremental tool-call argument streaming), `cache-read` / `cache-write` (provider-side cache events).
- `Usage` extended with `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`.
- `ChatMessage.content` now `string | ContentPart[]` for multimodal input (image_url, image_base64, document, audio). Each part carries an optional `cacheControl` marker mapped to provider-native equivalents (Anthropic `cache_control`, MiniMax `reasoning_split`, etc.).
- `Capability` extended with `prompt-cache`, `pdf-input`, `audio-input`.

### Provider introspection
- New `AIPlug.providers()` returns the full registered provider list.
- New `AIPlug.describeProvider(slug)` returns per-provider metadata.
- New `AIPlug.configSchema(slug)` returns field-level schema for the config UI.
- HTTP routes `GET /v1/providers` and `GET /v1/providers/:slug`.
- `RegistryEntry.capabilities: string[]` carried in registry output.

### Auto-detection
- New `AIPlug.detect()` returns a `DetectionReport` with detected provider credentials (env + dotenv + AWS shared credentials file) and detected local runtimes (Ollama, LM Studio, vLLM, llama.cpp, Jan, LocalAI, Atomic Chat, ollama-cloud).
- New `aiplug detect` CLI command with `--json` output.
- New HTTP route `GET /v1/detect` for web UI integration.
- Detection never returns credential values - only presence + a masked prefix.

### Provider-specific changes
- `MinimaxTransport` (`@aiplug:keep` override) injects `thinking: { type: 'adaptive' }` and `reasoning_split: true` for reasoning-capable MiniMax models (M3, M2.7, M2.5, M2.1, M2).
- Bedrock native Converse path surfaces `cacheReadInputTokens` and `cacheWriteInputTokens` in `metadata.usage`.
- Bedrock `bedrock-aws` / `bedrock-converse` registered as extra native entries (preserved across `build-registry` regenerations).
- Region placeholder resolution (`<region>` substituted from `providerOptions.region`) wired through `adapters/` into aiplug.

### Error surface
- New `ErrorCode` value `BILLING_REQUIRED` for HTTP 402 (insufficient account balance, credit cap).
- `AIPlugError` carries a `provider` getter that returns the transport name.
- `AIPlugErrorSnapshot.provider` added to the serialisable snapshot.

### Host agent & framework integration
- Driver architecture updated to drive auth resolution + base URL from aiplug's introspection API. `createLLMAdapter` provided as a single generic factory without per-provider branches.
- Provider credential discovery driven by `AIPlug.configSchema(slug)` with `popularModels` discovery.
- Added `/v1/providers` endpoint for dynamic UI schema resolution.

### Bug fixes
- `eventstream.ts` `headersEnd` was off by 12 (used `headersStart + (headersLength - 12)` instead of `headersStart + headersLength`).
- `eventstream.ts` `parseHeaders` was missing the `value_type` byte between name and `value_length`, causing all headers to come out empty.
- `converse.ts` (bedrock-aws) payload structure was assumed to be nested under event-type wrappers; actual wire format is flat.
- `cli/commands/transport-add.ts` ESM build failed due to a stray `require('node:fs')` (replaced with top-level `mkdirSync` import).
- `tsconfig.json` added `"types": ["node"]` so VS Code's TS server resolves `node:*` imports.

### Build / tooling
- `LLMAdapterConfig.options` widened to `Omit<AiplugConfig, 'transport' | 'apiKey' | 'baseURL' | 'model'>` so `providerOptions` / `headers` / `timeoutMs` pass through to aiplug.
- New `npm test` script using Node's built-in `node:test` (zero new devDependencies). 19 tests covering eventstream framing, MinimaxTransport body injection, Usage shape contract, introspection list/sort, schema fallback, and detect credential masking.
