import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import type {
  Hexagram,
  Line,
  PartialCastingRecord,
  PartialSplitRecord,
} from '@hexagram/types'

import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  HEADING_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
} from './output-palette.js'
import {
  assertLine1ToLine6,
  isLineIndex,
  isMovingLine,
} from './utils-validators.js'

// `✕` U+2715 — matches the home banner's moving-yin glyph so every render
// surface (banner, casting readout, history readout, playground) speaks one
// glyph vocabulary. Saved consultation `.md` files containing the older `×`
// U+00D7 character self-heal on next load via the history-app's byte-compare
// rerender.
const hexagramLineDiagramMap = {
  6: '━━━ ✕ ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
} as const satisfies Record<Line, string>

function getLineColor(line: Line): typeof BOLD_RED | typeof BOLD_WHITE {
  return isMovingLine(line) ? BOLD_RED : BOLD_WHITE
}

// Layout geometry (all values in terminal columns; ANSI codes are zero-width):
//
//   left line = 2 indent + 1 value + 2 sp + 9 diagram + 2 sp + 11 pos = 27 cols
//   gap/arrow = 17×─ + ▶ + 1 space                                    = 19 cols
//   right column starts at                                               col 46
//
// position labels like （六, 6th）: （(2) + CJK(2) + ", "(2) + "6th"(3) + ）(2) = 11 cols
const RIGHT_COLUMN = 46
/** 19-col inter-column connector for moving lines: 17×─ + ▶ + 1 space. */
export const MOVING_ARROW = '─────────────────▶ '
/** 19-col blank gap for static lines (matches `MOVING_ARROW` width). */
export const STATIC_GAP = '                   '

/** Bottom-first (`1`..`6`) fullwidth position labels for hexagram diagrams. */
export const POSITION_LABELS = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（六, 6th）',
} as const

/**
 * Compute the display width of a string, counting CJK and other fullwidth
 * characters as two columns and everything else as one. Used by
 * `padToColumn` to keep fixed-width diagrams aligned even when they contain
 * Chinese characters or fullwidth punctuation.
 */
function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    const isFullwidth =
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}

// Pad text to targetColumn with at least minGap spaces.
function padToColumn(text: string, targetColumn: number, minGap = 1): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

function capitalizeFirst(text: string): string {
  if (text.length === 0) return text
  return `${text[0]!.toUpperCase()}${text.slice(1)}`
}

// Width of the bar block on each side (value(1) + 2sp + bar(9) + 2sp +
// pos(11) = 25), reused as the divider width under the hexagram identity
// names so the dashes line up with the bar diagrams above them. Mirrors
// `IDENTITY_DIVIDER_WIDTH` in playground-display.ts.
const TRIGRAM_DIVIDER_WIDTH = 25

