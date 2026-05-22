import { BOLD_RED, NORMAL } from '@hexagram/viewer-core'
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
import { isGlobalExitKey } from './editor-primitives.js'
import { NumberInput } from './number-input.js'

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

// ── Slider primitives ───────────────────────────────────────────────────────

// Braille-spinner glyphs cycled by `tickCount % BRAILLE_SPINNER.length`.
// During the ticking state the spinner replaces the cursor's numeric
// position in the readout below the bar — see `<SliderInput>` /
// `<SliderCastingPrompt>` — so the user sees motion (the slider is alive)
// but not the value (the cast stays unbiased). The glyphs render as
// ` ⠋`/` ⠏` (leading space + 1-column glyph) so each cell is 2 columns
// wide, matching the post-commit padded number. After SPACE,
// `<SliderCastingPrompt>` swaps the glyphs for the concrete
// `Left Heap:  <pick> | Right Heap: <max − pick>` numbers (each pick
// padStart'd to 2 columns) for `SLIDER_COMMIT_REVEAL_MS` before
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
}

/**
 * Bouncing-slider input — replaces the typed `<NumberInput>` when the viewer
 * is in slider mode. The cursor sweeps 1 cell per tick, bouncing off `min`
 * and `max`; pressing SPACE commits the current value via `onSubmit`. Bar
 * width = `max - min + 1` cells (Option A: 1 cell = 1 value).
 *
 * Renders two centred rows via Ink flexbox: the bar, and a
 * `Stalks: <max> | Left Heap:  <glyph> | Right Heap:  <glyph>` readout
 * where both glyphs are Braille spinners advanced one frame per tick —
 * the left walks the cycle clockwise, the right walks it anticlockwise.
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
}: SliderInputProps): ReactElement {
  const { position, tickCount } = useSliderBounce({
    min,
    max,
    focused,
    tickMs,
    onSubmit,
  })
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
        <Text>{`Stalks: ${max} | Left Heap: ${leftGlyph} | Right Heap: ${rightGlyph}`}</Text>
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
 */
export function getCastingPromptHeight(
  inputMode: CastingInputMode,
  hasError: boolean,
): number {
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
   * for narrow terminals. The viewer drives this via ←/→ during the casting
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
}

/**
 * The bordered prompt that hosts the casting input during the flow.
 *
 * Two visual modes:
 *  - **slider** (default): five-row layout — verbatim title, blank spacer,
 *    centred bouncing-slider bar, blank spacer, centred
 *    `Stalks: <max> | Left Heap:  <spinner> | Right Heap:  <spinner>`
 *    readout (both Braille glyphs advanced one frame per tick — the left
 *    walks the cycle clockwise, the right anticlockwise; the live cursor
 *    value stays hidden). Each heap cell — both glyph and pick — is
 *    rendered at a stable 2-column width so the readout never shifts
 *    laterally across the ticking → reveal transition or across
 *    (pick, max − pick) splits of differing digit counts. On SPACE, the
 *    cursor freezes and the readout swaps the glyphs for the concrete
 *    `Left Heap: <pick> | Right Heap: <max − pick>` (each value
 *    padStart'd to 2 columns) for `SLIDER_COMMIT_REVEAL_MS` before
 *    `onSubmit` fires upstream — see the state list on
 *    `<SliderCastingPrompt>`. Rows are pre-built strings padded to at
 *    least the inner box width and sliced via `sliceAnsi` against
 *    `horizontalOffset`, so the box never reflows on narrow terminals
 *    (←/→ in the viewer pans it).
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
}: CastingPromptBoxProps): ReactElement {
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
}

/**
 * Slider-mode body of `<CastingPromptBox>`. Owns the bouncing state via
 * `useSliderBounce` and renders five sliced rows (title, blank, bar, blank,
 * readout) so the box content never reflows on narrow terminals — the viewer
 * can pan ←/→ to scroll instead.
 *
 * Three visual states drive the readout row:
 *  1. **Ticking** — the cursor sweeps and the readout shows two
 *     counter-rotating Braille spinners (live cursor value hidden so the
 *     cast stays unbiased).
 *  2. **Reveal** — SPACE captures the picked value into local `committed`
 *     state; the cursor freezes (`BouncingSliderStore.commit()` sets the
 *     internal flag) and the readout swaps the glyphs for the concrete
 *     `Left Heap: <pick> | Right Heap: <max − pick>` numbers, each
 *     padStart'd to 2 columns so the row width matches the ticking state.
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
}: SliderCastingPromptProps): ReactElement {
  const [committed, setCommitted] = useState<number | null>(null)

  const handleStoreCommit = useCallback((value: number) => {
    setCommitted(value)
  }, [])

  // Ref pattern: the timer must read the LATEST onSubmit when it fires, but
  // the effect must NOT re-run when onSubmit's identity changes. Otherwise
  // any parent re-render (e.g. ←/→ pan during the post-SPACE reveal) would
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

  // The random flow auto-drives the slider, so its title describes the
  // stalks being parted rather than instructing the user to press SPACE.
  const title =
    autoLand === null
      ? `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3: — Press SPACE to part the stalks`
      : `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3: — parting the stalks`
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
  const readout = `Stalks: ${max} | Left Heap: ${leftCell} | Right Heap: ${rightCell}`

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
