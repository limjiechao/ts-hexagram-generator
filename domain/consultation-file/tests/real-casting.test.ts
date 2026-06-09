import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import {
  assertIsLine,
  type Hexagram,
  type Line,
  type LineCasting,
} from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { realCastingFor } from './fixtures/real-casting.js'

// Replay one line through the production generator — the same operation
// `castingReplaysTo` performs. Kept local (not imported from the package
// internals) so this self-check stays an independent witness.
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

describe('realCastingFor', () => {
  // If an algorithm change makes a building block stop reproducing its line,
  // this is where it surfaces — loudly and in one place — rather than as a
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
      const replayed = realCastingFor(hexagram).map(replayLine)
      expect(replayed).toEqual([...hexagram])
    }
  })
})
