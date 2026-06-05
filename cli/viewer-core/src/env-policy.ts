// Single source of truth for the CLI's environment policy. Both the
// interactive-TTY gate (every Ink-only bin's run entry) and the force-numeric
// accessibility heuristic (the casting slider falls back to typed input) read
// the same `NO_COLOR` / `CI` signals — encoding that reading twice let the two
// drift. `classifyEnv` reads the snapshot once; the two consumers select the
// field they need.

import process from 'node:process'

export interface EnvSnapshot {
  isTTY: boolean
  NO_COLOR: string | undefined
  CI: string | undefined
}

export interface EnvPolicy {
  /** TTY, no NO_COLOR, no CI — safe to mount an alternate-screen Ink UI. */
  interactive: boolean
  /**
   * NO_COLOR or CI is set — the purely-visual bouncing slider should fall
   * back to the typed-number prompt. Independent of `isTTY` (non-TTY already
   * routes to plain mode, which is always typed).
   */
  forceNumeric: boolean
}

/** A non-empty env var per https://no-color.org/ semantics (set AND non-empty). */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== ''
}

/**
 * Derive the CLI's environment policy from an explicit snapshot. Pure — takes
 * the snapshot so it can be unit-tested without `process`. The two booleans are
 * the only env-derived policy the CLI has:
 *
 *   interactive  = isTTY && !NO_COLOR && !CI
 *   forceNumeric = NO_COLOR || CI
 */
export function classifyEnv(env: EnvSnapshot): EnvPolicy {
  const noColor = isSet(env.NO_COLOR)
  const ci = isSet(env.CI)
  return {
    interactive: env.isTTY && !noColor && !ci,
    forceNumeric: noColor || ci,
  }
}

/**
 * Refuse a non-interactive environment with the exact, long-standing stderr
 * message and exit code 1. `binName` is the FULL bin name (e.g. `hexagram`,
 * `hexagram-history`) so the composed shell bin's prefix-less message is
 * expressible. Reads the live `process` state via `classifyEnv`.
 *
 * Returns when the environment IS interactive, so callers that previously
 * branched on a boolean can call this unconditionally and continue.
 */
export function refuseIfNonInteractive(binName: string): void {
  const policy = classifyEnv({
    isTTY: Boolean(process.stdout.isTTY),
    NO_COLOR: process.env.NO_COLOR,
    CI: process.env.CI,
  })
  if (!policy.interactive) {
    process.stderr.write(`${binName} requires an interactive terminal\n`)
    process.exit(1)
  }
}
