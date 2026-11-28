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

/** Which of the two Hexagram tabs a section belongs to. */
export type HexagramRole = 'STANDING' | 'EMERGING'

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
    `${palette.heading}${wording.query}:\n\n` +
    `  ${palette.emphasis}${indented(readout.query)}\n` +
    `  ${palette.muted}${divinedAtText(readout.divinedAt)}`
  )
}

export const divisionMethodNames: Readonly<Record<DivisionMethod, string>> = {
  automatic: 'Automatic',
  physical: 'Physical',
  virtual: 'Virtual',
}

function castingSection(casting: CastingTab, palette: Palette): string {
  const title = `${palette.heading}${wording.casting}:${palette.reset}\n\n${palette.reset}`
  if (casting.origin === 'recorded') return `${title}${wording.noCasting}`
  const method = divisionMethodNames[casting.divisionMethod]
  return `${title}${wording.divisionMethod}${method}\n\n${ledgerGrid(casting.rounds, palette)}`
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
export const numberAndNames = (
  hexagram: NamedHexagram,
  names: NamedHexagram['names'] = hexagram.names,
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

/**
 * The Transformation tab below its title: the two Hexagrams' headings, their
 * Line rows side by side, and the rows naming them.
 */
export function transformationGrid(
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
    headings,
    transformationRows(standing, emerging, palette, emergingColumn).join('\n'),
    rows
      .map(
        (row) =>
          `${palette[row.paint]}${padToColumn(`  ${row.standing}`, emergingColumn)}${row.emerging}${reset}`,
      )
      .join('\n'),
  ].join('\n\n')
}

function transformationSection(
  transformation: TransformationReadout['transformation'],
  palette: Palette,
): string {
  return `${palette.heading}${wording.transformation}:\n\n${palette.reset}${transformationGrid(transformation, palette)}`
}

/**
 * The words of the Readout's sections, which plain output and the Markdown
 * body share; each adds its own punctuation, markup and colour.
 */
export const wording = {
  query: 'QUERY',
  casting: 'CASTING',
  transformation: 'TRANSFORMATION',
  yilinVerse: 'YILIN VERSE',
  editions: 'EDITIONS AND WITNESSES',
  hexagram: (role: HexagramRole, tab: HexagramTab): string =>
    `${role} HEXAGRAM ${String(tab.figure.hexagram.receivedSequenceNumber)}`,
  hexagramName: (role: HexagramRole): string => `${role} HEXAGRAM NAME`,
  hexagramStructure: (role: HexagramRole): string =>
    `${role} HEXAGRAM STRUCTURE`,
  noCasting: 'A Recorded Consultation has no Casting.',
  divisionMethod: 'Division Method: ',
  witness: 'Witness: ',
  unidentified: ' (unidentified)',
  lineAtBottomFirst: 'Line at bottom is first',
  firstLineAtBottom: 'First is line at bottom',
} as const

/** The related Hexagrams a Hexagram tab lists, each by its label. */
export const structureLabels = [
  ['互卦 Nuclear Hexagram', 'nuclearHexagram'],
  ['錯卦 Inverse Hexagram', 'inverseHexagram'],
  ['綜卦 Reversed Hexagram', 'reversedHexagram'],
] as const

/** The related Hexagrams' names start one space past the widest label. */
const structureColumn =
  Math.max(...structureLabels.map(([label]) => textWidth(`${label}:`))) + 1

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
  role: HexagramRole,
  tab: HexagramTab,
  palette: Palette,
): string {
  const { figure } = tab
  const values = [...figure.lines]
    .map((line) => `${lineColour(line, palette)}${String(line.value)}`)
    .join(', ')
  const names = editionBlocks(
    figure.hexagram.names.map(({ edition, name }) => ({ edition, text: name })),
    palette,
  )
  const diagram = [
    `${palette.heading}${wording.hexagram(role, tab)}:`,
    `${palette.reset}(${wording.lineAtBottomFirst})`,
    diagramRows(figure, palette).join('\n'),
    `${palette.reset}(${wording.firstLineAtBottom})`,
    `  ${values}`,
    `${palette.heading}${wording.hexagramName(role)}:`,
    names,
  ].join('\n\n')
  const structureRows = structureLabels.map(
    ([label, key]) =>
      `  ${palette.muted}${padToColumn(`${label}:`, structureColumn)}${palette.emphasis}${numberAndNames(tab[key])}${palette.reset}`,
  )
  const structure = [
    `${palette.heading}${wording.hexagramStructure(role)}:`,
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
    `${palette.heading}${wording.yilinVerse}:\n${editionBlocks(readout.yilinVerse, palette)}`,
  ]
}

function editionsSection(
  editions: readonly Edition[],
  palette: Palette,
): string {
  return `${palette.heading}${wording.editions}:\n\n${editions
    .map(
      (edition) =>
        `${palette.muted}[${edition.shortName}]\n\n` +
        `  ${palette.emphasis}${edition.title}${edition.unidentified ? wording.unidentified : ''}\n` +
        `  ${palette.reset}${wording.witness}${edition.witness.description}`,
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
