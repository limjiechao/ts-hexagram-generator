import type { DerivedSplit } from '@hexagram/core/casting-derivation'
import type {
  CastingAbsenceReason,
  Hexagram,
  Line,
  PartialCastingRecord,
} from '@hexagram/core/types'

/** Which render media emit this section. buildConsultationView is the sole owner. */
export type SectionMedium = 'ansi' | 'markdown'

// ── Casting ledger ─────────────────────────────────────────────────────────
// One ledger cell is either a derived split (full data) or null (placeholder,
// rendered as `·` in ANSI; the markdown path only ever sees full records).
export type LedgerCell = DerivedSplit | null

/** One of the 18 ledger rows (6 lines × 3 casts), top-first (line 6 → line 1). */
export interface LedgerRow {
  /** Hexagram line number 1..6 (bottom-first numbering). */
  readonly lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  /** Cast number within the line: 3 (resolving, top) → 1 (bottom). */
  readonly castNumber: 1 | 2 | 3
  /** True only on the block-top (cast-3) row, which prints the line label. */
  readonly showLine: boolean
  /** True after the last row of every block except the final one. */
  readonly trailingRule: boolean
  /** Derived quantities for this cast, or null when not yet cast. */
  readonly cell: LedgerCell
}

export interface CastingSection {
  readonly kind: 'casting'
  readonly media: readonly SectionMedium[]
  /** null → "Casting not recorded" caption; otherwise the 18 ledger rows. */
  readonly rows: readonly LedgerRow[] | null
  /**
   * When `rows` is null, why casting is absent (drives the reason-aware notice).
   * null/absent for live-flow renders (partial real casting) where no reason
   * applies. Imported from core to avoid restating the vocabulary.
   */
  readonly absenceReason?: CastingAbsenceReason | null
}

// ── Line-diagram sections ───────────────────────────────────────────────────
/** One diagram row: a line value, its glyph (from LINE_GLYPH), its position. */
export interface DiagramLineRow {
  readonly line: Line
  /** Bottom-first position 1..6 (selects POSITION_LABELS + brace text). */
  readonly position: 1 | 2 | 3 | 4 | 5 | 6
  /** True when this standing line moves (drives the colour + arrow gap). */
  readonly moving: boolean
}

/** Hexagram identity strings (already stringified — no record traversal in serializers). */
export interface HexagramIdentity {
  readonly wenWang: string
  readonly chineseTraditional: string
  readonly chineseSimplified: string
  readonly zhuyin: string
  readonly pinyin: string
  readonly englishWilhelmBaynes: string
  readonly englishLegge: string
  // Identity-stack trigram fields (the `Upper: 名 Pinyin (English)` rows shared
  // by the transformation footer AND the playground identity stack): the
  // trigram NAME in Chinese, the capitalized pinyin, and the capitalized
  // English imagery.
  readonly upperTrigramChinese: string
  readonly upperTrigramEnglish: string
  readonly lowerTrigramChinese: string
  readonly lowerTrigramEnglish: string
  readonly upperTrigramPinyin: string
  readonly lowerTrigramPinyin: string
  // Diagram-brace trigram fields (the hexagram-section `（上卦）` / `（下卦）`
  // braces): the trigram IMAGERY in Chinese and the RAW (uncapitalized)
  // English imagery. Distinct from the identity-stack fields above — the two
  // render surfaces deliberately show different trigram strings.
  readonly upperTrigramImageryChinese: string
  readonly upperTrigramImageryEnglish: string
  readonly lowerTrigramImageryChinese: string
  readonly lowerTrigramImageryEnglish: string
}

/** TRANSFORMATION: two diagrams side by side + the paired identity footer. */
export interface TransformationSection {
  readonly kind: 'transformation'
  readonly media: readonly SectionMedium[]
  /** null when there are no moving lines → "(No transformation)". */
  readonly body: {
    readonly rows: readonly {
      readonly standing: DiagramLineRow
      readonly emerging: DiagramLineRow
    }[]
    readonly standing: HexagramIdentity
    readonly emerging: HexagramIdentity
  } | null
}

/** STANDING / EMERGING hexagram: one diagram + name block. */
export interface HexagramSection {
  readonly kind: 'hexagram'
  readonly media: readonly SectionMedium[]
  readonly role: 'standing' | 'emerging'
  readonly wenWang: string
  readonly rows: readonly DiagramLineRow[]
  readonly identity: HexagramIdentity
}

// ── Text sections ───────────────────────────────────────────────────────────
/** One (Scripture / Exegesis) pair in one language variant. */
export interface TextVariant {
  /** Bracketed language label, e.g. "Traditional Chinese". */
  readonly language: string
  readonly scripture: string
  readonly exegesis: string
}

/** HEXAGRAM text (always) or the per-line LINES text. */
export interface TextSection {
  readonly kind: 'text'
  readonly media: readonly SectionMedium[]
  readonly role: 'hexagram' | 'lines'
  /** For LINES: 'none' | 'one' | 'multi'; for HEXAGRAM always 'hexagram'. */
  readonly variant: 'hexagram' | 'one' | 'multi' | 'none'
  /** Empty for the 'multi' notice case (no scripture available). */
  readonly variants: readonly TextVariant[]
}

export interface QuerySection {
  readonly kind: 'query'
  readonly media: readonly SectionMedium[]
  readonly query: string
}

export type ConsultationSection =
  | QuerySection
  | CastingSection
  | TransformationSection
  | HexagramSection
  | TextSection

/**
 * The whole consultation as an ordered list of section descriptors. The order
 * is the single authoritative section order; the emerging gate is already
 * applied (no emerging hexagram / no LINES-moving sections when static). Each
 * section also carries an explicit `media` projection (owned by
 * buildConsultationView) that serializers filter on rather than special-casing.
 */
export interface ConsultationView {
  readonly sections: readonly ConsultationSection[]
  /** Convenience flag the serializers can branch on (already encoded in `sections`). */
  readonly hasMovingLines: boolean
}

export type { Hexagram, PartialCastingRecord }
