// TEMPORARY parity gate (deleted in Task 3b.4 once the fixtures stand alone):
// proves the IR→ANSI serializers are byte-identical to the legacy builders.
import { buildConsultationView } from '@hexagram/consultation-view'
import type { CastingSection } from '@hexagram/consultation-view'
import { emptyPartialCastingRecord } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { cases } from '../../casting-ui/tests/fixtures/cases.js'
import { castingSection } from '../src/casting-ledger.js'
import { serializeCastingAnsi } from '../src/serialize-ansi.js'

const castingOf = (
  query: string,
  hexagram: Parameters<typeof buildConsultationView>[1],
  casting: Parameters<typeof buildConsultationView>[2],
): CastingSection =>
  buildConsultationView(query, hexagram, casting).sections.find(
    (s) => s.kind === 'casting',
  )! as CastingSection

describe('serializeCastingAnsi parity with legacy castingSection', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`full casting (${name})`, () => {
      expect(serializeCastingAnsi(castingOf(query, hexagram, casting))).toBe(
        castingSection(casting),
      )
    })
  }
  it('partial casting (one cell filled)', () => {
    const partial = emptyPartialCastingRecord()
    partial[0][0] = { pick: 20, max: 48 }
    expect(
      serializeCastingAnsi(castingOf('q', [7, 7, 7, 7, 7, 7], partial)),
    ).toBe(castingSection(partial))
  })
  it('null casting', () => {
    expect(serializeCastingAnsi(castingOf('q', [7, 7, 7, 7, 7, 7], null))).toBe(
      castingSection(null),
    )
  })
})
