/**
 * OpenAI provider — Chat Completions + embeddings + images + audio TTS/STT.
 *
 * Endpoint reference: https://platform.openai.com/docs/api-reference
 *
 * Wire format: standard OpenAI JSON. The `openai-compatible` generic
 * transport inherits from this class so any OpenAI-shaped server works
 * out of the box (Together, Groq, OpenRouter, etc.).
 */

import { Transport, requireApiKey, requireModel } from '../../transport.js';
import { makeError } from '../../errors.js';
import { buildRequestInit, wrapFetchError, codeForStatus } from '../_shared.js';
import type {
  AudioRequest,
  AudioResponse,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  EmbeddingsRequest,
  EmbeddingsResponse,
  HealthInfo,
  ImageRequest,
  ImageResponse,
  ModelInfo,
  StreamChunk,
  ToolCall,
  TranscriptionRequest,
  TranscriptionResponse,
  Usage,
} from '../../types.js';
import type { OpenAIProviderConfig } from './capabilities.js';
import { METADATA, CAPABILITIES } from './capabilities.js';

interface OpenAITool {
  type: 'function';
  function: { name: string; description?: string; parameters: unknown };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAIChatResponse {
  id?: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
      refusal?: string | null;
    };
    finish_reason: string | null;
  }>;
  usage?: OpenAIStreamUsage;
}

interface OpenAIStreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string | null;
    /**
     * MiniMax puts reasoning into a separate `reasoning_content` field
     * when `reasoning_split: true` is sent. OpenAI proper does not emit
     * this; the field is here for OpenAI-compatible servers that follow
     * the same shape (DeepSeek R1, GLM-Z1, MiniMax M3, Moonshot Kimi).
     */
    reasoning_content?: string | null;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: 'function';
      function?: { name?: string; arguments?: string };
    }>;
  };
  finish_reason?: string | null;
}

/**
 * OpenAI stream usage chunk. Anthropic/Bedrock/MiniMax/MoE providers may
 * emit additional cache token counts under `prompt_tokens_details` /
 * `completion_tokens_details`. The base fields are always present on
 * OpenAI proper; the details blocks are optional and provider-specific.
 */
interface OpenAIStreamUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** OpenAI: `{ cached_tokens: number }`. Anthropic/Bedrock/MiniMax may use other shapes. */
  prompt_tokens_details?: { cached_tokens?: number; cache_read_input_tokens?: number };
  /** Anthropic/Bedrock cache creation; MiniMax cache writes; etc. */
  cache_creation_input_tokens?: number;
  /** Some providers emit reasoning tokens here. */
  completion_tokens_details?: { reasoning_tokens?: number };
}

interface OpenAIStreamChunk {
  id?: string;
  model: string;
  choices: OpenAIStreamChoice[];
  usage?: OpenAIStreamUsage;
}

function toolCallArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return { _raw: raw };
}

function mapUsage(u: OpenAIChatResponse['usage'] | OpenAIStreamChunk['usage']): Usage | undefined {
  if (!u) return undefined;
  const usage: Usage = {};
  if (u.prompt_tokens !== undefined) usage.promptTokens = u.prompt_tokens;
  if (u.completion_tokens !== undefined) usage.completionTokens = u.completion_tokens;
  if (u.total_tokens !== undefined) usage.totalTokens = u.total_tokens;
  // Cache token counts. OpenAI emits these under
  // prompt_tokens_details.cached_tokens; Anthropic/Bedrock/MiniMax also
  // surface cache creation under a separate top-level field.
  const cachedRead =
    u.prompt_tokens_details?.cached_tokens ??
    u.prompt_tokens_details?.cache_read_input_tokens;
  if (typeof cachedRead === 'number') usage.cacheReadTokens = cachedRead;
  if (typeof u.cache_creation_input_tokens === 'number') {
    usage.cacheWriteTokens = u.cache_creation_input_tokens;
  }
  if (typeof u.completion_tokens_details?.reasoning_tokens === 'number') {
    usage.reasoningTokens = u.completion_tokens_details.reasoning_tokens;
  }
  return usage;
}

export class OpenAITransport extends Transport {
  private readonly organization: string | undefined;

  constructor(config: OpenAIProviderConfig) {
    super(config, METADATA);
    this.organization = (config as { organization?: string }).organization;
  }

  protected get baseURL(): string {
    return this.config.baseURL ?? 'https://api.openai.com/v1';
  }

