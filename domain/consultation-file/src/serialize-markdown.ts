// IR → Markdown serializers. Each owns ONLY Markdown formatting (the `text`
// fences, the `##`/`###`/`####` headings, the ` │ ` gutter — no ANSI). Geometry
// + glyphs + section order come from @hexagram/consultation-view; width math
// from @hexagram/text-layout. The byte output is locked by the consultation-file
// md-body-*.md / md-file-*.md fixtures.
//
// Body projection: markdown folds the hexagram-level scripture into the trailing
// LINES block (no-moving case) and never emits a standalone hexagram-text
// section, so serializeConsultationMarkdownBody SKIPS the IR's `text:hexagram`
// sections and renders query, casting, transformation, standing diagram,
// [emerging diagram], LINES — exactly the legacy markdownConsultationBody order.

import {
  hexagramDiagramRowStrings,
  LEDGER_COLUMNS,
  LINE_LABELS,
  RIGHT_COLUMN,
  transformationRow,
  type CastingSection,
  type ConsultationView,
  type HexagramSection,
  type LedgerRow,
  type QuerySection,
  type TextSection,
  type TextVariant,
  type TransformationSection,
} from '@hexagram/consultation-view'
import {
  centerVisual,
  padStartVisual,
  padToColumn,
} from '@hexagram/text-layout'

const LEDGER_INDENT = '   '
const LEDGER_GUTTER = ' │ '

const colWidth = (key: string): number =>
  LEDGER_COLUMNS.find((c) => c.key === key)!.width

export function serializeCastingMarkdown(section: CastingSection): string {
  if (section.rows === null) return `## CASTING\n\n_Casting not recorded._\n`

  const blank = (key: string): string => ' '.repeat(colWidth(key))

  const leftSpan =
    colWidth('leftHeap') +
    3 +
    colWidth('leftPiles') +
    3 +
    colWidth('leftRemainder')
  const rightSpan =
    colWidth('rightHeap') +
    3 +
    colWidth('rightPiles') +
    3 +
    colWidth('held') +
    3 +
    colWidth('rightRemainder')
  const bannerRow =
    LEDGER_INDENT +
    [blank('line'), blank('cast'), blank('stalks')].join(LEDGER_GUTTER) +
    LEDGER_GUTTER +
    centerVisual('左Left', leftSpan) +
    LEDGER_GUTTER +
    centerVisual('右Right', rightSpan) +
    LEDGER_GUTTER +
    [blank('setAside'), blank('sigma')].join(LEDGER_GUTTER)

  const headerRow =
    LEDGER_INDENT +
    LEDGER_COLUMNS.map((c) => padStartVisual(c.header, c.width)).join(
      LEDGER_GUTTER,
    )
  const headerRule =
    LEDGER_INDENT + LEDGER_COLUMNS.map((c) => '═'.repeat(c.width)).join('═╪═')
  const blockRule =
    LEDGER_INDENT + LEDGER_COLUMNS.map((c) => '─'.repeat(c.width)).join('─┼─')

  const dataRow = (row: LedgerRow): string => {
    const d = row.cell
    // Markdown is only ever rendered from a full CastingRecord (or null above),
    // so every cell is a DerivedSplit; the guard documents that invariant.
    if (d === null) throw new Error('markdown casting expects a full record')
    const plain = (value: number, key: string): string =>
      padStartVisual(String(value), colWidth(key))
    return (
      LEDGER_INDENT +
      [
        padStartVisual(
          row.showLine ? LINE_LABELS[row.lineNumber] : '',
          colWidth('line'),
        ),
        plain(row.castNumber, 'cast'),
        plain(d.stalks, 'stalks'),
        plain(d.leftHeap, 'leftHeap'),
        plain(d.leftPiles, 'leftPiles'),
        plain(d.leftRemainder, 'leftRemainder'),
        plain(d.rightHeap, 'rightHeap'),
        plain(d.rightPiles, 'rightPiles'),
        plain(d.held, 'held'),
        plain(d.rightRemainder, 'rightRemainder'),
        plain(d.setAside, 'setAside'),
        row.castNumber === 3
          ? padStartVisual(`⇒ ${d.combinedPiles}`, colWidth('sigma'))
          : padStartVisual(String(d.combinedPiles), colWidth('sigma')),
      ].join(LEDGER_GUTTER)
    )
  }

  const body = section.rows
    .map((row) =>
      row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row),
    )
    .join('\n')

  return `## CASTING

\`\`\`text
${bannerRow}
${headerRow}
${headerRule}
${body}
\`\`\`
`
}

