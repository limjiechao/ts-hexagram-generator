import { describe, expect, it } from 'vitest'

import type { ReceivedSequenceNumber } from '#src/received-sequence-number.js'

describe('Received Sequence Number', () => {
  it('is a place 1 to 64 in the received text, and nothing outside it', () => {
    const first: ReceivedSequenceNumber = 1
    const last: ReceivedSequenceNumber = 64
    // @ts-expect-error: the received text numbers from 1
    const zero: ReceivedSequenceNumber = 0
    // @ts-expect-error: there are 64 Hexagrams
    const beyond: ReceivedSequenceNumber = 65
    // @ts-expect-error: a place is a whole number
    const fraction: ReceivedSequenceNumber = 1.5

    expect([first, last, zero, beyond, fraction]).toHaveLength(5)
  })
})
