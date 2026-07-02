/**
 * `LLMAdapter` — the canonical adapter shape every consumer of aiplug
 * should target (memoryblock, custom agents, scripts, …).
 *
 * This shape is provider-agnostic and intentionally aligns with the
 * `LLMAdapter` interface previously defined in memoryblock's
 * `@memoryblock/types`. Embedders that migrate to aiplug can keep the
 * same `LLMMessage`, `ToolDefinition`, and `LLMResponse` types.
 *
 * Two implementations ship in this file:
 *   - `createLLMAdapter(config)` builds a fully-typed adapter backed by
 *     `AIPlug` for any transport the registry knows about.
 *   - `AIPlug#converse(...)` and `AIPlug#converseStream(...)` are sugar
 *     for hosts that only have an AIPlug instance.
 *
 * The adapter does NOT add new responsibilities — it is purely a thin
 * translation layer between the memoryblock-style message shape and
 * AIPlug's own `ChatMessage` / `ChatResponse` shapes.
 *
 * NOTE: declared here rather than in `client.ts` to keep `client.ts`
 * provider-agnostic; the LLMAdapter shape is intended for embedding
 * use cases, not for the core runtime path.
 */

import { AIPlug, type AIPlugOptions } from './client.js';
import type {
  ChatMessage,
  StreamChunk,
  ToolDefinition as AIPlugToolDefinition,
  ToolCall as AIPlugToolCall,
} from './types.js';

/* ---------------------------------------------------------------------------
 * Public types — the LLMAdapter contract
 * ------------------------------------------------------------------------- */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMMessage {
  role: MessageRole;
  content?: string;
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  toolResults?: Array<{ toolCallId: string; name: string; content: string; isError?: boolean }>;
}

export interface LLMAdapterToolDefinition {
  name: string;
  description: string;
  /** JSON Schema as a plain object — does NOT need to match aiplug's `ToolParameters`. */
  parameters: Record<string, unknown>;
  /** Optional flag — ignored by aiplug. */
  requiresApproval?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';

export interface LLMResponse {
  message: LLMMessage;
  usage: TokenUsage;
  stopReason: StopReason;
}

export interface LLMAdapter {
  readonly provider: string;
  readonly model: string;
  converse(messages: LLMMessage[], tools?: LLMAdapterToolDefinition[]): Promise<LLMResponse>;
  converseStream?(
    messages: LLMMessage[],
    tools?: LLMAdapterToolDefinition[],
    onChunk?: (text: string) => void,
  ): Promise<LLMResponse>;
}

/* ---------------------------------------------------------------------------
 * Translation helpers
 * ------------------------------------------------------------------------- */

export function toAIPlugMessages(messages: LLMMessage[]): ChatMessage[] {
  const toolNamesByCallId = new Map<string, string>();

  const out: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === 'system' || message.role === 'user') {
      out.push({ role: message.role, content: message.content ?? '' });
      continue;
    }

    if (message.role === 'assistant') {
      const toolCalls: AIPlugToolCall[] | undefined = message.toolCalls?.map((tc) => {
        toolNamesByCallId.set(tc.id, tc.name);
        return {
          id: tc.id,
          name: tc.name,
          arguments: tc.input,
        };
      });
      const aiplugMsg: ChatMessage = {
        role: 'assistant',
        content: message.content ?? '',
        ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
      };
      out.push(aiplugMsg);
      continue;
    }

    // tool role
    if (message.role === 'tool' && message.toolResults) {
      for (const tr of message.toolResults) {
        const name = tr.name ?? toolNamesByCallId.get(tr.toolCallId) ?? 'tool';
        out.push({
          role: 'tool',
          content: tr.content ?? '',
          name,
          toolCallId: tr.toolCallId,
        });
      }
    }
  }

  return out;
}

export function toAIPlugTools(tools: LLMAdapterToolDefinition[]): AIPlugToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      ...(tool.parameters ?? {}),
    },
  }));
}

function mapFinishReason(reason: string | undefined | null): StopReason {
  switch (reason) {
    case 'tool_calls':
    case 'tool_use':
      return 'tool_use';
    case 'length':
    case 'max_tokens':
      return 'max_tokens';
    case 'stop_sequence':
      return 'stop_sequence';
    case 'content_filter':
    case 'stop':
    default:
      return 'end_turn';
  }
}

