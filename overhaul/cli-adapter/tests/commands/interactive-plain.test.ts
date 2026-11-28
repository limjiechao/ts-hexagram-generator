import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import { isQuery } from '@hexagram/consultation-journal/query'
import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import {
  divide,
  emptyCasting,
  nextRound,
  type NextRound,
} from '@hexagram/oracle/division'
import type { LinePosition } from '@hexagram/oracle/line-position'
import type { Pick } from '@hexagram/oracle/pick'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import {
  consultationFileName,
  markdownConsultationStore,
} from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import type { CommandPorts } from '#src/commands/entry-point.js'
import { run, usage } from '#src/commands/hexagram-interactive.js'
import { journalFailureLine } from '#src/commands/maintenance-reports.js'
import {
  blankQueryLine,
  castingUnfinishedLine,
  consultationKeptLine,
  invalidPickLine,
  lineHeading,
  pickPrompt,
  portFailureLine,
  queryNotGivenLine,
  queryPrompt,
  stdinUnreadableLine,
  stdoutUnwritableLine,
  welcomeText,
} from '#src/commands/plain-casting-wording.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'
import { paletteFor, type Palette } from '#src/readout/palette.js'
import { plainReadout } from '#src/readout/plain-readout.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

import { readoutCases, readoutFixture } from '../support/readout-cases.js'
import {
  ctrlC,
  scriptedTerminal,
  stdinEnds,
  stdinFails,
  typed,
  type ScriptedTerminal,
  type Step,
} from '../support/scripted-terminal.js'

// `hexagram-interactive` in plain mode (CLI manual, sections 6.3, 6.4 and
// 7): the welcome, the Query, then Virtual Division by a typed Pick for
// each of the eighteen Rounds. Driven in process through its entry point
// over a Journal in a fresh folder under the system's temporary directory,
// never the repository's own Journal. The Picks typed are those of the
// Readout fixtures' all-moving case, which is Virtual, and the Clock reads
// its Divined At, so stdout can be compared with that fixture byte for
// byte. Every Query is invented.

const line = (text: string): string => `${text}\n`

function castCase(name: string): CastConsultation {
  const found = readoutCases.find((each) => each.name === name)
  if (found?.consultation.origin !== 'cast')
    throw new Error(`no cast Readout case ${name}`)
  return found.consultation
}

/** 乾 → 坤, every Line moving, cast by Virtual Division. */
const allMoving = castCase('cast-all-moving')
const allMovingFixture = readoutFixture('plain-cast-all-moving.txt')
const allMovingNoColour = readoutFixture('plain-cast-all-moving.no-colour.txt')

/** The eighteen Picks of a Casting, Round by Round from Line 1. */
const picksOf = (casting: CompleteCasting): readonly Pick[] =>
  casting.rounds.flat().map((round) => round.pick)

const allMovingPicks = picksOf(allMoving.casting)

/** Crockford's base 32, the ULID alphabet (ADR-0046). */
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** The ten time characters of a ULID for this millisecond. */
function timeCharacters(epochMilliseconds: number): string {
  let text = ''
  let remaining = epochMilliseconds
  for (let at = 0; at < 10; at += 1) {
    text = crockford.charAt(remaining % 32) + text
    remaining = Math.floor(remaining / 32)
  }
  return text
}

/** The random part of the fixtures' Consultation Ids. */
const idRandomPart = '4T7V2M5N6P0R1S2K'

/**
 * Every draw a run makes: the Consultation Id's sixteen. Virtual Division
 * takes its Picks from the user, so a run that drew for a Pick would run
 * dry and fail.
 */
const idDraws = [...idRandomPart].map((symbol) => crockford.indexOf(symbol))

/** The Casting these eighteen Picks make, divided through the Oracle. */
function castingOf(picks: readonly Pick[]): CompleteCasting {
  let casting: PartialCasting = emptyCasting
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') throw new Error(`refused Pick ${pick}`)
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('fewer than eighteen Picks')
}

/** The valid Picks of the Round these Picks lead to, from the Oracle. */
function validPicksAfter(picks: readonly Pick[]): NextRound['validPicks'] {
  let casting: PartialCasting = emptyCasting
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided' || result.casting.state !== 'partial')
      throw new Error(`no Round follows Pick ${pick}`)
    casting = result.casting
  }
  const next = nextRound(casting)
  if (next.outcome !== 'next') throw new Error('the Casting did not replay')
  return next.round.validPicks
}

