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
import * as historyCommand from '#src/commands/hexagram-history.js'
import * as interactiveCommand from '#src/commands/hexagram-interactive.js'
import * as manualCommand from '#src/commands/hexagram-manual.js'
import * as playgroundCommand from '#src/commands/hexagram-playground.js'
import * as randomCommand from '#src/commands/hexagram-random.js'
import * as homeCommand from '#src/commands/hexagram.js'
import { notBuiltLine } from '#src/commands/not-built.js'

// The command frame, driven in process: each command parses its options,
// applies the terminal table of the CLI manual (section 2), and ends in a
// refusal, a usage line or a not-built line. Every ending writes exactly one
// line to stderr, nothing to stdout, exits 1, and touches no port.

interface Recorded {
  readonly stdout: string[]
  readonly stderr: string[]
  readonly portsTouched: string[]
}

interface Terminal {
  readonly isTTY: boolean
  readonly rows: number | undefined
  readonly columns: number | undefined
  readonly env: CommandIo['env']
}

function fakeOutput(chunks: string[], terminal: Terminal): CommandOutput {
  return {
    isTTY: terminal.isTTY,
    rows: terminal.rows,
    columns: terminal.columns,
    write: (chunk) => {
      chunks.push(chunk)
      return true
    },
    on: () => {},
    off: () => {},
  }
}

function fakeIo(recorded: Recorded, terminal: Terminal): CommandIo {
  return {
    stdin: { isTTY: terminal.isTTY, on: () => {}, off: () => {} },
    stdout: fakeOutput(recorded.stdout, terminal),
    stderr: fakeOutput(recorded.stderr, terminal),
    isTTY: terminal.isTTY,
    rows: terminal.rows,
    columns: terminal.columns,
    env: terminal.env,
  }
}

/** Every port throws and is recorded: no frame ending may touch one. */
function untouchablePorts(touched: string[]): CommandPorts {
  const untouched = (port: string) => (): never => {
    touched.push(port)
    throw new Error(`the frame touched the ${port}`)
  }
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: untouched('Scripture Catalogue'),
    hexagramNames: untouched('Scripture Catalogue'),
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
    journalFolder: 'journal-folder-never-read',
    moveToLegacy: untouched('Markdown Consultation Store'),
  }
}

async function runCommand(
  command: Command,
  argv: readonly string[],
  terminal: Terminal,
): Promise<{ readonly exitCode: number } & Recorded> {
  const recorded: Recorded = { stdout: [], stderr: [], portsTouched: [] }
  const exitCode = await command(
    argv,
    fakeIo(recorded, terminal),
    untouchablePorts(recorded.portsTouched),
  )
  return { exitCode, ...recorded }
}

/** Asserts the one ending every frame path shares: one stderr line, exit 1. */
async function expectEnding(
  command: Command,
  argv: readonly string[],
  terminal: Terminal,
  expectedStderr: string,
): Promise<void> {
  const result = await runCommand(command, argv, terminal)
  expect(result.stderr.join('')).toBe(expectedStderr)
  expect(result.stdout.join('')).toBe('')
  expect(result.exitCode).toBe(1)
  expect(result.portsTouched).toEqual([])
}

const line = (text: string): string => `${text}\n`

const tty = (env: CommandIo['env'] = {}, rows = 40): Terminal => ({
  isTTY: true,
  rows,
  columns: 120,
  env,
})
const notTty = (env: CommandIo['env'] = {}): Terminal => ({
  isTTY: false,
  rows: undefined,
  columns: undefined,
  env,
})

const columns = {
  TTY: tty(),
  'TTY with NO_COLOR': tty({ NO_COLOR: '1' }),
  'TTY with CI': tty({ CI: 'true' }),
  'stdout not a TTY': notTty(),
} as const

type Column = keyof typeof columns

const columnNames: readonly Column[] = [
  'TTY',
  'TTY with NO_COLOR',
  'TTY with CI',
  'stdout not a TTY',
]

const refusal = (command: string): string =>
  line(`${command} requires an interactive terminal`)

