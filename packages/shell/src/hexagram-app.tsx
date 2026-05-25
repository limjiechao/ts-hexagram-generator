// `<HexagramApp>` — the root component of the composed `hexagram` CLI. It is
// the composition layer: it holds the `nav-machine` state and renders exactly
// one of the three screens (`<HomeMenu>`, the history browser, the casting
// viewer). The inactive screens are NOT mounted — navigating away unmounts the
// previous screen entirely, so every return is a fresh mount. That fresh-mount
// behaviour is load-bearing:
//
//   - "Browse history" re-scans `consultations/` on every visit (a just-cast
//     consultation therefore shows up the next time history is opened).
//   - Re-entering a casting flow resets it to a blank query.
//
// `<HexagramApp>` owns no screen logic of its own — each child screen owns its
// keymap, scrolling and (for casting) its discard-confirm. The app only wires
// `onExit` / `exitLabel` so the soft-back key (Esc) routes back to Home.

import path from 'node:path'
import process from 'node:process'

import {
  ConsultationViewer,
  type FlowKind,
  type InputMode,
} from '@hexagram/casting-ui'
import { HistoryApp } from '@hexagram/history-ui'
import { useApp } from 'ink'
import { useReducer, type ReactElement } from 'react'

import type { BannerTestOverride, BannerTimingConfig } from './banner-state.js'
import { HomeMenu, type HomeMenuSelection } from './home-menu.js'
import { initialNavState, navReducer } from './nav-machine.js'

/**
 * The casting flags resolved once at startup by `runHexagram()` and threaded
 * straight through to `<ConsultationViewer>`. Bundled into one object so the
 * prop list stays flat and the snapshot is passed atomically — the values are
 * captured before `render()` and never change for the life of the app.
 */
export interface CastingFlags {
  /** `'slider'` (default) or `'number'` — from `--numeric-input`. */
  inputMode: InputMode
  /** Readout prose wrap cap — from `--wrap-width`. */
  maxWrapWidth: number
  /** Slider sweep duration in ms — from `--slider-sweep-ms`. */
  sliderSweepMs: number
  /**
   * Random-flow bounce arm delay in ms — from `--cast-bounce-ms`. The slider
   * bounces freely for this long before auto-landing on the RNG pick. Only
   * the random casting flow consults it.
   */
  castBounceMs: number
  /**
   * Random-flow per-cast text-reveal dwell in ms — from `--cast-reveal-ms`.
   * Drives the number-input mode's progressive casting reveal. Only the
   * random casting flow in number-input mode consults it. `hexagram` is
   * TTY-only but still reaches number-input mode via `--numeric-input`.
   */
  castRevealMs: number
}

/** The label shown after `Esc` in every child screen's footer. */
const EXIT_LABEL = 'Home'

interface HexagramAppProps {
  /**
   * The resolved casting flags. `runHexagram()` snapshots these from
   * `process.argv` and passes them in; tests pass a crafted object.
   */
  castingFlags: CastingFlags
  /**
   * Test-only override for the casting viewer's post-SPACE numeric reveal
   * dwell. Forwarded verbatim to `<ConsultationViewer sliderCommitRevealMs>`.
   * Production never sets this — the viewer's own default applies.
   */
  sliderCommitRevealMs?: number
  /**
   * Test-only override for the home banner animation — an injected RNG and an
   * interval-disable flag. Forwarded verbatim to `<HomeMenu>` →
   * `<AnimatedBanner>`. Production never sets it.
   */
  bannerTestOverride?: BannerTestOverride
  /**
   * Home banner animation cadence. `runHexagram()` snapshots this from
   * `--banner-interval-ms` and passes it in; omitted in tests so the banner
   * uses `DEFAULT_BANNER_TIMING`. Forwarded verbatim to `<HomeMenu>` →
   * `<AnimatedBanner>`.
   */
  bannerTiming?: BannerTimingConfig
}

/**
 * Map a `<HomeMenu>` selection onto the `nav-machine` event that performs the
 * corresponding navigation. Pure — kept module-level so the mapping is one
 * obvious table rather than an inline switch buried in a handler.
 */
function eventForSelection(
  selection: HomeMenuSelection,
): Parameters<typeof navReducer>[1] {
  switch (selection) {
    case 'interactive':
      return { type: 'newInteractiveConsultation' }
    case 'random':
      return { type: 'newRandomConsultation' }
    case 'history':
      return { type: 'browseHistory' }
  }
}

export function HexagramApp({
  castingFlags,
  sliderCommitRevealMs,
  bannerTestOverride,
  bannerTiming,
}: HexagramAppProps): ReactElement {
  const { exit } = useApp()
  const [nav, dispatch] = useReducer(navReducer, initialNavState)

  // Every child screen's soft-back (Esc) routes here → return to Home. The
  // `nav-machine` reducer makes `backToHome` a no-op when already on Home, so
  // this is safe to pass unconditionally.
  const backToHome = (): void => {
    dispatch({ type: 'backToHome' })
  }

  // ── Home ─────────────────────────────────────────────────────────────────
  // The hub menu. A selection dispatches the matching navigation event; Esc on
  // Home is the app's quit (the PRD's "Esc on Home quits" rule), so it routes
  // straight to Ink's program exit rather than through the reducer.
  if (nav.screen === 'home') {
    return (
      <HomeMenu
        onSelect={(selection) => {
          dispatch(eventForSelection(selection))
        }}
        onQuit={exit}
        bannerTestOverride={bannerTestOverride}
        bannerTiming={bannerTiming}
      />
    )
  }

  // ── History ──────────────────────────────────────────────────────────────
  // A fresh `<HistoryApp>` mount every visit — it re-scans `consultations/` on
  // mount, so a consultation cast earlier this session appears here. Esc at
  // the top of the list routes back to Home via `onExit`.
  if (nav.screen === 'history') {
    return (
      <HistoryApp
        dir={path.join(process.cwd(), 'consultations')}
        onExit={backToHome}
        exitLabel={EXIT_LABEL}
      />
    )
  }

  // ── Casting ──────────────────────────────────────────────────────────────
  // The casting viewer COMPONENT (not `runConsultationViewer`, which owns its
  // own `render()`). `flowKind` comes from the nav state; the resolved casting
  // flags are threaded through. Esc routes back to Home — `<ConsultationViewer>`
  // gates that behind its own discard-confirm when there is unsaved progress.
  const flowKind: FlowKind = nav.flowKind
  return (
    <ConsultationViewer
      flowKind={flowKind}
      inputMode={castingFlags.inputMode}
      maxWrapWidth={castingFlags.maxWrapWidth}
      sliderSweepMs={castingFlags.sliderSweepMs}
      castBounceMs={castingFlags.castBounceMs}
      castRevealMs={castingFlags.castRevealMs}
      sliderCommitRevealMs={sliderCommitRevealMs}
      onExit={backToHome}
      exitLabel={EXIT_LABEL}
    />
  )
}
