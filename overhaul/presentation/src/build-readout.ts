import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  localDate,
  type DivinedAt,
} from '@hexagram/consultation-journal/divined-at'
import type { Figure } from '@hexagram/oracle/figure'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { LinePosition } from '@hexagram/oracle/line-position'
import type { LineValue } from '@hexagram/oracle/line-value'
import type { PassageReference } from '@hexagram/oracle/passage-reference'
import { resolve, type Resolution } from '@hexagram/oracle/resolution'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'

import { ledgerOf } from '#src/ledger.js'
import type {
  CommentaryOnPassage,
  ConsultationReadout,
  FigureLine,
  HexagramFigure,
  HexagramTab,
  NamedHexagram,
  PassageShown,
  TransformationReadout,
} from '#src/readout.js'

/**
 * Use case 3's result, as this package takes it. `application` may import
 * this package and not the reverse, so the shape is restated from its two
 * parts: the Oracle's Resolution, and the passage texts in order, each
 * Applicable Passage followed by its Commentaries, then the Yilin Verse.
 */
export interface ResolvedTransformation {
  readonly resolution: Resolution
  readonly passageTexts: readonly PassageText[]
}

/**
 * The names a Readout shows, looked up through use case 8 with the same
 * Reading Preference as use case 3: one `NamedHexagram` for each Hexagram
 * `hexagramsNamed` lists, and the `TrigramName`s of each Trigram
 * `trigramsNamed` lists, in any order.
 */
export interface ReadoutNames {
  readonly hexagrams: readonly NamedHexagram[]
  readonly trigrams: readonly TrigramName[]
}

/**
 * Every Hexagram whose names a Readout of the Resolution shows, each once:
 * the Standing and Emerging Hexagrams and each one's Nuclear, Inverse and
 * Reversed Hexagrams. The caller looks each up through use case 8.
 */
export function hexagramsNamed(resolution: Resolution): readonly Hexagram[] {
  return uniqueFigures(
    structuresOf(resolution).flatMap((each) => [
      each.hexagram,
      each.nuclearHexagram,
      each.inverseHexagram,
      each.reversedHexagram,
    ]),
  )
}

/**
 * Every Trigram whose name and imagery a Readout of the Resolution shows,
 * each once: the Standing and Emerging Hexagrams' Upper and Lower Trigrams.
 */
export function trigramsNamed(resolution: Resolution): readonly Trigram[] {
  return uniqueFigures(
    structuresOf(resolution).flatMap((each) => [
      each.upperTrigram,
      each.lowerTrigram,
    ]),
  )
}

/**
 * The Readout of a Transformation, from use case 3's result for it and the
 * names `hexagramsNamed` and `trigramsNamed` asked for. The passages split
 * across the Hexagram tabs as `HexagramTab` says; each Commentary joins the
 * passage its Citation names, and one no Edition gives is left out. Throws a
 * `RangeError` when `names` lacks a Hexagram the Readout shows, or when
 * `resolved` is not the Resolution of `transformation`: the caller's error,
 * not a condition to show.
 */
export function transformationReadout(
  transformation: Transformation,
  resolved: ResolvedTransformation,
  names: ReadoutNames,
): TransformationReadout {
  const { resolution } = resolved
  checkResolutionOf(transformation, resolution)
  const named = namedLookup(names.hexagrams)
  const trigramNames = (trigram: Trigram): readonly TrigramName[] =>
    names.trigrams.filter((each) => keyOf(each.trigram) === keyOf(trigram))
  const figureOf = (
    structure: Resolution['standing'],
    lines: HexagramFigure['lines'],
  ): HexagramFigure => ({
    hexagram: named(structure.hexagram),
    lines,
    upperTrigram: trigramNames(structure.upperTrigram),
    lowerTrigram: trigramNames(structure.lowerTrigram),
  })
  const standingFigure = figureOf(
    resolution.standing,
    figureLines(transformation, 'standing'),
  )
  const emergingFigure = figureOf(
    resolution.emerging,
    figureLines(transformation, 'emerging'),
  )

  const { passages, yilinVerse } = arrangeTexts(
    resolution,
    resolved.passageTexts,
  )
  // The Emerging Hexagram Statement closes the Applicable Passages whenever
  // a Line moves; X之X has none.
  const emergingCount = resolution.movingLines.length === 0 ? 0 : 1
  const standingPassages = passages.slice(0, passages.length - emergingCount)
  const emergingPassages = passages.slice(passages.length - emergingCount)
  const tabOf = (
    structure: Resolution['standing'],
    figure: HexagramFigure,
    shown: readonly PassageShown[],
  ): HexagramTab => ({
    figure,
    nuclearHexagram: named(structure.nuclearHexagram),
    inverseHexagram: named(structure.inverseHexagram),
    reversedHexagram: named(structure.reversedHexagram),
    passages: shown,
  })
  const standing = tabOf(resolution.standing, standingFigure, standingPassages)
  const emerging = tabOf(resolution.emerging, emergingFigure, emergingPassages)

  return {
    transformation: { standing: standingFigure, emerging: emergingFigure },
    standing,
    emerging,
    yilinVerse,
    editions: editionsShown([
      ...[standingFigure, emergingFigure].flatMap(figureEditions),
      ...[standing, emerging].flatMap(tabNameEditions),
      ...passages.flatMap((passage) => [
        ...passage.texts,
        ...passage.commentaries.flatMap((commentary) => commentary.texts),
      ]),
      ...yilinVerse,
    ]),
  }
}