const commands = [
  { name: 'hexagram', run: homeCommand.run, usage: homeCommand.usage },
  {
    name: 'hexagram-random',
    run: randomCommand.run,
    usage: randomCommand.usage,
  },
  {
    name: 'hexagram-interactive',
    run: interactiveCommand.run,
    usage: interactiveCommand.usage,
  },
  {
    name: 'hexagram-manual',
    run: manualCommand.run,
    usage: manualCommand.usage,
  },
  {
    name: 'hexagram-playground',
    run: playgroundCommand.run,
    usage: playgroundCommand.usage,
  },
  {
    name: 'hexagram-history',
    run: historyCommand.run,
    usage: historyCommand.usage,
  },
] as const

describe('the terminal table: each command with no options, in each column', () => {
  const table: readonly {
    readonly command: string
    readonly run: Command
    readonly cells: Readonly<Record<Column, string>>
  }[] = [
    {
      command: 'hexagram',
      run: homeCommand.run,
      cells: {
        TTY: line(notBuiltLine('hexagram', 'full-screen')),
        'TTY with NO_COLOR': line(
          notBuiltLine('hexagram', 'full-screen, no colour, typed input'),
        ),
        'TTY with CI': refusal('hexagram'),
        'stdout not a TTY': refusal('hexagram'),
      },
    },
    {
      command: 'hexagram-random',
      run: randomCommand.run,
      cells: {
        TTY: line(notBuiltLine('hexagram-random', 'full-screen')),
        'TTY with NO_COLOR': line(
          notBuiltLine('hexagram-random', 'full-screen, typed input'),
        ),
        'TTY with CI': line(
          notBuiltLine('hexagram-random', 'full-screen, typed input'),
        ),
        'stdout not a TTY': line(notBuiltLine('hexagram-random', 'plain mode')),
      },
    },
    {
      command: 'hexagram-interactive',
      run: interactiveCommand.run,
      cells: {
        TTY: line(notBuiltLine('hexagram-interactive', 'full-screen')),
        'TTY with NO_COLOR': line(
          notBuiltLine('hexagram-interactive', 'full-screen, typed input'),
        ),
        'TTY with CI': line(
          notBuiltLine('hexagram-interactive', 'full-screen, typed input'),
        ),
        'stdout not a TTY': line(
          notBuiltLine('hexagram-interactive', 'plain mode'),
        ),
      },
    },
    {
      command: 'hexagram-manual',
      run: manualCommand.run,
      cells: {
        TTY: line(notBuiltLine('hexagram-manual', 'full-screen')),
        'TTY with NO_COLOR': line(
          notBuiltLine(
            'hexagram-manual',
            'full-screen, no colour, typed input',
          ),
        ),
        'TTY with CI': refusal('hexagram-manual'),
        'stdout not a TTY': refusal('hexagram-manual'),
      },
    },
    {
      command: 'hexagram-playground',
      run: playgroundCommand.run,
      cells: {
        TTY: line(notBuiltLine('hexagram-playground', 'full-screen')),
        'TTY with NO_COLOR': line(
          notBuiltLine(
            'hexagram-playground',
            'full-screen, no colour, typed input',
          ),
        ),
        'TTY with CI': refusal('hexagram-playground'),
        'stdout not a TTY': refusal('hexagram-playground'),
      },
    },
    {
      command: 'hexagram-history',
      run: historyCommand.run,
      cells: {
        TTY: line(notBuiltLine('hexagram-history', 'full-screen')),
        'TTY with NO_COLOR': line(
          notBuiltLine(
            'hexagram-history',
            'full-screen, no colour, typed input',
          ),
        ),
        'TTY with CI': refusal('hexagram-history'),
        'stdout not a TTY': refusal('hexagram-history'),
      },
    },
  ]

  const rows = table.flatMap((row) =>
    columnNames.map((column) => ({
      command: row.command,
      run: row.run,
      column,
      terminal: columns[column],
      expected: row.cells[column],
    })),
  )

  it.each(rows)('$command, $column', async ({ run, terminal, expected }) => {
    await expectEnding(run, [], terminal, expected)
  })
})

