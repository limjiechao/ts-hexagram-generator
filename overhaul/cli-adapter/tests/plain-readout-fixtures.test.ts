import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import { describe, expect, it } from 'vitest'

import { plainReadout } from '#src/readout/plain-readout.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

import { readoutCases, readoutFixture } from './support/readout-cases.js'

// The plain Readout's exact bytes (ADR-0009, ADR-0013), compared with the
// fixtures derived from today's plain output. Each Readout is
// gathered through the bundled Catalogue with the default Reading
// Preference: Traditional, Legge, the 大象 and 小象, no Yilin Verse.

const ports = { scriptureCatalogue: bundledScriptureCatalogue }

describe('plainReadout over the fixtures', () => {
  for (const { name, consultation, plainWithoutColour } of readoutCases) {
    it(`${name}, with colour`, async () => {
      const readout = await consultationReadoutFor(
        ports,
        consultation,
        defaultReadingPreference,
      )
      expect(plainReadout(readout, { colour: true })).toBe(
        readoutFixture(`plain-${name}.txt`),
      )
    })

    if (plainWithoutColour)
      it(`${name}, without colour: no escape code, Moving Lines still marked ○ and ✕`, async () => {
        const readout = await consultationReadoutFor(
          ports,
          consultation,
          defaultReadingPreference,
        )
        const expected = readoutFixture(`plain-${name}.no-colour.txt`)
        // The fixture itself must hold what the test claims of it.
        expect(expected).not.toContain('\u001B')
        expect(expected).toMatch(/○|✕/u)
        expect(plainReadout(readout, { colour: false })).toBe(expected)
      })
  }
})
