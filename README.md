# AIPlug

A lightweight, dependency-free TypeScript runtime that gives every AI backend one identical face. AIPlug is a **universal transport layer** — point any OpenAI-compatible SDK at AIPlug and switch the underlying provider with one config line.

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3711/v1',
  apiKey: 'whatever',        // AIPlug handles real auth
});

// Now this hits Anthropic, or Ollama, or Groq, or any of 100+ providers
// depending on what you set with `aiplug transport use anthropic`.
```

Built on three principles:

- **Zero runtime dependencies** beyond `yaml` (≈ 80 kB).
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

// Pick a provider two ways:
//   1. Explicit config
const ai = new AIPlug({
  transport: 'anthropic',
  apiKey:    process.env.ANTHROPIC_API_KEY!,
  model:     'claude-3-5-sonnet-latest',
});

//   2. From a profile in aiplug.config.json (CLI > env > file > defaults)
const { config } = loadConfig({}, 'work');
const ai = new AIPlug(config);

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

// Streaming
for await (const chunk of ai.stream({
  model: 'claude-3-5-sonnet-latest',
  messages: [{ role: 'user', content: 'Tell me a story.' }],
})) {
  if (chunk.type === 'text-delta') process.stdout.write(chunk.delta);
  if (chunk.type === 'finish') console.log('\n[done]', chunk.reason);
}

// Other capabilities — same shape across providers
await ai.embeddings({ model: 'text-embedding-3-small', input: 'hello world' });
await ai.images({ model: 'dall-e-3', prompt: 'a robot cat' });
await ai.audio({ model: 'tts-1', input: 'hello world', voice: 'alloy' });
await ai.transcription({ model: 'whisper-1', audio: audioBytes });
await ai.models();           // → ModelInfo[]
await ai.health();           // → { ok, latencyMs? }
ai.capabilities();           // → TransportMetadata (sync)
```

## HTTP server

`aiplug serve` exposes an OpenAI-compatible API on `127.0.0.1:3711` by default:

```
POST /v1/chat/completions      # OpenAI Chat Completions; SSE when stream=true
POST /v1/responses             # alias for /v1/chat/completions
POST /v1/embeddings
POST /v1/images/generations
POST /v1/audio/speech
POST /v1/audio/transcriptions  # multipart
GET  /v1/models
GET  /healthz
```

**Works with every OpenAI client SDK on the planet** (Python `openai`, JS `openai`, Go `openai-go`, etc.) by setting `baseURL: http://localhost:3711/v1`.

Use `--port=0` for ephemeral ports (useful in tests).

## Embedding AIPlug in another project

`AIPlug` and the typed public surface (`AIPlug`, `Transport`, `ChatMessage`, `ToolCall`, …) are the canonical types an embedding project should consume. The package has zero third-party runtime dependencies, ships as ESM, and exposes its full shape via `import { … } from 'aiplug'`. Memoryblock and any other host should treat aiplug as the source of truth for adapter implementations.

### `LLMAdapter` shape (memoryblock-compatible)

For host projects that follow the `LLMAdapter` shape from `@memoryblock/types`, aiplug ships an exact-match façade:

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

`createLLMAdapter` returns an `LLMAdapter` whose `converse` and `converseStream` methods match the canonical memoryblock contract (`LLMMessage`, `TokenUsage`, `StopReason`). The re-exported types `LLMMessage`, `LLMResponse`, `LLMAdapterToolDefinition`, `TokenUsage`, `StopReason` are pure aliases of the same names so user code compiles unchanged.

## Stream protocol

`AIPlug.stream()` yields a discriminated union of `StreamChunk` variants. Adapters downstream (memoryblock, custom agents, scripts) consume this shape regardless of the underlying provider. The wire format is provider-specific; the chunk shape is uniform.

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

### Multimodal content

`ChatMessage.content` is `string | ContentPart[]`. Each `ContentPart` carries an optional `cacheControl` marker that maps to the provider-native equivalent (`cache_control: { type: 'ephemeral' }` on Anthropic/Bedrock, server-side prefix cache on OpenAI).

