import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import { describe, expect, it } from 'vitest'

import { inkSections, type InkSections } from '#src/readout/ink-sections.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

import { readoutCases, readoutFixture } from './support/readout-cases.js'

// The Ink section strings' exact bytes (ADR-0013), compared with the
// fixtures derived from today's Ink sections: the Query, then one
// string per tab, the Emerging Hexagram tab always present and closing with
// the list of Editions. Each Readout is gathered through the bundled
// Catalogue with the default Reading Preference.

const ports = { scriptureCatalogue: bundledScriptureCatalogue }

function sectionsFixture(fileName: string): InkSections {
  const parsed: unknown = JSON.parse(readoutFixture(fileName))
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('query' in parsed) ||
    !('casting' in parsed) ||
    !('transformation' in parsed) ||
    !('standing' in parsed) ||
    !('emerging' in parsed)
  )
    throw new Error(`${fileName} is not five sections`)
  const { query, casting, transformation, standing, emerging } = parsed
  if (
    typeof query !== 'string' ||
    typeof casting !== 'string' ||
    typeof transformation !== 'string' ||
    typeof standing !== 'string' ||
    typeof emerging !== 'string'
  )
    throw new Error(`${fileName} holds a section that is not a string`)
  return { query, casting, transformation, standing, emerging }
}

describe('inkSections over the fixtures', () => {
  for (const { name, consultation, inkWithoutColour } of readoutCases) {
    it(`${name}, with colour`, async () => {
      const readout = await consultationReadoutFor(
        ports,
        consultation,
        defaultReadingPreference,
      )
      expect(inkSections(readout, { colour: true })).toEqual(
        sectionsFixture(`ink-${name}.json`),
      )
    })

    if (inkWithoutColour)
      it(`${name}, without colour: no escape code, Moving Lines still marked ○ and ✕`, async () => {
        const readout = await consultationReadoutFor(
          ports,
          consultation,
          defaultReadingPreference,
        )
        const expected = sectionsFixture(`ink-${name}.no-colour.json`)
        const all = Object.values(expected).join('\n')
        expect(all).not.toContain('\u001B')
        expect(all).toMatch(/○|✕/u)
        expect(inkSections(readout, { colour: false })).toEqual(expected)
      })
  }
})
