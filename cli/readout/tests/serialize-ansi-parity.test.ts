// TEMPORARY parity gate (deleted in Task 3b.4 once the fixtures stand alone):
// proves the IR→ANSI serializers are byte-identical to the legacy builders.
import { buildConsultationView } from '@hexagram/consultation-view'
import type {
  CastingSection,
  ConsultationSection,
  HexagramSection,
  QuerySection,
  TextSection,
  TransformationSection,
} from '@hexagram/consultation-view'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { emptyPartialCastingRecord } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { cases } from '../../casting-ui/tests/fixtures/cases.js'
import { castingSection } from '../src/casting-ledger.js'
import {
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  querySection,
  standingHexagramSection,
  transformationSection,
} from '../src/output-sections.js'
import {
  serializeCastingAnsi,
  serializeHexagramAnsi,
  serializeQueryAnsi,
  serializeTextAnsi,
  serializeTransformationAnsi,
} from '../src/serialize-ansi.js'

const sectionsOf = (
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
): readonly ConsultationSection[] =>
  buildConsultationView(query, hexagram, casting).sections

const find = <T extends ConsultationSection>(
  ss: readonly ConsultationSection[],
  pred: (s: ConsultationSection) => boolean,
): T => ss.find(pred)! as T

// Hexagrams covering the no/one/multi-moving gate.
const gateHexagrams: { name: string; hexagram: Hexagram }[] = [
  { name: 'no-moving', hexagram: [7, 8, 7, 8, 7, 8] },
  { name: 'one-moving', hexagram: [6, 7, 8, 7, 8, 7] },
  { name: 'multi-moving', hexagram: [6, 9, 7, 8, 7, 8] },
]

describe('serializeCastingAnsi parity', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`full casting (${name})`, () => {
      const section = find<CastingSection>(
        sectionsOf(query, hexagram, casting),
        (s) => s.kind === 'casting',
      )
      expect(serializeCastingAnsi(section)).toBe(castingSection(casting))
    })
  }
  it('partial casting (one cell filled)', () => {
    const partial = emptyPartialCastingRecord()
    partial[0][0] = { pick: 20, max: 48 }
    const section = find<CastingSection>(
      buildConsultationView('q', [7, 7, 7, 7, 7, 7], partial).sections,
      (s) => s.kind === 'casting',
    )
    expect(serializeCastingAnsi(section)).toBe(castingSection(partial))
  })
  it('null casting', () => {
    const section = find<CastingSection>(
      sectionsOf('q', [7, 7, 7, 7, 7, 7], null),
      (s) => s.kind === 'casting',
    )
    expect(serializeCastingAnsi(section)).toBe(castingSection(null))
  })
})

describe('serializeQueryAnsi parity', () => {
  for (const q of ['Will the harvest be plentiful?', '']) {
    it(`query ${JSON.stringify(q)}`, () => {
      const section = find<QuerySection>(
        sectionsOf(q, [7, 7, 7, 7, 7, 7], null),
        (s) => s.kind === 'query',
      )
      expect(serializeQueryAnsi(section)).toBe(querySection(q))
    })
  }
})

describe('serializeTransformationAnsi parity', () => {
  for (const { name, hexagram } of gateHexagrams) {
    it(`transformation (${name})`, () => {
      const section = find<TransformationSection>(
        sectionsOf('q', hexagram, null),
        (s) => s.kind === 'transformation',
      )
      expect(serializeTransformationAnsi(section)).toBe(
        transformationSection(hexagram),
      )
    })
  }
})

describe('serializeHexagramAnsi parity', () => {
  for (const { name, hexagram } of gateHexagrams) {
    it(`standing hexagram (${name})`, () => {
      const ss = sectionsOf('q', hexagram, null)
      const section = ss.find(
        (s) => s.kind === 'hexagram' && s.role === 'standing',
      )! as HexagramSection
      expect(serializeHexagramAnsi(section)).toBe(
        standingHexagramSection(hexagram),
      )
    })
    it(`emerging hexagram (${name})`, () => {
      const ss = sectionsOf('q', hexagram, null)
      const section = ss.find(
        (s) => s.kind === 'hexagram' && s.role === 'emerging',
      ) as HexagramSection | undefined
      if (section === undefined) return // no emerging when static
      expect(serializeHexagramAnsi(section)).toBe(
        emergingHexagramSection(hexagram),
      )
    })
  }
})

describe('serializeTextAnsi parity', () => {
  for (const { name, hexagram } of gateHexagrams) {
    it(`hexagram text (${name})`, () => {
      const section = sectionsOf('q', hexagram, null).find(
        (s) => s.kind === 'text' && s.role === 'hexagram',
      )! as TextSection
      expect(serializeTextAnsi(section)).toBe(hexagramTextSection(hexagram))
    })
    it(`lines text (${name})`, () => {
      const section = sectionsOf('q', hexagram, null).find(
        (s) => s.kind === 'text' && s.role === 'lines',
      )! as TextSection
      expect(serializeTextAnsi(section)).toBe(linesBlock(hexagram))
    })
  }
})
