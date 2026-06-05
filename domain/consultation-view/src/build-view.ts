import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import { isMovingLine } from '@hexagram/core/line-semantics'
import type { Hexagram, PartialCastingRecord } from '@hexagram/core/types'

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

// Private Line-index guard (0..5). Mirrors the guard the pre-IR markdown
// renderer used (`i >= 0 && i <= 5`); kept local so this domain package needs
// no cli dependency for the validator. `findIndex` returns -1 or 0..5, so this
// is byte-equivalent to viewer-core's isLineIndex at the only call site.
function isLineIndex(i: number): i is 0 | 1 | 2 | 3 | 4 | 5 {
  return i >= 0 && i <= 5
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
  return ([6, 5, 4, 3, 2, 1] as const).map((position) => {
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
    // No moving lines: the LINES block carries the *hexagram-level* text in
    // markdown; the ANSI side renders this text separately as the standing
    // HEXAGRAM block. Both project from this one section.
    return {
      kind: 'text',
      role: 'lines',
      variant: 'none',
      variants: hexagramTextVariants(hexagram),
    }
  if (movingCount === 1)
    return {
      kind: 'text',
      role: 'lines',
      variant: 'one',
      variants: oneMovingLineVariants(hexagram),
    }
  return { kind: 'text', role: 'lines', variant: 'multi', variants: [] }
}

export function buildConsultationView(
  query: string,
  hexagram: Hexagram,
  casting: PartialCastingRecord | null,
): ConsultationView {
  const hasMovingLines = hexagram.some(isMovingLine)
  const emerging = getEmergingHexagram(hexagram)
  const sections: ConsultationSection[] = [
    { kind: 'query', query },
    {
      kind: 'casting',
      rows: casting === null ? null : buildLedgerRows(casting),
    },
    {
      kind: 'transformation',
      body: hasMovingLines
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
      role: 'standing',
      wenWang: identityOf(hexagram).wenWang,
      rows: diagramRows(hexagram),
      identity: identityOf(hexagram),
    },
    {
      kind: 'text',
      role: 'hexagram',
      variant: 'hexagram',
      variants: hexagramTextVariants(hexagram),
    },
  ]
  if (hasMovingLines) {
    sections.push(
      {
        kind: 'hexagram',
        role: 'emerging',
        wenWang: identityOf(emerging).wenWang,
        rows: diagramRows(emerging),
        identity: identityOf(emerging),
      },
      {
        kind: 'text',
        role: 'hexagram',
        variant: 'hexagram',
        variants: hexagramTextVariants(emerging),
      },
    )
  }
  sections.push(linesSection(hexagram))
  return { sections, hasMovingLines }
}
