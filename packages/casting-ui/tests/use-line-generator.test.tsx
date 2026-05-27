import { waitFor } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { useReducer, type Dispatch } from 'react'
import { describe, expect, it } from 'vitest'

import { useLineGenerator } from '../src/use-line-generator.js'
import {
  flowReducer,
  initialFlowState,
  type FlowAction,
  type FlowState,
} from '../src/viewer-flow.js'

// `useLineGenerator` is the imperative bridge between the pure reducer and
// `@hexagram/core`'s per-line generator. The harness mounts the hook in a
// no-render component and surfaces its API plus the reducer's `dispatch` and
// the latest `state` so tests can drive the same sequence the viewer would
// (call `rewindCurrentLine` then dispatch `lineRewound`, or call `submitSplit`
// to advance casts) and read the hook's per-render `currentMax` snapshot.

interface HarnessApi {
  submitSplit: (pick: number) => void
  rewindCurrentLine: () => void
  currentMax: number
  state: FlowState
  dispatch: Dispatch<FlowAction>
}

const initialManualCasting = (): FlowState => ({
  ...initialFlowState('manual', null, null),
  mode: 'casting',
  query: 'Will the rains come?',
})

function Harness({ apiRef }: { apiRef: { current: HarnessApi | null } }): null {
  const [state, dispatch] = useReducer(
    flowReducer,
    undefined,
    initialManualCasting,
  )
  const api = useLineGenerator(state, dispatch)
  apiRef.current = { ...api, state, dispatch }
  return null
}

// Hook tests must observe a per-render snapshot of `currentMax`, but the
// dispatch that triggers the re-render commits on a later microtask — under
// 2-CPU contention (turbo's `test:stress`) a fixed-delay `yieldMacrotask(0)`
// is not long enough for React to flush. `waitForCurrentMax` retries the
// snapshot read against `waitFor`'s 4 s deadline, so an arbitrarily delayed
// commit still surfaces a passing test instead of a stale-closure flake.
// (See `superpowers:cross-platform-tests` Lesson A — attack the class, not
// the instance.)
async function waitForCurrentMax(
  apiRef: { current: HarnessApi | null },
  expected: number,
): Promise<void> {
  await waitFor(() => {
    expect(apiRef.current?.currentMax).toBe(expected)
  })
}

async function waitForCurrentMaxLessThan(
  apiRef: { current: HarnessApi | null },
  threshold: number,
): Promise<number> {
  await waitFor(() => {
    expect(apiRef.current?.currentMax).toBeLessThan(threshold)
  })
  return apiRef.current!.currentMax
}

describe('useLineGenerator — rewindCurrentLine', () => {
  it('clears the generator ref and resets currentMax to 48', async () => {
    const apiRef: { current: HarnessApi | null } = { current: null }
    render(<Harness apiRef={apiRef} />)
    await waitForCurrentMax(apiRef, 48)

    // First cast advances the generator: round 2's max < 48.
    apiRef.current!.submitSplit(20)
    await waitForCurrentMaxLessThan(apiRef, 48)

    // Viewer order: ref reset first, then reducer dispatch.
    apiRef.current!.rewindCurrentLine()
    apiRef.current!.dispatch({ type: 'lineRewound' })
    await waitForCurrentMax(apiRef, 48)

    expect(apiRef.current!.state.castIndex).toBe(0)
    expect(apiRef.current!.state.lineIndex).toBe(0)
  })

  it('after rewind, a castIndex=0 submitSplit builds a fresh generator', async () => {
    const apiRef: { current: HarnessApi | null } = { current: null }
    render(<Harness apiRef={apiRef} />)
    await waitForCurrentMax(apiRef, 48)

    apiRef.current!.submitSplit(20)
    const round2MaxBefore = await waitForCurrentMaxLessThan(apiRef, 48)

    apiRef.current!.rewindCurrentLine()
    apiRef.current!.dispatch({ type: 'lineRewound' })
    await waitForCurrentMax(apiRef, 48)
    expect(apiRef.current!.state.castIndex).toBe(0)

    // Submitting again with the same pick should rebuild the generator and
    // land on the same round-2 max as before — deterministic given `pick`.
    apiRef.current!.submitSplit(20)
    await waitForCurrentMax(apiRef, round2MaxBefore)
  })
})
