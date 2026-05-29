import {
  BOLD_GREEN,
  BOLD_RED,
  BOLD_WHITE,
  isGlobalExitKey,
  NORMAL,
} from '@hexagram/viewer-core'
import { Box, Text, useInput } from 'ink'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react'
import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'

import { armDelayTicks, firstLandingTick } from './bounce-trajectory.js'
import { NumberInput } from './number-input.js'
import type { FlowKind } from './viewer-flow.js'

/**
 * Auto-land configuration for the bouncing slider — supplied only by the
 * random-casting playback. `target` is the RNG-predetermined pick; the slider
 * bounces freely until `armDelayMs` has elapsed, then commits on the first
 * tick its cursor naturally sits on `target` (a real pass-through, never a
 * teleport — see `bounce-trajectory.ts`). Interactive callers pass no
 * `autoLand` and the slider commits on SPACE as before.
 */
export interface SliderAutoLand {
  target: number
  armDelayMs: number
}

// How long `<SliderCastingPrompt>` holds the numeric Left/Right Heap readout
// after the user presses SPACE before forwarding `onSubmit` to the parent
// flow. Long enough that the user can register the cast they just made, short
// enough that 18 reveals don't drag. The viewer remounts the prompt per cast
// (see `viewer.tsx` `<CastingPromptBox key=…>`), so this state is local to a
// single cast.
export const SLIDER_COMMIT_REVEAL_MS = 500

// How long the manual-mode prompt holds its green `∴ LEFT HEAP … SUSPENDED …
// NEXT CAST …` reveal after Enter before forwarding `onSubmit` upstream.
// 2500 ms gives the user time to read the four-field resolved row (heaps,
// suspended count, next-cast unparted) without the eighteen-cast flow
// dragging. Tests opt out via `manualRevealMs={0}` to keep multi-cast
// assertions snappy; the skip-to-advance Enter shortcut lets the user cut
// the dwell short mid-reveal.
export const MANUAL_REVEAL_MS = 2500

// Slider-mode prompt title. The interactive flow instructs the user to press
// SPACE; the random flow auto-drives the slider, so its title just narrates.
// Shared between `<SliderCastingPrompt>` (which renders it) and `viewer.tsx`'s
// `castingPromptContentWidth` (which measures it to size the `<` / `>` pan) so the
// two can never drift — a wider title would silently under-reserve pan space.
export function sliderPromptTitle(
  lineNumber: number,
  castIndex: number,
  isRandomFlow: boolean,
): string {
  const prefix = `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3: —`
  return isRandomFlow
    ? `${prefix} parting the stalks`
    : `${prefix} Press SPACE to part the stalks`
}

// ── Slider primitives ───────────────────────────────────────────────────────

// Braille-spinner glyphs cycled by `tickCount % BRAILLE_SPINNER.length`.
// During the ticking state the spinner replaces the cursor's numeric
// position in the readout below the bar — see `<SliderInput>` /
// `<SliderCastingPrompt>` — so the user sees motion (the slider is alive)
// but not the value (the cast stays unbiased). The glyphs render as
// ` ⠋`/` ⠏` (leading space + 1-column glyph) so each cell is 2 columns
// wide, matching the post-commit padded number. After SPACE,
// `<SliderCastingPrompt>` swaps the glyphs for the concrete
// `Left Heap:  <pick> | Right Heap: <max − pick> + 1 suspended` numbers
// (each pick padStart'd to 2 columns) for `SLIDER_COMMIT_REVEAL_MS` before
// advancing. `<SliderInput>` has no reveal — it keeps the padded spinner
// readout for its whole lifetime.
const BRAILLE_SPINNER = [
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏',
] as const

// `BRAILLE_SPINNER` cycles the dots clockwise. The slider's right-heap glyph
// mirrors the left's motion, so step through the same glyphs in reverse order.
// At `tickCount = 0` both directions show `⠋`; from `tickCount = 1` onward
// the right glyph walks backward through the cycle (⠏, ⠇, ⠧, …).
function reverseBrailleGlyph(tickCount: number): string {
  const length = BRAILLE_SPINNER.length
  const index = (length - (tickCount % length)) % length
  return BRAILLE_SPINNER[index]!
}

interface UseSliderBounceArgs {
  min: number
  max: number
  focused: boolean
  tickMs: number
  onSubmit: (value: number) => void
  // Random-playback auto-land. When set the slider commits itself on the
  // landing tick instead of waiting for SPACE; `null` for the interactive
  // flow, which keeps the SPACE-to-commit behaviour.
  autoLand?: SliderAutoLand | null
  // Random-playback skip. While auto-land is active, SPACE routes here
  // instead of committing the pick — it abandons the rest of the animation.
  // Ignored (and never invoked) when `autoLand` is `null`: the interactive
  // flow keeps SPACE-commits-the-pick. `undefined` is a safe no-op.
  onSkip?: (() => void) | undefined
}

interface SliderSnapshot {
  position: number
  tickCount: number
  // The position captured by an auto-land commit, or `null` while the slider
  // is still bouncing (or was committed by SPACE — that path notifies the
  // parent directly). `useSliderBounce` fires `onSubmit` once when this turns
  // non-null so the parent flow advances exactly as a SPACE commit would.
  autoLanded: number | null
}

/**
 * File-local store backing `useSliderBounce`. Owns the bouncing-cursor
 * position/direction/committed state and the `setInterval` that drives the
 * tick loop. Consumers attach via `subscribe`/`getSnapshot` so React's
 * `useSyncExternalStore` can read the live position without the legacy
 * `useReducer((c) => c + 1, 0)` forced-rerender hack. The interval starts
 * lazily on first subscribe and clears when the last subscriber detaches —
 * no leaked timers.
 *
 * `setRange` is invoked from the hook's render phase so a cast-boundary
 * range change rewinds the cursor synchronously, matching the prior
 * zero-frame-lag behaviour.
 */
class BouncingSliderStore {
  private position: number
  private direction: 1 | -1 = 1
  private committed = false
  private min: number
  private max: number
  private tickMs: number
  private tickCount = 0
  // Random-playback auto-land. `landingTick` is the precomputed tick on which
  // the cursor naturally passes through the RNG target at or after the arm
  // delay (`bounce-trajectory.ts`); `null` disables auto-land (interactive
  // flow). `autoLanded` records the position captured by the auto-land
  // commit so `getSnapshot` can surface it to the hook.
  private autoLand: SliderAutoLand | null
  private landingTick: number | null = null
  private autoLanded: number | null = null
  // Cached so `getSnapshot` returns a referentially-stable reference between
  // ticks — `useSyncExternalStore`'s `Object.is` check relies on this.
  private snapshot: SliderSnapshot
  private readonly listeners = new Set<() => void>()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(
    min: number,
    max: number,
    tickMs: number,
    autoLand: SliderAutoLand | null,
  ) {
    this.min = min
    this.max = max
    this.tickMs = tickMs
    this.position = min
    this.autoLand = autoLand
    this.snapshot = { position: min, tickCount: 0, autoLanded: null }
    this.recomputeLandingTick()
  }

  // Recompute the landing tick from the current range, tickMs and auto-land
  // config. The slider commits itself on this tick — the visible bounce and
  // the landing are the same triangle wave, so the cursor genuinely passes
  // through the target (no teleport). A landing tick of 0 (degenerate
  // single-cell range with no arm delay) is committed immediately, since the
  // interval's first fire is tick 1 and would otherwise never match.
  private recomputeLandingTick(): void {
    this.landingTick =
      this.autoLand === null
        ? null
        : firstLandingTick(
            this.autoLand.target,
            this.min,
            this.max,
            armDelayTicks(this.autoLand.armDelayMs, this.tickMs),
          )
    if (this.landingTick === 0 && !this.committed) {
      this.committed = true
      this.autoLanded = this.position
      this.snapshot = {
        position: this.position,
        tickCount: this.tickCount,
        autoLanded: this.autoLanded,
      }
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (this.listeners.size === 1) this.startTicking()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.stopTicking()
    }
  }

  readonly getSnapshot = (): SliderSnapshot => this.snapshot

  // Called from the hook's render phase. Mutates synchronously so the same
  // render's `getSnapshot()` reflects any rewind (range change) or interval
  // re-arm (tickMs change) — no `notify()`, which would fire the
  // `useSyncExternalStore` subscriber mid-render and trigger React's
  // "setState while rendering" warning. The triggering render commits with
  // the updated state.
  setRange(
    min: number,
    max: number,
    tickMs: number,
    autoLand: SliderAutoLand | null,
  ): void {
    if (
      this.min === min &&
      this.max === max &&
      this.tickMs === tickMs &&
      this.autoLand === autoLand
    )
      return
    const rangeChanged = this.min !== min || this.max !== max
    this.min = min
    this.max = max
    this.tickMs = tickMs
    this.autoLand = autoLand
    this.recomputeLandingTick()
    // Only rewind on a true range change — a bare tickMs change (per-cast
    // sweep duration recalc) re-arms the interval at the new rate but keeps
    // the cursor where it is so the user doesn't see a visual jump. The
    // spinner's tick counter also resets so each new cast restarts at the
    // first glyph (`⠋`).
    if (rangeChanged) {
      this.position = min
      this.direction = 1
      this.committed = false
      this.tickCount = 0
      this.autoLanded = null
      this.snapshot = { position: min, tickCount: 0, autoLanded: null }
    }
    // Restart the tick timer so the next tick is a full `tickMs` away and
    // picks up the new interval — matches the pre-refactor
    // `useEffect([min, max, …])` behaviour for range changes, and also re-arms
    // the interval at the new rate when only `tickMs` changes.
    if (this.intervalId !== null) {
      this.stopTicking()
      this.startTicking()
    }
  }

  commit(): number {
    this.committed = true
    return this.position
  }

  private startTicking(): void {
    if (this.intervalId !== null) return
    this.intervalId = setInterval(() => {
      if (this.committed) return
      let next = this.position + this.direction
      if (next > this.max) {
        this.direction = -1
        next = this.max - 1
      } else if (next < this.min) {
        this.direction = 1
        next = this.min + 1
      }
      this.position = next
      this.tickCount += 1
      // Auto-land — the random flow commits itself on the precomputed landing
      // tick. The cursor reached `next` by the same bounce maths the
      // trajectory module models, so `next` IS the target here: a genuine
      // pass-through, not a teleport. The interval keeps running but the
      // `this.committed` guard above freezes the cursor.
      if (this.landingTick !== null && this.tickCount === this.landingTick) {
        this.committed = true
        this.autoLanded = next
      }
      this.snapshot = {
        position: next,
        tickCount: this.tickCount,
        autoLanded: this.autoLanded,
      }
      this.notify()
    }, this.tickMs)
  }

