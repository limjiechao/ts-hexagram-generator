import {
  isCastingAbsenceReason,
  isCastingRecord,
  isHexagram,
  type CastingAbsenceReason,
  type CastingRecord,
  type Hexagram,
  type Line,
  type LineCasting,
} from '@hexagram/core/types'
import matter from 'gray-matter'
import jsYaml from 'js-yaml'

import { castingReplaysTo } from './casting-replay.js'

/**
 * Explicit YAML engine for gray-matter. `stringify` pins `sortKeys: false` so
 * frontmatter key order stays insertion order (`schemaVersion` → `casting`)
 * instead of relying on js-yaml's implicit default. `parse` mirrors
 * gray-matter's built-in YAML engine (`yaml.safeLoad`) so reading is unchanged.
 */
const yamlEngine = {
  // gray-matter's `Engine` type requires `parse` to return `object`; js-yaml's
  // `safeLoad` is typed looser. The cast mirrors gray-matter's own built-in
  // YAML engine, which performs the equivalent unchecked widening.
  parse: (str: string): object => jsYaml.safeLoad(str) as object,
  stringify: (obj: object): string => jsYaml.safeDump(obj, { sortKeys: false }),
}

export const CURRENT_SCHEMA_VERSION = 1

export type YamlCasting = {
  L6: LineCasting
  L5: LineCasting
  L4: LineCasting
  L3: LineCasting
  L2: LineCasting
  L1: LineCasting
}

/**
 * The bottom-first-tuple ↔ top-first flip at the DISK boundary. This is the SAME
 * flip the view layer owns as `POSITIONS_TOP_FIRST`/`toTopFirst`
 * (`@hexagram/core/types`), but a DIFFERENT operation — those reorder a 6-tuple
 * for presentation; these map tuple indices ↔ the on-disk `L6..L1` YAML keys
 * (ADR-0008). Deliberately not unified: different output shapes, opposite sides
 * of the domain/core ↔ consultation-file boundary. Both directions are locked
 * (round-trip + tuple-index↔L-key) in `frontmatter.test.ts`.
 *
 * Convert bottom-first `CastingRecord` → top-first YAML mapping (`L6` first).
 */
export function castingToYaml(casting: CastingRecord): YamlCasting {
  const [L1, L2, L3, L4, L5, L6] = casting
  return { L6, L5, L4, L3, L2, L1 }
}

/** Convert top-first YAML mapping → bottom-first `CastingRecord`. */
export function castingFromYaml(yaml: YamlCasting): CastingRecord {
  return [yaml.L1, yaml.L2, yaml.L3, yaml.L4, yaml.L5, yaml.L6]
}

export type YamlHexagram = {
  L6: Line
  L5: Line
  L4: Line
  L3: Line
  L2: Line
  L1: Line
}

/** Convert bottom-first `Hexagram` tuple → top-first YAML mapping (`L6` first). */
export function hexagramToYaml(hexagram: Hexagram): YamlHexagram {
  const [L1, L2, L3, L4, L5, L6] = hexagram
  return { L6, L5, L4, L3, L2, L1 }
}

/** Convert top-first YAML mapping → bottom-first `Hexagram` tuple. */
export function hexagramFromYaml(yaml: YamlHexagram): Hexagram {
  return [yaml.L1, yaml.L2, yaml.L3, yaml.L4, yaml.L5, yaml.L6]
}

interface EnvelopeCommon {
  /**
   * Exactly the one version the loader accepts. The load gate is strict-equal
   * against `CURRENT_SCHEMA_VERSION` with no migration branch (ADR-0008
   * rejected versioned migrations), so a validated envelope can only ever
   * carry that literal — `number` would advertise a migration dimension the
   * code does not implement (finding S3). Pinned by `envelope-types.test-d.ts`.
   */
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  timestamp: string
  query: string
  hexagram: Hexagram
}

/**
 * `casting` and `castingAbsence` are mutually exclusive (ADR-0008): a recorded
 * casting carries no absence reason, and an absent casting must record WHY
 * (e.g. a legacy `.txt` that predates the CASTING table, or a playground save).
 * The discriminated union makes the impossible states — both null, or both set
 * — unrepresentable, so exclusivity no longer rides on runtime guards alone
 * (finding S3). The recorded branch pins `castingAbsence: null` so the field is
 * present in both branches, matching the on-disk shape and the parser output.
 */
export type CastingPresence =
  | { casting: CastingRecord; castingAbsence: null }
  | { casting: null; castingAbsence: CastingAbsenceReason }

export type ConsultationEnvelope = EnvelopeCommon & CastingPresence

export type ParseResult =
  | { ok: true; data: { envelope: ConsultationEnvelope; body: string } }
  | { ok: false; reason: ParseFailureReason }

export type ParseFailureReason =
  | 'missing-frontmatter'
  | 'schema-version-mismatch'
  | 'invalid-yaml'
  | 'invalid-shape'
  // The casting is well-shaped but does not replay to the stored hexagram
  // (a hand-edited or corrupted `.md`). Refused, not salvaged — see ADR-0008 S7.
  | 'casting-unreplayable'

