import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import { divinedAtText } from '@hexagram/presentation/build-readout'
import type {
  CastingTab,
  ConsultationReadout,
  HexagramFigure,
  HexagramTab,
  NamedHexagram,
  PassageShown,
  TransformationReadout,
} from '@hexagram/presentation/readout'
import type { Edition } from '@hexagram/scripture-catalogue/edition'

import {
  diagramRows,
  lineColour,
  standingLineWidth,
  transformationRows,
} from '#src/readout/figure-rows.js'
import { ledgerGrid } from '#src/readout/ledger-grid.js'
import type { Palette } from '#src/readout/palette.js'
import { padToColumn, textWidth } from '#src/readout/text-width.js'

/*
 * The Readout's sections as the terminal shows them: the Query, then one
 * string per tab. Plain output and the Ink sections are both built from
 * these, so the two never drift apart.
 */

export interface ReadoutSections {
  readonly query: string
  readonly casting: string
  readonly transformation: string
  readonly standing: string
  readonly emerging: string
}

/** Every line of a text after its first, indented as the first is. */
const indented = (text: string): string => text.replaceAll('\n', '\n  ')

/** Blocks of text, each headed by its Edition's short name. */
function editionBlocks(
  blocks: readonly { readonly edition: Edition; readonly text: string }[],
  palette: Palette,
): string {
  return blocks
    .map(
      ({ edition, text }) =>
        `${palette.muted}[${edition.shortName}]\n\n  ${palette.emphasis}${indented(text)}`,
    )
    .join('\n\n')
}

function querySection(readout: ConsultationReadout, palette: Palette): string {
  return (
    `${palette.heading}QUERY:\n\n` +
    `  ${palette.emphasis}${indented(readout.query)}\n` +
    `  ${palette.muted}${divinedAtText(readout.divinedAt)}`
  )
}

const divisionMethodNames: Readonly<Record<DivisionMethod, string>> = {
  automatic: 'Automatic',
  physical: 'Physical',
  virtual: 'Virtual',
}

function castingSection(casting: CastingTab, palette: Palette): string {
  const title = `${palette.heading}CASTING:${palette.reset}\n\n${palette.reset}`
  if (casting.origin === 'recorded')
    return `${title}A Recorded Consultation has no Casting.`
  const method = divisionMethodNames[casting.divisionMethod]
  return `${title}Division Method: ${method}\n\n${ledgerGrid(casting.rounds, palette)}`
}

/**
 * Several Editions' names on one line: the Chinese names with `joiner`, then
 * the Translations' names joined to each other with " · ".
 */
function sharedLine(
  names: readonly { readonly edition: Edition; readonly name: string }[],
  joiner: string,
): string {
  const chinese = names.filter((each) => each.edition.script !== undefined)
  const translations = names.filter(
    (each) => each.edition.language !== undefined,
  )
  return [
    chinese.map((each) => each.name).join(joiner),
    translations.map((each) => each.name).join(' · '),
  ]
    .filter((part) => part !== '')
    .join(joiner)
}

/** A Hexagram's number and the names given, e.g. `#64 未濟 / LXIV. …`. */
const numberAndNames = (
  hexagram: NamedHexagram,
  names = hexagram.names,
): string =>
  [`#${String(hexagram.receivedSequenceNumber)}`, sharedLine(names, ' / ')]
    .filter((part) => part !== '')
    .join(' ')

/** The Emerging column starts at least this far right, and its cells this far past the widest Standing cell. */
const emergingColumnAtLeast = 46
const columnGap = 4

/** One row of the Transformation tab below its Lines: a cell for each Hexagram. */
interface NameRow {
  readonly paint: 'emphasis' | 'muted'
  readonly standing: string
  readonly emerging: string
}

/** The name an Edition other than the first gives the Hexagram, or none. */
const nameIn = (figure: HexagramFigure, id: string): string =>
  figure.hexagram.names.slice(1).find((each) => each.edition.id === id)?.name ??
  ''

/**
 * The rows naming the two Hexagrams: each one's number and its first
 * Edition's name, then one row for each other Edition that names either,
 * the divider, and the Trigrams' names.
 */
function nameRows(
  standing: HexagramFigure,
  emerging: HexagramFigure,
): readonly NameRow[] {
  const otherEditions = [
    ...new Set(
      [standing, emerging].flatMap((figure) =>
        figure.hexagram.names.slice(1).map((each) => each.edition.id),
      ),
    ),
  ]
  const both = (
    paint: NameRow['paint'],
    cell: (figure: HexagramFigure) => string,
  ): NameRow => ({ paint, standing: cell(standing), emerging: cell(emerging) })
  return [
    both('emphasis', (figure) =>
      numberAndNames(figure.hexagram, figure.hexagram.names.slice(0, 1)),
    ),
    ...otherEditions.map((id) => both('muted', (figure) => nameIn(figure, id))),
    both('muted', () => '─'.repeat(25)),
    both('muted', (figure) => `Upper: ${sharedLine(figure.upperTrigram, ' ')}`),
    both('muted', (figure) => `Lower: ${sharedLine(figure.lowerTrigram, ' ')}`),
  ]
}

