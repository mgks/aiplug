/**
 * Anthropic provider — Messages API + SSE streaming.
 *
 * Reference: https://docs.anthropic.com/en/api/messages
 *
 * Key differences from the OpenAI wire format:
 *   - Auth header is `x-api-key`, not `Authorization: Bearer`.
 *   - System messages are hoisted to a top-level `system` field.
 *   - `max_tokens` is required on every request.
 *   - Tool calls are emitted as `content[]` blocks of type `tool_use`.
 *   - Stream events use `message_start` / `content_block_delta` / `message_delta` / `message_stop`.
 */

import { Transport, requireApiKey, requireModel } from '../../transport.js';
import { makeError } from '../../errors.js';
import { buildRequestInit, wrapFetchError, codeForStatus, extractText } from '../_shared.js';
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  HealthInfo,
  ModelInfo,
  StreamChunk,
  ToolCall,
  ToolDefinition,
  Usage,
} from '../../types.js';
import type { AnthropicProviderConfig } from './capabilities.js';
import { METADATA, CAPABILITIES } from './capabilities.js';

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}
interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}
type AnthropicContent = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicChatResponse {
  id?: string;
  model: string;
  content: AnthropicContent[];
  stop_reason: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

interface AnthropicMessageStart {
  type: 'message_start';
  message: { id?: string; model: string };
}
interface AnthropicContentBlockStart {
  type: 'content_block_start';
  index: number;
  content_block: { type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string };
}
interface AnthropicContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta:
    | { type: 'text_delta'; text: string }
    | { type: 'input_json_delta'; partial_json: string };
}
interface AnthropicMessageDelta {
  type: 'message_delta';
  delta: { stop_reason?: string };
}
interface AnthropicContentBlockStop {
  type: 'content_block_stop';
  index: number;
}
interface AnthropicMessageStop {
  type: 'message_stop';
}
type AnthropicStreamEvent =
  | AnthropicMessageStart
  | AnthropicContentBlockStart
  | AnthropicContentBlockDelta
  | AnthropicContentBlockStop
  | AnthropicMessageDelta
  | AnthropicMessageStop;

function mapUsage(u: AnthropicChatResponse['usage']): Usage | undefined {
  if (!u) return undefined;
  const out: Usage = {};
  if (u.input_tokens !== undefined) out.promptTokens = u.input_tokens;
  if (u.output_tokens !== undefined) out.completionTokens = u.output_tokens;
  return out;
}

