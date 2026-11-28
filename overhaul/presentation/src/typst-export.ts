import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'

import { divinedAtText } from '#src/build-readout.js'
import { movingLineMarks } from '#src/moving-line-marks.js'
import type {
  ConsultationReadout,
  HexagramFigure,
  HexagramTab,
  NamedHexagram,
} from '#src/readout.js'

/*
 * The Typst export (use case 9): a medium-neutral Readout rendered as one
 * self-contained Typst document. The template is written into the source
 * itself, so a `.typ` file compiles on its own; it imports no package, reads
 * no file and names no image, so a compiler needs nothing but the source
 * and the fonts below. Its structure is private to this file.
 */

/**
 * The font families the template names, by their Typst family names: a
 * Latin face for the English, the full Noto Serif CJK TC for both scripts
 * (its Simplified forms chosen by region), and Noto Sans Symbols 2 for the
 * Hexagram symbols U+4DC0 to U+4DFF, which no CJK face holds. The template
 * sets this fallback list in this order and names no other family; the
 * compiler that turns the source into a PDF must load a face of each, and
 * nothing else, so no machine's own fonts change the output.
 */
export const typstFontFamilies = [
  'Libertinus Serif',
  'Noto Serif CJK TC',
  'Noto Sans Symbols 2',
] as const

/**
 * The Typst source of an export: one Readout after another, in the order
 * given, each starting on a new page, each showing what every Readout shows
 * (the Query, its Divined At by `divinedAtText`, the Casting, the
 * Transformation, the two Hexagram tabs as sections, the Yilin Verse when
 * shown, and the closing Editions list), the Moving Lines marked with text
 * as well as drawn. `script` is the Reading Preference's: under
 * `simplified` the Chinese is set with region `cn`, so the one CJK face
 * gives Simplified glyph forms.
 *
 * The document's metadata is fixed by the source, so the same Readouts
 * always compile to the same bytes: `#set document(title: …, date: none)`.
 * The title is neutral and never holds a Query (ADR-0015): `Consultations,
 * 2026-10-28 to 2026-11-13`, the earliest and latest local dates the
 * Readouts' Divined Ats show, or `Consultations, 2026-10-28` when they are
 * one date.
 *
 * Every text from a Consultation or the Catalogue (a Query, a passage, a
 * name, a Witness's description) enters the source only as a Typst string
 * literal passed to the template, never as markup, so no character in it
 * is read as Typst: inside the quotes `\` becomes `\\`, `"` becomes `\"`,
 * a newline `\n`, a tab `\t` and a carriage return `\r`; nothing else is
 * changed. A Query's lines are kept as given.
 */
export function typstExport(
  readouts: readonly [ConsultationReadout, ...ConsultationReadout[]],
  script: ReadingPreference['script'],
): string {
  const region = script === 'simplified' ? 'cn' : 'tw'
  const body = readouts.map(readoutSource).join('\n\n#pagebreak()\n\n')
  return `${prelude(documentTitle(readouts), region)}\n${body}\n`
}

/**
 * The neutral title: the earliest and latest local dates the Readouts show,
 * or the one date when they agree.
 */
function documentTitle(
  readouts: readonly [ConsultationReadout, ...ConsultationReadout[]],
): string {
  // The date leads Divined At's text, as `YYYY-MM-DD`, so the text order
  // of the dates is their calendar order.
  const dates = readouts
    .map((readout) => divinedAtText(readout.divinedAt).slice(0, 10))
    .toSorted()
  const first = dates[0]
  const last = dates.at(-1)
  return first === last
    ? `Consultations, ${String(first)}`
    : `Consultations, ${String(first)} to ${String(last)}`
}

/** A text as a Typst string literal, so nothing in it is read as markup. */
const lit = (text: string): string =>
  `"${text
    .replaceAll('\\', '\\\\')
    .replaceAll('"', String.raw`\"`)
    .replaceAll('\n', String.raw`\n`)
    .replaceAll('\t', String.raw`\t`)
    .replaceAll('\r', String.raw`\r`)}"`

/** A Chinese Edition is in a script; a Translation is in a language. */
const isChinese = (edition: Edition): boolean => edition.script !== undefined

