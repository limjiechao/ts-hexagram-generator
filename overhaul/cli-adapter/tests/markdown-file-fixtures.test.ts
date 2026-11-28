import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import {
  markdownBody,
  markdownBodyRenderer,
} from '#src/readout/markdown-body.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

import { readoutCases } from './support/readout-cases.js'

// The Markdown body's and the whole file's exact bytes (ADR-0013,
// ADR-0046), compared with the fixtures derived from today's Markdown
// body. Each body is the Readout in the default Reading Preference
// (Traditional, Legge, the 大象 and 小象, no Yilin Verse), whatever
// preference a keeping command was given. The Store writes into a fresh
// folder under the system's temporary directory, never a real Journal.

const ports = { scriptureCatalogue: bundledScriptureCatalogue }

const fixtureFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'markdown',
)

function markdownFixture(fileName: string): Promise<string> {
  return readFile(path.join(fixtureFolder, fileName), 'utf8')
}

/** The file name the manual gives: `<divined date>--<Consultation Id>.md`. */
const fileNames: Readonly<Record<string, string>> = {
  'cast-x-zhi-x': '2026-11-02--01M6E6AHA84T7V2M5N6P0R1S2K.md',
  'cast-all-moving': '2026-11-05--01M6E6AHA84T7V2M5N6P0R1S2K.md',
  // 23:59:30 at -05:00 is 11-13 in UTC; the name takes its own offset's date.
  'cast-several-moving': '2026-11-12--01M6E6AHA84T7V2M5N6P0R1S2K.md',
  'recorded-moment': '2026-10-30--01M6E6AHA84T7V2M5N6P0R1S2M.md',
  'recorded-day': '2026-10-28--01M6E6AHA84T7V2M5N6P0R1S2N.md',
}

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

async function temporaryJournal(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'markdown-file-'))
  folders.push(folder)
  return folder
}

describe('the Markdown body and file over the fixtures', () => {
  for (const { name, consultation } of readoutCases) {
    it(`${name}: markdownBody gives the body's bytes`, async () => {
      const expected = await markdownFixture(`${name}.body.md`)
      // The fixture itself must hold what the test claims of it.
      expect(expected).not.toContain('\u001B')
      const readout = await consultationReadoutFor(
        ports,
        consultation,
        defaultReadingPreference,
      )
      expect(markdownBody(readout)).toBe(expected)
    })

    it(`${name}: markdownBodyRenderer renders the same body`, async () => {
      const renderBody = markdownBodyRenderer(ports)
      expect(await renderBody(consultation)).toBe(
        await markdownFixture(`${name}.body.md`),
      )
    })

    it(`${name}: the Store keeps the whole file under its name`, async () => {
      const journalFolder = await temporaryJournal()
      const store = markdownConsultationStore({
        journalFolder,
        renderBody: markdownBodyRenderer(ports),
      })
      await store.consultationStore.keep(consultation)
      expect(await readdir(journalFolder)).toEqual([fileNames[name]])
      const written = await readFile(
        path.join(journalFolder, fileNames[name] ?? ''),
        'utf8',
      )
      const expected = await markdownFixture(`${name}.file.md`)
      expect(written).toBe(expected)
      // The file is the body fixture under its frontmatter (R-453).
      expect(
        expected.endsWith(`---\n\n${await markdownFixture(`${name}.body.md`)}`),
      ).toBe(true)
      expect(await store.consultationStore.get(consultation.id)).toEqual(
        consultation,
      )
    })
  }
})
