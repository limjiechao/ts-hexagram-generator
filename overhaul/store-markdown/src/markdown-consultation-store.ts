import { Buffer } from 'node:buffer'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { ConsultationId } from '@hexagram/consultation-journal/consultation-id'
import {
  decodeRecord,
  encodeRecord,
} from '@hexagram/consultation-journal/record-codec'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'

import {
  createExclusively,
  hasCode,
  moveExclusively,
  replaceAtomically,
} from '#src/atomic-files.js'
import {
  composeFile,
  readFrontmatter,
  writeFrontmatter,
} from '#src/markdown-file.js'

/**
 * Renders the body of a Consultation's file: a Readout in Markdown, in the
 * default Reading Preference, so every file and every re-render has one
 * answer. The Store never reads a body back (ADR-0030).
 */
export type RenderBody = (consultation: Consultation) => Promise<string>

/**
 * The Markdown Consultation Store, and the maintenance only it offers,
 * which no other Consultation Store has and so the port leaves out.
 */
export interface MarkdownConsultationStore {
  /**
   * The port. Each Consultation is one file in the Journal's folder, named
   * `<divined date>--<Consultation Id>.md`, its YAML frontmatter the
   * version-2 record and its body rendered when the file is written. A write
   * is atomic and never overwrites a file; reading never writes (ADR-0030).
   * Only `.md` files directly in the folder are read, in the code-point
   * order of their file names: of two files holding one Consultation Id,
   * the later is the Unreadable `duplicate-id` and `get` returns the
   * earlier's Consultation. An Unreadable file's location is its file name.
   * Frontmatter is parsed with js-yaml's JSON or Core schema, never its
   * default schema. A missing folder reads as an empty Journal, and `keep`
   * creates it.
   */
  readonly consultationStore: ConsultationStore
  /**
   * Rewrites the body of every file that loads, each atomically, leaving
   * its frontmatter's bytes untouched and skipping every Unreadable file.
   * It resolves to how many files it rewrote; a failure rejects the Promise
   * and leaves each file whole.
   */
  readonly rerenderBodies: () => Promise<{ readonly rewritten: number }>
  /**
   * Moves an imported original, legacy or version 1, into the folder's
   * `legacy/` folder under its own name. It never overwrites a file there:
   * when the name is taken, it moves the file under the first free name
   * that adds a suffix and keeps the original name and extension. `file` is
   * any path the importer was given, inside the Journal's folder or not.
   */
  readonly moveToLegacy: (file: string) => Promise<void>
}

/**
 * Builds the Markdown Consultation Store over the Journal's folder, which
 * the caller locates (ADR-0020), with the renderer every body is written
 * by. It touches no file until it is used.
 */
