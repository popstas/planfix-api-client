/**
 * Typed CLI flag parser shared by example scripts.
 *
 * Unlike the hand-rolled loops in older examples, this parser throws on unknown
 * flags (typo safety), missing values, non-numeric values for number flags, and
 * missing required flags.
 */

export interface FlagSpec {
  type: 'boolean' | 'number' | 'string';
  /** Value used when the flag is absent. Booleans default to false automatically. */
  default?: boolean | number | string;
  /** Throw if the flag is absent and has no default. */
  required?: boolean;
  /** Shown in the error message for missing required flags. */
  description?: string;
}

type FlagValue<S extends FlagSpec> = S['type'] extends 'boolean'
  ? boolean
  : S['type'] extends 'number'
    ? number
    : string;

export type ParsedArgs<S extends Record<string, FlagSpec>> = {
  [K in keyof S]: FlagValue<S[K]>;
};

/**
 * Parse `--flag` / `--flag value` pairs into a typed options object.
 *
 * Usage:
 *   const opts = parseArgs(process.argv.slice(2), {
 *     dryRun: { type: 'boolean' },
 *     templateId: { type: 'number', required: true },
 *     csv: { type: 'string', default: 'data/log.csv' },
 *   });
 */
export function parseArgs<S extends Record<string, FlagSpec>>(
  argv: string[],
  specs: S,
): ParsedArgs<S> {
  const result: Record<string, boolean | number | string | undefined> = {};

  for (const [name, spec] of Object.entries(specs)) {
    if (spec.default !== undefined) result[name] = spec.default;
    else if (spec.type === 'boolean') result[name] = false;
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      throw new Error(`unexpected argument "${arg}" (flags must start with --)`);
    }
    const name = arg.slice(2);
    const spec = specs[name];
    if (!spec) {
      throw new Error(`unknown flag --${name} (known: ${Object.keys(specs).map(n => `--${n}`).join(', ')})`);
    }
    if (spec.type === 'boolean') {
      result[name] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) {
      throw new Error(`flag --${name} requires a value`);
    }
    if (spec.type === 'number') {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new Error(`flag --${name} expects a number, got "${value}"`);
      }
      result[name] = num;
    } else {
      result[name] = value;
    }
  }

  for (const [name, spec] of Object.entries(specs)) {
    if (spec.required && result[name] === undefined) {
      const hint = spec.description ? ` (${spec.description})` : '';
      throw new Error(`--${name} is required${hint}`);
    }
  }

  return result as ParsedArgs<S>;
}
