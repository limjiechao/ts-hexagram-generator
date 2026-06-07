// IR → ANSI serializers. Each function owns ONLY medium formatting: the
// viewer-core palette, the text-layout CJK width/padding helpers, and the
// ANSI-coloured ledger gutter. Geometry + glyphs + section order come from
// @hexagram/consultation-view. The byte output is locked by the casting-ui
// plain-output-*.txt + ink-sections-*.json fixtures (see the slice plan).

import {
  hexagramDiagramRowStrings,
  transformationRow,
} from '@hexagram/consultation-view/diagram-template'
import {
  CASTING_ABSENCE_LABEL,
  type CastingSection,
  type ConsultationView,
  type HexagramIdentity,
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
import {
  RIGHT_COLUMN,
  TRIGRAM_DIVIDER_WIDTH,
} from '@hexagram/consultation-view/vocabulary'
import { padToColumn } from '@hexagram/text-layout'
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

import type { ConsultationSections } from './output-composers.js'

export function serializeCastingAnsi(section: CastingSection): string {
  if (section.rows === null) {
    const why = section.absenceReason
      ? ` (${CASTING_ABSENCE_LABEL[section.absenceReason]})`
      : ''
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded${why}
`.trim()
  }

  const ansiStyle: LedgerStyle = {
    gutter: ` ${NORMAL_GREY}│${NORMAL} `,
    heading: (t) => `${HEADING_GREY}${t}${NORMAL}`,
    rule: (t) => `${NORMAL_GREY}${t}${NORMAL}`,
    dataCell: (key, text, row) => {
      switch (key) {
        case 'line':
          return `${BOLD_WHITE}${text}${NORMAL}`
        case 'cast':
        case 'stalks':
        case 'held':
        case 'setAside':
          return `${NORMAL_GREY}${text}${NORMAL}`
        case 'leftRemainder':
        case 'rightRemainder':
          return `${YELLOW}${text}${NORMAL}`
        case 'sigma':
          return row.castNumber === 3 ? `${BOLD_CYAN}${text}${NORMAL}` : text
        default:
          // leftHeap, leftPiles, rightHeap, rightPiles — bare.
          return text
      }
    },
    placeholder: (dot) => `${PLACEHOLDER_GREY}${dot}${NORMAL}`,
  }

  return `
${BOLD_GREY}CASTING:${NORMAL}

${ledgerBlock(section.rows, ansiStyle)}
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
      return transformationRow(
        s,
        e,
        (t) => `${standingColor}${t}${NORMAL}`,
        (t) => `${BOLD_WHITE}${t}${NORMAL}`,
      )
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

  const diagram = hexagramDiagramRowStrings(
    section.rows,
    id,
    (chunk, row) => `${colorOf(row.moving)}${chunk}${NORMAL}`,
  ).join('\n')

  return `
${BOLD_GREY}${label} HEXAGRAM ${section.wenWang}:

${NORMAL}(Line at bottom is first)

${diagram}

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
  // role === 'lines' — a lines:none section is markdown-only (media filtered
  // out upstream), so it never reaches here; ANSI renders that text via the
  // separate text:hexagram section.
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

// Compose the four viewer tab strings from the IR, matching the legacy
// buildConsultationSections grouping exactly: the LINES text section rides
// inside the `standing` tab string when its `media` includes 'ansi' (the
// no-moving lines:none section is markdown-only, so it is filtered out here);
// `emerging` is null when there are no moving lines.
export function serializeConsultationTabs(
  view: ConsultationView,
): ConsultationSections {
  const ss = view.sections
  const query = ss.find((s) => s.kind === 'query')! as QuerySection
  const casting = ss.find((s) => s.kind === 'casting')! as CastingSection
  const transformation = ss.find(
    (s) => s.kind === 'transformation',
  )! as TransformationSection
  const hexes = ss.filter((s) => s.kind === 'hexagram') as HexagramSection[]
  const hexTexts = ss.filter(
    (s) => s.kind === 'text' && s.role === 'hexagram',
  ) as TextSection[]
  const lines = ss.find(
    (s) => s.kind === 'text' && s.role === 'lines',
  )! as TextSection

  const standing = [
    serializeHexagramAnsi(hexes[0]!),
    serializeTextAnsi(hexTexts[0]!),
    ...(lines.media.includes('ansi') ? [serializeTextAnsi(lines)] : []),
  ]
    .join('\n\n')
    .trim()
  const emerging = view.hasMovingLines
    ? `${serializeHexagramAnsi(hexes[1]!)}\n\n${serializeTextAnsi(hexTexts[1]!)}`.trim()
    : null

  return {
    query: serializeQueryAnsi(query),
    casting: serializeCastingAnsi(casting),
    transformation: serializeTransformationAnsi(transformation),
    standing,
    emerging,
  }
}

// Plain-console projection of the IR — a straight walk of the IR's CANONICAL
// section order (query, casting, transformation, standing diagram + text,
// [emerging diagram + text], LINES). LINES is last, matching the Ink `standing`
// tab grouping and the saved `.md` body. This is the slice's one sanctioned
// behaviour change: the legacy plain output emitted LINES *before* the emerging
// block; harmonizing it here makes every surface speak one order.
export function serializeConsoleOutput(view: ConsultationView): string {
  const parts: string[] = []
  for (const s of view.sections) {
    if (!s.media.includes('ansi')) continue
    switch (s.kind) {
      case 'query':
        parts.push(serializeQueryAnsi(s))
        break
      case 'casting':
        parts.push(serializeCastingAnsi(s))
        break
      case 'transformation':
        parts.push(serializeTransformationAnsi(s))
        break
      case 'hexagram':
        parts.push(serializeHexagramAnsi(s))
        break
      case 'text':
        parts.push(serializeTextAnsi(s))
        break
    }
  }
  return `\n\n${parts.join('\n\n')}\n`
}
