// Data-driven keymap for the Playground. Pure module — no React or
// Ink imports beyond the `Key` type — so each binding is unit-testable
// without mounting ink-testing-library. `dispatchPlaygroundKey()` walks
// `PLAYGROUND_BINDINGS` in declaration order and returns true the moment a
// binding's `when` predicate and `match` predicate both hold; first match
// wins. This mirrors the structure of `viewer-keymap.ts` so the two screens
// share one mental model.
//
// All Ctrl/Meta combinations are deliberately ignored — Ctrl+C is the host's
// hard quit (the bin owns that, not this keymap), and a stray Ctrl+R must
// not trigger reset. The save-editor mode owns its own input via the
// `<SaveStrip>` component; this keymap is suppressed entirely while
// `state.mode === 'saving'`.

import type { Key } from 'ink'

import type { PlaygroundAction, PlaygroundState } from './playground-state.js'

/**
 * Minimal structural slice of the playground state the keymap reads. Lets
 * tests construct a synthetic state without depending on the full
 * `PlaygroundState` shape.
 */
export interface PlaygroundStateSlice {
  readonly mode: 'idle' | 'saving'
  readonly typingRun: unknown
}

export interface PlaygroundKeyContext {
  /** The current playground state. */
  readonly state: PlaygroundStateSlice
  /** Dispatch a `PlaygroundAction`. */
  readonly dispatch: (action: PlaygroundAction) => void
  /**
   * Exit the playground — invoked when Esc is pressed with no typing run
   * open. The host (`<HexagramApp>` in the composed CLI, the bin in
   * standalone) decides whether that means "back to home" or "quit".
   */
  readonly exit: () => void
}

export interface PlaygroundKeyBinding {
  readonly id: string
  readonly when: (state: PlaygroundStateSlice) => boolean
  readonly match: (input: string, key: Key) => boolean
  readonly run: (ctx: PlaygroundKeyContext, input: string, key: Key) => void
}

/** Predicate: matches whenever the playground is not in the save-editor mode. */
export const NOT_SAVING = (state: PlaygroundStateSlice): boolean =>
  state.mode !== 'saving'

/**
 * Reject Ctrl/Meta-modified keys at the predicate level so a stray modifier
 * doesn't latch a digit / SPACE / letter binding.
 */
function isUnmodified(key: Key): boolean {
  return key.ctrl !== true && key.meta !== true
}

export const PLAYGROUND_BINDINGS: readonly PlaygroundKeyBinding[] = [
  // ── Esc ──────────────────────────────────────────────────────────────────
  // Staged: revert typing run if open (reducer handles it), else exit.
  {
    id: 'escape',
    when: NOT_SAVING,
    match: (_input, key) => key.escape === true,
    run: (ctx) => {
      if (ctx.state.typingRun === null) {
        ctx.exit()
      } else {
        ctx.dispatch({ type: 'escapePressed' })
      }
    },
  },
  // ── ↑/↓ — focus ──────────────────────────────────────────────────────────
  {
    id: 'focus-up',
    when: NOT_SAVING,
    match: (_input, key) => key.upArrow === true,
    run: (ctx) => {
      ctx.dispatch({ type: 'focusMove', delta: 1 })
    },
  },
  {
    id: 'focus-down',
    when: NOT_SAVING,
    match: (_input, key) => key.downArrow === true,
    run: (ctx) => {
      ctx.dispatch({ type: 'focusMove', delta: -1 })
    },
  },
  // ── SPACE — flip polarity preserving motion ──────────────────────────────
  {
    id: 'flip-polarity',
    when: NOT_SAVING,
    match: (input, key) => isUnmodified(key) && input === ' ',
    run: (ctx) => {
      ctx.dispatch({ type: 'flipPolarity' })
    },
  },
  // ── ←/→ — cycle 7→9→8→6 / reverse ────────────────────────────────────────
  {
    id: 'cycle-forward',
    when: NOT_SAVING,
    match: (_input, key) => key.rightArrow === true,
    run: (ctx) => {
      ctx.dispatch({ type: 'cycleForward' })
    },
  },
  {
    id: 'cycle-backward',
    when: NOT_SAVING,
    match: (_input, key) => key.leftArrow === true,
    run: (ctx) => {
      ctx.dispatch({ type: 'cycleBackward' })
    },
  },
  // ── 6/7/8/9 — live-type bottom-first ─────────────────────────────────────
  {
    id: 'type-digit',
    when: NOT_SAVING,
    match: (input, key) =>
      isUnmodified(key) &&
      input.length === 1 &&
      (input === '6' || input === '7' || input === '8' || input === '9'),
    run: (ctx, input) => {
      // `match` guarantees `input` is one of `'6' | '7' | '8' | '9'`, which
      // maps onto the `Line` union. The narrowing is safe because the
      // predicate above is the only entry point.
      const digit = Number.parseInt(input, 10) as 6 | 7 | 8 | 9
      ctx.dispatch({ type: 'typeDigit', digit })
    },
  },
  // ── Delete / Backspace — undo last typed digit in the run ────────────────
  {
    id: 'delete-typed',
    when: NOT_SAVING,
    match: (_input, key) => key.delete === true || key.backspace === true,
    run: (ctx) => {
      ctx.dispatch({ type: 'deleteTyped' })
    },
  },
  // ── r — reset to Qian ────────────────────────────────────────────────────
  {
    id: 'reset',
    when: NOT_SAVING,
    match: (input, key) => isUnmodified(key) && input === 'r',
    run: (ctx) => {
      ctx.dispatch({ type: 'reset' })
    },
  },
  // ── S — open save query editor ───────────────────────────────────────────
  // Match both `S` and `s` so the user doesn't have to shift.
  {
    id: 'begin-save',
    when: NOT_SAVING,
    match: (input, key) =>
      isUnmodified(key) && (input === 'S' || input === 's'),
    run: (ctx) => {
      ctx.dispatch({ type: 'beginSave' })
    },
  },
]

/**
 * Walk `PLAYGROUND_BINDINGS` in declaration order; fire the first binding
 * whose `when` predicate matches the state slice and whose `match` matches
 * the input. Returns `true` if a binding fired, `false` otherwise (the
 * caller may then fall through to other handlers, e.g. a host Ctrl+C).
 */
export function dispatchPlaygroundKey(
  input: string,
  key: Key,
  ctx: PlaygroundKeyContext,
): boolean {
  for (const binding of PLAYGROUND_BINDINGS) {
    if (!binding.when(ctx.state)) continue
    if (!binding.match(input, key)) continue
    binding.run(ctx, input, key)
    return true
  }
  return false
}

/** Map the structural `PlaygroundState` to the slice the keymap reads. */
export function toKeymapSlice(state: PlaygroundState): PlaygroundStateSlice {
  return { mode: state.mode, typingRun: state.typingRun }
}
