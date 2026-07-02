/**
 * Configuration loader.
 *
 * Resolution order (highest priority first):
 *   1. CLI flags (passed by the bin entry; see `parseArgs`)
 *   2. Environment variables (`AIPLUG_*`)
 *   3. Project file (`./aiplug.config.json` then `./aiplug.config.yaml`)
 *   4. Global file (`~/.config/aiplug/config.json` then YAML)
 *   5. Hardcoded defaults
 *
 * Profile files have the same precedence chain but resolve secrets at
 * load time via `${ENV_VAR_NAME}` substitution.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve as pathResolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { makeError } from './errors.js';
import type { AiplugConfig, Capability, ConfigSource } from './types.js';

/* ---------------------------------------------------------------------------
 * Public surface
 * ------------------------------------------------------------------------- */

export interface LoadOptions {
  /** Override argv (defaults to `process.argv.slice(2)`). */
  argv?: string[];
  /** Override environment (defaults to `process.env`). */
  env?: NodeJS.ProcessEnv;
  /** Override the working directory search for project configs. */
  cwd?: string;
  /** Override the user-config directory. */
  configDir?: string;
  /** Absolute paths to extra config files (later wins). */
  extraFiles?: string[];
}

export interface ProfileMap {
  [name: string]: Record<string, unknown>;
}

export interface LoadContext {
  /** Parsed profile cache — keyed by profile name. Populated as files load. */
  profiles: ProfileMap;
  /** The cwd that was searched (for debugging). */
  cwd: string;
  /** The config-dir that was searched (for debugging). */
  configDir: string;
}

export interface LoadedConfig {
  /** Config from the file. `null` when the file was profiles-only. */
  config: AiplugConfig | null;
  /** Map of "field → source it was last set by". */
  sources: Partial<Record<keyof AiplugConfig, ConfigSource>>;
  /** Populated side-channel of profiles discovered during loading. */
  profiles: ProfileMap;
  /** `defaultProfile` declared by the file that was loaded, if any. */
  defaultProfile?: string;
}

/**
 * Load the merged configuration from CLI, env, files, and (optionally)
 * apply a named profile on top.
 *
 * - `profileName` is the profile to apply LAST (so it can override
 *   transport / model fields selected via env or CLI).
 * - `explicitProfiles` lets callers pre-load profiles programmatically,
 *   bypassing the file search.
 */
export function load(
  opts: LoadOptions = {},
  profileName?: string,
  explicitProfiles?: ProfileMap,
): LoadedConfig {
  const argv = opts.argv ?? process.argv.slice(2);
  const env = opts.env ?? process.env;
  const cwd = opts.cwd ?? process.cwd();
  const configDir = opts.configDir ?? pathResolve(homedir(), '.config', 'aiplug');

  const profiles: ProfileMap = { ...(explicitProfiles ?? {}) };
  const sources: LoadedConfig['sources'] = {};
  let defaultProfileName: string | undefined;

  // 1. Project file
  const project = loadProjectConfig(cwd);
  absorbProfiles(profiles, project);
  const projectCfg = project?.config ?? null;
  if (projectCfg) recordSources(sources, projectCfg, 'project-file');
  defaultProfileName = project?.defaultProfile;

  // 2. Global file (only if no project file was loaded)
  let globalCfg: Partial<AiplugConfig> | null = null;
  if (!projectCfg) {
    const gc = loadGlobalConfig(configDir);
    absorbProfiles(profiles, gc);
    globalCfg = gc?.config ?? null;
    if (globalCfg) recordSources(sources, globalCfg, 'global-file');
  }

  // 3. Extra files (later wins)
  let extraCfg: Partial<AiplugConfig> | null = null;
  for (const file of opts.extraFiles ?? []) {
    const lc = readFileAsConfig(file, 'project-file');
    absorbProfiles(profiles, lc);
    if (lc?.config) {
      extraCfg = lc.config;
      recordSources(sources, lc.config, 'project-file');
    }
  }

  // 4. Env vars
  const fromEnv = configFromEnv(env);
  recordSources(sources, fromEnv, 'env');

  // 5. CLI flags
  const cliArgs = parseArgs(argv);
  const fromCli = configFromCli(cliArgs);
  recordSources(sources, fromCli, 'cli');

  // Merge layers in order (lowest → highest priority).
  const filesLayer = mergeConfigs([projectCfg, globalCfg, extraCfg].filter(notNullish));
  const withEnvResolved = resolveEnvRefsInPartial(filesLayer, env);
  const merged = mergeConfigs([withEnvResolved, fromEnv, fromCli]);

  // Apply profile on top (if any). Precedence: explicit arg → AIPLUG_PROFILE /
  // --profile flag → project's `defaultProfile` field.
  let finalMerged = merged;
  const targetProfile =
    profileName ??
    (fromEnv as { __profileName?: string }).__profileName ??
    (fromCli as { __profileName?: string }).__profileName ??
    defaultProfileName;

  if (targetProfile) {
    const profile = profiles[targetProfile];
    if (!profile) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: 'unknown',
        message: `Profile "${targetProfile}" not found`,
        details: { available: Object.keys(profiles) },
      });
    }
    const resolved = resolveEnvRefsInObject(profile, env);
    finalMerged = mergeConfigs([finalMerged, pickFileFields(resolved)]);
  }

  // Defaults — only fill fields that weren't set by any layer.
  const withDefaults: AiplugConfig = {
    ...DEFAULTS,
    ...finalMerged,
  } as AiplugConfig;
  withDefaults.source = pickSource(sources);

  return { config: withDefaults, sources, profiles };
}