```typescript
await ai.chat({
  model: 'MiniMax-M3',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      { type: 'image_url', imageUrl: { url: 'https://…/photo.jpg', detail: 'high' } },
    ],
  }],
});
```

The transport serialises content parts into the provider's wire format. Providers that do not support a given part type silently drop it from the text view via the `extractText` helper; if you need to gate multimodal inputs at the application boundary, use `transport.capabilities()` to check before sending.

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

## Embedding aiplug in memoryblock

`aiplug` stays an independent package — memoryblock's `@memoryblock/adapters` package wraps it so the rest of memoryblock stays provider-agnostic.

### Pass-through pattern

Replace the per-provider classes in `packages/adapters/src/{openai,anthropic,gemini,bedrock}/index.ts` with a thin pass-through:

```typescript
// before — packages/adapters/src/openai/index.ts
export class OpenAIAdapter implements LLMAdapter {
  constructor(config) { /* ~50 lines of field mapping */ }
  async converse(messages, tools) { /* hand-written HTTP + JSON */ }
  async converseStream(messages, tools, onChunk) { /* SSE parsing */ }
}

// after
import { createLLMAdapter } from 'aiplug';

export class OpenAIAdapter {
  private inner: LLMAdapter;
  constructor(config) {
    this.inner = createLLMAdapter({
      provider: 'openai',
      model: config.model,
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: config.baseURL,
    });
  }
  get provider() { return this.inner.provider; }
  get model() { return this.inner.model; }
  converse = this.inner.converse.bind(this.inner);
  converseStream = this.inner.converseStream?.bind(this.inner);
}
```

The class names stay so existing imports in `packages/memoryblock` and the `init` / `start` commands keep working. The hand-written HTTP and JSON parsing go away.

### Provider name mapping

Memoryblock's `block.config.json` continues to declare `adapter.provider`. Map it to aiplug's transport slug:

| memoryblock `provider` | aiplug transport slug |
|------------------------|-----------------------|
| `bedrock` | `bedrock-aws` (SigV4 Converse) |
| `openai` | `openai` |
| `anthropic` | `anthropic` |
| `gemini` | `google-ai-studio` (native adapter) |
| `ollama` | `ollama` |

The capability matrix exposed by `transport.capabilities()` is the signal memoryblock should consult when deciding whether to gate vision / tool / streaming support per-block, rather than the provider-name string match alone.

### Streaming integration

`converseStream` keeps the existing `onChunk(text)` callback contract, so the `Monitor` engine does not need to change. When aiplug emits a `reasoning-delta`, the wrapper can either drop it (current behaviour — reasoning is invisible) or forward it as a separate notification so memoryblock can log it. Recommendation: log reasoning to `logs/<date>.log` keyed by `blockName + turnId`, keep the user-visible stream text-only. Reasoning never reaches the chat channel.

### Adding a new provider

When memoryblock needs a provider aiplug does not yet ship:

1. Add the provider to `data/providers.json`, or write a custom adapter under `aiplug/src/providers/<slug>/` with `@aiplug:keep`.
2. Run `npm run build:registry` in the aiplug package.
3. Map the provider name in `packages/adapters/src/index.ts` to the new aiplug transport slug.
4. Update memoryblock's `init.ts` provider list.

No memoryblock core changes required.

## Supported providers (100+ entries)

