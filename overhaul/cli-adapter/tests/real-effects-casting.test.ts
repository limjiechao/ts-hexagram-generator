import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { divide } from '@hexagram/application/divide'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import { cryptoRandomSource } from '@hexagram/node-effects/crypto-random-source'
import { systemClock } from '@hexagram/node-effects/system-clock'
import { describe, expect, it } from 'vitest'

import { composeCli } from '#src/composition-root.js'

// Every Query below is invented.

type Composed = ReturnType<typeof composeCli>

/** The ULID alphabet: Crockford's base 32, without I, L, O and U. */
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

/** Ten characters hold 50 bits, well inside a safe integer. */
function fromCrockford(text: string): number {
  let value = 0
  for (const character of text) {
    const digit = crockford.indexOf(character)
    if (digit === -1) throw new Error(`${character} is not in the alphabet`)
    value = value * 32 + digit
  }
  return value
}

const unused = () => Promise.reject(new Error('casting looked up scripture'))

function untouched(): Promise<never> {
  return Promise.reject(new Error('casting used more of the Store than keep'))
}

/** A Store held in memory: keep appends, and nothing else is used. */
function inMemoryStore() {
  const kept: CastConsultation[] = []
  const consultationStore: ConsultationStore = {
    keep: (consultation) => {
      if (consultation.origin !== 'cast')
        return Promise.reject(new Error('casting kept a Recorded Consultation'))
      kept.push(consultation)
      return Promise.resolve()
    },
    list: untouched,
    get: untouched,
    remove: untouched,
    deletionRecords: untouched,
  }
  return { consultationStore, kept }
}

/** Casts by Automatic Divisions until the Casting completes. */
function castAutomatically(cli: Composed) {
  let casting = cli.beginCasting()
  let result: ReturnType<typeof divide> | undefined
  for (let round = 1; round <= 18; round += 1) {
    const next = cli.nextRound(casting)
    if (next.outcome !== 'next') throw new Error('the Casting did not replay')
    result = cli.divide(
      casting,
      cli.drawAutomaticPick(next.round.remainderGroups),
    )
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('eighteen Divisions did not complete the Casting')
}

describe('composeCli with the system Clock and the node:crypto Random Source', () => {
  it('casts and keeps Cast Consultations whose Ids carry their Divined At and random characters of the alphabet', async () => {
    const scriptureCatalogue = {
      passageTexts: unused,
      hexagramNames: unused,
      receivedSequenceNumber: unused,
      trigramNames: unused,
      editions: unused,
    } satisfies ScriptureCatalogue
    const { consultationStore, kept } = inMemoryStore()
    const cli = composeCli({
      scriptureCatalogue,
      randomSource: cryptoRandomSource,
      consultationStore,
      clock: systemClock,
    })
    const queries = [
      'Should the invented lighthouse keep its old lamp?',
      'Will the invented ferry run before the thaw?',
      'Is the invented guild ready for a new hall?',
    ].map(query)

    const before = Date.now()
    const returned: CastConsultation[] = []
    for (const each of queries) {
      const consultation = cli.buildCastConsultation(
        each,
        castAutomatically(cli),
        'automatic',
      )
      await cli.keepCastConsultation(consultation)
      returned.push(consultation)
    }
    const after = Date.now()

    expect(kept).toStrictEqual(returned)
    expect(kept.map((consultation) => consultation.query)).toStrictEqual(
      queries,
    )
    for (const consultation of kept) {
      const { epochMilliseconds } = consultation.divinedAt
      expect(fromCrockford(consultation.id.slice(0, 10))).toBe(
        epochMilliseconds,
      )
      expect(consultation.id.slice(10)).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/)
      expect(epochMilliseconds).toBeGreaterThanOrEqual(before)
      expect(epochMilliseconds).toBeLessThanOrEqual(after)
    }
  })
})
