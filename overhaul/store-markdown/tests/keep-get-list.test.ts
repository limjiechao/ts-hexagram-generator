import {
  chmod,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { afterEach, describe, expect, it } from 'vitest'

import {
  markdownConsultationStore,
  type RenderBody,
} from '#src/markdown-consultation-store.js'

import {
  byId,
  castFrontmatter,
  castRecord,
  consultationOf,
  fakeRenderBody,
  fileText,
  markdownFiles,
  plant,
  readFixture,
  recordedDayRecord,
  recordedMomentRecord,
  regularFiles,
  removeTemporaryFolders,
  snapshot,
  temporaryFolder,
} from './support/journal-folder.js'

// Every Query, Id and date below is invented (ADR-0015).

afterEach(removeTemporaryFolders)

function storeOver(journalFolder: string, renderBody = fakeRenderBody()) {
  return markdownConsultationStore({ journalFolder, renderBody })
}

const cast = consultationOf(castRecord())
const recordedMoment = consultationOf(recordedMomentRecord())
const recordedDay = consultationOf(recordedDayRecord())

const castFile = '2026-11-26--01M8AJDS3VQ4X7M2N5P9T0W1YC.md'
const recordedMomentFile = '2026-10-28--01JE0A1B2C3D4E5F6G7H8J9K0M.md'
const recordedDayFile = '2026-10-28--01JE0B7Q2W5X8Z3N6R9T1V4Y7C.md'

const kinds = [
  {
    kind: 'a Cast Consultation',
    consultation: cast,
    file: castFile,
    fixture: 'cast-moment.frontmatter.md',
  },
  {
    kind: 'a Recorded Consultation divined at a Moment',
    consultation: recordedMoment,
    file: recordedMomentFile,
    fixture: 'recorded-moment.frontmatter.md',
  },
  {
    kind: 'a Recorded Consultation divined on a Day',
    consultation: recordedDay,
    file: recordedDayFile,
    fixture: 'recorded-day.frontmatter.md',
  },
] as const

// Windows file operations are slow under antivirus scanning, so the race runs smaller there.
const listingRace =
  process.platform === 'win32'
    ? { rounds: 2, files: 50, timeout: 120_000 }
    : { rounds: 10, files: 200, timeout: undefined }

const failingRenderBody: RenderBody = () =>
  Promise.reject(new Error('no renderer'))

/** A Recorded Consultation with this Query and otherwise `recordedMoment`'s fields. */
function recordedWithQuery(query: string, id: string): Consultation {
  return consultationOf({ ...recordedMomentRecord(), id, query })
}

/** 26 characters of the ULID alphabet, distinct for each `n` below 1024. */
function ulid(n: number): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const high = alphabet[Math.floor(n / 32)] ?? '0'
  const low = alphabet[n % 32] ?? '0'
  return `01JF${'0'.repeat(20)}${high}${low}`
}

