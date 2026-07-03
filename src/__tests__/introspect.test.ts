import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listProviders,
  describeProvider,
  configSchema,
} from '../introspect.js';

describe('introspect', () => {
  it('listProviders returns every registered provider sorted by category+name', () => {
    const list = listProviders();
    assert.ok(list.length >= 100, 'expected at least 100 providers, got ' + list.length);
    const categories = new Set(list.map((p) => p.category));
    assert.ok(categories.size >= 3, 'expected multiple categories, got ' + [...categories].join(','));
    // Adjacent entries should be sorted by (category, displayName).
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]!;
      const curr = list[i]!;
      const cmp = prev.category.localeCompare(curr.category);
      if (cmp === 0) {
        assert.ok(
          prev.displayName.localeCompare(curr.displayName) <= 0,
          `providers out of order at ${prev.slug} -> ${curr.slug}`,
        );
      } else {
        assert.ok(cmp < 0, `categories out of order at ${prev.slug} -> ${curr.slug}`);
      }
    }
  });

  it('describeProvider(minimax) returns the canonical MiniMax descriptor', () => {
    const d = describeProvider('minimax');
    assert.equal(d.slug, 'minimax');
    assert.equal(d.auth, 'bearer');
    assert.equal(d.defaultBaseURL, 'https://api.minimax.io/v1');
    assert.ok(d.capabilities.includes('chat'));
    assert.ok(d.capabilities.includes('vision'));
    assert.ok(d.capabilities.includes('reasoning'));
    assert.ok(d.popularModels.includes('MiniMax-M3'));
    assert.equal(d.envVar, 'MINIMAX_API_KEY');
  });

  it('describeProvider(bedrock-aws) returns AWS Bedrock native descriptor', () => {
    const d = describeProvider('bedrock-aws');
    assert.equal(d.auth, 'header');
    assert.equal(d.defaultBaseURL, 'https://bedrock-runtime.us-east-1.amazonaws.com');
    assert.ok(d.capabilities.includes('prompt-cache'));
    assert.equal(d.openaiCompatible, false);
  });

  it('configSchema(minimax) returns apiKey + baseURL + model fields', () => {
    const schema = configSchema('minimax');
    const keys = schema.fields.map((f) => f.key);
    assert.deepEqual(keys, ['apiKey', 'baseURL', 'model']);
    const apiKey = schema.fields[0]!;
    assert.equal(apiKey.kind, 'secret');
    assert.equal(apiKey.secret, true);
    assert.equal(apiKey.envVar, 'MINIMAX_API_KEY');
    assert.equal(apiKey.required, false);
    assert.deepEqual(schema.requiredKeys, []);
  });

  it('configSchema(bedrock-aws) returns region + creds + baseURL + model fields', () => {
    const schema = configSchema('bedrock-aws');
    const keys = schema.fields.map((f) => f.key);
    assert.deepEqual(keys, ['region', 'accessKeyId', 'secretAccessKey', 'baseURL', 'model']);
    const region = schema.fields[0]!;
    assert.equal(region.key, 'region');
    assert.equal(region.required, true);
    assert.equal(region.envVar, 'AWS_REGION');
    assert.equal(region.placeholder, 'us-east-1');
    assert.deepEqual(schema.requiredKeys, ['region']);
  });

  it('describeProvider throws TRANSPORT_UNAVAILABLE for unknown slug', () => {
    assert.throws(() => describeProvider('definitely-not-a-real-provider'), /Unknown provider/);
  });
});