function transformationSection(
  { standing, emerging }: TransformationReadout['transformation'],
  palette: Palette,
): string {
  const { reset } = palette
  const standingTitle = '  Standing Hexagram'
  const rows = nameRows(standing, emerging)
  // Names are shown whole, never cut, so long Translations push the
  // Emerging column right rather than misalign it.
  const widest = Math.max(
    standingLineWidth,
    textWidth(standingTitle),
    ...rows.map((row) => textWidth(`  ${row.standing}`)),
  )
  const emergingColumn = Math.max(emergingColumnAtLeast, widest + columnGap)
  const headings =
    `${palette.heading}${padToColumn(standingTitle, emergingColumn)}${reset}` +
    `${palette.heading}Emerging Hexagram${reset}`
  return [
    `${palette.heading}TRANSFORMATION:\n\n${reset}${headings}`,
    transformationRows(standing, emerging, palette, emergingColumn).join('\n'),
    rows
      .map(
        (row) =>
          `${palette[row.paint]}${padToColumn(`  ${row.standing}`, emergingColumn)}${row.emerging}${reset}`,
      )
      .join('\n'),
  ].join('\n\n')
}

const structureLabels = [
  ['互卦 Nuclear Hexagram:  ', 'nuclearHexagram'],
  ['錯卦 Inverse Hexagram:  ', 'inverseHexagram'],
  ['綜卦 Reversed Hexagram: ', 'reversedHexagram'],
] as const

function passageBlocks(passage: PassageShown, palette: Palette): string {
  const titled = (
    label: string,
    blocks: Parameters<typeof editionBlocks>[0],
  ): string =>
    [`${palette.heading}${label}:`, editionBlocks(blocks, palette)]
      .filter((part) => part !== '')
      .join('\n')
  return [
    titled(passage.label, passage.texts),
    ...passage.commentaries.map((commentary) =>
      titled(commentary.label, commentary.texts),
    ),
  ].join('\n\n')
}

function hexagramSection(
  role: 'STANDING' | 'EMERGING',
  tab: HexagramTab,
  palette: Palette,
): string {
  const { figure } = tab
  const title = `${role} HEXAGRAM ${String(figure.hexagram.receivedSequenceNumber)}`
  const values = [...figure.lines]
    .map((line) => `${lineColour(line, palette)}${String(line.value)}`)
    .join(', ')
  const names = editionBlocks(
    figure.hexagram.names.map(({ edition, name }) => ({ edition, text: name })),
    palette,
  )
  const diagram = [
    `${palette.heading}${title}:`,
    `${palette.reset}(Line at bottom is first)`,
    diagramRows(figure, palette).join('\n'),
    `${palette.reset}(First is line at bottom)`,
    `  ${values}`,
    `${palette.heading}${role} HEXAGRAM NAME:`,
    names,
  ].join('\n\n')
  const structureRows = structureLabels.map(
    ([label, key]) =>
      `  ${palette.muted}${label}${palette.emphasis}${numberAndNames(tab[key])}${palette.reset}`,
  )
  const structure = [
    `${palette.heading}${role} HEXAGRAM STRUCTURE:`,
    structureRows.join('\n'),
  ].join('\n\n')
  return [
    diagram,
    structure,
    ...(tab.passages.length === 0
      ? []
      : [
          tab.passages
            .map((passage) => passageBlocks(passage, palette))
            .join('\n\n'),
        ]),
  ].join('\n\n\n')
}

function yilinVerseSection(
  readout: TransformationReadout,
  palette: Palette,
): readonly string[] {
  if (readout.yilinVerse.length === 0) return []
  return [
    `${palette.heading}YILIN VERSE:\n${editionBlocks(readout.yilinVerse, palette)}`,
  ]
}

function editionsSection(
  editions: readonly Edition[],
  palette: Palette,
): string {
  return `${palette.heading}EDITIONS AND WITNESSES:\n\n${editions
    .map(
      (edition) =>
        `${palette.muted}[${edition.shortName}]\n\n` +
        `  ${palette.emphasis}${edition.title}${edition.unidentified ? ' (unidentified)' : ''}\n` +
        `  ${palette.reset}Witness: ${edition.witness.description}`,
    )
    .join('\n\n')}`
}

export function readoutSections(
  readout: ConsultationReadout,
  palette: Palette,
): ReadoutSections {
  return {
    query: querySection(readout, palette),
    casting: castingSection(readout.casting, palette),
    transformation: transformationSection(readout.transformation, palette),
    standing: hexagramSection('STANDING', readout.standing, palette),
    emerging: [
      hexagramSection('EMERGING', readout.emerging, palette),
      ...yilinVerseSection(readout, palette),
      editionsSection(readout.editions, palette),
    ].join('\n\n\n'),
  }
}