/* ---------------------------------------------------------------------------
 * Defaults
 * ------------------------------------------------------------------------- */

const DEFAULTS: Partial<AiplugConfig> = Object.freeze({
  transport: 'openai-compatible',
  baseURL: 'http://localhost:11434/v1',
});

/* ---------------------------------------------------------------------------
 * CLI argument parsing
 * ------------------------------------------------------------------------- */

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Parse argv into flags + positionals. Supports:
 *   --key=value, --key value, --flag
 *   First positional: profile name OR transport name.
 *   --api-key-env NAME  → reads `process.env[NAME]`
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === undefined) continue;
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      let key: string;
      let value: string | boolean = true;
      if (eq !== -1) {
        key = a.slice(2, eq);
        value = a.slice(eq + 1);
      } else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          value = next;
          i += 1;
        }
      }
      if (key.startsWith('no-')) {
        flags[key.slice(3)] = false;
      } else {
        flags[key] = value;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function configFromCli(args: ParsedArgs): Partial<AiplugConfig> {
  const { flags, positional } = args;
  const str = (k: string): string | undefined => {
    const v = flags[k];
    return typeof v === 'string' ? v : undefined;
  };
  // The profile-name is loaded into a separate internal slot so it doesn't
  // pollute the merged AiplugConfig (the field was removed in v0.2).
  const out: Partial<AiplugConfig> & { __profileName?: string } = {};

  const firstPositional = positional[0];
  if (firstPositional && !out.transport) {
    if (firstPositional.startsWith('profile:')) {
      out.__profileName = firstPositional.slice('profile:'.length);
    } else {
      out.transport = firstPositional;
    }
  }

  const transport = str('transport');
  if (transport) out.transport = transport;
  const profile = str('profile');
  if (profile) out.__profileName = profile;
  const apiKey = str('api-key') ?? str('apiKey');
  if (apiKey) out.apiKey = apiKey;
  const apiKeyEnv = str('api-key-env');
  if (apiKeyEnv && process.env[apiKeyEnv]) {
    out.apiKey = process.env[apiKeyEnv];
  }
  const model = str('model');
  if (model) out.model = model;
  const baseURL = str('base-url') ?? str('baseURL');
  if (baseURL) out.baseURL = baseURL;
  return out;
}

/* ---------------------------------------------------------------------------
 * Environment variable reading
 * ------------------------------------------------------------------------- */

const ENV_PREFIX = 'AIPLUG_';

function configFromEnv(env: NodeJS.ProcessEnv): Partial<AiplugConfig> {
  const out: Partial<AiplugConfig> & { __profileName?: string } = {};
  const read = (k: string): string | undefined => {
    const v = env[ENV_PREFIX + k];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  };
  const transport = read('TRANSPORT');
  if (transport) out.transport = transport;
  const profile = read('PROFILE');
  if (profile) out.__profileName = profile;
  const apiKey = read('API_KEY');
  if (apiKey) out.apiKey = apiKey;
  const model = read('MODEL');
  if (model) out.model = model;
  const baseURL = read('BASE_URL') ?? read('BASEURL');
  if (baseURL) out.baseURL = baseURL;
  const caps = read('CAPABILITIES');
  if (caps) {
    out.capabilities = caps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Capability[];
  }
  const timeout = read('TIMEOUT_MS');
  if (timeout) {
    const n = Number(timeout);
    if (Number.isFinite(n) && n > 0) out.timeoutMs = n;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * File-based config: JSON / YAML
 * ------------------------------------------------------------------------- */

function loadProjectConfig(cwd: string): LoadedConfig | null {
  const jsonPath = pathResolve(cwd, 'aiplug.config.json');
  if (existsSync(jsonPath)) return readFileAsConfig(jsonPath, 'project-file');
  for (const ext of ['aiplug.config.yaml', 'aiplug.config.yml']) {
    const p = pathResolve(cwd, ext);
    if (existsSync(p)) return readFileAsConfig(p, 'project-file');
  }
  return null;
}

function loadGlobalConfig(configDir: string): LoadedConfig | null {
  if (!existsSync(configDir)) return null;
  const jsonPath = pathResolve(configDir, 'config.json');
  if (existsSync(jsonPath)) return readFileAsConfig(jsonPath, 'global-file');
  for (const ext of ['config.yaml', 'config.yml']) {
    const p = pathResolve(configDir, ext);
    if (existsSync(p)) return readFileAsConfig(p, 'global-file');
  }
  return null;
}

/**
 * Standalone `profiles` file form: `{ profiles: { name: {...} } }`.
 * Returns a LoadedConfig whose `config` field is null — only the
 * `profiles` side-channel is populated.
 */
function readProfilesFile(filePath: string): LoadedConfig | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = filePath.endsWith('.json') ? JSON.parse(raw) : parseYaml(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (!obj.profiles || typeof obj.profiles !== 'object' || Array.isArray(obj.profiles)) return null;
  return {
    config: null,
    sources: {},
    profiles: obj.profiles as ProfileMap,
  };
}

function readFileAsConfig(filePath: string, source: ConfigSource): LoadedConfig {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw makeError({
      code: 'INVALID_CONFIGURATION',
      transport: 'unknown',
      message: `Could not read config file: ${filePath}`,
      details: { filePath },
      cause: err,
    });
  }
  let parsed: unknown;
  if (filePath.endsWith('.json')) {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: 'unknown',
        message: `Invalid JSON in ${filePath}`,
        details: { filePath },
        cause: err,
      });
    }
  } else {
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      throw makeError({
        code: 'INVALID_CONFIGURATION',
        transport: 'unknown',
        message: `Invalid YAML in ${filePath}`,
        details: { filePath },
        cause: err,
      });
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { config: null, sources: {}, profiles: {} };
  }
  const obj = parsed as Record<string, unknown>;

  // Profiles-only file: returns null config, populated profiles.
  if (
    obj.profiles &&
    typeof obj.profiles === 'object' &&
    !Array.isArray(obj.profiles) &&
    !obj.transport &&
    !obj.apiKey &&
    !obj.api_key &&
    !obj.model
  ) {
    const out: LoadedConfig = {
      config: null,
      sources: {},
      profiles: obj.profiles as ProfileMap,
    };
    if (typeof obj.defaultProfile === 'string') out.defaultProfile = obj.defaultProfile;
    return out;
  }
  // Bare config file.
  const partial = pickFileFields(obj);
  if (!partial.transport) {
    return { config: null, sources: {}, profiles: {} };
  }
  const cfg = partial as AiplugConfig;
  cfg.source = source;
  return { config: cfg, sources: {}, profiles: {} };
}

