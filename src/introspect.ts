/**
 * Provider introspection — the public surface memoryblock (and any other
 * host) uses to discover what aiplug supports without hardcoding slugs.
 *
 * Three layers, each a pure function over the registry + meta:
 *   1. `listProviders()`           — slug list for picker UIs.
 *   2. `describeProvider(slug)`    — per-provider config + capabilities.
 *   3. `configSchema(slug)`       — field-level metadata for the UI.
 *
 * These functions never construct a transport — they read only registry
 * data + meta. Safe to call before any credentials are configured.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEntry, getRegistry, listTransportNames } from './registry.js';
import { makeError } from './errors.js';
import type { Capability } from './types.js';

/* ---------------------------------------------------------------------------
 * Cosmetic meta — `data/registry.meta.json` carries display strings the
 * runtime doesn't actually need but UIs do (category, popular models, env
 * var, notes). Loaded lazily; never loaded on the hot path.
 * --------------------------------------------------------------------------- */

interface MetaFile {
  version: number;
  totalProviders: number;
  providers: Record<
    string,
    {
      displayName: string;
      category: string;
      popularModels: string[];
      envVar: string;
      notes: string;
      openaiCompatible: boolean;
      isAlias?: boolean;
    }
  >;
}

let cachedMeta: MetaFile | null = null;

function defaultMetaPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return pathResolve(here, '..', 'data', 'registry.meta.json');
}

function loadMeta(): MetaFile | null {
  if (cachedMeta) return cachedMeta;
  const path = defaultMetaPath();
  if (!existsSync(path)) return null;
  try {
    cachedMeta = JSON.parse(readFileSync(path, 'utf-8')) as MetaFile;
    return cachedMeta;
  } catch {
    return null;
  }
}

/** Test-only override for `registry.meta.json` resolution. */
export function __setMetaForTests(meta: MetaFile | null): void {
  cachedMeta = meta;
}

/* ---------------------------------------------------------------------------
 * Per-provider descriptor
 * --------------------------------------------------------------------------- */

export interface ProviderDescriptor {
  /** Registry slug, e.g. `'openai'`, `'minimax'`, `'bedrock-aws'`. */
  slug: string;
  /** Human-readable name; falls back to the slug when meta is missing. */
  displayName: string;
  /** Provider category: `'Frontier'`, `'Cloud'`, `'Local'`, etc. */
  category: string;
  /** Whether the slug is an alias of another provider. */
  isAlias: boolean;
  /** Default upstream base URL (provider-distributed). */
  defaultBaseURL: string | null;
  /** Auth scheme: `'bearer'`, `'x-api-key'`, `'header'`, or `'none'`. */
  auth: 'bearer' | 'x-api-key' | 'header' | 'none';
  /** Custom auth header name when `auth === 'header'`. */
  authHeader?: string;
  /** Standard env var name (e.g. `OPENAI_API_KEY`) if known. */
  envVar?: string;
  /** Free-form notes for the UI. */
  notes?: string;
  /** Whether the provider natively speaks the OpenAI Chat Completions wire format. */
  openaiCompatible: boolean;
  /** Capability flags advertised by the transport. */
  capabilities: Capability[];
  /** Popular model IDs surfaced in the UI; may be empty. */
  popularModels: string[];
}

/* ---------------------------------------------------------------------------
 * Per-field schema for the configuration UI
 * --------------------------------------------------------------------------- */

export type ConfigFieldKind =
  | 'string'
  | 'secret'      // free-form secret, redacted in logs
  | 'enum'        // one of `enumValues`
  | 'url'         // base URL with http(s):// validation
  | 'integer'
  | 'boolean';

export interface ConfigField {
  /** Wire-format key sent to `createMemoryAdapter` / `new AIPlug`. */
  key: string;
  /** Human label for the UI. */
  label: string;
  /** Field kind. */
  kind: ConfigFieldKind;
  /** Whether the field is required. */
  required: boolean;
  /** Optional placeholder / example. */
  placeholder?: string;
  /** Hint shown beneath the field. */
  hint?: string;
  /** Env-var name to read from as a fallback (or sole source for some providers). */
  envVar?: string;
  /** For `enum` fields. */
  enumValues?: string[];
  /** Whether the field is sensitive (UI should mask + redact in logs). */
  secret?: boolean;
}

export interface ProviderConfigSchema {
  slug: string;
  /** Canonical list of fields in declaration order. */
  fields: ConfigField[];
  /** Convenience: required-field keys. */
  requiredKeys: string[];
}

/* ---------------------------------------------------------------------------
 * Field inference per auth scheme
 * --------------------------------------------------------------------------- */

