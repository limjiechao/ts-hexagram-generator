import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import {
  assertIsLine,
  type CastingRecord,
  type Hexagram,
  type Line,
  type LineCasting,
} from '@hexagram/core/types'

/**
 * The single authoritative replay rule, shared by BOTH load paths (ADR-0008,
 * S7): the legacy `.txt` converter that proves a recovered Shape-A table, and
 * the `.md` parser (`frontmatter.ts`) that validates our own saved casting.
 *
 * Replay the 18 recorded splits through `makeLineGenerator` and check the
 * resulting 6-line tuple equals `expected`. Any throw during replay (e.g. a
 * `pick` outside the round's stalk range) counts as a mismatch. The principle
 * is "prove, don't trust": a casting that reproduces its stored hexagram is
 * proven correct; one that does not is corruption (a hand-edited or damaged
 * file) and is refused by the caller, never rendered as a trusted ledger.
 */
export function castingReplaysTo(
  casting: CastingRecord,
  expected: Hexagram,
): boolean {
  try {
    const replayed = casting.map((lineCasting) => replayLine(lineCasting))
    return replayed.every((line, index) => line === expected[index])
  } catch {
    return false
  }
}

/** Drive `makeLineGenerator` for one line with its three `(pick)` splits. */
function replayLine(lineCasting: LineCasting): Line {
  const [cast1, cast2, cast3] = lineCasting
  // Each recorded pick is validated by `performCast` inside `makeLineGenerator`
  // (the single runtime enforcer): a degenerate pick that empties the right heap
  // after suspension throws `RangeError`, which `castingReplaysTo` catches as a
  // mismatch. The caller decides what a mismatch MEANS — the legacy converter
  // resolves it to a `legacy-unreplayable` null (salvage of foreign input), the
  // `.md` parser to a `casting-unreplayable` parse failure (refusal of our own
  // corrupted output); see ADR-0006 and ADR-0008.
  const generator = makeLineGenerator({
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: cast1.pick,
  })
  const roundOne = generator.next()
  if (roundOne.done) throw new Error('replay: generator ended early')
  const roundTwo = generator.next(cast2.pick)
  if (roundTwo.done) throw new Error('replay: generator ended early')
  generator.next(cast3.pick)
  const line = generator.next().value
  assertIsLine(line)
  return line
}
