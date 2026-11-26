import { describe, expect, it } from 'vitest'

import type { Figure, Polarity } from '#src/figure.js'
import { lookUpRow } from '#src/hexagram-table.js'
import type { Hexagram } from '#src/hexagram.js'
import type { LinePosition } from '#src/line-position.js'
import type { LineValue } from '#src/line-value.js'
import type { PassageReference } from '#src/passage-reference.js'
import { resolve, type Resolution } from '#src/resolution.js'
import type { Transformation } from '#src/transformation.js'

// The expected Resolution below is derived from the glossary (Line Value,
// Moving Line, Changed Line, Static Line, Applicable Passages, All-Moving
// Statement) and ADR-0024, independently of `resolve`. Each Hexagram's
// structure comes from the Hexagram table, whose rows have their own tests.

const lineValues: readonly LineValue[] = [6, 7, 8, 9]

/** Every Transformation, built line by line from the four Line Values. */
const allTransformations = (): readonly Transformation[] => {
  const transformations: Transformation[] = []
  for (const first of lineValues) {
    for (const second of lineValues) {
      for (const third of lineValues) {
        for (const fourth of lineValues) {
          for (const fifth of lineValues) {
            for (const sixth of lineValues) {
              transformations.push([first, second, third, fourth, fifth, sixth])
            }
          }
        }
      }
    }
  }
  return transformations
}

/** Old Yin 6 and Young Yin 8 are yin; Young Yang 7 and Old Yang 9 are yang. */
const standingPolarity = (value: LineValue): Polarity =>
  value === 7 || value === 9 ? 'yang' : 'yin'

/** Only an Old value moves: 6 becomes 7 (yang), 9 becomes 8 (yin). */
const isMoving = (value: LineValue): boolean => value === 6 || value === 9

const emergingPolarity = (value: LineValue): Polarity => {
  if (value === 6) return 'yang'
  if (value === 9) return 'yin'
  return standingPolarity(value)
}

const figureOf = (
  transformation: Transformation,
  polarityOf: (value: LineValue) => Polarity,
): Figure => [
  polarityOf(transformation[0]),
  polarityOf(transformation[1]),
  polarityOf(transformation[2]),
  polarityOf(transformation[3]),
  polarityOf(transformation[4]),
  polarityOf(transformation[5]),
]

/** Each Line Value with its Line Position, bottom-up. */
const positioned = (
  transformation: Transformation,
): readonly (readonly [LinePosition, LineValue])[] => {
  const [first, second, third, fourth, fifth, sixth] = transformation
  return [
    [1, first],
    [2, second],
    [3, third],
    [4, fourth],
    [5, fifth],
    [6, sixth],
  ]
}

const allYang: Figure = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']
const allYin: Figure = ['yin', 'yin', 'yin', 'yin', 'yin', 'yin']

const sameFigure = (left: Figure, right: Figure): boolean =>
  left.every((polarity, index) => polarity === right[index])

const expectedStructureOf = (hexagram: Hexagram): Resolution['standing'] => {
  const row = lookUpRow(hexagram)
  return {
    hexagram,
    lowerTrigram: row.lowerTrigram,
    upperTrigram: row.upperTrigram,
    nuclearHexagram: row.nuclearHexagram,
    inverseHexagram: row.inverseHexagram,
    reversedHexagram: row.reversedHexagram,
  }
}

const expectedResolutionOf = (transformation: Transformation): Resolution => {
  const standing = figureOf(transformation, standingPolarity)
  const emerging = figureOf(transformation, emergingPolarity)
  const movingLines = positioned(transformation)
    .filter(([, value]) => isMoving(value))
    .map(([position]) => position)

  const applicablePassages: PassageReference[] = [{ hexagram: standing }]
  if (movingLines.length > 0) {
    for (const line of movingLines) {
      applicablePassages.push({ hexagram: standing, line })
    }
    const allSixMove = movingLines.length === 6
    if (
      allSixMove &&
      (sameFigure(standing, allYang) || sameFigure(standing, allYin))
    ) {
      applicablePassages.push({ hexagram: standing, line: 'all-moving' })
    }
    applicablePassages.push({ hexagram: emerging })
  }

  return {
    standing: expectedStructureOf(standing),
    emerging: expectedStructureOf(emerging),
    movingLines,
    applicablePassages,
  }
}