  private stopTicking(): void {
    if (this.intervalId === null) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}

// Stable no-op subscriber used when `focused` is false — `useSyncExternalStore`
// requires a referentially-stable subscribe function, so we hoist this rather
// than inline a fresh closure on every render. The listener argument is
// intentionally unread: we never need to notify when the slider is unfocused.
const noopSubscribe = (): (() => void) => () => {}

/**
 * Headless bouncing-slider state. Drives a cursor between `min..max` at
 * `tickMs` intervals, bouncing off both endpoints, and commits the current
 * position via `onSubmit` when SPACE is pressed. Backed by a file-local
 * `BouncingSliderStore` consumed via `useSyncExternalStore`; the store owns
 * the interval and clears it whenever the last subscriber unmounts (or
 * `focused` toggles off, which swaps in a noop subscribe).
 *
 * Reset semantics: whenever `min` or `max` changes (i.e. a new cast), the
 * position rewinds to `min`, the direction flips back to +1, and the commit
 * flag clears. A bare `tickMs` change re-arms the interval at the new rate
 * but preserves the cursor position. `setRange` runs in the hook's render
 * phase so the reset is visible on the same frame — no `useEffect` lag.
 */
function useSliderBounce({
  min,
  max,
  focused,
  tickMs,
  onSubmit,
  autoLand = null,
  onSkip,
}: UseSliderBounceArgs): SliderSnapshot {
  const storeRef = useRef<BouncingSliderStore | null>(null)
  storeRef.current ??= new BouncingSliderStore(min, max, tickMs, autoLand)
  // Render-phase sync — preserves zero-frame-lag rewind on cast-boundary
  // range changes (or tickMs changes), exactly like the previous
  // prevRangeRef branch.
  storeRef.current.setRange(min, max, tickMs, autoLand)

  const snapshot = useSyncExternalStore(
    focused ? storeRef.current.subscribe : noopSubscribe,
    storeRef.current.getSnapshot,
    storeRef.current.getSnapshot,
  )

  // Latest-`onSkip` ref so the `useInput` handler always calls the current
  // callback without `useInput` re-subscribing when the parent hands a fresh
  // closure — mirrors the `onSubmitRef` pattern in `<SliderCastingPrompt>`.
  const onSkipRef = useRef(onSkip)
  useEffect(() => {
    onSkipRef.current = onSkip
  })

  useInput(
    (input, key) => {
      // Global exit keys (Ctrl+C / Esc) keep their existing behaviour — they
      // are never a commit and never a skip.
      if (isGlobalExitKey(input, key)) return
      if (input !== ' ') return
      // During random playback (auto-land active) SPACE abandons the rest of
      // the animation — route it to the skip callback. This fires whether the
      // slider is still ticking or already in its post-land reveal dwell, as
      // this handler stays mounted for the whole cast.
      //
      // `autoLand` is read straight from the closure here — no `onSkipRef`-style
      // latest-value ref — because, unlike `onSkip`, it cannot change within a
      // cast: `viewer.tsx` memoizes the auto-land config, and the prompt is
      // keyed per cast (`<CastingPromptBox key=…>`) so it remounts rather than
      // re-renders across casts. The closure therefore always holds the value
      // for the current cast's lifetime. `onSkip` still needs the ref because
      // the parent hands it a fresh inline closure on every pan re-render.
      if (autoLand !== null) {
        onSkipRef.current?.()
        return
      }
      // The interactive flow commits the current pick on SPACE.
      onSubmit(storeRef.current!.commit())
    },
    { isActive: focused },
  )

  // Auto-land bridge: when the store commits itself (`autoLanded` turns
  // non-null) fire `onSubmit` exactly once so the parent flow advances just
  // as a SPACE commit would. A ref guards against a double-fire if the
  // component re-renders before the next cast remounts the slider.
  const autoLandFiredRef = useRef(false)
  useEffect(() => {
    if (snapshot.autoLanded !== null && !autoLandFiredRef.current) {
      autoLandFiredRef.current = true
      onSubmit(snapshot.autoLanded)
    }
  }, [snapshot.autoLanded, onSubmit])

  return snapshot
}

// Build the bar string from a position. `▕` + (cursorIndex × ░) + `█` +
// (remaining × ░) + `▏`. Each cell measures one display column under
// `string-width@8`, so the rendered bar's total width is `cells + 2`.
function buildSliderBar(position: number, min: number, max: number): string {
  const cells = max - min + 1
  const cursorIndex = Math.max(0, Math.min(cells - 1, position - min))
  const left = '░'.repeat(cursorIndex)
  const right = '░'.repeat(Math.max(0, cells - cursorIndex - 1))
  return `▕${left}█${right}▏`
}

interface SliderInputProps {
  min: number
  max: number
  focused: boolean
  onSubmit: (value: number) => void
  /** Tick interval in ms — defaults to 80, which sweeps `max=48` in ~3.8 s. */
  tickMs?: number
  /**
   * Fired exactly once, after this component's mount effects have committed
   * — by which point `useSliderBounce`'s `useInput` has registered with
   * Ink's stdin dispatcher. Tests use this as a positive witness that SPACE
   * presses will reach the slider's handler, closing the bind race where a
   * keystroke written between render-commit and bind would be dispatched to
   * ancestor handlers and silently swallowed (see the 9-round CI
   * stabilisation post-mortem). Defensive: guarded by a `firedRef` so a
   * StrictMode double-mount can't double-fire.
   */
  onReady?: () => void
}

/**
 * Bouncing-slider input — replaces the typed `<NumberInput>` when the viewer
 * is in slider mode. The cursor sweeps 1 cell per tick, bouncing off `min`
 * and `max`; pressing SPACE commits the current value via `onSubmit`. Bar
 * width = `max - min + 1` cells (Option A: 1 cell = 1 value).
 *
 * Renders two centred rows via Ink flexbox: the bar, and a
 * `Stalks: <max + 1> | Left Heap:  <glyph> | Right Heap:  <glyph> + 1 suspended`
 * readout where both glyphs are Braille spinners advanced one frame per tick —
 * the left walks the cycle clockwise, the right walks it anticlockwise.
 * `Stalks` is `max + 1`, not `max`: `max` is only the left-heap pick
 * ceiling, held one short of the true stalk count so the right heap always
 * retains a stalk to suspend (掛一以象三). That suspended stalk — taken from
 * the right heap (see `suspendOneFromTheRight` in `@hexagram/core`) — is the
 * trailing `+ 1 suspended` on the right readout, so the row conserves:
 * left (pick) + right (max − pick) + 1 suspended = max + 1 stalks.
 * Each heap cell is pre-padded with a leading space so its rendered width
 * (2 columns) matches the post-commit numeric form in
 * `<SliderCastingPrompt>` — no lateral shift between modes. The spinners
 * deliberately hide the live cursor value so the user commits without bias
 * toward a specific number; the bar already conveys motion visually.
 * `<CastingPromptBox>` uses `useSliderBounce` directly so it can pre-slice
 * the bar/readout strings for horizontal scrolling on narrow terminals; this
 * component is the testable surface for the slider in isolation.
 */
export function SliderInput({
  min,
  max,
  focused,
  onSubmit,
  tickMs = 80,
  onReady,
}: SliderInputProps): ReactElement {
  const { position, tickCount } = useSliderBounce({
    min,
    max,
    focused,
    tickMs,
    onSubmit,
  })
  // Mount-witness effect. Registered AFTER `useSliderBounce` (which calls
  // `useInput` internally) so React's commit-phase effect-flush runs
  // `useInput`'s bind effect first; by the time this fires, the stdin
  // listener is live. Guarded by `onReadyFiredRef` so it only fires on the
  // first commit per mount — defensive against a re-render before unmount.
  const onReadyFiredRef = useRef(false)
  useEffect(() => {
    if (onReadyFiredRef.current) return
    onReadyFiredRef.current = true
    onReady?.()
  }, [onReady])
  const bar = buildSliderBar(position, min, max)
  // Pad to a stable 2-column cell width so the readout never shifts laterally
  // when the glyph swaps to a 1- or 2-digit pick (see `<SliderCastingPrompt>`
  // for the post-commit numeric form).
  const leftGlyph = ` ${BRAILLE_SPINNER[tickCount % BRAILLE_SPINNER.length]!}`
  const rightGlyph = ` ${reverseBrailleGlyph(tickCount)}`
  return (
    <Box flexDirection="column" flexShrink={0}>
      <Box justifyContent="center">
        <Text>{bar}</Text>
      </Box>
      <Box justifyContent="center">
        <Text>{`Stalks: ${max + 1} | Left Heap: ${leftGlyph} | Right Heap: ${rightGlyph} + 1 suspended`}</Text>
      </Box>
    </Box>
  )
}

// ── CastingPromptBox ────────────────────────────────────────────────────────

export type CastingInputMode = 'slider' | 'number'

/**
 * Rendered height of `<CastingPromptBox>` for a given mode + error state,
 * border included. Colocated with the component because the viewer reserves
 * vertical space for the prompt before mounting it — keeping the contract
 * here means a new input mode can't drift the two numbers out of sync.
 *
 *   slider mode → 5 content rows (title + blank + bar + blank + readout) → 7
 *                 with border
 *   number mode → 2 content rows + optional error → 5 normally, 6 with error
 *   manual flow → always 22 — the vertical flow diagram: slim title / blank /
 *                 2-row UNPARTED header (readout + branch) / 10-row
 *                 heap-card band (LEFT + RIGHT, with the question + dim range
 *                 hint + 3-row drawn-box input + step dots mapped onto the
 *                 right of the band) / 4-row COUNTED/MISSING footer (join +
 *                 COUNTED + rule + MISSING) / blank / feedback strip
 *                 → 20 content rows + 2 border. The feedback strip renders
 *                 one of three branches: editing (blank, or "Press Enter to
 *                 commit" once valid), error (BOLD_RED suspended-sum /
 *                 zero-remainder message), or resolved (BOLD_GREEN next-cast
 *                 unparted) — all with a `Shift+Tab: go back` hint. The
 *                 MISSING gauge owns conservation feedback (red on a wrong
 *                 completed total, green when commit-ready). All rows are
 *                 pre-built ANSI text and sliced by `horizontalOffset` for the
 *                 viewer's narrow-terminal `<` / `>` pan, like the slider.
 */
export function getCastingPromptHeight(
  inputMode: CastingInputMode,
  hasError: boolean,
  flowKind: FlowKind = 'interactive',
): number {
  if (flowKind === 'manual') return 22
  if (inputMode === 'slider') return 7
  return hasError ? 6 : 5
}

// Pre-pad `content` (display width `contentWidth`) with leading spaces so it
// centres within `total` columns, then trail-fill to exactly `total` columns
// so successive slices land at predictable offsets.
function padCenter(
  content: string,
  contentWidth: number,
  total: number,
): string {
  if (total <= contentWidth) return content
  const leading = Math.floor((total - contentWidth) / 2)
  const trailing = total - leading - contentWidth
  return `${' '.repeat(leading)}${content}${' '.repeat(Math.max(0, trailing))}`
}

interface CastingPromptBoxProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  min: number
  max: number
  width: number
  inputMode: CastingInputMode
  // Number-mode plumbing — ignored when inputMode === 'slider'.
  buffer?: string
  error?: string | null
  onChange?: (next: string) => void
  onError?: (message: string | null) => void
  // Shared:
  onSubmit: (parsed: number) => void
  /** Slider-mode tick interval; defaults to 80 ms (see `<SliderInput>`). */
  tickMs?: number
  /**
   * Horizontal pan offset, in display columns, applied to slider-mode rows
   * for narrow terminals. The viewer drives this via `<` / `>` during the casting
   * phase. Ignored in number mode (which has no overflow).
   */
  horizontalOffset?: number
  /**
   * Slider-mode auto-land config — supplied only by the random-casting
   * playback. When set the bouncing cursor commits itself on the
   * RNG-predetermined pick after the arm delay; the title also drops the
   * SPACE instruction. Absent for the interactive flow (SPACE-to-commit).
   */
  autoLand?: SliderAutoLand | null
  /**
   * Slider-mode skip callback — supplied only by the random-casting playback
   * (alongside `autoLand`). While auto-land is active, SPACE routes here to
   * abandon the rest of the animation instead of committing a pick. Absent
   * for the interactive flow, whose SPACE commits the cast as before.
   */
  onSkip?: () => void
  /**
   * Slider-mode reveal duration in ms — how long the post-SPACE numeric
   * `Left Heap` / `Right Heap` readout holds before `onSubmit` fires upstream.
   * Defaults to `SLIDER_COMMIT_REVEAL_MS`. Tests opt out by passing `0` to
   * keep multi-cast flow assertions snappy.
   */
  commitRevealMs?: number
  /**
   * Slider-mode mount-witness callback. Forwarded to the underlying
   * `<SliderCastingPrompt>` / `<SliderInput>` and fired exactly once per
   * mount, after `useSliderBounce`'s `useInput` has registered with Ink's
   * stdin dispatcher. Tests gate cross-cast SPACE presses on this signal
   * instead of polling the Braille spinner glyph (the prior incidental
   * proxy). Also fired by the manual-flow branch from the same useEffect
   * that binds its parent `useInput` (Tab + Enter).
   */
  onReady?: () => void
  /**
   * Which casting flow is mounted. `'manual'` swaps the slider/number prompt
   * for the two-field piles+remainder input that drives the physical-yarrow
   * transcription flow. Defaults to `'interactive'` so existing callers stay
   * source-compatible.
   */
  flowKind?: FlowKind
  /**
   * Manual-mode reveal duration in ms — how long the post-Enter
   * `→ Round resolved: …` row holds before `onSubmit` fires upstream.
   * Defaults to `MANUAL_REVEAL_MS`. Tests opt out by passing `0`. Ignored
   * outside `flowKind === 'manual'`.
   */
  manualRevealMs?: number
  /**
   * Manual-mode current-round unparted count — the `M` in the
   * `Unparted stalks: M` row and the basis for the per-field bounds
   * (`piles ∈ [0, floor((max-1)/4)]`, `remainder ∈ [1, 4]`) plus the
   * cross-field range check (derived split ∈ `[1, max-1]`). Conventionally
   * equals `max + 1` (the casting hook keeps `currentMax = unparted - 1`).
   * Required when `flowKind === 'manual'`; ignored otherwise.
   */
  unpartedStalks?: number
  /**
   * Test-only manual-flow focus witness — fires whenever the focused field
   * cycles between `pilesL`, `remL`, `pilesR`, `remR`. Production callers
   * omit it; tests gate Tab→digit pairs on the callback to bypass Ink's
   * `useInput` bind race (see `superpowers:ink-useinput-bind`). Ignored
   * outside `flowKind === 'manual'`.
   */
  onFocusedFieldChange?: (field: ManualFocusedField) => void
}

