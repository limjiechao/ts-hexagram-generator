import { initialLineState, maxPickFor, performCast } from '@hexagram/core'
import type { LineState } from '@hexagram/core/types'
import { useRef, type Dispatch } from 'react'

import type { FlowAction, FlowState } from './viewer-flow.js'

interface UseLineGeneratorResult {
  submitSplit: (pick: number) => void
  rewindCurrentLine: () => void
  currentMax: number
}

/**
 * Imperative bridge between the viewer's pure reducer state and
 * `@hexagram/core`'s per-line algorithm. The per-line state and the
 * "current selectable range" live in refs so reducer reductions stay
 * pure; the hook advances the state synchronously on each commit and
 * dispatches `splitCommitted` with the next slot's `max` (plus the
 * resolved `Line` on the third cast).
 *
 * Migrated from a `Generator` ref to a `LineState` ref: `performCast` is
 * a pure step function, so there is no suspended frame to hold across
 * renders — just a value. That simplifies the hook (no per-cast
 * branching, no defensive null-checks) and makes the existing
 * `rewindCurrentLine()` reset trivial (just reset the ref to
 * `initialLineState`). The external API — `submitSplit`,
 * `rewindCurrentLine`, `currentMax` — is unchanged, so the viewer, the
 * reducer, and every existing test continue to work without edits.
 */
export function useLineGenerator(
  state: FlowState,
  dispatch: Dispatch<FlowAction>,
): UseLineGeneratorResult {
  const lineStateRef = useRef<LineState>(initialLineState)
  const currentMaxRef = useRef<number>(maxPickFor(initialLineState))

  const submitSplit = (pick: number): void => {
    if (state.mode !== 'casting') return
    const max = currentMaxRef.current
    const before = lineStateRef.current
    // Defensive: the reducer should never let us call submitSplit on a
    // resolved line (the previous splitCommitted with a Line argument
    // either advances to the next line or transitions out of casting).
    if (before.phase === '3rd-cast') return

    const after = performCast(before, pick)

    if (after.phase === '3rd-cast') {
      // Line complete — reset the ref so the next line starts clean, and
      // reset the displayed max synchronously so the immediate re-render
      // shows the new line's first-cast range (1..48) instead of the
      // stale third-cast max from this line.
      lineStateRef.current = initialLineState
      currentMaxRef.current = maxPickFor(initialLineState)
      dispatch({ type: 'splitCommitted', pick, max, line: after.line })
      return
    }

    lineStateRef.current = after
    currentMaxRef.current = maxPickFor(after)
    dispatch({ type: 'splitCommitted', pick, max })
  }

  // Manual-flow rewind. Drops the per-line state back to `initialLineState`
  // and resets the displayed `currentMax` to the round-1 range so the
  // upcoming `lineRewound` reducer step (the viewer dispatches it right
  // after this call) lands the next render on a clean cast-0 prompt with
  // max 48. Per-cast undo is now expressible too — replace this body with
  // a fold over the surviving SplitRecord prefix — but that's a follow-up
  // plan once the reducer learns the new action shape.
  const rewindCurrentLine = (): void => {
    lineStateRef.current = initialLineState
    currentMaxRef.current = maxPickFor(initialLineState)
  }

  return {
    submitSplit,
    rewindCurrentLine,
    currentMax: currentMaxRef.current,
  }
}