const linePositions: readonly LinePosition[] = [1, 2, 3, 4, 5, 6]

/**
 * What stderr holds for the Round at `index` (0 to 17) of a Casting by
 * these Picks: its Line's heading before the Line's first Round, then the
 * Pick prompt, each refused answer's line and the prompt again, and the
 * newline the run writes where the terminal echoed none.
 */
function roundText(
  picks: readonly Pick[],
  index: number,
  palette: Palette,
  options: { readonly newline: boolean; readonly refused?: number },
): string {
  const validPicks = validPicksAfter(picks.slice(0, index))
  const position = linePositions[Math.floor(index / 3)]
  if (position === undefined) throw new Error(`no Round ${index}`)
  const heading = index % 3 === 0 ? lineHeading(position, palette) : ''
  const asked = pickPrompt(validPicks) + (options.newline ? '\n' : '')
  const refusal = asked + line(invalidPickLine(validPicks))
  return heading + refusal.repeat(options.refused ?? 0) + asked
}

/**
 * stderr for the first `count` Rounds, each Pick answered at once, save
 * that the Round at `refusedAt` first refuses `refused` answers.
 */
function roundsText(
  count: number,
  palette: Palette,
  options: {
    readonly newline: boolean
    readonly picks?: readonly Pick[]
    readonly refusedAt?: number
    readonly refused?: number
  },
): string {
  const picks = options.picks ?? allMovingPicks
  let text = ''
  for (let index = 0; index < count; index += 1)
    text += roundText(picks, index, palette, {
      newline: options.newline,
      refused: index === options.refusedAt ? options.refused : 0,
    })
  return text
}

/** The Cast Consultation a run keeps of this Query and Casting, by Virtual Division. */
function expectedConsultation(
  query: string = allMoving.query,
  casting: CompleteCasting = allMoving.casting,
): CastConsultation {
  if (!isQuery(query)) throw new Error('a blank Query')
  const id = `${timeCharacters(allMoving.divinedAt.epochMilliseconds)}${idRandomPart}`
  if (!isConsultationId(id)) throw new Error(`${id} is no ULID`)
  return {
    ...allMoving,
    id,
    query,
    casting,
    transformation: casting.transformation,
    divisionMethod: 'virtual',
  }
}

/** The plain Readout of a Consultation, from the bundled Catalogue. */
async function readoutOf(
  consultation: CastConsultation,
  preference: ReadingPreference = defaultReadingPreference,
): Promise<string> {
  const readout = await consultationReadoutFor(
    { scriptureCatalogue: bundledScriptureCatalogue },
    consultation,
    preference,
  )
  return plainReadout(readout, { colour: true })
}

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

/** A Journal folder, not yet created, in a fresh temporary folder. */
async function temporaryJournal(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'interactive-plain-'))
  folders.push(root)
  return path.join(root, 'journal')
}

/** A Journal folder that cannot be created: its parent is a file. */
async function unwritableJournal(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'interactive-plain-'))
  folders.push(root)
  await writeFile(path.join(root, 'a-file'), 'not a folder\n')
  return path.join(root, 'a-file', 'journal')
}

async function filesIn(folder: string): Promise<readonly string[]> {
  try {
    const names = await readdir(folder)
    return names.toSorted()
  } catch {
    return []
  }
}

/** What a fresh Store reads back from the Journal folder. */
function keptIn(journalFolder: string) {
  const store = markdownConsultationStore({
    journalFolder,
    renderBody: markdownBodyRenderer({
      scriptureCatalogue: bundledScriptureCatalogue,
    }),
  })
  return store.consultationStore.list()
}

/** The Consultations a fresh Store reads back from the Journal folder. */
async function keptConsultations(journalFolder: string) {
  const { consultations } = await keptIn(journalFolder)
  return consultations
}

interface PortOptions {
  readonly journalFolder: string
  readonly draws?: readonly number[]
  readonly clock?: Clock['now']
  /** The Catalogue the run reads; the Store's bodies always use the bundled one. */
  readonly scriptureCatalogue?: ScriptureCatalogue
  /** Called as the Store's keep begins. */
  readonly onKeep?: () => void
}

