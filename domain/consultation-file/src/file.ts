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
  type ConsultationEnvelope,
  type ParseFailureReason,
} from './frontmatter.js'
import { markdownConsultationBody } from './markdown.js'
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
 * Persist a consultation as `consultation-<timestamp>.md` under `dir`.
 *
 * `params.dir` defaults to `<cwd>/consultations` (matches the legacy
 * path; the caller's cwd is the convention every CLI inherited from
 * the original implementation).
 */
export async function saveConsultationFile(params: {
  query: string
  hexagram: Hexagram
  casting: CastingRecord | null
  /** Required when `casting` is null — why casting is absent (ADR-0008). */
  castingAbsence?: CastingAbsenceReason
  dir?: string
}): Promise<string> {
  if (params.casting === null && params.castingAbsence === undefined) {
    throw new Error(
      'saveConsultationFile: castingAbsence is required when casting is null',
    )
  }
  const dir = params.dir ?? defaultConsultationsDir()
  await fs.mkdir(dir, { recursive: true })
  const fileSafe = getFilesystemSafeTimestamp()
  const filePath = path.join(dir, `consultation-${fileSafe}.md`)
  const body = markdownConsultationBody(
    params.query,
    params.hexagram,
    params.casting,
  )
  const text = serializeFrontmatter(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: getIsoTimestamp(),
      query: params.query,
      hexagram: params.hexagram,
      casting: params.casting,
      castingAbsence: params.casting === null ? params.castingAbsence! : null,
    },
    body,
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