describe('keep, get and list round trip', () => {
  it.each(kinds)('gets back $kind it kept', async ({ consultation }) => {
    const folder = await temporaryFolder()
    await storeOver(folder).consultationStore.keep(consultation)

    const fresh = storeOver(folder).consultationStore
    expect(await fresh.get(consultation.id)).toEqual(consultation)
  })

  it('lists every kept Consultation and no Unreadable file', async () => {
    const folder = await temporaryFolder()
    const { consultationStore } = storeOver(folder)
    for (const consultation of [cast, recordedMoment, recordedDay]) {
      await consultationStore.keep(consultation)
    }

    const listed = await storeOver(folder).consultationStore.list()
    expect(byId(listed.consultations)).toEqual(
      byId([cast, recordedMoment, recordedDay]),
    )
    expect(listed.unreadable).toEqual([])
  })

  it('gets undefined for an Id the Journal does not hold', async () => {
    const folder = await temporaryFolder()
    const { consultationStore } = storeOver(folder)
    await consultationStore.keep(cast)

    expect(await consultationStore.get(recordedDay.id)).toBeUndefined()
  })

  it('reads what another Store over the same folder kept', async () => {
    const folder = await temporaryFolder()
    const reader = storeOver(folder).consultationStore
    expect(await reader.get(cast.id)).toBeUndefined()

    await storeOver(folder).consultationStore.keep(cast)

    expect(await reader.get(cast.id)).toEqual(cast)
    const listed = await reader.list()
    expect(listed.consultations).toEqual([cast])
  })

  it.each([
    ['several lines', 'Should Greyfen\nsell the barley\nor keep it?'],
    ['trailing newlines', 'Will the Ashmere ferry run?\n\n'],
    ['one trailing newline', 'Will the Ashmere ferry run?\n'],
    ['leading and trailing spaces', '  Will the mill turn?  '],
    ['a line of three dashes', 'Before the thaw\n---\nor after it?'],
    ['a colon and a hash', 'Greyfen: rebuild # or wait?'],
    ['both kinds of quote', `Is the "elder's" counsel sound?`],
    ['Traditional Chinese', '格芬糧倉宜早開乎？'],
    ['carriage returns', 'First line\r\nSecond line'],
    ['a tab', 'Ashmere\tor Westmill?'],
    ['digits only', '789876'],
    ['a YAML keyword', 'null'],
    ['a leading dash', '- the east road?'],
    ['flow-collection brackets', '{ ferry: [early, late] }'],
  ])('keeps a Query with %s exactly as written', async (_, query) => {
    const folder = await temporaryFolder()
    const consultation = recordedWithQuery(query, '01JE0C0000000000000000000Q')
    await storeOver(folder).consultationStore.keep(consultation)

    const got = await storeOver(folder).consultationStore.get(consultation.id)
    expect(got?.query).toBe(query)
    expect(got).toEqual(consultation)
  })
})

describe("a Consultation's file (ADR-0030)", () => {
  it.each(kinds)(
    'names the file of $kind by its divined date and Consultation Id',
    async ({ consultation, file }) => {
      const folder = await temporaryFolder()
      await storeOver(folder).consultationStore.keep(consultation)

      expect(await regularFiles(folder)).toEqual([file])
    },
  )

  it('names a Moment by its date in its own offset, not in UTC', async () => {
    const folder = await temporaryFolder()
    const earlyMorning = consultationOf({
      ...recordedMomentRecord(),
      id: '01JE0E0000000000000000000S',
      divinedAt: '2026-11-26T07:30:00.000+08:00',
    })
    await storeOver(folder).consultationStore.keep(earlyMorning)

    expect(await regularFiles(folder)).toEqual([
      '2026-11-26--01JE0E0000000000000000000S.md',
    ])
  })

  it.each(kinds)(
    'writes $kind as the fixture frontmatter, a blank line, then the rendered body',
    async ({ consultation, file, fixture }) => {
      const folder = await temporaryFolder()
      const renderBody = fakeRenderBody()
      await storeOver(folder, renderBody).consultationStore.keep(consultation)

      const text = await readFile(path.join(folder, file), 'utf8')
      const body = await renderBody(consultation)
      expect(text).toBe(`${await readFixture(fixture)}\n${body}`)
    },
  )

  it('renders the body from the Consultation being kept', async () => {
    const folder = await temporaryFolder()
    const rendered: Consultation[] = []
    const renderBody: RenderBody = (consultation) => {
      rendered.push(consultation)
      return Promise.resolve('Body.\n')
    }
    await storeOver(folder, renderBody).consultationStore.keep(cast)

    expect(rendered).toEqual([cast])
  })

  it('never parses meaning out of a file name', async () => {
    const folder = await temporaryFolder()
    await plant(folder, 'kept-by-hand.md', fileText(castFrontmatter()))
    await plant(
      folder,
      '1999-01-01--01JE0A1B2C3D4E5F6G7H8J9K0M.md',
      fileText(castFrontmatter({ id: '01JE0D0000000000000000000R' })),
    )
    const { consultationStore } = storeOver(folder)

    expect(await consultationStore.get(cast.id)).toEqual(cast)
    expect(await consultationStore.get(recordedMoment.id)).toBeUndefined()
    const listed = await consultationStore.list()
    expect(
      listed.consultations.map((consultation) => consultation.id).toSorted(),
    ).toEqual(['01JE0D0000000000000000000R', cast.id])
    expect(listed.unreadable).toEqual([])
  })
})