/**
 * The run's ports: the real Markdown Store over the Journal folder, the
 * bundled Catalogue, a Clock that reads the all-moving case's Divined At
 * and a Random Source that gives the scripted draws in turn. Every use is
 * recorded by port, the Journal folder included.
 */
function portsOver(options: PortOptions, touched: string[]): CommandPorts {
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
  const draws = options.draws ?? idDraws
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
  const now = options.clock ?? (() => allMoving.divinedAt)
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
    scriptureCatalogue,
    consultationStore,
    randomSource,
    clock,
    get journalFolder(): string {
      touched.push('Journal folder')
      return journalFolder
    },
    moveToLegacy: maintenance,
    rerenderBodies: maintenance,
  }
}

interface RunOptions extends PortOptions {
  readonly isTTY?: boolean
  readonly env?: { readonly NO_COLOR?: string; readonly CI?: string }
  readonly stdoutFailsAfterWrite?: Error
  readonly stderrFailsAfterWrite?: Error
  readonly stdoutFailsLate?: Error
  readonly stdinIsTTY?: boolean
  /** Called as the Store's keep begins, with the terminal. */
  readonly duringKeep?: (terminal: ScriptedTerminal) => void
}

/**
 * Runs `hexagram-interactive` until it resolves or rejects, and checks it
 * let go of the terminal either way.
 */
async function settleInteractive(
  argv: readonly string[],
  script: readonly Step[],
  options: RunOptions,
) {
  const terminal = scriptedTerminal({
    isTTY: options.isTTY ?? false,
    env: options.env,
    script,
    stdoutFailsAfterWrite: options.stdoutFailsAfterWrite,
    stderrFailsAfterWrite: options.stderrFailsAfterWrite,
    stdoutFailsLate: options.stdoutFailsLate,
    stdinIsTTY: options.stdinIsTTY,
  })
  const touched: string[] = []
  const [outcome] = await Promise.allSettled([
    run(
      argv,
      terminal.io,
      portsOver(
        {
          ...options,
          onKeep: () => options.duringKeep?.(terminal),
        },
        touched,
      ),
    ),
  ])
  expect(terminal.listening()).toEqual({
    data: 0,
    end: 0,
    stdinError: 0,
    stdoutError: 0,
    stderrError: 0,
    interrupt: 0,
  })
  expect(terminal.unheardInterrupts()).toBe(0)
  expect(terminal.unheardErrors()).toBe(0)
  return {
    outcome,
    stdout: terminal.stdout(),
    stderr: terminal.stderr(),
    pauses: terminal.pauses(),
    touched: [...new Set(touched)],
  }
}

/** Runs `hexagram-interactive` to its exit code and checks it let go of the terminal. */
async function runInteractive(
  argv: readonly string[],
  script: readonly Step[],
  options: RunOptions,
) {
  const { outcome, ...ended } = await settleInteractive(argv, script, options)
  if (outcome.status === 'rejected') throw outcome.reason
  return { exitCode: outcome.value, ...ended }
}

/** The kept line for a Consultation kept in this Journal folder. */
function keptLine(
  journalFolder: string,
  consultation: CastConsultation,
  colour = true,
): string {
  return line(
    consultationKeptLine(
      path.join(journalFolder, consultationFileName(consultation)),
      paletteFor(colour),
    ),
  )
}

const colourful = paletteFor(true)
const welcome = welcomeText(colourful)
/** The Query prompt and the newline written when the terminal echoed none. */
const promptLine = line(queryPrompt)
/** stderr for all eighteen Rounds, each Pick piped in. */
const allRounds = roundsText(18, colourful, { newline: true })

const command = 'hexagram-interactive'
const notGiven = line(queryNotGivenLine(command))
const blank = line(blankQueryLine)
const unfinished = line(castingUnfinishedLine(command))
const stdinUnreadable = line(stdinUnreadableLine(command))
const stdoutUnwritable = line(stdoutUnwritableLine(command))
const catalogueFailed = line(
  portFailureLine(command, 'the Scripture Catalogue cannot be read'),
)
const clockFailed = line(portFailureLine(command, 'the Clock cannot be read'))
const randomFailed = line(portFailureLine(command, 'the Random Source failed'))
const journalFailed = line(journalFailureLine(command, 'written'))

