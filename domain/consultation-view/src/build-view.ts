import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import {
  getEmergingHexagram,
  hasMovingLines,
  isMovingLine,
} from '@hexagram/core/line-semantics'
import {
  isLineIndex,
  POSITIONS_TOP_FIRST,
  type CastingAbsenceReason,
  type Hexagram,
  type PartialCastingRecord,
} from '@hexagram/core/types'

import type {
  ConsultationSection,
  ConsultationView,
  DiagramLineRow,
  HexagramIdentity,
  TextSection,
  TextVariant,
} from './ir.js'
import { buildLedgerRows } from './ledger-geometry.js'

function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : `${text[0]!.toUpperCase()}${text.slice(1)}`
}

function identityOf(hexagram: Hexagram): HexagramIdentity {
  const { Name, Metadata } = getHexagramRecord(hexagram)
  const upper = getTrigramRecord(Metadata.Trigram.Upper)
  const lower = getTrigramRecord(Metadata.Trigram.Lower)
  return {
    wenWang: String(Metadata.Order.WenWang),
    chineseTraditional: String(Name.Chinese.Traditional),
    chineseSimplified: String(Name.Chinese.Simplified),
    zhuyin: String(Metadata.Pronunciation.Zhuyin),
    pinyin: String(Metadata.Pronunciation.Pinyin),
    englishWilhelmBaynes: String(Name.English.WilhelmBaynes),
    englishLegge: String(Name.English.Legge),
    // Identity-stack fields: trigram NAME (Chinese) + capitalized pinyin +
    // capitalized English imagery — exactly what the transformation footer and
    // the playground identity stack render.
    upperTrigramChinese: String(upper.Name.Chinese.Traditional),
    upperTrigramEnglish: capitalizeFirst(
      String(upper.Imagery.English.WilhelmBaynes),
    ),
    lowerTrigramChinese: String(lower.Name.Chinese.Traditional),
    lowerTrigramEnglish: capitalizeFirst(
      String(lower.Imagery.English.WilhelmBaynes),
    ),
    upperTrigramPinyin: capitalizeFirst(
      String(upper.Metadata.Pronunciation.Pinyin),
    ),
    lowerTrigramPinyin: capitalizeFirst(
      String(lower.Metadata.Pronunciation.Pinyin),
    ),
    // Diagram-brace fields: trigram IMAGERY (Chinese) + RAW English imagery —
    // what the hexagram-section `（上卦）` / `（下卦）` braces render.
    upperTrigramImageryChinese: String(upper.Imagery.Chinese.Traditional),
    upperTrigramImageryEnglish: String(upper.Imagery.English.WilhelmBaynes),
    lowerTrigramImageryChinese: String(lower.Imagery.Chinese.Traditional),
    lowerTrigramImageryEnglish: String(lower.Imagery.English.WilhelmBaynes),
  }
}

function diagramRows(
  hexagram: Hexagram,
  movingFrom: Hexagram = hexagram,
): readonly DiagramLineRow[] {
  // Top-first (line 6 → line 1) to match every diagram section.
  return POSITIONS_TOP_FIRST.map((position) => {
    const index = position - 1
    return {
      line: hexagram[index]!,
      position,
      moving: isMovingLine(movingFrom[index]!),
    }
  })
}

// Hexagram-level four-variant text, copied field-for-field from
// `hexagramTextSection`. Imagery comes from `Exegesis.Imagery.Hexagram`.
function hexagramTextVariants(hexagram: Hexagram): readonly TextVariant[] {
  const { Text } = getHexagramRecord(hexagram)
  return [
    {
      language: 'Traditional Chinese',
      scripture: Text.Chinese.Traditional.Scripture.Hexagram,
      exegesis: Text.Chinese.Traditional.Exegesis.Imagery.Hexagram,
    },
    {
      language: 'Simplified Chinese',
      scripture: Text.Chinese.Simplified.Scripture.Hexagram,
      exegesis: Text.Chinese.Simplified.Exegesis.Imagery.Hexagram,
    },
    {
      language: 'English, Wilhelm-Baynes',
      scripture: Text.English.WilhelmBaynes.Scripture.Hexagram,
      exegesis: Text.English.WilhelmBaynes.Exegesis.Imagery.Hexagram,
    },
    {
      language: 'English, James Legge',
      scripture: Text.English.Legge.Scripture.Hexagram,
      exegesis: Text.English.Legge.Exegesis.Imagery.Hexagram,
    },
  ]
}

