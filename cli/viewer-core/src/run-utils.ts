// Shared run-time helpers for the Ink CLI bins — currently a single TTY-and-
// environment gate. Every bin that mounts the alternate-screen Ink renderer
// (`hexagram`, `hexagram-history`, `hexagram-playground`) needs to refuse
// non-interactive environments with the same three-condition check; pulling
// that check here keeps the bins from drifting.

import process from 'node:process'

/**
 * Whether the current process environment is interactive enough to run an
 * Ink alternate-screen UI. Refuses on a non-TTY stdout, on `NO_COLOR` per
 * https://no-color.org/, and on `CI`. Pure — only reads `process.stdout`
 * and `process.env`, so a caller can guard a `render(...)` call cleanly.
 */
export function isInteractiveEnv(): boolean {
  const isTty = Boolean(process.stdout.isTTY)
  const noColor =
    process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== ''
  const ci = process.env.CI !== undefined && process.env.CI !== ''
  return isTty && !noColor && !ci
}
