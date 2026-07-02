# `<name>` Provider

> Copy this folder to add a new AIPlug provider. Replace every `<NAME>` placeholder.

## Auth

How the user authenticates. Document header name + env var convention. Example:

- Header: `Authorization: Bearer $API_KEY`
- Env: `<NAME>_API_KEY`

## Base URL

Default endpoint. Override per-instance via `config.baseURL`.

## Supported operations

| Operation  | Supported | Notes |
|------------|-----------|-------|
| chat       | ✅ / ❌   |       |
| streaming  | ✅ / ❌   |       |
| embeddings | ✅ / ❌   |       |
| images     | ✅ / ❌   |       |
| audio-tts  | ✅ / ❌   |       |
| audio-stt  | ✅ / ❌   |       |
| tools      | ✅ / ❌   |       |

## Configuration

```ts
import { AIPlug } from 'aiplug';
const ai = new AIPlug({
  transport: '<name>',
  apiKey: process.env.<NAME>_API_KEY!,
  model: '<default-model>',
});
```

## Known limits

- Document rate limits, max tokens, region restrictions, etc.

## Syncing from upstream

How to keep this transport in sync when the upstream provider changes their
API. Example:

- Watch `<upstream-changelog-url>`
- Update `index.ts` request/response mapping
- Update fixtures in `tests/fixtures/<name>/*`
- Run `npm run test:provider <name>`