function oneMovingLineVariants(hexagram: Hexagram): readonly TextVariant[] {
  const movingIndex = hexagram.findIndex(isMovingLine)
  if (!isLineIndex(movingIndex)) return []
  const key = `L${movingIndex + 1}` as 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  const { Text } = getHexagramRecord(hexagram)
  return [
    {
      language: 'Traditional Chinese',
      scripture: Text.Chinese.Traditional.Scripture.Lines[key],
      exegesis: Text.Chinese.Traditional.Exegesis.Imagery.Lines[key],
    },
    {
      language: 'Simplified Chinese',
      scripture: Text.Chinese.Simplified.Scripture.Lines[key],
      exegesis: Text.Chinese.Simplified.Exegesis.Imagery.Lines[key],
    },
    {
      language: 'English, Wilhelm-Baynes',
      scripture: Text.English.WilhelmBaynes.Scripture.Lines[key],
      exegesis: Text.English.WilhelmBaynes.Exegesis.Imagery.Lines[key],
    },
    {
      language: 'English, James Legge',
      scripture: Text.English.Legge.Scripture.Lines[key],
      exegesis: Text.English.Legge.Exegesis.Imagery.Lines[key],
    },
  ]
}

function linesSection(hexagram: Hexagram): TextSection {
  const movingCount = hexagram.filter(isMovingLine).length
  if (movingCount === 0)
    // No moving lines: markdown-only. The `media` flag encodes that the LINES
    // block carries the hexagram-level text in markdown, while ANSI renders that
    // text via the separate text:hexagram section instead.
    return {
      kind: 'text',
      media: ['markdown'],
      role: 'lines',
      variant: 'none',
      variants: hexagramTextVariants(hexagram),
    }
  if (movingCount === 1)
    return {
      kind: 'text',
      media: ['ansi', 'markdown'],
      role: 'lines',
      variant: 'one',
      variants: oneMovingLineVariants(hexagram),
    }
  return {
    kind: 'text',
    media: ['ansi', 'markdown'],
    role: 'lines',
    variant: 'multi',
    variants: [],
  }
}

/** Public sub-builder: the hexagram identity strings (no record traversal in consumers). */
export function hexagramIdentity(hexagram: Hexagram): HexagramIdentity {
  return identityOf(hexagram)
}

/** Public sub-builder: the top-first diagram rows (line value, position, moving flag). */
export function hexagramDiagramRows(
  hexagram: Hexagram,
  movingFrom: Hexagram = hexagram,
): readonly DiagramLineRow[] {
  return diagramRows(hexagram, movingFrom)
}

export function buildConsultationView(
  query: string,
  hexagram: Hexagram,
  casting: PartialCastingRecord | null,
  absenceReason: CastingAbsenceReason | null = null,
): ConsultationView {
  const moving = hasMovingLines(hexagram)
  const emerging = getEmergingHexagram(hexagram)
  const sections: ConsultationSection[] = [
    { kind: 'query', media: ['ansi', 'markdown'], query },
    {
      kind: 'casting',
      media: ['ansi', 'markdown'],
      rows: casting === null ? null : buildLedgerRows(casting),
      // Guardrail: the reason only applies when there are no rows. Never let a
      // reason leak into a present-casting render (would change those fixtures).
      absenceReason: casting === null ? absenceReason : null,
    },
    {
      kind: 'transformation',
      media: ['ansi', 'markdown'],
      body: moving
        ? {
            rows: diagramRows(hexagram).map((standing, i) => ({
              standing,
              emerging: {
                line: emerging[5 - i]!,
                position: standing.position,
                moving: false,
              },
            })),
            standing: identityOf(hexagram),
            emerging: identityOf(emerging),
          }
        : null,
    },
    {
      kind: 'hexagram',
      media: ['ansi', 'markdown'],
      role: 'standing',
      wenWang: identityOf(hexagram).wenWang,
      rows: diagramRows(hexagram),
      identity: identityOf(hexagram),
    },
    {
      kind: 'text',
      media: ['ansi'],
      role: 'hexagram',
      variant: 'hexagram',
      variants: hexagramTextVariants(hexagram),
    },
  ]
  if (moving) {
    sections.push(
      {
        kind: 'hexagram',
        media: ['ansi', 'markdown'],
        role: 'emerging',
        wenWang: identityOf(emerging).wenWang,
        rows: diagramRows(emerging),
        identity: identityOf(emerging),
      },
      {
        kind: 'text',
        media: ['ansi'],
        role: 'hexagram',
        variant: 'hexagram',
        variants: hexagramTextVariants(emerging),
      },
    )
  }
  sections.push(linesSection(hexagram))
  return { sections, hasMovingLines: moving }
}
