import { deriveSplit } from '@hexagram/core/casting-derivation'
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
} from '@hexagram/core/types'
import {
  assertLine1ToLine6,
  BOLD_CYAN,
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  HEADING_GREY,
  isLineIndex,
  isMovingLine,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
  YELLOW,
} from '@hexagram/viewer-core'

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
// position labels like （上, 6th）: （(2) + CJK(2) + ", "(2) + "6th"(3) + ）(2) = 11 cols
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
  6: '（上, 6th）',
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

/** Right-align `text` within `width` visual columns (CJK-aware). */
function padStartVisual(text: string, width: number): string {
  return ' '.repeat(Math.max(0, width - visualWidth(text))) + text
}

/** Centre `text` within `width` visual columns (CJK-aware). */
function centerVisual(text: string, width: number): string {
  const total = Math.max(0, width - visualWidth(text))
  const left = Math.floor(total / 2)
  return ' '.repeat(left) + text + ' '.repeat(total - left)
}

// I-Ching line labels: the classical ordinal glyph (初 for line 1, 上 for
// line 6, else 二..五) fused with the Arabic line number, mirroring the
// diagram sections' position labels (初/二/三/四/五/上). `上6` is 3 visual
// columns — well inside the `爻Line` column's width of 6.
const LINE_LABELS = {
  1: '初1',
  2: '二2',
  3: '三3',
  4: '四4',
  5: '五5',
  6: '上6',
} as const

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

// Column layout for the enumerated casting ledger. Eighteen rows (6 lines × 3
// casts) each carry twelve right-aligned cells joined by a ` │ ` gutter under a
// two-level header: the `左Left` / `右Right` banners span their sub-columns.
// Every field is derived from one `SplitRecord {pick, max}` via `deriveSplit`;
// no algorithm or `CastingRecord` change is needed. Header names fuse plain
// English with classical glosses, compact (no space after the glyph) so the
// content fits the 120-col default wrap — 111 visual columns.
const LEDGER_COLUMNS = [
  { key: 'line', header: '爻Line', width: 6 },
  { key: 'cast', header: '變Cast', width: 6 },
  { key: 'stalks', header: '蓍Stalks', width: 8 },
  { key: 'leftHeap', header: '左Heap', width: 6 },
  { key: 'leftPiles', header: '揲Fours', width: 7 },
  { key: 'leftRemainder', header: '扐Odd', width: 5 },
  { key: 'rightHeap', header: '右Heap', width: 6 },
  { key: 'rightPiles', header: '揲Fours', width: 7 },
  { key: 'held', header: '掛Held', width: 6 },
  { key: 'rightRemainder', header: '扐Odd', width: 5 },
  { key: 'setAside', header: '歸奇Aside', width: 9 },
  { key: 'sigma', header: '營Tally', width: 7 },
] as const

const LEDGER_INDENT = '   '
// The inter-cell gutter `│` is painted the same NORMAL_GREY as the `═╪═` /
// `─┼─` rule rows so every border in the table reads as one uniform grey
// grid. The flanking spaces stay uncoloured (invisible) and the ANSI codes
// are zero-width, so the gutter is still exactly 3 visual columns — the `+ 3`
// span arithmetic in the banner row is unaffected.
const LEDGER_GUTTER = ` ${NORMAL_GREY}│${NORMAL} `

// ── Casting-table row geometry ────────────────────────────────────────────
// Single source for the Casting tab's content-row layout (the string
// castingSection returns, before the readout prepends its scroll breather).
// Top-first: a 5-row header, then six 4-row line blocks (line 6 on top, line 1
// at the bottom); the last block omits its trailing rule. The readout's
// auto-follow scroll pins a line's cast-1 (block-bottom) row near the viewport
// bottom using these constants; a consistency test asserts they still describe
// castingSection's output. Keep them in lockstep with the bannerRow / headerRow
// / headerRule / body assembly below.
export const CASTING_HEADER_ROWS = 5 // "CASTING:", blank, banner, header, rule
export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, measured from the block top

/**
 * Content-row index (0-based, pre-breather) of the cast-1 / block-bottom row
 * for the given hexagram line. `lineIndex` 0 => line 1 (bottom, row 27); 5 =>
 * line 6 (top, row 7). Consumed by the viewer to drive auto-follow scroll.
 */
export function castingTableActiveRow(lineIndex: number): number {
  const blockTop =
    CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
  return blockTop + CAST1_OFFSET_IN_BLOCK
}

/**
 * Content-row the auto-follow scroll seats near the viewport bottom while
 * casting `lineIndex`. Anchors the *just-completed* line (`lineIndex - 1`)
 * rather than the active line, so when the third cast commits — filling that
 * cell and advancing the line pointer in one update — the line the user just
 * finished stays pinned at the bottom instead of scrolling off before its
 * result is seen. Line 1 (`lineIndex` 0) has no predecessor, so it anchors
 * itself; the pin therefore only moves on the *next* line transition.
 */
export function castingTableFollowRow(lineIndex: number): number {
  return castingTableActiveRow(Math.max(0, lineIndex - 1))
}

