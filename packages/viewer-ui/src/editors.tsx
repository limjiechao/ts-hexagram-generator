import { Box, Text, useInput } from 'ink'
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react'
import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'

import { BOLD_RED, NORMAL } from './output-palette.js'

// A blinky-block cursor stand-in. Ink has no native cursor primitive, so we
// inverse a single trailing space to draw the eye to the caret. Rendered only
// when the host editor is focused. The blink-off frame still occupies a
// column so layout doesn't jump.
function Cursor(): ReactElement {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 500)
    return () => clearInterval(id)
  }, [])
  return on ? <Text inverse> </Text> : <Text> </Text>
}

// Returns true for keystrokes the global viewer handler must always own —
// Escape, Ctrl+C — so editors don't accidentally consume them. `q` is NOT in
// this list because it must remain a typable character inside the query box.
function isGlobalExitKey(
  _input: string,
  key: { escape?: boolean; ctrl?: boolean },
): boolean {
  if (key.escape) return true
  if (key.ctrl) return true
  return false
}

interface QueryEditorProps {
  value: string
  focused: boolean
  width: number
  placeholder?: string
  onChange: (next: string) => void
  onSubmit: () => void
}

/**
 * Single-line editable query box. Controlled — caller owns the buffer.
 *
 * Accepts printable characters (including 'q'), Backspace/Delete, and Enter.
 * Ignores Escape and Ctrl+C so the viewer's global handler can exit cleanly.
 */
export function QueryEditor({
  value,
  focused,
  width,
  placeholder,
  onChange,
  onSubmit,
}: QueryEditorProps): ReactElement {
  useInput(
    (input, key) => {
      if (isGlobalExitKey(input, key)) return
      if (key.return) {
        if (value.trim().length > 0) onSubmit()
        return
      }
      if (key.backspace || key.delete) {
        if (value.length > 0) onChange(value.slice(0, -1))
        return
      }
      // Printable input only — Ink usually reports control sequences via the
      // `key` flags, but the testing harness (and some terminals) can pass
      // raw control bytes through `input`. The Unicode `\p{Cc}` (Control)
      // category rejects escape, Ctrl-C, arrow-key escapes, etc., so none
      // of those ever land in the buffer.
      if (input.length > 0 && !/\p{Cc}/u.test(input)) {
        onChange(value + input)
      }
    },
    { isActive: focused },
  )

  if (value.length === 0 && placeholder !== undefined) {
    // Cursor sits at column 0 (where typing will actually appear, since the
    // buffer is empty and input is appended) with the placeholder dimmed
    // immediately after it. A previous version split the placeholder at its
    // first space and put the cursor mid-text, which read like the prefix
    // was already typed.
    return (
      <Box
        borderStyle="round"
        borderColor={focused ? 'cyan' : undefined}
        width={width}
        flexShrink={0}
      >
        {focused && <Cursor />}
        <Text dimColor>{placeholder}</Text>
      </Box>
    )
  }

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyan' : undefined}
      width={width}
      flexShrink={0}
    >
      <Text>{value}</Text>
      {focused && <Cursor />}
    </Box>
  )
}

interface NumberInputProps {
  value: string
  focused: boolean
  min: number
  max: number
  onChange: (next: string) => void
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
}

/**
 * Bounded integer input — replaces `@inquirer/prompts`'s `number` for the
 * in-tab casting prompts. Controlled buffer (string so leading zeros are
 * tolerated mid-edit). The submit gate is the source of truth for validation;
 * digits accumulate freely so the user can keep typing past `max` and correct
 * with Backspace before pressing Enter.
 */
export function NumberInput({
  value,
  focused,
  min,
  max,
  onChange,
  onSubmit,
  onError,
}: NumberInputProps): ReactElement {
  useInput(
    (input, key) => {
      if (isGlobalExitKey(input, key)) return
      if (key.return) {
        if (value.length === 0) return // empty Enter is a no-op (Inquirer parity)
        const parsed = Number.parseInt(value, 10)
        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
          onError(`Pick a number from ${min} to ${max}.`)
          return
        }
        onError(null)
        onSubmit(parsed)
        return
      }
      if (key.backspace || key.delete) {
        if (value.length > 0) onChange(value.slice(0, -1))
        onError(null)
        return
      }
      // Digits only. The harness may batch multiple digits into one `input`
      // (`stdin.write('24')` arrives as a single chunk), so accept any run
      // of pure digits. Arrow keys etc. arrive as escape sequences which
      // contain control bytes and fail the all-digit test.
      if (input.length > 0 && /^\d+$/.test(input)) {
        onChange(value + input)
      }
    },
    { isActive: focused },
  )

  return (
    <>
      <Text>{value}</Text>
      {focused && <Cursor />}
    </>
  )
}

