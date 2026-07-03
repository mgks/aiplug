/**
 * Auto-detection — scan the local environment for available providers
 * and local runtimes, no configuration required.
 *
 * Two surfaces:
 *
 *   - **Providers** (cloud + aggregator): walk every aiplug-known provider
 *     whose `envVar` is set, plus common dotenv locations and the AWS
 *     shared credentials file. We never return the credential value
 *     itself — just its presence, a masked prefix for confirmation, and
 *     the source it was found in.
 *
 *   - **Local runtimes**: probe common HTTP endpoints (Ollama,
 *     LM Studio, vLLM, llama.cpp, Jan) and PATH binaries (`ollama`,
 *     `llama-server`, `vllm`). Report what responded and what didn't.
 *
 * The detection is non-mutating and time-bounded (1s per probe). It's
 * safe to call from any UI surface — the web UI uses it to populate the
 * "Detected" tab in the setup wizard, the CLI uses it to pre-populate
 * the init wizard, and aiplug itself uses it for the `aiplug detect`
 * command.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import { AIPlug } from './client.js';
import { listProviders } from './introspect.js';
import { makeError } from './errors.js';

const execFileP = promisify(execFile);

/* ---------------------------------------------------------------------------
 * Public types
 * --------------------------------------------------------------------------- */

export interface DetectedProvider {
    /** aiplug slug, e.g. 'minimax', 'openai', 'bedrock-aws'. */
    slug: string;
    /** Display name for UI. */
    displayName: string;
    /** Where the credential was found. */
    source: 'env' | 'dotenv' | 'aws-profile' | 'config-file' | 'process-env';
    /** Masked prefix of the credential for confirmation (e.g. 'sk-…ab'). Never the full value. */
    hint: string;
    /** Path to the file the credential came from, when applicable. */
    sourcePath?: string;
}

export interface DetectedLocalTool {
    /** aiplug slug, e.g. 'ollama', 'vllm', 'lm-studio'. */
    slug: string;
    displayName: string;
    /** Resolved base URL for the runtime. */
    baseURL: string;
    /** How we discovered the runtime. */
    source: 'port-probe' | 'binary' | 'config-file';
    /** Discovered version string (if the runtime exposes it). */
    version?: string;
    /** Models the runtime reports as available (if the probe asks). */
    availableModels?: string[];
}

export interface DetectionReport {
    providers: DetectedProvider[];
    localTools: DetectedLocalTool[];
    scannedAt: string;
    durationMs: number;
}

/* ---------------------------------------------------------------------------
 * Credential scanning
 * --------------------------------------------------------------------------- */

const DOTENV_PATHS = [
    join(homedir(), '.config', 'aiplug', '.env'),
    join(homedir(), '.env'),
    join(process.cwd(), '.env'),
];

function readDotenv(path: string): Record<string, string> | null {
    if (!existsSync(path)) return null;
    const stat = statSync(path);
    if (!stat.isFile()) return null;
    let raw: string;
    try {
        raw = readFileSync(path, 'utf-8');
    } catch {
        return null;
    }
    const out: Record<string, string> = {};
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value: string = trimmed.slice(eq + 1).trim();
        // Strip surrounding quotes.
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

function readAwsProfileCredentials(): Array<{ profile: string; sourcePath: string }> {
    // Standard AWS shared credentials file. Return the names of profiles
    // that have an `aws_access_key_id` and `aws_secret_access_key` set —
    // we don't return the values themselves.
    const path = join(homedir(), '.aws', 'credentials');
    if (!existsSync(path)) return [];
    let raw: string;
    try {
        raw = readFileSync(path, 'utf-8');
    } catch {
        return [];
    }
    const profiles: Array<{ profile: string; sourcePath: string }> = [];
    let currentProfile: string | null = null;
    for (const line of raw.split('\n')) {
        const t = line.trim();
        if (t.startsWith('[') && t.endsWith(']')) {
            currentProfile = t.slice(1, -1);
        } else if (currentProfile && t.startsWith('aws_access_key_id')) {
            profiles.push({ profile: currentProfile, sourcePath: path });
        }
    }
    return profiles;
}

export function mask(value: string, { showLast = 4 }: { showLast?: number } = {}): string {
    if (!value) return '';
    if (value.length <= showLast + 3) return '•'.repeat(value.length);
    return `${value.slice(0, 4)}…${value.slice(-showLast)}`;
}

/* ---------------------------------------------------------------------------
 * Provider detection
 * --------------------------------------------------------------------------- */

type ProviderEntry = {
    slug: string;
    displayName: string;
    envVar?: string;
    notes?: string;
    category?: string;
};

function detectProvidersFromProcessEnv(providers: ProviderEntry[]) {
    // For each provider, look at its declared `envVar` and check
    // process.env. Also check a few well-known aliases (OPENAI_API_KEY,
    // ANTHROPIC_API_KEY, etc.) that users tend to set in practice.
    const out = [];
    const seen = new Set();
    for (const p of providers) {
        if (!p.envVar) continue;
        const v = process.env[p.envVar];
        if (v && v.length > 0 && !seen.has(p.slug)) {
            out.push({
                slug: p.slug,
                displayName: p.displayName,
                source: 'env',
                hint: mask(v),
            });
            seen.add(p.slug);
        }
    }
    return out;
}

function detectProvidersFromDotenv(providers: ProviderEntry[]) {
    const out = [];
    const seen = new Set();
    for (const path of DOTENV_PATHS) {
        const env = readDotenv(path);
        if (!env) continue;
        for (const p of providers) {
            if (!p.envVar || seen.has(p.slug)) continue;
            const v = env[p.envVar];
            if (v && v.length > 0) {
                out.push({
                    slug: p.slug,
                    displayName: p.displayName,
                    source: 'dotenv',
                    hint: mask(v),
                    sourcePath: path,
                });
                seen.add(p.slug);
            }
        }
    }
    return out;
}

function detectProvidersFromAwsProfile(providers: ProviderEntry[]) {
    const profiles = readAwsProfileCredentials();
    if (profiles.length === 0) return [];
    const provider = providers.find((p) => p.slug === 'bedrock-aws') ?? providers.find((p) => p.slug === 'bedrock');
    if (!provider) return [];
    return profiles.map((p) => ({
        slug: provider.slug,
        displayName: provider.displayName,
        source: 'aws-profile',
        hint: `profile: ${p.profile}`,
        sourcePath: p.sourcePath,
    }));
}

export function detectProviders() {
    const providers = listProviders();
    const fromEnv = detectProvidersFromProcessEnv(providers);
    const fromDotenv = detectProvidersFromDotenv(providers);
    const fromAws = detectProvidersFromAwsProfile(providers);

    // Merge by slug — process-env wins, then dotenv, then AWS profile.
    const bySlug = new Map();
    for (const p of [...fromAws, ...fromDotenv, ...fromEnv]) {
        if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
    }
    return [...bySlug.values()];
}

/* ---------------------------------------------------------------------------
 * Local-runtime detection
 * --------------------------------------------------------------------------- */

const LOCAL_RUNTIMES = [
    { slug: 'ollama',     displayName: 'Ollama',        port: 11434, modelsPath: '/api/tags',     versionPath: '/api/version' },
    { slug: 'ollama-cloud', displayName: 'Ollama Cloud', port: 11434, modelsPath: '/api/tags',  versionPath: '/api/version' },
    { slug: 'lm-studio',  displayName: 'LM Studio',     port: 1234,  modelsPath: '/v1/models' },
    { slug: 'vllm',       displayName: 'vLLM',          port: 8000,  modelsPath: '/v1/models' },
    { slug: 'llama-cpp',  displayName: 'llama.cpp',     port: 8080,  modelsPath: '/v1/models' },
    { slug: 'jan',        displayName: 'Jan',           port: 1337,  modelsPath: '/v1/models' },
    { slug: 'localai',    displayName: 'LocalAI',      port: 8080,  modelsPath: '/v1/models' },
    { slug: 'atomic-chat', displayName: 'Atomic Chat', port: 1337,  modelsPath: '/v1/models' },
];

async function probeHttp(url: string, timeoutMs = 1000) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        return res;
    } catch {
        return null;
    }
}