// Accepts a `PartialCastingRecord` so the same renderer is reused while the
// interactive viewer is still collecting casts: a `null` split renders its ten
// derived cells as width-stable `·` placeholders (the structural 爻Line / 變Cast
// cells still print), so column boundaries never shift as cells fill in.
// `CastingRecord` is a structural subtype, so fully-populated callers render the
// final table. A `null` casting (e.g. one migrated from a pre-CASTING legacy
// `.txt`) renders a "Casting not recorded" caption instead of the table.
export function castingSection(casting: PartialCastingRecord | null): string {
  if (casting === null)
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded
`.trim()

  const width = (key: string): number =>
    LEDGER_COLUMNS.find((c) => c.key === key)!.width
  const blank = (key: string): string => ' '.repeat(width(key))

  // Banner row: the 左Left / 右Right banners each span their sub-columns plus
  // the interior 3-col gutters between them.
  const leftSpan =
    width('leftHeap') + 3 + width('leftPiles') + 3 + width('leftRemainder')
  const rightSpan =
    width('rightHeap') +
    3 +
    width('rightPiles') +
    3 +
    width('held') +
    3 +
    width('rightRemainder')
  const bannerRow = `${
    LEDGER_INDENT +
    [blank('line'), blank('cast'), blank('stalks')].join(LEDGER_GUTTER) +
    LEDGER_GUTTER
  }${HEADING_GREY}${centerVisual('左Left', leftSpan)}${NORMAL}${
    LEDGER_GUTTER
  }${HEADING_GREY}${centerVisual('右Right', rightSpan)}${NORMAL}${
    LEDGER_GUTTER
  }${[blank('setAside'), blank('sigma')].join(LEDGER_GUTTER)}`

  const headerRow =
    LEDGER_INDENT +
    LEDGER_COLUMNS.map(
      (c) => `${HEADING_GREY}${padStartVisual(c.header, c.width)}${NORMAL}`,
    ).join(LEDGER_GUTTER)

  const headerRule = `${
    LEDGER_INDENT
  }${NORMAL_GREY}${LEDGER_COLUMNS.map((c) => '═'.repeat(c.width)).join('═╪═')}${NORMAL}`
  const blockRule = `${
    LEDGER_INDENT
  }${NORMAL_GREY}${LEDGER_COLUMNS.map((c) => '─'.repeat(c.width)).join('─┼─')}${NORMAL}`

  const dataRow = (
    lineNumber: 1 | 2 | 3 | 4 | 5 | 6,
    castNumber: 1 | 2 | 3,
    split: PartialSplitRecord,
    showLine: boolean,
  ): string => {
    const lineCell = showLine ? LINE_LABELS[lineNumber] : ''
    const cells: string[] = [
      `${BOLD_WHITE}${padStartVisual(lineCell, width('line'))}${NORMAL}`,
      `${NORMAL_GREY}${padStartVisual(String(castNumber), width('cast'))}${NORMAL}`,
    ]
    if (split === null) {
      for (const key of [
        'stalks',
        'leftHeap',
        'leftPiles',
        'leftRemainder',
        'rightHeap',
        'rightPiles',
        'held',
        'rightRemainder',
        'setAside',
        'sigma',
      ])
        cells.push(
          `${PLACEHOLDER_GREY}${padStartVisual('·', width(key))}${NORMAL}`,
        )
    } else {
      const d = deriveSplit(split)
      const plain = (value: number, key: string): string =>
        padStartVisual(String(value), width(key))
      cells.push(
        `${NORMAL_GREY}${plain(d.stalks, 'stalks')}${NORMAL}`,
        plain(d.leftHeap, 'leftHeap'),
        plain(d.leftPiles, 'leftPiles'),
        `${YELLOW}${plain(d.leftRemainder, 'leftRemainder')}${NORMAL}`,
        plain(d.rightHeap, 'rightHeap'),
        plain(d.rightPiles, 'rightPiles'),
        `${NORMAL_GREY}${plain(d.held, 'held')}${NORMAL}`,
        `${YELLOW}${plain(d.rightRemainder, 'rightRemainder')}${NORMAL}`,
        `${NORMAL_GREY}${plain(d.setAside, 'setAside')}${NORMAL}`,
        castNumber === 3
          ? `${BOLD_CYAN}${padStartVisual(`⇒ ${d.combinedPiles}`, width('sigma'))}${NORMAL}`
          : padStartVisual(String(d.combinedPiles), width('sigma')),
      )
    }
    return LEDGER_INDENT + cells.join(LEDGER_GUTTER)
  }

  // Lines top→bottom are 6→1 (matching the diagram sections). Within each block
  // casts are reversed — cast 3 (the resolving cast, carrying `⇒ N`) on top,
  // cast 1 (`蓍Stalks` = 49) at the bottom. The line label prints only on the
  // block's top (cast-3) row. Index with tuple-positioned literals so TS proves
  // each access in-bounds and `lineNumber` is a 1..6 literal.
  const lineOrder = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const

  const body = lineOrder
    .map(([lineNumber, lineCasting], blockIndex) => {
      const [cast1, cast2, cast3] = lineCasting
      const rows = [
        dataRow(lineNumber, 3, cast3, true),
        dataRow(lineNumber, 2, cast2, false),
        dataRow(lineNumber, 1, cast1, false),
      ]
      return blockIndex < lineOrder.length - 1
        ? [...rows, blockRule].join('\n')
        : rows.join('\n')
    })
    .join('\n')

  return `
${BOLD_GREY}CASTING:${NORMAL}

${bannerRow}
${headerRow}
${headerRule}
${body}
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
