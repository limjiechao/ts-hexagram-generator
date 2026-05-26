// Pure state machine for the Playground. No React, no Ink, no I/O —
// the reducer is total and deterministic, so every transition is unit-testable
// against the action union without mounting `<PlaygroundApp>`. The Ink
// orchestrator wires `useReducer(playgroundReducer, initialPlaygroundState())`
// and routes input through `dispatchPlaygroundKey` (see
// `playground-keymap.ts`).
//
// State model:
//   - `lines` — the six current line values (bottom-first; Line 1 at index 0).
//   - `focusIndex` — the single unified cursor for both arrow navigation and
//     digit typing. Typing a digit writes to the next slot in the open run
//     (or to `focusIndex` if no run is open) and bumps the cursor up by one
//     (clamped at 5); ↑/↓ move it freely.
//   - `typingRun` — captures the pre-typing snapshot, the focus position at
//     which the run started, and the digits typed in order. `null` when no
//     run is open. Doubles as the "is a typing run open?" predicate: when
//     non-null, `Delete` is meaningful and `Esc` reverts to it (staged Esc);
//     when null, `Esc` exits. Storing the run as an explicit value rather
//     than reconstructing it from the diff between snapshot and lines means
//     typing the same digit as what was already there is recorded (and
//     undoable), and typing runs that start from focus > 0 round-trip
//     correctly through Delete.
//   - `mode` — `'idle'` for arrow/SPACE/cycle/typing input; `'saving'` while
//     the bottom-strip save-query editor owns input. The typing run survives
//     through `'saving'` so the user can cancel the save and still ESC to
//     revert their typed digits.
//   - `savedPath` — the relative file path of the most recently saved
//     consultation, dimmed in the chrome below the cards until the next save.
//   - `saveError` — the error message from the last failed save, cleared on
//     any subsequent mutation.

import type { Hexagram, Line } from '@hexagram/types'

import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  INITIAL_HEXAGRAM,
  setLineAt,
} from './playground-lines.js'

/** Whether the bottom-strip save-query editor is open. */
export type PlaygroundMode = 'idle' | 'saving'

/**
 * An open typing run — captured the first time a digit is pressed since the
 * last non-typing mutation. `snapshot` is the lines at the moment the run
 * began; `startFocus` is the focus position at that moment; `digits` is the
 * sequence typed since then. Lines are derived as
 * `snapshot[i]` for i < startFocus, `digits[i - startFocus]` for
 * startFocus <= i < startFocus + digits.length, and `snapshot[i]` after.
 */
export interface TypingRun {
  readonly snapshot: Hexagram
  readonly startFocus: number
  readonly digits: readonly Line[]
}

export interface PlaygroundState {
  /** The six current line values, bottom-first. */
  readonly lines: Hexagram
  /** Unified focus + next-typing cursor (0..5, bottom-first). */
  readonly focusIndex: number
  /** The current typing run, or `null` if none is open. */
  readonly typingRun: TypingRun | null
  /** `'saving'` iff the bottom-strip query editor is open. */
  readonly mode: PlaygroundMode
  /**
   * Path (relative to cwd) of the most recently saved consultation, or
   * `null` if nothing saved this session. Persists across further fiddling
   * until overwritten by a fresh save.
   */
  readonly savedPath: string | null
  /**
   * Error from the last save attempt, or `null` if the last save (if any)
   * succeeded. Shown dim-red below the cards until the next save attempt or
   * any non-save mutation clears it.
   */
  readonly saveError: string | null
}

export type PlaygroundAction =
  /** ↑/↓ — move focus by `delta` (clamped to 0..5). */
  | { readonly type: 'focusMove'; readonly delta: -1 | 1 }
  /** SPACE — flip polarity at the focused line, preserving motion. */
  | { readonly type: 'flipPolarity' }
  /** → — advance the focused line one step on the 7→9→8→6 cycle. */
  | { readonly type: 'cycleForward' }
  /** ← — step back one step on the 7→9→8→6 cycle. */
  | { readonly type: 'cycleBackward' }
  /**
   * A digit key (6/7/8/9). Writes the next slot in the open typing run (or
   * `focusIndex` if no run is open), advances the cursor up by 1 (clamped
   * at 5), and records the digit on the run. If the run has already filled
   * up to L6 (write index would exceed 5) the digit is silently ignored —
   * matches the grilled "ignore further digits past L6" rule.
   */
  | { readonly type: 'typeDigit'; readonly digit: Line }
  /**
   * Delete — single-step undo within a typing run. Pops the last typed
   * digit from the run and restores the previous focused-line value. No-op
   * when no run is open.
   */
  | { readonly type: 'deleteTyped' }
  /**
   * `r` — reset all six lines to 7 (Qian #1) and put the cursor on Line 1.
   * Clears any open typing run.
   */
  | { readonly type: 'reset' }
  /**
   * Staged Esc — if a typing run is open, revert to the snapshot, restore
   * focus to where the run started, and close the run (stays in
   * playground); otherwise the keymap routes Esc to its host exit handler
   * directly (no action is dispatched in that case).
   */
  | { readonly type: 'escapePressed' }
  /** `S` — open the bottom-strip save query editor. */
  | { readonly type: 'beginSave' }
  /** Esc inside the save editor — close it without saving. */
  | { readonly type: 'cancelSave' }
  /** Save succeeded; record the relative path. */
  | { readonly type: 'saveSucceeded'; readonly relativePath: string }
  /** Save failed; record the error message. */
  | { readonly type: 'saveFailed'; readonly message: string }

const FOCUS_MIN = 0
const FOCUS_MAX = 5

