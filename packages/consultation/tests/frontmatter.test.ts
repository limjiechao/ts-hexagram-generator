import type { CastingRecord, LineCasting } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import {
  castingFromYaml,
  castingToYaml,
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
