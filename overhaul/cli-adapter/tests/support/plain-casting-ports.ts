import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { Moment } from '@hexagram/consultation-journal/divined-at'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'

import type { CommandPorts } from '#src/commands/entry-point.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'

// What the plain casting commands' tests share: Journals in fresh folders
// under the system's temporary directory, never the repository's own
// Journal; the real Markdown Store over them; ports that record every use;
// and the Consultation Id's random part the Readout fixtures hold.

/** Crockford's base 32, the ULID alphabet (ADR-0046). */
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** The ten time characters of a ULID for this millisecond. */
export function timeCharacters(epochMilliseconds: number): string {
  let text = ''
  let remaining = epochMilliseconds
  for (let at = 0; at < 10; at += 1) {
    text = crockford.charAt(remaining % 32) + text
    remaining = Math.floor(remaining / 32)
  }
  return text
}

/** The random part of the fixtures' Consultation Ids. */
export const idRandomPart = '4T7V2M5N6P0R1S2K'

/** The Random Source's draws that make the Consultation Id's random part. */
export const idDraws: readonly number[] = [...idRandomPart].map((symbol) =>
  crockford.indexOf(symbol),
)

const folders: string[] = []

/** Removes every folder the Journals below were made in; for `afterEach`. */
export async function removeTemporaryJournals(): Promise<void> {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
}

/** A Journal folder, not yet created, in a fresh temporary folder. */
export async function temporaryJournal(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix))
  folders.push(root)
  return path.join(root, 'journal')
}

/** A Journal folder that cannot be created: its parent is a file. */
export async function unwritableJournal(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix))
  folders.push(root)
  await writeFile(path.join(root, 'a-file'), 'not a folder\n')
  return path.join(root, 'a-file', 'journal')
}

export async function filesIn(folder: string): Promise<readonly string[]> {
  try {
    const names = await readdir(folder)
    return names.toSorted()
  } catch {
    return []
  }
}

/** What a fresh Store reads back from the Journal folder. */
export function keptIn(
  journalFolder: string,
): ReturnType<ConsultationStore['list']> {
  const store = markdownConsultationStore({
    journalFolder,
    renderBody: markdownBodyRenderer({
      scriptureCatalogue: bundledScriptureCatalogue,
    }),
  })
  return store.consultationStore.list()
}

/** The Consultations a fresh Store reads back from the Journal folder. */
export async function keptConsultations(
  journalFolder: string,
): Promise<Awaited<ReturnType<ConsultationStore['list']>>['consultations']> {
  const { consultations } = await keptIn(journalFolder)
  return consultations
}

export interface PortOptions {
  readonly journalFolder: string
  readonly draws?: readonly number[]
  readonly clock?: Clock['now']
  /** The Catalogue the run reads; the Store's bodies always use the bundled one. */
  readonly scriptureCatalogue?: ScriptureCatalogue
  /** Hands the run the Catalogue itself, unrecorded, so its methods keep their `this`. */
  readonly catalogueAsGiven?: boolean
  /** Called as the Store's keep begins. */
  readonly onKeep?: () => void
}

/**
 * The run's ports: the real Markdown Store over the Journal folder, the
 * bundled Catalogue, a Clock that reads `moment` and a Random Source that
 * gives `draws` in turn, unless the options name others. Every use is
 * recorded by port, the Journal folder included.
 */
export function recordingPorts(
  options: PortOptions,
  defaults: { readonly moment: Moment; readonly draws: readonly number[] },
  touched: string[],
): CommandPorts {
  const store = markdownConsultationStore({
    journalFolder: options.journalFolder,
    renderBody: markdownBodyRenderer({
      scriptureCatalogue: bundledScriptureCatalogue,
    }),
  })
  const catalogue = options.scriptureCatalogue ?? bundledScriptureCatalogue
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.passageTexts(...args)
    },
    hexagramNames: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.hexagramNames(...args)
    },
    receivedSequenceNumber: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.receivedSequenceNumber(...args)
    },
    trigramNames: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.trigramNames(...args)
    },
    editions: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.editions(...args)
    },
  }
  const real = store.consultationStore
  const consultationStore: ConsultationStore = {
    keep: (consultation) => {
      touched.push('Consultation Store')
      options.onKeep?.()
      return real.keep(consultation)
    },
    list: () => {
      touched.push('Consultation Store')
      return real.list()
    },
    get: (id) => {
      touched.push('Consultation Store')
      return real.get(id)
    },
    remove: (record) => {
      touched.push('Consultation Store')
      return real.remove(record)
    },
    deletionRecords: () => {
      touched.push('Consultation Store')
      return real.deletionRecords()
    },
  }
  const draws = options.draws ?? defaults.draws
  let drawn = 0
  const randomSource: RandomSource = {
    integerBelow: (bound) => {
      touched.push('Random Source')
      const draw = draws[drawn]
      drawn += 1
      if (draw === undefined) throw new Error('the invented entropy ran dry')
      if (draw >= bound) throw new Error(`draw ${draw} is not below ${bound}`)
      return draw
    },
  }
  const now = options.clock ?? (() => defaults.moment)
  const clock: Clock = {
    now: () => {
      touched.push('Clock')
      return now()
    },
  }
  const maintenance = (): never => {
    touched.push('Markdown Consultation Store')
    throw new Error('plain casting reached a maintenance run')
  }
  const { journalFolder } = options
  return {
    scriptureCatalogue:
      options.catalogueAsGiven === true ? catalogue : scriptureCatalogue,
    consultationStore,
    randomSource,
    clock,
    get journalFolder(): string {
      touched.push('Journal folder')
      return journalFolder
    },
    moveToLegacy: maintenance,
    rerenderBodies: maintenance,
    compilePdf: () => {
      touched.push('PDF compiler')
      throw new Error('plain casting reached the PDF compiler')
    },
  }
}

/** A closed pipe's write error, as Node reports it. */
export function brokenPipe(): Error {
  return Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })
}

/**
 * A list that resolves as a value but throws `error` at any use: the
 * failure comes after the port has answered, so no port failed.
 */
export function throwingList(error: Error): never[] {
  return new Proxy<never[]>([], {
    get: (_target, key) => {
      // Not thenable, so it resolves as a value.
      if (key === 'then') return
      throw error
    },
  })
}

export function editionId(text: string): EditionId {
  if (!isEditionId(text)) throw new Error(`${text} is no EditionId`)
  return text
}
