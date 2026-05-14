import { writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { consultationConsoleOutput } from '../src/cli-utils-output'
import { cases } from '../tests/fixtures/cases'

// Regenerate the `plain-output-*.txt` fixtures from `consultationConsoleOutput`.
// Run after changing any section builder; review with `git diff tests/fixtures`.
const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'tests',
  'fixtures',
)

for (const { name, query, hexagram, casting } of cases) {
  const output = consultationConsoleOutput(query, hexagram, casting)
  const filePath = path.join(fixturesDirectory, `plain-output-${name}.txt`)
  writeFileSync(filePath, output, { encoding: 'utf8' })
  process.stdout.write(`Wrote ${filePath}\n`)
}