The full registry lives in [`data/registry.json`](data/registry.json) and is generated from [`data/providers.json`](data/providers.json) (synced from [foisalislambd/all-llm-provider-list](https://github.com/foisalislambd/all-llm-provider-list)).

### Frontier (18)

| Slug | Name | Base URL | Env var | OpenAI-shaped |
|------|------|----------|---------|---------------|
| `openai` | OpenAI | `https://api.openai.com/v1` | `OPENAI_API_KEY` | ✓ |
| `anthropic` | Anthropic | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` | ✗ |
| `google-ai-studio` | Google AI Studio | `https://generativelanguage.googleapis.com` | `GEMINI_API_KEY` | ✓ |
| `gemini` | Gemini (native adapter) | `https://generativelanguage.googleapis.com` | `GEMINI_API_KEY` | ✗ |
| `xai` | xAI (Grok) | `https://api.x.ai/v1` | `XAI_API_KEY` | ✓ |
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `DEEPSEEK_API_KEY` | ✓ |
| `mistral` | Mistral AI | `https://api.mistral.ai/v1` | `MISTRAL_API_KEY` | ✓ |
| `cohere` | Cohere | `https://api.cohere.com/v2` | `COHERE_API_KEY` | ✗ |
| `perplexity` | Perplexity | `https://api.perplexity.ai` | `PERPLEXITY_API_KEY` | ✓ |
| `ai21` | AI21 Labs | `https://api.ai21.com/studio/v1` | `AI21_API_KEY` | ✓ |
| `minimax` | MiniMax | `https://api.minimax.io/v1` | `MINIMAX_API_KEY` | ✓ |
| `reka` | Reka AI | `https://api.reka.ai/v1` | `REKA_API_KEY` | ✓ |
| `baidu-qianfan` | Baidu Qianfan | `https://api.baiduqianfan.ai/v1` | `QIANFAN_API_KEY` | ✓ |
| `dashscope` | Alibaba DashScope | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` | ✓ |
| `stepfun` | StepFun | `https://api.stepfun.com/v1` | `STEPFUN_API_KEY` | ✓ |
| `zhipu` | Z.ai (Zhipu AI) | `https://open.bigmodel.cn/api/paas/v4/` | `ZHIPU_API_KEY` | ✓ |
| `upstage` | Upstage | `https://api.upstage.ai/v1/solar` | `UPSTAGE_API_KEY` | ✓ |
| `xiaomi` | Xiaomi | Custom endpoint | — | ✗ |
| `inflection` | Inflection | Custom webhooks | — | ✗ |

### Aggregator (6)

| Slug | Name | Base URL | Env var | OpenAI-shaped |
|------|------|----------|---------|---------------|
| `openrouter` | OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | ✓ |
| `litellm` | LiteLLM | `http://localhost:4000/v1` | `LITELLM_MASTER_KEY` | ✓ |
| `portkey` | Portkey | `https://api.portkey.ai/v1` | `PORTKEY_API_KEY` | ✓ |
| `302-ai` | 302.AI | `https://api.302.ai/v1` | `302AI_API_KEY` | ✓ |
| `aimlapi` | AIMLAPI | `https://api.aimlapi.com/v1` | `AIMLAPI_API_KEY` | ✓ |
| `coze` | Coze (ByteDance) | `https://api.coze.com/v1` | `COZE_API_KEY` | ✓ |
| `frogbot` | FrogBot | `https://app.frogbot.ai/api` | `FROGBOT_API_KEY` | ✓ |
| `lemondata` | LemonData | `https://api.lemondata.ai/v1` | `LEMONDATA_API_KEY` | ✓ |
| `eden-ai` | Eden AI | `https://api.edenai.co/v2` | `EDENAI_API_KEY` | ✗ |

### IaaS / GPU clouds (27)

| Slug | Name | Base URL |
|------|------|----------|
| `groq` | Groq | `https://api.groq.com/openai/v1` |
| `cerebras` | Cerebras | `https://api.cerebras.ai/v1` |
| `sambanova` | SambaNova | `https://api.sambanova.ai/v1` |
| `fireworks` | Fireworks AI | `https://api.fireworks.ai/inference/v1` |
| `together` | Together AI | `https://api.together.xyz/v1` |
| `deepinfra` | DeepInfra | `https://api.deepinfra.com/v1/openai` |
| `huggingface` | HuggingFace Inference | `https://router.huggingface.co/v1` |
| `nvidia-nim` | NVIDIA NIM | `https://integrate.api.nvidia.com/v1` |
| `nebius` | Nebius AI Studio | `https://api.studio.nebius.ai/v1` |
| `novita` | Novita | `https://api.novita.ai/openai/v1` |
| `anyscale` | Anyscale Endpoints | `https://api.endpoints.anyscale.com/v1` |
| `arcee` | Arcee AI | `https://conductor.arcee.ai/v1` |
| `friendli` | Friendli | `https://api.friendli.ai/serverless/v1` |
| `glhf` | Glhf.chat | `https://glhf.chat/api/openai/v1` |
| `hyperbolic` | Hyperbolic | `https://api.hyperbolic.xyz/v1` |
| `inception` | Inception | `https://api.inceptionlabs.ai/v1` |
| `inceptron` | Inceptron | Custom endpoint |
| `inference-net` | Inference.net | `https://api.inference.net/v1` |
| `infermatic` | Infermatic | `https://api.totalgpt.ai` |
| `kluster` | Kluster.ai | `https://api.kluster.ai/v1` |
| `lepton` | Lepton AI | `https://api.lepton.ai/v1` |
| `liquid` | Liquid AI | Custom cluster endpoints |
| `mancer` | Mancer | `https://mancer.tech/oai/v1` |
| `morph` | Morph | `https://api.morphllm.com/v1` |
| `siliconflow` | SiliconFlow | `https://api.siliconflow.cn/v1` |
| `replicate` | Replicate | `https://api.replicate.com/v1` |
| `ollama-cloud` | Ollama Cloud | `https://ollama.com/api` |

### Sovereign / Cloud (29)

| Slug | Name | Base URL |
|------|------|----------|
| `bedrock` | Amazon Bedrock | `https://bedrock-runtime.<region>.amazonaws.com` |
| `azure-openai` | Azure OpenAI | `https://<resource>.openai.azure.com/openai/v1` |
| `azure-cognitive-services` | Azure Cognitive Services | `https://<resource>.cognitiveservices.azure.com/openai/v1` |
| `vertex-ai` | Google Vertex AI | Region-dependent |
| `cloudflare-workers-ai` | Cloudflare Workers AI | `https://api.cloudflare.com/client/v4/accounts/{id}/ai/v1` |
| `github-models` | GitHub Models | `https://models.inference.ai.azure.com` |
| `github-copilot` | GitHub Copilot | OAuth device flow |
| `gitlab-duo` | GitLab Duo | `https://gitlab.com/api/v4/ai` |
| `digitalocean` | DigitalOcean | `https://inference.do-ai.run/v1/` |
| `scaleway` | Scaleway | `https://api.scaleway.ai/v1` |
| `ovhcloud` | OVHcloud AI | `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` |
| `stackit` | STACKIT AI Model Serving | `https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1` |
| `akashml` | AkashML | `https://api.akashml.com/v1` |
| `atlascloud` | AtlasCloud | `https://api.atlascloud.ai/v1` |
| `baseten` | Baseten | `https://model-{id}.api.baseten.co/v1` |
| `chutes` | Chutes | `https://llm.chutes.ai/v1` |
| `clarifai` | Clarifai | Custom endpoints |
| `gmicloud` | GMICloud | `https://api.gmi-serving.com/v1` |
| `modal` | Modal | `https://<app>.modal.run/v1` |
| `nextbit` | NextBit | `https://api.nextbit256.com/v1` |
| `parasail` | Parasail | `https://api.saas.parasail.io/v1` |
| `phala` | Phala | `POST /v1/chat/completions` |
| `poolside` | Poolside | `https://divers.poolsi.de/openai/v1/` |
| `sap-ai-core` | SAP AI Core | Region-dependent |
| `snowflake-cortex` | Snowflake Cortex | `https://<account>.snowflakecomputing.com/api/v2/cortex/v1` |
| `venice` | Venice | `https://api.venice.ai/api/v1` |
| `wafer` | Wafer | `https://pass.wafer.ai/v1` |
| `io-net` | io.net | `https://api.intelligence.io.solutions/api/v1` |

### Gateway (24)

| Slug | Name | Base URL |
|------|------|----------|
| `vercel-ai-gateway` | Vercel AI Gateway | `https://ai-gateway.vercel.sh/v1` |
| `helicone` | Helicone | `https://ai-gateway.helicone.ai/v1` |
| `cloudflare-ai-gateway` | Cloudflare AI Gateway | `https://gateway.ai.cloudflare.com/v1` |
| `llm-gateway` | LLM Gateway | `https://api.llmgateway.io/v1` |
| `axiom` | Axiom | `https://cloud.axiomstudio.ai/rest/v1/llm-gateway/v1/` |
| `cortecs` | Cortecs | `https://api.cortecs.ai/v1` |
| `kong-ai-gateway` | Kong AI Gateway | Self-hosted / enterprise |
| `moonshot` | Moonshot AI | `https://api.moonshot.ai/v1` |
| `opencode-go` | OpenCode Go | `https://opencode.ai/zen/go/v1` |
| `opencode-zen` | OpenCode Zen | `https://opencode.ai/zen/v1` |
| `opper` | Opper | `https://api.opper.ai/v3/compat` |
| `perceptron` | Perceptron | Custom gateway |
| `prism-api` | Prism API | `https://sub2api.558686.xyz/v1` |
| `relace` | Relace | `https://api.relace.ai/v1` |
| `requesty` | Requesty | `https://router.requesty.ai/v1` |
| `sakana-fugu` | Sakana AI (Fugu) | `https://api.sakana.ai/v1` |
| `switchpoint` | Switchpoint | `https://api.ppq.ai` |
| `unify` | Unify.ai | `https://api.unify.ai/v0` |
| `wandb` | Weights & Biases | Evaluation registry |
| `zenmux` | ZenMux | `https://zenmux.ai/api/v1` |
| `openinference` | OpenInference | Tracing / observability |

### Local runtimes (7)

| Slug | Name | Base URL |
|------|------|----------|
| `ollama` | Ollama | `http://localhost:11434` |
| `llama-cpp` | llama.cpp | `http://localhost:8080/v1` |
| `lm-studio` | LM Studio | `http://localhost:1234/v1` |
| `vllm` | vLLM | `http://localhost:8000/v1` |
| `localai` | LocalAI | `http://localhost:8080/v1` |
| `jan` | Jan.ai | `http://localhost:1337/v1` |
| `atomic-chat` | Atomic Chat | `http://127.0.0.1:1337/v1` |

### Specialized (2)

| Slug | Name | Base URL |
|------|------|----------|
| `nlpcloud` | NLP Cloud | `https://api.nlpcloud.io/v1` |
| `puter` | Puter.js | `https://api.puter.com/ai/chat` |

### Embeddings (1)

| Slug | Name | Base URL |
|------|------|----------|
| `voyage` | Voyage AI | `https://api.voyageai.com/v1` |

## How it works

### Custom adapters (native wire format)

- **`anthropic`** — Anthropic Messages API + SSE streaming, `x-api-key` header, system message hoisting, `max_tokens` required, `tool_use` blocks mapped to `ToolCall`.
- **`gemini`** — Google AI Studio native API + SSE, `contents[].parts[]` blocks, `systemInstruction` field, function calling via `tools[].functionDeclarations`, embeddings via `models/embedContent` (not yet wired).
- **`ollama`** — Ollama native `/api/chat` (NDJSON streaming), `/api/embeddings`, `/api/tags`. No auth header.

### OpenAI-compatible adapter (98+ providers)

Every provider marked ✓ in the tables above uses the `openai-compatible` adapter, which speaks the OpenAI Chat Completions wire format (`/v1/chat/completions`, `/v1/embeddings`, `/v1/images/generations`, `/v1/audio/speech`, `/v1/audio/transcriptions`, `/v1/models`). Adding a new one is just an entry in `data/registry.json`.

### Lazy loading

Every transport is dynamically `import()`-ed on first use. Nothing is bundled into the core. Add a new entry to `data/registry.json`, drop a folder at `src/providers/<slug>/`, and it works.

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
  registry.json         # generated, versioned transport metadata (266 entries)
  providers.json        # synced from foisalislambd/all-llm-provider-list

tests/                  # Node test runner regression tests
scripts/                # smoke + e2e + build-registry scripts
```

## Testing

```bash
npm run typecheck   # tsc --noEmit, strict + exactOptionalPropertyTypes
npm run smoke       # import smoke
npm run smoke:e2e   # boot the server, hit every endpoint, verify shapes
```

## Runtime requirements

- Node.js ≥ 18.17 (native `fetch`, native `Web Streams`).
- TypeScript ≥ 5.7 with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- One runtime dependency: `yaml` (≈ 80 kB).