import { describe, expect, it } from 'vitest'

import { TRIGRAM_RECORDS } from '../src/models/trigrams.js'

// Pins the trigram Wen Wang order to the 說卦 sequence its source comment
// quotes (BUG-017): 帝出乎震，齊乎巽，相見乎離，致役乎坤，説言乎兑，戰乎乾，
// 勞乎坎，成言乎艮. The map previously disagreed with that comment.
describe('trigram Wen Wang order', () => {
  it('orders the eight trigrams as the 說卦 sequence', () => {
    const names = Object.values(TRIGRAM_RECORDS)
      .toSorted((a, b) => a.Metadata.Order.WenWang - b.Metadata.Order.WenWang)
      .map((record) => record.Name.Chinese.Traditional)
    expect(names).toEqual(['震', '巽', '離', '坤', '兌', '乾', '坎', '艮'])
  })
})
