import type { Casting, CompleteCasting, PartialCasting } from '#src/casting.js'
import { isCompleteCasting } from '#src/complete-casting.js'
import type { LinePosition } from '#src/line-position.js'
import type { Pick } from '#src/pick.js'
import type { Remainder } from '#src/remainder.js'
import type { Round } from '#src/round.js'
import type { SetAside } from '#src/set-aside.js'

/** ADR-0038's Empty Casting: no Rounds yet, so the next Round has 49 stalks. */
export const emptyCasting: PartialCasting = { state: 'partial', rounds: [] }

/**
 * What a person reads off the heaps after a Physical Division: the piles of
 * four and the Remainder on each side. Any field may be absent, as the step
 * checks that the Transcription is complete.
 */
export interface Transcription {
  readonly pilesLeft: number | undefined
  readonly remainderLeft: number | undefined
  readonly pilesRight: number | undefined
  readonly remainderRight: number | undefined
}

/**
 * The rule a Division broke: ADR-0023's valid Pick, one of ADR-0038's
 * Transcription checks in ADR-0043's order (complete, Remainders 1–4,
 * Set-aside, conservation), or `replay` when the incoming partial Casting's
 * Picks do not replay.
 */
export type DivisionRule =
  | 'valid-pick'
  | 'complete'
  | 'remainders'
  | 'conservation'
  | 'set-aside'
  | 'replay'

/**
 * Why a Division was not taken, naming what ADR-0038's `422` names, except
 * the valid range, which `nextRound` gives. The Pick is absent when an
 * incomplete Transcription yields none. A `replay` refusal names the first
 * Round that fails to replay, with its recorded Line, Round and stalks.
 */
export interface Refusal {
  readonly line: LinePosition
  readonly round: 1 | 2 | 3
  readonly stalks: number
  readonly pick: Pick | undefined
  readonly rule: DivisionRule
}

/** The next Casting, complete after the eighteenth Round, or a refusal. */
export type DivisionResult =
  | { readonly outcome: 'divided'; readonly casting: Casting }
  | { readonly outcome: 'refused'; readonly refusal: Refusal }

/**
 * The Round a partial Casting awaits, in ADR-0038's JSON shape: its stalks,
 * its valid Picks 1 to stalks − 2 (ADR-0023), and those Picks grouped by the
 * left Remainder they leave.
 */
export interface NextRound {
  readonly stalks: number
  readonly validPicks: { readonly min: Pick; readonly max: Pick }
  readonly remainderGroups: Readonly<Record<Remainder, readonly Pick[]>>
}

/** The Round a partial Casting awaits, or a refusal. */
export type NextRoundResult =
  | { readonly outcome: 'next'; readonly round: NextRound }
  | {
      readonly outcome: 'refused'
      readonly refusal: Refusal & { readonly rule: 'replay' }
    }

/**
 * Gives the Round a partial Casting awaits. It first replays the Casting's
 * Picks and refuses, with rule `replay`, a Casting that does not replay.
 */
export function nextRound(casting: PartialCasting): NextRoundResult {
  const replayed = replay(casting)
  if (replayed.outcome === 'refused') return replayed
  return { outcome: 'next', round: roundAwaited(replayed.next.stalks) }
}

/**
 * Takes the next Round from a Pick. It first replays the incoming partial
 * Casting's Picks and refuses, with rule `replay`, a Casting that does not
 * replay.
 */
export function divide(casting: PartialCasting, pick: Pick): DivisionResult {
  const replayed = replay(casting)
  if (replayed.outcome === 'refused') return replayed
  return divideReplayed(replayed.next, replayed.rebuilt, pick)
}

/**
 * Takes the next Round from a Transcription. It first replays the incoming
 * partial Casting's Picks and refuses, with rule `replay`, a Casting that
 * does not replay. It then runs ADR-0043's checks in order, refusing with the
 * first that fails, and otherwise divides by the Pick the left heap gives.
 */
export function transcribe(
  casting: PartialCasting,
  transcription: Transcription,
): DivisionResult {
  const replayed = replay(casting)
  if (replayed.outcome === 'refused') return replayed
  const { next, rebuilt } = replayed
  const { pilesLeft, remainderLeft, pilesRight, remainderRight } = transcription
  if (
    pilesLeft === undefined ||
    remainderLeft === undefined ||
    pilesRight === undefined ||
    remainderRight === undefined ||
    !isPileCount(pilesLeft) ||
    !isPileCount(pilesRight)
  ) {
    return {
      outcome: 'refused',
      refusal: { ...next, pick: undefined, rule: 'complete' },
    }
  }
  const pick = 4 * pilesLeft + remainderLeft
  const rule = transcriptionRuleBroken(next, {
    pilesLeft,
    remainderLeft,
    pilesRight,
    remainderRight,
  })
  if (rule !== undefined) {
    return { outcome: 'refused', refusal: { ...next, pick, rule } }
  }
  // ADR-0043: a Transcription that passes its checks gives a valid Pick, so
  // this never refuses with `valid-pick`.
  return divideReplayed(next, rebuilt, pick)
}

