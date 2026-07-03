# Changelog

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

### Memoryblock integration
- `memoryblock/packages/adapters/src/index.ts` rewritten to drive auth resolution + base URL from aiplug's introspection. `createMemoryAdapter` is now a single generic factory; no per-provider branches remain.
- `memoryblock/packages/memoryblock/src/commands/start.ts`: `resolveProviderCredentials` driven by `AIPlug.configSchema(slug)`; `selectModel` reads `popularModels` from aiplug.
- `memoryblock/packages/memoryblock/src/constants.ts`: `PROVIDERS` and `PROVIDER_AUTH` lazy-loaded from aiplug; `getImportantProviders()` returns a curated 10-entry shortlist for the TUI; the TUI provider step shows the shortlist + a `More...` custom-slug option.
- `memoryblock/packages/types/src/types.ts` adds `ProviderAuth` and `AuthConfig.providers: Record<string, ProviderAuth>`; legacy fields kept with `@deprecated` markers.
- `memoryblock/packages/core/src/utils/config.ts` `loadAuth()` flattens the new generic `auth.providers[slug]` shape into the legacy top-level slots.
- `memoryblock/packages/web/public/components/provider-schema.js` (new) pulls the full provider list from `/v1/providers` for the web UI.
- `memoryblock/packages/web/public/components/setup.js` shows the full list in the web setup wizard, plus a `More...` option for typing any other aiplug slug.

### Bug fixes
- `eventstream.ts` `headersEnd` was off by 12 (used `headersStart + (headersLength - 12)` instead of `headersStart + headersLength`).
- `eventstream.ts` `parseHeaders` was missing the `value_type` byte between name and `value_length`, causing all headers to come out empty.
- `converse.ts` (bedrock-aws) payload structure was assumed to be nested under event-type wrappers; actual wire format is flat.
- `cli/commands/transport-add.ts` ESM build failed due to a stray `require('node:fs')` (replaced with top-level `mkdirSync` import).
- `tsconfig.json` added `"types": ["node"]` so VS Code's TS server resolves `node:*` imports.

### Build / tooling
- `LLMAdapterConfig.options` widened to `Omit<AiplugConfig, 'transport' | 'apiKey' | 'baseURL' | 'model'>` so `providerOptions` / `headers` / `timeoutMs` pass through to aiplug.
- New `npm test` script using Node's built-in `node:test` (zero new devDependencies). 19 tests covering eventstream framing, MinimaxTransport body injection, Usage shape contract, introspection list/sort, schema fallback, and detect credential masking.