/** One Edition's text, as the template's (short name, text, Chinese). */
const editionText = (edition: Edition, text: string): string =>
  `(${lit(edition.shortName)}, ${lit(text)}, ${String(isChinese(edition))})`

/** A Typst array, one item to a line, or `()` when empty. */
const array = (items: readonly string[], indent: string): string =>
  items.length === 0
    ? '()'
    : `(\n${items.map((item) => `${indent}  ${item},\n`).join('')}${indent})`

const lineValues = (figure: HexagramFigure): string =>
  `(${figure.lines.map((line) => `(${String(line.value)}, ${lit(line.change)})`).join(', ')})`

const hexagramNames = (hexagram: NamedHexagram, indent: string): string =>
  array(
    hexagram.names.map((name) => editionText(name.edition, name.name)),
    indent,
  )

const trigramNames = (
  trigrams: readonly TrigramName[],
  indent: string,
): string =>
  array(
    trigrams.map(
      (each) =>
        `(${lit(each.edition.shortName)}, ${lit(each.name)}, ${lit(each.imagery)}, ${String(isChinese(each.edition))})`,
    ),
    indent,
  )

const named = (hexagram: NamedHexagram, indent: string): string =>
  `(${String(hexagram.receivedSequenceNumber)}, ${hexagramNames(hexagram, indent)})`

function figureSource(figure: HexagramFigure, indent: string): string {
  return [
    `(`,
    `${indent}  number: ${String(figure.hexagram.receivedSequenceNumber)},`,
    `${indent}  names: ${hexagramNames(figure.hexagram, `${indent}  `)},`,
    `${indent}  lines: ${lineValues(figure)},`,
    `${indent}  upper: ${trigramNames(figure.upperTrigram, `${indent}  `)},`,
    `${indent}  lower: ${trigramNames(figure.lowerTrigram, `${indent}  `)},`,
    `${indent})`,
  ].join('\n')
}

function tabSource(heading: string, tab: HexagramTab): string {
  const passages = tab.passages.map((passage) => {
    const texts = array(
      passage.texts.map((text) => editionText(text.edition, text.text)),
      '      ',
    )
    const commentaries = array(
      passage.commentaries.map(
        (commentary) =>
          `(${lit(commentary.label)}, ${array(
            commentary.texts.map((text) =>
              editionText(text.edition, text.text),
            ),
            '        ',
          )})`,
      ),
      '      ',
    )
    return `(\n      ${lit(passage.label)},\n      ${texts},\n      ${commentaries},\n    )`
  })
  return [
    `#hexagram-tab(`,
    `  ${lit(heading)},`,
    `  ${figureSource(tab.figure, '  ')},`,
    `  nuclear: ${named(tab.nuclearHexagram, '  ')},`,
    `  inverse: ${named(tab.inverseHexagram, '  ')},`,
    `  reversed: ${named(tab.reversedHexagram, '  ')},`,
    `  passages: ${array(passages, '  ')},`,
    `)`,
  ].join('\n')
}

const divisionMethods = {
  automatic: 'Automatic',
  virtual: 'Virtual',
  physical: 'Physical',
} as const

function castingSource(casting: ConsultationReadout['casting']): string {
  if (casting.origin === 'recorded') return '#no-casting()'
  const rounds = casting.rounds.map(
    (round) =>
      `(${[
        round.line,
        round.round,
        round.stalks,
        round.leftHeap,
        round.leftPiles,
        round.leftRemainder,
        round.rightHeap,
        round.rightPiles,
        round.rightRemainder,
        round.setAside,
        round.remainingFours,
        round.lineValue ?? 'none',
      ].join(', ')})`,
  )
  return `#casting(${lit(divisionMethods[casting.divisionMethod])}, ${array(rounds, '')})`
}

