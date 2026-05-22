// `runHexagram()` — the run entry for the composed `hexagram` CLI. It is the
// imperative shell: the TTY guard, the single `render()` on the alternate
// screen, and the await on the app's exit. The bin (issue #30) is a thin
// wrapper that calls this and then `process.exit()`.
//
// Mirrors `runHistoryViewer` + `apps/cli/src/history.ts`'s split of
// responsibilities: this function refuses non-interactive environments by
// signalling a boolean, renders once, and resolves when the user quits —
// `process.exit()` is left to the caller so the entry stays focused and
// testable.

import process from 'node:process'

import {
  resolveCastBounceMs,
  resolveInputMode,
  resolveSliderSweepMs,
  resolveWrapWidth,
} from '@hexagram/casting-ui'
import { render } from 'ink'

import { HexagramApp, type CastingFlags } from './hexagram-app.js'

/** The stderr message written when the environment is non-interactive. */
const NON_INTERACTIVE_MESSAGE = 'hexagram requires an interactive terminal\n'

/**
 * Whether the current process environment is interactive enough to run the
 * Ink alternate-screen UI. Refuses on a non-TTY stdout, on `NO_COLOR`, and on
 * `CI` — mirroring `hexagram-history`'s guard exactly. `hexagram` is TTY-only:
 * there is no plain-mode fallback, so a non-interactive environment is a hard
 * refusal rather than a degraded mode.
 */
function isInteractiveEnv(): boolean {
  const isTty = Boolean(process.stdout.isTTY)
  const noColor =
    process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== ''
  const ci = process.env.CI !== undefined && process.env.CI !== ''
  return isTty && !noColor && !ci
}

/**
 * Run the composed `hexagram` CLI. Resolves to `true` on a clean quit and
 * `false` when the environment is non-interactive (after writing the refusal
 * to stderr). The caller — the `hexagram` bin — turns that boolean into the
 * process exit code (`0` on a clean quit, `1` on refusal); `runHexagram` never
 * calls `process.exit()` itself, keeping it focused and unit-testable.
 *
 * On a clean run it:
 *   - snapshots the casting flags (`--numeric-input`, `--wrap-width`,
 *     `--slider-sweep-ms`, `--cast-bounce-ms`) from `process.argv` via the
 *     shared resolvers,
 *   - renders `<HexagramApp>` ONCE on the alternate screen with
 *     `exitOnCtrlC: false` — the screens own Ctrl+C (the casting viewer's
 *     discard-confirm depends on Ctrl+C reaching its keymap, not Ink's
 *     built-in instakill),
 *   - awaits `waitUntilExit()` so it resolves only when the user quits.
 */
export async function runHexagram(): Promise<boolean> {
  if (!isInteractiveEnv()) {
    process.stderr.write(NON_INTERACTIVE_MESSAGE)
    return false
  }

  // Snapshot the casting flags once, before render. `hexagram` accepts ONLY
  // the casting flags — not `--plain`/`--no-ui` (it is TTY-only) and not
  // `--convert-legacy` (exclusive to `hexagram-history`).
  const castingFlags: CastingFlags = {
    inputMode: resolveInputMode(),
    maxWrapWidth: resolveWrapWidth(),
    sliderSweepMs: resolveSliderSweepMs(),
    castBounceMs: resolveCastBounceMs(),
  }

  const instance = render(<HexagramApp castingFlags={castingFlags} />, {
    exitOnCtrlC: false,
    alternateScreen: true,
  })
  await instance.waitUntilExit()
  return true
}