/**
 * The bordered prompt that hosts the casting input during the flow.
 *
 * Two visual modes:
 *  - **slider** (default): five-row layout — verbatim title, blank spacer,
 *    centred bouncing-slider bar, blank spacer, centred
 *    `Stalks: <max + 1> | Left Heap:  <spinner> | Right Heap:  <spinner> + 1 suspended`
 *    readout (both Braille glyphs advanced one frame per tick — the left
 *    walks the cycle clockwise, the right anticlockwise; the live cursor
 *    value stays hidden). `Stalks` is `max + 1` — the true stalk count —
 *    because `max` is only the left-heap pick ceiling, held one short so the
 *    right heap keeps a stalk to suspend (掛一); that suspended stalk is the
 *    trailing `+ 1 suspended` on the right. Each heap cell — both glyph and
 *    pick — is rendered at a stable 2-column width so the readout never
 *    shifts laterally across the ticking → reveal transition or across
 *    (pick, max − pick) splits of differing digit counts. On SPACE, the
 *    cursor freezes and the readout swaps the glyphs for the concrete
 *    `Left Heap: <pick> | Right Heap: <max − pick> + 1 suspended` (each value
 *    padStart'd to 2 columns) for `SLIDER_COMMIT_REVEAL_MS` before
 *    `onSubmit` fires upstream — see the state list on
 *    `<SliderCastingPrompt>`. Rows are pre-built strings padded to at
 *    least the inner box width and sliced via `sliceAnsi` against
 *    `horizontalOffset`, so the box never reflows on narrow terminals
 *    (`<` / `>` in the viewer pans it).
 *  - **number**: the legacy typed-number prompt + `<NumberInput>` row.
 *    Unchanged from before the slider feature; opted into via
 *    `--numeric-input`.
 *
 * Rendered height: slider mode = 7 (border 2 + 5 content rows). Number mode
 * = 5 rows normally, 6 when `error !== null`. The viewer's layout maths
 * accounts for both via `castingPromptHeight`.
 */
export function CastingPromptBox({
  lineNumber,
  castIndex,
  min,
  max,
  width,
  inputMode,
  buffer = '',
  error = null,
  onChange,
  onError,
  onSubmit,
  tickMs = 80,
  horizontalOffset = 0,
  commitRevealMs = SLIDER_COMMIT_REVEAL_MS,
  autoLand = null,
  onSkip,
  onReady,
  flowKind = 'interactive',
  manualRevealMs = MANUAL_REVEAL_MS,
  unpartedStalks,
  onFocusedFieldChange,
}: CastingPromptBoxProps): ReactElement {
  if (flowKind === 'manual') {
    // Defensive default — the viewer threads `unpartedStalks` explicitly, but
    // callers that omit it for `flowKind === 'manual'` get a sensible
    // baseline (current round's unparted == max + 1). This matches the
    // `useLineGenerator` invariant that `currentMax = unparted - 1`.
    const unparted = unpartedStalks ?? max + 1
    return (
      <ManualCastingPrompt
        lineNumber={lineNumber}
        castIndex={castIndex}
        width={width}
        unpartedStalks={unparted}
        manualRevealMs={manualRevealMs}
        horizontalOffset={horizontalOffset}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />
    )
  }
  if (inputMode === 'slider') {
    return (
      <SliderCastingPrompt
        lineNumber={lineNumber}
        castIndex={castIndex}
        min={min}
        max={max}
        width={width}
        tickMs={tickMs}
        horizontalOffset={horizontalOffset}
        commitRevealMs={commitRevealMs}
        autoLand={autoLand}
        onSkip={onSkip}
        onSubmit={onSubmit}
        onReady={onReady}
      />
    )
  }

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{`Line ${lineNumber}/6 · Cast ${castIndex + 1}/3`}</Text>
      <Box flexDirection="row">
        <Text>{`Divide the stalks. Pick a number from ${min} to ${max}: `}</Text>
        <NumberInput
          value={buffer}
          focused
          min={min}
          max={max}
          onChange={onChange ?? (() => {})}
          onSubmit={onSubmit}
          onError={onError ?? (() => {})}
        />
      </Box>
      {error !== null && <Text>{`${BOLD_RED}${error}${NORMAL}`}</Text>}
    </Box>
  )
}

interface SliderCastingPromptProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  min: number
  max: number
  width: number
  tickMs: number
  horizontalOffset: number
  commitRevealMs: number
  autoLand: SliderAutoLand | null
  onSkip: (() => void) | undefined
  onSubmit: (value: number) => void
  /**
   * Mount-witness — see `CastingPromptBoxProps.onReady`. Fired exactly once
   * per mount, after `useSliderBounce`'s `useInput` has registered with
   * Ink's stdin dispatcher.
   */
  onReady?: () => void
}

/**
 * Slider-mode body of `<CastingPromptBox>`. Owns the bouncing state via
 * `useSliderBounce` and renders five sliced rows (title, blank, bar, blank,
 * readout) so the box content never reflows on narrow terminals — the viewer
 * can pan `<` / `>` to scroll instead.
 *
 * Three visual states drive the readout row:
 *  1. **Ticking** — the cursor sweeps and the readout shows two
 *     counter-rotating Braille spinners (live cursor value hidden so the
 *     cast stays unbiased).
 *  2. **Reveal** — SPACE captures the picked value into local `committed`
 *     state; the cursor freezes (`BouncingSliderStore.commit()` sets the
 *     internal flag) and the readout swaps the glyphs for the concrete
 *     `Left Heap: <pick> | Right Heap: <max − pick> + 1 suspended` numbers,
 *     each padStart'd to 2 columns so the row width matches the ticking state.
 *  3. **Advance** — after `SLIDER_COMMIT_REVEAL_MS`, the parent's `onSubmit`
 *     fires and the viewer advances to the next cast (which remounts a
 *     fresh `<SliderCastingPrompt>` via the keyed `<CastingPromptBox>` in
 *     `viewer.tsx`).
 *
 * `focused: true` is hardcoded because this component is only mounted while
 * the casting prompt is active; `useSliderBounce`'s `noopSubscribe` branch
 * is therefore unreachable in current callers. If a future change passes a
 * dynamic `focused` prop, audit `useSliderBounce` to add a real
 * stop-ticking path on unsubscribe.
 */