/**
 * Serialize an envelope + body into the full Markdown text. The frontmatter
 * is YAML; both `hexagram` and `casting` are emitted as `L6..L1` mappings
 * (visual top-first); a `null` `casting` omits the `casting` key entirely;
 * multi-line `query` becomes a `|` block scalar.
 */
export function serializeFrontmatter(
  envelope: ConsultationEnvelope,
  body: string,
): string {
  const data = {
    schemaVersion: envelope.schemaVersion,
    timestamp: envelope.timestamp,
    query: envelope.query,
    hexagram: hexagramToYaml(envelope.hexagram),
    // Exactly one of `casting` / `castingAbsence` is present. A null casting
    // omits the casting key and records WHY it is absent (ADR-0008). The
    // envelope is a discriminated union (finding S3), so the `casting === null`
    // branch narrows `castingAbsence` to non-null — serialize is fail-closed by
    // construction, no defensive default needed (this is what dissolved S11).
    // `castingAbsence` takes the casting key's insertion slot so byte order
    // stays schemaVersion → timestamp → query → hexagram → (one of two).
    ...(envelope.casting === null
      ? { castingAbsence: envelope.castingAbsence }
      : { casting: castingToYaml(envelope.casting) }),
  }
  // Prepend a newline so that matter.stringify emits a blank line between
  // the closing `---` and the first Markdown section — matching what
  // oxfmt enforces for YAML-frontmatter documents.
  return matter.stringify(`\n${body}`, data, {
    language: 'yaml',
    engines: { yaml: yamlEngine },
  })
}

/**
 * Parse a Markdown file's text into an envelope + body. Returns a tagged
 * result; callers handle the `unreadable` cases by surfacing them in the
 * history list.
 */
export function parseFrontmatter(text: string): ParseResult {
  const { data, content } = (() => {
    try {
      return matter(text)
    } catch {
      return { data: undefined as unknown, content: '' }
    }
  })()

  if (data === undefined) return { ok: false, reason: 'invalid-yaml' }
  if (!isPlainObject(data) || Object.keys(data).length === 0) {
    return { ok: false, reason: 'missing-frontmatter' }
  }

  const { schemaVersion, timestamp, query, hexagram, casting, castingAbsence } =
    data as Record<string, unknown>

  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'schema-version-mismatch' }
  }
  if (typeof timestamp !== 'string' || typeof query !== 'string') {
    return { ok: false, reason: 'invalid-shape' }
  }

  if (!isYamlHexagram(hexagram)) return { ok: false, reason: 'invalid-shape' }
  const hexagramTuple = hexagramFromYaml(hexagram)
  if (!isHexagram(hexagramTuple)) return { ok: false, reason: 'invalid-shape' }

  // `casting` is optional: an absent key means "no casting recorded". When
  // casting is absent, `castingAbsence` records why — defaulting to
  // 'legacy-no-table' for pre-field files (ADR-0008). A present-but-unknown
  // castingAbsence value is corruption → invalid-shape. When present, casting
  // must be a valid `L6..L1` mapping and carries no absence reason. Each branch
  // builds one member of the `CastingPresence` union directly, so the two
  // fields stay correlated (finding S3) rather than being assembled from two
  // independently-nullable locals.
  let presence: CastingPresence
  if (casting === undefined) {
    let absence: CastingAbsenceReason
    if (castingAbsence === undefined) {
      absence = 'legacy-no-table'
    } else if (isCastingAbsenceReason(castingAbsence)) {
      absence = castingAbsence
    } else {
      return { ok: false, reason: 'invalid-shape' }
    }
    presence = { casting: null, castingAbsence: absence }
  } else {
    if (!isYamlCasting(casting)) return { ok: false, reason: 'invalid-shape' }
    const castingRecord = castingFromYaml(casting)
    if (!isCastingRecord(castingRecord)) {
      return { ok: false, reason: 'invalid-shape' }
    }
    // Prove, don't trust (ADR-0008 S7): a `.md` is our own output and always
    // replays unless tampered with or corrupted. Replaying the 18 splits
    // through the algorithm and confirming they reproduce the stored hexagram
    // is the SAME check the legacy `.txt` path runs — closing the asymmetry
    // where a hand-edited casting rendered a trusted but physically-impossible
    // ledger. A mismatch is corruption, so it fails closed to `[unreadable]`.
    if (!castingReplaysTo(castingRecord, hexagramTuple)) {
      return { ok: false, reason: 'casting-unreplayable' }
    }
    presence = { casting: castingRecord, castingAbsence: null }
  }

  return {
    ok: true,
    data: {
      envelope: {
        // The strict-equal guard above rejected every other value, so the
        // validated envelope carries the canonical constant (not the `unknown`
        // we destructured) — keeping the field literal-typed.
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp,
        query,
        hexagram: hexagramTuple,
        ...presence,
      },
      body: content,
    },
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isYamlCasting(value: unknown): value is YamlCasting {
  if (!isPlainObject(value)) return false
  return ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].every((key) => key in value)
}

function isYamlHexagram(value: unknown): value is YamlHexagram {
  if (!isPlainObject(value)) return false
  return ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].every((key) => key in value)
}