export function markdownConsultationStore(options: {
  readonly journalFolder: string
  readonly renderBody: RenderBody
}): MarkdownConsultationStore {
  const { journalFolder, renderBody } = options

  async function holdsAt(name: string, id: ConsultationId): Promise<boolean> {
    const bytes = await readFile(path.join(journalFolder, name))
    return loadFile(bytes).consultation?.id === id
  }

  const consultationStore: ConsultationStore = {
    keep: async (consultation) => {
      const journal = await readJournal(journalFolder)
      if (
        journal.loaded.some((file) => file.consultation.id === consultation.id)
      ) {
        return
      }
      const record = encodeRecord(consultation)
      const text = composeFile(
        writeFrontmatter(record),
        await renderBody(consultation),
      )
      const name = `${record.divinedAt.slice(0, 10)}--${record.id}.md`
      await mkdir(journalFolder, { recursive: true })
      // Losing a race to a keep of the same Consultation is keeping an Id
      // the Journal already holds, so it does nothing.
      if (
        !(await createExclusively(journalFolder, name, text)) &&
        !(await holdsAt(name, consultation.id))
      ) {
        throw new Error(
          `${name} is taken by a file that does not hold Consultation ${consultation.id}`,
        )
      }
    },
    list: async () => {
      const journal = await readJournal(journalFolder)
      return {
        consultations: journal.loaded.map((file) => file.consultation),
        unreadable: journal.unreadable,
      }
    },
    get: async (id) => {
      const journal = await readJournal(journalFolder)
      return journal.loaded.find((file) => file.consultation.id === id)
        ?.consultation
    },
    // Deleting a Consultation is built with its own use case.
    remove: (record) =>
      Promise.reject(new Error('not built', { cause: record })),
    deletionRecords: () => Promise.reject(new Error('not built')),
  }

  return {
    consultationStore,
    rerenderBodies: async () => {
      const journal = await readJournal(journalFolder)
      for (const file of journal.loaded) {
        const body = await renderBody(file.consultation)
        await replaceAtomically(
          journalFolder,
          file.name,
          composeFile(file.frontmatter, body),
        )
      }
      return { rewritten: journal.loaded.length }
    },
    moveToLegacy: async (file) => {
      const legacyFolder = path.join(journalFolder, 'legacy')
      await mkdir(legacyFolder, { recursive: true })
      const { name, ext } = path.parse(file)
      for (let copy = 1; ; copy += 1) {
        const free = copy === 1 ? `${name}${ext}` : `${name}-${copy}${ext}`
        if (await moveExclusively(file, path.join(legacyFolder, free))) {
          return
        }
      }
    },
  }
}

/** A file that loaded as a Consultation, with the frontmatter it was read from. */
interface LoadedFile {
  readonly name: string
  readonly frontmatter: string
  readonly consultation: Consultation
}

/** Reads every `.md` file directly in the folder, in file-name order. */
async function readJournal(folder: string): Promise<{
  readonly loaded: readonly LoadedFile[]
  readonly unreadable: readonly UnreadableFile[]
}> {
  const loaded: LoadedFile[] = []
  const unreadable: UnreadableFile[] = []
  const firstLocations = new Map<ConsultationId, string>()
  // One file at a time, so a large Journal never exhausts file handles.
  for (const name of await markdownFileNames(folder)) {
    const bytes = await readListedFile(path.join(folder, name))
    if (bytes === undefined) {
      continue
    }
    const file = loadFile(bytes)
    if (file.consultation === undefined) {
      unreadable.push({ location: name, reason: file.reason })
      continue
    }
    const firstLocation = firstLocations.get(file.consultation.id)
    if (firstLocation !== undefined) {
      unreadable.push({
        location: name,
        reason: { kind: 'duplicate-id', firstLocation },
      })
      continue
    }
    firstLocations.set(file.consultation.id, name)
    loaded.push({ name, ...file })
  }
  return { loaded, unreadable }
}

/**
 * A listed file's bytes, or undefined when it was deleted after the folder
 * was read: it has left the Journal, so it is no Unreadable file either.
 */
async function readListedFile(file: string): Promise<Buffer | undefined> {
  try {
    return await readFile(file)
  } catch (error) {
    if (hasCode(error, 'ENOENT')) {
      return undefined
    }
    throw error
  }
}

function loadFile(bytes: Buffer):
  | { readonly consultation: Consultation; readonly frontmatter: string }
  | {
      readonly consultation?: undefined
      readonly reason: UnreadableFile['reason']
    } {
  const read = readFrontmatter(bytes)
  if (read.outcome === 'unreadable') {
    return { reason: read.reason }
  }
  const decoded = decodeRecord(read.record)
  if (decoded.outcome === 'unreadable') {
    return { reason: decoded.reason }
  }
  return { consultation: decoded.consultation, frontmatter: read.frontmatter }
}

async function markdownFileNames(folder: string): Promise<string[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return (
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)
        // UTF-8 bytes sort in code-point order; UTF-16 code units do not.
        .toSorted((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    )
  } catch (error) {
    if (hasCode(error, 'ENOENT')) {
      return []
    }
    throw error
  }
}
