import type { CastingRecord, Hexagram, LineCasting } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  castingFromYaml,
  castingToYaml,
  hexagramFromYaml,
  hexagramToYaml,
  parseFrontmatter,
  serializeFrontmatter,
  type ConsultationEnvelope,
  type YamlCasting,
  type YamlHexagram,
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

const sampleHexagram: Hexagram = [7, 8, 7, 8, 9, 6]

describe('hexagramToYaml', () => {
  it('writes L6 first, L1 last, preserving bottom-first content', () => {
    const yaml: YamlHexagram = hexagramToYaml(sampleHexagram)
    expect(Object.keys(yaml)).toEqual(['L6', 'L5', 'L4', 'L3', 'L2', 'L1'])
    expect(yaml.L1).toBe(7) // bottom line
    expect(yaml.L6).toBe(6) // top line
  })
})

describe('hexagramFromYaml', () => {
  it('inverts back to a bottom-first 6-tuple', () => {
    expect(hexagramFromYaml(hexagramToYaml(sampleHexagram))).toEqual(
      sampleHexagram,
    )
  })
})

describe('hexagram round-trip', () => {
  it('is identity against the in-memory bottom-first tuple', () => {
    const hexagrams: Hexagram[] = [
      [7, 7, 7, 7, 7, 7],
      [8, 8, 8, 8, 8, 8],
      [6, 7, 8, 9, 6, 7],
      [9, 6, 8, 7, 9, 8],
    ]
    for (const hexagram of hexagrams) {
      expect(hexagramFromYaml(hexagramToYaml(hexagram))).toEqual(hexagram)
    }
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
    // hexagram is a keyed L6..L1 map (visual top-first):
    expect(text).toMatch(/hexagram:\n[ \t]+L6:/)
    const hexagramBlock = text.split('hexagram:')[1]!.split('casting:')[0]!
    expect(hexagramBlock.indexOf('L6:')).toBeLessThan(
      hexagramBlock.indexOf('L1:'),
    )
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
      'L6: 8',
      'L6: 99',
    )
    const result = parseFrontmatter(bad)
    expect(result.ok).toBe(false)
  })

  it('reports `unreadable` when a hexagram key is missing', () => {
    const bad = serializeFrontmatter(envelope, 'BODY').replace(
      /\n {2}L1: \d/,
      '',
    )
    const result = parseFrontmatter(bad)
    expect(result.ok).toBe(false)
  })
})

describe('nullable casting', () => {
  const noCasting: ConsultationEnvelope = { ...envelope, casting: null }

  it('omits the casting key entirely when casting is null', () => {
    const text = serializeFrontmatter(noCasting, 'BODY')
    expect(text).not.toMatch(/^casting:/m)
    // hexagram is still present:
    expect(text).toMatch(/hexagram:\n[ \t]+L6:/)
  })

  it('parses frontmatter with the casting key absent, yielding casting: null', () => {
    const text = serializeFrontmatter(noCasting, 'BODY')
    const result = parseFrontmatter(text)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.data.envelope.casting).toBeNull()
  })

  it('round-trips a null-casting envelope through serialize → parse', () => {
    const text = serializeFrontmatter(noCasting, 'BODY')
    const result = parseFrontmatter(text)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.data.envelope).toEqual(noCasting)
  })
})
