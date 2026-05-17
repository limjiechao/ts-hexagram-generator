import process from 'node:process'

export type OutputMode = 'ink' | 'plain'
export type InputMode = 'slider' | 'number'

export interface CliEnv {
  argv: readonly string[]
  isTTY: boolean
  envVars: { NO_COLOR: string | undefined; CI: string | undefined }
}

export interface CliFlags {
  outputMode: OutputMode
  inputMode: InputMode
  wrapWidth: number
}

const PLAIN_MODE_FLAGS = new Set(['--plain', '--no-ui'])
const NUMERIC_INPUT_FLAGS = new Set(['--numeric-input'])

export const DEFAULT_MAX_WRAP_WIDTH = 120

/**
 * Whether the given CLI arguments request the plain (non-Ink) output mode.
 * Pure — takes `argv` explicitly so it can be unit-tested without `process`.
 */
export function shouldUsePlainMode(argv: readonly string[]): boolean {
  return argv.some((argument) => PLAIN_MODE_FLAGS.has(argument))
}

/**
 * Whether the given CLI arguments request the legacy typed-number casting
 * prompt instead of the new default bouncing slider. Pure — takes `argv`
 * explicitly so it can be unit-tested without `process`.
 */
export function shouldUseNumericInput(argv: readonly string[]): boolean {
  return argv.some((argument) => NUMERIC_INPUT_FLAGS.has(argument))
}

/**
 * Parse the `--wrap-width <n>` / `--wrap-width=<n>` flag. Pure — takes `argv`
 * explicitly so it can be unit-tested without `process`. Falls back to
 * `DEFAULT_MAX_WRAP_WIDTH` when the flag is absent or the value is not a
 * positive integer.
 */
export function parseWrapWidth(argv: readonly string[]): number {
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    let value: string | undefined
    if (argument === '--wrap-width') {
      value = argv[index + 1]
    } else if (argument?.startsWith('--wrap-width=') === true) {
      value = argument.slice('--wrap-width='.length)
    }
    if (value !== undefined && /^\d+$/.test(value)) {
      const parsed = Number.parseInt(value, 10)
      if (parsed > 0) return parsed
    }
  }
  return DEFAULT_MAX_WRAP_WIDTH
}

/**
 * Accessibility-driven force-numeric heuristic. The Ink slider is purely
 * visual (a bouncing cursor with no semantic value at any frame), so any
 * environment that signals "no animation/colour" or "non-interactive
 * automation" should fall back to the typed-number prompt. Detection:
 *
 *   - `NO_COLOR` per https://no-color.org/ — set to any non-empty value.
 *   - `CI` — set to any non-empty value by most CI runners.
 *
 * Pure — takes the env vars explicitly so it can be unit-tested.
 *
 * Note: non-TTY environments already route to plain mode (which is always
 * typed), so this heuristic only matters when the Ink viewer is active.
 */
export function shouldForceNumericForAccessibility(envVars: {
  NO_COLOR: string | undefined
  CI: string | undefined
}): boolean {
  const noColor = envVars.NO_COLOR !== undefined && envVars.NO_COLOR !== ''
  const ci = envVars.CI !== undefined && envVars.CI !== ''
  return noColor || ci
}

/**
 * Resolve all CLI flags from an explicit environment snapshot. Pure — the
 * single source of truth for how argv + TTY state + env vars combine into
 * runtime configuration. Tests call this directly; production callers go
 * through `getCliFlags()`.
 */
export function parseCliFlags(env: CliEnv): CliFlags {
  const outputMode: OutputMode =
    shouldUsePlainMode(env.argv) || !env.isTTY ? 'plain' : 'ink'
  const inputMode: InputMode =
    shouldUseNumericInput(env.argv) ||
    shouldForceNumericForAccessibility(env.envVars)
      ? 'number'
      : 'slider'
  const wrapWidth = parseWrapWidth(env.argv)
  return { outputMode, inputMode, wrapWidth }
}

let cachedFlags: CliFlags | undefined

/**
 * Lazy-memoised flag resolution from `process.argv` / `process.stdout.isTTY`
 * / `process.env`. Each Node process invokes `main()` once, so caching the
 * parse is safe; tests should call `parseCliFlags()` directly instead.
 */
export function getCliFlags(): CliFlags {
  if (cachedFlags !== undefined) return cachedFlags
  cachedFlags = parseCliFlags({
    argv: process.argv.slice(2),
    isTTY: Boolean(process.stdout.isTTY),
    envVars: { NO_COLOR: process.env.NO_COLOR, CI: process.env.CI },
  })
  return cachedFlags
}

export function resolveOutputMode(): OutputMode {
  return getCliFlags().outputMode
}

export function resolveInputMode(): InputMode {
  return getCliFlags().inputMode
}

export function resolveWrapWidth(): number {
  return getCliFlags().wrapWidth
}
