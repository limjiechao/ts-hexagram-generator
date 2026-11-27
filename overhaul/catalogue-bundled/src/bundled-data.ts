import type { LinePosition } from '@hexagram/oracle/line-position'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { ReceivedSequenceNumber } from '@hexagram/scripture-catalogue/received-sequence-number'

/*
 * The format of the Catalogue's literal data: a one-off conversion of the
 * pre-overhaul texts writes it once, and nothing reads those texts at run
 * time. Every key is a string form ADR-0038's URLs already use, so a reader
 * can find a passage in the data by its Citation.
 */

type Bit = '0' | '1'

/** A Figure's string form, bottom-up, 1 = yang (ADR-0025): 乾 is `111111`. */
export type FigureKey = `${Bit}${Bit}${Bit}${Bit}${Bit}${Bit}`

/** A Trigram's string form, bottom-up, 1 = yang: 乾 is `111`. */
export type TrigramKey = `${Bit}${Bit}${Bit}`

/**
 * The string form of a Citation on one Line, or on the All-Moving Statement
 * (ADR-0038): `110010.4`, `111111.all-moving`.
 */
export type LineKey = `${FigureKey}.${LinePosition | 'all-moving'}`

/**
 * The texts one Edition prints for each Work, keyed by the Citation's string
 * form within that Work: a 周易 Hexagram Statement by its Figure, a Line
 * Statement or the All-Moving Statement by a `LineKey`; the 彖傳 and 大象 by
 * the Figure; the 小象 by a `LineKey`. A passage the Edition lacks has no
 * key, so it shows nothing, never another Edition's text.
 */
export interface BundledTexts {
  readonly zhouyi: Readonly<Partial<Record<FigureKey | LineKey, string>>>
  readonly tuan: Readonly<Partial<Record<FigureKey, string>>>
  readonly daxiang: Readonly<Partial<Record<FigureKey, string>>>
  readonly xiaoxiang: Readonly<Partial<Record<LineKey, string>>>
}

/** Omits from each member of a union, keeping the union. */
type DistributiveOmit<Type, Key extends PropertyKey> = Type extends unknown
  ? Omit<Type, Key>
  : never

/*
 * The four bundled EditionIds, each printing the 周易 經, 彖傳, 大象 and 小象
 * (ADR-0028):
 *
 * - `wuyingdian-1739`: Traditional; `terms-unverified`; short name 武英殿本;
 *   title 武英殿十三經注疏本《周易正義》 (1739); Witness "ctext.org's
 *   transcription of the 武英殿十三經注疏本《周易正義》, from its Book of
 *   Changes pages (ctext.org/book-of-changes); the 乾 and 坤 pages (用九,
 *   用六) retrieved 2026-11-27".
 * - `wuyingdian-1739-simplified`: Simplified; `terms-unverified`; short name
 *   武英殿本（简体）; the same title; Witness "ctext.org's character
 *   conversion of the 武英殿本 text into Simplified characters, from the same
 *   pages' Simplified view; not an independent Edition; the 乾 and 坤 pages
 *   (用九, 用六) retrieved 2026-11-27".
 * - `legge-1882`: English; `public-domain`; short name Legge; title "Legge,
 *   Sacred Books of the East vol. 16 (Oxford, 1882)"; Witness "a scanned
 *   copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages:
 *   pp. 58, 61 (text) and 267, 269 (小象)".
 * - `wilhelm-baynes-1967`: English; `in-copyright`; short name
 *   Wilhelm–Baynes; title "Wilhelm, tr. Baynes, The I Ching or Book of
 *   Changes (Princeton, 1967)"; Witness "a personal EPUB".
 *
 * None is unidentified.
 */

/**
 * One EditionId's data: what its Edition records share for every Work it
 * prints (names, script or language, licence, whether it is unidentified,
 * and its Witness), its names for Hexagrams and Trigrams, and its texts.
 * The Catalogue makes one Edition record per Work in `texts`, all with this
 * id; the Hexagram and Trigram names are labelled with its `zhouyi` Edition
 * record. Text is held as its Witness gives it, never converted from
 * another script.
 */
export type BundledEdition = DistributiveOmit<
  Edition,
  'id' | 'work' | 'witness'
> & {
  /** Admitted by `isEditionId` when the Catalogue makes its records. */
  readonly id: string
  /**
   * The Witness the text was transcribed from. Its description carries any
   * conversion label, such as a Witness's own conversion of its source
   * Edition into another script (see Edition), and any retrieval date, in
   * words.
   */
  readonly witness: { readonly description: string }
  /** The name this Edition gives each of the 64 Hexagrams. */
  readonly hexagramNames: Readonly<Record<FigureKey, string>>
  /** The name and imagery this Edition gives each of the eight Trigrams. */
  readonly trigramNames: Readonly<
    Record<TrigramKey, { readonly name: string; readonly imagery: string }>
  >
  readonly texts: BundledTexts
}

/**
 * Each Hexagram's Received Sequence Number. One table, not one per Edition:
 * every bundled Edition follows the received text's order.
 */
export type ReceivedSequenceTable = Readonly<
  Record<FigureKey, ReceivedSequenceNumber>
>
