/**
 * Minimal AWS Event Stream binary parser.
 *
 * Format per message:
 *   [total_length (u32 BE)] [headers_length (u32 BE)] [prelude_crc (u32 BE)]
 *   [headers (variable)] [payload (variable)] [message_crc (u32 BE)]
 *
 * Each header:
 *   [name_length (u8)] [name (utf8)] [value_length (u16 BE)] [value (bytes)]
 *
 * We do not verify CRC32 — corrupted messages will still be detected by
 * malformed JSON / unexpected lengths, which is good enough for chat
 * streaming where the upstream is AWS Bedrock.
 */

export interface EventStreamHeader {
  name: string;
  value: string;
}

export interface EventStreamMessage {
  headers: EventStreamHeader[];
  payload: string;
}

export class EventStreamDecoder {
  private buffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));

  /** Append new bytes and return any complete messages parsed out. */
  push(chunk: Uint8Array): EventStreamMessage[] {
    this.buffer = concat(this.buffer, chunk);
    const messages: EventStreamMessage[] = [];
    while (true) {
      const msg = this.tryParseOne();
      if (!msg) break;
      messages.push(msg);
    }
    return messages;
  }

  private tryParseOne(): EventStreamMessage | null {
    if (this.buffer.length < 12) return null;
    const dv = new DataView(this.buffer.buffer as ArrayBuffer, this.buffer.byteOffset, this.buffer.byteLength);
    const totalLength = dv.getUint32(0, false);
    if (totalLength < 12) return null;
    if (this.buffer.length < totalLength) return null;

    const headersLength = dv.getUint32(4, false);
    // AWS Event Stream framing: 12-byte prelude (total_length + headers_length
    // + prelude_crc), then headers_length bytes of headers, then payload,
    // then 4-byte message_crc. headersLength excludes the prelude.
    const headersStart = 12;
    const headersEnd = headersStart + headersLength;
    const payloadEnd = totalLength - 4; // last 4 bytes are message_crc
    if (headersEnd > payloadEnd) return null;
    if (headersEnd > this.buffer.length) return null;

    const headers = parseHeaders(this.buffer.subarray(headersStart, headersEnd));
    const payloadBytes = new Uint8Array(
      this.buffer.subarray(headersEnd, payloadEnd),
    );
    // Copy into a fresh ArrayBuffer-backed Uint8Array so TextDecoder gets a
    // regular ArrayBuffer (not a SharedArrayBuffer view).
    const payload = new TextDecoder('utf-8').decode(
      new Uint8Array(payloadBytes),
    );

    // Consume
    this.buffer = this.buffer.subarray(totalLength);

    return { headers, payload };
  }
}

function parseHeaders(buf: Uint8Array): EventStreamHeader[] {
  // AWS Event Stream header layout:
  //   [name_length (u8)] [name] [value_type (u8)] [value_length (u16 BE)] [value]
  // value_type is 7 for strings (the only kind Bedrock sends in chat streams).
  const headers: EventStreamHeader[] = [];
  let i = 0;
  while (i < buf.length) {
    if (i + 1 > buf.length) break;
    const nameLen = buf[i]!;
    i += 1;
    if (i + nameLen > buf.length) break;
    const name = new TextDecoder('utf-8').decode(
      new Uint8Array(buf.subarray(i, i + nameLen)),
    );
    i += nameLen;
    if (i + 3 > buf.length) break; // 1 (type) + 2 (value_len)
    i += 1; // skip value_type byte
    const dv = new DataView(buf.buffer, buf.byteOffset + i, 2);
    const valueLen = dv.getUint16(0, false);
    i += 2;
    if (i + valueLen > buf.length) break;
    const value = new TextDecoder('utf-8').decode(
      new Uint8Array(buf.subarray(i, i + valueLen)),
    );
    i += valueLen;
    headers.push({ name, value });
  }
  return headers;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  if (a.length === 0) return new Uint8Array(b);
  if (b.length === 0) return new Uint8Array(a);
  const out = new Uint8Array(new ArrayBuffer(a.length + b.length));
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}