/** Where the next Round falls in a Casting, and the stalks it starts from. */
interface NextPlace {
  readonly line: LinePosition
  readonly round: 1 | 2 | 3
  readonly stalks: number
}

type LineRounds = CompleteCasting['rounds'][number]

/**
 * The Rounds a replay rebuilds, grouped by Line as a partial Casting holds
 * them: the finished Lines, and the open Line's Rounds so far.
 */
interface Rebuilt {
  readonly finished: Extract<PartialCasting['rounds'], readonly LineRounds[]>
  readonly open:
    | readonly []
    | Exclude<PartialCasting['rounds'][number], LineRounds>
}

/**
 * A partial Casting's Picks replayed: the next Round's place and the Rounds
 * rebuilt before it, or a refusal.
 */
type Replay =
  | {
      readonly outcome: 'replayed'
      readonly next: NextPlace
      readonly rebuilt: Rebuilt
    }
  | {
      readonly outcome: 'refused'
      readonly refusal: Refusal & { readonly rule: 'replay' }
    }

const linePositions: readonly LinePosition[] = [1, 2, 3, 4, 5, 6]
const roundsOfLine: readonly (1 | 2 | 3)[] = [1, 2, 3]

/**
 * The places a partial Casting can hold a Round, bottom-up: every place but
 * the eighteenth, which its type never holds.
 */
const heldPlaces = linePositions
  .flatMap((line) => roundsOfLine.map((round) => ({ line, round })))
  .slice(0, -1)

/**
 * Replays a partial Casting Round by Round: each Line starts from 49 stalks,
 * and each later Round from the stalks the Round before leaves. Each Round is
 * rebuilt from its Pick and those stalks, and the first whose recorded fields
 * differ, or whose Pick is not valid, is refused with what it records.
 */
function replay(casting: PartialCasting): Replay {
  let stalks = 49
  let rebuilt: Rebuilt = { finished: [], open: [] }
  for (const { line, round } of heldPlaces) {
    if (round === 1) stalks = 49
    const recorded = casting.rounds[line - 1]?.[round - 1]
    if (recorded === undefined) {
      return {
        outcome: 'replayed',
        next: { line, round, stalks },
        rebuilt,
      }
    }
    const rebuiltRound = roundFrom(stalks, recorded.pick)
    if (rebuiltRound === undefined || !recordsSame(recorded, rebuiltRound)) {
      const { stalks: recordedStalks, pick } = recorded
      return {
        outcome: 'refused',
        refusal: { line, round, stalks: recordedStalks, pick, rule: 'replay' },
      }
    }
    stalks -= rebuiltRound.setAside
    const { finished, open } = rebuilt
    if (open.length === 0) {
      rebuilt = { finished, open: [rebuiltRound] }
    } else if (open.length === 1) {
      rebuilt = { finished, open: [open[0], rebuiltRound] }
    } else if (finished.length !== 5) {
      // Always taken: a sixth Line would finish at the eighteenth place,
      // which the walk never reaches.
      rebuilt = {
        finished: [...finished, [open[0], open[1], rebuiltRound]],
        open: [],
      }
    }
  }
  return {
    outcome: 'replayed',
    next: { line: 6, round: 3, stalks },
    rebuilt,
  }
}

/**
 * Takes the Round a Pick makes at the next place, after a replay: refused
 * with rule `valid-pick` when the Pick is not valid (ADR-0023), otherwise the
 * rebuilt Rounds plus the new one, complete after the eighteenth Round.
 */
function divideReplayed(
  next: NextPlace,
  rebuilt: Rebuilt,
  pick: Pick,
): DivisionResult {
  const round = roundFrom(next.stalks, pick)
  if (round === undefined) {
    return {
      outcome: 'refused',
      refusal: { ...next, pick, rule: 'valid-pick' },
    }
  }
  const { finished, open } = rebuilt
  if (open.length !== 2) {
    return {
      outcome: 'divided',
      casting: {
        state: 'partial',
        rounds:
          open.length === 0
            ? [...finished, [round]]
            : [...finished, [open[0], round]],
      },
    }
  }
  const line: LineRounds = [open[0], open[1], round]
  if (finished.length !== 5) {
    return {
      outcome: 'divided',
      casting: { state: 'partial', rounds: [...finished, line] },
    }
  }
  return { outcome: 'divided', casting: completed([...finished, line]) }
}

