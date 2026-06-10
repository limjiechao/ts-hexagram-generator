import { describe, expect, it } from 'vitest'

import { makeLineGenerator, stalksBeforeParting } from '../src/index.js'
import { sampleCastingFor } from '../src/sample-casting.js'
import {
  assertIsLine,
  type Hexagram,
  type Line,
  type LineCasting,
} from '../src/types.js'

// Replay one line through the production generator — the inverse of what
// `sampleCastingFor` constructs.
function replayLine(lineCasting: LineCasting): Line {
  const [c1, c2, c3] = lineCasting
  const generator = makeLineGenerator({
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: c1.pick,
  })
  if (generator.next().done) throw new Error('replay: generator ended early')
  if (generator.next(c2.pick).done) {
    throw new Error('replay: generator ended early')
  }
  generator.next(c3.pick)
  const line = generator.next().value
  assertIsLine(line)
  return line
}

describe('sampleCastingFor', () => {
  // Locks the per-line blocks: if an algorithm change makes one stop
  // reproducing its line, this fails here — in one place — rather than as a
  // mysterious `casting-unreplayable` in every fixture that consumes it.
  it('produces a casting that replays to the requested hexagram', () => {
    const hexagrams: Hexagram[] = [
      [7, 8, 7, 8, 7, 8],
      [6, 7, 8, 7, 8, 7],
      [6, 9, 7, 8, 7, 8],
      [7, 7, 7, 7, 7, 7],
      [9, 9, 9, 9, 9, 9],
      [6, 6, 6, 6, 6, 6],
    ]
    for (const hexagram of hexagrams) {
      const replayed = sampleCastingFor(hexagram).map(replayLine)
      expect(replayed).toEqual([...hexagram])
    }
  })

  it('deep-copies so callers cannot corrupt the shared blocks', () => {
    const a = sampleCastingFor([7, 7, 7, 7, 7, 7])
    a[0][0].pick = 999
    const b = sampleCastingFor([7, 7, 7, 7, 7, 7])
    expect(b[0][0].pick).not.toBe(999)
  })
})