export function transformationSection(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)
  if (movingLines.length === 0)
    return `
${BOLD_GREY}TRANSFORMATION:
${NORMAL}(No transformation)
`.trim()

  const emerging = getEmergingHexagram(hexagram)
  const { Name: standingName, Metadata: standingMetadata } =
    getHexagramRecord(hexagram)
  const { Name: emergingName, Metadata: emergingMetadata } =
    getHexagramRecord(emerging)

  const [
    standingLine1,
    standingLine2,
    standingLine3,
    standingLine4,
    standingLine5,
    standingLine6,
  ] = hexagram
  const [
    emergingLine1,
    emergingLine2,
    emergingLine3,
    emergingLine4,
    emergingLine5,
    emergingLine6,
  ] = emerging

  const pairs: [
    Line,
    Line,
    (typeof POSITION_LABELS)[keyof typeof POSITION_LABELS],
  ][] = [
    [standingLine6, emergingLine6, POSITION_LABELS[6]],
    [standingLine5, emergingLine5, POSITION_LABELS[5]],
    [standingLine4, emergingLine4, POSITION_LABELS[4]],
    [standingLine3, emergingLine3, POSITION_LABELS[3]],
    [standingLine2, emergingLine2, POSITION_LABELS[2]],
    [standingLine1, emergingLine1, POSITION_LABELS[1]],
  ]

  // Headers are left-flush with the bar-block column on each side (col 2
  // for standing, col 46 for emerging) so the labels line up with the line
  // value digits below them — matches the playground's left-aligned header.
  const headerLine =
    `${BOLD_GREY}${padToColumn('  Standing Hexagram', RIGHT_COLUMN)}${NORMAL}` +
    `${BOLD_GREY}Emerging Hexagram${NORMAL}`

  const lineRows = pairs
    .map(([standingLine, emergingLine, pos]) => {
      const moving = isMovingLine(standingLine)
      const standingColor = moving ? BOLD_RED : BOLD_WHITE
      const gap = moving ? MOVING_ARROW : STATIC_GAP
      const left = `  ${standingColor}${standingLine}${NORMAL}  ${standingColor}${hexagramLineDiagramMap[standingLine]}${NORMAL}  ${pos}`
      const right = `${BOLD_WHITE}${emergingLine}${NORMAL}  ${BOLD_WHITE}${hexagramLineDiagramMap[emergingLine]}${NORMAL}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')

  // Footer rows below the diagram, paired side-by-side:
  //   row 1: #N Chinese（pinyin） — aligned to RIGHT_COLUMN
  //   row 2: Wilhelm-Baynes English name — ≥6-col gap after standing
  //   row 3: a 25-col `─` divider per side, lining up with the bar block
  //   row 4: `Upper: <Chinese> <Pinyin> (<English imagery>)` per side
  //   row 5: `Lower: <Chinese> <Pinyin> (<English imagery>)` per side
  // Row format for rows 4/5 mirrors the playground's identity stack so a
  // future shared composer can render either surface from one builder.
  const standingFooter1 = `  #${standingMetadata.Order.WenWang} ${standingName.Chinese.Traditional}（${standingMetadata.Pronunciation.Pinyin}）`
  const emergingFooter1 = `#${emergingMetadata.Order.WenWang} ${emergingName.Chinese.Traditional}（${emergingMetadata.Pronunciation.Pinyin}）`
  const footer1 = `${BOLD_WHITE}${padToColumn(standingFooter1, RIGHT_COLUMN)}${emergingFooter1}${NORMAL}`

  const standingFooter2 = `  ${standingName.English.WilhelmBaynes}`
  const emergingFooter2 = emergingName.English.WilhelmBaynes
  const footer2 = `${NORMAL_GREY}${padToColumn(standingFooter2, RIGHT_COLUMN, 6)}${emergingFooter2}${NORMAL}`

  const dividerRow = (() => {
    const dashes = '─'.repeat(TRIGRAM_DIVIDER_WIDTH)
    return `${NORMAL_GREY}${padToColumn(`  ${dashes}`, RIGHT_COLUMN)}${dashes}${NORMAL}`
  })()

  const trigramRow = (position: 'Upper' | 'Lower'): string => {
    const standingTrigram = getTrigramRecord(
      position === 'Upper'
        ? standingMetadata.Trigram.Upper
        : standingMetadata.Trigram.Lower,
    )
    const emergingTrigram = getTrigramRecord(
      position === 'Upper'
        ? emergingMetadata.Trigram.Upper
        : emergingMetadata.Trigram.Lower,
    )
    const cell = (trigram: ReturnType<typeof getTrigramRecord>): string =>
      `${position}: ${trigram.Name.Chinese.Traditional} ${capitalizeFirst(
        String(trigram.Metadata.Pronunciation.Pinyin),
      )} (${capitalizeFirst(String(trigram.Imagery.English.WilhelmBaynes))})`
    const left = `  ${cell(standingTrigram)}`
    const right = cell(emergingTrigram)
    return `${NORMAL_GREY}${padToColumn(left, RIGHT_COLUMN)}${right}${NORMAL}`
  }
  const upperRow = trigramRow('Upper')
  const lowerRow = trigramRow('Lower')

  return `
${BOLD_GREY}TRANSFORMATION:

${NORMAL}${headerLine}

${lineRows}

${footer1}
${footer2}
${dividerRow}
${upperRow}
${lowerRow}
`.trim()
}

export function querySection(query: string): string {
  return `${BOLD_GREY}QUERY:

  ${BOLD_WHITE}${query || '(Query not provided)'}`
}

// Pad `text` to `width` visual columns, centred. The styling wraps just the
// text — ANSI codes are zero-width so the cell still aligns.
function castCenter(text: string, width: number, color?: string): string {
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  const body = color ? `${color}${text}${NORMAL}` : text
  return `${' '.repeat(leftPad)}${body}${' '.repeat(rightPad)}`
}

// Right-aligned cell: filler, then the (optionally styled) text, then a single
// trailing space — keeps numeric values lined up against the right edge of the
// column with a touch of breathing room from the border.
function castRight(text: string, width: number, color?: string): string {
  const leading = Math.max(0, width - text.length - 1)
  const body = color ? `${color}${text}${NORMAL}` : text
  return `${' '.repeat(leading)}${body} `
}

// The eighteen stalk divisions (十有八變) that produced the hexagram, laid out
// as a single 6×9 grid under a hierarchical header. Rows are lines in
// hexagram order (Line 6 at top, matching the diagram sections); columns are
// grouped under a top-level `Cast` banner, split into three ordinals
// (`1st` / `2nd` / `3rd`), and within each cast the leaf columns are
// `Stalks` (the round's selectable range) and a `Heap → {Left, Right}`
// subgroup recording the two heaps the stalks were parted into (`Left` is
// the index parted at, `Right` is `Stalks − Left`). The query is not
// repeated here — it has its own section.
//
// Accepts a `PartialCastingRecord` so the same renderer is reused while the
// casting is still being collected by the interactive viewer — `null` cells
// fall back to a `·` placeholder of the same column width, so border characters
// never shift as cells fill in. `CastingRecord` is structurally a subtype, so
// fully-populated callers keep producing byte-identical output (the four
// `tests/fixtures/plain-output-*.txt` byte-identity tests guard this).
//
// A `null` casting (a consultation with no recorded casting — e.g. one
// migrated from a pre-CASTING legacy `.txt`) renders a "Casting not recorded"
// caption instead of the table.
export function castingSection(casting: PartialCastingRecord | null): string {
  if (casting === null)
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded
`.trim()

  const TOP =
    '┌──────┬──────────────────────────────────────────────────────────────────────────┐'
  const CAST_OUTER_DIVIDER =
    '│      ├────────────────────────┬────────────────────────┬────────────────────────┤'
  const CAST_INNER_DIVIDER =
    '│      ├────────┬───────────────┼────────┬───────────────┼────────┬───────────────┤'
  const HEAP_INNER_DIVIDER =
    '│      │        ├───────┬───────┤        ├───────┬───────┤        ├───────┬───────┤'
  const MID =
    '├──────┼────────┼───────┼───────┼────────┼───────┼───────┼────────┼───────┼───────┤'
  const BOTTOM =
    '└──────┴────────┴───────┴───────┴────────┴───────┴───────┴────────┴───────┴───────┘'

  // Header rows, top-down: a `Cast` banner spanning all three casts; three
  // ordinal labels (`1st` / `2nd` / `3rd`); a `Heap` subgroup banner over the
  // `Left` / `Right` pair within each cast (the `Stalks` slot is left blank
  // so the column header below visually owns it); and the leaf labels.
  // Spanning labels are `castCenter`-ed over their group; leaf labels use
  // `castRight` so they share the one-column trailing gutter of the numeric
  // body cells below.
  const CAST_LABEL = `│      │${castCenter('Cast', 74, HEADING_GREY)}│`

  const nthCell = (text: string): string => castCenter(text, 24, HEADING_GREY)
  const NTH_LABEL = `│      │${nthCell('1st')}│${nthCell('2nd')}│${nthCell('3rd')}│`

  const heapBanner = `        │${castCenter('Heap', 15, HEADING_GREY)}`
  const HEAP_LABEL = `│      │${heapBanner}│${heapBanner}│${heapBanner}│`

  const colCell = `${castRight('Stalks', 8, HEADING_GREY)}│${castRight('Left', 7, HEADING_GREY)}│${castRight('Right', 7, HEADING_GREY)}`
  const COL_LABELS = `│${castRight('Line', 6, HEADING_GREY)}│${colCell}│${colCell}│${colCell}│`

  // All numeric body cells right-align so multi-digit values line up against
  // the right column edge. Pending cells get a `·` in all three sub-columns,
  // dimmed so the eye reads them as "not yet picked".
  const cell = (split: PartialSplitRecord): string =>
    split === null
      ? `${castRight('·', 8, PLACEHOLDER_GREY)}│${castRight('·', 7, PLACEHOLDER_GREY)}│${castRight('·', 7, PLACEHOLDER_GREY)}`
      : `${castRight(String(split.max), 8, NORMAL_GREY)}│${castRight(String(split.pick), 7, BOLD_WHITE)}│${castRight(String(split.max - split.pick), 7, BOLD_WHITE)}`

  // `casting` is a 6-tuple and the literal source `[6, 5, 4, 3, 2, 1]` covers
  // every valid index, but TS can't narrow `lineNumber - 1` to `0..5` from a
  // plain `number`. Index with the tuple-positioned literals instead — each
  // access is provably in-bounds.
  const indexedLines = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const
  const dataRows = indexedLines
    .map(([lineNumber, lineCasting]) => {
      const [first, second, third] = lineCasting
      return `│${castRight(String(lineNumber), 6)}│${cell(first)}│${cell(second)}│${cell(third)}│`
    })
    .join('\n')

  return `
${BOLD_GREY}CASTING:${NORMAL}

${TOP}
${CAST_LABEL}
${CAST_OUTER_DIVIDER}
${NTH_LABEL}
${CAST_INNER_DIVIDER}
${HEAP_LABEL}
${HEAP_INNER_DIVIDER}
${COL_LABELS}
${MID}
${dataRows}
${BOTTOM}
`.trim()
}

export function hexagramTextSection(hexagram: Hexagram): string {
  const { Text } = getHexagramRecord(hexagram)

  return `
${BOLD_GREY}HEXAGRAM:
${NORMAL_GREY}[Traditional Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Scripture.Hexagram}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Exegesis.Imagery.Hexagram}

${NORMAL_GREY}[Simplified Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Scripture.Hexagram}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Exegesis.Imagery.Hexagram}

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Scripture.Hexagram.replaceAll('\n', '\n  ')}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Exegesis.Imagery.Hexagram.replaceAll('\n', '\n  ')}

