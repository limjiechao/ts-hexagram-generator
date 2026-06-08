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

/** Convert bottom-first `CastingRecord` → top-first YAML mapping (`L6` first). */
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

export interface ConsultationEnvelope {
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
  /** `null` when the consultation has no recorded casting (e.g. migrated from
   * a legacy `.txt` that predates the CASTING table). */
  casting: CastingRecord | null
  /**
   * Why `casting` is absent — non-null IFF `casting` is null (ADR-0008). A
   * pre-field null-casting file (no key) parses back as 'legacy-no-table'.
   */
  castingAbsence: CastingAbsenceReason | null
}

export type ParseResult =
  | { ok: true; data: { envelope: ConsultationEnvelope; body: string } }
  | { ok: false; reason: ParseFailureReason }

export type ParseFailureReason =
  | 'missing-frontmatter'
  | 'schema-version-mismatch'
  | 'invalid-yaml'
  | 'invalid-shape'

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
    // defensive default keeps serialize total even if a caller forgot the
    // reason. `castingAbsence` takes the casting key's insertion slot so byte
    // order stays schemaVersion → timestamp → query → hexagram → (one of two).
    ...(envelope.casting === null
      ? { castingAbsence: envelope.castingAbsence ?? 'legacy-no-table' }
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
  // must be a valid `L6..L1` mapping and carries no absence reason.
  let castingRecord: CastingRecord | null
  let absence: CastingAbsenceReason | null
  if (casting === undefined) {
    castingRecord = null
    if (castingAbsence === undefined) {
      absence = 'legacy-no-table'
    } else if (isCastingAbsenceReason(castingAbsence)) {
      absence = castingAbsence
    } else {
      return { ok: false, reason: 'invalid-shape' }
    }
  } else {
    if (!isYamlCasting(casting)) return { ok: false, reason: 'invalid-shape' }
    castingRecord = castingFromYaml(casting)
    if (!isCastingRecord(castingRecord)) {
      return { ok: false, reason: 'invalid-shape' }
    }
    absence = null
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
        casting: castingRecord,
        castingAbsence: absence,
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
