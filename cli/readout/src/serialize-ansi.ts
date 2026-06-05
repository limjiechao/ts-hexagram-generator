// IR → ANSI serializers. Each function owns ONLY medium formatting: the
// viewer-core palette, the text-layout CJK width/padding helpers, and the
// ANSI-coloured ledger gutter. Geometry + glyphs + section order come from
// @hexagram/consultation-view. The byte output is locked by the casting-ui
// plain-output-*.txt + ink-sections-*.json fixtures (see the slice plan).

import {
  type CastingSection,
  type HexagramIdentity,
  type HexagramSection,
  LEDGER_COLUMNS,
  type LedgerRow,
  LINE_GLYPH,
  LINE_LABELS,
  MOVING_ARROW,
  POSITION_LABELS,
  type QuerySection,
  RIGHT_COLUMN,
  STATIC_GAP,
  type TextSection,
  type TextVariant,
  type TransformationSection,
  TRIGRAM_DIVIDER_WIDTH,
} from '@hexagram/consultation-view'
import { centerVisual, padStartVisual, padToColumn } from '@hexagram/text-layout'
import {
  BOLD_CYAN,
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  HEADING_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
  YELLOW,
} from '@hexagram/viewer-core'

const LEDGER_INDENT = '   '
// The inter-cell gutter `│` is painted NORMAL_GREY (matching the rule rows) so
// the whole table reads as one grey grid; the flanking spaces stay uncoloured
// and the ANSI codes are zero-width, so the gutter is exactly 3 visual columns.
const LEDGER_GUTTER = ` ${NORMAL_GREY}│${NORMAL} `

const colWidth = (key: string): number =>
  LEDGER_COLUMNS.find((c) => c.key === key)!.width

