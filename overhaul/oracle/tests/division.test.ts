import { describe, expect, it } from 'vitest'

import { emptyCasting } from '#src/division.js'

describe('emptyCasting', () => {
  it('is a partial Casting with no Rounds', () => {
    expect(emptyCasting).toEqual({ state: 'partial', rounds: [] })
  })
})