function SliderCastingPrompt({
  lineNumber,
  castIndex,
  min,
  max,
  width,
  tickMs,
  horizontalOffset,
  commitRevealMs,
  autoLand,
  onSkip,
  onSubmit,
  onReady,
}: SliderCastingPromptProps): ReactElement {
  const [committed, setCommitted] = useState<number | null>(null)

  const handleStoreCommit = useCallback((value: number) => {
    setCommitted(value)
  }, [])

  // Ref pattern: the timer must read the LATEST onSubmit when it fires, but
  // the effect must NOT re-run when onSubmit's identity changes. Otherwise
  // any parent re-render (e.g. `<` / `>` pan during the post-SPACE reveal) would
  // produce a new inline-arrow onSubmit, cleanup the pending timeout, and
  // restart the 1-second dwell from zero — potentially stalling indefinitely
  // on the 18th cast.
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSubmitRef.current = onSubmit
  })

  useEffect(() => {
    if (committed === null) return
    const timer = setTimeout(() => {
      onSubmitRef.current(committed)
    }, commitRevealMs)
    return () => {
      clearTimeout(timer)
    }
  }, [committed, commitRevealMs])

  const { position, tickCount } = useSliderBounce({
    min,
    max,
    focused: true,
    tickMs,
    onSubmit: handleStoreCommit,
    autoLand,
    onSkip,
  })

  // Mount-witness effect — see `SliderInput`'s sibling effect for the full
  // rationale. Registered AFTER `useSliderBounce` (which calls `useInput`
  // internally) so React's commit-phase effect-flush runs `useInput`'s bind
  // effect first; by the time this fires, the stdin listener is live and
  // tests can safely write the next keystroke. Guarded by `onReadyFiredRef`
  // so it only fires on the first commit per mount.
  const onReadyFiredRef = useRef(false)
  useEffect(() => {
    if (onReadyFiredRef.current) return
    onReadyFiredRef.current = true
    onReady?.()
  }, [onReady])

  // The random flow auto-drives the slider, so its title describes the
  // stalks being parted rather than instructing the user to press SPACE.
  const title = sliderPromptTitle(lineNumber, castIndex, autoLand !== null)
  const bar = buildSliderBar(position, min, max)
  // Both cells render at a stable 2-column width — leading-space + glyph
  // during ticking, and padStart(2) on the numeric pick after commit — so the
  // centred readout never shifts laterally across the ticking → reveal
  // transition or between (pick, max − pick) splits of differing digit counts.
  const leftCell =
    committed === null
      ? ` ${BRAILLE_SPINNER[tickCount % BRAILLE_SPINNER.length]!}`
      : String(committed).padStart(2, ' ')
  const rightCell =
    committed === null
      ? ` ${reverseBrailleGlyph(tickCount)}`
      : String(max - committed).padStart(2, ' ')
  const readout = `Stalks: ${max + 1} | Left Heap: ${leftCell} | Right Heap: ${rightCell} + 1 suspended`

  const titleWidth = stringWidth(title)
  const barWidth = stringWidth(bar)
  const readoutWidth = stringWidth(readout)
  const innerContentWidth = Math.max(1, width - 2)
  const renderWidth = Math.max(
    innerContentWidth,
    titleWidth,
    barWidth,
    readoutWidth,
  )

  const slice = (s: string): string =>
    sliceAnsi(s, horizontalOffset, horizontalOffset + innerContentWidth)

  const titleRow = slice(padCenter(title, titleWidth, renderWidth))
  const barRow = slice(padCenter(bar, barWidth, renderWidth))
  const readoutRow = slice(padCenter(readout, readoutWidth, renderWidth))
  const blankRow = slice(padCenter('', 0, renderWidth))

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{titleRow}</Text>
      <Text>{blankRow}</Text>
      <Text>{barRow}</Text>
      <Text>{blankRow}</Text>
      <Text>{readoutRow}</Text>
    </Box>
  )
}

// ── Manual flow ─────────────────────────────────────────────────────────────

/**
 * The four input fields owned by `<ManualCastingPrompt>`, in forward Tab
 * order. Production callers don't see this — it's exposed for the
 * `onFocusedFieldChange` test witness only.
 */
export type ManualFocusedField = 'pilesL' | 'remL' | 'pilesR' | 'remR'

// Forward Tab order for the four manual fields. Used by `manualTitleRow`,
// the forthcoming row-builder helpers, and the `useInput` Tab handler in
// `<ManualCastingPrompt>`. Module-scope so all consumers stay in lockstep.
const MANUAL_FIELD_ORDER: readonly ManualFocusedField[] = [
  'pilesL',
  'remL',
  'pilesR',
  'remR',
] as const

/**
 * Slim one-line manual-flow title: `Line N/6 · Cast C/3 · Step P/4`. The
 * step ordinal is the focused field's 1-based index in `MANUAL_FIELD_ORDER`
 * (cosmetic — navigation stays free Tab-cycling). The step-progress dots
 * relocated out of the title into the right pane; see `stepDotsRow`.
 */
export function manualTitleRow(
  lineNumber: number,
  castIndex: number,
  focusedField: ManualFocusedField,
): string {
  const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
  return `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3 · Step ${stepIndex + 1}/4`
}

/**
 * The 7-col step-progress dots strip — `● ● ● ○` — shown in the right pane
 * beside the `Total` row. Positions ≤ the focused field's index are `●`, the
 * rest `○`. Cosmetic focus indicator; mirrors the title's `Step P/4` ordinal.
 */
export function stepDotsRow(focusedField: ManualFocusedField): string {
  const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
  return MANUAL_FIELD_ORDER.map((_, i) => (i <= stepIndex ? '●' : '○')).join(
    ' ',
  )
}

// State discriminant shared between the diagram, question panel, and bottom
// strip row builders. Drives editing → error → resolved styling cues
// (inverse-video on active cells, BOLD_GREEN wraps, etc).
export type ManualDiagramState = 'editing' | 'error' | 'resolved'

interface TwoHeapDiagramRowsArgs {
  pilesL: number | null
  remL: number | null
  pilesR: number | null
  remR: number | null
  focusedField: ManualFocusedField
  state: ManualDiagramState
}

// Card interior width (between the two vertical pipes). 17 cols accommodates
// `LEFT HEAP` / `RIGHT HEAP` headers, `= XX stalks` totals (up to 3 digits),
// and the full-word `remainder` / `suspended` labels.
const HEAP_CARD_INTERIOR = 17

// Reserved width of the leading label column inside a content row: 2-col
// pad + longest label `remainder` (9 cols) = 11. Values are right-aligned
// within the remaining `interior - 11 - 2 (right margin)` cols.
const HEAP_LABEL_COL_WIDTH = 11

// ── Heap-card field palette (Scheme B "Cyan compute") ───────────────────
// The left-panel heap cards render three visual tiers in the editing/error
// states (per the casting-prompt colour spec):
//   • inert    — labels, the static `Fours × 4`, the `Suspended + 1` row →
//               dimmed (SGR 2 … 22), so structure recedes.
//   • computed — the derived `Subtotal` / `Total` values → cyan (SGR 36 …
//               39, a foreground-only reset so nothing else is disturbed).
//   • input    — the typed `Piles` / `Remainder` values → BOLD_WHITE, the
//               highest static prominence; the *focused* cell overrides this
//               with inverse-video (see `cellText`).
// All three are SUPPRESSED in the resolved state, where `twoHeapDiagramRows`
// wraps each whole row in BOLD_GREEN — an interior `[0m` / `[39m` / `[22m`
// reset would terminate that green run early. `colorize` (= state !==
// 'resolved') gates every wrap below.
const FIELD_DIM = '\u001B[2m'
const FIELD_DIM_OFF = '\u001B[22m'
const FIELD_CYAN = '\u001B[36m'
const FIELD_FG_RESET = '\u001B[39m'

// One ANSI inverse-video cell. Empty value renders a single inverse space
// so an active cell never collapses (the cursor is always visible).
function inverseCell(value: number | null): string {
  const inner = value === null ? ' ' : String(value)
  return `\u001B[7m${inner}\u001B[27m`
}

// One bold-white input cell — the unfocused-but-editable rendering of a typed
// `Piles` / `Remainder` value (the focused cell uses `inverseCell` instead).
// `null` renders the same `?` placeholder `plainCell` uses, kept bold so an
// untyped input field still reads as a live field awaiting entry.
function boldInputCell(value: number | null): string {
  return `${BOLD_WHITE}${plainCell(value)}${NORMAL}`
}

// Plain (no styling) representation: integer for non-null, `?` for null.
function plainCell(value: number | null): string {
  return value === null ? '?' : String(value)
}

function cellText(
  value: number | null,
  field: ManualFocusedField,
  focusedField: ManualFocusedField,
  state: ManualDiagramState,
): string {
  // Resolved: stay plain so the outer BOLD_GREEN wrap (applied per row in
  // `twoHeapDiagramRows`) covers the whole card uniformly — a bold-white or
  // inverse cell here would punch a hole in the green run.
  if (state === 'resolved') return plainCell(value)
  // Focus indicator (inverse-video) stays visible while the user can still
  // edit — i.e. anything except the post-commit resolved state. Previously
  // it was restricted to `editing` only, which caused the indicator to
  // vanish when the user Shift+Tabbed back into a form whose validator was
  // surfacing a conservation/suspended-sum/zero-remainder error.
  if (focusedField === field) return inverseCell(value)
  // Unfocused but still editable → Scheme B input tier: bold white, the
  // highest static prominence among the three field tiers.
  return boldInputCell(value)
}

// Pre-built cell strings for a single heap card. `pilesCell` / `remCell` are
// the styled (?/value/inverse) raw inputs; `subtotalLabel` / `totalLabel` are
// the live derived numerics (untyped → 0); `suspendedCell` is `'1'` on RIGHT,
// `null` on LEFT (renders a blank slot for vertical alignment).
interface CardCellArgs {
  header: string
  pilesCell: string
  subtotalLabel: string
  remCell: string
  suspendedCell: string | null
  totalLabel: string
  // Scheme B field colouring — `true` in editing/error (dim labels + inert
  // values, cyan computed values), `false` in resolved (the caller wraps each
  // row BOLD_GREEN, so interior colour resets must be withheld).
  colorize: boolean
}

