import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { hexagramDiagramRows, hexagramIdentity } from '../src/build-view.js'

describe('hexagramIdentity', () => {
  it('carries the identity-stack trigram fields (Name Chinese + capitalized pinyin/English)', () => {
    const id = hexagramIdentity([7, 7, 7, 7, 7, 7]) // #1 Qian
    expect(id.wenWang).toBe('1')
    expect(id.upperTrigramChinese.length).toBeGreaterThan(0)
    expect(id.lowerTrigramChinese.length).toBeGreaterThan(0)
    // pinyin + English imagery are capitalized for the identity-stack rows.
    expect(id.upperTrigramPinyin[0]).toBe(
      id.upperTrigramPinyin[0]?.toUpperCase(),
    )
    expect(id.upperTrigramEnglish[0]).toBe(
      id.upperTrigramEnglish[0]?.toUpperCase(),
    )
  })

  it('also carries the distinct diagram-brace imagery fields', () => {
    const id = hexagramIdentity([7, 7, 7, 7, 7, 7])
    expect(id.upperTrigramImageryChinese.length).toBeGreaterThan(0)
    expect(id.upperTrigramImageryEnglish.length).toBeGreaterThan(0)
  })
})

describe('hexagramDiagramRows', () => {
  it('returns 6 top-first rows (position 6 → 1) with correct moving flags', () => {
    const hexagram: Hexagram = [6, 7, 8, 7, 8, 7] // one moving line at position 1
    const rows = hexagramDiagramRows(hexagram)
    expect(rows.map((r) => r.position)).toEqual([6, 5, 4, 3, 2, 1])
    expect(rows.map((r) => r.line)).toEqual([7, 8, 7, 8, 7, 6])
    // only the position-1 line (the moving 6, last in top-first order) moves.
    expect(rows.map((r) => r.moving)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
    ])
  })
})
