import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import {
  assertIsFourOperationsResult,
  assertIsLine,
  type FourOperationsResult,
  type Line,
} from '@hexagram/types'
import { useEffect, useRef, type Dispatch } from 'react'

import type { FlowAction, FlowState } from './viewer-flow.js'

interface UseLineGeneratorResult {
  submitSplit: (pick: number) => void
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
 * The line-boundary effect (re)creates the generator at the start of each
 * new line (`castIndex === 0`, no live generator). The third-cast branch
 * inside `submitSplit` nulls the generator out so the effect can re-arm it
 * for the next line.
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

  // (Re)create the generator when the casting phase starts a new line.
  useEffect(() => {
    if (state.mode !== 'casting') return
    if (state.castIndex !== 0) return
    if (lineGeneratorRef.current !== null) return // already initialised for this line
    const generator = makeLineGenerator({
      unpartedStalks: stalksBeforeParting,
      suspendedFromNextRound: [],
      partStalksAtIndex: 1, // placeholder; the real pick goes in via .next(pick) on the 2nd round
    })
    lineGeneratorRef.current = generator
    currentMaxRef.current = stalksBeforeParting.length - 1
  }, [state.mode, state.castIndex, state.lineIndex])

  // Submit a casting split: synchronously advance the line generator,
  // capture the next round's `max` (and the returned Line on the third
  // cast), then dispatch `splitCommitted`.
  const submitSplit = (pick: number): void => {
    if (state.mode !== 'casting') return
    const generator = lineGeneratorRef.current
    if (generator === null) return
    const max = currentMaxRef.current
    if (state.castIndex === 0) {
      // First cast: this `pick` is the seed parted-at index. Re-create the
      // generator with the real pick, then drive it forward to yield round
      // one's result and capture the selectable range for round two.
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
    // max from this line. The line-boundary `useEffect` above will
    // idempotently confirm the same value when it re-creates the placeholder
    // generator, but that effect fires only after render — too late on its
    // own.
    currentMaxRef.current = stalksBeforeParting.length - 1
    dispatch({ type: 'splitCommitted', pick, max, line })
  }

  return { submitSplit, currentMax: currentMaxRef.current }
}