// One full-width interior separator rule: `│  ─────────────  │`.
function cardSeparatorRow(): string {
  const margin = 2
  const rule = '─'.repeat(Math.max(0, HEAP_CARD_INTERIOR - margin * 2))
  return `│${' '.repeat(margin)}${rule}${' '.repeat(margin)}│`
}

// Build a single card's 10 rows: header / Piles / Fours ×4 / separator /
// Subtotal / Remainder / Suspended-or-blank / separator / Total / footer.
// `Remainder` and `Suspended` carry a `+ ` prefix; `Fours` is the static
// `× 4` multiplier. The footer carries a centred `┬` tee feeding the
// convergence connector below the card band.
function buildCardRows(args: CardCellArgs): readonly string[] {
  const {
    header,
    pilesCell,
    subtotalLabel,
    remCell,
    suspendedCell,
    totalLabel,
    colorize,
  } = args
  // Scheme B wraps: dim for the inert tier (labels, `× 4`, `+ 1`), cyan for
  // the computed tier (Subtotal / Total). Identity functions when `colorize`
  // is false so the resolved-state BOLD_GREEN wrap stays unbroken.
  const dim = (s: string): string =>
    colorize ? `${FIELD_DIM}${s}${FIELD_DIM_OFF}` : s
  const cyan = (s: string): string =>
    colorize ? `${FIELD_CYAN}${s}${FIELD_FG_RESET}` : s
  // Header: `┌── HEADER ─...─┐` — fills interior with dashes around the header.
  const headerInner = ` ${header} `
  const leadingDashes = '─'.repeat(2)
  const trailingDashes = '─'.repeat(
    Math.max(0, HEAP_CARD_INTERIOR - headerInner.length - 2),
  )
  const headerRow = `┌${leadingDashes}${headerInner}${trailingDashes}┐`

  // Field row: `│  LABEL    {cell}  │`. The pre-cell column is
  // HEAP_LABEL_COL_WIDTH chars wide (2-col pad + label padded to 9). The
  // remaining interior is `interior - labelCol - rightMargin` cols; the
  // cell value is right-aligned within that space (gap goes BEFORE the
  // value so it visually anchors to the right edge of the card). ANSI in
  // `cell` (inverse-video) is width-discounted via `stringWidth`.
  const buildField = (label: string, cell: string): string => {
    // Label sits in the inert tier — dim it AFTER padding so the column width
    // (HEAP_LABEL_COL_WIDTH) is computed from the bare text, not the codes.
    const labelPadded = dim(`  ${label}`.padEnd(HEAP_LABEL_COL_WIDTH, ' '))
    const cellWidth = stringWidth(cell)
    const rightMargin = 2
    const innerGap = Math.max(
      0,
      HEAP_CARD_INTERIOR - HEAP_LABEL_COL_WIDTH - cellWidth - rightMargin,
    )
    return `│${labelPadded}${' '.repeat(innerGap)}${cell}${' '.repeat(rightMargin)}│`
  }

  const pilesRow = buildField('Piles', pilesCell)
  // `Fours × 4` is a static multiplier — inert tier, fully dimmed.
  const foursRow = buildField('Fours', dim('× 4'))
  // Subtotal / Total are derived — computed tier, cyan.
  const subtotalRow = buildField('Subtotal', cyan(subtotalLabel))
  const remRow = buildField('Remainder', `+ ${remCell}`)
  const suspendedRow =
    suspendedCell === null
      ? `│${' '.repeat(HEAP_CARD_INTERIOR)}│`
      : // The `+ 1` suspended stalk is a constant — inert tier, dimmed whole.
        buildField('Suspended', dim(`+ ${suspendedCell}`))
  const totalRow = buildField('Total', cyan(totalLabel))
  const sepRow = cardSeparatorRow()
  // Footer: centred `┬` tee — `└────────┬────────┘`.
  const half = Math.max(0, Math.floor((HEAP_CARD_INTERIOR - 1) / 2))
  const footerRow = `└${'─'.repeat(half)}┬${'─'.repeat(HEAP_CARD_INTERIOR - 1 - half)}┘`

  return [
    headerRow,
    pilesRow,
    foursRow,
    sepRow,
    subtotalRow,
    remRow,
    suspendedRow,
    sepRow,
    totalRow,
    footerRow,
  ]
}

/**
 * Build the 10-row LEFT + RIGHT heap card pair as pre-rendered text rows.
 * Each returned row contains both cards joined by a 4-col gap. The derived
 * Subtotal / Total tick live with untyped fields treated as 0 (the RIGHT
 * Total folds in the +1 always-suspended stalk).
 *
 * Editing/error rows carry the Scheme B field colouring: dim labels and the
 * inert `Fours × 4` / `Suspended + 1` values, cyan Subtotal / Total, and
 * bold-white Piles / Remainder inputs — with the focused input cell shown
 * inverse-video instead (see `cellText`). Resolved rows skip all of that and
 * wrap each whole row in BOLD_GREEN ... NORMAL (so no interior colour reset
 * can break the green run). Pure function — no Ink involvement.
 */
export function twoHeapDiagramRows(args: TwoHeapDiagramRowsArgs): string[] {
  const { pilesL, remL, pilesR, remR, focusedField, state } = args
  const pilesLCell = cellText(pilesL, 'pilesL', focusedField, state)
  const remLCell = cellText(remL, 'remL', focusedField, state)
  const pilesRCell = cellText(pilesR, 'pilesR', focusedField, state)
  const remRCell = cellText(remR, 'remR', focusedField, state)
  const leftSubtotal = 4 * (pilesL ?? 0)
  const rightSubtotal = 4 * (pilesR ?? 0)
  const leftTotal = leftSubtotal + (remL ?? 0)
  // RIGHT total folds in the +1 always-suspended stalk (surfaced inline as the
  // `Suspended + 1` row), so the card sums vertically the same way LEFT does.
  const rightTotal = rightSubtotal + (remR ?? 0) + 1
  // Scheme B field colours apply in editing/error only; resolved rows are
  // wrapped BOLD_GREEN below and must stay free of interior colour resets.
  const colorize = state !== 'resolved'
  const leftRows = buildCardRows({
    header: 'LEFT HEAP',
    pilesCell: pilesLCell,
    subtotalLabel: String(leftSubtotal),
    remCell: remLCell,
    suspendedCell: null, // LEFT has no suspended stalk — blank slot
    totalLabel: String(leftTotal),
    colorize,
  })
  const rightRows = buildCardRows({
    header: 'RIGHT HEAP',
    pilesCell: pilesRCell,
    subtotalLabel: String(rightSubtotal),
    remCell: remRCell,
    suspendedCell: '1', // RIGHT always has the +1 suspended stalk
    totalLabel: String(rightTotal),
    colorize,
  })
  const gap = '    '
  const combined = leftRows.map((row, i) => `${row}${gap}${rightRows[i]!}`)
  if (state === 'resolved') {
    return combined.map((row) => `${BOLD_GREEN}${row}${NORMAL}`)
  }
  return combined
}

// ── Manual flow-diagram geometry ─────────────────────────────────────────
// Both heap cards are CARD_OUTER cols wide; the pair sits CARD_GAP apart,
// giving DIAGRAM_WIDTH. Each card footer carries a centred `┬` tee at
// CARD_TEE_OFFSET (cols from the card's left edge); the branch/join connectors
// span the two card tees (LEFT_TEE_COL..RIGHT_TEE_COL) and point their
// `┴` / `┬` stub at LEDGER_VALUE_END_COL — under the last digit of the
// right-aligned UNPARTED / COUNTED value above/below — so the vertical flow
// reads as one circuit anchored to the numbers it sums.
const CARD_OUTER = HEAP_CARD_INTERIOR + 2
const CARD_GAP = 4
const DIAGRAM_WIDTH = CARD_OUTER * 2 + CARD_GAP
const CARD_TEE_OFFSET = 1 + Math.floor((HEAP_CARD_INTERIOR - 1) / 2)
const LEFT_TEE_COL = CARD_TEE_OFFSET
const RIGHT_TEE_COL = CARD_OUTER + CARD_GAP + CARD_TEE_OFFSET
// Ledger readout column: label left-aligned, value right-aligned. Also the
// length of the COUNTED/MISSING subtraction rule.
const READOUT_WIDTH = 22
// Column of the last digit of a right-aligned ledger value — the connector
// stub (`┴` / `┬`) points here so it lands under the UNPARTED / COUNTED
// number rather than the geometric midpoint of the card pair.
const LEDGER_VALUE_END_COL = READOUT_WIDTH - 1

// A horizontal connector spanning the two card tees: corners at LEFT_TEE_COL /
// RIGHT_TEE_COL, a `─` bar between them, and a single `stub` at
// LEDGER_VALUE_END_COL — under the last digit of the UNPARTED / COUNTED value
// (`┴` points up to UNPARTED, `┬` points down to COUNTED).
function connectorRow(
  leftCorner: string,
  rightCorner: string,
  stub: string,
): string {
  const cells = Array.from({ length: DIAGRAM_WIDTH }, () => ' ')
  for (let c = LEFT_TEE_COL + 1; c < RIGHT_TEE_COL; c++) cells[c] = '─'
  cells[LEFT_TEE_COL] = leftCorner
  cells[RIGHT_TEE_COL] = rightCorner
  cells[LEDGER_VALUE_END_COL] = stub
  return cells.join('')
}

// A ledger readout: `LABEL    VALUE` — label left, value right-aligned within
// READOUT_WIDTH. ANSI in `value` (the coloured MISSING count) is width-
// discounted via `stringWidth`.
function ledgerRow(label: string, value: string): string {
  const gap = Math.max(1, READOUT_WIDTH - label.length - stringWidth(value))
  return `${label}${' '.repeat(gap)}${value}`
}

/**
 * The 2 rows above the heap-card band: the `UNPARTED STALKS: N` source
 * readout, and the downward-cornered branch directly below it whose `┴` stub
 * points up at the value's last digit. Pure text; aligned to the card
 * geometry above.
 */
export function flowHeaderRows(unparted: number): string[] {
  return [
    ledgerRow('UNPARTED STALKS:', String(unparted)),
    connectorRow('┌', '┐', '┴'),
  ]
}

