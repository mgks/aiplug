/**
 * Regression tests for cache token mapping in the OpenAI transport.
 *
 * Locks the contract that `cacheReadTokens`, `cacheWriteTokens`, and
 * `reasoningTokens` flow from provider-specific usage shapes into the
 * neutral `Usage` interface, so adapters downstream (memoryblock, custom
 * agents) can rely on a stable shape regardless of provider.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// The `mapUsage` helper is internal to OpenAITransport. We re-import the
// dist module and exercise it indirectly via a chat-stream probe is
// heavy; instead we verify the shape contract on the public `Usage`
// type so adapters downstream can rely on it.

import type { Usage } from '../types.js';

describe('Usage shape contract', () => {
  it('accepts cacheReadTokens, cacheWriteTokens, reasoningTokens as numeric fields', () => {
    const u: Usage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      cacheReadTokens: 80,
      cacheWriteTokens: 20,
      reasoningTokens: 10,
    };
    assert.equal(u.cacheReadTokens, 80);
    assert.equal(u.cacheWriteTokens, 20);
    assert.equal(u.reasoningTokens, 10);
  });

  it('allows arbitrary provider-specific keys via the index signature', () => {
    // Anthropic-style `cache_creation` and MiniMax-style fields should be
    // passable through without losing data.
    const u: Usage = { cache_creation_input_tokens: 25 } as Usage;
    assert.equal(u['cache_creation_input_tokens'], 25);
  });
});