function mapTools(tools: ToolDefinition[] | undefined): unknown[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

function mapToolChoice(choice: ChatRequest['toolChoice']): unknown | undefined {
  if (!choice) return undefined;
  if (typeof choice === 'string') {
    if (choice === 'auto') return { type: 'auto' };
    if (choice === 'none') return { type: 'none' };
    if (choice === 'required') return { type: 'any' };
  }
  return { type: 'tool', name: choice.name };
}

export class AnthropicTransport extends Transport {
  private readonly apiVersion: string;

  constructor(config: AnthropicProviderConfig) {
    super(config, METADATA);
    this.apiVersion = config.apiVersion ?? '2023-06-01';
  }

  protected get baseURL(): string {
    return this.config.baseURL ?? 'https://api.anthropic.com';
  }

  protected buildBody(req: ChatRequest): Record<string, unknown> {
    const systemParts: string[] = [];
    const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
    for (const m of req.messages) {
      if (m.role === 'system') {
        const text = extractText(m.content);
        if (text) systemParts.push(text);
      } else if (m.role === 'user') {
        messages.push({ role: 'user', content: m.content });
      } else if (m.role === 'assistant') {
        const blocks: AnthropicContent[] = [];
        const text = extractText(m.content);
        if (text) blocks.push({ type: 'text', text });
        if (m.toolCalls) {
          for (const tc of m.toolCalls) {
            blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
          }
        }
        messages.push({ role: 'assistant', content: blocks });
      } else if (m.role === 'tool') {
        const text = extractText(m.content);
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: m.toolCallId,
              content: text,
            },
          ],
        });
      }
    }
    const body: Record<string, unknown> = {
      model: req.model,
      messages,
      max_tokens: req.sampling?.maxTokens ?? 1024,
    };
    if (systemParts.length > 0) body['system'] = systemParts.join('\n\n');
    if (req.sampling?.temperature !== undefined) body['temperature'] = req.sampling.temperature;
    if (req.sampling?.topP !== undefined) body['top_p'] = req.sampling.topP;
    if (req.sampling?.stop !== undefined) body['stop_sequences'] = req.sampling.stop;
    const tools = mapTools(req.tools);
    if (tools) body['tools'] = tools;
    const toolChoice = mapToolChoice(req.toolChoice);
    if (toolChoice) body['tool_choice'] = toolChoice;
    if (req.providerOptions) Object.assign(body, req.providerOptions);
    return body;
  }

  protected async postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const key = requireApiKey(this.config, 'x-api-key');
    const url = `${this.baseURL}${path}`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': this.apiVersion,
      ...this.config.headers,
    };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'POST', headers, body: JSON.stringify(body), signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      const text = await res.text();
      // Anthropic 529 (overloaded) is retryable RATE_LIMITED.
      const code = res.status === 529
        ? 'RATE_LIMITED'
        : codeForStatus(res.status);
      throw makeError({
        code,
        transport: METADATA.name,
        status: res.status,
        message: `Anthropic ${path} failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    return (await res.json()) as T;
  }

  override async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    requireModel(this.config);
    if (req.sampling?.maxTokens === 0) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: METADATA.name,
        message: 'Anthropic requires max_tokens > 0',
      });
    }
    const body = this.buildBody(req);
    const data = await this.postJSON<AnthropicChatResponse>('/v1/messages', body, signal);
    const text = data.content.filter((b): b is AnthropicTextBlock => b.type === 'text').map((b) => b.text).join('');
    const toolCalls: ToolCall[] | undefined = data.content
      .filter((b): b is AnthropicToolUseBlock => b.type === 'tool_use')
      .map((b) => ({
        id: b.id,
        name: b.name,
        arguments: b.input,
      }));
    const message: ChatMessage = {
      role: 'assistant',
      content: text,
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    };
    const resp: ChatResponse = {
      model: data.model,
      message,
      finishReason: data.stop_reason ?? 'stop',
      raw: data,
    };
    if (data.id !== undefined) resp.id = data.id;
    const u = mapUsage(data.usage);
    if (u) resp.usage = u;
    return resp;
  }

  override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    requireModel(this.config);
    const body = { ...this.buildBody(req), stream: true };
    const key = requireApiKey(this.config, 'x-api-key');
    const url = `${this.baseURL}/v1/messages`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': this.apiVersion,
      ...this.config.headers,
    };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'POST', headers, body: JSON.stringify(body), signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      const code = res.status === 429 || res.status === 529 ? 'RATE_LIMITED' : codeForStatus(res.status);
      throw makeError({
        code,
        transport: METADATA.name,
        status: res.status,
        message: `Anthropic stream failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    // `initialInput` holds the object Anthropic may send in content_block_start.
    // `args` holds raw JSON-fragment deltas to be concatenated. The final
    // arguments are `{ ...initialInput, <parsed deltas> }`.
    const toolInputs = new Map<number, { id: string; name: string; initialInput: Record<string, unknown> | undefined; args: string; hasDeltas: boolean }>();

    try {
      while (true) {
        if (signal?.aborted) {
          throw makeError({ code: 'REQUEST_ABORTED', transport: METADATA.name, message: 'Stream aborted by caller' });
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nlIdx = buffer.indexOf('\n');
        while (nlIdx !== -1) {
          const rawLine = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (!payload) {
              nlIdx = buffer.indexOf('\n');
              continue;
            }
            let evt: AnthropicStreamEvent;
            try {
              evt = JSON.parse(payload) as AnthropicStreamEvent;
            } catch {
              nlIdx = buffer.indexOf('\n');
              continue;
            }
            if (evt.type === 'content_block_start') {
              if (evt.content_block.type === 'tool_use') {
                toolInputs.set(evt.index, {
                  id: evt.content_block.id ?? `call_${evt.index}`,
                  name: evt.content_block.name ?? '',
                  initialInput: evt.content_block.input,
                  args: '',
                  hasDeltas: false,
                });
              }
            } else if (evt.type === 'content_block_delta') {
              if (evt.delta.type === 'text_delta') {
                yield { type: 'text-delta', delta: evt.delta.text };
              } else if (evt.delta.type === 'input_json_delta') {
                const existing = toolInputs.get(evt.index);
                if (existing) {
                  existing.args += evt.delta.partial_json;
                  existing.hasDeltas = true;
                  toolInputs.set(evt.index, existing);
                }
              }
            } else if (evt.type === 'content_block_stop') {
              const tc = toolInputs.get(evt.index);
              if (tc && tc.id && tc.name) {
                let parsedArgs: Record<string, unknown> = tc.initialInput ?? {};
                let rawArgs = '';
                if (tc.hasDeltas) {
                  rawArgs = tc.args;
                  try {
                    const parsed: unknown = JSON.parse(tc.args);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      parsedArgs = { ...parsedArgs, ...(parsed as Record<string, unknown>) };
                    }
                  } catch {
                    parsedArgs = { ...parsedArgs, _raw: tc.args };
                  }
                }
                yield {
                  type: 'tool-call',
                  toolCall: { id: tc.id, name: tc.name, arguments: parsedArgs, rawArguments: rawArgs },
                };
                toolInputs.delete(evt.index);
              }
            } else if (evt.type === 'message_delta') {
              if (evt.delta.stop_reason) {
                yield {
                  type: 'finish',
                  reason:
                    evt.delta.stop_reason === 'tool_use' ? 'tool_calls' : evt.delta.stop_reason,
                };
                return;
              }
            } else if (evt.type === 'message_stop') {
              yield { type: 'finish', reason: 'stop' };
              return;
            }
          }
          nlIdx = buffer.indexOf('\n');
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
    }
  }

  override async embeddings(): Promise<never> {
    throw makeError({
      code: 'UNSUPPORTED_CAPABILITY',
      transport: METADATA.name,
      message: 'Anthropic does not provide embeddings',
    });
  }

  override async images(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Anthropic does not provide image generation' });
  }

  override async audio(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Anthropic does not provide text-to-speech' });
  }

  override async transcription(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Anthropic does not provide speech-to-text' });
  }

  override async models(signal?: AbortSignal): Promise<ModelInfo[]> {
    // Anthropic has no public /models endpoint; return a static curated list.
    return [
      { id: 'claude-opus-4-0', transport: METADATA.name, capabilities: [...CAPABILITIES] },
      { id: 'claude-sonnet-4-0', transport: METADATA.name, capabilities: [...CAPABILITIES] },
      { id: 'claude-3-7-sonnet-latest', transport: METADATA.name, capabilities: [...CAPABILITIES] },
      { id: 'claude-3-5-sonnet-latest', transport: METADATA.name, capabilities: [...CAPABILITIES] },
      { id: 'claude-3-5-haiku-latest', transport: METADATA.name, capabilities: [...CAPABILITIES] },
      { id: 'claude-3-opus-latest', transport: METADATA.name, capabilities: [...CAPABILITIES] },
    ];
  }

  override async health(signal?: AbortSignal): Promise<HealthInfo> {
    // Use a tiny non-streaming messages call to probe.
    const start = Date.now();
    try {
      await this.chat(
        {
          model: 'claude-3-5-haiku-latest',
          messages: [{ role: 'user', content: 'ping' }],
          sampling: { maxTokens: 1 },
        },
        signal,
      );
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      const e = err as { code?: string; message?: string };
      // 401 still proves the endpoint is reachable.
      if (e.code === 'AUTH_INVALID') return { ok: true, latencyMs: Date.now() - start };
      return { ok: false, error: e.message ?? 'health check failed', latencyMs: Date.now() - start };
    }
  }

  override capabilities() {
    return METADATA;
  }
}