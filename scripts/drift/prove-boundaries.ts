// Drift signal 3's prover (ADR-0042): lints every planted violation and clean
// twin under the `overhaul/` path it names, through the repo's real ESLint
// config, and exits 0 only if each plant is reported by exactly its own
// B-number and each twin by none. Reports from rules outside B1 to B12 are
// ignored. `--only B1,B2` limits the run to the rules named.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'

import { expected } from './fixtures/signal-3/expected.js'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const fixtures = fileURLToPath(new URL('fixtures/signal-3/', import.meta.url))
const boundaryRules = Array.from({ length: 12 }, (_, index) => `B${index + 1}`)

function parseOnly(argv: readonly string[]): ReadonlySet<string> {
  const index = argv.indexOf('--only')
  if (index === -1) return new Set(boundaryRules)
  const names = (argv[index + 1] ?? '').split(',').filter(Boolean)
  const unknown = names.filter((name) => !boundaryRules.includes(name))
  if (names.length === 0 || unknown.length > 0)
    throw new Error(`--only takes B-numbers from B1 to B12, as in B1,B2`)
  return new Set(names)
}

async function fixtureFiles(): Promise<string[]> {
  const folders = ['plants', 'twins']
  const listed = await Promise.all(
    folders.map(async (folder) => {
      const names = await readdir(path.join(fixtures, folder))
      return names.map((name) => `${folder}/${name}`)
    }),
  )
  return listed.flat()
}

function lintedAs(text: string): string | undefined {
  return /Linted as (overhaul\/[\w./-]+)/.exec(text)?.[1]?.replace(/\.$/, '')
}

// B12's rules need each fixture in a TypeScript program, but a fixture's
// `overhaul/` path is virtual, so no program built from disk holds it. The
// project service admits each one by its exact path to a default project
// with the compiler options lint:check uses (R-157(12)).
function admitting(virtualPaths: readonly string[]): ESLint.Options {
  return {
    cwd: repoRoot,
    overrideConfig: {
      files: ['overhaul/**/*.{ts,tsx,mts,cts,js,mjs,cjs}'],
      languageOptions: {
        parserOptions: {
          project: null,
          projectService: {
            allowDefaultProject: [...virtualPaths],
            defaultProject: 'tsconfig.overhaul-lint.json',
            maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING:
              virtualPaths.length,
          },
        },
      },
    },
  }
}

async function reportedRules(
  eslint: ESLint,
  text: string,
): Promise<ReadonlySet<string> | string> {
  const virtual = lintedAs(text)
  if (virtual === undefined) return 'names no `Linted as overhaul/...` path'
  const [result] = await eslint.lintText(text, {
    filePath: path.join(repoRoot, virtual),
  })
  const fatal = result?.messages.find((message) => message.fatal)
  if (fatal) return `does not parse: ${fatal.message}`
  const rules = new Set<string>()
  for (const message of result?.messages ?? []) {
    const rule = /^(B\d+):/.exec(message.message)?.[1]
    if (rule !== undefined && boundaryRules.includes(rule)) rules.add(rule)
  }
  return rules
}

function describeRules(rules: Iterable<string>): string {
  return [...rules].join(', ') || 'none'
}

async function prove(only: ReadonlySet<string>): Promise<string[]> {
  const failures: string[] = []
  const onDisk = await fixtureFiles()
  for (const file of onDisk) {
    if (!Object.hasOwn(expected, file))
      failures.push(`${file}: on disk but missing from expected.ts`)
  }
  const texts = new Map<string, string>()
  for (const file of onDisk)
    texts.set(file, await readFile(path.join(fixtures, file), 'utf8'))
  const virtualPaths = [...texts.values()].flatMap(
    (text) => lintedAs(text) ?? [],
  )
  const eslint = new ESLint(admitting(virtualPaths))
  for (const [file, rule] of Object.entries(expected)) {
    if (!onDisk.includes(file)) {
      failures.push(`${file}: listed in expected.ts but missing`)
      continue
    }
    if (rule !== null && !only.has(rule)) continue
    const reported = await reportedRules(eslint, texts.get(file) ?? '')
    if (typeof reported === 'string') {
      failures.push(`${file}: ${reported}`)
      continue
    }
    const judged = [...reported].filter((each) => only.has(each))
    const passes =
      rule === null
        ? judged.length === 0
        : judged.length === 1 && judged[0] === rule
    if (!passes)
      failures.push(
        `${file}: expected ${rule ?? 'none'}, reported ${describeRules(judged)}`,
      )
  }
  return failures
}

const only = parseOnly(process.argv.slice(2))
const failures = await prove(only)
const scope = describeRules(boundaryRules.filter((rule) => only.has(rule)))
if (failures.length > 0) {
  console.error(`drift:prove failed for ${scope}:`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}
console.info(`drift:prove passed for ${scope}.`)
