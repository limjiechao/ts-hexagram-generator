import type { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { describe, expect, it } from 'vitest'

import type {
  Command,
  CommandIo,
  CommandOutput,
  CommandPorts,
} from '#src/commands/entry-point.js'
import {
  run as historyRun,
  usage as historyUsage,
} from '#src/commands/hexagram-history.js'
import { run as interactiveRun } from '#src/commands/hexagram-interactive.js'
import { run as manualRun } from '#src/commands/hexagram-manual.js'
import { run as playgroundRun } from '#src/commands/hexagram-playground.js'
import { run as randomRun } from '#src/commands/hexagram-random.js'
import { run as homeRun } from '#src/commands/hexagram.js'
import { notBuiltLine } from '#src/commands/not-built.js'

// The bins, spawned as real processes, for the two columns of the terminal
// table a fake cannot stand in for: stdout not a TTY, and CI. A spawned
// child's stdout is a pipe, so every case here is also "stdout not a TTY".

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

interface Ended {
  readonly stdout: string
  readonly stderr: string
  readonly code: number | null
}

function runBin(
  command: string,
  argv: readonly string[],
  env: Readonly<Record<string, string>>,
): Promise<Ended> {
  // One node process with tsx as a loader, not the `.bin/tsx` launcher, which
  // re-spawns a grandchild whose pipes never close on Windows. The parent's
  // environment is kept so the OS can start node, with the variables the
  // table reads removed so each case sets exactly the ones it names.
  const childEnv: NodeJS.ProcessEnv = { ...process.env }
  delete childEnv.NO_COLOR
  delete childEnv.CI
  delete childEnv.FORCE_COLOR
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        '--conditions=source',
        path.join(packageRoot, 'src', 'bin', `${command}.ts`),
        ...argv,
      ],
      {
        cwd: packageRoot,
        env: { ...childEnv, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
    child.stdin.end()
  })
}

const line = (text: string): string => `${text}\n`

/** Every spawned case. None may reach a keep or a maintenance run. */
const rows: readonly {
  readonly case: string
  readonly command: string
  readonly argv: readonly string[]
  readonly env: Readonly<Record<string, string>>
  readonly expected: string
}[] = [
  {
    case: 'hexagram refuses with stdout not a TTY',
    command: 'hexagram',
    argv: [],
    env: {},
    expected: line('hexagram requires an interactive terminal'),
  },
  {
    case: 'hexagram-random is plain mode with stdout not a TTY',
    command: 'hexagram-random',
    argv: [],
    env: {},
    expected: line(notBuiltLine('hexagram-random', 'plain mode')),
  },
  {
    case: 'hexagram-manual refuses with stdout not a TTY',
    command: 'hexagram-manual',
    argv: [],
    env: {},
    expected: line('hexagram-manual requires an interactive terminal'),
  },
  {
    case: 'hexagram-playground refuses with CI',
    command: 'hexagram-playground',
    argv: [],
    env: { CI: 'true' },
    expected: line('hexagram-playground requires an interactive terminal'),
  },
  {
    case: 'hexagram-interactive is plain mode with CI',
    command: 'hexagram-interactive',
    argv: [],
    env: { CI: 'true' },
    expected: line(notBuiltLine('hexagram-interactive', 'plain mode')),
  },
  {
    case: 'hexagram-history browsing refuses with CI',
    command: 'hexagram-history',
    argv: [],
    env: { CI: 'true' },
    expected: line('hexagram-history requires an interactive terminal'),
  },
  {
    // A maintenance option a real process parses, refused before any
    // run: a spawned bin uses this checkout's own Journal.
    case: 'hexagram-history --rerender-bodies --yilin refuses with CI',
    command: 'hexagram-history',
    argv: ['--rerender-bodies', '--yilin'],
    env: { CI: 'true' },
    expected: line(historyUsage),
  },
]

describe.concurrent('the bins with stdout not a TTY, and with CI', () => {
  // No inline timeout: the first spawn pays node's start and tsx's first
  // transpile, which the base 30 s timeout (ADR-0013) is set to contain on a
  // contended Windows runner.
  it.each(rows)('$case', async ({ command, argv, env, expected }) => {
    const ended = await runBin(command, argv, env)
    expect(ended.stderr).toBe(expected)
    expect(ended.stdout).toBe('')
    expect(ended.code).toBe(1)
  })
})

// The guard on the rows above: each runs in process over ports that record
// any use, the Journal's folder included, as the spawned bin would see its
// terminal. A row that reached a keep or a maintenance run would touch one,
// so every row must end before any port is used.

const commands: Readonly<Record<string, Command>> = {
  hexagram: homeRun,
  'hexagram-random': randomRun,
  'hexagram-interactive': interactiveRun,
  'hexagram-manual': manualRun,
  'hexagram-playground': playgroundRun,
  'hexagram-history': historyRun,
}

/** Every port records its use and throws, the Journal's folder too. */
function recordingPorts(touched: string[]): CommandPorts {
  const untouched = (port: string) => (): never => {
    touched.push(port)
    throw new Error(`a spawned row reached the ${port}`)
  }
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: untouched('Scripture Catalogue'),
    hexagramNames: untouched('Scripture Catalogue'),
    receivedSequenceNumber: untouched('Scripture Catalogue'),
    trigramNames: untouched('Scripture Catalogue'),
    editions: untouched('Scripture Catalogue'),
  }
  const consultationStore: ConsultationStore = {
    keep: untouched('Consultation Store'),
    list: untouched('Consultation Store'),
    get: untouched('Consultation Store'),
    remove: untouched('Consultation Store'),
    deletionRecords: untouched('Consultation Store'),
  }
  const randomSource: RandomSource = {
    integerBelow: untouched('Random Source'),
  }
  const clock: Clock = { now: untouched('Clock') }
  return {
    scriptureCatalogue,
    consultationStore,
    randomSource,
    clock,
    get journalFolder(): string {
      touched.push('Journal folder')
      throw new Error('a spawned row reached the Journal folder')
    },
    moveToLegacy: untouched('Markdown Consultation Store'),
    rerenderBodies: untouched('Markdown Consultation Store'),
  }
}

function fakeOutput(chunks: string[]): CommandOutput {
  return {
    isTTY: false,
    write: (chunk) => {
      chunks.push(chunk)
      return true
    },
    on: () => {},
    off: () => {},
  }
}

describe('no spawned row reaches a keep or a maintenance run', () => {
  it.each(rows)('$case', async ({ command, argv, env, expected }) => {
    const run = commands[command]
    if (run === undefined) throw new Error(`no command ${command}`)
    const stdout: string[] = []
    const stderr: string[] = []
    const touched: string[] = []
    const io: CommandIo = {
      stdin: { isTTY: false, on: () => {}, off: () => {} },
      stdout: fakeOutput(stdout),
      stderr: fakeOutput(stderr),
      isTTY: false,
      rows: undefined,
      columns: undefined,
      env: { NO_COLOR: env.NO_COLOR, CI: env.CI },
    }
    const exitCode = await run(argv, io, recordingPorts(touched))
    expect(touched).toEqual([])
    expect(stderr.join('')).toBe(expected)
    expect(stdout.join('')).toBe('')
    expect(exitCode).toBe(1)
  })
})
