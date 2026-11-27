import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'
import type { DeletionRecord } from '@hexagram/consultation-journal/deletion-record'
import {
  isUtcOffset,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { markdownConsultationStore } from '#src/markdown-consultation-store.js'

import {
  byId,
  castFrontmatter,
  castRecord,
  consultationOf,
  fakeRenderBody,
  fileText,
  markdownFiles,
  plant,
  recordedDayRecord,
  recordedMomentRecord,
  regularFiles,
  removeTemporaryFolders,
  snapshot,
  temporaryFolder,
} from './support/journal-folder.js'

// Every Query, Id and date below is invented (ADR-0015).

// A `remove` cut short between its record and its deletes cannot be timed, so
// deleting a `.md` file directly in `failing.folder` is made to fail while it
// is set. Every other call goes to the real file system.
const failing = vi.hoisted(() => ({
  folder: '',
  denied: (): Promise<never> =>
    Promise.reject(
      Object.assign(new Error('EPERM: operation not permitted'), {
        code: 'EPERM',
      }),
    ),
}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const pathModule = await import('node:path')
  const refused = (target: unknown): boolean =>
    failing.folder !== '' &&
    String(target).endsWith('.md') &&
    pathModule.dirname(pathModule.resolve(String(target))) === failing.folder
  const unlink: typeof actual.unlink = (target) =>
    refused(target) ? failing.denied() : actual.unlink(target)
  const rm: typeof actual.rm = (target, options) =>
    refused(target) ? failing.denied() : actual.rm(target, options)
  return {
    ...actual,
    default: { ...actual, unlink, rm },
    unlink,
    rm,
  }
})

afterEach(async () => {
  failing.folder = ''
  await removeTemporaryFolders()
})

/** The port of a Markdown Consultation Store over `journalFolder`. */
function storeOver(journalFolder: string) {
  return markdownConsultationStore({
    journalFolder,
    renderBody: fakeRenderBody(),
  }).consultationStore
}

function consultationId(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is no Consultation Id`)
  return text
}

function moment(epochMilliseconds: number, offset: string): Moment {
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds, offset }
}

function deletionRecord(id: ConsultationId, deletedAt: Moment): DeletionRecord {
  return { consultationId: id, deletedAt }
}

/** The bytes a Deletion Record's file holds. */
function recordBytes(id: string, deletedAt: string): string {
  return `{\n  "consultationId": "${id}",\n  "deletedAt": "${deletedAt}"\n}\n`
}

const cast = consultationOf(castRecord())
const recordedMoment = consultationOf(recordedMomentRecord())
const recordedDay = consultationOf(recordedDayRecord())

const castFile = '2026-11-26--01M8AJDS3VQ4X7M2N5P9T0W1YC.md'
const recordedMomentFile = '2026-10-28--01JE0A1B2C3D4E5F6G7H8J9K0M.md'
const recordedDayFile = '2026-10-28--01JE0B7Q2W5X8Z3N6R9T1V4Y7C.md'

const castRecordFile = `${cast.id}.json`

/** An Id no Consultation below holds. */
const neverHeld = consultationId('01M6E6AHA84T7V2M5N6P0R1S2K')

/** 2026-11-27T01:15:00.000Z. */
const firstInstant = 1_795_742_100_000
/** 2026-11-28T03:40:12.345Z. */
const laterInstant = 1_795_837_212_345

const deletedAt = moment(firstInstant, '+08:00')
const deletedAtText = '2026-11-27T09:15:00.000+08:00'
const deletedLater = moment(laterInstant, '+08:00')

/** A Journal folder holding the three Consultations, kept by the Store. */
async function journalOfThree(): Promise<string> {
  const folder = await temporaryFolder()
  const store = storeOver(folder)
  await store.keep(cast)
  await store.keep(recordedMoment)
  await store.keep(recordedDay)
  return folder
}

function deletedFolder(journalFolder: string): string {
  return path.join(journalFolder, 'deleted')
}

/** Plants `text` in the Journal's `deleted/` folder, creating it. */
async function plantRecord(
  journalFolder: string,
  name: string,
  text: string,
): Promise<void> {
  await mkdir(deletedFolder(journalFolder), { recursive: true })
  await writeFile(path.join(deletedFolder(journalFolder), name), text, 'utf8')
}

function readRecordFile(journalFolder: string, name: string): Promise<string> {
  return readFile(path.join(deletedFolder(journalFolder), name), 'utf8')
}

function byConsultationId(
  records: readonly DeletionRecord[],
): readonly DeletionRecord[] {
  return records.toSorted((a, b) =>
    a.consultationId < b.consultationId ? -1 : 1,
  )
}

describe("the Deletion Record's file (ADR-0046)", () => {
  it('writes deleted/<Id>.json as two-space JSON with a final newline', async () => {
    const folder = await journalOfThree()

    await storeOver(folder).remove(deletionRecord(cast.id, deletedAt))

    expect(await readRecordFile(folder, castRecordFile)).toBe(
      recordBytes(cast.id, deletedAtText),
    )
  })

  it("writes deletedAt in the Moment's own offset, not in UTC", async () => {
    const folder = await journalOfThree()

    await storeOver(folder).remove(
      deletionRecord(cast.id, moment(firstInstant, '-05:00')),
    )

    expect(await readRecordFile(folder, castRecordFile)).toBe(
      recordBytes(cast.id, '2026-11-26T20:15:00.000-05:00'),
    )
  })

  it('leaves no regular file in either folder but the records and the Consultations', async () => {
    const folder = await journalOfThree()

    await storeOver(folder).remove(deletionRecord(cast.id, deletedAt))

    expect(await regularFiles(deletedFolder(folder))).toEqual([castRecordFile])
    expect(await regularFiles(folder)).toEqual([
      recordedMomentFile,
      recordedDayFile,
    ])
  })

  it('creates deleted/ when it is missing', async () => {
    const folder = await journalOfThree()

    await storeOver(folder).remove(deletionRecord(recordedDay.id, deletedAt))

    expect(await regularFiles(deletedFolder(folder))).toEqual([
      `${recordedDay.id}.json`,
    ])
  })

  it('keeps the record for an Id the Journal never held, touching no Consultation', async () => {
    const folder = await journalOfThree()
    const before = await snapshot(folder)

    await storeOver(folder).remove(deletionRecord(neverHeld, deletedAt))

    expect(await snapshot(folder)).toEqual(before)
    expect(await readRecordFile(folder, `${neverHeld}.json`)).toBe(
      recordBytes(neverHeld, deletedAtText),
    )
  })

  it('keeps the record in a Journal whose folder is missing', async () => {
    const parent = await temporaryFolder()
    const folder = path.join(parent, 'journal')

    await storeOver(folder).remove(deletionRecord(neverHeld, deletedAt))

    expect(await readRecordFile(folder, `${neverHeld}.json`)).toBe(
      recordBytes(neverHeld, deletedAtText),
    )
  })
})

describe("deleting the Consultation's files", () => {
  it('deletes its file and leaves every other file as it was', async () => {
    const folder = await journalOfThree()
    const before = await snapshot(folder)
    const store = storeOver(folder)

    await store.remove(deletionRecord(cast.id, deletedAt))

    const { [castFile]: _deleted, ...others } = before
    expect(await snapshot(folder)).toEqual(others)
    const { consultations, unreadable } = await store.list()
    expect(byId(consultations)).toEqual(byId([recordedMoment, recordedDay]))
    expect(unreadable).toEqual([])
    expect(await store.get(cast.id)).toBeUndefined()
  })

  it('deletes a file holding the Id under a name that is not its own', async () => {
    const folder = await temporaryFolder()
    await plant(folder, 'renamed-by-hand.md', fileText(castFrontmatter()))
    const store = storeOver(folder)

    await store.remove(deletionRecord(cast.id, deletedAt))

    expect(await markdownFiles(folder)).toEqual([])
  })

  it('deletes every file holding the Id, the duplicate-id file among them', async () => {
    const folder = await temporaryFolder()
    await plant(folder, castFile, fileText(castFrontmatter()))
    await plant(folder, `zz-${castFile}`, fileText(castFrontmatter()))
    await storeOver(folder).keep(recordedDay)
    const store = storeOver(folder)

    await store.remove(deletionRecord(cast.id, deletedAt))

    expect(await markdownFiles(folder)).toEqual([recordedDayFile])
    expect(await store.list()).toEqual({
      consultations: [recordedDay],
      unreadable: [],
    })
  })

  it('leaves an Unreadable file whose frontmatter names the Id', async () => {
    const folder = await temporaryFolder()
    const unreadableText = fileText(
      castFrontmatter({ transformation: "'777777'" }),
    )
    await plant(folder, 'does-not-replay.md', unreadableText)

    await storeOver(folder).remove(deletionRecord(cast.id, deletedAt))

    expect(await snapshot(folder)).toEqual({
      'does-not-replay.md': unreadableText,
    })
  })

  it('leaves a file holding the Id outside the folder itself', async () => {
    const folder = await temporaryFolder()
    const nested = path.join(folder, 'nested')
    await mkdir(nested)
    await plant(nested, castFile, fileText(castFrontmatter()))
    await plant(folder, 'kept-aside.txt', fileText(castFrontmatter()))

    await storeOver(folder).remove(deletionRecord(cast.id, deletedAt))

    expect(await regularFiles(nested)).toEqual([castFile])
    expect(await regularFiles(folder)).toEqual(['kept-aside.txt'])
  })
})

describe('removing again', () => {
  it('keeps the first record when the same Id is removed twice', async () => {
    const folder = await journalOfThree()
    const store = storeOver(folder)

    await store.remove(deletionRecord(cast.id, deletedAt))
    await store.remove(deletionRecord(cast.id, deletedLater))

    expect(await regularFiles(deletedFolder(folder))).toEqual([castRecordFile])
    expect(await readRecordFile(folder, castRecordFile)).toBe(
      recordBytes(cast.id, deletedAtText),
    )
    expect(await store.deletionRecords()).toEqual([
      deletionRecord(cast.id, deletedAt),
    ])
  })

  it("keeps an earlier record's bytes for the same Id and still deletes the files", async () => {
    const folder = await journalOfThree()
    const earlier = `{"consultationId":"${cast.id}","deletedAt":"2026-11-20T08:00:00+08:00"}`
    await plantRecord(folder, castRecordFile, earlier)

    await storeOver(folder).remove(deletionRecord(cast.id, deletedLater))

    expect(await readRecordFile(folder, castRecordFile)).toBe(earlier)
    expect(await markdownFiles(folder)).toEqual([
      recordedMomentFile,
      recordedDayFile,
    ])
  })

  it('writes the record before deleting, so running it again finishes a remove cut short', async () => {
    const folder = await journalOfThree()
    const store = storeOver(folder)
    failing.folder = path.resolve(folder)

    await expect(
      store.remove(deletionRecord(cast.id, deletedAt)),
    ).rejects.toThrow()

    expect(await readRecordFile(folder, castRecordFile)).toBe(
      recordBytes(cast.id, deletedAtText),
    )
    expect(await markdownFiles(folder)).toContain(castFile)

    failing.folder = ''
    await store.remove(deletionRecord(cast.id, deletedLater))

    expect(await markdownFiles(folder)).toEqual([
      recordedMomentFile,
      recordedDayFile,
    ])
    expect(await readRecordFile(folder, castRecordFile)).toBe(
      recordBytes(cast.id, deletedAtText),
    )
  })
})

describe("a file at the record's name that is not this Id's record", () => {
  const foreignRecords = [
    {
      kind: 'a record naming another Id',
      text: recordBytes(neverHeld, deletedAtText),
    },
    { kind: 'text that is not JSON', text: 'not a record\n' },
    {
      kind: 'JSON that is no Deletion Record',
      text: `{\n  "consultationId": "${cast.id}",\n  "deletedAt": "2026-11-27"\n}\n`,
    },
  ] as const

  it.each(foreignRecords)(
    'rejects and touches nothing when the name holds $kind',
    async ({ text }) => {
      const folder = await journalOfThree()
      await plantRecord(folder, castRecordFile, text)
      const journalBefore = await snapshot(folder)
      const deletedBefore = await snapshot(deletedFolder(folder))

      await expect(
        storeOver(folder).remove(deletionRecord(cast.id, deletedAt)),
      ).rejects.toThrow()

      expect(await snapshot(folder)).toEqual(journalBefore)
      expect(await snapshot(deletedFolder(folder))).toEqual(deletedBefore)
    },
  )
})

describe('list and get ignore Deletion Records', () => {
  it('reads no Unreadable file from deleted/ after a remove', async () => {
    const folder = await journalOfThree()
    const store = storeOver(folder)

    await store.remove(deletionRecord(cast.id, deletedAt))

    const { unreadable } = await store.list()
    expect(unreadable).toEqual([])
  })

  it('still lists and gets a Consultation a planted record names', async () => {
    const folder = await journalOfThree()
    await plantRecord(
      folder,
      castRecordFile,
      recordBytes(cast.id, deletedAtText),
    )
    const store = storeOver(folder)

    const { consultations, unreadable } = await store.list()

    expect(byId(consultations)).toEqual(
      byId([cast, recordedMoment, recordedDay]),
    )
    expect(unreadable).toEqual([])
    expect(await store.get(cast.id)).toEqual(cast)
  })

  it('is not stopped by a file in deleted/ that does not decode', async () => {
    const folder = await journalOfThree()
    await plantRecord(folder, castRecordFile, 'not a record\n')
    const store = storeOver(folder)

    const { consultations, unreadable } = await store.list()

    expect(byId(consultations)).toEqual(
      byId([cast, recordedMoment, recordedDay]),
    )
    expect(unreadable).toEqual([])
    expect(await store.get(cast.id)).toEqual(cast)
  })
})

describe('deletionRecords', () => {
  it('holds none in a missing folder, and creates nothing', async () => {
    const parent = await temporaryFolder()
    const folder = path.join(parent, 'journal')

    expect(await storeOver(folder).deletionRecords()).toEqual([])
    expect(await readdir(parent)).toEqual([])
  })

  it('holds none when deleted/ is missing, and creates no deleted/', async () => {
    const folder = await journalOfThree()
    const before = await readdir(folder)

    expect(await storeOver(folder).deletionRecords()).toEqual([])
    expect(await readdir(folder)).toEqual(before)
  })

  it('gives back every record remove kept, to another Store over the same folder', async () => {
    const folder = await journalOfThree()
    const minus = moment(laterInstant, '-03:30')
    await storeOver(folder).remove(deletionRecord(cast.id, deletedAt))
    await storeOver(folder).remove(deletionRecord(neverHeld, minus))

    const records = await storeOver(folder).deletionRecords()

    expect(byConsultationId(records)).toEqual(
      byConsultationId([
        deletionRecord(cast.id, deletedAt),
        deletionRecord(neverHeld, minus),
      ]),
    )
  })

  it('reads which Consultation a file names from its contents, not its name', async () => {
    const folder = await journalOfThree()
    await plantRecord(
      folder,
      'any-name.json',
      recordBytes(recordedDay.id, deletedAtText),
    )

    expect(await storeOver(folder).deletionRecords()).toEqual([
      deletionRecord(recordedDay.id, deletedAt),
    ])
  })

  it('reads only .json files directly in deleted/', async () => {
    const folder = await journalOfThree()
    await plantRecord(
      folder,
      castRecordFile,
      recordBytes(cast.id, deletedAtText),
    )
    await plantRecord(folder, 'notes.txt', 'not a record\n')
    const nested = path.join(deletedFolder(folder), 'nested')
    await mkdir(nested)
    await writeFile(
      path.join(nested, `${neverHeld}.json`),
      recordBytes(neverHeld, deletedAtText),
      'utf8',
    )

    expect(await storeOver(folder).deletionRecords()).toEqual([
      deletionRecord(cast.id, deletedAt),
    ])
  })

  it.each([
    { kind: 'is not JSON', text: 'not a record\n' },
    {
      kind: 'names no Consultation Id',
      text: '{\n  "consultationId": "not-an-id",\n  "deletedAt": "2026-11-27T09:15:00.000+08:00"\n}\n',
    },
    {
      kind: 'is deleted on a day, not at a moment',
      text: `{\n  "consultationId": "${cast.id}",\n  "deletedAt": "2026-11-27"\n}\n`,
    },
  ])('rejects when a record file $kind', async ({ text }) => {
    const folder = await journalOfThree()
    await plantRecord(
      folder,
      `${recordedDay.id}.json`,
      recordBytes(recordedDay.id, deletedAtText),
    )
    await plantRecord(folder, 'zz-broken.json', text)

    await expect(storeOver(folder).deletionRecords()).rejects.toThrow()
  })
})