function fieldsForAuth(
  auth: 'bearer' | 'x-api-key' | 'header' | 'none',
  meta?: { envVar?: string; notes?: string; category?: string },
): ConfigField[] {
  const envField = meta?.envVar
    ? {
        key: 'apiKey',
        label: 'API key',
        kind: 'secret' as const,
        required: false,
        envVar: meta.envVar,
        hint: `Read from \`${meta.envVar}\` when blank.`,
        secret: true,
      }
    : {
        key: 'apiKey',
        label: 'API key',
        kind: 'secret' as const,
        required: auth === 'bearer' || auth === 'x-api-key',
        secret: true,
      };

  if (auth === 'none') return [];

  const fields: ConfigField[] = [envField];

  if (meta?.category === 'Cloud' && /bedrock/i.test(meta.notes ?? '')) {
    // Bedrock native path needs region + access keys, not a single bearer.
    fields.length = 0;
    fields.push({
      key: 'region',
      label: 'AWS region',
      kind: 'string',
      required: true,
      placeholder: 'us-east-1',
      envVar: 'AWS_REGION',
      hint: 'Bedrock runtime endpoint is region-specific.',
    });
    fields.push({
      key: 'accessKeyId',
      label: 'AWS access key ID',
      kind: 'string',
      required: false,
      envVar: 'AWS_ACCESS_KEY_ID',
      placeholder: 'AKIA…',
    });
    fields.push({
      key: 'secretAccessKey',
      label: 'AWS secret access key',
      kind: 'secret',
      required: false,
      envVar: 'AWS_SECRET_ACCESS_KEY',
      secret: true,
    });
  }

  fields.push({
    key: 'baseURL',
    label: 'Base URL override',
    kind: 'url',
    required: false,
    hint: 'Leave blank to use the provider default.',
  });

  fields.push({
    key: 'model',
    label: 'Default model',
    kind: 'string',
    required: false,
    ...(meta?.notes?.includes('OpenAI-compatible') ? { placeholder: 'gpt-4o-mini' } : {}),
    hint: 'Override per-block in `block.config.json`.',
  });

  return fields;
}

/* ---------------------------------------------------------------------------
 * Public API
 * --------------------------------------------------------------------------- */

/**
 * Return every provider aiplug knows about, sorted by category then name.
 * Cheap — reads cached registry + meta; never instantiates a transport.
 */
export function listProviders(): ProviderDescriptor[] {
  const reg = getRegistry();
  const meta = loadMeta();
  const out: ProviderDescriptor[] = [];
  for (const slug of listTransportNames()) {
    out.push(describeProviderInternal(slug, reg, meta));
  }
  out.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.displayName.localeCompare(b.displayName);
  });
  return out;
}

/** Return a single provider's descriptor. Throws `TRANSPORT_UNAVAILABLE` if unknown. */
export function describeProvider(slug: string): ProviderDescriptor {
  return describeProviderInternal(slug, getRegistry(), loadMeta());
}

function describeProviderInternal(
  slug: string,
  reg: ReturnType<typeof getRegistry>,
  meta: MetaFile | null,
): ProviderDescriptor {
  const entry = reg.transports[slug];
  if (!entry) {
    throw makeError({
      code: 'TRANSPORT_UNAVAILABLE',
      transport: slug,
      message: `Unknown provider "${slug}" — not present in registry`,
      details: { available: Object.keys(reg.transports) },
    });
  }
  const m = meta?.providers[slug];
  const fallbackName = slug
    .split(/[-_]/)
    .map((p) => (p[0] ?? '').toUpperCase() + p.slice(1))
    .join(' ');
  const capabilities = (entry.capabilities as Capability[] | undefined) ?? [];
  const out: ProviderDescriptor = {
    slug,
    displayName: m?.displayName ?? fallbackName,
    category: m?.category ?? 'Other',
    isAlias: m?.isAlias ?? false,
    defaultBaseURL: entry.defaultBaseURL,
    auth: entry.auth,
    openaiCompatible: m?.openaiCompatible ?? true,
    capabilities,
    popularModels: m?.popularModels ?? [],
  };
  if (entry.authHeader !== undefined) out.authHeader = entry.authHeader;
  if (m?.envVar) out.envVar = m.envVar;
  if (m?.notes) out.notes = m.notes;
  return out;
}

/**
 * Return the configuration schema for a provider — the fields a UI
 * needs to render the right inputs and to know which fields are
 * required / sensitive / env-var-backed.
 *
 * Throws `TRANSPORT_UNAVAILABLE` if the slug is unknown.
 */
export function configSchema(slug: string): ProviderConfigSchema {
  const desc = describeProvider(slug);
  const meta = loadMeta()?.providers[slug];
  const fields = fieldsForAuth(desc.auth, {
    ...(desc.envVar ? { envVar: desc.envVar } : {}),
    ...(desc.notes ? { notes: desc.notes } : {}),
    ...(desc.category ? { category: desc.category } : {}),
  });
  return {
    slug,
    fields,
    requiredKeys: fields.filter((f) => f.required).map((f) => f.key),
  };
}

/** Test-only: clear cached meta + registry for unit tests that swap files. */
export function __resetIntrospectionCache(): void {
  cachedMeta = null;
}