import { yieldMacrotask } from '@hexagram/test-utils'
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

describe('useLineGenerator — rewindCurrentLine', () => {
  it('clears the generator ref and resets currentMax to 48', async () => {
    const apiRef: { current: HarnessApi | null } = { current: null }
    render(<Harness apiRef={apiRef} />)
    await yieldMacrotask(0)
    expect(apiRef.current!.currentMax).toBe(48)

    // First cast advances the generator: round 2's max < 48.
    apiRef.current!.submitSplit(20)
    await yieldMacrotask(0)
    const round2Max = apiRef.current!.currentMax
    expect(round2Max).toBeLessThan(48)

    // Viewer order: ref reset first, then reducer dispatch.
    apiRef.current!.rewindCurrentLine()
    apiRef.current!.dispatch({ type: 'lineRewound' })
    await yieldMacrotask(0)

    expect(apiRef.current!.currentMax).toBe(48)
    expect(apiRef.current!.state.castIndex).toBe(0)
    expect(apiRef.current!.state.lineIndex).toBe(0)
  })

  it('after rewind, a castIndex=0 submitSplit builds a fresh generator', async () => {
    const apiRef: { current: HarnessApi | null } = { current: null }
    render(<Harness apiRef={apiRef} />)
    await yieldMacrotask(0)

    apiRef.current!.submitSplit(20)
    await yieldMacrotask(0)
    const round2MaxBefore = apiRef.current!.currentMax
    expect(round2MaxBefore).toBeLessThan(48)

    apiRef.current!.rewindCurrentLine()
    apiRef.current!.dispatch({ type: 'lineRewound' })
    await yieldMacrotask(0)
    expect(apiRef.current!.currentMax).toBe(48)
    expect(apiRef.current!.state.castIndex).toBe(0)

    // Submitting again with the same pick should rebuild the generator and
    // land on the same round-2 max as before — deterministic given `pick`.
    apiRef.current!.submitSplit(20)
    await yieldMacrotask(0)
    expect(apiRef.current!.currentMax).toBe(round2MaxBefore)
  })
})