// MISSING gauge colour: neutral while mid-countdown, green when commit-ready
// (count 0 + fully valid), red on a completed-but-wrong conservation total.
type MissingColor = 'neutral' | 'green' | 'red'

interface FlowFooterArgs {
  counted: number
  missing: number
  missingColor: MissingColor
}

/**
 * The 4 rows below the heap-card band: the upward-cornered join (its `┬` stub
 * gathers the two card tees and points down at the COUNTED value's last
 * digit), the `COUNTED STALKS: - N` accumulator (subtraction-signed) directly
 * below it, a ledger rule, and the `MISSING STALKS N` conservation gauge —
 * coloured per `missingColor` (green = commit-ready, red = conservation
 * violation, neutral = mid-countdown). Pure text.
 */
const MISSING_WRAP: Record<MissingColor, string> = {
  green: BOLD_GREEN,
  red: BOLD_RED,
  neutral: '',
}

export function flowFooterRows(args: FlowFooterArgs): string[] {
  const { counted, missing, missingColor } = args
  const missingStr = String(missing)
  const wrap = MISSING_WRAP[missingColor]
  const coloredMissing = wrap ? `${wrap}${missingStr}${NORMAL}` : missingStr
  return [
    connectorRow('└', '┘', '┬'),
    ledgerRow('COUNTED STALKS:', `- ${counted}`),
    '─'.repeat(READOUT_WIDTH),
    ledgerRow('MISSING STALKS', coloredMissing),
  ]
}

interface QuestionPanelRowsArgs {
  focusedField: ManualFocusedField
  unpartedStalks: number
  state: ManualDiagramState
}

function questionLineForField(field: ManualFocusedField): string {
  switch (field) {
    case 'pilesL':
      return 'How many piles of 4 stalks in the LEFT heap?'
    case 'remL':
      return 'How many leftover stalks in the LEFT heap?'
    case 'pilesR':
      return 'How many piles of 4 stalks in the RIGHT heap?'
    case 'remR':
      return 'How many leftover stalks in the RIGHT heap?'
  }
}

/**
 * Right-half question + dim parenthesised range hint (editing), or the calm
 * `Resolved.` / `Enter to advance` 2-line summary (resolved). Always returns
 * exactly 2 rows; the caller (`<ManualCastingPrompt>`) pads the right pane
 * to 6 rows with the 3-row input box + a trailing blank.
 *
 * Dim ANSI is `\u001B[2m...\u001B[22m` (matches Ink's `<Text dimColor>`).
 */
export function questionPanelRows(args: QuestionPanelRowsArgs): string[] {
  const { focusedField, unpartedStalks, state } = args
  if (state === 'resolved') {
    return ['Resolved.', 'Enter to advance (or wait 2.5 s)']
  }
  const pilesMax = Math.max(0, Math.floor(unpartedStalks / 4))
  const hintText =
    focusedField === 'pilesL' || focusedField === 'pilesR'
      ? `(valid 0 to ${pilesMax})`
      : '(valid 1 to 4)'
  return [questionLineForField(focusedField), `\u001B[2m${hintText}\u001B[22m`]
}

interface FocusedInputBoxRowsArgs {
  value: string
  focused: boolean
}

/**
 * The manual prompt's current-value display — a 3-row drawn box. 13-col
 * interior with a 1-col left margin; the value sits left-of-centre with
 * the cursor (an inverse space) right after when `focused`. Pure text —
 * no `<NumberInput>` here; digit handling lives in the parent `useInput`.
 */
export function focusedInputBoxRows(args: FocusedInputBoxRowsArgs): string[] {
  const interior = 13
  const top = `┌${'─'.repeat(interior)}┐`
  const bottom = `└${'─'.repeat(interior)}┘`
  const cursor = args.focused ? '\u001B[7m \u001B[27m' : ' '
  // value + cursor sits inside `interior` cols; cursor is 1 display col.
  const valueCols = args.value.length
  const cursorCols = 1
  // 1-col left margin; trailing pad fills the remainder.
  const leading = 1
  const trailingPad = Math.max(0, interior - leading - valueCols - cursorCols)
  const middle = `│${' '.repeat(leading)}${args.value}${cursor}${' '.repeat(trailingPad)}│`
  return [top, middle, bottom]
}

// Bottom-strip error-branch discriminant. The strip's `error` branch wraps
// these args; they are flat-extended into BottomStripArgs below. Conservation
// is NOT here — the MISSING gauge owns conservation visually (red when the
// completed count ≠ unparted), so the strip never duplicates it as text.
type BottomStripErrorArgs =
  | {
      errorKind: 'suspended-sum'
      remL: number
      remR: number
      sum: number
      expectedLabel: string
    }
  | {
      errorKind: 'zero-remainder'
      remL: number
      remR: number
    }

export type BottomStripArgs =
  | {
      // Mid-edit (incomplete or conservation-failing) or commit-ready. The
      // live count lives in the MISSING gauge, so the strip only nudges:
      // blank while not ready, "Press Enter to commit" once fully valid.
      branch: 'editing'
      commitReady: boolean
      renderWidth: number
    }
  | ({ branch: 'error'; renderWidth: number } & BottomStripErrorArgs)
  | {
      branch: 'resolved'
      next: number
      renderWidth: number
    }

function zeroRemainderSide(remL: number, remR: number): string {
  if (remL === 0 && remR === 0) return 'Left and right heaps have no remainder'
  if (remL === 0) return 'Left heap has no remainder'
  return 'Right heap has no remainder'
}

function errorMessageText(args: BottomStripErrorArgs): string {
  switch (args.errorKind) {
    case 'suspended-sum':
      return `Suspended sum (1 + ${args.remL} + ${args.remR}) = ${args.sum}, expected ${args.expectedLabel}`
    case 'zero-remainder':
      return `${zeroRemainderSide(args.remL, args.remR)} — fully divisible heaps yield remainder 4, not 0`
  }
}

// Build a row of exactly `renderWidth` display cols with `left` left-aligned
// and `right` right-aligned. ANSI in the segments doesn't count toward width.
function leftRightRow(
  left: string,
  right: string,
  renderWidth: number,
): string {
  const leftW = stringWidth(left)
  const rightW = stringWidth(right)
  const gap = Math.max(1, renderWidth - leftW - rightW)
  return `${left}${' '.repeat(gap)}${right}`
}

/**
 * One-row feedback strip below the manual prompt's body. Three branches, each
 * with a uniform `Shift+Tab: go back` hint on the right:
 *
 *  - **editing** — blank left while mid-edit (the MISSING gauge carries the
 *    live count); "Press Enter to commit" once `commitReady`.
 *  - **error** — BOLD_RED suspended-sum / zero-remainder message on the left
 *    (conservation is owned by the MISSING gauge, never shown here as text).
 *  - **resolved** — BOLD_GREEN "→ next cast: N unparted", left-aligned.
 *
 * Output is exactly `renderWidth` display cols wide.
 */
export function bottomStripRow(args: BottomStripArgs): string {
  const backHint = 'Shift+Tab: go back'
  if (args.branch === 'editing') {
    const left = args.commitReady ? 'Press Enter to commit' : ''
    return leftRightRow(left, backHint, args.renderWidth)
  }
  if (args.branch === 'resolved') {
    const message = `→ next cast: ${args.next} unparted`
    const colored = `${BOLD_GREEN}${message}${NORMAL}`
    const trailing = Math.max(0, args.renderWidth - stringWidth(colored))
    return `${colored}${' '.repeat(trailing)}`
  }
  const message = errorMessageText(args)
  const left = `${BOLD_RED}${message}${NORMAL}`
  return leftRightRow(left, backHint, args.renderWidth)
}

interface ManualCastingPromptProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  width: number
  unpartedStalks: number
  manualRevealMs: number
  horizontalOffset: number
  onSubmit: (parsed: number) => void
  onReady?: () => void
  onFocusedFieldChange?: (field: ManualFocusedField) => void
}

interface ManualCommit {
  pick: number
  next: number
}

/**
 * Closed-form "next unparted" and "set-aside this round" from the user's
 * pick. Mirrors `@hexagram/core`'s `fourOperations` pipeline — `partTheStalks
 * → suspendOneFromTheRight → sortInto4s → setAside` — which suspends one
 * stalk from the right heap on EVERY round (see `packages/core/src/index.ts`
 * lines 156–167), not only the first.
 *
 * Historical note: an earlier version of this helper conditionally skipped
 * the suspension on rounds 2/3. That was a transcription bug — the core
 * pipeline pipes `suspendOneFromTheRight` unconditionally, and the
 * `byte-identity` test downstream depends on these numbers matching the
 * interactive flow. The `castIndex` parameter is retained for signature
 * stability (other callers / tests may pass it) but is no longer consulted.
 */
function computeManualRoundResult(
  pick: number,
  _castIndex: 0 | 1 | 2,
  unparted: number,
): { suspended: number; next: number } {
  // I Ching convention: a heap that's a multiple of 4 yields remainder 4,
  // never 0 — modelled as ((count - 1) % 4) + 1.
  const leftRem = ((pick - 1) % 4) + 1
  const rightAfterPart = unparted - pick
  const rightCount = rightAfterPart - 1
  const rightRem = ((rightCount - 1) % 4) + 1
  const next = pick - leftRem + (rightCount - rightRem)
  return { suspended: unparted - next, next }
}

/**
 * Manual-mode validator. Runs checks in strict priority order — the
 * first failing check wins, so the SPLIT row only shows one message at a
 * time. `zero-remainder` fires before conservation because a 0 remainder
 * can sneak past conservation when the user shifts the missing 4 into the
 * pile count on the same side (e.g. `pR=5, rR=0` is conservation-equivalent
 * to `pR=4, rR=4` at M=49). The I-Ching never-zero convention says a heap
 * divisible by 4 yields remainder 4, not 0, so we reject the 0 form
 * explicitly. Conservation then catches off-by-one heap totals before
 * suspended sum; once all three pass, the derived pick is mathematically
 * in `[1, M-1]`, so no `range` variant is needed.
 *
 * Pure — depends only on its inputs. The single source of truth for what
 * the prompt's input state means; the textual rendering + commit path both
 * consume this result.
 */