${NORMAL_GREY}[English, James Legge]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.Legge.Scripture.Hexagram}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.Legge.Exegesis.Imagery.Hexagram}
`.trim()
}

function oneMovingLineSection(hexagram: Hexagram): string {
  const movingLineIndex = hexagram.findIndex(isMovingLine)

  if (!isLineIndex(movingLineIndex)) return ''

  const movingLineKey = `L${movingLineIndex + 1}` as const

  assertLine1ToLine6(movingLineKey)

  const { Text } = getHexagramRecord(hexagram)

  return `
${BOLD_GREY}LINES:
${NORMAL}(One moving line)

${NORMAL_GREY}[Traditional Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Scripture.Lines[movingLineKey]}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Exegesis.Imagery.Lines[movingLineKey]}

${NORMAL_GREY}[Simplified Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Scripture.Lines[movingLineKey]}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Exegesis.Imagery.Lines[movingLineKey]}

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Scripture.Lines[movingLineKey].replaceAll('\n', '\n  ')}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Exegesis.Imagery.Lines[movingLineKey].replaceAll('\n', '\n  ')}

${NORMAL_GREY}[English, James Legge]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.Legge.Scripture.Lines[movingLineKey]}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.Legge.Exegesis.Imagery.Lines[movingLineKey]}
`.trim()
}

// LINES block for a hexagram: per-line scripture/exegesis when one moving
// line is present, or a "no reference available" notice for multiple. With
// zero moving lines the block is empty — the HEXAGRAM-level scripture is
// rendered separately via `hexagramTextSection`.
export function linesBlock(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)

  if (movingLines.length === 0) return ''
  if (movingLines.length === 1) return oneMovingLineSection(hexagram)

  return `${BOLD_GREY}LINES:

