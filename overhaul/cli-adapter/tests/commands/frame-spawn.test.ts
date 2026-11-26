import type { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

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

describe.concurrent('the bins with stdout not a TTY, and with CI', () => {
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
      case: 'hexagram-history --rerender-bodies runs with CI',
      command: 'hexagram-history',
      argv: ['--rerender-bodies'],
      env: { CI: 'true' },
      expected: line(notBuiltLine('hexagram-history', '--rerender-bodies')),
    },
  ]

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
