import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { browseConsultations } from '@hexagram/application/browse-consultations'
import type { Clock } from '@hexagram/application/clock'
import type { openConsultation } from '@hexagram/application/open-consultation'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'

import { composeCli } from '#src/composition-root.js'

// Every Query, Id and date below is invented. Each test keeps its Journal in
// a fresh temporary folder, never in the repository's Journal.

type Composed = ReturnType<typeof composeCli>

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

function id(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is no Consultation Id`)
  return text
}

/** A Moment from ISO text ending in its own offset, such as `+08:00`. */
function moment(iso: string): Moment {
  const offset = iso.slice(-6)
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds: Date.parse(iso), offset }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value: Parameters<typeof isDay>[0] = {
    precision: 'day',
    year,
    month,
    day: dayOfMonth,
  }
  if (!isDay(value)) throw new Error(`${year}-${month}-${dayOfMonth} is no day`)
  return value
}

const temporaryFolders: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryFolders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

/** A Journal folder that does not exist yet, inside a fresh temporary folder. */
async function freshJournalFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'hexagram-journal-'))
  temporaryFolders.push(folder)
  return path.join(folder, 'consultations')
}

/** Keeping, browsing and opening need no scripture, so every lookup fails the test. */
const unused = () =>
  Promise.reject(new Error('the Journal looked up scripture'))

/**
 * `composeCli` over the real Markdown Store in `journalFolder`, a Clock that
 * reads `clockMoments` in turn, and a Random Source that counts upward.
 */
function cliOver(journalFolder: string, clockMoments: readonly Moment[] = []) {
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: unused,
    hexagramNames: unused,
    receivedSequenceNumber: unused,
    trigramNames: unused,
    editions: unused,
  }
  let reads = 0
  const clock: Clock = {
    now: () => {
      const now = clockMoments[reads]
      reads += 1
      if (now === undefined)
        throw new Error('read the Clock more than scripted')
      return now
    },
  }
  let draws = 0
  const randomSource: RandomSource = {
    integerBelow: (bound) => {
      draws += 1
      return draws % bound
    },
  }
  const { consultationStore } = markdownConsultationStore({
    journalFolder,
    renderBody: (consultation) =>
      Promise.resolve(`# A Readout of ${consultation.id}\n`),
  })
  return composeCli({
    scriptureCatalogue,
    randomSource,
    consultationStore,
    clock,
  })
}