/**
 * The Readout of a Consultation: its Query, Divined At and Casting tab,
 * then its Transformation's Readout as `transformationReadout` builds it.
 * A Recorded Consultation's Casting tab shows that it has none; no Casting
 * is ever invented for it (ADR-0026).
 */
export function consultationReadout(
  consultation: Consultation,
  resolved: ResolvedTransformation,
  names: ReadoutNames,
): ConsultationReadout {
  return {
    query: consultation.query,
    divinedAt: consultation.divinedAt,
    casting:
      consultation.origin === 'cast'
        ? {
            origin: 'cast',
            divisionMethod: consultation.divisionMethod,
            rounds: ledgerOf(consultation.casting),
          }
        : { origin: 'recorded' },
    ...transformationReadout(consultation.transformation, resolved, names),
  }
}

/**
 * Divined At as every Readout and the browse list write it: a Moment as
 * `YYYY-MM-DD HH:mm`, the date and time its own offset reads, the offset
 * not written; a Day as `YYYY-MM-DD` alone (ADR-0046).
 */
export function divinedAtText(divinedAt: DivinedAt): string {
  const date = isoDate(localDate(divinedAt))
  if (divinedAt.precision === 'day') return date
  const minutesOfDay = wallClockMinutes(divinedAt)
  return `${date} ${twoDigits(Math.floor(minutesOfDay / 60))}:${twoDigits(minutesOfDay % 60)}`
}

// --- Figures --------------------------------------------------------------------

/** A Figure's identity as text, bottom-up, so Figures compare by value. */
const keyOf = (figure: Figure | Trigram): string =>
  figure.map((polarity) => (polarity === 'yang' ? '1' : '0')).join('')

function uniqueFigures<Each extends Figure | Trigram>(
  figures: readonly Each[],
): readonly Each[] {
  const byKey = new Map<string, Each>()
  for (const figure of figures)
    if (!byKey.has(keyOf(figure))) byKey.set(keyOf(figure), figure)
  return [...byKey.values()]
}

const structuresOf = (
  resolution: Resolution,
): readonly Resolution['standing'][] => [
  resolution.standing,
  resolution.emerging,
]

/**
 * The Standing and Emerging Hexagrams fix the Transformation, and with it
 * everything else a Resolution holds, so comparing them suffices.
 */
function checkResolutionOf(
  transformation: Transformation,
  resolution: Resolution,
): void {
  const expected = resolve(transformation)
  if (
    keyOf(resolution.standing.hexagram) !== keyOf(expected.standing.hexagram) ||
    keyOf(resolution.emerging.hexagram) !== keyOf(expected.emerging.hexagram)
  )
    throw new RangeError('The Resolution is not that of the Transformation', {
      cause: { transformation, resolution },
    })
}

/** Looks a Hexagram's names up; a duplicate or a missing one is the caller's error. */
function namedLookup(
  hexagrams: readonly NamedHexagram[],
): (hexagram: Hexagram) => NamedHexagram {
  const byKey = new Map<string, NamedHexagram>()
  for (const each of hexagrams) {
    const key = keyOf(each.hexagram)
    if (byKey.has(key))
      throw new RangeError(`Two NamedHexagrams name Hexagram ${key}`, {
        cause: each,
      })
    byKey.set(key, each)
  }
  return (hexagram) => {
    const named = byKey.get(keyOf(hexagram))
    if (named === undefined)
      throw new RangeError(`No names for Hexagram ${keyOf(hexagram)}`, {
        cause: hexagram,
      })
    return named
  }
}

/** A Moving Line becomes a Changed Line: Old Yin 6 Young Yang 7, Old Yang 9 Young Yin 8. */
const changedValue = (value: LineValue): LineValue => {
  if (value === 6) return 7
  if (value === 9) return 8
  return value
}

function figureLines(
  transformation: Transformation,
  side: 'standing' | 'emerging',
): HexagramFigure['lines'] {
  const lineOf = (position: LinePosition, value: LineValue): FigureLine => {
    const moving = value === 6 || value === 9
    if (side === 'standing')
      return { position, value, change: moving ? 'moving' : 'static' }
    return {
      position,
      value: changedValue(value),
      change: moving ? 'changed' : 'static',
    }
  }
  const [first, second, third, fourth, fifth, sixth] = transformation
  return [
    lineOf(1, first),
    lineOf(2, second),
    lineOf(3, third),
    lineOf(4, fourth),
    lineOf(5, fifth),
    lineOf(6, sixth),
  ]
}

// --- Passages ---------------------------------------------------------------------

type CommentaryWork = CommentaryOnPassage['work']

