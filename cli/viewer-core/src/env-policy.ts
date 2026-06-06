// Single source of truth for the CLI's environment policy. It exposes all
// THREE env-derived bits as orthogonal projections of one snapshot: the
// interactive-TTY gate (every Ink-only bin's run entry), the force-numeric
// accessibility heuristic (the casting slider falls back to typed input), and
// the headless bit (the plain-vs-Ink renderer choice). The interactive/numeric
// pair read the same `NO_COLOR` / `CI` signals and headless reads `isTTY` —
// encoding any of those readings twice let the consumers drift, so the
// plain-vs-Ink call now reads `headless` here rather than its own private
// `!isTTY`. `classifyEnv` reads the snapshot once; each consumer selects the
// field it needs.

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
  /**
   * stdout is not a TTY → the plain (non-Ink) renderer is used. The
   * plain-vs-Ink decision reads this; it is `!isTTY` and is explicitly NOT
   * gated on NO_COLOR/CI (a NO_COLOR/CI TTY stays Ink, with typed input).
   */
  headless: boolean
}

/** A non-empty env var per https://no-color.org/ semantics (set AND non-empty). */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== ''
}

/**
 * Derive the CLI's environment policy from an explicit snapshot. Pure — takes
 * the snapshot so it can be unit-tested without `process`. The three booleans
 * are the only env-derived policy the CLI has:
 *
 *   interactive  = isTTY && !NO_COLOR && !CI
 *   forceNumeric = NO_COLOR || CI
 *   headless     = !isTTY
 */
export function classifyEnv(env: EnvSnapshot): EnvPolicy {
  const noColor = isSet(env.NO_COLOR)
  const ci = isSet(env.CI)
  return {
    interactive: env.isTTY && !noColor && !ci,
    forceNumeric: noColor || ci,
    headless: !env.isTTY,
  }
}

/** The live environment snapshot from `process` — the single reading both the
 *  boolean guard and the run-entries use, so the snapshot shape lives once. */
export function liveSnapshot(): EnvSnapshot {
  return {
    isTTY: Boolean(process.stdout.isTTY),
    NO_COLOR: process.env.NO_COLOR,
    CI: process.env.CI,
  }
}

/**
 * Warn (to stderr) and report whether the environment is interactive enough to
 * mount an Ink UI. The SINGLE home for the refusal message. It never exits —
 * callers decide. `env` defaults to the live snapshot; tests inject one to
 * reach the refusal branch.
 *
 * Returns true when interactive (caller proceeds); false after writing
 * `<binName> requires an interactive terminal` (caller refuses).
 */
export function warnIfNonInteractive(
  binName: string,
  env: EnvSnapshot = liveSnapshot(),
): boolean {
  if (classifyEnv(env).interactive) return true
  process.stderr.write(`${binName} requires an interactive terminal\n`)
  return false
}

/**
 * Refuse a non-interactive environment by warning and exiting 1. Thin wrapper
 * over `warnIfNonInteractive`; the `process.exit` lives at this app-boundary
 * helper so the app bins stay one-liners while the library run-entries use the
 * boolean form. `binName` is the FULL bin name (e.g. `hexagram-history`).
 */
export function refuseIfNonInteractive(binName: string): void {
  if (!warnIfNonInteractive(binName)) process.exit(1)
}
