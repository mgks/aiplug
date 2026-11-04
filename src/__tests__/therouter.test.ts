import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTransport } from '../registry.js';

test('TheRouter transport sends chat to its registered OpenAI-compatible endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestBody: Record<string, unknown> = {};
  let authorization = '';
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    authorization = new Headers(init?.headers).get('authorization') ?? '';
    return new Response(JSON.stringify({ id: 'test', object: 'chat.completion', model: 'openai/gpt-4o-mini', choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { transport } = await loadTransport('therouter', { transport: 'therouter', apiKey: 'test-key', model: 'openai/gpt-4o-mini' });
    const response = await transport.chat({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'Hello' }] });
    assert.equal(requestUrl, 'https://api.therouter.ai/v1/chat/completions');
    assert.equal(authorization, 'Bearer test-key');
    assert.equal(requestBody.model, 'openai/gpt-4o-mini');
    assert.equal(response.message.content, 'ok');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