/** Copy profiles from a LoadedConfig into the running profile map. */
function absorbProfiles(target: ProfileMap, lc: LoadedConfig | null): void {
  if (!lc) return;
  for (const [k, v] of Object.entries(lc.profiles)) {
    target[k] = v;
  }
}

/** Translate one config-object into a partial AiplugConfig (no source label). */
function pickFileFields(obj: Record<string, unknown>): Partial<AiplugConfig> {
  const out: Record<string, unknown> = {};
  const set = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.length === 0) return;
    out[key] = value;
  };
  set('transport', obj.transport);
  set('apiKey', obj.apiKey ?? obj.api_key);
  set('model', obj.model);
  set('baseURL', obj.baseURL ?? obj.base_url);
  set('headers', obj.headers);
  set('timeoutMs', obj.timeoutMs ?? obj.timeout_ms);
  // `profile` is a top-level profile-selection directive, not a field on
  // the merged config. Pick it up here so it is captured in `sources` for
  // debugging, but it never lands in the resulting AiplugConfig.
  set('capabilities', obj.capabilities);
  set('providerOptions', obj.providerOptions ?? obj.provider_options);
  return out as Partial<AiplugConfig>;
}

/* ---------------------------------------------------------------------------
 * Secret resolution: ${ENV_VAR_NAME}
 * ------------------------------------------------------------------------- */

