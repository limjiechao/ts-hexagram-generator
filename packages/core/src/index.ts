import {
  assertIsLine,
  type AdvanceableLineState,
  type FourOperationsResult,
  type Line,
  type LineState,
} from '@hexagram/types'

type SortedStalks =
  | [number, number, number, number]
  | [number, number, number]
  | [number, number]
  | [number]

// Helper functions
const consolidateSortedStalks = (sortedStalks: SortedStalks[]): number[] =>
  sortedStalks.flat()

const sortIntoFours = (stalks: number[]): SortedStalks[] => {
  const stalksCount = stalks.length
  const sortingRemainder: 1 | 2 | 3 = (stalksCount % 4) as 1 | 2 | 3

  const incompleteFours = sortingRemainder ? [sortingRemainder] : []

  const completeFoursCount = (stalksCount - sortingRemainder) / 4
  const completeFours = Array.from<unknown, 4>(
    { length: completeFoursCount },
    () => 4,
  )

  const allFours = [...completeFours, ...incompleteFours]

  const sliceIndices = [0, ...allFours.map((fours, index) => index * 4 + fours)]
  const sliceArguments: [number, number][] = []
  for (let index = 0; index < sliceIndices.length - 1; index += 1) {
    const sliceIndex = sliceIndices[index]
    const nextIndex = sliceIndices[index + 1]
    if (sliceIndex === undefined || nextIndex === undefined) continue
    sliceArguments.push([sliceIndex, nextIndex])
  }

  return sliceArguments.map(
    ([start, end]) => stalks.slice(start, end) as SortedStalks,
  )
}

// 大衍之數五十，其用四十有九。
const principalNumberOfDerivation = 50
const allStalks = Array.from(
  { length: principalNumberOfDerivation },
  (_, index) => index + 1,
)
export const stalksBeforeParting: number[] = allStalks.slice(0, -1)

// 【一營】分而為二以象兩
const partTheStalks = ({
  unpartedStalks = [],
  partStalksAtIndex = 0,
  suspendedFromNextRound,
}: {
  unpartedStalks: number[]
  partStalksAtIndex: number
  suspendedFromNextRound: number[]
}) => ({
  unsortedLeft: unpartedStalks.slice(0, partStalksAtIndex),
  unsortedRight: unpartedStalks.slice(partStalksAtIndex),
  suspendedFromNextRound,
})

// 【二營】掛一以象參
const suspendOneFromTheRight = ({
  unsortedLeft = [],
  unsortedRight = [],
  suspendedFromNextRound,
}: {
  unsortedLeft: number[]
  unsortedRight: number[]
  suspendedFromNextRound: number[]
}) => ({
  unsortedLeft,
  unsortedRight: unsortedRight.slice(0, -1),
  suspendedFromRight: unsortedRight.slice(-1),
  suspendedFromNextRound,
})

// 【三營】揲之以四以象四時
const sortLeftAndRightIntoFours = ({
  unsortedLeft = [],
  unsortedRight = [],
  suspendedFromRight = [],
  suspendedFromNextRound,
}: {
  unsortedLeft: number[]
  unsortedRight: number[]
  suspendedFromRight: number[]
  suspendedFromNextRound: number[]
}) => ({
  sortedLeft: sortIntoFours(unsortedLeft),
  sortedRight: sortIntoFours(unsortedRight),
  suspendedFromRight,
  suspendedFromNextRound,
})

// 【四營】歸奇於扐以象閏，五歲再閏，故再扐而後掛。
const setAsideRemainderFromSortedLeftAndRight = ({
  sortedLeft = [],
  sortedRight = [],
  suspendedFromRight = [],
  suspendedFromNextRound,
}: {
  sortedLeft: SortedStalks[]
  sortedRight: SortedStalks[]
  suspendedFromRight: number[]
  suspendedFromNextRound: number[]
}) => ({
  sortedLeft: sortedLeft.slice(0, -1),
  sortedRight: sortedRight.slice(0, -1),
  suspendedFromRight,
  leftRemainder: consolidateSortedStalks(sortedLeft.slice(-1)),
  rightRemainder: consolidateSortedStalks(sortedRight.slice(-1)),
  suspendedFromNextRound,
})
const consolidateSortedStalksForNextRound = ({
  sortedLeft,
  sortedRight,
  suspendedFromRight,
  leftRemainder,
  rightRemainder,
  suspendedFromNextRound,
}: {
  sortedLeft: SortedStalks[]
  sortedRight: SortedStalks[]
  suspendedFromRight: number[]
  leftRemainder: number[]
  rightRemainder: number[]
  suspendedFromNextRound: number[]
}) => ({
  unpartedStalks: [
    ...consolidateSortedStalks(sortedLeft),
    ...consolidateSortedStalks(sortedRight),
  ],
  suspendedFromNextRound: [
    ...suspendedFromNextRound,
    ...leftRemainder,
    ...rightRemainder,
    ...suspendedFromRight,
  ],
})

// 四營而成易
/*
【一營】分而為二以象兩
【二營】掛一以象參
【三營】 揲之以四以象四時
【四營】歸奇於扐以象閏，五歲再閏，故再扐而後掛。
 */
// Pipe the functions for a complete round
const fourOperations = (unpartedStalksAndPartingPosition: {
  unpartedStalks: number[]
  suspendedFromNextRound: number[]
  partStalksAtIndex: number
}): FourOperationsResult =>
  consolidateSortedStalksForNextRound(
    setAsideRemainderFromSortedLeftAndRight(
      sortLeftAndRightIntoFours(
        suspendOneFromTheRight(partTheStalks(unpartedStalksAndPartingPosition)),
      ),
    ),
  )

