import { describe, expect, it } from 'vitest'

import { isConsultationId } from '#src/consultation-id.js'

describe('isConsultationId', () => {
  it.each([
    '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    '01JD4X9QH0000000000000000Z',
    '7ZZZZZZZZZZZZZZZZZZZZZZZZZ',
    '00000000000000000000000000',
  ])('accepts %s', (id) => {
    expect(isConsultationId(id)).toBe(true)
  })

  it.each([
    '',
    '01ARZ3NDEKTSV4RRFFQ69G5FA',
    '01ARZ3NDEKTSV4RRFFQ69G5FAVX',
    '01arz3ndektsv4rrffq69g5fav',
    '01ARZ3NDEKTSV4RRFFQ69G5FAI',
    '01ARZ3NDEKTSV4RRFFQ69G5FAL',
    '01ARZ3NDEKTSV4RRFFQ69G5FAO',
    '01ARZ3NDEKTSV4RRFFQ69G5FAU',
    ' 01ARZ3NDEKTSV4RRFFQ69G5FA',
    '01ARZ3NDEKTSV4RRFFQ69G5FA\n',
    '01ARZ3NDEKTSV4RRFFQ69G5FA-',
  ])('rejects %j', (id) => {
    expect(isConsultationId(id)).toBe(false)
  })

  it.each([
    '80000000000000000000000000',
    '9ZZZZZZZZZZZZZZZZZZZZZZZZZ',
    'ZZZZZZZZZZZZZZZZZZZZZZZZZZ',
  ])('rejects %s, whose first character overflows 128 bits', (id) => {
    expect(isConsultationId(id)).toBe(false)
  })
})