// ── Slider primitives ───────────────────────────────────────────────────────

interface UseSliderBounceArgs {
  min: number
  max: number
  focused: boolean
  tickMs: number
  onSubmit: (value: number) => void
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
  private readonly tickMs: number
  private readonly listeners = new Set<() => void>()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(min: number, max: number, tickMs: number) {
    this.min = min
    this.max = max
    this.tickMs = tickMs
    this.position = min
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (this.listeners.size === 1) this.startTicking()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.stopTicking()
    }
  }

  readonly getSnapshot = (): number => this.position

  // Called from the hook's render phase. Mutates synchronously so the same
  // render's `getSnapshot()` returns the rewound position — no `notify()`,
  // which would fire the `useSyncExternalStore` subscriber mid-render and
  // trigger React's "setState while rendering" warning. The render that
  // triggered the rewind already commits with the new position.
  setRange(min: number, max: number): void {
    if (this.min === min && this.max === max) return
    this.min = min
    this.max = max
    this.position = min
    this.direction = 1
    this.committed = false
    // Restart the tick timer so the next interval tick is a full `tickMs`
    // away — matches the pre-refactor `useEffect([min, max, …])` behaviour
    // where changing the range cleared and re-installed the interval, giving
    // the user a fresh window to react to the new range before the cursor
    // moves off `min`.
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
 * flag clears. `setRange` runs in the hook's render phase so the reset is
 * visible on the same frame — no `useEffect` lag.
 */
function useSliderBounce({
  min,
  max,
  focused,
  tickMs,
  onSubmit,
}: UseSliderBounceArgs): number {
  const storeRef = useRef<BouncingSliderStore | null>(null)
  storeRef.current ??= new BouncingSliderStore(min, max, tickMs)
  // Render-phase sync — preserves zero-frame-lag rewind on cast-boundary
  // range changes, exactly like the previous prevRangeRef branch.
  storeRef.current.setRange(min, max)

  const position = useSyncExternalStore(
    focused ? storeRef.current.subscribe : noopSubscribe,
    storeRef.current.getSnapshot,
    storeRef.current.getSnapshot,
  )

  useInput(
    (input, key) => {
      if (isGlobalExitKey(input, key)) return
      if (input === ' ') {
        onSubmit(storeRef.current!.commit())
      }
    },
    { isActive: focused },
  )

  return position
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
 * Renders two centred rows (bar + `pick: N / max` readout) via Ink flexbox.
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
  const position = useSliderBounce({ min, max, focused, tickMs, onSubmit })
  const bar = buildSliderBar(position, min, max)
  return (
    <Box flexDirection="column" flexShrink={0}>
      <Box justifyContent="center">
        <Text>{bar}</Text>
      </Box>
      <Box justifyContent="center">
        <Text>{`pick: ${position} / ${max}`}</Text>
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
 *   slider mode → 3 content rows (title + bar + readout) → 5 with border
 *   number mode → 2 content rows + optional error → 5 normally, 6 with error
 */
export function getCastingPromptHeight(
  inputMode: CastingInputMode,
  hasError: boolean,
): number {
  if (inputMode === 'slider') return 5
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
}

/**
 * The bordered prompt that hosts the casting input during the flow.
 *
 * Two visual modes:
 *  - **slider** (default): three-row layout — verbatim title, centred
 *    bouncing-slider bar, centred `pick: N / max` readout. Rows are
 *    pre-built strings padded to at least the inner box width and sliced
 *    via `sliceAnsi` against `horizontalOffset`, so the box never reflows on
 *    narrow terminals (←/→ in the viewer pans it).
 *  - **number**: the legacy typed-number prompt + `<NumberInput>` row.
 *    Unchanged from before the slider feature; opted into via
 *    `--numeric-input`.
 *
 * Rendered height: slider mode = 5 (border 2 + 3 content rows). Number mode
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
  onSubmit: (value: number) => void
}

/**
 * Slider-mode body of `<CastingPromptBox>`. Owns the bouncing state via
 * `useSliderBounce` and renders three sliced rows so the box content never
 * reflows on narrow terminals — the viewer can pan ←/→ to scroll instead.
 */
function SliderCastingPrompt({
  lineNumber,
  castIndex,
  min,
  max,
  width,
  tickMs,
  horizontalOffset,
  onSubmit,
}: SliderCastingPromptProps): ReactElement {
  const position = useSliderBounce({
    min,
    max,
    focused: true,
    tickMs,
    onSubmit,
  })

  const title = `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3: — Press SPACE to part the stalks`
  const bar = buildSliderBar(position, min, max)
  const readout = `pick: ${position} / ${max}`

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

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{titleRow}</Text>
      <Text>{barRow}</Text>
      <Text>{readoutRow}</Text>
    </Box>
  )
}
