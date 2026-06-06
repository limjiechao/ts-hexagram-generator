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

import {
  resolveCastBounceMs,
  resolveCastRevealMs,
  resolveInputMode,
  resolveSliderSweepMs,
  resolveWrapWidth,
} from '@hexagram/casting-ui'
import { liveSnapshot, warnIfNonInteractive, type EnvSnapshot } from '@hexagram/viewer-core'
import { render } from 'ink'

import { resolveBannerIntervalMs } from './banner-flag.js'
import {
  DEFAULT_BANNER_TICK_MS,
  type BannerTimingConfig,
} from './banner-state.js'
import { HexagramApp, type CastingFlags } from './hexagram-app.js'


/**
 * Run the composed `hexagram` CLI. Resolves to `true` on a clean quit and
 * `false` when the environment is non-interactive (after writing the refusal
 * to stderr). The caller — the `hexagram` bin — turns that boolean into the
 * process exit code (`0` on a clean quit, `1` on refusal); `runHexagram` never
 * calls `process.exit()` itself, keeping it focused and unit-testable.
 *
 * On a clean run it:
 *   - snapshots the casting flags (`--numeric-input`, `--wrap-width`,
 *     `--slider-sweep-ms`, `--cast-bounce-ms`, `--cast-reveal-ms`) and the
 *     `--banner-interval-ms` knob from `process.argv` via the shared
 *     resolvers,
 *   - renders `<HexagramApp>` ONCE on the alternate screen with
 *     `exitOnCtrlC: false` — the screens own Ctrl+C (the casting viewer's
 *     discard-confirm depends on Ctrl+C reaching its keymap, not Ink's
 *     built-in instakill),
 *   - awaits `waitUntilExit()` so it resolves only when the user quits.
 */
export async function runHexagram(env?: EnvSnapshot): Promise<boolean> {
  const snapshot: EnvSnapshot = env ?? liveSnapshot()
  if (!warnIfNonInteractive('hexagram', snapshot)) return false

  // Snapshot the casting flags once, before render. `hexagram` accepts ONLY
  // the casting flags — not `--plain`/`--no-ui` (it is TTY-only) and not
  // `--convert-legacy` (exclusive to `hexagram-history`).
  const castingFlags: CastingFlags = {
    inputMode: resolveInputMode(),
    maxWrapWidth: resolveWrapWidth(),
    sliderSweepMs: resolveSliderSweepMs(),
    castBounceMs: resolveCastBounceMs(),
    castRevealMs: resolveCastRevealMs(),
  }

  // Snapshot the banner cadence in the same pre-render moment. The same `ms`
  // value drives both the static-figure dwell and the pulse dwell — symmetry
  // is enforced inside the state machine, the flag only sizes it.
  const bannerTiming: BannerTimingConfig = {
    intervalMs: resolveBannerIntervalMs(),
    tickMs: DEFAULT_BANNER_TICK_MS,
  }

  const instance = render(
    <HexagramApp castingFlags={castingFlags} bannerTiming={bannerTiming} />,
    {
      exitOnCtrlC: false,
      alternateScreen: true,
    },
  )
  await instance.waitUntilExit()
  return true
}
