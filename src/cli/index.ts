#!/usr/bin/env node
/**
 * AIPlug CLI entrypoint.
 *
 * Usage: aiplug <command> [options]
 *
 * Commands:
 *   init
 *   transport add <name> | remove <name> | list | test <name> | use <name>
 *   models
 *   config
 *   detect
 *   status [--live]
 *   serve [--port=3711] [--host=127.0.0.1]
 *   health
 *
 * Global flags: --json, --help
 */

import { printError } from './output.js';
import { cmdInit } from './commands/init.js';
import { cmdTransportAdd } from './commands/transport-add.js';
import { cmdTransportRemove } from './commands/transport-remove.js';
import { cmdTransportList } from './commands/transport-list.js';
import { cmdTransportTest } from './commands/transport-test.js';
import { cmdTransportUse } from './commands/transport-use.js';
import { cmdModels } from './commands/models.js';
import { cmdConfig } from './commands/config.js';
import { cmdDetect } from './commands/detect.js';
import { cmdStatus } from './commands/status.js';
import { cmdServe } from './commands/serve.js';
import { cmdHealth } from './commands/health.js';
import { cmdChat } from './commands/chat.js';
import { printHelp } from './help.js';

function usage(): string {
  return `Usage: aiplug <command> [options]

Commands:
  init                                  Create global config directory
  transport add <name>                  Add a transport to global config
  transport remove <name>               Remove a transport
  transport list                        List configured transports
  transport test <name>                 Health-check a transport
  transport use <name>                  Set the default active transport
  models                                List models from active transport
  config                                Show the resolved effective config
  status [--live]                       Show transport status (live health if --live)
  serve [--port=3711] [--host=127.0.0.1]  Start the OpenAI-compatible HTTP server
  health                                Health-check the active transport
  chat [model]                          Minimal streaming REPL against active transport

Global flags: --json, --help, --yes (skip interactive prompts)`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(usage() + '\n');
    return;
  }
  const json = argv.includes('--json');
  const yes = argv.includes('--yes');
  const cmd = argv[0];
  const rest = argv.slice(1);

  try {
    switch (cmd) {
      case 'init':
        await cmdInit({ json, yes });
        return;
      case 'transport': {
        const sub = rest[0];
        const subArgs = rest.slice(1);
        switch (sub) {
          case 'add':
            await cmdTransportAdd({ json, yes, args: subArgs });
            return;
          case 'remove':
            await cmdTransportRemove({ json, yes, args: subArgs });
            return;
          case 'list':
            await cmdTransportList({ json });
            return;
          case 'test':
            await cmdTransportTest({ json, args: subArgs });
            return;
          case 'use':
            await cmdTransportUse({ json, yes, args: subArgs });
            return;
          case '--help':
          case '-h':
            process.stdout.write(printHelp('transport') + '\n');
            return;
          default:
            printError('INVALID_CONFIGURATION', `Unknown transport sub-command: ${sub ?? '<missing>'}`);
        }
      }
      case 'models':
        await cmdModels({ json });
        return;
      case 'config':
        await cmdConfig({ json });
        return;
      case 'detect':
        await cmdDetect({ json });
        return;
      case 'status':
        await cmdStatus({ json, args: rest });
        return;
      case 'serve':
        await cmdServe({ json, args: rest });
        return;
      case 'health':
        await cmdHealth({ json });
        return;
      case 'chat':
        await cmdChat({ json, args: rest });
        return;
      case 'help':
        process.stdout.write(usage() + '\n');
        return;
      default:
        printError('INVALID_CONFIGURATION', `Unknown command: ${cmd ?? '<missing>'}`);
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
      const e = err as { code: string; message: string };
      printError(e.code, e.message);
      return;
    }
    printError('INVALID_CONFIGURATION', err instanceof Error ? err.message : String(err));
  }
}

main();