const asked = (query: string = allMoving.query): Step => typed(`${query}\n`)
/** Each Pick typed on its own line, then Enter. */
const picked = (picks: readonly Pick[] = allMovingPicks): Step[] =>
  picks.map((pick) => typed(`${String(pick)}\n`))
/** The Query and the eighteen Picks of the all-moving case. */
const wholeCasting = (): Step[] => [asked(), ...picked()]

/** A closed pipe's write error, as Node reports it. */
function brokenPipe(): Error {
  return Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })
}

function editionId(text: string) {
  if (!isEditionId(text)) throw new Error(`${text} is no EditionId`)
  return text
}

/**
 * A list that resolves as a value but throws `error` at any use: the
 * failure comes after the port has answered, so no port failed.
 */
function throwingList(error: Error): never[] {
  return new Proxy<never[]>([], {
    get: (_target, key) => {
      // Not thenable, so it resolves as a value.
      if (key === 'then') return
      throw error
    },
  })
}

describe('the Picks of the all-moving case', () => {
  it('are eighteen, and each Round begins from the Oracle’s valid Picks', () => {
    expect(allMovingPicks).toHaveLength(18)
    expect(validPicksAfter([])).toEqual({ min: 1, max: 47 })
  })
})

describe('hexagram-interactive in plain mode: the Readout and the keep', () => {
  it.each([
    { shown: 'stdout not a TTY', argv: [], isTTY: false },
    { shown: '--plain with stdout not a TTY', argv: ['--plain'], isTTY: false },
    { shown: '--plain on a TTY', argv: ['--plain'], isTTY: true },
    { shown: '--no-ui on a TTY', argv: ['--no-ui'], isTTY: true },
  ])(
    '$shown: stdout is the fixture byte for byte; stderr the welcome, the prompts, a heading per Line and the kept line; the file under consultationFileName, Division Method Virtual',
    async ({ argv, isTTY }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive(argv, [...wholeCasting(), stdinEnds], {
        journalFolder,
        isTTY,
      })

      const expected = expectedConsultation()
      expect(ended.stdout).toBe(allMovingFixture)
      expect(ended.stderr).toBe(
        welcome + promptLine + allRounds + keptLine(journalFolder, expected),
      )
      expect(ended.exitCode).toBe(0)
      expect(ended.pauses).toBeGreaterThan(0)
      expect(await filesIn(journalFolder)).toEqual([
        consultationFileName(expected),
      ])
      expect(await keptIn(journalFolder)).toStrictEqual({
        consultations: [expected],
        unreadable: [],
      })
    },
  )

  it('NO_COLOR: stdout is the fixture’s no-colour twin; the welcome, headings and kept line carry no escape code', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      env: { NO_COLOR: '1' },
    })

    const plain = paletteFor(false)
    const expected = expectedConsultation()
    expect(ended.stdout).toBe(allMovingNoColour)
    expect(ended.stderr).toBe(
      welcomeText(plain) +
        promptLine +
        roundsText(18, plain, { newline: true }) +
        keptLine(journalFolder, expected, false),
    )
    expect(ended.stderr).not.toContain('\u001B')
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('the Query and every Pick in one chunk are read line by line', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [typed([allMoving.query, ...allMovingPicks.map(String), ''].join('\n'))],
      { journalFolder },
    )

    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([
      expectedConsultation(),
    ])
  })

  it('a last Pick with no newline still counts', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [asked(), ...picked(allMovingPicks.slice(0, 17)), typed('1'), stdinEnds],
      { journalFolder },
    )

    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('a Pick line ending in CR LF is read without the CR', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [asked(), ...allMovingPicks.map((pick) => typed(`${String(pick)}\r\n`))],
      { journalFolder },
    )

    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('a Pick with spaces around it is accepted: ` 12 ` is Pick 12', async () => {
    const picks = [12, ...allMovingPicks.slice(1)]
    const casting = castingOf(picks)
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [asked(), typed(' 12 \n'), ...picked(picks.slice(1))],
      { journalFolder },
    )

    const expected = expectedConsultation(allMoving.query, casting)
    expect(ended.stdout).toBe(await readoutOf(expected))
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        roundsText(18, colourful, { newline: true, picks }) +
        keptLine(journalFolder, expected),
    )
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('a Pick prompt names each Round’s own valid Picks, the largest valid Pick accepted', async () => {
    // Line 1's first Round takes its largest valid Pick, 47.
    const picks = [47, ...allMovingPicks.slice(1)]
    const casting = castingOf(picks)
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], [asked(), ...picked(picks)], {
      journalFolder,
    })

    const expected = expectedConsultation(allMoving.query, casting)
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        roundsText(18, colourful, { newline: true, picks }) +
        keptLine(journalFolder, expected),
    )
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('a blank Query is asked again, after the welcome once', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [typed('   \n'), ...wholeCasting()],
      { journalFolder },
    )

    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        blank +
        promptLine +
        allRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('ignores the options that apply to the full-screen Viewer only', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      ['--wrap-width', '40', '--numeric-input', '--slider-sweep-ms', '1'],
      wholeCasting(),
      { journalFolder },
    )

    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('Ctrl+C after the last Pick, while the keep runs, is ignored: the Consultation is kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      duringKeep: (terminal) => {
        terminal.interruptNow()
      },
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome + promptLine + allRounds + keptLine(journalFolder, expected),
    )
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

