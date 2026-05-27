import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// `hexagram-manual` is Ink-only — the bin must refuse non-interactive
// environments (NO_COLOR=1 / CI=true / non-TTY stdout) with a clear stderr
// message and exit 1, mirroring `hexagram-history`. Running the actual bin
// under a child process is the most faithful way to test the guard — vitest
// module-mock + dynamic-import shenanigans get confused by the bin's
// top-level await (the module is cached after the first import, so a second
// test with a different env can't re-run `main()`). One child process per
// case keeps each invocation honest.

const here = path.dirname(fileURLToPath(import.meta.url))
const manualEntry = path.resolve(here, '..', 'src', 'manual.ts')
const cliCwd = path.resolve(here, '..')

interface RunResult {
  stdout: string
  stderr: string
  code: number | null
}

function runManual(env: Record<string, string>): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // `tsx --tsconfig …` would also work, but the bare `tsx` binary in the
    // workspace's node_modules/.bin already does the right thing — tsx auto-
    // discovers the nearest tsconfig and resolves the workspace's `source`
    // export condition via the same vitest/Vite plumbing used elsewhere.
    const tsxBin = path.resolve(here, '..', '..', '..', 'node_modules', '.bin', 'tsx')
    const child = spawn(tsxBin, [manualEntry], {
      cwd: cliCwd,
      // Strip every parent env var that would normally enable colour /
      // interactivity. We override one at a time below.
      env: {
        PATH: process.env['PATH'] ?? '',
        HOME: process.env['HOME'] ?? '',
        ...env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
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
    // Close stdin so any interactive-input attempt aborts immediately
    // (defensive — the TTY guard should refuse before we ever read stdin).
    child.stdin.end()
  })
}

describe('hexagram-manual bin', () => {
  it('refuses NO_COLOR=1 with the expected stderr and exit 1', async () => {
    const { stderr, code } = await runManual({ NO_COLOR: '1' })
    expect(stderr).toContain('hexagram-manual requires an interactive terminal')
    expect(code).toBe(1)
  }, 15_000)

  it('refuses CI=true with the expected stderr and exit 1', async () => {
    const { stderr, code } = await runManual({ CI: 'true' })
    expect(stderr).toContain('hexagram-manual requires an interactive terminal')
    expect(code).toBe(1)
  }, 15_000)

  it('refuses a non-TTY stdout (default for spawned children) with exit 1', async () => {
    // Neither NO_COLOR nor CI set — but spawned children have non-TTY
    // stdout, which `isInteractiveEnv` also rejects.
    const { stderr, code } = await runManual({})
    expect(stderr).toContain('hexagram-manual requires an interactive terminal')
    expect(code).toBe(1)
  }, 15_000)
})