/** Divides by each Pick in turn through the composed steps. */
function castByPicks(cli: Composed, picks: readonly number[]): CompleteCasting {
  let casting = cli.beginCasting()
  for (const pick of picks) {
    const result = cli.divide(casting, pick)
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('the Picks did not complete the Casting')
}

/**
 * Keeps three Consultations in one offset: a Cast one at 21:14 on
 * 2 November, a Recorded one dated to 2 November only, and a Recorded one at
 * 07:30 on 28 October. Newest first, the Day lists above the moment of its
 * date.
 */
async function keepThree(cli: Composed) {
  const cast = cli.buildCastConsultation(
    query('Should the granary at Greyfen Hold be rebuilt before winter?'),
    castByPicks(
      cli,
      Array.from({ length: 18 }, () => 1),
    ),
    'automatic',
  )
  await cli.keepCastConsultation(cast)
  const onADay = await cli.recordConsultation(
    query("Will Steward Aelric's embassy to Westmill succeed?"),
    day(2026, 11, 2),
    [8, 8, 7, 6, 7, 9],
  )
  const atAMoment = await cli.recordConsultation(
    query('Will the Élan festival at Thornbury\ndraw the river guilds?'),
    moment('2026-10-28T07:30:00.000+08:00'),
    [7, 8, 7, 8, 7, 8],
  )
  return { cast, onADay, atAMoment }
}

/** The Clock's reads for `keepThree`: one per keep, each building its Id. */
const keepingMoments = [
  moment('2026-11-02T21:14:00.000+08:00'),
  moment('2026-11-03T09:00:00.000+08:00'),
  moment('2026-11-03T09:01:00.000+08:00'),
]

/** An Id that only an Unreadable file carries. */
const unreadableId = id('01M8AJDS3V7777777777777777')
const versionOneFile = `2026-11-03--${unreadableId}.md`
const noFrontmatterFile = 'notes-for-the-steward.md'

/** Plants two Unreadable files: a version-1 record and a file with no frontmatter. */
async function plantUnreadable(journalFolder: string) {
  await mkdir(journalFolder, { recursive: true })
  await writeFile(
    path.join(journalFolder, versionOneFile),
    `---\nschemaVersion: 1\nid: ${unreadableId}\n---\n\nAn old body.\n`,
  )
  await writeFile(
    path.join(journalFolder, noFrontmatterFile),
    'Remember to ask about the granary.\n',
  )
}

/** Every file in the folder, by name, with its bytes. */
async function snapshot(folder: string) {
  const listed = await readdir(folder)
  const names = listed.toSorted()
  return Promise.all(
    names.map(async (name) => ({
      name,
      bytes: await readFile(path.join(folder, name)),
    })),
  )
}

function byLocation(
  left: { readonly location: string },
  right: { readonly location: string },
) {
  return left.location < right.location ? -1 : 1
}

describe('composeCli for browsing and opening Consultations', () => {
  it('gives browseConsultations and openConsultation the signatures @hexagram/application gives them, minus their ports', () => {
    expectTypeOf<Composed['browseConsultations']>().toEqualTypeOf<
      (
        filter: Parameters<typeof browseConsultations>[1],
      ) => ReturnType<typeof browseConsultations>
    >()
    expectTypeOf<Composed['openConsultation']>().toEqualTypeOf<
      (
        id: Parameters<typeof openConsultation>[1],
      ) => ReturnType<typeof openConsultation>
    >()
  })
})

describe('a Journal kept, browsed and opened through composeCli and the Markdown Store', () => {
  it('browses what was kept and recorded, newest first, a Day above the moment of its date', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    const { cast, onADay, atAMoment } = await keepThree(cli)

    await expect(cli.browseConsultations('')).resolves.toStrictEqual({
      consultations: [onADay, cast, atAMoment],
      unreadable: [],
    })
  })

  it('browses moments in other offsets by their own dates first, a Day above the moments of its date', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    // 2026-11-02T01:00Z, a later instant than `onTheSecond`, on 1 November in
    // its own offset.
    const onTheFirst = await cli.recordConsultation(
      query('Will the invented bridge at Hollin Ford hold?'),
      moment('2026-11-01T20:00:00.000-05:00'),
      [7, 7, 8, 8, 7, 7],
    )
    const theFirst = await cli.recordConsultation(
      query('Should the invented beacon on Carrow Hill be relit?'),
      day(2026, 11, 1),
      [8, 7, 8, 7, 8, 7],
    )
    // 2026-11-01T11:00Z, on 2 November in its own offset.
    const onTheSecond = await cli.recordConsultation(
      query('Is the invented harbour at Saltreach safe this season?'),
      moment('2026-11-02T01:00:00.000+14:00'),
      [9, 8, 7, 6, 7, 8],
    )

    await expect(cli.browseConsultations('')).resolves.toStrictEqual({
      consultations: [onTheSecond, theFirst, onTheFirst],
      unreadable: [],
    })
  })

  it('a later Store over the same folder browses the same Journal', async () => {
    const journalFolder = await freshJournalFolder()
    const { cast, onADay, atAMoment } = await keepThree(
      cliOver(journalFolder, keepingMoments),
    )

    await expect(
      cliOver(journalFolder).browseConsultations(''),
    ).resolves.toStrictEqual({
      consultations: [onADay, cast, atAMoment],
      unreadable: [],
    })
  })

  it('narrows the list to the Queries that contain the filter, ignoring case', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    const { cast, onADay, atAMoment } = await keepThree(cli)

    const wills = await cli.browseConsultations('WILL')
    expect(wills.consultations).toStrictEqual([onADay, atAMoment])
    const granaries = await cli.browseConsultations('granary')
    expect(granaries.consultations).toStrictEqual([cast])
    const festivals = await cli.browseConsultations('élan')
    expect(festivals.consultations).toStrictEqual([atAMoment])
    const none = await cli.browseConsultations('Ostmere')
    expect(none.consultations).toStrictEqual([])
  })

  it('lists planted Unreadable files apart, each with its reason, whatever the filter', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    const { cast, onADay, atAMoment } = await keepThree(cli)
    await plantUnreadable(journalFolder)
    const expected = [
      { location: versionOneFile, reason: { kind: 'not-version-2' } },
      { location: noFrontmatterFile, reason: { kind: 'no-frontmatter' } },
    ].toSorted(byLocation)

    const all = await cli.browseConsultations('')
    expect(all.consultations).toStrictEqual([onADay, cast, atAMoment])
    expect(all.unreadable.toSorted(byLocation)).toStrictEqual(expected)

    const none = await cli.browseConsultations('Ostmere')
    expect(none.consultations).toStrictEqual([])
    expect(none.unreadable.toSorted(byLocation)).toStrictEqual(expected)
  })

  it('opens each kept Consultation as it was kept', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    const kept = await keepThree(cli)

    for (const consultation of Object.values(kept)) {
      await expect(
        cli.openConsultation(consultation.id),
      ).resolves.toStrictEqual(consultation)
    }
  })

  it('opens nothing for an Id the Journal does not hold, nor for one only an Unreadable file carries', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    await keepThree(cli)
    await plantUnreadable(journalFolder)

    await expect(
      cli.openConsultation(id('01M8AJDS3V0000000000000000')),
    ).resolves.toBeUndefined()
    await expect(cli.openConsultation(unreadableId)).resolves.toBeUndefined()
  })

  it('leaves every file, its name and its bytes, as it was after browsing and opening', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder, keepingMoments)
    const kept = await keepThree(cli)
    await plantUnreadable(journalFolder)
    const before = await snapshot(journalFolder)

    await cli.browseConsultations('')
    await cli.browseConsultations('granary')
    const opened: (Consultation | undefined)[] = []
    for (const consultation of Object.values(kept)) {
      opened.push(await cli.openConsultation(consultation.id))
    }
    opened.push(await cli.openConsultation(unreadableId))

    expect(
      opened.filter((consultation) => consultation !== undefined),
    ).toHaveLength(3)
    expect(await snapshot(journalFolder)).toStrictEqual(before)
  })

  it('browses a missing Journal folder as an empty Journal, and does not create it', async () => {
    const journalFolder = await freshJournalFolder()
    const cli = cliOver(journalFolder)

    await expect(cli.browseConsultations('')).resolves.toStrictEqual({
      consultations: [],
      unreadable: [],
    })
    await expect(
      cli.openConsultation(id('01M8AJDS3V0000000000000000')),
    ).resolves.toBeUndefined()
    await expect(stat(journalFolder)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
