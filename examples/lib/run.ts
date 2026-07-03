/**
 * Run-guard and small runtime helpers shared by example scripts.
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * True when the module identified by `moduleUrl` (pass `import.meta.url`) is
 * the file being executed directly, not imported.
 */
export function isMainModule(moduleUrl: string): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(moduleUrl));
}

/**
 * Standard example footer: run `main` only when the file is executed directly,
 * report errors and set a non-zero exit code.
 *
 * Usage: runExample(import.meta.url, main);
 */
export function runExample(moduleUrl: string, main: () => Promise<void>): void {
  if (!isMainModule(moduleUrl)) return;
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

/** Resolve after `ms` milliseconds (rate-limiting between writes). */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
