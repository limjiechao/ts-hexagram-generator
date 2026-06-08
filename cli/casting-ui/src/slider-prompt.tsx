import {
  isGlobalExitKey,
  panToWindow,
  terminalWidth,
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

import {
  BouncingSliderStore,
  type SliderAutoLand,
  type SliderSnapshot,
} from './bouncing-slider-store.js'

// How long `<SliderCastingPrompt>` holds the numeric Left/Right Heap readout
// after the user presses SPACE before forwarding `onSubmit` to the parent
// flow. Long enough that the user can register the cast they just made, short
// enough that 18 reveals don't drag. The viewer remounts the prompt per cast
// (see `viewer.tsx` `<CastingPromptBox key=…>`), so this state is local to a
// single cast.
export const SLIDER_COMMIT_REVEAL_MS = 500

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
  /**
   * True total stalk count for the `Stalks: <n>` readout, decoupled from the
   * reachable cursor ceiling `max`. Here `max` is the SELECTABLE pick ceiling
   * (`selectablePickMax(recordedMax)`, threaded from `viewer.tsx`). The cursor
   * sweeps `[min, max]`, but the right heap reserves TWO stalks beyond the pick
   * (one suspended via 掛一, one to count by fours so the remainder is never 0),
   * so the true stalk count is `max + 2` when the viewer caps the pick. The
   * viewer always threads the real count via `stalkCountFor(currentMax)`; the
   * `max + 1` default only recovers `recordedMax` (single reservation) so
   * standalone callers/tests need not supply it.
   */
  stalksTotal?: number
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
 * `Stalks: <stalksTotal> | Left Heap:  <glyph> | Right Heap:  <glyph> + 1 suspended`
 * readout where both glyphs are Braille spinners advanced one frame per tick —
 * the left walks the cycle clockwise, the right walks it anticlockwise.
 * `Stalks` is `stalksTotal` (the viewer threads `stalkCountFor(currentMax)`;
 * the `max + 1` fallback only recovers `recordedMax`), not the reachable
 * ceiling `max`: `max` is only the selectable left-heap pick ceiling, held
 * short of the true stalk count so the right heap always retains a stalk to
 * suspend (掛一以象三) — and,
 * when the viewer caps the pick, a second stalk to count (so the remainder is
 * never 0). That suspended stalk — taken from the right heap (see
 * `suspendOneFromTheRight` in `@hexagram/core`) — is the trailing
 * `+ 1 suspended` on the right readout, so the row conserves:
 * left (pick) + right + 1 suspended = stalksTotal.
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
  stalksTotal,
  tickMs = 80,
  onReady,
}: SliderInputProps): ReactElement {
  const totalStalks = stalksTotal ?? max + 1
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
        <Text>{`Stalks: ${totalStalks} | Left Heap: ${leftGlyph} | Right Heap: ${rightGlyph} + 1 suspended`}</Text>
      </Box>
    </Box>
  )
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
   * True total stalk count for the readout, decoupled from the selectable
   * cursor ceiling `max` (see `SliderInputProps.stalksTotal`). `Right Heap` is
   * `stalksTotal - 1 - pick` (the suspended stalk is the trailing
   * `+ 1 suspended`), so the row conserves to `stalksTotal`. The viewer threads
   * `stalkCountFor(currentMax)`; the `max + 1` fallback only recovers
   * `recordedMax`.
   */
  stalksTotal?: number
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
 *     `Left Heap: <pick> | Right Heap: <stalksTotal − 1 − pick> + 1 suspended`
 *     numbers, each padStart'd to 2 columns so the row width matches the
 *     ticking state.
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
export function SliderCastingPrompt({
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
  stalksTotal,
  onReady,
}: SliderCastingPromptProps): ReactElement {
  const totalStalks = stalksTotal ?? max + 1
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
  // transition or between (pick, right) splits of differing digit counts.
  // Right heap counted = `totalStalks - 1 - pick` (the `- 1` is the suspended
  // stalk shown as the trailing `+ 1 suspended`); with the pick capped at the
  // reachable ceiling this is always ≥ 1, so the remainder is never 0.
  const leftCell =
    committed === null
      ? ` ${BRAILLE_SPINNER[tickCount % BRAILLE_SPINNER.length]!}`
      : String(committed).padStart(2, ' ')
  const rightCell =
    committed === null
      ? ` ${reverseBrailleGlyph(tickCount)}`
      : String(totalStalks - 1 - committed).padStart(2, ' ')
  const readout = `Stalks: ${totalStalks} | Left Heap: ${leftCell} | Right Heap: ${rightCell} + 1 suspended`

  const titleWidth = terminalWidth(title)
  const barWidth = terminalWidth(bar)
  const readoutWidth = terminalWidth(readout)
  const innerContentWidth = Math.max(1, width - 2)
  const renderWidth = Math.max(
    innerContentWidth,
    titleWidth,
    barWidth,
    readoutWidth,
  )

  const slice = (s: string): string =>
    panToWindow(s, horizontalOffset, innerContentWidth)

  const titleRow = slice(padCenter(title, titleWidth, renderWidth))
  const barRow = slice(padCenter(bar, barWidth, renderWidth))
  const readoutRow = slice(padCenter(readout, readoutWidth, renderWidth))
  const blankRow = slice(padCenter('', 0, renderWidth))

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
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