const commentaryLabels: Readonly<Record<CommentaryWork, string>> = {
  tuan: '彖傳',
  daxiang: '大象',
  xiaoxiang: '小象',
  wenyan: '文言',
}

const positionNames: Readonly<Record<LinePosition, string>> = {
  1: '初',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '上',
}

/**
 * 卦辭, 用九 or 用六, or a Line's traditional name: 初 and 上 before its
 * 九 or 六, the other Positions after it.
 */
function passageLabel(reference: PassageReference): string {
  if (reference.line === undefined) return '卦辭'
  if (reference.line === 'all-moving')
    return reference.hexagram[0] === 'yang' ? '用九' : '用六'
  const value = reference.hexagram[reference.line - 1] === 'yang' ? '九' : '六'
  const position = positionNames[reference.line]
  return reference.line === 1 || reference.line === 6
    ? `${position}${value}`
    : `${value}${position}`
}

/** The passage a 周易 or Commentary Citation names, as a key. */
function passageKeyOf(citation: Exclude<Citation, { work: 'yilin' }>): string {
  const hexagram = keyOf(citation.hexagram)
  return 'line' in citation && citation.line !== undefined
    ? `${hexagram}.${String(citation.line)}`
    : hexagram
}

const referenceKeyOf = (reference: PassageReference): string =>
  passageKeyOf({ work: 'zhouyi', ...reference })

/**
 * Each Applicable Passage with its texts and Commentaries, and the Yilin
 * Verse. A text whose Citation the Readout does not show is the caller's
 * error.
 */
function arrangeTexts(
  resolution: Resolution,
  passageTexts: readonly PassageText[],
): {
  readonly passages: readonly PassageShown[]
  readonly yilinVerse: readonly PassageText[]
} {
  const texts = new Map<string, PassageText[]>()
  const commentaries = new Map<string, Map<CommentaryWork, PassageText[]>>()
  for (const reference of resolution.applicablePassages) {
    texts.set(referenceKeyOf(reference), [])
    commentaries.set(referenceKeyOf(reference), new Map())
  }
  const yilinVerse: PassageText[] = []
  for (const each of passageTexts) {
    const { citation } = each
    const stray = new RangeError('A passage text the Readout does not show', {
      cause: each,
    })
    if (citation.work === 'yilin') {
      if (
        keyOf(citation.standing) !== keyOf(resolution.standing.hexagram) ||
        keyOf(citation.emerging) !== keyOf(resolution.emerging.hexagram)
      )
        throw stray
      yilinVerse.push(each)
      continue
    }
    const key = passageKeyOf(citation)
    if (citation.work === 'zhouyi') {
      const list = texts.get(key)
      if (list === undefined) throw stray
      list.push(each)
      continue
    }
    const byWork = commentaries.get(key)
    if (byWork === undefined) throw stray
    const list = byWork.get(citation.work) ?? []
    list.push(each)
    byWork.set(citation.work, list)
  }
  const passages = resolution.applicablePassages.map(
    (reference): PassageShown => {
      const key = referenceKeyOf(reference)
      return {
        reference,
        label: passageLabel(reference),
        texts: texts.get(key) ?? [],
        commentaries: [...(commentaries.get(key) ?? [])].map(
          ([work, workTexts]) => ({
            work,
            label: commentaryLabels[work],
            texts: workTexts,
          }),
        ),
      }
    },
  )
  return { passages, yilinVerse }
}

// --- Editions ---------------------------------------------------------------------

const figureEditions = (
  figure: HexagramFigure,
): readonly { readonly edition: Edition }[] => [
  ...figure.hexagram.names,
  ...figure.upperTrigram,
  ...figure.lowerTrigram,
]

const tabNameEditions = (
  tab: HexagramTab,
): readonly { readonly edition: Edition }[] => [
  ...tab.nuclearHexagram.names,
  ...tab.inverseHexagram.names,
  ...tab.reversedHexagram.names,
]

/** Each EditionId once, as the first record that carries it. */
function editionsShown(
  shown: readonly { readonly edition: Edition }[],
): readonly Edition[] {
  const byId = new Map<string, Edition>()
  for (const { edition } of shown)
    if (!byId.has(edition.id)) byId.set(edition.id, edition)
  return [...byId.values()]
}

// --- Divined At -------------------------------------------------------------------

const twoDigits = (value: number): string => String(value).padStart(2, '0')

function isoDate({ year, month, day }: ReturnType<typeof localDate>): string {
  return `${String(year).padStart(4, '0')}-${twoDigits(month)}-${twoDigits(day)}`
}

/**
 * The minutes past midnight a Moment's wall clock reads in its own offset,
 * its seconds cut off, never rounded.
 */
function wallClockMinutes(
  moment: Extract<DivinedAt, { precision: 'moment' }>,
): number {
  const sign = moment.offset.startsWith('-') ? -1 : 1
  const [hours = 0, minutes = 0] = moment.offset.slice(1).split(':').map(Number)
  const offsetMinutes = sign * (hours * 60 + minutes)
  const minutesOfDay =
    (Math.floor(moment.epochMilliseconds / 60_000) + offsetMinutes) % 1440
  return (minutesOfDay + 1440) % 1440
}
