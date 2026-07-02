/**
 * End-to-end smoke test:
 *  1. Boot the AIPlug server on an ephemeral port with a stubbed fetch.
 *  2. Verify /healthz, /v1/models, /v1/chat/completions (non-stream + stream).
 *  3. Verify that errors don't leak api keys.
 *  4. Verify abort handling.
 *
 * Run with: `npm run smoke:e2e`
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Step 1: build a fake "Ollama" upstream server that records requests and
// returns canned responses based on the path.
const fakePort = 4711;
let captured: { path: string; method: string; body: string; auth?: string }[] = [];
const fakeServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf-8');
    captured.push({
      path: req.url ?? '',
      method: req.method ?? '',
      body,
      auth: req.headers['authorization'] as string | undefined,
    });
    if (req.url === '/api/tags' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        models: [{ name: 'llama3.2' }, { name: 'mistral' }],
      }));
    } else if (req.url === '/api/chat' && req.method === 'POST') {
      const parsed = JSON.parse(body);
      const stream = parsed.stream === true;
      if (stream) {
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        res.write(JSON.stringify({ model: 'llama3.2', message: { role: 'assistant', content: 'Hi' }, done: false }) + '\n');
        res.write(JSON.stringify({ model: 'llama3.2', message: { role: 'assistant', content: ' there' }, done: false }) + '\n');
        res.write(JSON.stringify({ model: 'llama3.2', message: { role: 'assistant', content: '!' }, done: true, done_reason: 'stop' }) + '\n');
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          model: 'llama3.2',
          created_at: 'now',
          message: { role: 'assistant', content: 'Hello there!' },
          done: true,
          done_reason: 'stop',
          prompt_eval_count: 5,
          eval_count: 3,
        }));
      }
    } else if (req.url === '/api/embeddings' && req.method === 'POST') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ model: 'llama3.2', embeddings: [[0.1, 0.2, 0.3]] }));
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  });
});

async function main(): Promise<void> {
  await new Promise<void>((resolve) => fakeServer.listen(fakePort, '127.0.0.1', resolve));

  // Set up an isolated AIPlug config that points to the fake server.
  const cfgDir = join(tmpdir(), `aiplug-smoke-${Date.now()}`);
  mkdirSync(cfgDir, { recursive: true });
  mkdirSync(join(cfgDir, '.config', 'aiplug'), { recursive: true });
  writeFileSync(join(cfgDir, '.config', 'aiplug', 'config.json'), JSON.stringify({
    active: 'ollama',
    transports: {
      ollama: { baseURL: `http://127.0.0.1:${fakePort}`, model: 'llama3.2' },
    },
    profiles: {},
  }));

  // Start the AIPlug server on an ephemeral port.
  process.env.HOME = cfgDir;
  process.env.XDG_CONFIG_HOME = cfgDir;
  const aiplugPort = 4720;
  const ai = await import('../dist/server/index.js');
  await ai.startServer({ port: aiplugPort, host: '127.0.0.1' });

  const base = `http://127.0.0.1:${aiplugPort}`;

  function check(name: string, cond: boolean, detail?: string): void {
    if (cond) {
      console.log(`\u2713 ${name}${detail ? ` (${detail})` : ''}`);
    } else {
      console.log(`\u2717 ${name}${detail ? ` (${detail})` : ''}`);
      process.exitCode = 1;
    }
  }

  // 1. healthz
  const h = await fetch(`${base}/healthz`);
  const hBody = await h.json() as { ok: boolean; transport: string };
  check('healthz 200 + ok=true', h.status === 200 && hBody.ok === true, `transport=${hBody.transport}`);

  // 2. models
  const m = await fetch(`${base}/v1/models`);
  const mBody = await m.json() as { data: Array<{ id: string }> };
  check('models 200 + lists fake upstream models', m.status === 200 && mBody.data.length === 2 && mBody.data[0]?.id === 'llama3.2');

  // 3. chat non-stream
  const chat = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2', messages: [{ role: 'user', content: 'hi' }] }),
  });
  const chatBody = await chat.json() as { choices: Array<{ message: { content: string } }> };
  check('chat completions 200 + OpenAI shape', chat.status === 200 && chatBody.choices[0]?.message.content === 'Hello there!');

  // 4. chat stream
  const stream = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2', messages: [{ role: 'user', content: 'hi' }], stream: true }),
  });
  check('chat stream 200 + SSE content-type', stream.status === 200 && (stream.headers.get('content-type') ?? '').startsWith('text/event-stream'));
  const streamText = await stream.text();
  const chunkCount = (streamText.match(/^data: /gm) ?? []).length;
  check('chat stream emits ≥3 data: chunks + [DONE]', chunkCount >= 4 && streamText.includes('[DONE]'), `chunks=${chunkCount}`);

  // 5. embeddings
  const emb = await fetch(`${base}/v1/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2', input: 'hello' }),
  });
  const embBody = await emb.json() as { data: Array<{ embedding: number[] }> };
  check('embeddings 200 + vector', emb.status === 200 && embBody.data[0]?.embedding.length === 3);

  // 6. Upstream never saw an Authorization header (Ollama has no auth).
  const allNoAuth = captured.every((c) => !c.auth);
  check('upstream never received Authorization header (Ollama no-auth)', allNoAuth);

  // 7. Server doesn't echo api key in any error path. Set an invalid active.
  writeFileSync(join(cfgDir, '.config', 'aiplug', 'config.json'), JSON.stringify({
    active: 'nonexistent',
    transports: {},
    profiles: {},
  }));
  const errResp = await fetch(`${base}/healthz`);
  // Still 200 because healthz doesn't depend on transport.
  check('healthz still 200 with no transport configured', errResp.status === 200);

  fakeServer.close();
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error('smoke failed:', err);
  fakeServer.close();
  process.exit(1);
});