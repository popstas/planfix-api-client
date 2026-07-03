/**
 * Shared helper library for example scripts. Import from here instead of
 * copy-pasting helpers between scripts:
 *
 *   import { parseArgs, buildApis, lookupFieldIds, paginate, createCsvLogger,
 *            formatApiError, runExample } from './lib';
 *
 * Copy `examples/example-template.ts` to start a new script.
 * Typecheck: npx tsc --noEmit -p tsconfig.skill.json
 */

export * from './args';
export * from './csv';
export * from './fields';
export * from './paginate';
export * from './api';
export * from './run';
