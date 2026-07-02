// @aiplug:keep
/**
 * MiniMax provider — OpenAI-compatible Chat Completions with MiniMax-specific
 * reasoning controls.
 *
 * MiniMax exposes both reasoning-capable models (MiniMax-M2.5, M2.7, M3) and
 * non-reasoning models. Reasoning models understand two body fields that the
 * generic OpenAI shim does not set:
 *
 *   - `thinking: { type: 'adaptive' | 'disabled' }` — toggles reasoning.
 *     `adaptive` lets the model decide, `disabled` forces it off.
 *   - `reasoning_split: true` — keeps reasoning in a separate
 *     `delta.reasoning_content` field rather than embedding `<think>...</think>`
 *     tags inside `delta.content`.
 *
 * M2.x always thinks (the `disabled` value is ignored). M3 honours `disabled`.
 *
 * For any reasoning-capable model we inject `thinking: { type: 'adaptive' }`
 * and `reasoning_split: true` by default so callers get a clean separation
 * between reasoning and final answer in the stream. Callers that want a
 * different behaviour can override via `providerOptions.thinking`.
 *
 * Capability flags live in `data/registry.meta.json` (cosmetic) and
 * `capabilities.ts` (runtime).
 */

import { OpenAICompatibleTransport } from '../openai-compatible/index.js';
import { makeError } from '../../errors.js';
import type { OpenAICompatibleConfig } from '../openai-compatible/index.js';
import type {
  ChatRequest,
  StreamChunk,
  TransportMetadata,
} from '../../types.js';

export interface ProviderConfig extends OpenAICompatibleConfig {}

/**
 * Models whose MiniMax IDs end with one of these substrings are reasoning-
 * capable. Kept here as a short allowlist rather than a full registry —
 * only the IDs we ship defaults for are in scope.
 */
const REASONING_MODEL_PATTERNS = [
  'MiniMax-M3',
  'MiniMax-M2.7',
  'MiniMax-M2.5',
  'MiniMax-M2.1',
  'MiniMax-M2',
];

function isReasoningCapable(modelId: string): boolean {
  return REASONING_MODEL_PATTERNS.some((p) => modelId === p || modelId.startsWith(`${p}-`));
}

export class MinimaxTransport extends OpenAICompatibleTransport {
  constructor(config: ProviderConfig) {
    if (!config.baseURL) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: 'minimax',
        message: 'Transport "minimax" requires a baseURL',
      });
    }
    super(config);
  }

  override capabilities(): TransportMetadata {
    const m = super.capabilities();
    return { ...m, name: 'minimax', defaultBaseURL: 'https://api.minimax.io/v1' };
  }

  /**
   * Patch the chat body to inject MiniMax-specific fields for reasoning-
   * capable models. We respect an existing `providerOptions.thinking`
   * override but default to `{ type: 'adaptive' }` + `reasoning_split: true`
   * so reasoning streams out separately from content.
   */
  protected override buildBody(req: ChatRequest): Record<string, unknown> {
    const body = super.buildBody(req);
    if (isReasoningCapable(req.model)) {
      const opts = (req.providerOptions ?? {}) as { thinking?: { type?: string } };
      body['thinking'] = opts.thinking ?? { type: 'adaptive' };
      if (body['reasoning_split'] === undefined) {
        body['reasoning_split'] = true;
      }
    }
    return body;
  }

  /**
   * The OpenAI base stream already surfaces `delta.reasoning_content` as
   * `reasoning-delta` (since the Phase 2 changes). This override is kept
   * as the extension point for MiniMax-only stream quirks in future.
   */
  override async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterableIterator<StreamChunk> {
    yield* super.stream(req, signal);
  }
}

/** Canonical default base URL for this provider. */
export const DEFAULT_BASE_URL = 'https://api.minimax.io/v1';