export type ManualValidationResult =
  | { kind: 'incomplete' }
  | { kind: 'zero-remainder'; remL: number; remR: number }
  | {
      kind: 'conservation'
      total: number
      unparted: number
      leftHeapTotal: number
      rightHeapTotal: number
    }
  | {
      kind: 'suspended-sum'
      sum: number
      // `remL`/`remR` are already non-null because the `incomplete` branch
      // (above) fires first when any field is null. Carrying them through
      // here lets the message render from the narrowed validator result
      // rather than the closure-scoped (possibly-null) inputs.
      remL: number
      remR: number
      expectedLabel: string
    }
  | {
      kind: 'ok'
      pick: number
      leftHeapTotal: number
      rightHeapTotal: number
    }

export function validateManualInput(args: {
  pilesL: number | null
  remL: number | null
  pilesR: number | null
  remR: number | null
  unparted: number
  castIndex: 0 | 1 | 2
}): ManualValidationResult {
  const { pilesL, remL, pilesR, remR, unparted, castIndex } = args
  if (pilesL === null || remL === null || pilesR === null || remR === null) {
    return { kind: 'incomplete' }
  }
  // I-Ching never-zero convention: a heap divisible by 4 yields remainder 4,
  // never 0. Rejected here (before conservation) because pR=N+1, rR=0 is
  // conservation-equivalent to pR=N, rR=4 — a 0 in the remainder slot would
  // otherwise pass conservation undetected.
  if (remL === 0 || remR === 0) {
    return { kind: 'zero-remainder', remL, remR }
  }
  const leftHeapTotal = 4 * pilesL + remL
  const rightHeapTotal = 4 * pilesR + remR
  // Conservation: the four user-typed counts plus the 1 always-suspended
  // stalk must sum to the round's unparted count.
  const total = leftHeapTotal + rightHeapTotal + 1
  if (total !== unparted) {
    return {
      kind: 'conservation',
      total,
      unparted,
      leftHeapTotal,
      rightHeapTotal,
    }
  }
  // Suspended sum: the I-Ching invariant. Round 1 expects {5, 9};
  // rounds 2/3 expect {4, 8}. (The 1-from-right is folded in via the +1
  // term; rL + rR + 1 == 4·(pL+pR) ⊕ unparted lands at exactly these
  // residues for the canonical M = 49/40/32 sequence.)
  const sum = 1 + remL + remR
  const expectedSums = castIndex === 0 ? [5, 9] : [4, 8]
  if (!expectedSums.includes(sum)) {
    const expectedLabel = castIndex === 0 ? '5 or 9' : '4 or 8'
    return { kind: 'suspended-sum', sum, remL, remR, expectedLabel }
  }
  // Conservation + suspended-sum both pass → derived pick is in
  // `[1, unparted - 1]`. No standalone `range` failure mode.
  return {
    kind: 'ok',
    pick: leftHeapTotal,
    leftHeapTotal,
    rightHeapTotal,
  }
}

// Parse a digit-buffer into an integer, or `null` if the buffer is empty or
// fails the integer check. Lifted to module scope so React doesn't recreate
// it on every render — closure-less, so it captures nothing.
function parseManualBuffer(buffer: string): number | null {
  if (buffer.length === 0) return null
  const parsed = Number.parseInt(buffer, 10)
  return Number.isInteger(parsed) ? parsed : null
}

// Field-router helpers — used by the parent `useInput` digit/backspace
// branches to dispatch the appropriate state setter (and read the current
// buffer) for the currently-focused field without a nested switch in the
// handler body.
function manualSetterForField(
  field: ManualFocusedField,
  setters: {
    setPilesLBuffer: (s: string) => void
    setRemLBuffer: (s: string) => void
    setPilesRBuffer: (s: string) => void
    setRemRBuffer: (s: string) => void
  },
): (s: string) => void {
  switch (field) {
    case 'pilesL':
      return setters.setPilesLBuffer
    case 'remL':
      return setters.setRemLBuffer
    case 'pilesR':
      return setters.setPilesRBuffer
    case 'remR':
      return setters.setRemRBuffer
  }
}

function manualBufferForField(
  field: ManualFocusedField,
  buffers: {
    pilesLBuffer: string
    remLBuffer: string
    pilesRBuffer: string
    remRBuffer: string
  },
): string {
  switch (field) {
    case 'pilesL':
      return buffers.pilesLBuffer
    case 'remL':
      return buffers.remLBuffer
    case 'pilesR':
      return buffers.pilesRBuffer
    case 'remR':
      return buffers.remRBuffer
  }
}

/**
 * Manual-mode body of `<CastingPromptBox>` — the four-field
 * piles+remainder prompt used by the `hexagram-manual` flow. Users physically
 * casting yarrow stalks observe the post-sort heaps and remainders on both
 * sides of the table, then transcribe all four numbers here; we derive the
 * canonical split index (`4 × pilesL + remL`) and hand it upstream as if it
 * were a typed cast.
 *
 * Layout (20 content rows + 2 border = 22 rows total) is a vertical flow
 * diagram: slim title (`Line N/6 · Cast C/3 · Step P/4`) / blank / 2-row
 * UNPARTED header (`UNPARTED STALKS: N` + branch) / 10-row heap-card
 * band (LEFT + RIGHT cards, each: header / Piles / Fours ×4 / sep / Subtotal /
 * Remainder / Suspended-or-blank / sep / Total / footer), with the question +
 * dim range hint + 3-row drawn-box input + step dots mapped onto the right of
 * the band / 4-row COUNTED-MISSING footer (join + `COUNTED STALKS: - N`
 * + rule + `MISSING STALKS N`) / blank / one-row feedback strip. The MISSING
 * gauge is the live conservation readout — neutral mid-countdown, green when
 * commit-ready, red on a completed wrong total. Each row is pre-built ANSI text
 * and sliced by `horizontalOffset` for the viewer's narrow-terminal `<` / `>`
 * pan, mirroring `<SliderCastingPrompt>`.
 *
 * Tab cycles focus forward through `pilesL → remL → pilesR → remR → pilesL`;
 * Shift+Tab cycles backward. Digit/backspace input is owned by this
 * component's `useInput` (the focused input box is plain text, not a
 * `<NumberInput>` child); the validator + commit path are likewise local.
 *
 * Validator priority (first failing check wins): incomplete → zero-remainder
 * → conservation → suspended-sum → ok. Conservation is surfaced by the red
 * MISSING gauge (never as strip text); the feedback strip's error branch
 * renders only the suspended-sum / zero-remainder messages. The diagram's
 * active cells stay inverse-video on the focused field even in error.
 *
 * On a valid Enter:
 *   - local `committed = { pick, next }` captures the resolved pick plus the
 *     closed-form next-round unparted count,
 *   - both heap cards switch to BOLD_GREEN and the right pane swaps to
 *     `Resolved. / blank / Enter to advance (or wait 2.5 s)`,
 *   - the bottom strip swaps to a green `→ next cast: N unparted`,
 *   - a `manualRevealMs`-delayed `setTimeout` fires `onSubmit(pick)`
 *     upstream (tests opt out with `manualRevealMs={0}`, which short-circuits
 *     to a synchronous dispatch),
 *   - pressing Enter again during the dwell fires `onSubmit` immediately
 *     (skip-to-advance), so a confident caster doesn't have to wait out the
 *     full reveal.
 *
 * The rendered height is locked at
 * `getCastingPromptHeight(_, _, 'manual') = 22`.
 */
