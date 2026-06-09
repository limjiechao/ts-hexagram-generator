import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import {
  getEmergingHexagram,
  hasMovingLines,
  isMovingLine,
} from '@hexagram/core/line-semantics'
import {
  isLineIndex,
  POSITIONS_TOP_FIRST,
  toTopFirst,
  type CastingAbsenceReason,
  type Hexagram,
  type PartialCastingRecord,
} from '@hexagram/core/types'

import type {
  CastingSection,
  ConsultationSection,
  ConsultationView,
  DiagramLineRow,
  HexagramIdentity,
  QuerySection,
  SectionMedium,
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

// The no-moving `lines:none` branch is the Markdown half of the one medium
// divergence — see `sectionVisibility` below.
function linesSection(hexagram: Hexagram): TextSection {
  const movingCount = hexagram.filter(isMovingLine).length
  if (movingCount === 0)
    // No moving lines: the LINES block carries the hexagram-level text in
    // Markdown, while ANSI renders that text via the separate text:hexagram
    // section instead (see sectionVisibility: MARKDOWN_ONLY here).
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
  return {
    kind: 'text',
    role: 'lines',
    variant: 'multi',
    variants: [],
  }
}

/**
 * Public sub-builder: the QUERY section. buildConsultationView owns section
 * visibility (see `sectionVisibility`), so the mid-flow render
 * (buildPartialCastingSections) mints the same section via this sub-builder
 * instead of re-deriving it — ADR-0018 "buildConsultationView is the sole owner".
 */
export function querySection(query: string): QuerySection {
  return { kind: 'query', query }
}

/**
 * Public sub-builder: the CASTING section (full, partial mid-flow, or null).
 * Same single-owner rationale as `querySection`: the reason-only-when-empty
 * guardrail lives here, not at the call sites.
 */
export function castingSection(
  casting: PartialCastingRecord | null,
  absenceReason: CastingAbsenceReason | null = null,
): CastingSection {
  return {
    kind: 'casting',
    rows: casting === null ? null : buildLedgerRows(casting),
    // Guardrail: the reason only applies when there are no rows. Never let a
    // reason leak into a present-casting render (would change those fixtures).
    absenceReason: casting === null ? absenceReason : null,
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

/**
 * Public sub-builder: the four (Scripture / Exegesis) language variants for the
 * single moving line of a one-moving-line hexagram (empty if the hexagram has no
 * moving line). This is the single home of the per-line reading-text derivation
 * — consumers that show a narrower subset (e.g. the playground's
 * Traditional-Chinese + Wilhelm-Baynes strip) filter this list by `language`
 * rather than re-traversing the hexagram record, so they can never disagree with
 * the consultation readout about what a moving line says.
 */
export function movingLineVariants(hexagram: Hexagram): readonly TextVariant[] {
  return oneMovingLineVariants(hexagram)
}

// ── Section → medium visibility (the single, executable decision) ────────────
// buildConsultationView (this module) is the SOLE owner of which media emit each
// section (ADR-0018). `sectionVisibility` is that decision in code — the former
// ASCII matrix made executable, so it can never drift from per-section literals.
// Serializers MUST route through `sectionsForMedium`: there is no per-section
// flag to read, and `sectionVisibility` is not exported, so no consumer can
// introduce a divergent visibility rule.
//
// Exhaustiveness teeth: each constant is a Record over the CLOSED SectionMedium
// union. Adding a new medium turns every constant below into a compile error
// until the owner decides that medium's visibility for each section group.
//
// The ONE deliberate divergence: for a STATIC (no-moving) hexagram the
// hexagram-level scripture is rendered ANSI-side by `text:hexagram` and
// Markdown-side by `text:lines:none` (Markdown folds that scripture into the
// trailing `## LINES` block). Same words, different sections, by design.
type SectionVisibility = Record<SectionMedium, boolean>
const BOTH_MEDIA: SectionVisibility = { ansi: true, markdown: true }
const ANSI_ONLY: SectionVisibility = { ansi: true, markdown: false }
const MARKDOWN_ONLY: SectionVisibility = { ansi: false, markdown: true }

function sectionVisibility(section: ConsultationSection): SectionVisibility {
  switch (section.kind) {
    case 'query':
    case 'casting':
    case 'transformation':
    case 'hexagram':
      return BOTH_MEDIA
    case 'text':
      // Hexagram-level scripture is ANSI-only; Markdown folds it into the
      // trailing LINES block via the no-moving `lines:none` section.
      if (section.role === 'hexagram') return ANSI_ONLY
      return section.variant === 'none' ? MARKDOWN_ONLY : BOTH_MEDIA
  }
}

/**
 * The ONE sanctioned way to project the view for a render medium. Serializers
 * filter through this instead of reading a per-section flag, so visibility stays
 * owned here (ADR-0018). `view.sections` remains the canonical, ordered,
 * medium-neutral list for content/order inspection.
 */
export function sectionsForMedium(
  view: ConsultationView,
  medium: SectionMedium,
): readonly ConsultationSection[] {
  return view.sections.filter((s) => sectionVisibility(s)[medium])
}

export function buildConsultationView(
  query: string,
  hexagram: Hexagram,
  casting: PartialCastingRecord | null,
  absenceReason: CastingAbsenceReason | null = null,
): ConsultationView {
  const moving = hasMovingLines(hexagram)
  const emerging = getEmergingHexagram(hexagram)
  // `diagramRows` is top-first (line 6 → 1); `emerging` is bottom-first. Walk
  // emerging in the SAME top-first order via the named reversal so standing[i]
  // and emergingTopFirst[i] are the same position (replaces a bare `5 - i`).
  const emergingTopFirst = toTopFirst(emerging)
  const sections: ConsultationSection[] = [
    querySection(query),
    castingSection(casting, absenceReason),
    {
      kind: 'transformation',
      body: moving
        ? {
            rows: diagramRows(hexagram).map((standing, i) => ({
              standing,
              emerging: {
                line: emergingTopFirst[i]!,
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
  if (moving) {
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
  return { sections, hasMovingLines: moving }
}
