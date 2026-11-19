import { describe, expect, it } from 'vitest'

import { isEditionId } from '#src/edition-id.js'

describe('isEditionId', () => {
  it.each(['legge-1882', 'wilhelm-baynes-1967', 'wuyingdian-1739', 'legge'])(
    'accepts %s',
    (id) => {
      expect(isEditionId(id)).toBe(true)
    },
  )

  it.each([
    '',
    '-',
    'Legge-1882',
    'legge_1882',
    'legge 1882',
    '-legge-1882',
    'legge-1882-',
    'legge--1882',
    ' legge-1882',
    'legge-1882\n',
    'legge/1882',
    '理雅各-1882',
  ])('rejects %j', (id) => {
    expect(isEditionId(id)).toBe(false)
  })
})