function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function finalMessageFromContent(content: ChatMessage['content'], toolCalls: AIPlugToolCall[]): LLMMessage {
  const message: LLMMessage = { role: 'assistant' };
  // The memoryblock adapter shape carries a single string. Multimodal
  // content is flattened to the text view here — callers needing the
  // full part stream should use aiplug's native ChatMessage instead.
  const text = typeof content === 'string'
    ? content
    : content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
  if (text.length > 0) message.content = text;
  if (toolCalls.length > 0) {
    message.toolCalls = toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.name,
      input: tc.arguments,
    }));
  }
  return message;
}

export function toLLMResponse(reply: {
  message: ChatMessage;
  finishReason?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}): LLMResponse {
  const toolCalls: AIPlugToolCall[] = reply.message.toolCalls ?? [];
  const message = finalMessageFromContent(reply.message.content ?? '', toolCalls);
  const usage = reply.usage
    ? {
        inputTokens: reply.usage.promptTokens ?? 0,
        outputTokens: reply.usage.completionTokens ?? 0,
        totalTokens: reply.usage.totalTokens ?? 0,
      }
    : emptyUsage();
  return {
    message,
    usage,
    stopReason: mapFinishReason(reply.finishReason),
  };
}

/* ---------------------------------------------------------------------------
 * `createLLMAdapter`
 * ------------------------------------------------------------------------- */

export interface LLMAdapterConfig {
  /** `provider`/`model`/`apiKey`/`baseURL` map directly to AIPlug config. */
  provider: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
  /** Pass-through transport options. */
  options?: Omit<AIPlugOptions, 'transport'>;
}

export function createLLMAdapter(config: LLMAdapterConfig): LLMAdapter {
  const ai = new AIPlug({
    transport: config.provider,
    ...(config.apiKey !== undefined ? { apiKey: config.apiKey } : {}),
    ...(config.baseURL !== undefined ? { baseURL: config.baseURL } : {}),
    model: config.model,
  }, config.options ?? {});

  const adapter: LLMAdapter = {
    provider: config.provider,
    model: config.model,
    async converse(messages, tools) {
      const reply = await ai.chat({
        model: config.model,
        messages: toAIPlugMessages(messages),
        ...(tools ? { tools: toAIPlugTools(tools) } : {}),
      });
      return toLLMResponse(reply);
    },
    async converseStream(messages, tools, onChunk) {
      const iter = ai.stream({
        model: config.model,
        messages: toAIPlugMessages(messages),
        ...(tools ? { tools: toAIPlugTools(tools) } : {}),
      });
      let acc = '';
      const toolCalls: AIPlugToolCall[] = [];
      let finishReason: string | undefined;
      let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
      try {
        for await (const chunk of iter) {
          handleStreamChunk(chunk, { acc, onChunk, toolCalls, finishReason: '', usage });
          if (chunk.type === 'text-delta') {
            acc += chunk.delta;
            if (onChunk) onChunk(chunk.delta);
          } else if (chunk.type === 'tool-call') {
            toolCalls.push(chunk.toolCall);
          } else if (chunk.type === 'usage') {
            usage = chunk.usage;
          } else if (chunk.type === 'finish') {
            finishReason = chunk.reason;
          } else if (chunk.type === 'error') {
            const e = chunk.error;
            throw new Error(`[aiplug] ${e.code ?? 'ERROR'}: ${e.message}`);
          }
        }
      } catch (err) {
        throw err;
      }
      const reply = {
        message: { role: 'assistant' as const, content: acc, ...(toolCalls.length > 0 ? { toolCalls } : {}) },
        ...(finishReason !== undefined ? { finishReason } : {}),
        ...(usage ? { usage } : { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }),
      };
      return toLLMResponse(reply);
    },
  };

  return adapter;
}

/**
 * Re-export snapshot helper so embedding apps can parse provider errors
 * uniformly even when they bypass AIPlug#chat.
 */
export function asSnapshot(err: unknown): { code: string; message: string } {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const e = err as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === 'string' ? e.code : 'UNKNOWN',
      message: typeof e.message === 'string' ? e.message : String(e.message ?? 'unknown error'),
    };
  }
  return { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) };
}

/* ---------------------------------------------------------------------------
 * Internals
 * ------------------------------------------------------------------------- */

function handleStreamChunk(
  chunk: StreamChunk,
  state: {
    acc: string;
    onChunk: ((text: string) => void) | undefined;
    toolCalls: AIPlugToolCall[];
    finishReason: string;
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
  },
): void {
  // Reserved for future per-chunk hook work; currently unused.
  void chunk;
  void state;
}

