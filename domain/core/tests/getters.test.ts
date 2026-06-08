import { describe, expect, it } from 'vitest'

import { getHexagramRecord } from '../src/getters.js'
import type { Hexagram } from '../src/types.js'

// Pins the runtime polarity ↔ key-digit mapping that the foundation `Yang`/`Yin`
// type aliases document (finding S10): a hexagram KEY uses `1` for yang and `2`
// for yin. The all-yang cast is #1 乾 (H111111); the all-yin cast is #2 坤
// (H222222). Without this, the aliases could silently invert again — the prior
// `Yin='1'; Yang='2'` lie went unnoticed precisely because nothing pinned it.
describe('getHexagramRecord polarity → key digit', () => {
  it('maps an all-yang cast (young yang 7) to #1 乾 / H111111', () => {
    const hex: Hexagram = [7, 7, 7, 7, 7, 7]
    const record = getHexagramRecord(hex)
    expect(record.Key).toBe('H111111')
    expect(record.Metadata.Order.WenWang).toBe(1)
  })

  it('maps an all-yin cast (young yin 8) to #2 坤 / H222222', () => {
    const hex: Hexagram = [8, 8, 8, 8, 8, 8]
    const record = getHexagramRecord(hex)
    expect(record.Key).toBe('H222222')
    expect(record.Metadata.Order.WenWang).toBe(2)
  })

  it('folds moving lines to their resting polarity (9→yang→1, 6→yin→2)', () => {
    const allOldYang: Hexagram = [9, 9, 9, 9, 9, 9]
    const allOldYin: Hexagram = [6, 6, 6, 6, 6, 6]
    expect(getHexagramRecord(allOldYang).Key).toBe('H111111')
    expect(getHexagramRecord(allOldYin).Key).toBe('H222222')
  })
})
