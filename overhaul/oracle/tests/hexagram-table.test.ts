import { describe, expect, expectTypeOf, it } from 'vitest'

import type { Figure, Polarity } from '#src/figure.js'
import {
  hexagramTable,
  lookUpRow,
  type FuxiSequenceNumber,
  type HexagramTableRow,
} from '#src/hexagram-table.js'
import type { Trigram } from '#src/trigram.js'

// The rules below are the glossary's (CONTEXT.md, ADR-0025), written
// independently of the table: the table is the published fact, these are its
// proof.

const polarities: readonly Polarity[] = ['yang', 'yin']

/** Every Figure, built line by line from the two Polarities. */
const allFigures = (): readonly Figure[] => {
  const figures: Figure[] = []
  for (const first of polarities) {
    for (const second of polarities) {
      for (const third of polarities) {
        for (const fourth of polarities) {
          for (const fifth of polarities) {
            for (const sixth of polarities) {
              figures.push([first, second, third, fourth, fifth, sixth])
            }
          }
        }
      }
    }
  }
  return figures
}

/** A Figure as ADR-0025 writes it, bottom-up, 1 = yang (乾 is `111111`). */
const written = (figure: Figure): string =>
  figure.map((polarity) => (polarity === 'yang' ? '1' : '0')).join('')

const flip = (polarity: Polarity): Polarity =>
  polarity === 'yang' ? 'yin' : 'yang'

/** Line Positions 1–3. */
const lowerTrigramOf = (figure: Figure): Trigram => [
  figure[0],
  figure[1],
  figure[2],
]

/** Line Positions 4–6. */
const upperTrigramOf = (figure: Figure): Trigram => [
  figure[3],
  figure[4],
  figure[5],
]

/** Lower Trigram from Line Positions 2–4, Upper Trigram from 3–5. */
const nuclearHexagramOf = (figure: Figure): Figure => [
  figure[1],
  figure[2],
  figure[3],
  figure[2],
  figure[3],
  figure[4],
]

/** Every Line's Polarity flipped. */
const inverseHexagramOf = (figure: Figure): Figure => [
  flip(figure[0]),
  flip(figure[1]),
  flip(figure[2]),
  flip(figure[3]),
  flip(figure[4]),
  flip(figure[5]),
]

/** Turned upside down: Position k becomes Position 7 − k. */
const reversedHexagramOf = (figure: Figure): Figure => [
  figure[5],
  figure[4],
  figure[3],
  figure[2],
  figure[1],
  figure[0],
]

/**
 * The Figure read as a binary number, yin = 1 and the first Line Position the
 * highest bit, plus one.
 */
const fuxiSequenceNumberOf = (figure: Figure): number =>
  figure.reduce(
    (value, polarity) => value * 2 + (polarity === 'yin' ? 1 : 0),
    0,
  ) + 1

const isFuxiSequenceNumber = (value: number): value is FuxiSequenceNumber =>
  Number.isInteger(value) && value >= 1 && value <= 64

const expectedRowOf = (figure: Figure): HexagramTableRow => {
  const fuxiSequenceNumber = fuxiSequenceNumberOf(figure)
  if (!isFuxiSequenceNumber(fuxiSequenceNumber)) {
    throw new Error(`outside 1–64: ${fuxiSequenceNumber}`)
  }
  return {
    figure,
    lowerTrigram: lowerTrigramOf(figure),
    upperTrigram: upperTrigramOf(figure),
    nuclearHexagram: nuclearHexagramOf(figure),
    inverseHexagram: inverseHexagramOf(figure),
    reversedHexagram: reversedHexagramOf(figure),
    fuxiSequenceNumber,
  }
}

/** A fresh Figure equal to this one, so a lookup cannot rely on identity. */
const copyOf = (figure: Figure): Figure => [
  figure[0],
  figure[1],
  figure[2],
  figure[3],
  figure[4],
  figure[5],
]

const figureCases = allFigures().map((figure): [string, Figure] => [
  written(figure),
  figure,
])

const qian: Figure = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']
const kun: Figure = ['yin', 'yin', 'yin', 'yin', 'yin', 'yin']

describe('the Hexagram table', () => {
  it('is typed as exactly 64 rows', () => {
    expectTypeOf<(typeof hexagramTable)['length']>().toEqualTypeOf<64>()
  })

  it('has 64 rows', () => {
    expect(hexagramTable).toHaveLength(64)
  })

  it('holds 64 distinct Figures', () => {
    const distinct = new Set(hexagramTable.map((row) => written(row.figure)))
    expect(distinct.size).toBe(64)
  })

  it('holds 64 distinct Fuxi Sequence Numbers', () => {
    const distinct = new Set(hexagramTable.map((row) => row.fuxiSequenceNumber))
    expect(distinct.size).toBe(64)
  })

  it('is in Fuxi Sequence Number order: row i holds number i + 1', () => {
    expect(hexagramTable.map((row) => row.fuxiSequenceNumber)).toStrictEqual(
      Array.from({ length: 64 }, (_, index) => index + 1),
    )
    expect(
      hexagramTable.map((row) => fuxiSequenceNumberOf(row.figure)),
    ).toStrictEqual(Array.from({ length: 64 }, (_, index) => index + 1))
  })
})