describe('keeping never overwrites (ADR-0030)', () => {
  it('does nothing when the Journal already holds the Id', async () => {
    const folder = await temporaryFolder()
    const { consultationStore } = storeOver(folder)
    await consultationStore.keep(cast)
    const before = await snapshot(folder)

    await consultationStore.keep(
      consultationOf({ ...castRecord(), query: 'A different Greyfen Query' }),
    )

    expect(await snapshot(folder)).toEqual(before)
    expect(await consultationStore.get(cast.id)).toEqual(cast)
  })

  it('leaves one file when the same Consultation is kept twice', async () => {
    const folder = await temporaryFolder()
    const { consultationStore } = storeOver(folder)
    await consultationStore.keep(recordedDay)
    await consultationStore.keep(recordedDay)

    expect(await regularFiles(folder)).toEqual([recordedDayFile])
  })

  it('writes nothing when a file under another name holds the Id', async () => {
    const folder = await temporaryFolder()
    await plant(folder, 'kept-by-hand.md', fileText(castFrontmatter()))
    const before = await snapshot(folder)

    await storeOver(folder).consultationStore.keep(cast)

    expect(await snapshot(folder)).toEqual(before)
  })

  it.each([
    ['a foreign file', 'Notes the owner left here.\n'],
    [
      'an Unreadable file holding the Id',
      fileText(castFrontmatter({ transformation: "'678977'" })),
    ],
  ])(
    'rejects and writes nothing when %s holds the name it would take',
    async (_, text) => {
      const folder = await temporaryFolder()
      await plant(folder, castFile, text)
      const before = await snapshot(folder)

      await expect(
        storeOver(folder).consultationStore.keep(cast),
      ).rejects.toThrow()

      expect(await snapshot(folder)).toEqual(before)
    },
  )

  it('leaves exactly one whole file when one Consultation is kept twice at once', async () => {
    const folder = await temporaryFolder()
    const renderBody = fakeRenderBody()
    const { consultationStore } = storeOver(folder, renderBody)

    await Promise.all([
      consultationStore.keep(cast),
      consultationStore.keep(cast),
    ])

    expect(await markdownFiles(folder)).toEqual([castFile])
    const text = await readFile(path.join(folder, castFile), 'utf8')
    expect(text).toBe(
      `${await readFixture('cast-moment.frontmatter.md')}\n${await renderBody(cast)}`,
    )
  })
})

describe('writes are atomic (ADR-0030)', () => {
  it('leaves no file in the folder but the kept Consultations', async () => {
    const folder = await temporaryFolder()
    const { consultationStore } = storeOver(folder)
    await consultationStore.keep(cast)
    await consultationStore.keep(recordedDay)

    expect(await regularFiles(folder)).toEqual(
      [castFile, recordedDayFile].toSorted(),
    )
  })

  it('never shows a partly written file to a list running alongside', async () => {
    const folder = await temporaryFolder()
    const { consultationStore } = storeOver(folder)
    const consultations = Array.from({ length: 24 }, (_, n) =>
      recordedWithQuery(`Ashmere question ${n}\n`.repeat(200), ulid(n)),
    )

    const progress = { keeping: true }
    const keeps = Promise.all(
      consultations.map((consultation) => consultationStore.keep(consultation)),
    ).finally(() => {
      progress.keeping = false
    })
    const sightings: Awaited<ReturnType<typeof consultationStore.list>>[] = []
    while (progress.keeping) {
      sightings.push(await consultationStore.list())
    }
    await keeps
    sightings.push(await consultationStore.list())

    for (const sighting of sightings) {
      expect(sighting.unreadable).toEqual([])
      for (const listed of sighting.consultations) {
        expect(consultations).toContainEqual(listed)
      }
    }
    expect(byId(sightings.at(-1)?.consultations ?? [])).toEqual(
      byId(consultations),
    )
  })

  it('reads no leftover temporary file', async () => {
    const folder = await temporaryFolder()
    const partial = `---\nschemaVersion: 2\nid: ${cast.id}\n`
    await plant(folder, `.${castFile}.tmp`, partial)
    await plant(folder, `${castFile}.tmp`, partial)
    await plant(folder, `${castFile}.partial`, partial)

    expect(await storeOver(folder).consultationStore.list()).toEqual({
      consultations: [],
      unreadable: [],
    })
  })

  it('rejects and leaves no file when the body cannot be rendered', async () => {
    const folder = await temporaryFolder()
    await expect(
      storeOver(folder, failingRenderBody).consultationStore.keep(cast),
    ).rejects.toThrow()
    expect(await markdownFiles(folder)).toEqual([])
  })
})

