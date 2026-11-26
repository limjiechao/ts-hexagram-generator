import type { Figure } from '#src/figure.js'
import type { Hexagram } from '#src/hexagram.js'
import type { Trigram } from '#src/trigram.js'

/**
 * A Hexagram's place 1–64, its Figure read as a number; the same for every
 * text tradition (ADR-0025).
 */
export type FuxiSequenceNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59
  | 60
  | 61
  | 62
  | 63
  | 64

/**
 * The invariant facts of one Hexagram, keyed by its Figure: its Lower and
 * Upper Trigrams, its Nuclear, Inverse and Reversed Hexagrams, and its Fuxi
 * Sequence Number. No names: they belong to an Edition (ADR-0025).
 */
export interface HexagramTableRow {
  readonly figure: Figure
  readonly lowerTrigram: Trigram
  readonly upperTrigram: Trigram
  readonly nuclearHexagram: Hexagram
  readonly inverseHexagram: Hexagram
  readonly reversedHexagram: Hexagram
  readonly fuxiSequenceNumber: FuxiSequenceNumber
}

/** A tuple of `length` copies of `Element`, so the compiler counts them. */
type TupleOf<
  Element,
  Length extends number,
  Accumulated extends Element[] = [],
> = Accumulated['length'] extends Length
  ? Accumulated
  : TupleOf<Element, Length, [...Accumulated, Element]>

/** Exactly 64 rows, one per Hexagram. */
export type HexagramTable = Readonly<TupleOf<HexagramTableRow, 64>>

/**
 * The Oracle's 64-row Hexagram table, in Fuxi Sequence Number order: the
 * published fact, written as data and checked row by row against the
 * glossary's rules by its tests (ADR-0025).
 */
export const hexagramTable: HexagramTable = [
  {
    figure: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 1,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 2,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 3,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 4,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 5,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 6,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 7,
  },
  {
    figure: ['yang', 'yang', 'yang', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yang'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yin', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yang', 'yang', 'yang'],
    fuxiSequenceNumber: 8,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 9,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 10,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 11,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 12,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 13,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 14,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 15,
  },
  {
    figure: ['yang', 'yang', 'yin', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yang', 'yin'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yin', 'yang', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yin', 'yang', 'yang'],
    fuxiSequenceNumber: 16,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 17,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 18,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 19,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 20,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 21,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 22,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 23,
  },
  {
    figure: ['yang', 'yin', 'yang', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yang'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yin', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yang', 'yin', 'yang'],
    fuxiSequenceNumber: 24,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 25,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 26,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 27,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 28,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 29,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 30,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 31,
  },
  {
    figure: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yang', 'yin', 'yin'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    fuxiSequenceNumber: 32,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 33,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 34,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 35,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 36,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 37,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 38,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 39,
  },
  {
    figure: ['yin', 'yang', 'yang', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yang'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yin', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yang', 'yang', 'yin'],
    fuxiSequenceNumber: 40,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 41,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 42,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 43,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 44,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 45,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 46,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 47,
  },
  {
    figure: ['yin', 'yang', 'yin', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yang', 'yin'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yin', 'yang', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'],
    fuxiSequenceNumber: 48,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 49,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 50,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 51,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 52,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 53,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 54,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 55,
  },
  {
    figure: ['yin', 'yin', 'yang', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yang'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yang', 'yin', 'yang', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yin', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yang', 'yin', 'yin'],
    fuxiSequenceNumber: 56,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yang', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yang', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yin', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yang', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 57,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yang', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yang', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yin', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yang', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 58,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yang', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yang', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yin', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yang', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 59,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yang', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yang', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yang', 'yin', 'yang', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yin', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yang', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 60,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yin', 'yang', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yin', 'yang', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yang', 'yin', 'yin'],
    reversedHexagram: ['yang', 'yang', 'yin', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 61,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yin', 'yang', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yang', 'yin', 'yang'],
    reversedHexagram: ['yin', 'yang', 'yin', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 62,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yin', 'yin', 'yang'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yin', 'yin', 'yang'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'],
    reversedHexagram: ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 63,
  },
  {
    figure: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    lowerTrigram: ['yin', 'yin', 'yin'],
    upperTrigram: ['yin', 'yin', 'yin'],
    nuclearHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    inverseHexagram: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
    reversedHexagram: ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
    fuxiSequenceNumber: 64,
  },
]

// Keyed by the Figure's Polarities, not the array, so an equal copy of a
// Figure finds its row.
const keyOf = (figure: Figure): string => figure.join(' ')

const rowsByFigure: ReadonlyMap<string, HexagramTableRow> = new Map(
  hexagramTable.map((row) => [keyOf(row.figure), row]),
)

/** The row of the Hexagram whose Figure this is; every Figure has one. */
export function lookUpRow(figure: Figure): HexagramTableRow {
  const row = rowsByFigure.get(keyOf(figure))
  // Unreachable: the table holds all 64 Figures. The Map cannot say so.
  if (row === undefined) {
    throw new Error(`No row for the Figure ${keyOf(figure)}`)
  }
  return row
}