describe('each row, against the glossary’s rules', () => {
  it.each(figureCases)(
    'the row of Figure %s sits at its Fuxi Sequence Number and holds its Trigrams, Nuclear, Inverse and Reversed Hexagrams',
    (_, figure) => {
      const index = fuxiSequenceNumberOf(figure) - 1
      const row = hexagramTable[index]
      expect(row?.fuxiSequenceNumber).toBe(index + 1)
      expect(row).toStrictEqual(expectedRowOf(figure))
    },
  )
})

describe('lookUpRow', () => {
  it.each(figureCases)('finds the row of Figure %s', (_, figure) => {
    const found = lookUpRow(copyOf(figure))
    expect(found.figure).toStrictEqual(figure)
    expect(found).toStrictEqual(expectedRowOf(figure))
    expect(found.fuxiSequenceNumber).toBe(fuxiSequenceNumberOf(figure))
  })
})

describe('anchors', () => {
  it('乾 is Fuxi Sequence Number 1, the first row', () => {
    expect(written(qian)).toBe('111111')
    expect(hexagramTable[0].figure).toStrictEqual(qian)
    expect(lookUpRow(qian).fuxiSequenceNumber).toBe(1)
  })

  it('坤 is Fuxi Sequence Number 64, the last row', () => {
    expect(hexagramTable[63].figure).toStrictEqual(kun)
    expect(lookUpRow(kun).fuxiSequenceNumber).toBe(64)
  })

  it('乾 and 坤 are each other’s Inverse, and each its own Reversed and Nuclear Hexagram', () => {
    const qianRow = lookUpRow(qian)
    const kunRow = lookUpRow(kun)
    expect(qianRow.inverseHexagram).toStrictEqual(kun)
    expect(kunRow.inverseHexagram).toStrictEqual(qian)
    expect(qianRow.reversedHexagram).toStrictEqual(qian)
    expect(kunRow.reversedHexagram).toStrictEqual(kun)
    expect(qianRow.nuclearHexagram).toStrictEqual(qian)
    expect(kunRow.nuclearHexagram).toStrictEqual(kun)
    expect(qianRow.lowerTrigram).toStrictEqual(['yang', 'yang', 'yang'])
    expect(qianRow.upperTrigram).toStrictEqual(['yang', 'yang', 'yang'])
    expect(kunRow.lowerTrigram).toStrictEqual(['yin', 'yin', 'yin'])
    expect(kunRow.upperTrigram).toStrictEqual(['yin', 'yin', 'yin'])
  })

  it('exactly eight Hexagrams read the same upside down, and each is its own Reversed Hexagram', () => {
    const symmetric = hexagramTable.filter(
      (row) => written(row.reversedHexagram) === written(row.figure),
    )
    expect(symmetric).toHaveLength(8)
  })

  it('the Figure with yang only at Line Position 1 is worked through by hand', () => {
    const row = lookUpRow(['yang', 'yin', 'yin', 'yin', 'yin', 'yin'])
    expect(row.fuxiSequenceNumber).toBe(32)
    expect(row.lowerTrigram).toStrictEqual(['yang', 'yin', 'yin'])
    expect(row.upperTrigram).toStrictEqual(['yin', 'yin', 'yin'])
    expect(row.nuclearHexagram).toStrictEqual(kun)
    expect(row.inverseHexagram).toStrictEqual([
      'yin',
      'yang',
      'yang',
      'yang',
      'yang',
      'yang',
    ])
    expect(row.reversedHexagram).toStrictEqual([
      'yin',
      'yin',
      'yin',
      'yin',
      'yin',
      'yang',
    ])
    expect(lookUpRow(row.inverseHexagram).fuxiSequenceNumber).toBe(33)
    expect(lookUpRow(row.reversedHexagram).fuxiSequenceNumber).toBe(63)
  })
})

describe('properties', () => {
  it('the Inverse of the Inverse is the Hexagram itself, for every row', () => {
    for (const row of hexagramTable) {
      expect(lookUpRow(row.inverseHexagram).inverseHexagram).toStrictEqual(
        row.figure,
      )
    }
  })

  it('the Reversed of the Reversed is the Hexagram itself, for every row', () => {
    for (const row of hexagramTable) {
      expect(lookUpRow(row.reversedHexagram).reversedHexagram).toStrictEqual(
        row.figure,
      )
    }
  })
})