describe("the Journal's folder", () => {
  it('reads a missing folder as an empty Journal without creating it', async () => {
    const missing = path.join(await temporaryFolder(), 'consultations')
    const { consultationStore } = storeOver(missing)

    expect(await consultationStore.list()).toEqual({
      consultations: [],
      unreadable: [],
    })
    expect(await consultationStore.get(cast.id)).toBeUndefined()
    await expect(stat(missing)).rejects.toThrow()
  })

  it('touches no file when the Store is built', async () => {
    const missing = path.join(await temporaryFolder(), 'consultations')
    storeOver(missing)

    await expect(stat(missing)).rejects.toThrow()
  })

  it('creates the missing folder when it keeps', async () => {
    const missing = path.join(await temporaryFolder(), 'consultations')
    await storeOver(missing).consultationStore.keep(cast)

    expect(await regularFiles(missing)).toEqual([castFile])
    expect(await storeOver(missing).consultationStore.get(cast.id)).toEqual(
      cast,
    )
  })

  it('rejects a list when a file stands where the folder should be', async () => {
    const parent = await temporaryFolder()
    const notAFolder = path.join(parent, 'consultations')
    await writeFile(notAFolder, 'not a folder\n', 'utf8')

    await expect(
      storeOver(notAFolder).consultationStore.list(),
    ).rejects.toThrow()
  })

  // Deleting a file another reader holds open may behave differently on
  // Windows; the Windows test leg will show what happens there.
  it(
    'skips a file deleted while it lists the folder',
    { timeout: listingRace.timeout },
    async () => {
      const folder = await temporaryFolder()
      const names = Array.from(
        { length: listingRace.files },
        (_, n) => `${String(n).padStart(3, '0')}.md`,
      )
      // The race is not forced, so each round deletes every file, last name
      // first, while a list runs; a list that meets a vanished file must
      // still resolve.
      for (let round = 0; round < listingRace.rounds; round += 1) {
        for (const name of names) {
          await plant(folder, name, fileText(castFrontmatter()))
        }
        const listing = storeOver(folder).consultationStore.list()
        const deleting = (async () => {
          for (const name of names.toReversed()) {
            await unlink(path.join(folder, name))
          }
        })()
        const [listed] = await Promise.all([listing, deleting])
        expect(listed.consultations.length).toBeLessThanOrEqual(1)
        for (const unreadable of listed.unreadable) {
          expect(unreadable.reason.kind).toBe('duplicate-id')
        }
      }
    },
  )

  it('reads only .md files directly in the folder', async () => {
    const folder = await temporaryFolder()
    const record = fileText(castFrontmatter())
    await plant(folder, 'consultation-2026-05-19T14-23-11+0800.txt', record)
    await plant(folder, 'notes.md.bak', record)
    await plant(folder, 'README', record)
    for (const subfolder of ['legacy', 'deleted', 'nested.md']) {
      await mkdir(path.join(folder, subfolder))
      await plant(path.join(folder, subfolder), castFile, record)
    }

    expect(await storeOver(folder).consultationStore.list()).toEqual({
      consultations: [],
      unreadable: [],
    })
    expect(
      await storeOver(folder).consultationStore.get(cast.id),
    ).toBeUndefined()
  })
})

