import { writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { buildConsultationSections } from '@hexagram/readout'

import { consultationConsoleOutput } from '../src/output-composers'
import { cases } from '../tests/fixtures/cases'

// Regenerate the byte-locked fixtures from `consultationConsoleOutput` and
// `buildConsultationSections`. Run after changing any section builder; review
// with `git diff tests/fixtures`. Two fixture shapes are emitted per case:
//   - `plain-output-<name>.txt` — flat console output (saved-file parity).
//   - `ink-sections-<name>.json` — `ConsultationSections` shape (Ink-viewer
//     parity). Catches drift in `buildConsultationSections` even when the
//     plain composition is unchanged.
const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'tests',
  'fixtures',
)

for (const { name, query, hexagram, casting } of cases) {
  const plain = consultationConsoleOutput(query, hexagram, casting)
  const plainPath = path.join(fixturesDirectory, `plain-output-${name}.txt`)
  writeFileSync(plainPath, plain, { encoding: 'utf8' })
  process.stdout.write(`Wrote ${plainPath}\n`)

  const sections = buildConsultationSections(query, hexagram, casting)
  // Validate that every section the Ink viewer expects to render is present;
  // a regression that silently drops a section would otherwise be encoded as
  // the new ground truth.
  const hasMovingLines = hexagram.some((line) => line === 6 || line === 9)
  if (sections.query === '' && query !== '') {
    throw new Error(
      `Case ${name}: empty query section despite a non-empty query`,
    )
  }
  if (!sections.casting || !sections.transformation || !sections.standing) {
    throw new Error(`Case ${name}: missing a load-bearing section`)
  }
  if (hasMovingLines && sections.emerging === null) {
    throw new Error(`Case ${name}: moving lines without an emerging section`)
  }
  if (!hasMovingLines && sections.emerging !== null) {
    throw new Error(
      `Case ${name}: emerging section present without moving lines`,
    )
  }
  const inkPath = path.join(fixturesDirectory, `ink-sections-${name}.json`)
  writeFileSync(inkPath, `${JSON.stringify(sections, null, 2)}\n`, {
    encoding: 'utf8',
  })
  process.stdout.write(`Wrote ${inkPath}\n`)
}