/** A pile count is a whole number from 0 (ADR-0043's `complete`). */
function isPileCount(count: number): boolean {
  return Number.isInteger(count) && count >= 0
}

/**
 * The first of ADR-0043's checks after `complete` that a complete
 * Transcription fails at the next place: `remainders`, `set-aside` or
 * `conservation`. Absent when it passes all three.
 */
function transcriptionRuleBroken(
  next: NextPlace,
  {
    pilesLeft,
    remainderLeft,
    pilesRight,
    remainderRight,
  }: { readonly [Field in keyof Transcription]: number },
): DivisionRule | undefined {
  if (!isRemainderCount(remainderLeft) || !isRemainderCount(remainderRight)) {
    return 'remainders'
  }
  const setAside = 1 + remainderLeft + remainderRight
  const setAsides = next.round === 1 ? [5, 9] : [4, 8]
  if (!setAsides.includes(setAside)) return 'set-aside'
  const counted =
    4 * pilesLeft + remainderLeft + 4 * pilesRight + remainderRight + 1
  return counted === next.stalks ? undefined : 'conservation'
}

/** A Remainder is 1, 2, 3 or 4, never 0. */
function isRemainderCount(count: number): boolean {
  return [1, 2, 3, 4].includes(count)
}

/** Every field a Round records, the Pick aside, as replay rebuilds them. */
function recordsSame(recorded: Round, rebuilt: Round): boolean {
  return (
    recorded.stalks === rebuilt.stalks &&
    recorded.remainderLeft === rebuilt.remainderLeft &&
    recorded.remainderRight === rebuilt.remainderRight &&
    recorded.setAside === rebuilt.setAside
  )
}

/**
 * The Round a Pick makes of `stalks`: the left heap holds the Pick, the Hung
 * Stalk comes from the right heap, and each heap is counted off in fours.
 * Absent when the Pick is not valid (ADR-0023), or the stalks are not ones a
 * Casting reaches, so the Hung Stalk and both Remainders make no Set-aside.
 */
function roundFrom(stalks: number, pick: Pick): Round | undefined {
  if (!isValidPick(stalks, pick)) return undefined
  const remainderLeft = remainderOf(pick)
  const remainderRight = remainderOf(stalks - pick - 1)
  const setAside = setAsideOf(1 + remainderLeft + remainderRight)
  if (setAside === undefined) return undefined
  return { stalks, pick, remainderLeft, remainderRight, setAside }
}

/** A valid Pick is a whole number from 1 to stalks − 2 (ADR-0023). */
function isValidPick(stalks: number, pick: Pick): boolean {
  return Number.isInteger(pick) && pick >= 1 && pick <= stalks - 2
}

/** What counting off a heap of at least one stalk in fours leaves. */
function remainderOf(count: number): Remainder {
  switch (count % 4) {
    case 1:
      return 1
    case 2:
      return 2
    case 3:
      return 3
    default:
      return 4
  }
}

function setAsideOf(total: number): SetAside | undefined {
  switch (total) {
    case 4:
    case 5:
    case 8:
    case 9:
      return total
    default:
      return undefined
  }
}

/** The Round awaited at `stalks`, its Remainder Groups in ascending Picks. */
function roundAwaited(stalks: number): NextRound {
  const max = stalks - 2
  const remainderGroups: Record<Remainder, Pick[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  }
  for (let pick = 1; pick <= max; pick += 1) {
    remainderGroups[remainderOf(pick)].push(pick)
  }
  return { stalks, validPicks: { min: 1, max }, remainderGroups }
}

/**
 * The complete Casting of six finished Lines, each Line Value being 49 less
 * its three Set-asides, over 4 (ADR-0023). It is made only through
 * `isCompleteCasting`, and Rounds that replay always pass it, so a failure is
 * a defect in the Oracle, thrown rather than refused.
 */
function completed(lines: readonly LineRounds[]): CompleteCasting {
  const casting = {
    state: 'complete',
    rounds: lines,
    transformation: lines.map(
      (line) =>
        (49 - line.reduce((sum, { setAside }) => sum + setAside, 0)) / 4,
    ),
  }
  if (!isCompleteCasting(casting)) {
    throw new Error('Defect: the Oracle made a Casting that is not complete', {
      cause: casting,
    })
  }
  return casting
}
