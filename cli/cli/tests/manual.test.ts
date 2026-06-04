import type { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
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
    // Run the bin as ONE node process via the tsx ESM loader
    // (`node --import tsx <entry>`), not through the `node_modules/.bin/tsx`
    // launcher. The launcher shim re-spawns its own grandchild node process;
    // on Windows that grandchild's stdio pipes never close back to this test,
    // so `child.on('close')` never fires and the case times out at 15 s (the
    // failure that kept the windows-latest matrix leg red). `process.execPath`
    // is the absolute node binary, so there is no `.cmd`/shell indirection and
    // the spawn is identical on POSIX and Windows. tsx still auto-discovers
    // the nearest tsconfig and honours the workspace `source` export
    // condition, same as the launcher did.
    // Start from the real parent environment so OS-critical vars survive
    // (Windows needs SystemRoot / ComSpec / PATHEXT just to start node), then
    // scrub the interactivity signals so each case tests exactly one
    // condition, then layer the per-case overrides on top.
    const childEnv: NodeJS.ProcessEnv = { ...process.env }
    delete childEnv.NO_COLOR
    delete childEnv.FORCE_COLOR
    delete childEnv.CI
    const child = spawn(process.execPath, ['--import', 'tsx', manualEntry], {
      cwd: cliCwd,
      env: { ...childEnv, ...env },
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
  // No inline timeout: each case spawns a full `node --import tsx` child, the
  // heaviest work in the suite. The first spawn additionally pays Node cold
  // start + tsx loader registration + first-time TS transpile of the import
  // graph; on a contended 2-CPU Windows GHA runner that cold case blew the
  // old 15s inline cap (warm cases #2/#3 passed). These inherit the base 30s
  // testTimeout, which ADR-0013 set precisely to contain slow Windows work.
  it('refuses NO_COLOR=1 with the expected stderr and exit 1', async () => {
    const { stderr, code } = await runManual({ NO_COLOR: '1' })
    expect(stderr).toContain('hexagram-manual requires an interactive terminal')
    expect(code).toBe(1)
  })

  it('refuses CI=true with the expected stderr and exit 1', async () => {
    const { stderr, code } = await runManual({ CI: 'true' })
    expect(stderr).toContain('hexagram-manual requires an interactive terminal')
    expect(code).toBe(1)
  })

  it('refuses a non-TTY stdout (default for spawned children) with exit 1', async () => {
    // Neither NO_COLOR nor CI set — but spawned children have non-TTY
    // stdout, which `isInteractiveEnv` also rejects.
    const { stderr, code } = await runManual({})
    expect(stderr).toContain('hexagram-manual requires an interactive terminal')
    expect(code).toBe(1)
  })
})
