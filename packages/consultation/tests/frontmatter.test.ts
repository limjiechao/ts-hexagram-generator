import type { CastingRecord, LineCasting } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import {
  castingFromYaml,
  castingToYaml,
  parseFrontmatter,
  serializeFrontmatter,
  type ConsultationEnvelope,
  type YamlCasting,
} from '../src/frontmatter'

const sampleLine = (a: number, b: number, c: number): LineCasting => [
  { pick: a, max: 48 },
  { pick: b, max: 43 },
  { pick: c, max: 39 },
]

const sampleCasting: CastingRecord = [
  sampleLine(1, 2, 3), // L1 (bottom)
  sampleLine(11, 12, 13), // L2
  sampleLine(21, 22, 23), // L3
  sampleLine(31, 32, 33), // L4
  sampleLine(41, 42, 43), // L5
  sampleLine(51, 52, 53), // L6 (top)
]

describe('castingToYaml', () => {
  it('writes L6 first, L1 last, preserving line content', () => {
    const yaml: YamlCasting = castingToYaml(sampleCasting)
    expect(Object.keys(yaml)).toEqual(['L6', 'L5', 'L4', 'L3', 'L2', 'L1'])
    expect(yaml.L6).toEqual(sampleLine(51, 52, 53))
    expect(yaml.L1).toEqual(sampleLine(1, 2, 3))
  })
})

describe('castingFromYaml', () => {
  it('inverts back to a bottom-first 6-tuple', () => {
    const yaml = castingToYaml(sampleCasting)
    const recovered = castingFromYaml(yaml)
    expect(recovered).toEqual(sampleCasting)
  })
})

describe('round-trip', () => {
  it('is identity for every line position', () => {
    expect(castingFromYaml(castingToYaml(sampleCasting))).toEqual(sampleCasting)
  })
})

const envelope: ConsultationEnvelope = {
  schemaVersion: 1,
  timestamp: '2026-05-19T14:23:11+0800',
  query: 'Will the harvest be plentiful?',
  hexagram: [7, 8, 7, 8, 7, 8],
  casting: sampleCasting,
}

describe('serializeFrontmatter', () => {
  it('emits a fenced YAML block with schemaVersion, timestamp, query, hexagram, casting', () => {
    const text = serializeFrontmatter(envelope, 'BODY')
    expect(text.startsWith('---\n')).toBe(true)
    expect(text).toMatch(/schemaVersion: 1/)
    expect(text).toMatch(/timestamp: '2026-05-19T14:23:11\+0800'/)
    expect(text).toMatch(/hexagram:\n[ \t]+- 7/)
    expect(text).toMatch(/casting:/)
    // L6 comes before L1 in casting:
    const castingBlock = text.split('casting:')[1]!
    expect(castingBlock.indexOf('L6:')).toBeLessThan(
      castingBlock.indexOf('L1:'),
    )
    expect(text).toContain('\nBODY')
  })

  it('uses block scalar for multi-line queries', () => {
    const multiline: ConsultationEnvelope = {
      ...envelope,
      query: 'Line one\nLine two',
    }
    const text = serializeFrontmatter(multiline, 'BODY')
    expect(text).toMatch(/query: \|/)
    expect(text).toMatch(/ {2}Line one/)
    expect(text).toMatch(/ {2}Line two/)
  })
})

describe('parseFrontmatter', () => {
  it('round-trips a serialized envelope', () => {
    const text = serializeFrontmatter(envelope, 'BODY')
    const result = parseFrontmatter(text)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.data.envelope).toEqual(envelope)
    expect(result.data.body.trim()).toBe('BODY')
  })

  it('reports `unreadable` when schemaVersion mismatches', () => {
    const text = serializeFrontmatter(
      { ...envelope, schemaVersion: 99 },
      'BODY',
    )
    const result = parseFrontmatter(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('schema-version-mismatch')
  })

  it('reports `unreadable` when frontmatter is absent', () => {
    const result = parseFrontmatter('# Just a markdown body')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing-frontmatter')
  })

  it('reports `unreadable` when hexagram is malformed', () => {
    const bad = serializeFrontmatter(envelope, 'BODY').replace(
      '- 7\n  - 8\n  - 7\n  - 8\n  - 7\n  - 8',
      '- 7\n  - 99',
    )
    const result = parseFrontmatter(bad)
    expect(result.ok).toBe(false)
  })
})
