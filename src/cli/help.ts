/**
 * Per-command help text.
 */

export function printHelp(cmd: string): string {
  switch (cmd) {
    case 'transport':
      return `Usage: aiplug transport <add|remove|list|test|use> [options]
  add <name>      [--api-key=...] [--base-url=...] [--model=...] [--force]
  remove <name>   [--force]
  list
  test <name>
  use <name>      [--force]`;
    case 'serve':
      return `Usage: aiplug serve [--port=3711] [--host=127.0.0.1]`;
    default:
      return `No help for "${cmd}"`;
  }
}