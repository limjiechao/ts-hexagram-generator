import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import type {
  CastingRecord,
  Hexagram,
  Line,
  PartialSplitRecord,
} from '@hexagram/types'

// Pure column-padding helpers (no ANSI). Mirrors the geometry used in the
// casting-ui `castingSection`, but emits plain text inside a ```text fence.
function castCenter(text: string, width: number): string {
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  return `${' '.repeat(leftPad)}${text}${' '.repeat(rightPad)}`
}
function castRight(text: string, width: number): string {
  const leading = Math.max(0, width - text.length - 1)
  return `${' '.repeat(leading)}${text} `
}

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

/**
 * Markdown version of the casting table. Same box-drawing geometry as the
 * casting-ui renderer, but no ANSI styling — content is wrapped in a
 * ```text fence so monospace is preserved when rendered. A `null` `casting`
 * renders an italic "Casting not recorded" caption instead of the table.
 */
export function castingMarkdownSection(casting: CastingRecord | null): string {
  if (casting === null) return `## CASTING\n\n_Casting not recorded._\n`

  const castLabel = `│      │${castCenter('Cast', 74)}│`
  const nth = (text: string): string => castCenter(text, 24)
  const nthLabel = `│      │${nth('1st')}│${nth('2nd')}│${nth('3rd')}│`
  const heapBanner = `        │${castCenter('Heap', 15)}`
  const heapLabel = `│      │${heapBanner}│${heapBanner}│${heapBanner}│`
  const colCell = `${castRight('Stalks', 8)}│${castRight('Left', 7)}│${castRight('Right', 7)}`
  const colLabels = `│${castRight('Line', 6)}│${colCell}│${colCell}│${colCell}│`

  const cell = (split: PartialSplitRecord): string => {
    if (split === null)
      return `${castRight('·', 8)}│${castRight('·', 7)}│${castRight('·', 7)}`
    // `Stalks` (max + 1) and `Right` (max - pick + 1) fold the one stalk
    // suspended from the right heap back in — it was part of the unparted
    // stalks and part of the right heap before sorting — so Left + Right ==
    // Stalks. Mirrors `castingSection` in @hexagram/readout.
    return `${castRight(String(split.max + 1), 8)}│${castRight(String(split.pick), 7)}│${castRight(String(split.max - split.pick + 1), 7)}`
  }

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

  return `## CASTING

\`\`\`text
${TOP}
${castLabel}
${CAST_OUTER_DIVIDER}
${nthLabel}
${CAST_INNER_DIVIDER}
${heapLabel}
${HEAP_INNER_DIVIDER}
${colLabels}
${MID}
${dataRows}
${BOTTOM}
\`\`\`
`
}

// `✕` U+2715 — matches the home banner's and viewer-core's moving-yin glyph
// so every render surface speaks one glyph vocabulary. Saved consultation
// `.md` files containing the older `×` U+00D7 character self-heal on next
// load via the history-app's byte-compare rerender.
const LINE_DIAGRAM = {
  6: '━━━ ✕ ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
} as const satisfies Record<Line, string>

const POSITION_LABELS = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（六, 6th）',
} as const

function isMovingLine(line: Line): boolean {
  return line === 6 || line === 9
}

function visualWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    const isFullwidth =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xa000 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7af) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe10 && cp <= 0xfe6f) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}

function padToColumn(text: string, targetColumn: number, minGap = 1): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

export function queryMarkdownSection(query: string): string {
  const body = query.length > 0 ? query : '_(Query not provided)_'
  return `## QUERY\n\n${body}\n`
}

const RIGHT_COLUMN = 46
const MOVING_ARROW = '─────────────────▶ '
const STATIC_GAP = '                   '