describe('rerenderBodies', () => {
  it('rewrites every body with the current renderer and counts the files', async () => {
    const folder = await temporaryFolder()
    const first = storeOver(folder, fakeRenderBody('first'))
    for (const { consultation } of kinds) {
      await first.consultationStore.keep(consultation)
    }

    const second = fakeRenderBody('second')
    expect(await storeOver(folder, second).rerenderBodies()).toEqual({
      rewritten: 3,
    })

    for (const { consultation, file, fixture } of kinds) {
      const text = await readFile(path.join(folder, file), 'utf8')
      expect(text).toBe(
        `${await readFixture(fixture)}\n${await second(consultation)}`,
      )
    }
    expect(await regularFiles(folder)).toEqual(
      kinds.map(({ file }) => file).toSorted(),
    )
  })

  it('leaves the bytes of a hand-written frontmatter untouched and adds the blank line', async () => {
    const folder = await temporaryFolder()
    const frontmatter = [
      '---',
      '# Kept by hand.',
      'schemaVersion: 2',
      'id: "01M8AJDS3VQ4X7M2N5P9T0W1YC"',
      'divinedAt: "2026-11-26T08:00:00.123+08:00"',
      'query: >-',
      '  Should the Greyfen granary',
      '  open early?',
      'transformation: "678976"',
      'casting:',
      '  - [4, 3, 4]',
      '  - [4,3,1]',
      '  - - 22',
      '    - 1',
      '    - 3',
      '  - [47, 42, 37]',
      '  - [4, 3, 1]',
      '  - [4, 3, 4]',
      'divisionMethod: virtual',
      'keptBy: the steward',
      '---',
      '',
    ].join('\n')
    await plant(folder, 'by-hand.md', `${frontmatter}Old body.\n`)

    const renderBody = fakeRenderBody('second')
    expect(await storeOver(folder, renderBody).rerenderBodies()).toEqual({
      rewritten: 1,
    })

    const text = await readFile(path.join(folder, 'by-hand.md'), 'utf8')
    expect(text).toBe(`${frontmatter}\n${await renderBody(cast)}`)
  })

  it('renders each body from the Consultation its file holds', async () => {
    const folder = await temporaryFolder()
    await storeOver(folder).consultationStore.keep(cast)
    await storeOver(folder).consultationStore.keep(recordedDay)
    const rendered: Consultation[] = []
    const renderBody: RenderBody = (consultation) => {
      rendered.push(consultation)
      return Promise.resolve('Body.\n')
    }

    await storeOver(folder, renderBody).rerenderBodies()

    expect(byId(rendered)).toEqual(byId([cast, recordedDay]))
  })

  it('skips and does not count a file deleted while it rerenders', async () => {
    const folder = await temporaryFolder()
    for (const { consultation } of kinds) {
      await storeOver(folder).consultationStore.keep(consultation)
    }
    const rendered: string[] = []
    const renderBody: RenderBody = async (consultation) => {
      if (rendered.length === 0) {
        // While rendering the first file, delete every other one, so each
        // is gone before the run reaches it.
        for (const { consultation: other, file } of kinds) {
          if (other.id !== consultation.id) {
            await unlink(path.join(folder, file))
          }
        }
      }
      rendered.push(consultation.id)
      return `# Rerendered ${consultation.id}\n`
    }

    expect(await storeOver(folder, renderBody).rerenderBodies()).toEqual({
      rewritten: 1,
    })

    expect(rendered).toHaveLength(1)
    const survivor = kinds.find(({ consultation }) =>
      rendered.includes(consultation.id),
    )
    expect(await regularFiles(folder)).toEqual(survivor ? [survivor.file] : [])
  })

  it('rewrites nothing and creates nothing when the folder is missing', async () => {
    const missing = path.join(await temporaryFolder(), 'consultations')

    expect(await storeOver(missing).rerenderBodies()).toEqual({ rewritten: 0 })
    await expect(stat(missing)).rejects.toThrow()
  })

  it.skipIf(process.platform === 'win32')(
    "keeps a file's mode when it rewrites its body",
    async () => {
      const folder = await temporaryFolder()
      await storeOver(folder).consultationStore.keep(cast)
      await chmod(path.join(folder, castFile), 0o600)

      await storeOver(folder, fakeRenderBody('second')).rerenderBodies()

      const { mode } = await stat(path.join(folder, castFile))
      expect(mode & 0o777).toBe(0o600)
    },
  )

  it('rewrites nothing in an empty Journal', async () => {
    const folder = await temporaryFolder()

    expect(await storeOver(folder).rerenderBodies()).toEqual({ rewritten: 0 })
    expect(await readdir(folder)).toEqual([])
  })

  it('rejects and leaves each file whole when the renderer fails partway', async () => {
    const folder = await temporaryFolder()
    const first = fakeRenderBody('first')
    for (const { consultation } of kinds) {
      await storeOver(folder, first).consultationStore.keep(consultation)
    }
    const second = fakeRenderBody('second')
    let calls = 0
    const failingSecondTime: RenderBody = (consultation) => {
      calls += 1
      return calls === 2
        ? Promise.reject(new Error('the renderer broke'))
        : second(consultation)
    }

    await expect(
      storeOver(folder, failingSecondTime).rerenderBodies(),
    ).rejects.toThrow()

    for (const { consultation, file, fixture } of kinds) {
      const text = await readFile(path.join(folder, file), 'utf8')
      const frontmatter = await readFixture(fixture)
      expect([
        `${frontmatter}\n${await first(consultation)}`,
        `${frontmatter}\n${await second(consultation)}`,
      ]).toContain(text)
    }
    expect(await regularFiles(folder)).toEqual(
      kinds.map(({ file }) => file).toSorted(),
    )
  })
})

