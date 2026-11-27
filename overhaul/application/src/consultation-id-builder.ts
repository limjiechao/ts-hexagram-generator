import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'

import type { RandomSource } from '#src/random-source.js'

/** Crockford's base 32, the ULID alphabet: digit value v is symbol v. */
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const timeCharacters = 10
const randomCharacters = 16
const timeLimit = 2 ** 48

/**
 * A new Consultation Id, a ULID (ADR-0046): the 48-bit millisecond time in
 * ten characters, then sixteen characters drawn from the Random Source in
 * turn. A ULID cannot hold a time before the Unix epoch, from 2^48 on, or
 * between two milliseconds, so such a time throws and draws nothing.
 */
export function buildConsultationId(
  epochMilliseconds: number,
  randomSource: RandomSource,
): ConsultationId {
  if (
    !Number.isInteger(epochMilliseconds) ||
    epochMilliseconds < 0 ||
    epochMilliseconds >= timeLimit
  ) {
    throw new Error(
      `A Consultation Id cannot hold the time ${epochMilliseconds}: it needs a whole millisecond from 0 to 2^48 − 1.`,
    )
  }
  let time = ''
  let remaining = epochMilliseconds
  for (let at = 0; at < timeCharacters; at += 1) {
    time = crockford.charAt(remaining % 32) + time
    remaining = Math.floor(remaining / 32)
  }
  let random = ''
  for (let at = 0; at < randomCharacters; at += 1) {
    random += crockford.charAt(randomSource.integerBelow(32))
  }
  const id = time + random
  if (!isConsultationId(id)) {
    throw new Error(`${JSON.stringify(id)} is not a Consultation Id.`)
  }
  return id
}