describe('hexagram-interactive in plain mode: a Pick that is refused is asked again', () => {
  const firstRound = validPicksAfter([])

  it.each([
    { shown: 'zero', answer: '0' },
    {
      shown: 'one past the largest valid Pick',
      answer: String(firstRound.max + 1),
    },
    { shown: 'a decimal', answer: '4.0' },
    { shown: 'an exponent', answer: '1e1' },
    { shown: 'a hexadecimal', answer: '0x10' },
    { shown: 'an empty line', answer: '' },
    { shown: 'a spaces-only line', answer: '   ' },
    { shown: 'a negative', answer: '-3' },
    { shown: 'a plus sign', answer: '+3' },
    { shown: 'a word', answer: 'one' },
    { shown: 'full-width digits', answer: '１２' },
    { shown: 'two numbers', answer: '1 2' },
  ])(
    '$shown ($answer) at Line 1’s first Round: the invalid-Pick line, the same prompt again',
    async ({ answer }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive(
        [],
        [asked(), typed(`${answer}\n`), ...picked()],
        { journalFolder },
      )

      expect(ended.stderr).toBe(
        welcome +
          promptLine +
          roundsText(18, colourful, {
            newline: true,
            refusedAt: 0,
            refused: 1,
          }) +
          keptLine(journalFolder, expectedConsultation()),
      )
      expect(ended.stdout).toBe(allMovingFixture)
      expect(ended.exitCode).toBe(0)
      expect(await keptConsultations(journalFolder)).toStrictEqual([
        expectedConsultation(),
      ])
    },
  )

  it('a Pick valid in the first Round but past the second Round’s largest is refused there', async () => {
    const secondRound = validPicksAfter(allMovingPicks.slice(0, 1))
    expect(secondRound.max).toBeLessThan(firstRound.max)
    const tooLarge = String(secondRound.max + 1)
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [
        asked(),
        ...picked(allMovingPicks.slice(0, 1)),
        typed(`${tooLarge}\n`),
        ...picked(allMovingPicks.slice(1)),
      ],
      { journalFolder },
    )

    const expectedRounds = roundsText(18, colourful, {
      newline: true,
      refusedAt: 1,
      refused: 1,
    })
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        expectedRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.stderr).toContain(invalidPickLine(secondRound))
    expect(ended.exitCode).toBe(0)
  })

  it('several refused Picks in a row: the invalid-Pick line after each, then the Pick accepted', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [
        asked(),
        typed('0\n'),
        typed('4.0\n'),
        typed('\n'),
        typed(' 1 \n'),
        ...picked(allMovingPicks.slice(1)),
      ],
      { journalFolder },
    )

    const expectedRounds = roundsText(18, colourful, {
      newline: true,
      refusedAt: 0,
      refused: 3,
    })
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        expectedRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.exitCode).toBe(0)
  })

  it('a CR inside a Pick line is refused', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [asked(), typed('1\r2\n'), ...picked()],
      { journalFolder },
    )

    expect(ended.stderr).toContain(line(invalidPickLine(firstRound)))
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.exitCode).toBe(0)
  })
})

