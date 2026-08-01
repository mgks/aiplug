/**
 * Transport registry.
 *
 * `data/registry.json` lists every transport the runtime knows about.
 * Adding a new transport does NOT require a code change here — add an
 * entry to that JSON and ship the module alongside the package.
 *
 * `loadTransport` performs the dynamic `import()` lazily. It returns a
 * fresh Transport instance per call so callers can build several clients
 * against the same provider with different configs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AiplugConfig } from './types.js';
import { makeError } from './errors.js';
import type { Transport, TransportConfig } from './transport.js';

/** Registry data shape — mirrors `data/registry.json`. */
export interface RegistryFile {
  version: number;
  transports: Record<string, RegistryEntry>;
}

export interface RegistryEntry {
  module: string;
  class: string;
  defaultBaseURL: string | null;
  auth: 'bearer' | 'x-api-key' | 'header' | 'none';
  authHeader?: string;
  /** Static capability flags. Optional for backward-compat with older registry builds. */
  capabilities?: string[];
}

/* ---------------------------------------------------------------------------
 * Loading the registry data
 * ------------------------------------------------------------------------- */

let cachedRegistry: RegistryFile | null = null;

/** Override the path to `registry.json` (used in tests). */
let REGISTRY_PATH_OVERRIDE: string | null = null;

/** Test-only override — never call from production code. */
export function __setRegistryPathForTests(path: string | null): void {
  REGISTRY_PATH_OVERRIDE = path;
  cachedRegistry = null;
}

function defaultRegistryPath(): string {
  let url = 'file:///app/index.js';
  try {
    const metaUrl = (typeof import.meta !== 'undefined' && import.meta) ? (import.meta as any).url : undefined;
    if (typeof metaUrl === 'string' && metaUrl.startsWith('file:')) {
      url = metaUrl;
    } else if (typeof __filename === 'string' && __filename) {
      url = 'file://' + __filename;
    }
  } catch {}
  const here = dirname(fileURLToPath(url));
  return pathResolve(here, '..', 'data', 'registry.json');
}

function loadRegistryFile(): RegistryFile {
  const path = REGISTRY_PATH_OVERRIDE ?? defaultRegistryPath();
  if (!existsSync(path)) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: `Transport registry not found at ${path}`,
      details: { path },
    });
  }
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: `Could not read transport registry: ${path}`,
      details: { path },
      cause: err,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: `Invalid JSON in transport registry: ${path}`,
      details: { path },
      cause: err,
    });
  }
  validateRegistry(parsed);
  return parsed as RegistryFile;
}

/** Validate the registry shape. Throws on schema mismatch. */
function validateRegistry(parsed: unknown): asserts parsed is RegistryFile {
  if (!parsed || typeof parsed !== 'object') {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: 'Registry root must be an object',
    });
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== 'number') {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: "Registry is missing 'version' field",
    });
  }
  if (!obj.transports || typeof obj.transports !== 'object' || Array.isArray(obj.transports)) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: "Registry is missing 'transports' field",
    });
  }
  for (const [name, entry] of Object.entries(obj.transports as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: name,
        message: `Registry entry "${name}" must be an object`,
      });
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.module !== 'string') {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: name,
        message: `Registry entry "${name}" missing 'module' string`,
      });
    }
    if (typeof e.class !== 'string') {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: name,
        message: `Registry entry "${name}" missing 'class' string`,
      });
    }
    if (e.defaultBaseURL !== null && typeof e.defaultBaseURL !== 'string') {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: name,
        message: `Registry entry "${name}" has invalid defaultBaseURL`,
      });
    }
  }
}

import rawRegistryData from '../data/registry.json' with { type: 'json' };

const BUILTIN_IMPORTS: Record<string, () => Promise<any>> = {
  minimax: () => import('./providers/minimax/index.js'),
  'minimax-cn': () => import('./providers/minimax/index.js'),
  'minimax-intl': () => import('./providers/minimax/index.js'),
  openai: () => import('./providers/openai/index.js'),
  anthropic: () => import('./providers/anthropic/index.js'),
  gemini: () => import('./providers/gemini/index.js'),
  deepseek: () => import('./providers/deepseek/index.js'),
  zhipu: () => import('./providers/zhipu/index.js'),
  'openai-compatible': () => import('./providers/openai-compatible/index.js'),
  openrouter: () => import('./providers/openrouter/index.js'),
  groq: () => import('./providers/groq/index.js'),
  mistral: () => import('./providers/mistral/index.js'),
  ollama: () => import('./providers/ollama/index.js'),
  cohere: () => import('./providers/cohere/index.js'),
  together: () => import('./providers/together/index.js'),
  xai: () => import('./providers/xai/index.js'),
  cerebras: () => import('./providers/cerebras/index.js'),
  fireworks: () => import('./providers/fireworks/index.js'),
};