  protected get authHeaders(): Record<string, string> {
    const key = requireApiKey(this.config, 'bearer');
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    if (this.organization) headers['OpenAI-Organization'] = this.organization;
    return headers;
  }

  protected buildBody(req: ChatRequest): Record<string, unknown> {
    const messages = req.messages.map((m: ChatMessage) => {
      const base: Record<string, unknown> = { role: m.role, content: m.content };
      if (m.name !== undefined) base['name'] = m.name;
      if (m.toolCallId !== undefined) base['tool_call_id'] = m.toolCallId;
      if (m.toolCalls && m.toolCalls.length > 0) {
        base['tool_calls'] = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        }));
      }
      return base;
    });

    const body: Record<string, unknown> = { model: req.model, messages };

    if (req.sampling?.temperature !== undefined) body['temperature'] = req.sampling.temperature;
    if (req.sampling?.topP !== undefined) body['top_p'] = req.sampling.topP;
    if (req.sampling?.maxTokens !== undefined) body['max_tokens'] = req.sampling.maxTokens;
    if (req.sampling?.stop !== undefined) body['stop'] = req.sampling.stop;
    if (req.sampling?.presencePenalty !== undefined) body['presence_penalty'] = req.sampling.presencePenalty;
    if (req.sampling?.frequencyPenalty !== undefined) body['frequency_penalty'] = req.sampling.frequencyPenalty;
    if (req.sampling?.seed !== undefined) body['seed'] = req.sampling.seed;

    if (req.tools && req.tools.length > 0) {
      body['tools'] = req.tools.map<OpenAITool>((t) => {
        const tool: OpenAITool = {
          type: 'function',
          function: { name: t.name, parameters: t.parameters },
        };
        if (t.description !== undefined) tool.function.description = t.description;
        return tool;
      });
      if (req.toolChoice !== undefined) body['tool_choice'] = req.toolChoice;
    }

    if (req.providerOptions) Object.assign(body, req.providerOptions);
    return body;
  }

  protected async postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const headers = { ...this.authHeaders, 'content-type': 'application/json', ...this.config.headers };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'POST', headers, body: JSON.stringify(body), signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      const text = await res.text();
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `OpenAI ${path} failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    return (await res.json()) as T;
  }

  protected async getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const headers = { ...this.authHeaders, ...this.config.headers };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'GET', headers, signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      const text = await res.text();
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `OpenAI ${path} failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    return (await res.json()) as T;
  }

  override async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    requireModel(this.config);
    const body = { ...this.buildBody(req), stream: false };
    const data = await this.postJSON<OpenAIChatResponse>('/chat/completions', body, signal);
    const choice = data.choices?.[0];
    if (!choice) {
      throw makeError({
        code: 'INVALID_RESPONSE',
        transport: METADATA.name,
        message: 'OpenAI chat returned no choices',
        details: { raw: data },
      });
    }
    const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: toolCallArgs(tc.function.arguments),
      rawArguments: tc.function.arguments,
    }));
    const message: ChatMessage = {
      role: 'assistant',
      content: choice.message.content ?? '',
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    };
    const resp: ChatResponse = {
      model: data.model,
      message,
      finishReason: choice.finish_reason ?? 'stop',
      raw: data,
    };
    if (data.id !== undefined) resp.id = data.id;
    const u = mapUsage(data.usage);
    if (u) resp.usage = u;
    return resp;
  }

  override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    requireModel(this.config);
    // OpenAI (and any OpenAI-compatible server) requires an explicit
    // `stream_options.include_usage` flag to surface token counts in the
    // final streaming chunk. Without it the cost-tracker sees zero usage
    // for every streamed turn. The flag is part of the OpenAI streaming
    // spec, so compatible servers (Together, Groq, OpenRouter, DeepSeek,
    // minimax, Moonshot, llama.cpp server, vLLM, …) all honour it.
    const body = {
      ...this.buildBody(req),
      stream: true,
      stream_options: { include_usage: true },
    };
    const url = `${this.baseURL}/chat/completions`;
    const headers = { ...this.authHeaders, 'content-type': 'application/json', ...this.config.headers };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'POST', headers, body: JSON.stringify(body), signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `OpenAI stream failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    // Local SSE parser — OpenAI streams carry tool-call deltas by index
    // which the foundation's generic normaliser doesn't track. We parse the
    // raw `data:` lines ourselves and assemble StreamChunk variants.
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const toolAccumulators = new Map<number, { id: string; name: string; args: string }>();
    let reasoningAcc = '';
    let lastCacheRead = 0;
    let lastCacheWrite = 0;

    try {
      while (true) {
        if (signal?.aborted) {
          throw makeError({
            code: 'REQUEST_ABORTED',
            transport: METADATA.name,
            message: 'Stream aborted by caller',
          });
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sepIdx = buffer.indexOf('\n');
        while (sepIdx !== -1) {
          const rawLine = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 1);
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              for (const tc of toolAccumulators.values()) {
                if (tc.id && tc.name) {
                  yield {
                    type: 'tool-call',
                    toolCall: {
                      id: tc.id,
                      name: tc.name,
                      arguments: toolCallArgs(tc.args),
                      rawArguments: tc.args,
                    },
                  };
                }
              }
              toolAccumulators.clear();
              yield { type: 'finish', reason: 'stop' };
              return;
            }
            let parsed: OpenAIStreamChunk;
            try {
              parsed = JSON.parse(payload) as OpenAIStreamChunk;
            } catch {
              continue;
            }
            const choice = parsed.choices[0];
            if (choice) {
              const delta = choice.delta;
              if (delta.content) yield { type: 'text-delta', delta: delta.content };
              if (delta.reasoning_content) {
                reasoningAcc += delta.reasoning_content;
                yield { type: 'reasoning-delta', delta: delta.reasoning_content, accumulated: reasoningAcc };
              }
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const existing = toolAccumulators.get(tc.index);
                  const merged = {
                    id: tc.id ?? existing?.id ?? `call_${tc.index}`,
                    name: tc.function?.name ?? existing?.name ?? '',
                    args: (existing?.args ?? '') + (tc.function?.arguments ?? ''),
                  };
                  toolAccumulators.set(tc.index, merged);
                  // Surface incremental argument deltas so consumers can
                  // stream-parse partial JSON without waiting for finish.
                  if (tc.function?.arguments) {
                    yield { type: 'tool-call-delta', toolCallId: merged.id, argumentsDelta: tc.function.arguments };
                  }
                }
              }
              if (choice.finish_reason) {
                for (const tc of toolAccumulators.values()) {
                  if (tc.id && tc.name) {
                    yield {
                      type: 'tool-call',
                      toolCall: {
                        id: tc.id,
                        name: tc.name,
                        arguments: toolCallArgs(tc.args),
                        rawArguments: tc.args,
                      },
                    };
                  }
                }
                toolAccumulators.clear();
                const reason = choice.finish_reason === 'tool_calls' ? 'tool_calls' : choice.finish_reason;
                yield { type: 'finish', reason };
                return;
              }
            }
            if (parsed.usage) {
              const u = mapUsage(parsed.usage);
              if (u) {
                // Emit incremental cache events so the chat REPL can
                // surface cache hits/writes as they appear.
                if (typeof u.cacheReadTokens === 'number' && u.cacheReadTokens !== lastCacheRead) {
                  lastCacheRead = u.cacheReadTokens;
                  yield { type: 'cache-read', cacheReadTokens: u.cacheReadTokens, accumulated: u.cacheReadTokens };
                }
                if (typeof u.cacheWriteTokens === 'number' && u.cacheWriteTokens !== lastCacheWrite) {
                  lastCacheWrite = u.cacheWriteTokens;
                  yield { type: 'cache-write', cacheWriteTokens: u.cacheWriteTokens };
                }
                yield { type: 'usage', usage: u };
              }
            }
          }
          sepIdx = buffer.indexOf('\n');
        }
      }
      // Stream ended without [DONE] or finish_reason (network drop, abrupt
      // close). Flush any accumulated tool calls so the consumer still sees
      // them, then emit a finish chunk.
      for (const tc of toolAccumulators.values()) {
        if (tc.id && tc.name) {
          yield {
            type: 'tool-call',
            toolCall: {
              id: tc.id,
              name: tc.name,
              arguments: toolCallArgs(tc.args),
              rawArguments: tc.args,
            },
          };
        }
      }
      if (toolAccumulators.size > 0) {
        toolAccumulators.clear();
        yield { type: 'finish', reason: 'error' };
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
    }
  }

  override async embeddings(req: EmbeddingsRequest, signal?: AbortSignal): Promise<EmbeddingsResponse> {
    requireModel(this.config);
    const body = { model: req.model, input: req.input };
    if (req.encodingFormat) (body as Record<string, unknown>)['encoding_format'] = req.encodingFormat;
    interface OpenAIEmbeddingsResp {
      model: string;
      data: Array<{ index: number; embedding: number[] }>;
      usage?: { prompt_tokens?: number; total_tokens?: number };
    }
    const data = await this.postJSON<OpenAIEmbeddingsResp>('/embeddings', body, signal);
    const out: EmbeddingsResponse = {
      model: data.model,
      embeddings: data.data.map((d) => ({ index: d.index, vector: d.embedding })),
      raw: data,
    };
    if (data.usage) {
      const u: { promptTokens?: number; totalTokens?: number } = {};
      if (data.usage.prompt_tokens !== undefined) u.promptTokens = data.usage.prompt_tokens;
      if (data.usage.total_tokens !== undefined) u.totalTokens = data.usage.total_tokens;
      out.usage = u;
    }
    return out;
  }

  override async images(req: ImageRequest, signal?: AbortSignal): Promise<ImageResponse> {
    requireModel(this.config);
    interface OpenAIImageResp {
      created: number;
      data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
    }
    const body: Record<string, unknown> = { model: req.model, prompt: req.prompt };
    if (req.n !== undefined) body['n'] = req.n;
    if (req.size !== undefined) body['size'] = req.size;
    const data = await this.postJSON<OpenAIImageResp>('/images/generations', body, signal);
    const base64 = data.data.map((d) => d.b64_json).filter((x): x is string => Boolean(x));
    const urls = data.data.map((d) => d.url).filter((x): x is string => Boolean(x));
    return {
      model: req.model,
      images: [],
      ...(base64.length > 0 ? { base64 } : {}),
      ...(urls.length > 0 ? { urls } : {}),
      mimeType: 'image/png',
      raw: data,
    };
  }

  override async audio(req: AudioRequest, signal?: AbortSignal): Promise<AudioResponse> {
    requireModel(this.config);
    const body: Record<string, unknown> = { model: req.model, input: req.input, voice: req.voice ?? 'alloy' };
    if (req.format) body['response_format'] = req.format;
    if (req.speed !== undefined) body['speed'] = req.speed;
    const url = `${this.baseURL}/audio/speech`;
    const headers = { ...this.authHeaders, 'content-type': 'application/json', ...this.config.headers };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'POST', headers, body: JSON.stringify(body), signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `OpenAI audio failed: ${res.status}`,
      });
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const out: AudioResponse = {
      model: req.model,
      audio: buf,
      mimeType: res.headers.get('content-type') ?? 'audio/mpeg',
    };
    if (req.format) out.format = req.format;
    return out;
  }

  override async transcription(req: TranscriptionRequest, signal?: AbortSignal): Promise<TranscriptionResponse> {
    requireModel(this.config);
    const form = new FormData();
    form.append('model', req.model);
    const buf = req.audio.buffer.slice(req.audio.byteOffset, req.audio.byteOffset + req.audio.byteLength) as ArrayBuffer;
    const blob = new Blob([buf], { type: req.mimeType ?? 'audio/mpeg' });
    form.append('file', blob, req.filename ?? 'audio.mp3');
    if (req.language) form.append('language', req.language);
    const url = `${this.baseURL}/audio/transcriptions`;
    const headers = { ...this.authHeaders, ...this.config.headers };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'POST', headers, body: form, signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `OpenAI transcription failed: ${res.status}`,
      });
    }
    interface WhisperResp {
      text: string;
      language?: string;
      duration?: number;
      segments?: Array<{ start: number; end: number; text: string }>;
    }
    const data = (await res.json()) as WhisperResp;
    return {
      model: req.model,
      text: data.text,
      ...(data.language !== undefined ? { language: data.language } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.segments !== undefined ? { segments: data.segments } : {}),
      raw: data,
    };
  }

  override async models(signal?: AbortSignal): Promise<ModelInfo[]> {
    interface OpenAIModelsResp {
      data: Array<{ id: string }>;
    }
    const data = await this.getJSON<OpenAIModelsResp>('/models', signal);
    return data.data.map((m) => ({ id: m.id, transport: METADATA.name, capabilities: [...CAPABILITIES] }));
  }

  override async health(signal?: AbortSignal): Promise<HealthInfo> {
    const start = Date.now();
    try {
      await this.models(signal);
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, error: (err as Error).message, latencyMs: Date.now() - start };
    }
  }

  override capabilities() {
    return METADATA;
  }
}