describe('hexagram-interactive in plain mode: endings before the Query', () => {
  it.each([
    {
      shown: 'at once',
      script: [stdinEnds],
      stderr: welcome + promptLine + notGiven,
    },
    {
      shown: 'after a blank line',
      script: [typed('\n'), stdinEnds],
      stderr: welcome + promptLine + blank + promptLine + notGiven,
    },
  ])(
    'stdin ends $shown: the welcome once, the Query-not-given line, exit 1, nothing kept, no port touched',
    async ({ script, stderr }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive([], script, { journalFolder })

      expect(ended.stderr).toBe(stderr)
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(ended.touched).toEqual([])
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it('Ctrl+C at the Query prompt quits: the welcome, the prompt, one newline, exit 0, nothing kept, no port touched', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], [ctrlC], { journalFolder })

    expect(ended.stderr).toBe(welcome + promptLine)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(0)
    expect(ended.touched).toEqual([])
    expect(ended.pauses).toBeGreaterThan(0)
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })

  it('stdin cannot be read at the Query prompt: its line, exit 1, nothing kept, no port touched', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      [],
      [stdinFails(new Error('EBADF: bad file descriptor, read'))],
      { journalFolder },
    )

    expect(ended.stderr).toBe(welcome + promptLine + stdinUnreadable)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).toEqual([])
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })
})

describe('hexagram-interactive in plain mode: Ctrl+C at a Pick prompt', () => {
  it.each([
    { shown: 'Line 1’s first Round', answered: 0 },
    { shown: 'Line 2’s second Round', answered: 4 },
    { shown: 'Line 6’s last Round', answered: 17 },
  ])(
    'at $shown, stdin not a TTY: the prompt, one newline, exit 0, nothing kept',
    async ({ answered }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive(
        [],
        [asked(), ...picked(allMovingPicks.slice(0, answered)), ctrlC],
        { journalFolder },
      )

      expect(ended.stderr).toBe(
        welcome +
          promptLine +
          roundsText(answered + 1, colourful, { newline: true }),
      )
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(0)
      expect(ended.touched).not.toContain('Consultation Store')
      expect(ended.pauses).toBeGreaterThan(0)
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it('after a refused Pick: the prompt again, one newline, exit 0, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], [asked(), typed('0\n'), ctrlC], {
      journalFolder,
    })

    const firstRound = validPicksAfter([])
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        lineHeading(1, colourful) +
        line(pickPrompt(firstRound)) +
        line(invalidPickLine(firstRound)) +
        line(pickPrompt(firstRound)),
    )
    expect(ended.exitCode).toBe(0)
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })

  it('stdin a TTY: the answered prompts echoed, the interrupted one gets one newline, never two', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      ['--plain'],
      [asked(), ...picked(allMovingPicks.slice(0, 4)), ctrlC],
      { journalFolder, isTTY: true, stdinIsTTY: true },
    )

    expect(ended.stderr).toBe(
      welcome +
        queryPrompt +
        roundsText(4, colourful, { newline: false }) +
        roundText(allMovingPicks, 4, colourful, { newline: true }),
    )
    expect(ended.exitCode).toBe(0)
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })
})

describe('hexagram-interactive in plain mode: stdin ends mid-Casting', () => {
  it.each([
    { shown: 'before the first Pick', answered: 0 },
    { shown: 'after five Picks', answered: 5 },
    { shown: 'after seventeen Picks', answered: 17 },
  ])(
    '$shown: a newline after the prompt, the Casting-unfinished line, exit 1, nothing kept',
    async ({ answered }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive(
        [],
        [asked(), ...picked(allMovingPicks.slice(0, answered)), stdinEnds],
        { journalFolder },
      )

      expect(ended.stderr).toBe(
        welcome +
          promptLine +
          roundsText(answered + 1, colourful, { newline: true }) +
          unfinished,
      )
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(ended.touched).not.toContain('Consultation Store')
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it('a refused last line ended by stdin’s end: the invalid-Pick line, the prompt again, then the Casting-unfinished line', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], [asked(), typed('abc'), stdinEnds], {
      journalFolder,
    })

    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        roundText(allMovingPicks, 0, colourful, {
          newline: true,
          refused: 1,
        }) +
        unfinished,
    )
    expect(ended.exitCode).toBe(1)
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })

  it('stdin a TTY: the answered prompts echoed, the prompt stdin ended at gets one newline', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      ['--plain'],
      [asked(), ...picked(allMovingPicks.slice(0, 5)), stdinEnds],
      { journalFolder, isTTY: true, stdinIsTTY: true },
    )

    expect(ended.stderr).toBe(
      welcome +
        queryPrompt +
        roundsText(5, colourful, { newline: false }) +
        roundText(allMovingPicks, 5, colourful, { newline: true }) +
        unfinished,
    )
    expect(ended.exitCode).toBe(1)
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })
})

