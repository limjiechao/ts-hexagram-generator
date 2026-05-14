import process from 'node:process'

export type OutputMode = 'ink' | 'plain'

const PLAIN_MODE_FLAGS = new Set(['--plain', '--no-ui'])

/**
 * Whether the given CLI arguments request the plain (non-Ink) output mode.
 * Pure — takes `argv` explicitly so it can be unit-tested without `process`.
 */
export function shouldUsePlainMode(argv: string[]): boolean {
  return argv.some((argument) => PLAIN_MODE_FLAGS.has(argument))
}

/**
 * Resolve which output mode to use for this run. Plain mode is selected when
 * the user passes `--plain` / `--no-ui`, or when stdout is not an interactive
 * TTY (piped output, CI) where the Ink full-screen viewer cannot run.
 *
 * `process.argv` and `process.stdout` are read defensively: some test
 * environments mock `process` without them, and a missing TTY should resolve
 * to plain.
 */
export function resolveOutputMode(): OutputMode {
  if (shouldUsePlainMode(process.argv?.slice(2) ?? [])) return 'plain'
  if (!process.stdout?.isTTY) return 'plain'

  return 'ink'
}

export const DEFAULT_MAX_WRAP_WIDTH = 120

/**
 * Parse the `--wrap-width <n>` / `--wrap-width=<n>` flag. Pure — takes `argv`
 * explicitly so it can be unit-tested without `process`. Falls back to
 * `DEFAULT_MAX_WRAP_WIDTH` when the flag is absent or the value is not a
 * positive integer.
 */
export function parseWrapWidth(argv: string[]): number {
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    let value: string | undefined
    if (argument === '--wrap-width') {
      value = argv[index + 1]
    } else if (argument.startsWith('--wrap-width=')) {
      value = argument.slice('--wrap-width='.length)
    }
    if (value !== undefined && /^\d+$/.test(value)) {
      const parsed = Number(value)
      if (parsed > 0) return parsed
    }
  }
  return DEFAULT_MAX_WRAP_WIDTH
}

/**
 * Resolve the Ink viewer's maximum wrap width for this run from `process.argv`.
 * `process.argv` is read defensively (some test environments mock `process`
 * without it).
 */
export function resolveWrapWidth(): number {
  return parseWrapWidth(process.argv?.slice(2) ?? [])
}
