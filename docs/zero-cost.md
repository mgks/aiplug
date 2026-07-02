# Zero-cost hot path

`aiplug` is designed so that the runtime adds **no measurable overhead** to a model request beyond what the underlying HTTP call and JSON parsing already cost. This document codifies the rules the codebase follows to keep that promise.

## What runs on the request path

For a single `ai.chat({ ... })` call:

| Step | Operation | Cost |
|------|-----------|------|
| 1 | `AIPlug.ready()` returns the cached transport instance | 1 truthy check + 1 map lookup |
| 2 | Transport `chat(req, signal)` | one method call |
| 3 | `requireModel(config)` (sync, throws if missing) | 1 string truthy check |
| 4 | `buildBody(req)` builds the request JSON | object literal + `JSON.stringify` |
| 5 | `fetch(url, init)` | the network call (unavoidable) |
| 6 | `await res.json()` | parses the upstream response (unavoidable) |
| 7 | Map response to `ChatResponse` | small object construction |

Total non-network work: ~6 cheap operations. No regex, no logging, no validation, no redaction on the success path.

For streaming, each chunk is decoded once in the transport, then yielded. The `AIPlug.stream` wrapper does a single string comparison per chunk (`chunk.type === 'finish' \|\| chunk.type === 'error'`) to short-circuit on terminal chunks.

## What does NOT run on the hot path

These operations exist in the codebase but never execute during a successful request:

- **Redaction** (`redactString`, `redactSecrets`, `redactHeaders`): only invoked from `makeError` → `AIPlugError` constructor → `buildError`. Triggers only on errors.
- **Capability detection** (`detect()`, `probeCapabilities()`): runs once per transport+baseURL on first `detect()` call, then cached in-memory. Subsequent calls are O(1) map lookups.
- **Config loading** (`load()` in `src/config.ts`): runs once at process start. The merged `AiplugConfig` is frozen in `freezeConfig()` and held by the `AIPlug` instance for its lifetime.
- **Registry parsing** (`getRegistry()`, `validateRegistry()`): reads and parses `data/registry.json` once. Cached in a module-level `cachedRegistry`.
- **Dynamic `import()` of transport modules**: Node's loader caches the resolved module. After the first import for a given URL, it's a single map lookup.

## What we never add

Things that would violate the zero-cost guarantee and which the codebase will not introduce without a major version bump:

- Per-request token counting or rate limiting
- Per-request retries (we deliberately don't ship these — wrap the client if you want them)
- Per-request capability re-detection
- Per-request logging or telemetry hooks
- Per-request redaction or sanitisation of the request body
- Per-request config re-resolution

If you need any of those, wrap the client with a higher-level abstraction. They live "one layer up" by design.

## Verification

`scripts/smoke-e2e.ts` boots the server end-to-end against a fake upstream and exercises health, models, chat (non-stream and stream), and embeddings. The streaming test asserts that a stream of three upstream chunks yields ≥3 SSE frames to the client with no extra latency added by AIPlug.

## Adding new code that touches the hot path

If you need to add logic to `Transport.chat()`, `Transport.stream()`, or any provider's request builder:

1. State the cost in the PR description (e.g., "adds ~50 ns of regex matching per request").
2. Avoid regex that compiles on every call. Hoist patterns to module scope.
3. Avoid logging on the success path. Errors get full logging; success is silent.
4. Avoid synchronous I/O. The hot path must not touch the filesystem, network (other than the upstream call), or env vars.
5. Keep allocations small. A single object literal per request is fine; allocating per chunk in a stream is not.

A test that asserts request shape (`vi.stubGlobal('fetch', stub)`) is required for any new transport method.