describe('the terminal table: hexagram-history maintenance runs in every column', () => {
  const maintenance = [
    {
      argv: ['--import-legacy', '--division-method', 'physical'],
      expected: line(notBuiltLine('hexagram-history', '--import-legacy')),
    },
    {
      argv: ['--rerender-bodies'],
      expected: line(notBuiltLine('hexagram-history', '--rerender-bodies')),
    },
    {
      argv: ['--export', 'out.pdf'],
      expected: line(notBuiltLine('hexagram-history', '--export')),
    },
    {
      argv: ['--export-journal', 'bundle.json'],
      expected: line(notBuiltLine('hexagram-history', '--export-journal')),
    },
    {
      argv: ['--merge-journal', 'bundle.json'],
      expected: line(notBuiltLine('hexagram-history', '--merge-journal')),
    },
  ]
  const rows = maintenance.flatMap((run) =>
    Object.entries(columns).map(([column, terminal]) => ({
      ...run,
      shown: run.argv.join(' '),
      column,
      terminal,
    })),
  )

  it.each(rows)('$shown, $column', async ({ argv, terminal, expected }) => {
    await expectEnding(historyCommand.run, argv, terminal, expected)
  })
})

describe('the environment: NO_COLOR and CI count when present and non-empty', () => {
  const rows = [
    {
      case: 'CI=false on a TTY refuses hexagram',
      run: homeCommand.run,
      terminal: tty({ CI: 'false' }),
      expected: refusal('hexagram'),
    },
    {
      case: 'CI=0 on a TTY forces typed input on hexagram-random',
      run: randomCommand.run,
      terminal: tty({ CI: '0' }),
      expected: line(
        notBuiltLine('hexagram-random', 'full-screen, typed input'),
      ),
    },
    {
      case: 'an empty CI on a TTY leaves hexagram full-screen',
      run: homeCommand.run,
      terminal: tty({ CI: '' }),
      expected: line(notBuiltLine('hexagram', 'full-screen')),
    },
    {
      case: 'an empty NO_COLOR on a TTY leaves hexagram-playground full-screen',
      run: playgroundCommand.run,
      terminal: tty({ NO_COLOR: '' }),
      expected: line(notBuiltLine('hexagram-playground', 'full-screen')),
    },
    {
      case: 'an empty NO_COLOR on a TTY leaves hexagram-interactive full-screen',
      run: interactiveCommand.run,
      terminal: tty({ NO_COLOR: '' }),
      expected: line(notBuiltLine('hexagram-interactive', 'full-screen')),
    },
    {
      case: 'NO_COLOR and CI on a TTY still refuse hexagram-history',
      run: historyCommand.run,
      terminal: tty({ NO_COLOR: '1', CI: 'true' }),
      expected: refusal('hexagram-history'),
    },
    {
      case: 'NO_COLOR and CI on a TTY force typed input on hexagram-random',
      run: randomCommand.run,
      terminal: tty({ NO_COLOR: '1', CI: 'true' }),
      expected: line(
        notBuiltLine('hexagram-random', 'full-screen, typed input'),
      ),
    },
    {
      case: 'NO_COLOR with stdout not a TTY still refuses hexagram-manual',
      run: manualCommand.run,
      terminal: notTty({ NO_COLOR: '1' }),
      expected: refusal('hexagram-manual'),
    },
    {
      case: 'NO_COLOR with stdout not a TTY is plain mode for hexagram-interactive',
      run: interactiveCommand.run,
      terminal: notTty({ NO_COLOR: '1' }),
      expected: line(notBuiltLine('hexagram-interactive', 'plain mode')),
    },
  ]

  it.each(rows)('$case', async ({ run, terminal, expected }) => {
    await expectEnding(run, [], terminal, expected)
  })
})

