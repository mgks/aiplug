/**
 * Capability detection.
 *
 * The challenge: most providers don't return a "supported features" list,
 * so we infer capabilities from:
 *   1. The transport's static metadata (cheap, immediate).
 *   2. A call to `transport.models()` (reveals per-model capabilities).
 *   3. A small probe request (when neither of the above is conclusive).
 *   4. Any explicit override passed by the user via `AiplugConfig.capabilities`.
 *
 * Results are cached in-memory, keyed by transport name. Tests can call
 * `clearCache()` to reset.
 */

import type { Transport } from './transport.js';
import type { Capability, ModelInfo } from './types.js';

/** Source a capability claim came from — used for debugging. */
export type CapabilitySource = 'metadata' | 'models' | 'probe' | 'override';

export interface CapabilityReport {
  capabilities: Capability[];
  byCapability: Partial<Record<Capability, CapabilitySource>>;
  models?: ModelInfo[];
  generatedAt: number;
}

interface CacheEntry {
  report?: CapabilityReport;
  inflight?: Promise<CapabilityReport>;
}

const CACHE = new Map<string, CacheEntry>();

const PROBE_TIMEOUT_MS = 4_000;
const PROBE_CHUNK_LIMIT = 4;

/** Drop all cached capability reports, optionally limited to one transport. */
export function clearCache(transportName?: string): void {
  if (transportName) {
    // Drop every entry whose key starts with the bare name (no baseURL) or `name@`.
    for (const key of CACHE.keys()) {
      if (key === transportName || key.startsWith(`${transportName}@`)) {
        CACHE.delete(key);
      }
    }
    return;
  }
  CACHE.clear();
}

/**
 * Build the capability report for a transport. The precedence chain is
 * `metadata → models → probe → override` so a user-supplied override
 * can never be downgraded by a stale probe result.
 *
 * Cache key is `(name, baseURL)` so two clients using the same transport
 * name but different endpoints or credentials don't share a stale report.
 */
export async function detect(transport: Transport): Promise<CapabilityReport> {
  const name = transport.capabilities().name;
  const key = cacheKey(name, transport.config.baseURL);
  const cached = CACHE.get(key);

  if (cached?.report) {
    return mergeOverrides(cached.report, transport.config.capabilities);
  }
  if (cached?.inflight) {
    const rep = await cached.inflight;
    return mergeOverrides(rep, transport.config.capabilities);
  }

  const inflight = compute(transport);
  CACHE.set(key, { inflight });
  try {
    const report = await inflight;
    CACHE.set(key, { report });
    return mergeOverrides(report, transport.config.capabilities);
  } catch (err) {
    CACHE.delete(key);
    throw err;
  }
}

function cacheKey(name: string, baseURL: string | undefined): string {
  return baseURL ? `${name}@${baseURL}` : name;
}

async function compute(transport: Transport): Promise<CapabilityReport> {
  const md = transport.capabilities();
  const fromMeta = capsFromMetadata(md);
  let models: ModelInfo[] | undefined;
  try {
    models = await transport.models();
  } catch {
    models = undefined;
  }
  const fromModels = capsFromModels(models);
  let combined = union(fromMeta, fromModels);
  if (needsProbe(combined)) {
    const probed = await probeCapabilities(transport);
    combined = union(combined, probed);
  }
  const byCapability: Partial<Record<Capability, CapabilitySource>> = {};
  for (const c of fromMeta) byCapability[c] = 'metadata';
  for (const c of fromModels) if (!byCapability[c]) byCapability[c] = 'models';
  for (const c of combined) if (!byCapability[c]) byCapability[c] = 'probe';

  const report: CapabilityReport = {
    capabilities: combined,
    byCapability,
    generatedAt: Date.now(),
  };
  if (models !== undefined) report.models = models;
  return report;
}

function mergeOverrides(
  rep: CapabilityReport,
  overrides: Capability[] | undefined,
): CapabilityReport {
  if (!overrides || overrides.length === 0) return rep;
  const merged = new Set<Capability>(rep.capabilities);
  const byCap = { ...rep.byCapability };
  for (const c of overrides) {
    merged.add(c);
    byCap[c] = 'override';
  }
  return {
    ...rep,
    capabilities: [...merged],
    byCapability: byCap,
  };
}

function capsFromMetadata(md: { capabilities: Capability[] }): Capability[] {
  return [...md.capabilities];
}

function capsFromModels(models: ModelInfo[] | undefined): Capability[] {
  if (!models || models.length === 0) return [];
  const set = new Set<Capability>();
  for (const m of models) {
    for (const c of m.capabilities) set.add(c);
  }
  return [...set];
}

function union(a: Capability[], b: Capability[]): Capability[] {
  return [...new Set<Capability>([...a, ...b])];
}

function needsProbe(caps: Capability[]): boolean {
  return caps.length === 0;
}

/**
 * Probe with a tiny chat request to see whether the transport supports
 * chat and streaming. We deliberately limit the chunk count so a probe
 * can't accidentally cost real money.
 */
async function probeCapabilities(transport: Transport): Promise<Capability[]> {
  const caps: Capability[] = [];
  if (!transport.capabilities().capabilities.includes('chat')) return caps;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('probe-timeout')), PROBE_TIMEOUT_MS);
  try {
    const health = await transport.health(ctrl.signal);
    if (health.ok) caps.push('chat');
  } catch {
    /* ignore — probe failure does not throw */
  } finally {
    clearTimeout(timer);
  }

  if (caps.includes('chat')) {
    const ctrl2 = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(new Error('probe-stream-timeout')), PROBE_TIMEOUT_MS);
    try {
      const iter = transport.stream(
        {
          model: transport.config.model ?? '',
          messages: [{ role: 'user', content: 'ping' }],
        },
        ctrl2.signal,
      );
      let count = 0;
      for await (const _chunk of iter) {
        count += 1;
        if (count >= PROBE_CHUNK_LIMIT) break;
      }
      if (count > 0) caps.push('streaming');
    } catch {
      /* streaming unsupported */
    } finally {
      clearTimeout(timer2);
      try {
        ctrl2.abort();
      } catch {
        /* ignore */
      }
    }
  }

  return caps;
}
