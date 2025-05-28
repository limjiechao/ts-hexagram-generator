import { assertIsLine, type FourOperationsResult, type Line } from './types'

type SortedStalks =
  | [number, number, number, number]
  | [number, number, number]
  | [number, number]
  | [number]

// Helper functions
const consolidateSortedStalks = (sortedStalks: SortedStalks[]): number[] =>
  sortedStalks.reduce<number[]>(
    (consolidated, remainder) => [...consolidated, ...remainder],
    [],
  )

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
  const sliceArguments = sliceIndices.reduce<[number, number][]>(
    (result, sliceIndex, index, sliceIndices) =>
      sliceIndices.length !== index + 1
        ? [...result, [sliceIndex, sliceIndices[index + 1]]]
        : result,
    [],
  )

  return sliceArguments.map(
    (sliceArguments) => stalks.slice(...sliceArguments) as SortedStalks,
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

// Pipe three rounds for a complete line
export const makeLineGenerator = function* (roundOneArguments: {
  unpartedStalks: number[]
  suspendedFromNextRound: number[]
  partStalksAtIndex: number
}): Generator<
  /* Yield */ FourOperationsResult,
  /* Return */ Line,
  /* Next */ number
> {
  const rounds = Array.from({ length: 3 }, () => fourOperations)

  let nextRoundArguments = roundOneArguments

  for (const round of rounds) {
    const results = round(nextRoundArguments)
    const partStalksAtIndex = yield results
    nextRoundArguments = {
      ...results,
      partStalksAtIndex,
    }
  }

  const maybeLine = nextRoundArguments.unpartedStalks.length / 4

  assertIsLine(maybeLine)

  return maybeLine
}
