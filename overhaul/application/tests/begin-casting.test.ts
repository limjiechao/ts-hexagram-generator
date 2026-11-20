import { emptyCasting } from '@hexagram/oracle/division'
import { describe, expect, it } from 'vitest'

import { beginCasting } from '#src/begin-casting.js'

describe('beginCasting', () => {
  it('begins from the Empty Casting, with no Rounds', () => {
    expect(beginCasting()).toBe(emptyCasting)
  })
})