function readoutSource(readout: ConsultationReadout): string {
  const parts = [
    `#query(${lit(readout.query)}, ${lit(divinedAtText(readout.divinedAt))})`,
    castingSource(readout.casting),
    [
      `#transformation(`,
      `  ${figureSource(readout.transformation.standing, '  ')},`,
      `  ${figureSource(readout.transformation.emerging, '  ')},`,
      `)`,
    ].join('\n'),
    tabSource('Standing Hexagram', readout.standing),
    tabSource('Emerging Hexagram', readout.emerging),
  ]
  if (readout.yilinVerse.length > 0) {
    parts.push(
      `#yilin-verse(${array(
        readout.yilinVerse.map((text) => editionText(text.edition, text.text)),
        '',
      )})`,
    )
  }
  parts.push(
    `#editions(${array(
      readout.editions.map(
        (edition) =>
          `(${lit(edition.shortName)}, ${lit(edition.title)}, ${lit(edition.witness.description)}, ${String(edition.unidentified)})`,
      ),
      '',
    )})`,
  )
  return parts.join('\n\n')
}

/**
 * The document's settings and the template every Readout is set with,
 * written as raw text so its backslashes are Typst's own.
 */
const prelude = (
  title: string,
  region: 'tw' | 'cn',
): string => String.raw`#set document(title: ${lit(title)}, date: none)
#set page(paper: "a4", margin: 2cm, numbering: "1")
#set text(
  font: ("Libertinus Serif", "Noto Serif CJK TC", "Noto Sans Symbols 2"),
  size: 10pt,
  lang: "en",
)
#set heading(numbering: none)
#show heading.where(level: 1): set text(size: 14pt)
#show heading.where(level: 2): set text(size: 12pt)
#show heading.where(level: 3): set text(size: 10.5pt)

// The template. Every text from a Consultation or the Catalogue reaches it
// as a string, so nothing in one is read as markup.

#let zh(body) = text(lang: "zh", region: ${lit(region)}, body)
#let in-lines(body) = body.split("\n").join(linebreak())
#let line-names = ("初", "二", "三", "四", "五", "上")
#let ordinals = ("1st", "2nd", "3rd", "4th", "5th", "6th")

// One Edition's text, under its short name: (short name, text, Chinese).
#let edition-text(item) = {
  let (short-name, body, chinese) = item
  block(breakable: true, below: 1em)[
    #strong(short-name) \
    #if chinese { zh(body) } else { body }
  ]
}

// A Hexagram's number and its name in each Edition shown.
#let named(number, names) = {
  let shown = names.map(((short-name, body, chinese)) => if chinese { zh(body) } else { body })
  "#" + str(number) + " " + shown.join(" / ")
}

// A Line drawn: one bar for a yang Line, two for a yin Line.
#let bar(value) = {
  let full = box(width: 3.6em, height: 0.55em, fill: black)
  let half = box(width: 1.5em, height: 0.55em, fill: black)
  if calc.odd(value) { full } else { half + h(0.6em) + half }
}

// A Moving Line is marked with text as well as drawn: ${movingLineMarks[9]} for 9, ${movingLineMarks[6]} for 6.
#let mark(value, change) = {
  if change != "moving" { "" } else if value == 9 { ${lit(movingLineMarks[9])} } else { ${lit(movingLineMarks[6])} }
}

#let position(at) = zh(line-names.at(at - 1)) + ", " + ordinals.at(at - 1)

// A Figure's rows, Line 6 at the top: Line Value, bar, mark, position.
#let figure-rows(lines) = {
  let rows = range(6, 0, step: -1).map(at => {
    let (value, change) = lines.at(at - 1)
    (str(value), bar(value), mark(value, change), position(at))
  })
  rows.flatten()
}

#let figure-grid(lines) = block(breakable: false, grid(
  columns: 4,
  column-gutter: 0.8em,
  row-gutter: 0.5em,
  align: horizon,
  ..figure-rows(lines),
))

// A Trigram's name and imagery in each Edition shown.
#let trigram-names(trigrams) = {
  let shown = trigrams.map(((short-name, name, imagery, chinese)) => if chinese {
    zh(name + " " + imagery)
  } else {
    name + ", " + imagery
  })
  shown.join("; ")
}

#let query(body, divined-at) = [
  = Query
  #in-lines(body)

  #divined-at
]

#let ledger-row((line, round, stalks, left-heap, left-fours, left-remainder, right-heap, right-fours, right-remainder, set-aside, fours, value)) = (
  if round == 3 { zh(line-names.at(line - 1)) + str(line) } else { [] },
  str(round), str(stalks),
  str(left-heap), str(left-fours), str(left-remainder),
  str(right-heap), str(right-fours), "1", str(right-remainder),
  str(set-aside),
  if value == none { str(fours) } else { "⇒ " + str(value) },
)

// A ledger heading: the Chinese term above the English one.
#let both(chinese, english) = zh(chinese) + linebreak() + english

#let casting(division-method, rounds) = [
  = Casting
  Division Method: #division-method

  #set text(size: 9pt)
  #table(
    columns: 12,
    align: right,
    stroke: none,
    table.header(
      [], [], [],
      table.cell(colspan: 3, align: center, zh("左") + " Left"),
      table.cell(colspan: 4, align: center, zh("右") + " Right"),
      [], [],
      both("爻", "Line"), both("變", "Round"), both("蓍", "Stalks"),
      both("左", "Heap"), both("揲", "Fours"), both("扐", "Remainder"),
      both("右", "Heap"), both("揲", "Fours"), both("掛", "Hung Stalk"),
      both("扐", "Remainder"), both("歸奇", "Set-aside"), both("營", "Tally"),
      table.hline(),
    ),
    ..rounds.map(ledger-row).flatten(),
  )
]

#let no-casting() = [
  = Casting
  _A Recorded Consultation has no Casting._
]

#let figure-summary(figure) = [
  #named(figure.number, figure.names) \
  Upper: #trigram-names(figure.upper) \
  Lower: #trigram-names(figure.lower)
]

// The Standing and Emerging Hexagrams side by side, an arrow from each
// Moving Line to the Changed Line it becomes.
#let transformation-row(standing, emerging-figure, at) = {
  let (value, change) = standing.lines.at(at - 1)
  let (emerging-value, _) = emerging-figure.lines.at(at - 1)
  (
    str(value), bar(value), mark(value, change), position(at),
    if change == "moving" { "→" } else { "" },
    str(emerging-value), bar(emerging-value), position(at),
  )
}

#let transformation(standing, emerging-figure) = [
  = Transformation
  #grid(
    columns: 8,
    column-gutter: 0.8em,
    row-gutter: 0.5em,
    align: horizon,
    ..range(6, 0, step: -1).map(at => transformation-row(standing, emerging-figure, at)).flatten(),
  )
  #grid(
    columns: 2,
    column-gutter: 2em,
    [*Standing Hexagram* \ #figure-summary(standing)],
    [*Emerging Hexagram* \ #figure-summary(emerging-figure)],
  )
]

#let hexagram-tab(heading-text, figure, nuclear: none, inverse: none, reversed: none, passages: ()) = [
  = #heading-text #figure.number
  #figure-grid(figure.lines)

  Line Values, the bottom first: #figure.lines.map(((value, change)) => str(value)).join(", ")

  Upper Trigram: #trigram-names(figure.upper) \
  Lower Trigram: #trigram-names(figure.lower)

  == Name
  #for item in figure.names { edition-text(item) }

  == Structure
  - #zh("互卦") Nuclear Hexagram: #named(..nuclear)
  - #zh("錯卦") Inverse Hexagram: #named(..inverse)
  - #zh("綜卦") Reversed Hexagram: #named(..reversed)

  #for (label, texts, commentaries) in passages [
    == #zh(label)
    #for item in texts { edition-text(item) }
    #for (commentary-label, commentary-texts) in commentaries [
      === #zh(commentary-label)
      #for item in commentary-texts { edition-text(item) }
    ]
  ]
]

#let yilin-verse(texts) = [
  = Yilin Verse
  #for item in texts { edition-text(item) }
]

// Each Edition shown, with its Witness.
#let editions(shown) = [
  = Editions and Witnesses
  #for (short-name, title, witness, unidentified) in shown [
    #block(breakable: true, below: 1em)[
      #strong(short-name) \
      #title \
      Witness: #witness
      #if unidentified [ \ _An unidentified Edition._ ]
    ]
  ]
]
`