const ENV_REF_RE = /\$\{([A-Z][A-Z0-9_]*)\}/g;

function resolveEnvRefsInConfig(cfg: AiplugConfig, env: NodeJS.ProcessEnv): AiplugConfig {
  return resolveEnvRefsInObject(cfg as unknown as Record<string, unknown>, env) as unknown as AiplugConfig;
}

/** Same as resolveEnvRefsInConfig but for `Partial<AiplugConfig>`. */
function resolveEnvRefsInPartial(
  cfg: Partial<AiplugConfig>,
  env: NodeJS.ProcessEnv,
): Partial<AiplugConfig> {
  return resolveEnvRefsInObject(cfg as unknown as Record<string, unknown>, env) as Partial<AiplugConfig>;
}

function resolveEnvRefsInObject(
  input: Record<string, unknown>,
  env: NodeJS.ProcessEnv,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = resolveEnvRefsInValue(v, env);
  }
  return out;
}

function resolveEnvRefsInValue(value: unknown, env: NodeJS.ProcessEnv): unknown {
  if (typeof value === 'string') {
    return value.replace(ENV_REF_RE, (match, name: string) => {
      const v = env[name];
      return typeof v === 'string' ? v : match;
    });
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveEnvRefsInValue(v, env));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveEnvRefsInValue(v, env);
    }
    return out;
  }
  return value;
}

/** Resolve a single secret reference — exported for tests. */
export function resolveEnvRef(value: string, env: NodeJS.ProcessEnv): string {
  return value.replace(ENV_REF_RE, (match, name: string) => {
    const v = env[name];
    return typeof v === 'string' ? v : match;
  });
}

/* ---------------------------------------------------------------------------
 * Merge helpers
 * ------------------------------------------------------------------------- */

function mergeConfigs(parts: Array<Partial<AiplugConfig> | null | undefined>): Partial<AiplugConfig> {
  const result: Record<string, unknown> = {};
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (v === undefined) continue;
      result[k] = v;
    }
  }
  return result as Partial<AiplugConfig>;
}

function notNullish<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/** Record the source of every field set by `cfg` into `sources`. */
function recordSources(
  sources: LoadedConfig['sources'],
  cfg: Partial<AiplugConfig>,
  source: ConfigSource,
): void {
  for (const [k, v] of Object.entries(cfg)) {
    if (v === undefined) continue;
    sources[k as keyof AiplugConfig] = source;
  }
}

function pickSource(
  sources: Partial<Record<keyof AiplugConfig, ConfigSource>>,
): ConfigSource {
  // Priority order: cli > env > project-file > global-file > defaults
  const PRIORITY: ConfigSource[] = ['cli', 'env', 'project-file', 'global-file'];
  for (const src of PRIORITY) {
    for (const v of Object.values(sources)) {
      if (v === src) return src;
    }
  }
  return 'defaults';
}

/** Path to the global config dir — exported for the CLI entry. */
export function globalConfigDir(): string {
  return pathResolve(homedir(), '.config', 'aiplug');
}