/** Return the parsed registry (cached). */
export function getRegistry(): RegistryFile {
  if (REGISTRY_PATH_OVERRIDE) {
    if (!cachedRegistry) cachedRegistry = loadRegistryFile();
    return cachedRegistry;
  }
  return rawRegistryData as unknown as RegistryFile;
}

export function getEntry(name: string): RegistryEntry {
  const reg = getRegistry();
  const entry = reg.transports[name];
  if (!entry) {
    throw makeError({
      code: 'TRANSPORT_UNAVAILABLE',
      transport: name,
      message: `Unknown transport "${name}" — not present in registry`,
      details: { available: Object.keys(reg.transports) },
    });
  }
  return entry;
}

export function listTransportNames(): string[] {
  return Object.keys(getRegistry().transports);
}

/* ---------------------------------------------------------------------------
 * Dynamic transport loading
 * ------------------------------------------------------------------------- */

/**
 * Test hook: replace the dynamic import. Useful for unit-testing the client
 * without depending on real transport modules being installed.
 */
export type ModuleImporter = (specifier: string) => Promise<Record<string, unknown>>;
let IMPORTER_OVERRIDE: ModuleImporter | null = null;

export function __setImporterForTests(importer: ModuleImporter | null): void {
  IMPORTER_OVERRIDE = importer;
}

async function dynamicImport(specifier: string, transportName?: string): Promise<Record<string, unknown>> {
  if (IMPORTER_OVERRIDE) return IMPORTER_OVERRIDE(specifier);
  if (transportName && BUILTIN_IMPORTS[transportName]) {
    return await BUILTIN_IMPORTS[transportName]();
  }
  return (await import(specifier)) as Record<string, unknown>;
}

/** Transport loader result — the instantiated Transport. */
export interface LoadedTransport {
  transport: Transport;
  entry: RegistryEntry;
}

/**
 * Instantiate a transport by name.
 */
export async function loadTransport(
  name: string,
  instanceConfig: AiplugConfig,
): Promise<LoadedTransport> {
  const entry = getEntry(name);
  const modulePath = resolveModulePath(entry.module);
  let mod: Record<string, unknown>;
  try {
    mod = await dynamicImport(modulePath, name);
  } catch (err) {
    throw makeError({
      code: 'TRANSPORT_UNAVAILABLE',
      transport: name,
      message: `Failed to load transport module "${modulePath}"`,
      details: { module: entry.module },
      cause: err,
    });
  }
  const ctorRaw = mod[entry.class];
  if (typeof ctorRaw !== 'function') {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: name,
      message: `Module "${modulePath}" does not export class "${entry.class}"`,
      details: { module: entry.module, class: entry.class, exports: Object.keys(mod) },
    });
  }
  const Ctor = ctorRaw as new (cfg: TransportConfig) => Transport;

  const mergedConfig: TransportConfig = mergeWithDefaults(instanceConfig, entry);

  let transport: Transport;
  try {
    transport = new Ctor(mergedConfig);
  } catch (err) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: name,
      message: `Transport "${name}" constructor threw`,
      cause: err,
    });
  }
  return { transport, entry };
}

function mergeWithDefaults(config: AiplugConfig, entry: RegistryEntry): TransportConfig {
  const merged: TransportConfig = {
    transport: config.transport,
  };
  // Pass the apiKey through only when the user supplied one — never default.
  if (config.apiKey !== undefined) merged.apiKey = config.apiKey;
  if (config.model !== undefined) merged.model = config.model;
  if (config.headers !== undefined) merged.headers = config.headers;
  if (config.timeoutMs !== undefined) merged.timeoutMs = config.timeoutMs;
  if (config.capabilities !== undefined) merged.capabilities = config.capabilities;
  if (config.providerOptions !== undefined) merged.providerOptions = config.providerOptions;
  // baseURL falls back to the registry's default, then to null.
  if (config.baseURL !== undefined) {
    merged.baseURL = config.baseURL;
  } else if (entry.defaultBaseURL !== null) {
    merged.baseURL = entry.defaultBaseURL;
  }
  return merged;
}

function resolveModulePath(moduleSpecifier: string): string {
  if (isAbsolute(moduleSpecifier)) return moduleSpecifier;
  if (moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../')) {
    // registry.js lives at dist/registry.js at runtime. The compiled
    // provider modules are next to it: dist/providers/<name>/index.js.
    let url = 'file:///app/index.js';
    try {
      const metaUrl = (typeof import.meta !== 'undefined' && import.meta) ? (import.meta as any).url : undefined;
      if (typeof metaUrl === 'string' && metaUrl.startsWith('file:')) {
        url = metaUrl;
      } else if (typeof __filename === 'string' && __filename) {
        url = 'file://' + __filename;
      }
    } catch {}
    const here = dirname(fileURLToPath(url));
    const providersRoot = pathResolve(here, 'providers');
    return pathResolve(providersRoot, moduleSpecifier.replace(/^\.\//, ''));
  }
  return moduleSpecifier;
}
