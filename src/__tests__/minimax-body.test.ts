/**
 * Regression tests for the MinimaxTransport body shape.
 *
 * Locks the MiniMax-specific reasoning fields (`thinking` and
 * `reasoning_split`) so the @aiplug:keep override keeps working
 * through build-registry regeneration and future refactors.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MinimaxTransport } from '../providers/minimax/index.js';

function transport(): MinimaxTransport {
  return new MinimaxTransport({
    transport: 'minimax',
    model: 'MiniMax-M3',
    apiKey: 'sk-test',
    baseURL: 'https://api.minimax.io/v1',
  });
}

function buildBody(model: string, providerOptions?: { thinking?: { type: string } }): Record<string, unknown> {
  const t = transport();
  const inner = t as unknown as { buildBody(req: { model: string; messages: unknown[]; sampling?: unknown; tools?: unknown; providerOptions?: unknown }): Record<string, unknown> };
  return inner.buildBody({
    model,
    messages: [{ role: 'user', content: 'ping' }],
    ...(providerOptions ? { providerOptions } : {}),
  });
}

describe('MinimaxTransport.buildBody', () => {
  it('injects thinking + reasoning_split for MiniMax-M3 by default', () => {
    const body = buildBody('MiniMax-M3');
    assert.deepEqual(body['thinking'], { type: 'adaptive' });
    assert.equal(body['reasoning_split'], true);
  });

  it('injects thinking + reasoning_split for MiniMax-M2.7', () => {
    const body = buildBody('MiniMax-M2.7');
    assert.deepEqual(body['thinking'], { type: 'adaptive' });
    assert.equal(body['reasoning_split'], true);
  });

  it('does NOT inject reasoning fields for non-reasoning models', () => {
    const body = buildBody('some-text-only-model');
    assert.equal(body['thinking'], undefined);
    assert.equal(body['reasoning_split'], undefined);
  });

  it('respects an explicit thinking override via providerOptions', () => {
    const body = buildBody('MiniMax-M3', { thinking: { type: 'disabled' } });
    assert.deepEqual(body['thinking'], { type: 'disabled' });
    // reasoning_split default still applied because we didn't override it.
    assert.equal(body['reasoning_split'], true);
  });
});