function ManualCastingPrompt({
  lineNumber,
  castIndex,
  width,
  unpartedStalks,
  manualRevealMs,
  horizontalOffset,
  onSubmit,
  onReady,
  onFocusedFieldChange,
}: ManualCastingPromptProps): ReactElement {
  const [pilesLBuffer, setPilesLBuffer] = useState('')
  const [remLBuffer, setRemLBuffer] = useState('')
  const [pilesRBuffer, setPilesRBuffer] = useState('')
  const [remRBuffer, setRemRBuffer] = useState('')
  const [focusedField, setFocusedField] = useState<ManualFocusedField>('pilesL')
  const [committed, setCommitted] = useState<ManualCommit | null>(null)

  // Per-field bounds. Piles ∈ [0, floor(unparted/4)] — a UX guard; the
  // validator's conservation check is the source of truth for the
  // cross-field invariant, so per-field bounds can be lenient without
  // letting an invalid commit through. Remainders ∈ [1, 4] (I Ching: a
  // heap divisible by 4 yields remainder 4, never 0). The digit-input
  // branch in `useInput` below treats `remMax = 4` as an inclusive cap on
  // the typed buffer parse — a leniently-typed `0` reaches the validator
  // and surfaces as `zero-remainder`, matching the same error path the
  // user got with the legacy NumberInput.
  const pilesMax = Math.max(0, Math.floor(unpartedStalks / 4))
  const remMax = 4

  // Live-parse each buffer.
  const pilesL = parseManualBuffer(pilesLBuffer)
  const remL = parseManualBuffer(remLBuffer)
  const pilesR = parseManualBuffer(pilesRBuffer)
  const remR = parseManualBuffer(remRBuffer)
  const validation = validateManualInput({
    pilesL,
    remL,
    pilesR,
    remR,
    unparted: unpartedStalks,
    castIndex,
  })

  // Live heap totals — used by the bottom strip to mirror the user's typing
  // even before all four fields are populated. Treat a null parse as 0 so
  // the row never disappears; an absent field is a partial total, not an
  // error.
  const liveLeftTotal = 4 * (pilesL ?? 0) + (remL ?? 0)
  const liveRightTotal = 4 * (pilesR ?? 0) + (remR ?? 0)

  // Latest-`onSubmit` and -`onFocusedFieldChange` refs so the related
  // effects don't re-run on every parent re-render with a fresh closure.
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSubmitRef.current = onSubmit
  })
  const onFocusedFieldChangeRef = useRef(onFocusedFieldChange)
  useEffect(() => {
    onFocusedFieldChangeRef.current = onFocusedFieldChange
  })

  // Tab / Shift+Tab / Enter / digit / backspace handler. The parent owns
  // both the focus cycle and the gated commit; digit + backspace handling
  // moved here in the Phase 7 redesign (the focused input box is plain
  // text, no `<NumberInput>` child intercepting keystrokes).
  useInput((input, key) => {
    if (key.tab) {
      // Tab order: pilesL → remL → pilesR → remR → pilesL.
      // Shift+Tab reverses it.
      const current = MANUAL_FIELD_ORDER.indexOf(focusedField)
      const step = key.shift ? -1 : 1
      const next =
        MANUAL_FIELD_ORDER[
          (current + step + MANUAL_FIELD_ORDER.length) %
            MANUAL_FIELD_ORDER.length
        ]!
      setFocusedField(next)
      return
    }
    if (key.return) {
      // Skip-to-advance: if a commit is already in flight (the reveal dwell
      // is running), Enter fires onSubmit immediately and lets the dwell
      // timer's cleanup tear down naturally. `committed.pick` is stable.
      if (committed !== null) {
        onSubmitRef.current(committed.pick)
        return
      }
      // First Enter: commit only when the validator passes.
      if (validation.kind !== 'ok') return
      const result = computeManualRoundResult(
        validation.pick,
        castIndex,
        unpartedStalks,
      )
      setCommitted({
        pick: validation.pick,
        next: result.next,
      })
      return
    }
    // While the reveal-dwell is showing the resolved view, freeze the
    // buffers — neither digits nor backspace mutate them. Only the
    // skip-to-advance Enter (above) is honoured.
    if (committed !== null) return
    // Backspace / DEL — remove the last char from the focused buffer.
    if (key.backspace || key.delete) {
      const setter = manualSetterForField(focusedField, {
        setPilesLBuffer,
        setRemLBuffer,
        setPilesRBuffer,
        setRemRBuffer,
      })
      const currentBuffer = manualBufferForField(focusedField, {
        pilesLBuffer,
        remLBuffer,
        pilesRBuffer,
        remRBuffer,
      })
      setter(currentBuffer.slice(0, -1))
      return
    }
    // Digit input — append if the resulting parse fits the field's per-field
    // max. Piles cap at `floor(unparted/4)`; remainders cap at 4. A leading
    // `0` in a remainder field is allowed through to the validator (which
    // surfaces it as `zero-remainder`). Ink can batch multiple digits into
    // one `input` chunk (`stdin.write('24')` arrives whole); accept any
    // all-digit run for parity with `<NumberInput>`. Control sequences
    // (arrow keys, etc.) contain non-digit bytes and fail the regex.
    if (input.length > 0 && /^\d+$/.test(input)) {
      const setter = manualSetterForField(focusedField, {
        setPilesLBuffer,
        setRemLBuffer,
        setPilesRBuffer,
        setRemRBuffer,
      })
      const currentBuffer = manualBufferForField(focusedField, {
        pilesLBuffer,
        remLBuffer,
        pilesRBuffer,
        remRBuffer,
      })
      const nextBuffer = currentBuffer + input
      const parsed = Number.parseInt(nextBuffer, 10)
      const max =
        focusedField === 'pilesL' || focusedField === 'pilesR'
          ? pilesMax
          : remMax
      if (Number.isInteger(parsed) && parsed <= max) {
        setter(nextBuffer)
      }
      return
    }
  })

  // Reveal-dwell timer. Fires `onSubmit(pick)` after `manualRevealMs`
  // milliseconds — or synchronously when the caller opts out with
  // `manualRevealMs={0}`. The skip-to-advance Enter path above fires
  // `onSubmit` directly and lets this cleanup run on unmount.
  useEffect(() => {
    if (committed === null) return
    if (manualRevealMs === 0) {
      onSubmitRef.current(committed.pick)
      return
    }
    const timer = setTimeout(() => {
      onSubmitRef.current(committed.pick)
    }, manualRevealMs)
    return () => {
      clearTimeout(timer)
    }
  }, [committed, manualRevealMs])

  // Mount-witness — fires once per mount, on the same useEffect tick the
  // parent `useInput` registers under, so tests can gate cross-state
  // keystrokes on `onReady` instead of polling render output.
  const onReadyFiredRef = useRef(false)
  useEffect(() => {
    if (onReadyFiredRef.current) return
    onReadyFiredRef.current = true
    onReady?.()
  }, [onReady])

  // Focus witness — fires whenever the focused field changes, including
  // the initial mount. Tests gate Tab→digit pairs on this signal to bypass
  // Ink's `useInput` bind race; production callers omit
  // `onFocusedFieldChange` and the ref-call is a no-op.
  useEffect(() => {
    onFocusedFieldChangeRef.current?.(focusedField)
  }, [focusedField])

  // ── Render: row-builder composition + sliceAnsi pan ───────────────────

  const innerContentWidth = Math.max(1, width - 2)
  // Natural body width: diagramWidth (42) + 8-col gap + right-pane (45 —
  // widest question: "How many piles of 4 stalks in the RIGHT heap?" = 45
  // cols). Sliced against innerContentWidth so the exact figure matters
  // only as a floor on narrow terminals.
  const naturalBodyWidth = (HEAP_CARD_INTERIOR + 2) * 2 + 4 + 8 + 45
  const renderWidth = Math.max(innerContentWidth, naturalBodyWidth)

  // Diagram state drives editing / error / resolved colouring. Validator
  // `incomplete` and `ok` are both "editing" — the user is mid-flow and
  // hasn't surfaced an actionable error yet.
  const isEditingValidation =
    validation.kind === 'incomplete' || validation.kind === 'ok'
  let diagramState: ManualDiagramState
  if (committed !== null) {
    diagramState = 'resolved'
  } else if (isEditingValidation) {
    diagramState = 'editing'
  } else {
    diagramState = 'error'
  }

  // Row 1: title.
  const titleRow = manualTitleRow(lineNumber, castIndex, focusedField)

  // Left half is the vertical flow diagram: UNPARTED header (2 rows) → the
  // 10-row heap-card band → COUNTED/MISSING footer (4 rows). The card band's
  // 10 rows are the only ones paired with right-pane content.
  const flowHeader = flowHeaderRows(unpartedStalks)
  const cardBand = twoHeapDiagramRows({
    pilesL,
    remL,
    pilesR,
    remR,
    focusedField,
    state: diagramState,
  })
  // COUNTED ticks live (untyped fields → 0; +1 always-suspended). MISSING is
  // the conservation gauge: green when fully commit-ready, red on a completed
  // wrong total, neutral mid-countdown (incomplete / suspended-sum / zero-rem).
  const counted = liveLeftTotal + liveRightTotal + 1
  const missing = unpartedStalks - counted
  let missingColor: MissingColor = 'neutral'
  if (committed !== null || validation.kind === 'ok') {
    missingColor = 'green'
  } else if (validation.kind === 'conservation') {
    missingColor = 'red'
  }
  const flowFooter = flowFooterRows({ counted, missing, missingColor })

  // Right pane aligned to the 10-row card band: question + dim range hint sit
  // beside Piles / Fours; the 3-row input box beside Subtotal / Remainder /
  // Suspended; the step dots beside Total. Header / separators / footer rows
  // get a blank right. During the resolved dwell the input box collapses.
  const qRows = questionPanelRows({
    focusedField,
    unpartedStalks,
    state: diagramState === 'resolved' ? 'resolved' : 'editing',
  })
  const inputRows =
    committed === null
      ? focusedInputBoxRows({
          value: manualBufferForField(focusedField, {
            pilesLBuffer,
            remLBuffer,
            pilesRBuffer,
            remRBuffer,
          }),
          focused: true,
        })
      : ['', '', '']
  const dotsRow = committed === null ? stepDotsRow(focusedField) : ''
  const cardRightPane = [
    '', // header
    qRows[0] ?? '', // Piles → question
    qRows[1] ?? '', // Fours → range hint
    '', // separator
    inputRows[0] ?? '', // Subtotal → input box top
    inputRows[1] ?? '', // Remainder → input box mid
    inputRows[2] ?? '', // Suspended → input box bottom
    '', // separator
    dotsRow, // Total → step dots
    '', // footer
  ]

  // Compose each body row from a left half (flow diagram, display width
  // DIAGRAM_WIDTH) and a right half, gap = 8. Pad the whole row out to
  // `renderWidth` so successive slices land at predictable offsets.
  const composeBodyRow = (leftRow: string, rightRow: string): string => {
    const leftWidth = stringWidth(leftRow)
    const rightWidth = stringWidth(rightRow)
    const leftPadTrail = Math.max(0, DIAGRAM_WIDTH - leftWidth)
    const middleGap = 8
    const totalSoFar = DIAGRAM_WIDTH + middleGap + rightWidth
    const trailingPad = Math.max(0, renderWidth - totalSoFar)
    return `${leftRow}${' '.repeat(leftPadTrail)}${' '.repeat(middleGap)}${rightRow}${' '.repeat(trailingPad)}`
  }
  const bodyRows = [
    ...flowHeader.map((row) => composeBodyRow(row, '')),
    ...cardBand.map((row, i) => composeBodyRow(row, cardRightPane[i] ?? '')),
    ...flowFooter.map((row) => composeBodyRow(row, '')),
  ]

  // Row 9: the one-row bottom strip — editing / error / resolved branch
  // selected from the validator + committed state.
  const bottomStripBranchArgs = ((): BottomStripArgs => {
    if (committed !== null) {
      return {
        branch: 'resolved',
        next: committed.next,
        renderWidth,
      }
    }
    if (validation.kind === 'suspended-sum') {
      return {
        branch: 'error',
        errorKind: 'suspended-sum',
        remL: validation.remL,
        remR: validation.remR,
        sum: validation.sum,
        expectedLabel: validation.expectedLabel,
        renderWidth,
      }
    }
    if (validation.kind === 'zero-remainder') {
      return {
        branch: 'error',
        errorKind: 'zero-remainder',
        remL: validation.remL,
        remR: validation.remR,
        renderWidth,
      }
    }
    // incomplete | conservation | ok — conservation is surfaced by the MISSING
    // gauge (red), not the strip, so it shares the blank editing branch.
    return {
      branch: 'editing',
      commitReady: validation.kind === 'ok',
      renderWidth,
    }
  })()
  const stripRow = bottomStripRow(bottomStripBranchArgs)

  // Stack the 20 content rows (title / blank / 2 flow-header / 10 card-band /
  // 4 flow-footer / blank / feedback strip), pad each to renderWidth, then
  // slice by horizontalOffset for the viewer's `<` / `>` narrow-terminal pan.
  const allRows = [titleRow, '', ...bodyRows, '', stripRow]
  const slicedRows = allRows.map((row) => {
    const padded = row + ' '.repeat(Math.max(0, renderWidth - stringWidth(row)))
    return sliceAnsi(
      padded,
      horizontalOffset,
      horizontalOffset + innerContentWidth,
    )
  })

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{slicedRows[0]!}</Text>
      {slicedRows.slice(1).map((row, i) => (
        <Text key={`row-${i}`}>{row}</Text>
      ))}
    </Box>
  )
}
