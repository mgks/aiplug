# AIPlug

<div align="center">

[![npm version](https://img.shields.io/npm/v/aiplug?color=blue)](https://www.npmjs.com/package/aiplug)
[![license](https://img.shields.io/github/license/memoryblock-io/aiplug)](LICENSE)
[![tests](https://img.shields.io/badge/tests-27%20passing-brightgreen)](package.json)
[![providers](https://img.shields.io/badge/providers-490%2B-blueviolet)](PROVIDERS.md)

[**Quick Start**](#quick-start) •
[**CLI**](#cli) •
[**Programmatic API**](#programmatic-api) •
[**Providers Directory (490+)**](PROVIDERS.md) •
[**Streaming & Fallback**](#features--capabilities) •
[**HTTP Gateway**](#http-gateway-server) •
[**Sponsors**](#sponsors--support) •
[**Contributing**](#contributing)

</div>

A lightweight, dependency-free TypeScript runtime that gives every AI backend one identical face. AIPlug is a **universal transport layer** — point any OpenAI-compatible SDK at AIPlug and switch the underlying provider with one config line.

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3711/v1',
  apiKey: 'whatever',        // AIPlug handles real auth
});

// Now this hits Anthropic, or Ollama, or Groq, or any of 490+ providers
// depending on what you set with `aiplug transport use anthropic`.
```

Built on four principles:

- **Zero runtime dependencies** beyond `yaml` (≈ 80 kB).
- **Zero artificial limits.** No turn limits, no tool caps, no autonomous loops — your application controls the conversation budget.
- **No hidden retries, no hidden routing, no automatic model selection.** You say what you want, AIPlug sends it.
- **One folder per provider.** Adding a new provider is a five-minute copy-paste.

## Quick start

```bash
npm install
npm run build

# Configure providers
./dist/cli/index.js init
./dist/cli/index.js transport add anthropic              # interactive
./dist/cli/index.js transport add ollama  --base-url=http://localhost:11434 --model=llama3.2 --force --yes
./dist/cli/index.js transport add openai   --api-key=$OPENAI_API_KEY --model=gpt-4o --force --yes

# Use one
./dist/cli/index.js transport use anthropic

# Boot the OpenAI-compatible HTTP server
./dist/cli/index.js serve
```

Then point any OpenAI SDK at `http://localhost:3711/v1`. **The application code doesn't change** when you switch providers — only the `aiplug transport use` line.

## CLI

| Command | What it does |
|---------|--------------|
| `aiplug init` | Create `~/.config/aiplug/` and seed empty config |
| `aiplug transport add <slug>` | Interactively add a provider. `--api-key`, `--base-url`, `--model`, `--force`, `--yes` available |
| `aiplug transport remove <slug>` | Remove a configured provider (`--force`) |
| `aiplug transport list` | Show configured providers + which is active |
| `aiplug transport test <slug>` | Live health-check against the provider's endpoint |
| `aiplug transport use <slug>` | Mark which provider serves the HTTP server |
| `aiplug models` | List models from the active provider's `/models` endpoint |
| `aiplug config` | Print the resolved effective config (CLI > env > file > defaults) |
| `aiplug status [--live]` | Table of providers, optionally with live health probes |
| `aiplug serve [--port=3711] [--host=127.0.0.1]` | Start the OpenAI-compatible HTTP server |
| `aiplug health` | Health-check the active provider |
| `aiplug chat [model]` | Minimal streaming REPL against the active transport |
| `aiplug --json` | Machine-readable output (works on every command) |
| `aiplug --help` | Built-in help |

## Chat REPL

`aiplug chat` opens a minimal streaming REPL against whichever provider you made active with `aiplug transport use <name>`. No banners, no onboarding, no colour noise. Direct prompt → streamed reply → next prompt.

```bash
$ aiplug transport use anthropic
$ aiplug chat claude-3-5-sonnet-latest
aiplug chat — anthropic / claude-3-5-sonnet-latest
Type /help for commands, Ctrl+D to exit.

you> What's the capital of France?
Paris.

you> And its population?
About 2.1 million in the city proper (roughly 12 million in the metro area).

you> /model claude-3-opus-latest
(model: claude-3-opus-latest)

you> /exit
```

### In-session commands

| Command | Effect |
|---------|--------|
| `/help` | Show available commands |
| `/model <name>` | Switch model mid-session |
| `/provider` | Show active transport + model |
| `/clear` | Clear conversation history |
| `/exit`, `/quit`, `/q` | End the session |

### Signals

| Key | Effect |
|-----|--------|
| `Ctrl+C` during a stream | Aborts the current request, stays in REPL |
| `Ctrl+C` idle | Exits |
| `Ctrl+D` | Exits |

## Programmatic API

```ts
import { AIPlug, loadConfig } from 'aiplug';

// Pick a provider in three ways:
//   1. Explicit config
const ai = new AIPlug({
  transport: 'anthropic',
  apiKey:    process.env.ANTHROPIC_API_KEY!,
  model:     'claude-3-5-sonnet-latest',
});

//   2. Unified "provider/model" specifier string
const fast = AIPlug.fromModel('groq/llama-3.3-70b-versatile', {
  apiKey: process.env.GROQ_API_KEY,
});

//   3. From a profile in aiplug.config.json (CLI > env > file > defaults)
const { config } = loadConfig({}, 'work');
const configuredAi = new AIPlug(config);

// All methods accept an AbortSignal
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 5000);

const reply = await ai.chat(
  {
    model: 'claude-3-5-sonnet-latest',
    messages: [{ role: 'user', content: 'Hello!' }],
  },
  { signal: ctrl.signal },
);
console.log(reply.message.content);

// Live text streaming — yields string text deltas directly
for await (const text of ai.streamText({
  model: 'claude-3-5-sonnet-latest',
  messages: [{ role: 'user', content: 'Tell me a story.' }],
})) {
  process.stdout.write(text);
}

// Or full stream chunk inspection (reasoning, tool calls, cache, usage)
for await (const chunk of ai.stream({
  model: 'claude-3-5-sonnet-latest',
  messages: [{ role: 'user', content: 'Design a system.' }],
})) {
  if (chunk.type === 'text-delta') process.stdout.write(chunk.delta);
  if (chunk.type === 'reasoning-delta') console.log('[thinking]', chunk.delta);
  if (chunk.type === 'finish') console.log('\n[done]', chunk.reason);
}

// Other capabilities — same shape across providers
await ai.embeddings({ model: 'text-embedding-3-small', input: 'hello world' });
await ai.images({ model: 'dall-e-3', prompt: 'a robot cat' });
await ai.audio({ model: 'tts-1', input: 'hello world', voice: 'alloy' });
await ai.transcription({ model: 'whisper-1', audio: audioBytes });
await ai.models();               // → ModelInfo[] (queries live endpoint)
await ai.searchModels('llama');  // → ModelInfo[] filtered by query
await ai.health();               // → { ok, latencyMs? }
ai.capabilities();               // → TransportMetadata (sync)

// Fast in-memory provider search across 490+ providers
const providers = AIPlug.searchProviders('groq', { capability: 'vision' });
```

### Multi-provider resilience & fallback

Chain multiple providers together with automatic failover upon HTTP 429 rate-limits, timeouts, or service outages:

```ts
const resilient = AIPlug.fallback(
  [
    { transport: 'groq', apiKey: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' },
    { transport: 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY, model: 'deepseek-chat' },
    { transport: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' },
  ],
  {
    onFailover: (from, to, err) => {
      console.warn(`[aiplug] Failover from ${from} to ${to}: ${err.message}`);
    },
  },
);

// If Groq is rate-limited, this seamlessly executes on DeepSeek:
const res = await resilient.chat({ messages: [{ role: 'user', content: 'Run query' }] });
```

### Pluggable middleware pipeline

Intercept requests and responses without subclassing or wrapping transports:

```ts
ai.use(async (req, next, ctx) => {
  const start = Date.now();
  console.log(`[aiplug] Calling ${ctx.transportName} with model ${ctx.model}`);
  const res = await next(req);
  console.log(`[aiplug] Completed in ${Date.now() - start}ms`);
  return res;
});
```

### Offline & CI testing with MockTransport

```ts
const testClient = new AIPlug({
  transport: 'mock',
  model: 'mock-model-1',
  providerOptions: {
    mockResponse: 'Deterministic response for tests',
  },
});
```

## HTTP server

`aiplug serve` exposes an OpenAI-compatible API on `127.0.0.1:3711` by default:

```
POST /v1/chat/completions          # OpenAI Chat Completions; SSE when stream=true
POST /v1/responses                 # alias for /v1/chat/completions
POST /v1/embeddings
POST /v1/images/generations
POST /v1/audio/speech
POST /v1/audio/transcriptions      # multipart
GET  /v1/models                    # models for active transport (or ?provider=...)
GET  /v1/providers                 # list all 490+ registered providers
GET  /v1/providers/search?q=...    # in-memory fast provider search
GET  /v1/providers/:slug/models    # dynamic live model discovery from source provider
GET  /healthz
```

**Works with every OpenAI client SDK on the planet** (Python `openai`, JS `openai`, Go `openai-go`, etc.) by setting `baseURL: http://localhost:3711/v1`.

Use `--port=0` for ephemeral ports (useful in tests).

## Embedding AIPlug in another project

`AIPlug` and the typed public surface (`AIPlug`, `Transport`, `ChatMessage`, `ToolCall`, …) are the canonical types an embedding project should consume. The package has zero third-party runtime dependencies, ships as ESM, and exposes its full shape via `import { … } from 'aiplug'`. Embedding applications and host frameworks can treat aiplug as the single source of truth for all provider transports.

### `LLMAdapter` compatibility façade

For host projects or agent architectures that follow the classic `LLMAdapter` interface (`converse`, `converseStream`), aiplug ships an exact-match façade:

````typescript
import { createLLMAdapter, type LLMMessage } from 'aiplug';

const adapter = createLLMAdapter({
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY,
});
const reply = await adapter.converse([
  { role: 'user', content: 'hi' } satisfies LLMMessage,
]);
console.log(reply.message.content, reply.stopReason, reply.usage);
````

`createLLMAdapter` returns an `LLMAdapter` whose `converse` and `converseStream` methods match the canonical contract (`LLMMessage`, `TokenUsage`, `StopReason`). The re-exported types `LLMMessage`, `LLMResponse`, `LLMAdapterToolDefinition`, `TokenUsage`, `StopReason` are pure aliases so existing agent code runs unchanged.

## Stream protocol

`AIPlug.stream()` yields a discriminated union of `StreamChunk` variants. Downstream consumers (agents, orchestrators, chat UIs, scripts) consume this uniform shape regardless of the underlying provider. The wire format is provider-specific; the chunk shape is uniform.

### Chunk variants

| Variant | When it fires | Provider examples |
|---------|--------------|-------------------|
| `text-delta` | Plain response text streams | All |
| `reasoning-delta` | Model emits thinking that should not be shown to the user verbatim | MiniMax-M3 (`reasoning_split: true`), Anthropic Claude, DeepSeek-V4 (reasoning mode) |
| `tool-call-delta` | Tool-call arguments stream in incrementally (partial JSON) | OpenAI, Bedrock ConverseStream, Anthropic |
| `tool-call` | The final assembled tool call, ready for execution | All |
| `cache-read` | The provider reports cached prompt tokens were hit | Anthropic, Bedrock, MiniMax |
| `cache-write` | The provider reports new prompt tokens were cached | Anthropic, Bedrock |
| `usage` | Token accounting chunk (prompt, completion, total, cache deltas) | All |
| `finish` | Stream completed; carries the stop reason | All |
| `error` | Mid-stream failure that the transport decided to surface as a chunk | All |

`Usage` carries the cache deltas:

```typescript
const usage = chunk.usage;
// {
//   promptTokens: 100,
//   completionTokens: 50,
//   totalTokens: 150,
//   cacheReadTokens: 80,    // optional
//   cacheWriteTokens: 20,   // optional
//   reasoningTokens: 10,   // optional
// }
```

Provider-specific fields land through the index signature (e.g. Anthropic's `cache_creation_input_tokens`).

### Multimodal content & rich media

`ChatMessage.content` is `string | ContentPart[]`. AIPlug transparently maps rich media across OpenAI-compatible, Anthropic, Gemini, and custom providers:

- **Images**: `{ type: 'image_url', imageUrl: { url, detail?: 'auto' | 'low' | 'high' } }` or base64 `{ type: 'image_base64', mediaType: 'image/png', data }`
- **Videos**: `{ type: 'video_url', videoUrl: { url } }` or base64 `{ type: 'video_base64', mediaType: 'video/mp4', data }`
- **Audio**: `{ type: 'audio', mediaType: 'audio/mp3', data }` or `{ type: 'audio_url', audioUrl: { url } }`
- **Documents & PDFs**: `{ type: 'document', mediaType: 'application/pdf', data, name?: 'doc.pdf' }` or `{ type: 'file_url', fileUrl: { url } }`

```typescript
await ai.chat({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this chart, document, and video recording.' },
      { type: 'image_url', imageUrl: { url: 'https://example.com/chart.png', detail: 'high' } },
      { type: 'document', mediaType: 'application/pdf', name: 'report.pdf', data: pdfBase64 },
      { type: 'video_url', videoUrl: { url: 'https://example.com/demo.mp4' } },
    ],
  }],
});
```

The transport normalises content parts into each provider's native wire format (data URLs for OpenAI-compatible, content blocks for Anthropic Messages, `inlineData` / `fileData` for Gemini). Providers that do not support a given part type silently drop it from the text view via the `extractText` helper; to gate multimodal inputs before sending, inspect `transport.capabilities()` or `AIPlug.describeProvider(slug).capabilities`.

### Provider-specific body overrides

`request.providerOptions` is forwarded into the body verbatim after the standard OpenAI-shaped fields, so provider-native toggles pass through without losing the rest of the request:

```typescript
await ai.stream({
  model: 'MiniMax-M3',
  messages: [{ role: 'user', content: 'ping' }],
  providerOptions: {
    thinking: { type: 'disabled' },   // MiniMax native toggle
    reasoning_split: false,           // keep reasoning inline
  },
});
```

For convenience, the MiniMax transport injects `thinking: { type: 'adaptive' }` + `reasoning_split: true` by default for reasoning-capable model IDs, so callers do not need to remember the wire format.

## Integrating with Host Applications & Frameworks

`aiplug` is completely self-contained and framework-agnostic. Host applications, multi-agent frameworks, and autonomous systems can embed `aiplug` as their universal transport engine.

### Generic Adapter Pattern

Instead of maintaining separate HTTP/SSE drivers for every provider, host applications can wrap `aiplug` behind a unified interface:

```typescript
import { createLLMAdapter, type LLMAdapter, type LLMMessage } from 'aiplug';

export class AgentProviderAdapter {
  private inner: LLMAdapter;

  constructor(provider: string, model: string, apiKey?: string) {
    this.inner = createLLMAdapter({
      provider,
      model,
      apiKey,
    });
  }

  get provider() { return this.inner.provider; }
  get model() { return this.inner.model; }

  converse = (messages: LLMMessage[], tools?: any[]) => 
    this.inner.converse(messages, tools);

  converseStream = (messages: LLMMessage[], tools: any[], onChunk: (text: string) => void) =>
    this.inner.converseStream?.(messages, tools, onChunk);
}
```

### Capability-Gated Execution

Host applications can query `transport.capabilities()` at runtime before dispatching requests to dynamically determine if vision, tool calling, embeddings, or streaming is supported:

```typescript
const caps = await ai.capabilities();

if (caps.includes('tools')) {
  // Safe to pass function declarations to the model
}
if (caps.includes('image-input') || caps.includes('video-input')) {
  // Safe to attach multimodal buffers/URLs
}
```

## Supported providers (490+ providers, 930+ routes)

The complete, unabridged catalog of all 490+ providers, external API base URLs, default environment variables, and wire formats is maintained in:

👉 **[Complete Supported Providers Directory (PROVIDERS.md)](PROVIDERS.md)**

### Category Breakdown

| Category | Providers | Highlights & Key Examples |
|:---|:---:|:---|
| **[Frontier Labs & Flagships](PROVIDERS.md#frontier-labs--flagship-apis-74)** | 74 | OpenAI, Anthropic, Gemini, DeepSeek, xAI, Mistral, MiniMax, Qwen, Baidu Qianfan |
| **[API Gateways & Proxies](PROVIDERS.md#api-gateways--unified-proxies-130)** | 130 | OpenRouter, LiteLLM, Portkey, Vercel AI, Helicone, Cloudflare Gateway, BetterToken |
| **[Multi-Provider Routers](PROVIDERS.md#aggregators--multi-provider-routers-20)** | 20 | AIPlug Fallback Router, 302.AI, AIMLAPI, LinkAGI, ModelRush, ZenMux |
| **[IaaS & GPU Clouds](PROVIDERS.md#iaas-bare-metal--gpu-clouds-63)** | 63 | Groq, Cerebras, SambaNova, Together, Fireworks, DeepInfra, Nebius, Vultr |
| **[Enterprise Cloud & Sovereign](PROVIDERS.md#enterprise-cloud--sovereign-infrastructure-43)** | 43 | AWS Bedrock (SigV4), Azure OpenAI, Google Vertex AI, Cloudflare Workers AI |
| **[Local & Offline Runtimes](PROVIDERS.md#local-runtimes--offline-servers-28)** | 28 | AIPlug Mock Transport, Ollama, LM Studio, vLLM, llama.cpp, LocalAI, Jan |
| **[Search & Web Retrieval](PROVIDERS.md#search--web-retrieval-apis-19)** | 19 | Perplexity, Exa Search, Tavily, Jina Reader, Serper, Firecrawl |
| **[Audio, STT & TTS](PROVIDERS.md#audio-speech-to-text--text-to-speech-15)** | 15 | ElevenLabs, Gladia, PlayHT, Speechmatics, Fish Audio, Rev.ai |
| **[Image & Video Generation](PROVIDERS.md#image--video-generation-20)** | 20 | RunwayML, Luma, Ideogram, Leonardo, Recraft, Haiper, Fal.ai |
| **[Dedicated Embeddings & Vector](PROVIDERS.md#dedicated-embeddings--vector-providers-5)** | 5 | Pinecone, Voyage AI, Mixedbread, Nomic |
| **[OAuth & Cloud Platforms](PROVIDERS.md#oauth--developer-platforms-22)** | 22 | GitHub Copilot, Databricks, Vertex Partner, Watsonx |
| **[Free & Community Endpoints](PROVIDERS.md#free--no-auth-endpoints-10)** | 10 | Pollinations, FreeInference, DuckDuckGo, FreeAI |

### Searching Providers Dynamically

You don't need to manually cross-reference base URLs or env vars. AIPlug includes instant in-memory provider search across the entire registry:

```typescript
import { AIPlug, searchProviders } from 'aiplug';

// Search in-memory by name, keyword, or category
const results = searchProviders('groq');
// => [{ slug: 'groq', name: 'Groq', category: 'IaaS', defaultBaseURL: 'https://api.groq.com/openai/v1', ... }]
```

Via the CLI:
```bash
aiplug transport list            # browse configured + active providers
aiplug models                    # list live models from the upstream provider
```

Via the HTTP API Gateway:
```bash
curl http://localhost:3711/v1/providers/search?q=cerebras
```

## How it works

### Custom adapters (native wire format)

- **`anthropic`** — Anthropic Messages API + SSE streaming, `x-api-key` header, system message hoisting, `max_tokens` required, `tool_use` blocks mapped to `ToolCall`.
- **`gemini`** — Google AI Studio native API + SSE, `contents[].parts[]` blocks, `systemInstruction` field, function calling via `tools[].functionDeclarations`, embeddings via `models/embedContent` (not yet wired).
- **`ollama`** — Ollama native `/api/chat` (NDJSON streaming), `/api/embeddings`, `/api/tags`. No auth header.

### OpenAI-compatible adapter (480+ providers)

Every provider marked ✓ in the [PROVIDERS.md](PROVIDERS.md) directory uses the `openai-compatible` adapter, which speaks the OpenAI Chat Completions wire format (`/v1/chat/completions`, `/v1/embeddings`, `/v1/images/generations`, `/v1/audio/speech`, `/v1/audio/transcriptions`, `/v1/models`). Adding a new one is just an entry in `data/registry.json`.

### Lazy loading

Every transport is dynamically `import()`-ed on first use. Nothing is bundled into the core. Add a new entry to `data/registry.json`, drop a folder at `src/providers/<slug>/`, and it works.

## Design principles

`aiplug` is a thin pass-through. The runtime adds **no measurable overhead** to a model request beyond the underlying HTTP call and JSON parsing — no token counting, no retries, no per-request logging, no redaction on the success path, no per-request config re-resolution.

The codebase will not introduce any of the following without a major version bump:

- **Turn or message limits**: You can pass as many turns or messages as the upstream model's context window accepts.
- **Tool call limits or caps**: No limits on the number of tool definitions or emitted tool calls (including parallel tool calls).
- **Autonomous agent loops or recursive retries**: `aiplug` never auto-executes tools or loops on itself. Turn iteration and tool execution loops live entirely in your application.
- **Per-request token counting or rate limiting**
- **Per-request retries** (deliberate — use middleware or wrap the client if needed)
- **Per-request capability re-detection**
- **Per-request logging or telemetry hooks**
- **Per-request redaction or sanitisation of the request body**
- **Per-request config re-resolution**

If you need higher-level orchestration, wrap the client with a higher-level abstraction. They live "one layer up" by design.

<details>
<summary><strong>What runs on the request path</strong> (7 cheap operations, no I/O)</summary>

For a single `ai.chat({ ... })` call:

| Step | Operation | Cost |
|------|-----------|------|
| 1 | `AIPlug.ready()` returns the cached transport instance | 1 truthy check + 1 map lookup |
| 2 | Transport `chat(req, signal)` | one method call |
| 3 | `requireModel(config)` (sync, throws if missing) | 1 string truthy check |
| 4 | `buildBody(req)` builds the request JSON | object literal + `JSON.stringify` |
| 5 | `fetch(url, init)` | the network call (unavoidable) |
| 6 | `await res.json()` | parses the upstream response (unavoidable) |
| 7 | Map response to `ChatResponse` | small object construction |

For streaming, each chunk is decoded once in the transport, then yielded. The `AIPlug.stream` wrapper does a single string comparison per chunk (`chunk.type === 'finish' \|\| chunk.type === 'error'`) to short-circuit on terminal chunks.

**What does NOT run on the hot path** (these exist but never execute on success):

- **Redaction** (`redactString`, `redactSecrets`, `redactHeaders`): only invoked from `makeError` → `AIPlugError` constructor → `buildError`. Triggers only on errors.
- **Capability detection** (`detect()`, `probeCapabilities()`): runs once per transport+baseURL on first call, then cached in-memory.
- **Config loading** (`load()` in `src/config.ts`): runs once at process start. The merged `AiplugConfig` is frozen in `freezeConfig()` and held by the `AIPlug` instance for its lifetime.
- **Registry parsing** (`getRegistry()`, `validateRegistry()`): reads and parses `data/registry.json` once. Cached at module level.
- **Dynamic `import()` of transport modules**: Node's loader caches the resolved module. After the first import for a given URL, it's a single map lookup.

</details>

<details>
<summary><strong>Adding new code that touches the hot path</strong> (contributor checklist)</summary>

If you need to add logic to `Transport.chat()`, `Transport.stream()`, or any provider's request builder:

1. State the cost in the PR description (e.g. "adds ~50 ns of regex matching per request").
2. Avoid regex that compiles on every call. Hoist patterns to module scope.
3. Avoid logging on the success path. Errors get full logging; success is silent.
4. Avoid synchronous I/O. The hot path must not touch the filesystem, network (other than the upstream call), or env vars.
5. Keep allocations small. A single object literal per request is fine; allocating per chunk in a stream is not.

A test that asserts request shape (`vi.stubGlobal('fetch', stub)`) is required for any new transport method.

</details>

## Configuration

Precedence (highest wins):

1. **CLI flags** — `--transport=openai --model=gpt-4o --api-key=xyz`
2. **Env vars** — `AIPLUG_TRANSPORT`, `AIPLUG_API_KEY`, `AIPLUG_MODEL`, `AIPLUG_BASE_URL`, `AIPLUG_PROFILE`, `AIPLUG_CAPABILITIES`, `AIPLUG_TIMEOUT_MS`
3. **Project file** — `./aiplug.config.json` (or `.yaml`)
4. **Global file** — `~/.config/aiplug/config.json` (or `.yaml`)
5. **Hardcoded defaults**

Example config file:

```jsonc
{
  "active": "anthropic",
  "transports": {
    "anthropic": { "apiKey": "${ANTHROPIC_API_KEY}", "model": "claude-3-5-sonnet-latest" },
    "openai":    { "apiKey": "${OPENAI_API_KEY}",    "model": "gpt-4o" },
    "ollama":    { "baseURL": "http://localhost:11434", "model": "llama3.2" }
  },
  "profiles": {
    "fast":    { "transport": "openai",    "model": "gpt-4o-mini" },
    "private": { "transport": "ollama",    "model": "llama3.2" }
  }
}
```

`${ENV_VAR}` substitution happens at load time. Secrets never appear in error messages or logs.

## Error model

```ts
class AIPlugError extends Error {
  code: 'AUTH_INVALID' | 'AUTH_MISSING' | 'MODEL_NOT_FOUND' | 'RATE_LIMITED'
       | 'NETWORK_TIMEOUT' | 'REQUEST_ABORTED' | 'INVALID_CONFIGURATION'
       | 'TRANSPORT_UNAVAILABLE' | 'UNSUPPORTED_CAPABILITY' | 'INVALID_RESPONSE'
       | 'STREAM_ERROR';
  transport: string;
  status?: number;
  retryable: boolean;
  details?: unknown;
  cause?: unknown;
}
```

`makeError({...})` maps HTTP status to code when no explicit `code` is given. Every API key, bearer token, and cookie is stripped from `message` and `details` before the error is constructed.

## Adding a new provider

```bash
cp -r src/providers/_template src/providers/myprovider
```

Then edit:
- `src/providers/myprovider/capabilities.ts` — capability list + auth scheme
- `src/providers/myprovider/index.ts` — implement the 9 Transport methods
- `src/providers/myprovider/README.md` — auth + sync notes

Add an entry to `data/registry.json` (or run `python3 scripts/build-registry.py` after editing `data/providers.json`):

```json
"myprovider": {
  "module": "./myprovider/index.js",
  "class": "MyProviderTransport",
  "defaultBaseURL": "https://api.myprovider.com/v1",
  "auth": "bearer",
  "authHeader": "Authorization",
  "displayName": "My Provider"
}
```

Run `npm test` and you're done. The next `aiplug transport add myprovider` works.

## Repository layout

```
src/
  types.ts              # every public type
  errors.ts             # AIPlugError + factory + secret redaction
  transport.ts          # abstract Transport + helpers
  client.ts             # public AIPlug client
  config.ts             # precedence loader + profile resolution
  streaming.ts          # SSE + NDJSON normalisers
  capabilities.ts       # capability detector with caching
  registry.ts           # lazy transport loader
  index.ts              # public barrel
  providers/            # one folder per provider
    _template/          # boilerplate new providers copy from
    openai/             # OpenAI Chat Completions + embeddings + images + audio
    openai-compatible/  # any server speaking OpenAI wire format
    anthropic/          # Anthropic Messages API + SSE
    gemini/             # Google AI Studio native API + SSE
    ollama/             # local-first HTTP + NDJSON streaming
  cli/                  # CLI entrypoint + per-command files
  server/               # OpenAI-compatible HTTP server

data/
  registry.json         # generated, versioned transport metadata (930+ routes)
  registry.meta.json    # UI labels, popular models, categories, websites
  providers.json        # canonical catalog of 490+ AI providers

tests/                  # Node test runner regression tests
scripts/                # smoke + e2e + build-registry scripts
```

## Testing

```bash
npm run typecheck   # tsc --noEmit, strict + exactOptionalPropertyTypes
npm run smoke       # import smoke
npm test            # 27 unit tests (transports, streamText, fallback, mock, introspection)
npm run smoke:e2e   # boot the server, hit every endpoint, verify shapes
```

## Runtime requirements

- Node.js ≥ 18.17 (native `fetch`, native `Web Streams`).
- TypeScript ≥ 5.7 with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- One runtime dependency: `yaml` (≈ 80 kB).

## Sponsors & Support

`aiplug` is open-source software built to eliminate vendor lock-in and keep LLM tooling lightweight, transparent, and blazingly fast.

If you find `aiplug` useful for your projects or organization, please consider:
- ⭐ **Starring the repository** on GitHub.
- 💖 **Sponsoring the project** to support ongoing maintenance and new provider adapters.
- 📢 **Sharing your experience** and letting us know what integrations you'd like to see.

## Contributing

Contributions are warmly welcomed!

- **Adding a provider:** Follow the [Adding a new provider](#adding-a-new-provider) guide.
- **Reporting issues & bugs:** Open an issue on GitHub with reproduction steps.
- **Submitting pull requests:** Ensure `npm run typecheck` and `npm test` pass with 0 errors before opening a PR.

## License

MIT License