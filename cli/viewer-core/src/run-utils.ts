// Shared run-time helpers for the Ink CLI bins — currently a single TTY-and-
// environment gate. Every bin that mounts the alternate-screen Ink renderer
// (`hexagram`, `hexagram-history`, `hexagram-playground`) needs to refuse
// non-interactive environments with the same three-condition check; pulling
// that check here keeps the bins from drifting.

import process from 'node:process'

import { classifyEnv } from './env-policy.js'

/**
 * Whether the current process environment is interactive enough to run an
 * Ink alternate-screen UI. Refuses on a non-TTY stdout, on `NO_COLOR` per
 * https://no-color.org/, and on `CI`. Delegates to the single env policy
 * (`classifyEnv`); reads `process.stdout` / `process.env` for the snapshot.
 */
export function isInteractiveEnv(): boolean {
  return classifyEnv({
    isTTY: Boolean(process.stdout.isTTY),
    NO_COLOR: process.env.NO_COLOR,
    CI: process.env.CI,
  }).interactive
}
