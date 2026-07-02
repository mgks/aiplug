/**
 * Google Gemini provider (native Google AI Studio API).
 *
 * Reference: https://ai.google.dev/api/rest
 *
 * Endpoint: POST {baseURL}/v1beta/models/{model}:generateContent
 * Auth:     `?key=` query param OR `x-goog-api-key` header
 *
 * Gemini wire format differs from OpenAI:
 *   - `contents[]` of `{ role, parts[] }` blocks
 *   - `parts[]` can be `{ text }`, `{ inline_data }`, `{ functionCall }`, `{ functionResponse }`
 *   - `systemInstruction` is a top-level field
 *   - SSE: append `:streamGenerateContent?alt=sse` and read `data:` lines
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
  Usage,
} from '../../types.js';
import type { GeminiProviderConfig } from './capabilities.js';
import { METADATA, CAPABILITIES } from './capabilities.js';

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description?: string;
    parameters?: unknown;
  }>;
}

interface GeminiChatResponse {
  candidates?: Array<{
    content: { role: 'model'; parts: GeminiPart[] };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
}

function mapUsage(u: GeminiChatResponse['usageMetadata']): Usage | undefined {
  if (!u) return undefined;
  const out: Usage = {};
  if (u.promptTokenCount !== undefined) out.promptTokens = u.promptTokenCount;
  if (u.candidatesTokenCount !== undefined) out.completionTokens = u.candidatesTokenCount;
  if (u.totalTokenCount !== undefined) out.totalTokens = u.totalTokenCount;
  return out;
}

function mapMessages(messages: ChatMessage[]): { contents: GeminiContent[]; systemInstruction?: { parts: GeminiPart[] } } {
  const contents: GeminiContent[] = [];
  let systemText: string | undefined;
  for (const m of messages) {
    if (m.role === 'system') {
      const text = extractText(m.content);
      systemText = (systemText ?? '') + (systemText ? '\n\n' : '') + text;
      continue;
    }
    if (m.role === 'user') {
      const text = extractText(m.content);
      contents.push({ role: 'user', parts: [{ text }] });
    } else if (m.role === 'assistant') {
      const parts: GeminiPart[] = [];
      const text = extractText(m.content);
      if (text) parts.push({ text });
      if (m.toolCalls) {
        for (const tc of m.toolCalls) parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
      }
      contents.push({ role: 'model', parts });
    } else if (m.role === 'tool') {
      const text = extractText(m.content);
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: m.name ?? 'tool', response: { result: text } } }],
      });
    }
  }
  const out: { contents: GeminiContent[]; systemInstruction?: { parts: GeminiPart[] } } = { contents };
  if (systemText) out.systemInstruction = { parts: [{ text: systemText }] };
  return out;
}

export class GeminiTransport extends Transport {
  protected get baseURL(): string {
    return this.config.baseURL ?? 'https://generativelanguage.googleapis.com';
  }

  protected buildBody(req: ChatRequest): Record<string, unknown> {
    const { contents, systemInstruction } = mapMessages(req.messages);
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body['systemInstruction'] = systemInstruction;
    if (req.tools && req.tools.length > 0) {
      const tools: GeminiTool = {
        functionDeclarations: req.tools.map((t) => {
          const decl: GeminiTool['functionDeclarations'][number] = { name: t.name, parameters: t.parameters };
          if (t.description !== undefined) decl.description = t.description;
          return decl;
        }),
      };
      body['tools'] = [tools];
    }
    if (req.sampling) {
      const genConfig: Record<string, unknown> = {};
      if (req.sampling.temperature !== undefined) genConfig['temperature'] = req.sampling.temperature;
      if (req.sampling.topP !== undefined) genConfig['topP'] = req.sampling.topP;
      if (req.sampling.maxTokens !== undefined) genConfig['maxOutputTokens'] = req.sampling.maxTokens;
      if (req.sampling.stop !== undefined) genConfig['stopSequences'] = req.sampling.stop;
      if (Object.keys(genConfig).length > 0) body['generationConfig'] = genConfig;
    }
    return body;
  }

  protected async postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const key = requireApiKey(this.config, 'header');
    const url = `${this.baseURL}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
    const headers: Record<string, string> = { 'content-type': 'application/json', ...this.config.headers };
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
        message: `Gemini ${path} failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    return (await res.json()) as T;
  }

  override async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    requireModel(this.config);
    const body = this.buildBody(req);
    const data = await this.postJSON<GeminiChatResponse>(`/v1beta/models/${req.model}:generateContent`, body, signal);
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw makeError({
        code: 'INVALID_RESPONSE',
        transport: METADATA.name,
        message: 'Gemini chat returned no candidates',
        details: { raw: data },
      });
    }
    const parts = candidate.content.parts ?? [];
    const text = parts.map((p) => p.text ?? '').join('');
    const toolCalls: ToolCall[] | undefined = parts
      .filter((p): p is GeminiPart & { functionCall: NonNullable<GeminiPart['functionCall']> } => Boolean(p.functionCall))
      .map((p) => ({
        id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args,
        rawArguments: JSON.stringify(p.functionCall.args),
      }));
    const message: ChatMessage = {
      role: 'assistant',
      content: text,
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    };
    const resp: ChatResponse = {
      model: data.modelVersion ?? req.model,
      message,
      raw: data,
    };
    if (candidate.finishReason) resp.finishReason = mapFinish(candidate.finishReason);
    const u = mapUsage(data.usageMetadata);
    if (u) resp.usage = u;
    return resp;
  }

  override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    requireModel(this.config);
    const body = this.buildBody(req);
    const key = requireApiKey(this.config, 'header');
    const url = `${this.baseURL}/v1beta/models/${req.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
    const headers: Record<string, string> = { 'content-type': 'application/json', 'accept': 'text/event-stream', ...this.config.headers };
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
        message: `Gemini stream failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
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
            if (!payload || payload === '[DONE]') {
              nlIdx = buffer.indexOf('\n');
              continue;
            }
            let parsed: GeminiChatResponse;
            try {
              parsed = JSON.parse(payload) as GeminiChatResponse;
            } catch {
              nlIdx = buffer.indexOf('\n');
              continue;
            }
            const cand = parsed.candidates?.[0];
            if (cand) {
              for (const part of cand.content.parts ?? []) {
                if (part.text) yield { type: 'text-delta', delta: part.text };
                if (part.functionCall) {
                  yield {
                    type: 'tool-call',
                    toolCall: {
                      id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                      name: part.functionCall.name,
                      arguments: part.functionCall.args,
                      rawArguments: JSON.stringify(part.functionCall.args),
                    },
                  };
                }
              }
              if (cand.finishReason) {
                yield { type: 'finish', reason: mapFinish(cand.finishReason) };
                return;
              }
            }
            if (parsed.usageMetadata) {
              const u = mapUsage(parsed.usageMetadata);
              if (u) yield { type: 'usage', usage: u };
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
    // Gemini embeddings live at a different path; for brevity throw an
    // UNSUPPORTED_CAPABILITY here so the integration is honest.
    throw makeError({
      code: 'UNSUPPORTED_CAPABILITY',
      transport: METADATA.name,
      message: 'Gemini embeddings endpoint not yet wired; use the OpenAI-compatible adapter at /v1beta/openai for now.',
    });
  }

  override async images(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Gemini native image gen not wired' });
  }

  override async audio(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Gemini TTS not wired' });
  }

  override async transcription(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Gemini STT not wired' });
  }

  override async models(signal?: AbortSignal): Promise<ModelInfo[]> {
    interface GeminiModelsResp {
      models: Array<{ name: string; displayName?: string }>;
    }
    const key = requireApiKey(this.config, 'header');
    const url = `${this.baseURL}/v1beta/models?key=${encodeURIComponent(key)}`;
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'GET', headers: this.config.headers ?? {}, signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `Gemini /v1beta/models failed: ${res.status}`,
      });
    }
    const data = (await res.json()) as GeminiModelsResp;
    return (data.models ?? []).map((m) => ({
      id: m.name.replace(/^models\//, ''),
      transport: METADATA.name,
      capabilities: [...CAPABILITIES],
    }));
  }

  override async health(signal?: AbortSignal): Promise<HealthInfo> {
    const start = Date.now();
    try {
      await this.models(signal);
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

function mapFinish(reason: string): NonNullable<ChatResponse['finishReason']> {
  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
      return 'content_filter';
    default:
      return reason;
  }
}