export function serializeCastingAnsi(section: CastingSection): string {
  if (section.rows === null)
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded
`.trim()

  const blank = (key: string): string => ' '.repeat(colWidth(key))

  // Banner row: the 左Left / 右Right banners each span their sub-columns plus
  // the interior 3-col gutters between them.
  const leftSpan =
    colWidth('leftHeap') + 3 + colWidth('leftPiles') + 3 + colWidth('leftRemainder')
  const rightSpan =
    colWidth('rightHeap') +
    3 +
    colWidth('rightPiles') +
    3 +
    colWidth('held') +
    3 +
    colWidth('rightRemainder')
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

  const dataRow = (row: LedgerRow): string => {
    const lineCell = row.showLine ? LINE_LABELS[row.lineNumber] : ''
    const cells: string[] = [
      `${BOLD_WHITE}${padStartVisual(lineCell, colWidth('line'))}${NORMAL}`,
      `${NORMAL_GREY}${padStartVisual(String(row.castNumber), colWidth('cast'))}${NORMAL}`,
    ]
    if (row.cell === null) {
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
          `${PLACEHOLDER_GREY}${padStartVisual('·', colWidth(key))}${NORMAL}`,
        )
    } else {
      const d = row.cell
      const plain = (value: number, key: string): string =>
        padStartVisual(String(value), colWidth(key))
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
        row.castNumber === 3
          ? `${BOLD_CYAN}${padStartVisual(`⇒ ${d.combinedPiles}`, colWidth('sigma'))}${NORMAL}`
          : padStartVisual(String(d.combinedPiles), colWidth('sigma')),
      )
    }
    return LEDGER_INDENT + cells.join(LEDGER_GUTTER)
  }

  const body = section.rows
    .map((row) => (row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row)))
    .join('\n')

  return `
${BOLD_GREY}CASTING:${NORMAL}

${bannerRow}
${headerRow}
${headerRule}
${body}
`.trim()
}

export function serializeQueryAnsi(s: QuerySection): string {
  return `${BOLD_GREY}QUERY:

  ${BOLD_WHITE}${s.query || '(Query not provided)'}`
}

// One trigram identity-stack cell: `Upper: 名 Pinyin (English)` — reads the
// NAME-based fields (Chinese name + capitalized pinyin + capitalized English
// imagery) the transformation footer shares with the playground identity stack.
const trigramIdentityCell = (
  position: 'Upper' | 'Lower',
  id: HexagramIdentity,
): string =>
  position === 'Upper'
    ? `Upper: ${id.upperTrigramChinese} ${id.upperTrigramPinyin} (${id.upperTrigramEnglish})`
    : `Lower: ${id.lowerTrigramChinese} ${id.lowerTrigramPinyin} (${id.lowerTrigramEnglish})`

export function serializeTransformationAnsi(
  section: TransformationSection,
): string {
  if (section.body === null)
    return `
${BOLD_GREY}TRANSFORMATION:
${NORMAL}(No transformation)
`.trim()

  const { rows, standing, emerging } = section.body

  const headerLine =
    `${BOLD_GREY}${padToColumn('  Standing Hexagram', RIGHT_COLUMN)}${NORMAL}` +
    `${BOLD_GREY}Emerging Hexagram${NORMAL}`

  const lineRows = rows
    .map(({ standing: s, emerging: e }) => {
      const standingColor = s.moving ? BOLD_RED : BOLD_WHITE
      const gap = s.moving ? MOVING_ARROW : STATIC_GAP
      const pos = POSITION_LABELS[s.position]
      const left = `  ${standingColor}${s.line}${NORMAL}  ${standingColor}${LINE_GLYPH[s.line]}${NORMAL}  ${pos}`
      const right = `${BOLD_WHITE}${e.line}${NORMAL}  ${BOLD_WHITE}${LINE_GLYPH[e.line]}${NORMAL}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')

  const standingFooter1 = `  #${standing.wenWang} ${standing.chineseTraditional}（${standing.pinyin}）`
  const emergingFooter1 = `#${emerging.wenWang} ${emerging.chineseTraditional}（${emerging.pinyin}）`
  const footer1 = `${BOLD_WHITE}${padToColumn(standingFooter1, RIGHT_COLUMN)}${emergingFooter1}${NORMAL}`

  const standingFooter2 = `  ${standing.englishWilhelmBaynes}`
  const emergingFooter2 = emerging.englishWilhelmBaynes
  const footer2 = `${NORMAL_GREY}${padToColumn(standingFooter2, RIGHT_COLUMN, 6)}${emergingFooter2}${NORMAL}`

  const dashes = '─'.repeat(TRIGRAM_DIVIDER_WIDTH)
  const dividerRow = `${NORMAL_GREY}${padToColumn(`  ${dashes}`, RIGHT_COLUMN)}${dashes}${NORMAL}`

  const trigramRow = (position: 'Upper' | 'Lower'): string => {
    const left = `  ${trigramIdentityCell(position, standing)}`
    const right = trigramIdentityCell(position, emerging)
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

export function serializeHexagramAnsi(section: HexagramSection): string {
  const label = section.role === 'standing' ? 'STANDING' : 'EMERGING'
  const id = section.identity
  const colorOf = (moving: boolean): string =>
    section.role === 'standing' && moving ? BOLD_RED : BOLD_WHITE
  // rows are top-first: [pos6, pos5, pos4, pos3, pos2, pos1].
  const [r6, r5, r4, r3, r2, r1] = section.rows

  return `
${BOLD_GREY}${label} HEXAGRAM ${section.wenWang}:

${NORMAL}(Line at bottom is first)

  ${colorOf(r6!.moving)}${r6!.line}  ${LINE_GLYPH[r6!.line]}  ${NORMAL}${POSITION_LABELS[6]}──┐
  ${colorOf(r5!.moving)}${r5!.line}  ${LINE_GLYPH[r5!.line]}  ${NORMAL}${POSITION_LABELS[5]}──┼── ${id.upperTrigramImageryChinese}（上卦）
  ${colorOf(r4!.moving)}${r4!.line}  ${LINE_GLYPH[r4!.line]}  ${NORMAL}${POSITION_LABELS[4]}──┘   ${id.upperTrigramImageryEnglish} (upper trigram)
  ${colorOf(r3!.moving)}${r3!.line}  ${LINE_GLYPH[r3!.line]}  ${NORMAL}${POSITION_LABELS[3]}──┐
  ${colorOf(r2!.moving)}${r2!.line}  ${LINE_GLYPH[r2!.line]}  ${NORMAL}${POSITION_LABELS[2]}──┼── ${id.lowerTrigramImageryChinese}（下卦）
  ${colorOf(r1!.moving)}${r1!.line}  ${LINE_GLYPH[r1!.line]}  ${NORMAL}${POSITION_LABELS[1]}──┘   ${id.lowerTrigramImageryEnglish} (lower trigram)

${NORMAL}(First is line at bottom)

  ${colorOf(r1!.moving)}${r1!.line}, ${colorOf(r2!.moving)}${r2!.line}, ${colorOf(r3!.moving)}${r3!.line}, ${colorOf(r4!.moving)}${r4!.line}, ${colorOf(r5!.moving)}${r5!.line}, ${colorOf(r6!.moving)}${r6!.line}

${BOLD_GREY}${label} HEXAGRAM NAME AND PRONUNCIATION:

${NORMAL_GREY}[Traditional Chinese]

  ${BOLD_WHITE}${id.chineseTraditional}（${id.zhuyin}）

${NORMAL_GREY}[Simplified Chinese]

  ${BOLD_WHITE}${id.chineseSimplified}（${id.pinyin}）

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${BOLD_WHITE}${id.englishWilhelmBaynes}

${NORMAL_GREY}[English, James Legge]

  ${BOLD_WHITE}${id.englishLegge}
`
}

// One language block of a text section. The Wilhelm-Baynes variant indents
// embedded newlines by two spaces (`\n  `) — an ANSI-only quirk applied to
// that variant alone; Chinese + Legge are left raw.
function textVariantBlockAnsi(v: TextVariant): string {
  const indent = (s: string): string =>
    v.language === 'English, Wilhelm-Baynes' ? s.replaceAll('\n', '\n  ') : s
  return `${NORMAL_GREY}[${v.language}]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${indent(v.scripture)}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${indent(v.exegesis)}`
}

export function serializeTextAnsi(section: TextSection): string {
  if (section.role === 'hexagram') {
    return `${BOLD_GREY}HEXAGRAM:
${section.variants.map(textVariantBlockAnsi).join('\n\n')}`
  }
  // role === 'lines'
  if (section.variant === 'none') return ''
  if (section.variant === 'multi')
    return `${BOLD_GREY}LINES:

${NORMAL}(Multiple moving lines)

${BOLD_WHITE}No available reference scripture or exegesis for multiple moving lines.
${NORMAL}
`
  // variant === 'one'
  return `${BOLD_GREY}LINES:
${NORMAL}(One moving line)

${section.variants.map(textVariantBlockAnsi).join('\n\n')}`
}
