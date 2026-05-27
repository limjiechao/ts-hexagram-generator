import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import {
  assertIsFourOperationsResult,
  assertIsLine,
  type FourOperationsResult,
  type Line,
} from '@hexagram/types'
import { useRef, type Dispatch } from 'react'

import type { FlowAction, FlowState } from './viewer-flow.js'

interface UseLineGeneratorResult {
  submitSplit: (pick: number) => void
  rewindCurrentLine: () => void
  currentMax: number
}

/**
 * Imperative bridge between the viewer's pure reducer state and
 * `@hexagram/core`'s per-line generator. The generator instance and the
 * "current selectable range" live in refs so reducer reductions stay pure;
 * the hook advances the generator synchronously on each commit and
 * dispatches `splitCommitted` with the next slot's `max` (plus the resolved
 * `Line` on the third cast).
 *
 * Returns `currentMax` as a plain number so the render reads the ref's
 * latest snapshot through React's normal data flow — re-renders are
 * triggered by the reducer dispatch in `submitSplit`, so the displayed
 * range stays in sync without manual `forceRender` calls.
 *
 * The generator is built lazily inside `submitSplit` on the first cast of
 * each line — the `castIndex === 0` branch constructs a fresh
 * `makeLineGenerator` with the real `partStalksAtIndex: pick`, advances it
 * synchronously through round one, and stashes it in the ref. The second
 * and third casts pump that same generator via `.next(pick)`, and the
 * third-cast branch nulls the ref out so the next line starts clean. No
 * effects are needed: the placeholder-then-overwrite pattern of the prior
 * implementation was unreachable, since the first-cast branch always
 * replaced the placeholder before any read could observe it.
 */
export function useLineGenerator(
  state: FlowState,
  dispatch: Dispatch<FlowAction>,
): UseLineGeneratorResult {
  const lineGeneratorRef = useRef<Generator<
    FourOperationsResult,
    Line,
    number
  > | null>(null)
  const currentMaxRef = useRef<number>(stalksBeforeParting.length - 1)

  // Submit a casting split: synchronously advance the line generator,
  // capture the next round's `max` (and the returned Line on the third
  // cast), then dispatch `splitCommitted`.
  const submitSplit = (pick: number): void => {
    if (state.mode !== 'casting') return
    const max = currentMaxRef.current
    if (state.castIndex === 0) {
      // First cast: this `pick` is the seed parted-at index. Build a fresh
      // generator from `stalksBeforeParting` with the real pick, drive it
      // forward to yield round one's result, and capture the selectable
      // range for round two.
      const fresh = makeLineGenerator({
        unpartedStalks: stalksBeforeParting,
        suspendedFromNextRound: [],
        partStalksAtIndex: pick,
      })
      const round1 = fresh.next().value
      assertIsFourOperationsResult(round1)
      lineGeneratorRef.current = fresh
      currentMaxRef.current = round1.unpartedStalks.length - 1
      dispatch({ type: 'splitCommitted', pick, max })
      return
    }
    const generator = lineGeneratorRef.current
    if (generator === null) return // defensive: 2nd/3rd cast must follow a 1st cast
    if (state.castIndex === 1) {
      const round2 = generator.next(pick).value
      assertIsFourOperationsResult(round2)
      currentMaxRef.current = round2.unpartedStalks.length - 1
      dispatch({ type: 'splitCommitted', pick, max })
      return
    }
    // Third cast — pump the final round, then read the returned Line.
    const round3 = generator.next(pick).value
    assertIsFourOperationsResult(round3)
    const { value: line } = generator.next()
    assertIsLine(line)
    lineGeneratorRef.current = null // ready for the next line
    // Reset the displayed max synchronously so the immediate re-render shows
    // the new line's first-cast range (1..48) instead of the stale third-cast
    // max from this line.
    currentMaxRef.current = stalksBeforeParting.length - 1
    dispatch({ type: 'splitCommitted', pick, max, line })
  }

  // Manual-flow rewind. Drops the active line generator and resets the
  // displayed `currentMax` to the round-1 range so the upcoming
  // `lineRewound` reducer step (the viewer dispatches it right after this
  // call) lands the next render on a clean cast-0 prompt with max 48.
  const rewindCurrentLine = (): void => {
    lineGeneratorRef.current = null
    currentMaxRef.current = stalksBeforeParting.length - 1
  }

  return {
    submitSplit,
    rewindCurrentLine,
    currentMax: currentMaxRef.current,
  }
}