const written = (transformation: Transformation): string =>
  transformation.join('')

const transformations = allTransformations()

const linePositions: readonly LinePosition[] = [1, 2, 3, 4, 5, 6]

/** The Transformation of all `base` values with `moving` at one position. */
const withOneMovingLine = (
  base: LineValue,
  moving: LineValue,
  position: LinePosition,
): Transformation => {
  const valueAt = (at: LinePosition): LineValue =>
    at === position ? moving : base
  return [
    valueAt(1),
    valueAt(2),
    valueAt(3),
    valueAt(4),
    valueAt(5),
    valueAt(6),
  ]
}

/** A Figure equal to `figure` but with `position` flipped. */
const flippedAt = (figure: Figure, position: LinePosition): Figure => {
  const flip = (at: LinePosition, polarity: Polarity): Polarity => {
    if (at !== position) return polarity
    return polarity === 'yang' ? 'yin' : 'yang'
  }
  return [
    flip(1, figure[0]),
    flip(2, figure[1]),
    flip(3, figure[2]),
    flip(4, figure[3]),
    flip(5, figure[4]),
    flip(6, figure[5]),
  ]
}

describe('resolve, over every Transformation', () => {
  it('visits 4,096 distinct Transformations, each resolved as the glossary derives it', () => {
    const visited = new Set<string>()
    for (const transformation of transformations) {
      visited.add(written(transformation))
      expect(resolve(transformation)).toEqual(
        expectedResolutionOf(transformation),
      )
    }
    expect(visited.size).toBe(4096)
  })

  it('every structure field equals the Hexagram table’s row for that Figure', () => {
    for (const transformation of transformations) {
      const resolution = resolve(transformation)
      for (const structure of [resolution.standing, resolution.emerging]) {
        const row = lookUpRow(structure.hexagram)
        expect(structure.hexagram).toEqual(row.figure)
        expect(structure.lowerTrigram).toEqual(row.lowerTrigram)
        expect(structure.upperTrigram).toEqual(row.upperTrigram)
        expect(structure.nuclearHexagram).toEqual(row.nuclearHexagram)
        expect(structure.inverseHexagram).toEqual(row.inverseHexagram)
        expect(structure.reversedHexagram).toEqual(row.reversedHexagram)
      }
    }
  })

  it('lists the Moving Lines bottom-up, each once', () => {
    for (const transformation of transformations) {
      const { movingLines } = resolve(transformation)
      const ascending = [...movingLines].toSorted((left, right) => left - right)
      expect(movingLines).toEqual(ascending)
      expect(new Set(movingLines).size).toBe(movingLines.length)
    }
  })

  it('names only the Standing Hexagram’s Line Statements, never a Changed Line’s', () => {
    for (const transformation of transformations) {
      const { standing, applicablePassages } = resolve(transformation)
      for (const passage of applicablePassages) {
        if (passage.line !== undefined) {
          expect(passage.hexagram).toEqual(standing.hexagram)
        }
      }
    }
  })

  it('leaves its input unchanged', () => {
    for (const transformation of transformations) {
      const before = [...transformation]
      resolve(Object.freeze(transformation))
      expect(transformation).toEqual(before)
    }
  })
})

