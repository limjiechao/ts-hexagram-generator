// IR → Markdown serializers. Each owns ONLY Markdown formatting (the `text`
// fences, the `##`/`###`/`####` headings, the ` │ ` gutter — no ANSI). Geometry
// + glyphs + section order come from @hexagram/consultation-view; width math
// from @hexagram/text-layout. The byte output is locked by the consultation-file
// md-body-*.md / md-file-*.md fixtures.
//
// Body projection: markdown emits every section whose `media` includes
// 'markdown'. Hexagram-level text is ANSI-only (`text:hexagram`, media=['ansi'])
// because markdown folds that scripture into the trailing LINES block via the
// no-moving `lines:none` section (media=['markdown']). The result is query,
// casting, transformation, standing diagram, [emerging diagram], LINES — exactly
// the legacy markdownConsultationBody order.

import { sectionsForMedium } from '@hexagram/consultation-view/build-view'
import {
  hexagramDiagramRowStrings,
  transformationRow,
} from '@hexagram/consultation-view/diagram-template'
import {
  CASTING_ABSENCE_LABEL,
  type CastingSection,
  type ConsultationView,
  type HexagramSection,
  type QuerySection,
  type TextSection,
  type TextVariant,
  type TransformationSection,
} from '@hexagram/consultation-view/ir'
import {
  ledgerBlock,
  type LedgerStyle,
} from '@hexagram/consultation-view/ledger-template'
import { RIGHT_COLUMN } from '@hexagram/consultation-view/vocabulary'
import { padToColumn } from '@hexagram/text-layout'

export function serializeCastingMarkdown(section: CastingSection): string {
  if (section.rows === null) {
    const why = section.absenceReason
      ? ` (${CASTING_ABSENCE_LABEL[section.absenceReason]})`
      : ''
    return `## CASTING\n\n_Casting not recorded${why}._\n`
  }

  const markdownStyle: LedgerStyle = {
    gutter: ' │ ',
    heading: (t) => t,
    rule: (t) => t,
    dataCell: (_key, text) => text,
    placeholder: () => {
      // Markdown is only ever rendered from a full CastingRecord, so a null
      // cell is a programmer error — the same invariant the old guard asserted.
      throw new Error('markdown casting expects a full record')
    },
  }

  return `## CASTING

\`\`\`text
${ledgerBlock(section.rows, markdownStyle)}
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
// the legacy `parts.join('\n')`). Sections are filtered by their `media` flag:
// only `text:lines` reaches the `text` case (hexagram-level text is ANSI-only
// and markdown folds it into the trailing LINES block).
// Visibility is owned upstream — see the section→medium matrix above
// buildConsultationView in @hexagram/consultation-view.
export function serializeConsultationMarkdownBody(
  view: ConsultationView,
): string {
  const parts: string[] = []
  for (const s of sectionsForMedium(view, 'markdown')) {
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
        parts.push(serializeLinesMarkdown(s))
        break
    }
  }
  return parts.join('\n')
}