async function detectLocalToolsViaPort() {
    const out: DetectedLocalTool[] = [];
    for (const rt of LOCAL_RUNTIMES) {
        const baseURL = `http://127.0.0.1:${rt.port}`;
        const modelsURL = `${baseURL}${rt.modelsPath}`;
        const res = await probeHttp(modelsURL);
        if (!res || !res.ok) continue;
        let availableModels: string[] | undefined;
        try {
            const data = await res.json();
            if (Array.isArray((data as { data?: unknown[] })?.data)) {
                availableModels = (data as { data: Array<{ id?: string }> }).data
                    .map((m) => m.id)
                    .filter((id): id is string => typeof id === 'string');
            } else if (Array.isArray((data as { models?: unknown[] })?.models)) {
                availableModels = (data as { models: Array<{ name?: string; id?: string }> }).models
                    .map((m) => m.name ?? m.id)
                    .filter((v): v is string => typeof v === 'string');
            }
        } catch {
            // Some servers return non-JSON on /api/tags but still respond
            // OK. Treat the response itself as evidence the runtime is up.
        }
        const tool: DetectedLocalTool = {
            slug: rt.slug,
            displayName: rt.displayName,
            baseURL,
            source: 'port-probe',
            ...(availableModels && availableModels.length > 0 ? { availableModels } : {}),
        };
        // Version is a best-effort follow-up; don't block on failure.
        if (rt.versionPath) {
            const vRes = await probeHttp(`${baseURL}${rt.versionPath}`);
            if (vRes?.ok) {
                try {
                    const vData = await vRes.json();
                    if (typeof (vData as { version?: string })?.version === 'string') {
                        tool.version = (vData as { version: string }).version;
                    }
                } catch {
                    /* ignore */
                }
            }
        }
        out.push(tool);
    }
    return out;
}

async function detectLocalToolsViaBinary(): Promise<DetectedLocalTool[]> {
    const targets = [
        { slug: 'ollama',    binary: 'ollama' },
        { slug: 'vllm',      binary: 'vllm' },
        { slug: 'llama-cpp', binary: 'llama-server' },
    ];
    const out: DetectedLocalTool[] = [];
    for (const t of targets) {
        try {
            // `which` exits 0 if found, non-zero if not.
            await execFileP('which', [t.binary]);
            out.push({
                slug: t.slug,
                displayName: `${t.binary} binary`,
                baseURL: 'binary',
                source: 'binary',
            });
        } catch {
            // not found
        }
    }
    return out;
}

export async function detectLocalTools() {
    const [portProbes, binProbes] = await Promise.all([
        detectLocalToolsViaPort(),
        detectLocalToolsViaBinary(),
    ]);
    // Port probe wins; binaries are an additional signal for tools that
    // don't have a server (e.g. ollama is a CLI that starts a server, so
    // the binary alone doesn't tell us it's running).
    return [...portProbes, ...binProbes];
}

/* ---------------------------------------------------------------------------
 * Combined detect
 * --------------------------------------------------------------------------- */

export async function detect() {
    const t0 = Date.now();
    const [providers, localTools] = await Promise.all([
        Promise.resolve(detectProviders()),
        detectLocalTools(),
    ]);
    return {
        providers,
        localTools,
        scannedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
    };
}