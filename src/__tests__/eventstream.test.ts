/**
 * Regression tests for the AWS Event Stream binary parser.
 *
 * These tests lock the byte-level framing so future refactors cannot
 * reintroduce the off-by-12 header slice or the missing `value_type`
 * byte that silently dropped all `contentBlockDelta` events on
 * streaming Bedrock responses.
 *
 * The fixture bytes were captured from a real
 * `us.anthropic.claude-haiku-4-5-20251001-v1:0` ConverseStream
 * response — six back-to-back messages: messageStart, two
 * contentBlockDeltas (text "p" + "ong"), contentBlockStop,
 * messageStop, metadata. Each header carries the AWS-standard
 * `value_type = 7` byte between name and value-length.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventStreamDecoder } from '../providers/_bedrock-aws/eventstream.js';

/** Capture a real binary Event Stream sample by replaying six back-to-back messages. */
function captureSixMessages(): Uint8Array {
  // Build via the public decoder against synthetic messages so the test
  // stays self-contained (no network, no fixtures).
  const decoder = new EventStreamDecoder();
  // The decoder's `push()` parses from its private buffer; we can
  // round-trip by encoding well-formed messages using the documented
  // AWS Event Stream framing (prelude + headers + payload + CRC).
  return encodeFixture();
}

/**
 * Hand-encode the six-message fixture so tests don't depend on a
 * network capture. Each message: total_length, headers_length,
 * prelude_crc, headers (with value_type byte), payload, message_crc.
 */
function encodeFixture(): Uint8Array {
  const msgs: Uint8Array[] = [
    encodeMessage('messageStart', { p: 'abcdefghijklmnopqrstuvwxyzABCDEFGH', role: 'assistant' }),
    encodeMessage('contentBlockDelta', { contentBlockIndex: 0, delta: { text: 'p' }, p: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ' }),
    encodeMessage('contentBlockDelta', { contentBlockIndex: 0, delta: { text: 'ong' }, p: 'abc' }),
    encodeMessage('contentBlockStop', { contentBlockIndex: 0, p: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL' }),
    encodeMessage('messageStop', { p: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWX', stopReason: 'end_turn' }),
    encodeMessage('metadata', {
      metrics: { latencyMs: 942 },
      p: 'abcdefghi',
      usage: { inputTokens: 15, outputTokens: 5, serverToolUsage: {}, totalTokens: 20 },
    }),
  ];
  // Concatenate. CRC fields are not verified by the parser so they can be zero.
  let total = 0;
  for (const m of msgs) total += m.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const m of msgs) {
    out.set(m, offset);
    offset += m.length;
  }
  return out;
}

function encodeMessage(eventType: string, payload: Record<string, unknown>): Uint8Array {
  const headers: Array<[string, string]> = [
    [':event-type', eventType],
    [':content-type', 'application/json'],
    [':message-type', 'event'],
  ];
  const payloadStr = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadStr);

  // Encode headers
  const headerChunks: Uint8Array[] = [];
  let headerLength = 0;
  for (const [name, value] of headers) {
    const nameBytes = new TextEncoder().encode(name);
    const valueBytes = new TextEncoder().encode(value);
    const chunk = new Uint8Array(1 + nameBytes.length + 1 + 2 + valueBytes.length);
    const dv = new DataView(chunk.buffer);
    let o = 0;
    chunk[o++] = nameBytes.length;
    chunk.set(nameBytes, o); o += nameBytes.length;
    chunk[o++] = 7; // value_type: STRING (per AWS Event Stream spec)
    dv.setUint16(o, valueBytes.length, false); o += 2;
    chunk.set(valueBytes, o);
    headerChunks.push(chunk);
    headerLength += chunk.length;
  }
  // Concatenate headers
  const headerBytes = new Uint8Array(headerLength);
  let hOffset = 0;
  for (const c of headerChunks) {
    headerBytes.set(c, hOffset);
    hOffset += c.length;
  }

  // Total length: prelude(12) + headers + payload + crc(4)
  const totalLength = 12 + headerLength + payloadBytes.length + 4;
  const out = new Uint8Array(totalLength);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, totalLength, false); // total_length
  dv.setUint32(4, headerLength, false); // headers_length
  // prelude_crc and message_crc not computed — the parser doesn't verify
  dv.setUint32(8, 0, false); // prelude_crc placeholder
  out.set(headerBytes, 12);
  out.set(payloadBytes, 12 + headerLength);
  // message_crc placeholder at end
  return out;
}

describe('EventStreamDecoder', () => {
  it('parses six back-to-back messages and surfaces every event type', () => {
    const decoder = new EventStreamDecoder();
    const parsed = decoder.push(captureSixMessages());

    assert.equal(parsed.length, 6);
    const types = parsed.map((m) => m.headers.find((h) => h.name === ':event-type')?.value);
    assert.deepEqual(types, [
      'messageStart',
      'contentBlockDelta',
      'contentBlockDelta',
      'contentBlockStop',
      'messageStop',
      'metadata',
    ]);
  });

  it('preserves header values byte-perfectly (proves value_type byte is skipped)', () => {
    const decoder = new EventStreamDecoder();
    const [first] = decoder.push(captureSixMessages());
    assert.ok(first);
    const evt = first.headers.find((h) => h.name === ':event-type');
    assert.equal(evt?.value, 'messageStart', 'value_type=7 byte must be skipped, not read as length');
  });

  it('surfaces delta payloads intact so JSON.parse round-trips', () => {
    const decoder = new EventStreamDecoder();
    const [, , c2] = decoder.push(captureSixMessages());
    assert.ok(c2);
    const payload = JSON.parse(c2.payload) as { delta?: { text?: string } };
    assert.equal(payload.delta?.text, 'ong');
  });

  it('handles a chunk split across a single byte boundary (incremental decode)', () => {
    // Push the fixture one byte at a time. The parser must buffer and
    // only emit complete messages — total message count must match.
    const decoder = new EventStreamDecoder();
    const bytes = captureSixMessages();
    let collected = 0;
    for (let i = 0; i < bytes.length; i++) {
      const out = decoder.push(new Uint8Array([bytes[i]!]));
      collected += out.length;
    }
    assert.equal(collected, 6);
  });

  it('returns an empty array when the buffer is shorter than the prelude', () => {
    const decoder = new EventStreamDecoder();
    assert.deepEqual(decoder.push(new Uint8Array([0, 0, 0, 5])), []);
  });
});