export function serializeQueryMarkdown(s: QuerySection): string {
  const body = s.query.length > 0 ? s.query : '_(Query not provided)_'
  return `## QUERY\n\n${body}\n`
}

export function serializeTransformationMarkdown(
  section: TransformationSection,
): string {
  if (section.body === null)
    return `## TRANSFORMATION\n\n_(No transformation)_\n`

  const { rows, standing, emerging } = section.body

  const header = `${padToColumn('  Standing', RIGHT_COLUMN)}Emerging`
  const lineRows = rows
    .map(({ standing: s, emerging: e }) =>
      transformationRow(
        s,
        e,
        (t) => t,
        (t) => t,
      ),
    )
    .join('\n')
  const footer1 = `${padToColumn(
    `  #${standing.wenWang} ${standing.chineseTraditional}（${standing.pinyin}）`,
    RIGHT_COLUMN,
  )}#${emerging.wenWang} ${emerging.chineseTraditional}（${emerging.pinyin}）`
  const footer2 = `${padToColumn(`  ${standing.englishWilhelmBaynes}`, RIGHT_COLUMN, 6)}${emerging.englishWilhelmBaynes}`

  return `## TRANSFORMATION

\`\`\`text
${header}

${lineRows}

${footer1}
${footer2}
\`\`\`
`
}

function hexagramDiagramBlockMarkdown(section: HexagramSection): string {
  return hexagramDiagramRowStrings(
    section.rows,
    section.identity,
    (chunk) => chunk,
  ).join('\n')
}

export function serializeHexagramMarkdown(section: HexagramSection): string {
  const label = section.role === 'standing' ? 'STANDING' : 'EMERGING'
  const id = section.identity
  const [r6, r5, r4, r3, r2, r1] = section.rows
  return `## ${label} HEXAGRAM ${section.wenWang}

_Line at bottom is first._

\`\`\`text
${hexagramDiagramBlockMarkdown(section)}
\`\`\`

_First is line at bottom._

${r1!.line}, ${r2!.line}, ${r3!.line}, ${r4!.line}, ${r5!.line}, ${r6!.line}

### Traditional Chinese

${id.chineseTraditional}（${id.zhuyin}）

### Simplified Chinese

${id.chineseSimplified}（${id.pinyin}）

### English, Wilhelm-Baynes

${id.englishWilhelmBaynes}

### English, James Legge

${id.englishLegge}
`
}

function linesVariantBlockMarkdown(v: TextVariant): string {
  return `### ${v.language}

#### Scripture

${v.scripture}

#### Exegesis

${v.exegesis}`
}

export function serializeLinesMarkdown(section: TextSection): string {
  if (section.variant === 'multi')
    return `## LINES

_Multiple moving lines._

No available reference scripture or exegesis for multiple moving lines.
`
  const caption =
    section.variant === 'none' ? '_No moving lines._' : '_One moving line._'
  const blocks = section.variants.map(linesVariantBlockMarkdown).join('\n\n')
  return `## LINES

${caption}

${blocks}
`
}

// Compose the Markdown body from the IR, joining sections with '\n' (matching
// the legacy `parts.join('\n')`). The `text:hexagram` sections are skipped —
// markdown folds hexagram-level text into the trailing LINES block.
export function serializeConsultationMarkdownBody(
  view: ConsultationView,
): string {
  const parts: string[] = []
  for (const s of view.sections) {
    switch (s.kind) {
      case 'query':
        parts.push(serializeQueryMarkdown(s))
        break
      case 'casting':
        parts.push(serializeCastingMarkdown(s))
        break
      case 'transformation':
        parts.push(serializeTransformationMarkdown(s))
        break
      case 'hexagram':
        parts.push(serializeHexagramMarkdown(s))
        break
      case 'text':
        if (s.role === 'lines') parts.push(serializeLinesMarkdown(s))
        break
    }
  }
  return parts.join('\n')
}
