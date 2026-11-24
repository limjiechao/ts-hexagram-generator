// The proof that `drift:check` runs at every landing (ADR-0042, R-206,
// R-268 to R-271), run by `drift:prove` when `--only` is absent. It reads the
// wiring rather than running `check:all`:
//
// - `turbo.json` has `//#drift:check` with no `dependsOn` and `cache: false`
//   (R-269), and `check:all` and `check:affected` both name `drift:check`;
// - `turbo run drift:check` exits 0 on this repo twice, the second run
//   without a cache hit;
// - the same turbo task, pointed by `--root` at a stand-in repo with one
//   planted finding, exits non-zero and its log shows the finding's line
//   (R-270);
// - CI's `check` job runs `pnpm drift:check`, and `clerk.md` Step 6 names it
//   (R-268).

import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { Run } from './run-tsx.js'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const task = '//#drift:check'
const plantLine =
  'overhaul/demo/src/plant.ts:1 E1: question ID Q-31; comments and test names cite ADRs and glossary terms only (ADR-0042, R-198)'

function read(file: string): Promise<string> {
  return readFile(path.join(repoRoot, file), 'utf8')
}

// `turbo.json` is JSONC; its comments are whole lines starting `//`, and no
// string value starts a line, so dropping those lines leaves plain JSON.
function parseTurbo(text: string): unknown {
  const lines = text.split('\n').filter((line) => !/^\s*\/\//.test(line))
  return JSON.parse(lines.join('\n'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function proveTurboTask(): Promise<string[]> {
  const turbo = parseTurbo(await read('turbo.json'))
  const tasks = isRecord(turbo) ? turbo.tasks : undefined
  const config = isRecord(tasks) ? tasks[task] : undefined
  if (!isRecord(config)) return [`turbo.json: no task ${task} (R-206)`]
  const failures: string[] = []
  if (Object.hasOwn(config, 'dependsOn'))
    failures.push(
      `turbo.json: ${task} has dependsOn ${JSON.stringify(config.dependsOn)}; it reads source only`,
    )
  if (config.cache !== false)
    failures.push(
      `turbo.json: ${task} has cache ${JSON.stringify(config.cache)}, not false (R-269)`,
    )
  return failures
}

// The tasks a `turbo run` script names: the words after `turbo run` that are
// not flags.
function turboTasks(script: string): string[] {
  const words = script.trim().split(/\s+/)
  if (words[0] !== 'turbo' || words[1] !== 'run') return []
  return words.slice(2).filter((word) => !word.startsWith('-'))
}

async function proveScripts(): Promise<string[]> {
  const manifest = JSON.parse(await read('package.json')) as {
    scripts?: Record<string, string>
  }
  const failures: string[] = []
  for (const name of ['check:all', 'check:affected']) {
    const script = manifest.scripts?.[name] ?? ''
    if (!turboTasks(script).includes('drift:check'))
      failures.push(
        `package.json: ${name} does not run drift:check: ${JSON.stringify(script)} (R-206, R-269)`,
      )
  }
  return failures
}

async function runTurbo(args: readonly string[]): Promise<Run> {
  try {
    const { stdout, stderr } = await promisify(execFile)(
      'pnpm',
      ['exec', 'turbo', 'run', 'drift:check', ...args],
      { cwd: repoRoot, maxBuffer: 16 * 1024 * 1024 },
    )
    return { code: 0, stdout, stderr }
  } catch (error) {
    const { code, stdout, stderr } = error as Partial<Run>
    return { code: code ?? 'none', stdout: stdout ?? '', stderr: stderr ?? '' }
  }
}

function describe(run: Run): string {
  return `exit ${String(run.code)}: ${(run.stdout + run.stderr).trim()}`
}

async function proveCleanRuns(): Promise<string[]> {
  const failures: string[] = []
  for (const label of ['first', 'second']) {
    const run = await runTurbo([])
    if (run.code !== 0)
      failures.push(
        `turbo run drift:check, ${label} run on this repo: expected exit 0, got ${describe(run)}`,
      )
    else if (/cache hit/i.test(run.stdout + run.stderr))
      failures.push(
        `turbo run drift:check, ${label} run: replayed a cache hit (R-269)`,
      )
  }
  return failures
}

// Turbo runs a root task from this repo only, so the plant lives in a
// stand-in repo that `--root` names, passed through turbo after `--`. It is
// the empty `AGENTS.md` and `CONTEXT.md` signals 1 and 2 need (R-243, R-253)
// and one `overhaul/` file whose comment cites a question ID (E1).
async function provePlantedRun(): Promise<string[]> {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'drift-landing-'))
  try {
    const plant = path.join(temp, 'overhaul', 'demo', 'src', 'plant.ts')
    await mkdir(path.dirname(plant), { recursive: true })
    await writeFile(plant, '// block Q-31\nexport const planted = 1\n')
    await writeFile(path.join(temp, 'AGENTS.md'), '')
    await writeFile(path.join(temp, 'CONTEXT.md'), '')
    const run = await runTurbo(['--', '--root', temp])
    if (run.code === 0 || !(run.stdout + run.stderr).includes(plantLine))
      return [
        `turbo run drift:check on a planted finding: expected a failed run whose log shows ${JSON.stringify(plantLine)}, got ${describe(run)} (R-270)`,
      ]
    return []
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

// The lines of the `check` job, from its key to the next key at the same
// indent.
function checkJob(workflow: string): string[] {
  const lines = workflow.split('\n')
  const start = lines.findIndex((line) => /^ {2}check:\s*$/.test(line))
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^ {2}\S/.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

async function proveCi(): Promise<string[]> {
  const job = checkJob(await read('.github/workflows/unit-test.yml'))
  if (job.length === 0)
    return ['.github/workflows/unit-test.yml: no `check` job']
  const runs = job.some((line) =>
    /^\s*(?:-\s+)?run:\s*pnpm (?:run )?drift:check\s*$/.test(line),
  )
  return runs
    ? []
    : [
        '.github/workflows/unit-test.yml: the `check` job has no step running `pnpm drift:check` (R-268)',
      ]
}

async function proveClerk(): Promise<string[]> {
  const clerk = await read('docs/agents/clerk.md')
  const lines = clerk.split('\n')
  const start = lines.findIndex((line) => /^### Step 6\b/.test(line))
  if (start === -1) return ['docs/agents/clerk.md: no `### Step 6` section']
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^#{1,3} /.test(line))
  const section = (end === -1 ? rest : rest.slice(0, end)).join('\n')
  return section.includes('pnpm drift:check')
    ? []
    : ['docs/agents/clerk.md: Step 6 does not name `pnpm drift:check` (R-268)']
}

export async function proveLanding(): Promise<string[]> {
  const failures = [
    ...(await proveTurboTask()),
    ...(await proveScripts()),
    ...(await proveCi()),
    ...(await proveClerk()),
  ]
  // Without the task, both turbo proofs fail on the same missing task, so
  // they run only once the wiring above them is in place.
  if (failures.some((failure) => failure.startsWith('turbo.json: no task')))
    return failures
  return [
    ...failures,
    ...(await proveCleanRuns()),
    ...(await provePlantedRun()),
  ]
}