${NORMAL}(Multiple moving lines)

${BOLD_WHITE}No available reference scripture or exegesis for multiple moving lines.
${NORMAL}
`
}

function hexagramSection(
  hexagram: Hexagram,
  label: string,
  lineColor: (line: Line) => string,
): string {
  const [line1, line2, line3, line4, line5, line6] = hexagram
  const { Name, Metadata } = getHexagramRecord(hexagram)
  const {
    Imagery: {
      Chinese: { Traditional: UpperTrigramImageryChinese },
      English: { WilhelmBaynes: UpperTrigramImageryEnglish },
    },
  } = getTrigramRecord(Metadata.Trigram.Upper)
  const {
    Imagery: {
      Chinese: { Traditional: LowerTrigramImageryChinese },
      English: { WilhelmBaynes: LowerTrigramImageryEnglish },
    },
  } = getTrigramRecord(Metadata.Trigram.Lower)

  return `
${BOLD_GREY}${label} HEXAGRAM ${Metadata.Order.WenWang}:

${NORMAL}(Line at bottom is first)

  ${lineColor(line6)}${line6}  ${hexagramLineDiagramMap[line6]}  ${NORMAL}${POSITION_LABELS[6]}──┐
  ${lineColor(line5)}${line5}  ${hexagramLineDiagramMap[line5]}  ${NORMAL}${POSITION_LABELS[5]}──┼── ${UpperTrigramImageryChinese}（上卦）
  ${lineColor(line4)}${line4}  ${hexagramLineDiagramMap[line4]}  ${NORMAL}${POSITION_LABELS[4]}──┘   ${UpperTrigramImageryEnglish} (upper trigram)
  ${lineColor(line3)}${line3}  ${hexagramLineDiagramMap[line3]}  ${NORMAL}${POSITION_LABELS[3]}──┐
  ${lineColor(line2)}${line2}  ${hexagramLineDiagramMap[line2]}  ${NORMAL}${POSITION_LABELS[2]}──┼── ${LowerTrigramImageryChinese}（下卦）
  ${lineColor(line1)}${line1}  ${hexagramLineDiagramMap[line1]}  ${NORMAL}${POSITION_LABELS[1]}──┘   ${LowerTrigramImageryEnglish} (lower trigram)

${NORMAL}(First is line at bottom)

  ${lineColor(line1)}${line1}, ${lineColor(line2)}${line2}, ${lineColor(line3)}${line3}, ${lineColor(line4)}${line4}, ${lineColor(line5)}${line5}, ${lineColor(line6)}${line6}

${BOLD_GREY}${label} HEXAGRAM NAME AND PRONUNCIATION:

${NORMAL_GREY}[Traditional Chinese]

  ${BOLD_WHITE}${Name.Chinese.Traditional}（${Metadata.Pronunciation.Zhuyin}）

${NORMAL_GREY}[Simplified Chinese]

  ${BOLD_WHITE}${Name.Chinese.Simplified}（${Metadata.Pronunciation.Pinyin}）

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${BOLD_WHITE}${Name.English.WilhelmBaynes}

${NORMAL_GREY}[English, James Legge]

  ${BOLD_WHITE}${Name.English.Legge}
`
}

export function standingHexagramSection(hexagram: Hexagram): string {
  return hexagramSection(hexagram, 'STANDING', getLineColor)
}

export function emergingHexagramSection(hexagram: Hexagram): string {
  return hexagramSection(
    getEmergingHexagram(hexagram),
    'EMERGING',
    () => BOLD_WHITE,
  )
}