describe('hexagram-interactive in plain mode: a newline wherever the terminal echoed none', () => {
  it('stdin a TTY, every answer typed: no newline after any prompt', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(['--plain'], wholeCasting(), {
      journalFolder,
      isTTY: true,
      stdinIsTTY: true,
    })

    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome +
        queryPrompt +
        roundsText(18, colourful, { newline: false }) +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('stdin a TTY, a refused Pick: neither prompt gets a newline', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      ['--plain'],
      [asked(), typed('0\n'), ...picked()],
      { journalFolder, isTTY: true, stdinIsTTY: true },
    )

    const expectedRounds = roundsText(18, colourful, {
      newline: false,
      refusedAt: 0,
      refused: 1,
    })
    expect(ended.stderr).toBe(
      welcome +
        queryPrompt +
        expectedRounds +
        keptLine(journalFolder, expectedConsultation()),
    )
  })

  it('stdin a TTY, the last Pick ended by stdin’s end, not Enter: a newline after its prompt', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      ['--plain'],
      [asked(), ...picked(allMovingPicks.slice(0, 17)), typed('1'), stdinEnds],
      { journalFolder, isTTY: true, stdinIsTTY: true },
    )

    expect(ended.stderr).toBe(
      welcome +
        queryPrompt +
        roundsText(17, colourful, { newline: false }) +
        roundText(allMovingPicks, 17, colourful, { newline: true }) +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.exitCode).toBe(0)
  })
})