function clampFocus(index: number): number {
  if (index < FOCUS_MIN) return FOCUS_MIN
  if (index > FOCUS_MAX) return FOCUS_MAX
  return index
}

/** Apply a typing run's digit sequence to its snapshot — pure replay. */
function applyTypingRun(run: TypingRun): Hexagram {
  let lines = run.snapshot
  for (const [index, digit] of run.digits.entries()) {
    lines = setLineAt(lines, run.startFocus + index, digit)
  }
  return lines
}

/** The fresh-Playground state: Qian, focus on Line 1, nothing saved. */
export function initialPlaygroundState(): PlaygroundState {
  return {
    lines: INITIAL_HEXAGRAM,
    focusIndex: 0,
    typingRun: null,
    mode: 'idle',
    savedPath: null,
    saveError: null,
  }
}

/**
 * Pure playground reducer. Closes a typing run on any non-`typeDigit` /
 * `deleteTyped` / `beginSave` mutation so the next typing run starts a fresh
 * snapshot. `beginSave` preserves the run so the user can cancel the save
 * and still ESC to revert their typed digits.
 */
export function playgroundReducer(
  state: PlaygroundState,
  action: PlaygroundAction,
): PlaygroundState {
  // The save editor owns input — only `cancelSave`, `saveSucceeded`, and
  // `saveFailed` move out of it; everything else is dropped to be safe.
  if (state.mode === 'saving') {
    switch (action.type) {
      case 'cancelSave':
        return { ...state, mode: 'idle' }
      case 'saveSucceeded':
        return {
          ...state,
          mode: 'idle',
          savedPath: action.relativePath,
          saveError: null,
        }
      case 'saveFailed':
        return { ...state, mode: 'idle', saveError: action.message }
      default:
        return state
    }
  }

  switch (action.type) {
    case 'focusMove': {
      const nextIndex = clampFocus(state.focusIndex + action.delta)
      if (nextIndex === state.focusIndex) return state
      // Arrow navigation closes any typing run — a new run after this will
      // snapshot the post-move state.
      return { ...state, focusIndex: nextIndex, typingRun: null }
    }
    case 'flipPolarity': {
      const current = state.lines[state.focusIndex] as Line
      const nextLine = flipPolarity(current)
      const lines = setLineAt(state.lines, state.focusIndex, nextLine)
      return { ...state, lines, typingRun: null, saveError: null }
    }
    case 'cycleForward': {
      const current = state.lines[state.focusIndex] as Line
      const lines = setLineAt(
        state.lines,
        state.focusIndex,
        cycleLineForward(current),
      )
      return { ...state, lines, typingRun: null, saveError: null }
    }
    case 'cycleBackward': {
      const current = state.lines[state.focusIndex] as Line
      const lines = setLineAt(
        state.lines,
        state.focusIndex,
        cycleLineBackward(current),
      )
      return { ...state, lines, typingRun: null, saveError: null }
    }
    case 'typeDigit': {
      const existingRun = state.typingRun
      if (existingRun === null) {
        // First digit of a fresh run — capture snapshot at current focus.
        if (state.focusIndex > FOCUS_MAX) return state
        const lines = setLineAt(state.lines, state.focusIndex, action.digit)
        return {
          ...state,
          lines,
          focusIndex: clampFocus(state.focusIndex + 1),
          typingRun: {
            snapshot: state.lines,
            startFocus: state.focusIndex,
            digits: [action.digit],
          },
          saveError: null,
        }
      }
      // Continue the open run. The next write lands at startFocus + length.
      const writeIndex = existingRun.startFocus + existingRun.digits.length
      // Ignore digits past L6 (the grilled "no overflow" rule).
      if (writeIndex > FOCUS_MAX) return state
      const lines = setLineAt(state.lines, writeIndex, action.digit)
      return {
        ...state,
        lines,
        focusIndex: clampFocus(writeIndex + 1),
        typingRun: {
          ...existingRun,
          digits: [...existingRun.digits, action.digit],
        },
        saveError: null,
      }
    }
    case 'deleteTyped': {
      const run = state.typingRun
      if (run === null) return state
      if (run.digits.length === 0) {
        // Defensive cleanup — shouldn't happen, but close the run.
        return { ...state, typingRun: null }
      }
      const remaining = run.digits.slice(0, -1)
      if (remaining.length === 0) {
        // Run is now empty — restore snapshot and close it.
        return {
          ...state,
          lines: run.snapshot,
          focusIndex: run.startFocus,
          typingRun: null,
        }
      }
      const trimmedRun: TypingRun = { ...run, digits: remaining }
      return {
        ...state,
        lines: applyTypingRun(trimmedRun),
        focusIndex: clampFocus(run.startFocus + remaining.length),
        typingRun: trimmedRun,
      }
    }
    case 'reset':
      return {
        ...state,
        lines: INITIAL_HEXAGRAM,
        focusIndex: 0,
        typingRun: null,
        saveError: null,
      }
    case 'escapePressed': {
      const run = state.typingRun
      if (run === null) return state
      return {
        ...state,
        lines: run.snapshot,
        focusIndex: run.startFocus,
        typingRun: null,
      }
    }
    case 'beginSave':
      // Preserve any open typing run so the user can cancel save and still
      // ESC to revert. Reviewer #2's UX finding.
      return { ...state, mode: 'saving' }
    case 'cancelSave':
    case 'saveSucceeded':
    case 'saveFailed':
      // Only meaningful while saving — defensive no-op otherwise.
      return state
  }
}

/** `true` iff a typing run is currently open. */
export function isTypingRunOpen(state: PlaygroundState): boolean {
  return state.typingRun !== null
}