export function transformationMarkdownSection(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)
  if (movingLines.length === 0)
    return `## TRANSFORMATION\n\n_(No transformation)_\n`

  const emerging = getEmergingHexagram(hexagram)
  const { Name: standingName, Metadata: standingMetadata } =
    getHexagramRecord(hexagram)
  const { Name: emergingName, Metadata: emergingMetadata } =
    getHexagramRecord(emerging)

  const pairs = [
    [hexagram[5], emerging[5], POSITION_LABELS[6]],
    [hexagram[4], emerging[4], POSITION_LABELS[5]],
    [hexagram[3], emerging[3], POSITION_LABELS[4]],
    [hexagram[2], emerging[2], POSITION_LABELS[3]],
    [hexagram[1], emerging[1], POSITION_LABELS[2]],
    [hexagram[0], emerging[0], POSITION_LABELS[1]],
  ] as const

  const header = `${padToColumn('  Standing', RIGHT_COLUMN)}Emerging`
  const rows = pairs
    .map(([s, e, pos]) => {
      const gap = isMovingLine(s as Line) ? MOVING_ARROW : STATIC_GAP
      const left = `  ${s}  ${LINE_DIAGRAM[s as Line]}  ${pos}`
      const right = `${e}  ${LINE_DIAGRAM[e as Line]}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')
  const footer1 = `${padToColumn(
    `  #${standingMetadata.Order.WenWang} ${standingName.Chinese.Traditional}（${standingMetadata.Pronunciation.Pinyin}）`,
    RIGHT_COLUMN,
  )}#${emergingMetadata.Order.WenWang} ${emergingName.Chinese.Traditional}（${emergingMetadata.Pronunciation.Pinyin}）`
  const footer2 = `${padToColumn(`  ${standingName.English.WilhelmBaynes}`, RIGHT_COLUMN, 6)}${emergingName.English.WilhelmBaynes}`

  return `## TRANSFORMATION

\`\`\`text
${header}

${rows}

${footer1}
${footer2}
\`\`\`
`
}

function hexagramDiagramBlock(hexagram: Hexagram): string {
  const { Metadata } = getHexagramRecord(hexagram)
  const upper = getTrigramRecord(Metadata.Trigram.Upper)
  const lower = getTrigramRecord(Metadata.Trigram.Lower)
  const [l1, l2, l3, l4, l5, l6] = hexagram
  return [
    `  ${l6}  ${LINE_DIAGRAM[l6]}  ${POSITION_LABELS[6]}──┐`,
    `  ${l5}  ${LINE_DIAGRAM[l5]}  ${POSITION_LABELS[5]}──┼── ${upper.Imagery.Chinese.Traditional}（上卦）`,
    `  ${l4}  ${LINE_DIAGRAM[l4]}  ${POSITION_LABELS[4]}──┘   ${upper.Imagery.English.WilhelmBaynes} (upper trigram)`,
    `  ${l3}  ${LINE_DIAGRAM[l3]}  ${POSITION_LABELS[3]}──┐`,
    `  ${l2}  ${LINE_DIAGRAM[l2]}  ${POSITION_LABELS[2]}──┼── ${lower.Imagery.Chinese.Traditional}（下卦）`,
    `  ${l1}  ${LINE_DIAGRAM[l1]}  ${POSITION_LABELS[1]}──┘   ${lower.Imagery.English.WilhelmBaynes} (lower trigram)`,
  ].join('\n')
}

function hexagramSection(
  hexagram: Hexagram,
  label: 'EMERGING' | 'STANDING',
): string {
  const { Name, Metadata } = getHexagramRecord(hexagram)
  return `## ${label} HEXAGRAM ${Metadata.Order.WenWang}

_Line at bottom is first._

\`\`\`text
${hexagramDiagramBlock(hexagram)}
\`\`\`

_First is line at bottom._

${hexagram[0]}, ${hexagram[1]}, ${hexagram[2]}, ${hexagram[3]}, ${hexagram[4]}, ${hexagram[5]}

### Traditional Chinese

${Name.Chinese.Traditional}（${Metadata.Pronunciation.Zhuyin}）

### Simplified Chinese

${Name.Chinese.Simplified}（${Metadata.Pronunciation.Pinyin}）

### English, Wilhelm-Baynes

${Name.English.WilhelmBaynes}

### English, James Legge

${Name.English.Legge}
`
}

export function standingHexagramMarkdownSection(hexagram: Hexagram): string {
  return hexagramSection(hexagram, 'STANDING')
}

export function emergingHexagramMarkdownSection(hexagram: Hexagram): string {
  return hexagramSection(getEmergingHexagram(hexagram), 'EMERGING')
}

function isLineIndex(i: number): i is 0 | 1 | 2 | 3 | 4 | 5 {
  return i >= 0 && i <= 5
}

function linesNoMovingBlock(hexagram: Hexagram): string {
  const { Text } = getHexagramRecord(hexagram)
  return `## LINES

_No moving lines._

### Traditional Chinese

#### Scripture

${Text.Chinese.Traditional.Scripture.Hexagram}

#### Exegesis

${Text.Chinese.Traditional.Exegesis.Imagery.Hexagram}

### Simplified Chinese

#### Scripture

${Text.Chinese.Simplified.Scripture.Hexagram}

#### Exegesis

${Text.Chinese.Simplified.Exegesis.Imagery.Hexagram}

### English, Wilhelm-Baynes

#### Scripture

${Text.English.WilhelmBaynes.Scripture.Hexagram}

#### Exegesis

${Text.English.WilhelmBaynes.Exegesis.Imagery.Hexagram}

### English, James Legge

#### Scripture

${Text.English.Legge.Scripture.Hexagram}

#### Exegesis

${Text.English.Legge.Exegesis.Imagery.Hexagram}
`
}

function linesOneMovingBlock(hexagram: Hexagram): string {
  const movingIndex = hexagram.findIndex(isMovingLine)
  if (!isLineIndex(movingIndex)) return ''
  const key = `L${movingIndex + 1}` as 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  const { Text } = getHexagramRecord(hexagram)
  return `## LINES

_One moving line._

### Traditional Chinese

#### Scripture

${Text.Chinese.Traditional.Scripture.Lines[key]}

#### Exegesis

${Text.Chinese.Traditional.Exegesis.Imagery.Lines[key]}

### Simplified Chinese

#### Scripture

${Text.Chinese.Simplified.Scripture.Lines[key]}

#### Exegesis

${Text.Chinese.Simplified.Exegesis.Imagery.Lines[key]}

### English, Wilhelm-Baynes

#### Scripture

${Text.English.WilhelmBaynes.Scripture.Lines[key]}

#### Exegesis

${Text.English.WilhelmBaynes.Exegesis.Imagery.Lines[key]}

### English, James Legge

#### Scripture

${Text.English.Legge.Scripture.Lines[key]}

#### Exegesis

${Text.English.Legge.Exegesis.Imagery.Lines[key]}
`
}

function linesMultiMovingBlock(): string {
  return `## LINES

_Multiple moving lines._

No available reference scripture or exegesis for multiple moving lines.
`
}

export function linesMarkdownBlock(hexagram: Hexagram): string {
  const movingCount = hexagram.filter(isMovingLine).length
  if (movingCount === 0) return linesNoMovingBlock(hexagram)
  if (movingCount === 1) return linesOneMovingBlock(hexagram)
  return linesMultiMovingBlock()
}