describe('flags that name a mode', () => {
  const rows = [
    {
      case: 'hexagram-random --plain on a TTY',
      run: randomCommand.run,
      argv: ['--plain'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-random --no-ui on a TTY',
      run: randomCommand.run,
      argv: ['--no-ui'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-interactive --plain on a TTY',
      run: interactiveCommand.run,
      argv: ['--plain'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram-interactive', 'plain mode')),
    },
    {
      case: 'hexagram-interactive --plain on a TTY with NO_COLOR',
      run: interactiveCommand.run,
      argv: ['--plain'],
      terminal: tty({ NO_COLOR: '1' }),
      expected: line(notBuiltLine('hexagram-interactive', 'plain mode')),
    },
    {
      case: 'hexagram-random --plain on a TTY with CI',
      run: randomCommand.run,
      argv: ['--plain'],
      terminal: tty({ CI: 'true' }),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-random --plain with stdout not a TTY',
      run: randomCommand.run,
      argv: ['--plain'],
      terminal: notTty(),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-random --numeric-input on a TTY',
      run: randomCommand.run,
      argv: ['--numeric-input'],
      terminal: tty(),
      expected: line(
        notBuiltLine('hexagram-random', 'full-screen, typed input'),
      ),
    },
    {
      case: 'hexagram-interactive --numeric-input on a TTY',
      run: interactiveCommand.run,
      argv: ['--numeric-input'],
      terminal: tty(),
      expected: line(
        notBuiltLine('hexagram-interactive', 'full-screen, typed input'),
      ),
    },
    {
      case: 'hexagram-interactive --numeric-input with stdout not a TTY',
      run: interactiveCommand.run,
      argv: ['--numeric-input'],
      terminal: notTty(),
      expected: line(notBuiltLine('hexagram-interactive', 'plain mode')),
    },
    {
      case: 'hexagram --numeric-input on a TTY stays full-screen',
      run: homeCommand.run,
      argv: ['--numeric-input'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram', 'full-screen')),
    },
    {
      case: 'hexagram --numeric-input on a TTY with CI still refuses',
      run: homeCommand.run,
      argv: ['--numeric-input'],
      terminal: tty({ CI: 'true' }),
      expected: refusal('hexagram'),
    },
    {
      case: 'hexagram-random -- --plain on a TTY drops the lone --',
      run: randomCommand.run,
      argv: ['--', '--plain'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-random --yilin -- --plain on a TTY drops the lone --',
      run: randomCommand.run,
      argv: ['--yilin', '--', '--plain'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-random --plain -- on a TTY drops the lone --',
      run: randomCommand.run,
      argv: ['--plain', '--'],
      terminal: tty(),
      expected: line(notBuiltLine('hexagram-random', 'plain mode')),
    },
    {
      case: 'hexagram-interactive -- --numeric-input on a TTY drops the lone --',
      run: interactiveCommand.run,
      argv: ['--', '--numeric-input'],
      terminal: tty(),
      expected: line(
        notBuiltLine('hexagram-interactive', 'full-screen, typed input'),
      ),
    },
  ]

  it.each(rows)('$case', async ({ run, argv, terminal, expected }) => {
    await expectEnding(run, argv, terminal, expected)
  })
})

describe('the height check: hexagram-manual needs 32 rows', () => {
  const tooShort = (rows: number): string =>
    line(
      `hexagram-manual needs a terminal at least 32 rows tall; yours is ${rows}`,
    )
  const rows = [
    {
      case: '31 rows on a TTY',
      run: manualCommand.run,
      argv: [],
      terminal: tty({}, 31),
      expected: tooShort(31),
    },
    {
      case: '1 row on a TTY',
      run: manualCommand.run,
      argv: [],
      terminal: tty({}, 1),
      expected: tooShort(1),
    },
    {
      case: '32 rows on a TTY runs',
      run: manualCommand.run,
      argv: [],
      terminal: tty({}, 32),
      expected: line(notBuiltLine('hexagram-manual', 'full-screen')),
    },
    {
      case: '31 rows on a TTY with NO_COLOR',
      run: manualCommand.run,
      argv: [],
      terminal: tty({ NO_COLOR: '1' }, 31),
      expected: tooShort(31),
    },
    {
      case: '31 rows on a TTY with CI refuses for CI first',
      run: manualCommand.run,
      argv: [],
      terminal: tty({ CI: 'true' }, 31),
      expected: refusal('hexagram-manual'),
    },
    {
      case: 'an unknown option at 31 rows is a usage refusal first',
      run: manualCommand.run,
      argv: ['--bogus'],
      terminal: tty({}, 31),
      expected: line(manualCommand.usage),
    },
    {
      case: 'hexagram-playground at 10 rows is not checked',
      run: playgroundCommand.run,
      argv: [],
      terminal: tty({}, 10),
      expected: line(notBuiltLine('hexagram-playground', 'full-screen')),
    },
    {
      case: 'hexagram at 10 rows is not checked',
      run: homeCommand.run,
      argv: [],
      terminal: tty({}, 10),
      expected: line(notBuiltLine('hexagram', 'full-screen')),
    },
  ]

  it.each(rows)('$case', async ({ run, argv, terminal, expected }) => {
    await expectEnding(run, argv, terminal, expected)
  })
})

describe('order: a usage refusal wins over the terminal', () => {
  const rows = commands.flatMap((command) =>
    Object.entries(columns).map(([column, terminal]) => ({
      ...command,
      column,
      terminal,
    })),
  )

  it.each(rows)('$name --bogus, $column', async ({ run, usage, terminal }) => {
    await expectEnding(run, ['--bogus'], terminal, line(usage))
  })

  it.each([
    {
      case: 'a zero --wrap-width with stdout not a TTY',
      argv: ['--wrap-width', '0'],
    },
    { case: 'a positional with stdout not a TTY', argv: ['stray'] },
  ])('hexagram-manual: $case', async ({ argv }) => {
    await expectEnding(
      manualCommand.run,
      argv,
      notTty(),
      line(manualCommand.usage),
    )
  })

  it('hexagram-history: a maintenance option with an unknown one, on a TTY with CI', async () => {
    await expectEnding(
      historyCommand.run,
      ['--rerender-bodies', '--bogus'],
      tty({ CI: 'true' }),
      line(historyCommand.usage),
    )
  })
})

describe('options a command accepts run to its full-screen not-built line', () => {
  const huge = '123456789012345678901234567890'
  const rows: readonly {
    readonly name: string
    readonly run: Command
    readonly argv: readonly string[]
    readonly expected: string
  }[] = [
    ...[
      ['--wrap-width', '80'],
      ['--wrap-width', '1'],
      ['--wrap-width=80'],
      ['--wrap-width', huge],
      ['--slider-sweep-ms', '1800'],
      ['--cast-bounce-ms', '1500'],
      ['--cast-reveal-ms', '700'],
      ['--script', 'traditional'],
      ['--script', 'simplified'],
      ['--script=simplified'],
      ['--translation', 'any-edition-at-all'],
      ['--translation', 'first', '--translation', 'second'],
      ['--commentary', 'any-work-at-all'],
      ['--commentary', 'first', '--commentary', 'second'],
      ['--translation=--x'],
      ['--commentary=-y'],
      ['--yilin'],
      ['--'],
      [
        '--wrap-width',
        '100',
        '--slider-sweep-ms',
        '900',
        '--script',
        'simplified',
        '--yilin',
      ],
    ].map((argv) => ({
      name: 'hexagram-random',
      run: randomCommand.run,
      argv,
      expected: line(notBuiltLine('hexagram-random', 'full-screen')),
    })),
    ...[
      ['--wrap-width', '80'],
      ['--slider-sweep-ms', '1800'],
      ['--commentary', 'a', '--translation', 'b', '--commentary', 'c'],
    ].map((argv) => ({
      name: 'hexagram-interactive',
      run: interactiveCommand.run,
      argv,
      expected: line(notBuiltLine('hexagram-interactive', 'full-screen')),
    })),
    ...[
      ['--wrap-width', '80'],
      ['--slider-sweep-ms', '1800'],
      ['--cast-bounce-ms', '1500'],
      ['--cast-reveal-ms', '700'],
      ['--manual-reveal-ms', '2500'],
      ['--banner-interval-ms', '2160'],
      ['--banner-interval-ms=1'],
      ['--script', 'simplified', '--translation', 'x', '--yilin'],
    ].map((argv) => ({
      name: 'hexagram',
      run: homeCommand.run,
      argv,
      expected: line(notBuiltLine('hexagram', 'full-screen')),
    })),
    ...[
      ['--wrap-width', '80'],
      ['--manual-reveal-ms', '2500'],
      ['--manual-reveal-ms=1'],
      ['--script', 'traditional', '--commentary', 'x', '--yilin'],
    ].map((argv) => ({
      name: 'hexagram-manual',
      run: manualCommand.run,
      argv,
      expected: line(notBuiltLine('hexagram-manual', 'full-screen')),
    })),
    ...[
      ['--script', 'simplified'],
      ['--translation', 'x', '--translation', 'y', '--commentary', 'z'],
      ['--yilin'],
    ].map((argv) => ({
      name: 'hexagram-playground',
      run: playgroundCommand.run,
      argv,
      expected: line(notBuiltLine('hexagram-playground', 'full-screen')),
    })),
    ...[
      ['--script', 'simplified'],
      ['--translation', 'x', '--commentary', 'y', '--yilin'],
      ['--'],
    ].map((argv) => ({
      name: 'hexagram-history',
      run: historyCommand.run,
      argv,
      expected: line(notBuiltLine('hexagram-history', 'full-screen')),
    })),
  ]

  it.each(rows.map((row) => ({ ...row, shown: row.argv.join(' ') })))(
    '$name $shown',
    async ({ run, argv, expected }) => {
      await expectEnding(run, argv, tty(), expected)
    },
  )
})

describe('a bad value, a repeat, an unknown option or a positional is a usage refusal', () => {
  const bad: readonly (readonly string[])[] = [
    ['--wrap-width', '0'],
    ['--wrap-width=0'],
    ['--wrap-width', '00'],
    ['--wrap-width', '080'],
    ['--wrap-width', '-1'],
    ['--wrap-width', '+80'],
    ['--wrap-width', '1.5'],
    ['--wrap-width', '80.0'],
    ['--wrap-width', '1e3'],
    ['--wrap-width', '0x10'],
    ['--wrap-width', ' 80'],
    ['--wrap-width', '80 '],
    ['--wrap-width', 'abc'],
    ['--wrap-width', ''],
    ['--wrap-width='],
    ['--wrap-width'],
    ['--slider-sweep-ms', '0'],
    ['--cast-bounce-ms', '-5'],
    ['--cast-reveal-ms', '7.5'],
    ['--wrap-width', '80', '--wrap-width', '90'],
    ['--slider-sweep-ms', '1', '--slider-sweep-ms', '1'],
    ['--script', 'traditional', '--script', 'traditional'],
    ['--yilin', '--yilin'],
    ['--plain', '--plain'],
    ['--numeric-input', '--numeric-input'],
    ['--plain', '--no-ui'],
    ['--no-ui', '--plain'],
    ['--script', 'cantonese'],
    ['--script', 'Simplified'],
    ['--script', ''],
    ['--script'],
    ['--translation', ''],
    ['--translation='],
    ['--translation'],
    ['--commentary', ''],
    ['--commentary'],
    ['--translation', '--yilin'],
    ['--translation', '-'],
    ['--commentary', '-x'],
    ['--wrap-width', '-5'],
    ['--bogus'],
    ['--help'],
    ['-h'],
    ['stray'],
    ['--yilin', 'stray'],
    ['--manual-reveal-ms', '100'],
    ['--banner-interval-ms', '100'],
    ['--import-legacy', '--division-method', 'physical'],
    ['--rerender-bodies'],
    ['--export', 'out.pdf'],
  ]
  const refusedElsewhere: readonly {
    readonly name: string
    readonly run: Command
    readonly usage: string
    readonly argv: readonly string[]
  }[] = [
    { ...commands[0], argv: ['--plain'] },
    { ...commands[0], argv: ['--no-ui'] },
    { ...commands[0], argv: ['--wrap-width', '0'] },
    { ...commands[0], argv: ['--banner-interval-ms', '0'] },
    { ...commands[0], argv: ['--manual-reveal-ms', '025'] },
    { ...commands[0], argv: ['stray'] },
    { ...commands[2], argv: ['--cast-bounce-ms', '1500'] },
    { ...commands[2], argv: ['--cast-reveal-ms', '700'] },
    { ...commands[2], argv: ['--manual-reveal-ms', '2500'] },
    { ...commands[2], argv: ['--wrap-width', '0'] },
    { ...commands[2], argv: ['--plain', '--no-ui'] },
    { ...commands[2], argv: ['--no-ui', '--plain'] },
    { ...commands[3], argv: ['--plain'] },
    { ...commands[3], argv: ['--numeric-input'] },
    { ...commands[3], argv: ['--slider-sweep-ms', '1800'] },
    { ...commands[3], argv: ['--cast-bounce-ms', '1500'] },
    { ...commands[3], argv: ['--manual-reveal-ms', '0'] },
    {
      ...commands[3],
      argv: ['--manual-reveal-ms', '1', '--manual-reveal-ms', '2'],
    },
    { ...commands[4], argv: ['--wrap-width', '80'] },
    { ...commands[4], argv: ['--numeric-input'] },
    { ...commands[4], argv: ['--plain'] },
    { ...commands[4], argv: ['--script', 'pinyin'] },
    { ...commands[4], argv: ['--yilin', '--yilin'] },
    { ...commands[4], argv: ['--export', 'out.pdf'] },
    { ...commands[4], argv: ['stray'] },
    { ...commands[5], argv: ['--wrap-width', '80'] },
    { ...commands[5], argv: ['--numeric-input'] },
    { ...commands[5], argv: ['--plain'] },
    { ...commands[5], argv: ['--manual-reveal-ms', '2500'] },
    { ...commands[5], argv: ['--bogus'] },
    { ...commands[5], argv: ['stray'] },
    {
      ...commands[5],
      argv: ['--script', 'simplified', '--script', 'simplified'],
    },
  ]
  const rows = [
    ...bad.map((argv) => ({ ...commands[1], argv })),
    ...refusedElsewhere,
  ].map((row) => ({ ...row, shown: JSON.stringify(row.argv) }))

  it.each(rows)('$name $shown', async ({ run, usage, argv }) => {
    await expectEnding(run, argv, tty(), line(usage))
  })
})

describe('hexagram-history: the maintenance options and what applies to them', () => {
  const accepted = [
    {
      argv: ['--import-legacy', '--division-method', 'physical'],
      option: '--import-legacy',
    },
    {
      argv: ['--import-legacy', '--division-method', 'virtual'],
      option: '--import-legacy',
    },
    {
      argv: ['--import-legacy', '--division-method', 'automatic'],
      option: '--import-legacy',
    },
    {
      argv: ['--import-legacy', 'a.txt', '--division-method', 'virtual'],
      option: '--import-legacy',
    },
    {
      argv: [
        '--import-legacy',
        'old/a.txt',
        'old-folder',
        '--division-method',
        'automatic',
      ],
      option: '--import-legacy',
    },
    {
      argv: ['--division-method', 'physical', '--import-legacy'],
      option: '--import-legacy',
    },
    {
      argv: [
        '--import-legacy',
        'a.txt',
        'b.txt',
        '--division-method',
        'physical',
      ],
      option: '--import-legacy',
    },
    {
      argv: ['--division-method', 'physical', '--import-legacy', 'a.txt'],
      option: '--import-legacy',
    },
    {
      argv: ['--import-legacy', './-old.txt', '--division-method', 'physical'],
      option: '--import-legacy',
    },
    {
      argv: ['--', '--import-legacy', '--division-method', 'physical', '--'],
      option: '--import-legacy',
    },
    { argv: ['--rerender-bodies'], option: '--rerender-bodies' },
    { argv: ['--export', 'out.pdf'], option: '--export' },
    { argv: ['--export=-out.typ'], option: '--export' },
    {
      argv: ['--export', 'out.pdf', '--filter', 'harvest'],
      option: '--export',
    },
    {
      argv: [
        '--export',
        'out.pdf',
        '--script',
        'simplified',
        '--translation',
        'x',
        '--commentary',
        'y',
        '--yilin',
      ],
      option: '--export',
    },
    { argv: ['--export-journal', 'bundle.json'], option: '--export-journal' },
    { argv: ['--merge-journal', 'bundle.json'], option: '--merge-journal' },
  ] as const

  it.each(accepted.map((row) => ({ ...row, shown: row.argv.join(' ') })))(
    'runs $shown to the line naming its option',
    async ({ argv, option }) => {
      await expectEnding(
        historyCommand.run,
        argv,
        tty(),
        line(notBuiltLine('hexagram-history', option)),
      )
    },
  )

  const refused: readonly (readonly string[])[] = [
    ['--import-legacy'],
    ['--import-legacy', 'a.txt'],
    ['a.txt', '--import-legacy', '--division-method', 'physical'],
    ['--import-legacy', 'a.txt', '--division-method', 'physical', 'b.txt'],
    ['--import-legacy', '--division-method', 'physical', 'a.txt'],
    ['--import-legacy', '-old.txt', '--division-method', 'physical'],
    ['--import-legacy', '--division-method', 'manual'],
    ['--import-legacy', '--division-method', 'Physical'],
    ['--import-legacy', '--division-method'],
    [
      '--import-legacy',
      '--division-method',
      'physical',
      '--division-method',
      'virtual',
    ],
    ['--division-method', 'physical'],
    ['--division-method', 'physical', '--rerender-bodies'],
    ['--filter', 'harvest'],
    ['--filter', 'harvest', '--rerender-bodies'],
    ['--export', 'out.pdf', '--filter', 'a', '--filter', 'b'],
    ['--export', 'a.pdf', '--export', 'b.pdf'],
    ['--export'],
    ['--export-journal'],
    ['--merge-journal'],
    ['--export', '--filter', 'x'],
    ['--export', '--filter'],
    ['--export', '-'],
    ['--merge-journal', '--export-journal', 'b.json'],
    ['--merge-journal', '--export-journal'],
    ['--export', ''],
    ['--export='],
    ['--export', 'out.pdf', '--filter', ''],
    ['--export', 'out.pdf', '--filter='],
    ['--export-journal', ''],
    ['--export-journal='],
    ['--merge-journal', ''],
    ['--merge-journal='],
    ['--rerender-bodies', '--rerender-bodies'],
    ['--rerender-bodies', 'stray'],
    ['--export', 'out.pdf', 'stray'],
    ['--export-journal', 'bundle.json', 'stray'],
    [
      '--import-legacy',
      '--division-method',
      'physical',
      '--script',
      'simplified',
    ],
    ['--import-legacy', '--division-method', 'physical', '--yilin'],
    ['--rerender-bodies', '--translation', 'x'],
    ['--rerender-bodies', '--yilin'],
    ['--export-journal', 'bundle.json', '--commentary', 'x'],
    ['--export-journal', 'bundle.json', '--script', 'traditional'],
    ['--merge-journal', 'bundle.json', '--yilin'],
    ['--merge-journal', 'bundle.json', '--translation', 'x'],
    ['--rerender-bodies', '--export-journal', 'bundle.json'],
    ['--import-legacy', '--division-method', 'physical', '--rerender-bodies'],
    ['--export', 'out.pdf', '--merge-journal', 'bundle.json'],
    ['--export-journal', 'a.json', '--merge-journal', 'b.json'],
    ['--import-legacy', '--division-method', 'virtual', '--export', 'out.pdf'],
  ]

  it.each(refused.map((argv) => ({ argv, shown: JSON.stringify(argv) })))(
    'refuses $shown with the usage line',
    async ({ argv }) => {
      await expectEnding(
        historyCommand.run,
        argv,
        tty(),
        line(historyCommand.usage),
      )
    },
  )
})
