import { describe, expect, it } from 'vitest'

import { isQuery } from '#src/query.js'

describe('isQuery', () => {
  it.each([
    'Should Greyfen Hold open its gates?',
    'x',
    '  leading and trailing spaces  ',
    'first line\nsecond line',
    '\n\tindented after a blank line',
  ])('accepts %j', (query) => {
    expect(isQuery(query)).toBe(true)
  })

  it.each(['', ' ', '   ', '\n', '\t\r\n ', '　', ' '])(
    'rejects the blank %j',
    (query) => {
      expect(isQuery(query)).toBe(false)
    },
  )
})
