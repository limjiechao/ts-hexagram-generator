// TEMPORARY parity gate (deleted in Task 3c.4 once the fixtures stand alone):
// proves the IR→Markdown serializers are byte-identical to the legacy builders.
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
import { describe, expect, it } from 'vitest'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from '../src/markdown-sections.js'
import {
  serializeCastingMarkdown,
  serializeHexagramMarkdown,
  serializeLinesMarkdown,
  serializeQueryMarkdown,
  serializeTransformationMarkdown,
} from '../src/serialize-markdown.js'

const sectionsOf = (
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
): readonly ConsultationSection[] =>
  buildConsultationView(query, hexagram, casting).sections

const casting: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 1, max: 48 },
  { pick: 2, max: 43 },
  { pick: 3, max: 39 },
]) as CastingRecord

const gateHexagrams: { name: string; hexagram: Hexagram }[] = [
  { name: 'no-moving', hexagram: [7, 8, 7, 8, 7, 8] },
  { name: 'one-moving', hexagram: [6, 7, 8, 7, 8, 7] },
  { name: 'multi-moving', hexagram: [6, 9, 7, 8, 7, 8] },
]

describe('serializeCastingMarkdown parity', () => {
  it('full casting', () => {
    const section = sectionsOf('q', [7, 7, 7, 7, 7, 7], casting).find(
      (s) => s.kind === 'casting',
    )! as CastingSection
    expect(serializeCastingMarkdown(section)).toBe(castingMarkdownSection(casting))
  })
  it('null casting', () => {
    const section = sectionsOf('q', [7, 7, 7, 7, 7, 7], null).find(
      (s) => s.kind === 'casting',
    )! as CastingSection
    expect(serializeCastingMarkdown(section)).toBe(castingMarkdownSection(null))
  })
})

describe('serializeQueryMarkdown parity', () => {
  for (const q of ['Will the harvest be plentiful?', '']) {
    it(`query ${JSON.stringify(q)}`, () => {
      const section = sectionsOf(q, [7, 7, 7, 7, 7, 7], null).find(
        (s) => s.kind === 'query',
      )! as QuerySection
      expect(serializeQueryMarkdown(section)).toBe(queryMarkdownSection(q))
    })
  }
})

describe('serializeTransformationMarkdown parity', () => {
  for (const { name, hexagram } of gateHexagrams) {
    it(`transformation (${name})`, () => {
      const section = sectionsOf('q', hexagram, null).find(
        (s) => s.kind === 'transformation',
      )! as TransformationSection
      expect(serializeTransformationMarkdown(section)).toBe(
        transformationMarkdownSection(hexagram),
      )
    })
  }
})

describe('serializeHexagramMarkdown parity', () => {
  for (const { name, hexagram } of gateHexagrams) {
    it(`standing (${name})`, () => {
      const section = sectionsOf('q', hexagram, null).find(
        (s) => s.kind === 'hexagram' && s.role === 'standing',
      )! as HexagramSection
      expect(serializeHexagramMarkdown(section)).toBe(
        standingHexagramMarkdownSection(hexagram),
      )
    })
    it(`emerging (${name})`, () => {
      const section = sectionsOf('q', hexagram, null).find(
        (s) => s.kind === 'hexagram' && s.role === 'emerging',
      ) as HexagramSection | undefined
      if (section === undefined) return
      expect(serializeHexagramMarkdown(section)).toBe(
        emergingHexagramMarkdownSection(hexagram),
      )
    })
  }
})

describe('serializeLinesMarkdown parity', () => {
  for (const { name, hexagram } of gateHexagrams) {
    it(`lines (${name})`, () => {
      const section = sectionsOf('q', hexagram, null).find(
        (s) => s.kind === 'text' && s.role === 'lines',
      )! as TextSection
      expect(serializeLinesMarkdown(section)).toBe(linesMarkdownBlock(hexagram))
    })
  }
})
