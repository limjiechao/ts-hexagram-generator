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

// Stands in for the 64 literal rows until they are written; a tuple of 64
// has no empty value to stub it with.
function rowsNotWritten(): never {
  throw new Error('Not implemented')
}

/**
 * The Oracle's 64-row Hexagram table, in Fuxi Sequence Number order: the
 * published fact, written as data and checked row by row against the
 * glossary's rules by its tests (ADR-0025).
 */
export const hexagramTable: HexagramTable = rowsNotWritten()

/** The row of the Hexagram whose Figure this is; every Figure has one. */
export function lookUpRow(figure: Figure): HexagramTableRow {
  // Carries the input as the cause, so the signature keeps its name.
  throw new Error('Not implemented', { cause: [figure] })
}
