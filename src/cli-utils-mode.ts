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