// ---------------------------------------------------------------------------
// Pure step API — `performCast` advances a `LineState` by one cast.
//
// The classic generator API (`makeLineGenerator`, below) is a generator
// wrapper around this step function; existing consumers don't need to know
// `performCast` exists. The point of exposing it as a public primitive is
// that the state is a value, not a hidden frame — host code can hold it,
// rebuild it from a SplitRecord prefix, and resume from any cast.
// ---------------------------------------------------------------------------

export const initialLineState: Extract<LineState, { phase: '0th-cast' }> = {
  phase: '0th-cast',
  unparted: stalksBeforeParting,
  suspended: [],
  rounds: [],
}

// The selectable range for the next pick: the prompt's "Pick a number from
// 1 to max". Only meaningful before resolution — `'3rd-cast'` has nothing
// left to pick, so it's excluded from the input domain.
export const maxPickFor = (state: AdvanceableLineState): number =>
  state.unparted.length - 1

// Phase advancement is total over the non-terminal subdomain; the conditional
// type binds the output phase to the input phase exactly.
type NextPhase<P extends AdvanceableLineState['phase']> = P extends '0th-cast'
  ? '1st-cast'
  : P extends '1st-cast'
    ? '2nd-cast'
    : '3rd-cast'

export function performCast<P extends AdvanceableLineState['phase']>(
  state: Extract<LineState, { phase: P }>,
  pick: number,
): Extract<LineState, { phase: NextPhase<P> }> {
  // Runtime guard: the type signature excludes '3rd-cast' but a caller can
  // bypass the type checker with `@ts-expect-error`. Throw explicitly so the
  // bypass is visible at runtime and the test can assert on it.
  if (!('unparted' in state)) {
    throw new Error(
      'performCast called on resolved 3rd-cast state — bypass via @ts-expect-error?',
    )
  }

  // All three advanceable phases share the same fourOperations call — only
  // what we do with the result differs per phase.
  const roundResult = fourOperations({
    unpartedStalks: state.unparted,
    suspendedFromNextRound: state.suspended,
    partStalksAtIndex: pick,
  })

  // The runtime branch decides which discriminant we're emitting; the
  // signature's conditional type tells callers it matches their input.
  // The intermediate typed variable is the bridge between the two —
  // necessary because TS cannot infer the conditional return from a
  // runtime switch-branch alone.
  switch (state.phase) {
    case '0th-cast': {
      const after1st: Extract<LineState, { phase: '1st-cast' }> = {
        phase: '1st-cast',
        unparted: roundResult.unpartedStalks,
        suspended: roundResult.suspendedFromNextRound,
        rounds: [roundResult],
      }
      return after1st as Extract<LineState, { phase: NextPhase<P> }>
    }
    case '1st-cast': {
      const after2nd: Extract<LineState, { phase: '2nd-cast' }> = {
        phase: '2nd-cast',
        unparted: roundResult.unpartedStalks,
        suspended: roundResult.suspendedFromNextRound,
        rounds: [...state.rounds, roundResult] as [
          FourOperationsResult,
          FourOperationsResult,
        ],
      }
      return after2nd as Extract<LineState, { phase: NextPhase<P> }>
    }
    case '2nd-cast': {
      const maybeLine = roundResult.unpartedStalks.length / 4
      assertIsLine(maybeLine)
      const resolved: Extract<LineState, { phase: '3rd-cast' }> = {
        phase: '3rd-cast',
        rounds: [...state.rounds, roundResult] as [
          FourOperationsResult,
          FourOperationsResult,
          FourOperationsResult,
        ],
        line: maybeLine,
      }
      return resolved as Extract<LineState, { phase: NextPhase<P> }>
    }
  }
}

// Pipe three rounds for a complete line. Now a thin generator wrapper
// around `performCast`. The classic API stays — args come in as
// `{ unpartedStalks, suspendedFromNextRound, partStalksAtIndex }` with
// the first pick passed in the args object — but the algorithm of record
// lives in `performCast` above. The wrapper just translates: build the
// 0th-cast state from the args, perform three casts, yielding the
// most-recent round's `FourOperationsResult` between picks, and return
// the resolved Line. Existing consumers (random-casting, interactive-flow,
// legacy-converter, use-line-generator) see the same generator interface
// and `assertIsFourOperationsResult` continues to typecheck each yielded
// payload.
export const makeLineGenerator = function* (roundOneArguments: {
  unpartedStalks: number[]
  suspendedFromNextRound: number[]
  partStalksAtIndex: number
}): Generator<
  /* Yield */ FourOperationsResult,
  /* Return */ Line,
  /* Next */ number
> {
  const s0: Extract<LineState, { phase: '0th-cast' }> = {
    phase: '0th-cast',
    unparted: roundOneArguments.unpartedStalks,
    suspended: roundOneArguments.suspendedFromNextRound,
    rounds: [],
  }
  const s1 = performCast(s0, roundOneArguments.partStalksAtIndex)
  const pick2 = yield s1.rounds[0]
  const s2 = performCast(s1, pick2)
  const pick3 = yield s2.rounds[1]
  const s3 = performCast(s2, pick3)
  yield s3.rounds[2]
  return s3.line
}