describe('anchors: no Line moving, or every Line', () => {
  it('all Young Yang 7 is 乾之乾: the Standing Hexagram Statement alone', () => {
    expect(resolve([7, 7, 7, 7, 7, 7])).toEqual({
      standing: expectedStructureOf(allYang),
      emerging: expectedStructureOf(allYang),
      movingLines: [],
      applicablePassages: [{ hexagram: allYang }],
    })
  })

  it('all Young Yin 8 is 坤之坤: the Standing Hexagram Statement alone', () => {
    expect(resolve([8, 8, 8, 8, 8, 8])).toEqual({
      standing: expectedStructureOf(allYin),
      emerging: expectedStructureOf(allYin),
      movingLines: [],
      applicablePassages: [{ hexagram: allYin }],
    })
  })

  it('all Old Yang 9 is 乾之坤: six Line Statements, then 用九, then 坤’s Hexagram Statement', () => {
    expect(resolve([9, 9, 9, 9, 9, 9])).toEqual({
      standing: expectedStructureOf(allYang),
      emerging: expectedStructureOf(allYin),
      movingLines: [1, 2, 3, 4, 5, 6],
      applicablePassages: [
        { hexagram: allYang },
        { hexagram: allYang, line: 1 },
        { hexagram: allYang, line: 2 },
        { hexagram: allYang, line: 3 },
        { hexagram: allYang, line: 4 },
        { hexagram: allYang, line: 5 },
        { hexagram: allYang, line: 6 },
        { hexagram: allYang, line: 'all-moving' },
        { hexagram: allYin },
      ],
    })
  })

  it('all Old Yin 6 is 坤之乾: six Line Statements, then 用六, then 乾’s Hexagram Statement', () => {
    expect(resolve([6, 6, 6, 6, 6, 6])).toEqual({
      standing: expectedStructureOf(allYin),
      emerging: expectedStructureOf(allYang),
      movingLines: [1, 2, 3, 4, 5, 6],
      applicablePassages: [
        { hexagram: allYin },
        { hexagram: allYin, line: 1 },
        { hexagram: allYin, line: 2 },
        { hexagram: allYin, line: 3 },
        { hexagram: allYin, line: 4 },
        { hexagram: allYin, line: 5 },
        { hexagram: allYin, line: 6 },
        { hexagram: allYin, line: 'all-moving' },
        { hexagram: allYang },
      ],
    })
  })

  it('every Line moving in a Hexagram other than 乾 and 坤 has no All-Moving Statement', () => {
    const standing: Figure = ['yang', 'yin', 'yang', 'yin', 'yang', 'yin']
    const emerging: Figure = ['yin', 'yang', 'yin', 'yang', 'yin', 'yang']
    expect(resolve([9, 6, 9, 6, 9, 6])).toEqual({
      standing: expectedStructureOf(standing),
      emerging: expectedStructureOf(emerging),
      movingLines: [1, 2, 3, 4, 5, 6],
      applicablePassages: [
        { hexagram: standing },
        { hexagram: standing, line: 1 },
        { hexagram: standing, line: 2 },
        { hexagram: standing, line: 3 },
        { hexagram: standing, line: 4 },
        { hexagram: standing, line: 5 },
        { hexagram: standing, line: 6 },
        { hexagram: emerging },
      ],
    })
  })
})

describe('anchors: a single Moving Line', () => {
  it.each(linePositions)(
    'Old Yang 9 at Line Position %i among Young Yang 7s turns that Line yin',
    (position) => {
      const emerging = flippedAt(allYang, position)
      expect(resolve(withOneMovingLine(7, 9, position))).toEqual({
        standing: expectedStructureOf(allYang),
        emerging: expectedStructureOf(emerging),
        movingLines: [position],
        applicablePassages: [
          { hexagram: allYang },
          { hexagram: allYang, line: position },
          { hexagram: emerging },
        ],
      })
    },
  )

  it.each(linePositions)(
    'Old Yin 6 at Line Position %i among Young Yin 8s turns that Line yang',
    (position) => {
      const emerging = flippedAt(allYin, position)
      expect(resolve(withOneMovingLine(8, 6, position))).toEqual({
        standing: expectedStructureOf(allYin),
        emerging: expectedStructureOf(emerging),
        movingLines: [position],
        applicablePassages: [
          { hexagram: allYin },
          { hexagram: allYin, line: position },
          { hexagram: emerging },
        ],
      })
    },
  )
})

describe('anchors: order', () => {
  it('Moving Lines at Line Positions 1, 3 and 5 are listed, and their Line Statements named, bottom-up', () => {
    const standing: Figure = ['yang', 'yang', 'yin', 'yin', 'yang', 'yang']
    const emerging: Figure = ['yin', 'yang', 'yang', 'yin', 'yin', 'yang']
    expect(resolve([9, 7, 6, 8, 9, 7])).toEqual({
      standing: expectedStructureOf(standing),
      emerging: expectedStructureOf(emerging),
      movingLines: [1, 3, 5],
      applicablePassages: [
        { hexagram: standing },
        { hexagram: standing, line: 1 },
        { hexagram: standing, line: 3 },
        { hexagram: standing, line: 5 },
        { hexagram: emerging },
      ],
    })
  })
})
