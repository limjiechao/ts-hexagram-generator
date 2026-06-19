import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type {
  CastingAbsenceReason,
  CastingRecord,
  Hexagram,
} from '@hexagram/core/types'

import {
  CURRENT_SCHEMA_VERSION,
  parseFrontmatter,
  serializeFrontmatter,
  type CastingPresence,
  type ConsultationEnvelope,
  type ParseFailureReason,
} from './frontmatter.js'
import {
  getFilesystemSafeTimestamp,
  getIsoTimestamp,
} from './utils-timestamp.js'

export type LoadResult =
  | {
      ok: true
      envelope: ConsultationEnvelope
      body: string
      path: string
    }
  | { ok: false; reason: ParseFailureReason | 'io-error'; path: string }

/** The conventional consultations directory NAME — the single literal both the
 *  cwd-anchored default (here) and the app layer's repo-root anchor reuse, so
 *  the folder name is stated once. */
export const CONSULTATIONS_DIR_NAME = 'consultations'

/**
 * The conventional consultations directory: `<cwd>/consultations`. Every CLI
 * inherited this from the original implementation (the caller's cwd is the
 * convention). Single source of truth so the path is not re-hardcoded across
 * the save default, the history scanner, the legacy migration, and the shell.
 */
export function defaultConsultationsDir(): string {
  return path.join(process.cwd(), CONSULTATIONS_DIR_NAME)
}

/**
 * Save-call argument. `casting` and `castingAbsence` are a discriminated union
 * (finding S3): a recorded casting forbids the reason (`never`); a null casting
 * requires one. This replaces the former separate `casting | null` +
 * optional-reason params and their runtime throw — the impossible "null casting,
 * no reason" call is now a compile error, so the boundary is type-enforced.
 */
export type SaveConsultationParams = {
  query: string
  hexagram: Hexagram
  /**
   * The pre-rendered Markdown body. Opaque to the domain: it is produced by the
   * medium-bound `@hexagram/text-grid` renderer at the cli edge and written
   * verbatim, symmetric with `loadConsultationFile` (which returns the body as
   * opaque disk bytes). The domain owns only the canonical YAML envelope
   * (ADR-0022).
   */
  body: string
  dir?: string
} & (
  | { casting: CastingRecord; castingAbsence?: never }
  | { casting: null; castingAbsence: CastingAbsenceReason }
)

/**
 * Persist a consultation as `consultation-<timestamp>.md` under `dir`.
 *
 * `params.dir` defaults to `<cwd>/consultations` (matches the legacy
 * path; the caller's cwd is the convention every CLI inherited from
 * the original implementation).
 */
export async function saveConsultationFile(
  params: SaveConsultationParams,
): Promise<string> {
  const dir = params.dir ?? defaultConsultationsDir()
  await fs.mkdir(dir, { recursive: true })
  const fileSafe = getFilesystemSafeTimestamp()
  const filePath = path.join(dir, `consultation-${fileSafe}.md`)
  // Narrow the input union into the envelope's CastingPresence member once, so
  // the serialized envelope's casting/castingAbsence pair is correlated.
  const presence: CastingPresence =
    params.casting === null
      ? { casting: null, castingAbsence: params.castingAbsence }
      : { casting: params.casting, castingAbsence: null }
  const text = serializeFrontmatter(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: getIsoTimestamp(),
      query: params.query,
      hexagram: params.hexagram,
      ...presence,
    },
    params.body,
  )
  await fs.writeFile(filePath, text, 'utf8')
  return filePath
}

/**
 * Read and parse a single `.md` consultation file. Surfaces every parse-time
 * failure as a tagged `ok: false` result so the history list can show
 * `[unreadable — <reason>]` instead of throwing.
 */
export async function loadConsultationFile(
  filePath: string,
): Promise<LoadResult> {
  let text: string
  try {
    text = await fs.readFile(filePath, 'utf8')
  } catch {
    return { ok: false, reason: 'io-error', path: filePath }
  }
  const parsed = parseFrontmatter(text)
  if (!parsed.ok) return { ok: false, reason: parsed.reason, path: filePath }
  return {
    ok: true,
    envelope: parsed.data.envelope,
    body: parsed.data.body,
    path: filePath,
  }
}
