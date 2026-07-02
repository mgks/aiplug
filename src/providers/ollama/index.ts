/**
 * Ollama provider — local-first HTTP, NDJSON streaming.
 *
 * Reference: https://github.com/ollama/ollama/blob/main/docs/api.md
 *
 * Endpoints used:
 *   POST /api/chat         — chat (non-stream and stream=NDJSON)
 *   POST /api/embeddings   — embeddings
 *   GET  /api/tags         — model list
 */

import { Transport, requireModel } from '../../transport.js';
import { makeError } from '../../errors.js';
import { buildRequestInit, wrapFetchError, codeForStatus } from '../_shared.js';
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  EmbeddingsRequest,
  EmbeddingsResponse,
  HealthInfo,
  ModelInfo,
  StreamChunk,
  ToolCall,
} from '../../types.js';
import { METADATA, CAPABILITIES } from './capabilities.js';

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: { role: 'assistant'; content: string };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaEmbeddingsResp {
  model: string;
  embeddings: number[][];
  prompt_eval_count?: number;
}

interface OllamaTagsResp {
  models: Array<{ name: string; size?: number; details?: Record<string, unknown> }>;
}

export class OllamaTransport extends Transport {
  protected get baseURL(): string {
    return this.config.baseURL ?? 'http://localhost:11434';
  }

  protected async postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseURL}${path}`;
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
        message: `Ollama ${path} failed: ${res.status}`,
        details: { body: text.slice(0, 2048) },
      });
    }
    return (await res.json()) as T;
  }

  override async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    requireModel(this.config);
    const messages = req.messages.map((m: ChatMessage) => ({ role: m.role, content: m.content }));
    const body: Record<string, unknown> = { model: req.model, messages, stream: false };
    if (req.sampling?.temperature !== undefined) body['options'] = { ...(body['options'] as object ?? {}), temperature: req.sampling.temperature };
    if (req.sampling?.topP !== undefined) body['options'] = { ...(body['options'] as object ?? {}), top_p: req.sampling.topP };
    if (req.sampling?.seed !== undefined) body['options'] = { ...(body['options'] as object ?? {}), seed: req.sampling.seed };
    if (req.tools && req.tools.length > 0) body['tools'] = req.tools;
    const data = await this.postJSON<OllamaChatResponse>('/api/chat', body, signal);
    const message: ChatMessage = { role: 'assistant', content: data.message.content };
    const usage = data.prompt_eval_count !== undefined || data.eval_count !== undefined
      ? {
          ...(data.prompt_eval_count !== undefined ? { promptTokens: data.prompt_eval_count } : {}),
          ...(data.eval_count !== undefined ? { completionTokens: data.eval_count } : {}),
        }
      : undefined;
    return {
      model: data.model,
      message,
      finishReason: data.done_reason ?? 'stop',
      ...(usage ? { usage } : {}),
      raw: data,
    };
  }

  override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    requireModel(this.config);
    const messages = req.messages.map((m: ChatMessage) => ({ role: m.role, content: m.content }));
    const body: Record<string, unknown> = { model: req.model, messages, stream: true };
    if (req.tools && req.tools.length > 0) body['tools'] = req.tools;
    const url = `${this.baseURL}/api/chat`;
    const headers: Record<string, string> = { 'content-type': 'application/json', ...this.config.headers };
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
        message: `Ollama stream failed: ${res.status}`,
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
          const trimmed = line.trim();
          if (!trimmed) {
            nlIdx = buffer.indexOf('\n');
            continue;
          }
          let parsed: OllamaChatResponse;
          try {
            parsed = JSON.parse(trimmed) as OllamaChatResponse;
          } catch {
            nlIdx = buffer.indexOf('\n');
            continue;
          }
          if (parsed.message?.content) {
            yield { type: 'text-delta', delta: parsed.message.content };
          }
          if (parsed.done) {
            const usage =
              parsed.prompt_eval_count !== undefined || parsed.eval_count !== undefined
                ? {
                    ...(parsed.prompt_eval_count !== undefined ? { promptTokens: parsed.prompt_eval_count } : {}),
                    ...(parsed.eval_count !== undefined ? { completionTokens: parsed.eval_count } : {}),
                  }
                : undefined;
            if (usage) yield { type: 'usage', usage };
            yield { type: 'finish', reason: parsed.done_reason ?? 'stop' };
            return;
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
    yield { type: 'finish', reason: 'stop' };
  }

  override async embeddings(req: EmbeddingsRequest, signal?: AbortSignal): Promise<EmbeddingsResponse> {
    requireModel(this.config);
    const body = { model: req.model, prompt: req.input };
    const data = await this.postJSON<OllamaEmbeddingsResp>('/api/embeddings', body, signal);
    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    const embeddings = data.embeddings.map((vector, i) => ({
      index: i,
      vector,
      ...(inputs[i] !== undefined ? { raw: { input: inputs[i] } } : {}),
    }));
    return {
      model: data.model,
      embeddings,
      ...(data.prompt_eval_count !== undefined
        ? { usage: { promptTokens: data.prompt_eval_count } }
        : {}),
      raw: data,
    };
  }

  override async images(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Ollama does not provide image generation in /api/chat' });
  }

  override async audio(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Ollama does not provide text-to-speech' });
  }

  override async transcription(): Promise<never> {
    throw makeError({ code: 'UNSUPPORTED_CAPABILITY', transport: METADATA.name, message: 'Ollama does not provide speech-to-text via this endpoint' });
  }

  override async models(signal?: AbortSignal): Promise<ModelInfo[]> {
    const url = `${this.baseURL}/api/tags`;
    const headers: Record<string, string> = { ...this.config.headers };
    let res: Response;
    try {
      res = await fetch(url, buildRequestInit({ method: 'GET', headers, signal }));
    } catch (err) {
      throw wrapFetchError(err, METADATA.name);
    }
    if (!res.ok) {
      throw makeError({
        code: codeForStatus(res.status),
        transport: METADATA.name,
        status: res.status,
        message: `Ollama /api/tags failed: ${res.status}`,
      });
    }
    const data = (await res.json()) as OllamaTagsResp;
    return data.models.map((m) => ({ id: m.name, transport: METADATA.name, capabilities: [...CAPABILITIES] }));
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