describe('hexagram-interactive in plain mode: a failing port', () => {
  it('the Random Source fails while the Consultation Id is built: its line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      draws: idDraws.slice(0, -1),
    })

    expect(ended.stderr).toBe(welcome + promptLine + allRounds + randomFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).not.toContain('Consultation Store')
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Clock fails: its line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      clock: () => {
        throw new Error('the invented clock stopped')
      },
    })

    expect(ended.stderr).toBe(welcome + promptLine + allRounds + clockFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).not.toContain('Consultation Store')
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Clock reads a Moment a Consultation Id cannot hold: the Clock line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      clock: () => ({
        precision: 'moment',
        epochMilliseconds: 2 ** 48,
        offset: allMoving.divinedAt.offset,
      }),
    })

    expect(ended.stderr).toBe(welcome + promptLine + allRounds + clockFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Catalogue fails for the Readout: its line, then the kept line, exit 1, stdout empty, the Consultation kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        passageTexts: () => Promise.reject(new Error('the Catalogue failed')),
      },
    })

    const expected = expectedConsultation()
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        catalogueFailed +
        keptLine(journalFolder, expected),
    )
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('the keep fails: the Readout already on stdout, then the Journal line, exit 1', async () => {
    const journalFolder = await unwritableJournal()
    const ended = await runInteractive([], wholeCasting(), { journalFolder })

    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(welcome + promptLine + allRounds + journalFailed)
    expect(ended.exitCode).toBe(1)
  })

  it('the Catalogue fails, then the keep: both lines in that order, exit 1, stdout empty', async () => {
    const journalFolder = await unwritableJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        passageTexts: () => Promise.reject(new Error('the Catalogue failed')),
      },
    })

    expect(ended.stderr).toBe(
      welcome + promptLine + allRounds + catalogueFailed + journalFailed,
    )
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
  })

  it('an error from no port while the Readout is built: the keep still runs, then the run rejects with that error', async () => {
    const bug = new Error('an invented bug in building the Readout')
    const journalFolder = await temporaryJournal()
    const ended = await settleInteractive([], wholeCasting(), {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        trigramNames: () => Promise.resolve(throwingList(bug)),
      },
    })

    const expected = expectedConsultation()
    expect(ended.outcome.status === 'rejected' && ended.outcome.reason).toBe(
      bug,
    )
    expect(ended.stdout).toBe('')
    expect(ended.stderr).toBe(
      welcome + promptLine + allRounds + keptLine(journalFolder, expected),
    )
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

describe('hexagram-interactive in plain mode: a stream that fails', () => {
  it('stdin fails after the last Pick: heard and ignored, the Consultation kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      duringKeep: (terminal) => {
        terminal.stdinFailsNow(new Error('an invented read error'))
      },
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome + promptLine + allRounds + keptLine(journalFolder, expected),
    )
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails (EPIPE) on the tick after the Readout: the keep completes, its line, then the stdout line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      stdoutFailsAfterWrite: brokenPipe(),
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        keptLine(journalFolder, expected) +
        stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails (EPIPE) while the keep is pending: the keep completes, its line, then the stdout line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      duringKeep: (terminal) => {
        terminal.stdoutFailsNow(brokenPipe())
      },
    })

    const expected = expectedConsultation()
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        keptLine(journalFolder, expected) +
        stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails after write returns and before its callback: the Readout, the kept line, the stdout line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      stdoutFailsLate: brokenPipe(),
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome +
        promptLine +
        allRounds +
        keptLine(journalFolder, expected) +
        stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails (EPIPE) and the keep fails: the Journal line, then the stdout line, exit 1', async () => {
    const journalFolder = await unwritableJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      stdoutFailsAfterWrite: brokenPipe(),
    })

    expect(ended.stderr).toBe(
      welcome + promptLine + allRounds + journalFailed + stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
  })

  it('stderr fails at the welcome: heard and ignored, the Consultation kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive([], wholeCasting(), {
      journalFolder,
      stderrFailsAfterWrite: brokenPipe(),
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(allMovingFixture)
    expect(ended.stderr).toBe(
      welcome + promptLine + allRounds + keptLine(journalFolder, expected),
    )
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

describe('hexagram-interactive in plain mode: the Reading Preference options, checked while parsing', () => {
  it.each([
    {
      argv: ['--translation', 'wilhelm-baynes-1967'],
      preference: { translations: [editionId('wilhelm-baynes-1967')] },
    },
    {
      argv: ['--commentary', 'wenyan', '--commentary', 'tuan'],
      preference: { commentaries: ['wenyan', 'tuan'] as const },
    },
    {
      argv: ['--script', 'simplified', '--yilin'],
      preference: { script: 'simplified', yilinVerse: true } as const,
    },
  ])(
    '$argv: the Readout in that Reading Preference',
    async ({ argv, preference }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive(argv, wholeCasting(), {
        journalFolder,
      })

      const expected = expectedConsultation()
      expect(ended.stdout).toBe(
        await readoutOf(expected, {
          ...defaultReadingPreference,
          ...preference,
        }),
      )
      expect(ended.stderr).toBe(
        welcome + promptLine + allRounds + keptLine(journalFolder, expected),
      )
      expect(ended.exitCode).toBe(0)
    },
  )

  it.each([
    {
      shown: 'an unknown --translation',
      argv: ['--translation', 'legge-1883'],
    },
    {
      shown: 'a Chinese EditionId as a --translation',
      argv: ['--translation', 'wuyingdian-1739'],
    },
    {
      shown: 'a --translation given twice',
      argv: ['--translation', 'legge-1882', '--translation', 'legge-1882'],
    },
    { shown: 'an unknown --commentary', argv: ['--commentary', 'bogus'] },
    {
      shown: 'a --commentary given twice',
      argv: ['--commentary', 'daxiang', '--commentary', 'daxiang'],
    },
  ])(
    '$shown: the usage line before the welcome, exit 1, only the Catalogue touched',
    async ({ argv }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runInteractive(argv, wholeCasting(), {
        journalFolder,
      })

      expect(ended.stderr).toBe(line(usage))
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(
        ended.touched.filter((port) => port !== 'Scripture Catalogue'),
      ).toEqual([])
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it('the Catalogue fails while a --translation is checked: its line before the welcome, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runInteractive(
      ['--translation', 'legge-1882'],
      wholeCasting(),
      {
        journalFolder,
        scriptureCatalogue: {
          ...bundledScriptureCatalogue,
          editions: () => Promise.reject(new Error('the Catalogue failed')),
        },
      },
    )

    expect(ended.stderr).toBe(catalogueFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).toEqual(['Scripture Catalogue'])
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })
})