describe('moveToLegacy', () => {
  it("moves a file in the Journal's folder into legacy/ under its own name", async () => {
    const folder = await temporaryFolder()
    const original = 'consultation-2026-05-19T14-23-11+0800.md'
    const text = await readFixture('version-1.md')
    await plant(folder, original, text)

    await storeOver(folder).moveToLegacy(path.join(folder, original))

    expect(await regularFiles(folder)).toEqual([])
    expect(await snapshot(path.join(folder, 'legacy'))).toEqual({
      [original]: text,
    })
    expect(await storeOver(folder).consultationStore.list()).toEqual({
      consultations: [],
      unreadable: [],
    })
  })

  it("moves a file from outside the Journal's folder", async () => {
    const folder = await temporaryFolder()
    const elsewhere = await temporaryFolder()
    const original = 'greyfen-notes.txt'
    await plant(elsewhere, original, 'Greyfen, autumn: the granary.\n')

    await storeOver(folder).moveToLegacy(path.join(elsewhere, original))

    expect(await regularFiles(elsewhere)).toEqual([])
    expect(await snapshot(path.join(folder, 'legacy'))).toEqual({
      [original]: 'Greyfen, autumn: the granary.\n',
    })
  })

  it('never overwrites: a taken name gets a suffix that keeps the name and extension', async () => {
    const folder = await temporaryFolder()
    const sources = [
      await temporaryFolder(),
      await temporaryFolder(),
      await temporaryFolder(),
    ]
    const { moveToLegacy } = storeOver(folder)
    for (const [index, source] of sources.entries()) {
      await plant(source, 'ashmere.txt', `Copy ${index}.\n`)
      await moveToLegacy(path.join(source, 'ashmere.txt'))
    }

    const moved = await snapshot(path.join(folder, 'legacy'))
    expect(moved['ashmere.txt']).toBe('Copy 0.\n')
    expect(Object.values(moved).toSorted()).toEqual([
      'Copy 0.\n',
      'Copy 1.\n',
      'Copy 2.\n',
    ])
    for (const name of Object.keys(moved)) {
      expect(name.startsWith('ashmere')).toBe(true)
      expect(name.endsWith('.txt')).toBe(true)
    }
  })
})
