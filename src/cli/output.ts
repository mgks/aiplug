/**
 * CLI output helpers — pretty-print tables or emit JSON when `--json`.
 */

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function isTTY(): boolean {
  return Boolean(process.stdout.isTTY);
}

function colourise(c: keyof typeof ANSI, text: string): string {
  if (!isTTY()) return text;
  return `${ANSI[c]}${text}${ANSI.reset}`;
}

export interface CLIOutput {
  json: boolean;
}

export function makeOutput(json: boolean): CLIOutput {
  return { json };
}

export function print(out: CLIOutput, payload: unknown, opts?: { pretty?: boolean }): void {
  if (out.json) {
    process.stdout.write(JSON.stringify(payload, null, opts?.pretty ? 2 : 0) + '\n');
  } else {
    process.stdout.write(`${payload}\n`);
  }
}

export function printTable(out: CLIOutput, headers: string[], rows: string[][]): void {
  if (out.json) {
    const records = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
    print(out, records, { pretty: true });
    return;
  }
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const fmt = (cells: string[]): string =>
    cells.map((c, i) => (c ?? '').padEnd(widths[i] ?? 0)).join('  ');
  process.stdout.write(colourise('bold', fmt(headers)) + '\n');
  process.stdout.write(colourise('dim', widths.map((w) => '-'.repeat(w)).join('  ')) + '\n');
  for (const row of rows) process.stdout.write(fmt(row) + '\n');
}

export function printError(code: string, message: string, details?: unknown): never {
  const out = { error: { code, message, details } };
  process.stderr.write(JSON.stringify(out, null, 2) + '\n');
  const codeNum =
    code === 'INVALID_CONFIGURATION' || code === 'AUTH_MISSING'
      ? 3
      : code === 'AUTH_INVALID' || code === 'MODEL_NOT_FOUND' || code === 'TRANSPORT_UNAVAILABLE'
        ? 2
        : 1;
  process.exit(codeNum);
}

export function printOK(out: CLIOutput, message: string): void {
  if (out.json) print(out, { ok: true, message });
  else process.stdout.write(`${colourise('green', '\u2713')} ${message}\n`);
}

export function readArg(flag: string, args: string[]): string | undefined {
  // Support both `--flag value` and `--flag=value` forms.
  const eqFlag = `${flag}=`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) continue;
    if (a === flag) {
      const next = args[i + 1];
      return next !== undefined && !next.startsWith('--') ? next : undefined;
    }
    if (a.startsWith(eqFlag)) return a.slice(eqFlag.length);
  }
  return undefined;
}

export function hasFlag(flag: string, args: string[]): boolean {
  return args.includes(flag);
}

export function stripFlags(args: string[]): string[] {
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) continue;
    if (a.startsWith('--')) {
      // Skip the flag's value if the next arg doesn't start with --.
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) i++;
      continue;
    }
    positional.push(a);
  }
  return positional;
}

export { colourise };