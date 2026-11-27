import type { Stats } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import type { LegacyRecord } from '@hexagram/application/import-legacy-files'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import {
  parseLegacyFile,
  type LegacyCasting,
} from '@hexagram/legacy-import/parse-legacy'

import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import {
  importedLine,
  keptLine,
  legacyUnreadableReasonText,
  skippedLine,
} from '#src/commands/maintenance-reports.js'
import {
  JournalFailureError,
  reportingJournalFailure,
  strictUtf8,
  useCases,
} from '#src/commands/maintenance-runs.js'

/*
 * `hexagram-history --import-legacy [<path>…] --division-method <m>` (use
 * case 7): every file is read and parsed first, then each in turn is kept,
 * its original moved into `legacy/`, and its line printed, so a failure
 * partway leaves each kept file's original already moved.
 */

/** What reading and parsing one candidate file came to. */
type ReadFile =
  | {
      readonly path: string
      readonly outcome: 'skipped'
      readonly reason: string
    }
  | {
      readonly path: string
      readonly outcome: 'parsed'
      readonly record: LegacyRecord
      readonly casting: LegacyCasting
    }

/** A path to read, or a path skipped before reading, with its reason. */
type Candidate =
  | { readonly path: string; readonly skipped: undefined }
  | { readonly path: string; readonly skipped: string }

const cannotBeRead = 'it cannot be read'
const notRegularFile = 'it is not a regular file'

/** Imports the files at `paths`, or in the Journal folder when none is given. */
export async function importLegacyRun(
  paths: readonly string[],
  divisionMethod: DivisionMethod,
  io: CommandIo,
  ports: CommandPorts,
): Promise<ExitCode> {
  const files = await readCandidates(
    paths.length === 0
      ? await journalFolderCandidates(ports.journalFolder)
      : await allNamedCandidates(paths),
  )
  const counts = { cast: 0, recorded: 0, skipped: 0 }
  // A run with nothing to keep makes no use-case call, so touches no port.
  if (files.every((file) => file.outcome === 'skipped')) {
    for (const file of files) {
      io.stdout.write(`${skippedLine(file.path, file.reason)}\n`)
    }
    io.stdout.write(`${importedLine({ ...counts, skipped: files.length })}\n`)
    return 0
  }
  const { importLegacyFiles } = useCases(ports)
  return reportingJournalFailure(io, async () => {
    for (const file of files) {
      if (file.outcome === 'skipped') {
        counts.skipped += 1
        io.stdout.write(`${skippedLine(file.path, file.reason)}\n`)
        continue
      }
      const [kept] = await importLegacyFiles([file.record], divisionMethod)
      if (kept === undefined) {
        throw new Error('Defect: use case 7 kept nothing of one record')
      }
      const line = `${keptLine(file.path, kept.id, file.casting)}\n`
      try {
        await ports.moveToLegacy(file.path)
      } catch (error) {
        io.stdout.write(line)
        throw new JournalFailureError('written', error)
      }
      io.stdout.write(line)
      if (kept.origin === 'cast') counts.cast += 1
      else counts.recorded += 1
    }
    io.stdout.write(`${importedLine(counts)}\n`)
    return 0
  })
}

/** The Journal folder's files; none when the folder does not exist. */
async function journalFolderCandidates(
  folder: string,
): Promise<readonly Candidate[]> {
  try {
    await stat(folder)
  } catch (error) {
    if (isCode(error, 'ENOENT')) return []
    return [{ path: folder, skipped: cannotBeRead }]
  }
  return namedCandidates(folder)
}

/** Every named path's candidates, in argv order. */
async function allNamedCandidates(
  paths: readonly string[],
): Promise<readonly Candidate[]> {
  const candidates: Candidate[] = []
  for (const given of paths) candidates.push(...(await namedCandidates(given)))
  return candidates
}

/**
 * A path the user named: a regular file is itself; a folder gives its
 * regular `.txt` and `.md` files, case-sensitively and without recursion,
 * in the code-point order of their names; anything else is skipped.
 */
async function namedCandidates(given: string): Promise<readonly Candidate[]> {
  let entry: Stats
  try {
    entry = await stat(given)
  } catch {
    return [{ path: given, skipped: cannotBeRead }]
  }
  if (entry.isFile()) return [{ path: given, skipped: undefined }]
  if (!entry.isDirectory()) return [{ path: given, skipped: notRegularFile }]
  let names: string[]
  try {
    const entries = await readdir(given, { withFileTypes: true })
    names = entries
      .filter(
        (dirent) =>
          dirent.isFile() &&
          (dirent.name.endsWith('.txt') || dirent.name.endsWith('.md')),
      )
      .map((dirent) => dirent.name)
  } catch {
    return [{ path: given, skipped: cannotBeRead }]
  }
  return names
    .toSorted(byCodePoints)
    .map((name) => ({ path: path.join(given, name), skipped: undefined }))
}

/**
 * Reads and parses each candidate once, by the file's identity, taken
 * before it is read, under the first path that names it, so a file that
 * cannot be read is skipped once too; a path with no identity is skipped
 * at each mention. A file holding nothing to import is dropped.
 */
async function readCandidates(
  candidates: readonly Candidate[],
): Promise<readonly ReadFile[]> {
  const seen = new Set<string>()
  const files: ReadFile[] = []
  const skip = (file: string, reason: string) => {
    files.push({ path: file, outcome: 'skipped', reason })
  }
  for (const candidate of candidates) {
    if (candidate.skipped !== undefined) {
      skip(candidate.path, candidate.skipped)
      continue
    }
    const identity = await identityOf(candidate.path)
    if (identity === undefined) {
      skip(candidate.path, cannotBeRead)
      continue
    }
    if (seen.has(identity)) continue
    seen.add(identity)
    const text = await readText(candidate.path)
    if (text === undefined) {
      skip(candidate.path, cannotBeRead)
      continue
    }
    const parsed = parseLegacyFile({
      name: path.basename(candidate.path),
      text,
    })
    if (parsed.outcome === 'not-legacy') continue
    if (parsed.outcome === 'unreadable') {
      skip(candidate.path, legacyUnreadableReasonText(parsed.reason))
      continue
    }
    files.push({
      path: candidate.path,
      outcome: 'parsed',
      record: parsed.record,
      casting: parsed.casting,
    })
  }
  return files
}

/** The file's device and inode, or undefined when it cannot be stat'ed. */
async function identityOf(file: string): Promise<string | undefined> {
  try {
    const entry = await stat(file, { bigint: true })
    return `${String(entry.dev)}:${String(entry.ino)}`
  } catch {
    return undefined
  }
}

/**
 * The file's text as strict UTF-8, a byte-order mark kept for the parser;
 * undefined when it cannot be read or is not UTF-8.
 */
async function readText(file: string): Promise<string | undefined> {
  try {
    return strictUtf8(await readFile(file))
  } catch {
    return undefined
  }
}

/** Orders names by their code points, never by the locale. */
function byCodePoints(left: string, right: string): number {
  const a = [...left]
  const b = [...right]
  for (let at = 0; at < Math.min(a.length, b.length); at += 1) {
    const difference =
      (a[at]?.codePointAt(0) ?? 0) - (b[at]?.codePointAt(0) ?? 0)
    if (difference !== 0) return difference
  }
  return a.length - b.length
}

function isCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code
}
