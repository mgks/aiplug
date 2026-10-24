import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { AIPlug, MockTransport, FallbackTransport, searchProviders } from '../index.js';
import { normalizeContentForOpenAI } from '../providers/_shared.js';
import type { ChatRequest, ChatResponse, ContentPart } from '../types.js';

describe('AIPlug Enhancements & Features', () => {
  test('MockTransport handles chat and streams correctly', async () => {
    const client = new AIPlug({
      transport: 'mock',
      model: 'mock-model-1',
      providerOptions: {
        mockResponse: 'Hello from mock!',
      },
    });

    const res = await client.chat({
      model: 'mock-model-1',
      messages: [{ role: 'user', content: 'Ping' }],
    });

    assert.equal(res.message.content, 'Hello from mock!');
    assert.equal(res.finishReason, 'stop');

    // Test streamText
    const clientStream = new AIPlug({
      transport: 'mock',
      model: 'mock-model-1',
      providerOptions: {
        mockChunks: ['Streaming', ' ', 'is', ' ', 'working!'],
      },
    });

    const deltas: string[] = [];
    for await (const delta of clientStream.streamText({
      model: 'mock-model-1',
      messages: [{ role: 'user', content: 'Ping' }],
    })) {
      deltas.push(delta);
    }

    assert.equal(deltas.join(''), 'Streaming is working!');
  });

  test('AIPlug.fromModel instantiates client from provider/model string', () => {
    const client = AIPlug.fromModel('groq/llama-3.3-70b-versatile', {
      apiKey: 'test-key',
    });

    assert.equal(client.config.transport, 'groq');
    assert.equal(client.config.model, 'llama-3.3-70b-versatile');
    assert.equal(client.config.apiKey, 'test-key');
  });

  test('AIPlug middleware pipeline intercepts and mutates requests and responses', async () => {
    const client = new AIPlug({
      transport: 'mock',
      model: 'mock-model-1',
    });

    const traces: string[] = [];

    client.use(async (req, next, ctx) => {
      traces.push(`enter:${ctx.transportName}`);
      const res = await next(req);
      traces.push('exit');
      return {
        ...res,
        message: {
          ...res.message,
          content: `${res.message.content} (annotated by middleware)`,
        },
      };
    });

    const res = await client.chat({
      model: 'mock-model-1',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    assert.deepEqual(traces, ['enter:mock', 'exit']);
    assert.match(String(res.message.content), /annotated by middleware/);
  });

  test('AIPlug.fallback fails over upon provider error', async () => {
    const failoverEvents: string[] = [];

    const client = AIPlug.fallback(
      [
        {
          transport: 'mock',
          model: 'primary-failing',
          providerOptions: {
            mockError: { code: 'RATE_LIMITED', message: '429 Rate limit exceeded' },
          },
        },
        {
          transport: 'mock',
          model: 'secondary-succeeding',
          providerOptions: {
            mockResponse: 'Secondary provider recovered successfully',
          },
        },
      ],
      {
        onFailover(from, to) {
          failoverEvents.push(`${from}->${to}`);
        },
      },
    );

    const res = await client.chat({
      model: 'any-model',
      messages: [{ role: 'user', content: 'Test failover' }],
    });

    assert.equal(res.message.content, 'Secondary provider recovered successfully');
    assert.deepEqual(failoverEvents, ['mock->mock']);
  });

  test('searchProviders filters providers by name, category, and capability', () => {
    const results = searchProviders('groq');
    assert.ok(results.length >= 1);
    assert.equal(results[0]?.slug, 'groq');

    const visionProviders = searchProviders('', { capability: 'vision' });
    assert.ok(visionProviders.length > 0);
    assert.ok(visionProviders.some((p) => p.slug === 'anthropic' || p.slug === 'openai'));
  });

  test('normalizeContentForOpenAI maps multimodal parts cleanly', () => {
    const parts: ContentPart[] = [
      { type: 'text', text: 'Analyze this image and video' },
      {
        type: 'image_base64',
        mediaType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUg==',
      },
      {
        type: 'video_url',
        videoUrl: { url: 'https://example.com/video.mp4' },
      },
      {
        type: 'document',
        mediaType: 'application/pdf',
        name: 'report.pdf',
        data: 'JVBERi0xLjQK...',
      },
    ];

    const normalized = normalizeContentForOpenAI(parts) as any[];
    assert.equal(normalized.length, 4);
    assert.equal(normalized[0].type, 'text');
    assert.equal(normalized[1].type, 'image_url');
    assert.equal(normalized[1].image_url.url, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    assert.equal(normalized[2].type, 'video_url');
    assert.equal(normalized[2].video_url.url, 'https://example.com/video.mp4');
    assert.equal(normalized[3].type, 'file');
    assert.equal(normalized[3].file.mime_type, 'application/pdf');
  });
});
