import {
  isUtcOffset,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { decodeRecord } from '@hexagram/consultation-journal/record-codec'
import { describe, expect, it, vi } from 'vitest'

import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { deleteConsultation } from '#src/delete-consultation.js'

// Every Id, Query and date below is invented.

function moment(epochMilliseconds: number, offset: string): Moment {
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds, offset }
}

const decoded = decodeRecord({
  schemaVersion: 2,
  id: '01JE0A1B2C3D4E5F6G7H8J9K0M',
  divinedAt: '2026-10-28T19:45:30.000+08:00',
  query: 'Will the ferry at Ashmere run before the thaw?',
  transformation: '787878',
})
if (decoded.outcome !== 'decoded') throw new Error('the record is unreadable')
const held = decoded.consultation

/** 2026-11-27T01:15:00.000Z. */
const clockMoment = moment(1_795_742_100_000, '+08:00')

function untouched(): Promise<never> {
  return Promise.reject(
    new Error('deleting used a part of the Store it needs not'),
  )
}

/**
 * A Store that holds `held` and whose `remove` resolves unless told
 * otherwise, and a Clock that reads `clockMoment` unless told otherwise.
 * `keep` and `deletionRecords` are no part of deleting.
 */
function stubPorts(
  options: {
    readonly now?: Clock['now']
    readonly remove?: ConsultationStore['remove']
  } = {},
) {
  const remove = vi.fn<ConsultationStore['remove']>(
    options.remove ?? (() => Promise.resolve()),
  )
  const consultationStore: ConsultationStore = {
    keep: untouched,
    list: () => Promise.resolve({ consultations: [held], unreadable: [] }),
    get: (id) => Promise.resolve(id === held.id ? held : undefined),
    remove,
    deletionRecords: untouched,
  }
  const now = vi.fn<Clock['now']>(options.now ?? (() => clockMoment))
  return { ports: { consultationStore, clock: { now } }, remove, now }
}

describe('deleteConsultation (use case 6)', () => {
  it('has the Store remove the Consultation once, by a record stamped from the Clock', async () => {
    const { ports, remove } = stubPorts()

    await expect(deleteConsultation(ports, held.id)).resolves.toBeUndefined()

    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith({
      consultationId: held.id,
      deletedAt: clockMoment,
    })
  })

  it.each(['+08:00', '-05:00', '+00:00', '+14:00', '-12:00'])(
    'keeps the offset %s the Clock reads in',
    async (offset) => {
      const read = moment(1_795_837_212_345, offset)
      const { ports, remove } = stubPorts({ now: () => read })

      await deleteConsultation(ports, held.id)

      expect(remove).toHaveBeenCalledWith({
        consultationId: held.id,
        deletedAt: read,
      })
    },
  )

  it('rejects with the Store failure unchanged', async () => {
    const failure = new Error('the Journal cannot be written')
    const { ports } = stubPorts({ remove: () => Promise.reject(failure) })

    await expect(deleteConsultation(ports, held.id)).rejects.toBe(failure)
  })
})
