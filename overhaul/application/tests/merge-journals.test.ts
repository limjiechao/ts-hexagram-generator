import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { DeletionRecord } from '@hexagram/consultation-journal/deletion-record'
import type { Journal } from '@hexagram/consultation-journal/journal'
import {
  decodeDeletionRecord,
  decodeRecord,
} from '@hexagram/consultation-journal/record-codec'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'
import { describe, expect, it, vi } from 'vitest'

import type { ConsultationStore } from '#src/consultation-store.js'
import { exportJournal, mergeJournal } from '#src/merge-journals.js'

// Every Id, Query and date below is invented.

function consultationOf(id: string, divinedAt: string): Consultation {
  const decoded = decodeRecord({
    schemaVersion: 2,
    id,
    divinedAt,
    query: `Will the bridge at Greyfen Hold stand, by record ${id.slice(-4)}?`,
    transformation: '787878',
  })
  if (decoded.outcome !== 'decoded') throw new Error('the record is unreadable')
  return decoded.consultation
}

function deletionRecordOf(
  consultationId: string,
  deletedAt: string,
): DeletionRecord {
  const decoded = decodeDeletionRecord({ consultationId, deletedAt })
  if (decoded.outcome !== 'decoded') throw new Error('no Deletion Record')
  return decoded.deletionRecord
}

const shared = consultationOf('01JC0000000000000000000001', '2026-09-01')
const firstOwn = consultationOf(
  '01JC0000000000000000000002',
  '2026-09-02T08:00:00.000+08:00',
)
const secondOwn = consultationOf('01JC0000000000000000000003', '2026-09-03')
const firstOther = consultationOf(
  '01JC0000000000000000000004',
  '2026-09-04T21:30:00.000-05:00',
)
const secondOther = consultationOf('01JC0000000000000000000005', '2026-09-05')

const deletedAt = '2026-11-20T08:30:00.000-05:00'

/** A file that failed to load, which is no Consultation. */
const unreadableFile: UnreadableFile = {
  location: '2026-09-09--01JC0000000000000000000009.md',
  reason: { kind: 'not-version-2' },
}

/**
 * A Consultation Store in memory that keeps the port's promises: `keep` of
 * an Id it holds does nothing; `remove` deletes the Consultation and keeps
 * the record even for an Id it never held, an earlier record for the same
 * Id standing. Every call is recorded.
 */
function memoryStore(
  initial: {
    readonly consultations?: readonly Consultation[]
    readonly deletionRecords?: readonly DeletionRecord[]
    readonly unreadable?: readonly UnreadableFile[]
  } = {},
) {
  const consultations = new Map(
    (initial.consultations ?? []).map((held) => [held.id, held]),
  )
  const deletionRecords = new Map(
    (initial.deletionRecords ?? []).map((record) => [
      record.consultationId,
      record,
    ]),
  )
  const unreadable = initial.unreadable ?? []
  const keep = vi.fn<ConsultationStore['keep']>((consultation) => {
    if (!consultations.has(consultation.id)) {
      consultations.set(consultation.id, consultation)
    }
    return Promise.resolve()
  })
  const remove = vi.fn<ConsultationStore['remove']>((record) => {
    if (!deletionRecords.has(record.consultationId)) {
      deletionRecords.set(record.consultationId, record)
    }
    consultations.delete(record.consultationId)
    return Promise.resolve()
  })
  const consultationStore: ConsultationStore = {
    keep,
    list: vi.fn<ConsultationStore['list']>(() =>
      Promise.resolve({
        consultations: [...consultations.values()],
        unreadable,
      }),
    ),
    get: vi.fn<ConsultationStore['get']>((id) =>
      Promise.resolve(consultations.get(id)),
    ),
    remove,
    deletionRecords: vi.fn<ConsultationStore['deletionRecords']>(() =>
      Promise.resolve([...deletionRecords.values()]),
    ),
  }
  return {
    ports: { consultationStore },
    keep,
    remove,
    /** What the Store holds now. */
    held: () => ({
      consultations: [...consultations.values()],
      deletionRecords: [...deletionRecords.values()],
    }),
  }
}

/** Compares two Journals without regard to order. */
function expectSameJournal(actual: Journal, expected: Journal): void {
  expect(actual.consultations).toHaveLength(expected.consultations.length)
  expect(actual.consultations).toEqual(
    expect.arrayContaining([...expected.consultations]),
  )
  expect(actual.deletionRecords).toHaveLength(expected.deletionRecords.length)
  expect(actual.deletionRecords).toEqual(
    expect.arrayContaining([...expected.deletionRecords]),
  )
}

function keptIds(keep: ReturnType<typeof memoryStore>['keep']): string[] {
  return keep.mock.calls.map(([consultation]) => consultation.id)
}

describe('exportJournal (use case 10)', () => {
  it('resolves to the Store’s Consultations and Deletion Records', async () => {
    const record = deletionRecordOf(firstOther.id, deletedAt)
    const store = memoryStore({
      consultations: [shared, firstOwn, secondOwn],
      deletionRecords: [record],
    })

    expectSameJournal(await exportJournal(store.ports), {
      consultations: [shared, firstOwn, secondOwn],
      deletionRecords: [record],
    })
  })

  it('leaves an Unreadable file out', async () => {
    const store = memoryStore({
      consultations: [shared],
      unreadable: [unreadableFile],
    })

    expectSameJournal(await exportJournal(store.ports), {
      consultations: [shared],
      deletionRecords: [],
    })
  })

  it('exports an empty Store as an empty Journal', async () => {
    expectSameJournal(await exportJournal(memoryStore().ports), {
      consultations: [],
      deletionRecords: [],
    })
  })

  it('writes nothing to the Store', async () => {
    const store = memoryStore({ consultations: [shared] })

    await exportJournal(store.ports)

    expect(store.keep).not.toHaveBeenCalled()
    expect(store.remove).not.toHaveBeenCalled()
  })

  it.each(['list', 'deletionRecords'] as const)(
    'rejects with the Store failure unchanged when %s fails',
    async (method) => {
      const failure = new Error('the Journal cannot be read')
      const store = memoryStore({ consultations: [shared] })
      const ports = {
        consultationStore: {
          ...store.ports.consultationStore,
          [method]: () => Promise.reject(failure),
        },
      }

      await expect(exportJournal(ports)).rejects.toBe(failure)
    },
  )
})

describe('mergeJournal (use case 10)', () => {
  it('keeps each incoming Consultation the Store does not hold, and counts it', async () => {
    const store = memoryStore({ consultations: [shared, firstOwn] })

    await expect(
      mergeJournal(store.ports, {
        consultations: [shared, firstOther, secondOther],
        deletionRecords: [],
      }),
    ).resolves.toEqual({ added: 2, removed: 0 })

    expectSameJournal(store.held(), {
      consultations: [shared, firstOwn, firstOther, secondOther],
      deletionRecords: [],
    })
  })

  it('does not count an incoming Consultation the Store already holds', async () => {
    const store = memoryStore({ consultations: [shared] })

    await expect(
      mergeJournal(store.ports, {
        consultations: [shared],
        deletionRecords: [],
      }),
    ).resolves.toEqual({ added: 0, removed: 0 })
    expectSameJournal(store.held(), {
      consultations: [shared],
      deletionRecords: [],
    })
  })

  it('removes each Consultation an incoming Deletion Record names, keeping the record as it came', async () => {
    const firstRecord = deletionRecordOf(firstOwn.id, deletedAt)
    const secondRecord = deletionRecordOf(
      secondOwn.id,
      '2026-11-27T09:15:00.000+08:00',
    )
    const store = memoryStore({ consultations: [shared, firstOwn, secondOwn] })

    await expect(
      mergeJournal(store.ports, {
        consultations: [],
        deletionRecords: [firstRecord, secondRecord],
      }),
    ).resolves.toEqual({ added: 0, removed: 2 })

    expect(store.remove).toHaveBeenCalledWith(firstRecord)
    expect(store.remove).toHaveBeenCalledWith(secondRecord)
    expectSameJournal(store.held(), {
      consultations: [shared],
      deletionRecords: [firstRecord, secondRecord],
    })
  })

  it('keeps an incoming Deletion Record for an Id the Store never held, without counting it', async () => {
    const record = deletionRecordOf(firstOther.id, deletedAt)
    const store = memoryStore({ consultations: [shared] })

    await expect(
      mergeJournal(store.ports, {
        consultations: [],
        deletionRecords: [record],
      }),
    ).resolves.toEqual({ added: 0, removed: 0 })

    expectSameJournal(store.held(), {
      consultations: [shared],
      deletionRecords: [record],
    })
  })

  it('never keeps an incoming Consultation the Store’s own Deletion Records name', async () => {
    const ownRecord = deletionRecordOf(firstOther.id, deletedAt)
    const store = memoryStore({
      consultations: [shared],
      deletionRecords: [ownRecord],
    })

    await expect(
      mergeJournal(store.ports, {
        consultations: [firstOther, secondOther],
        deletionRecords: [],
      }),
    ).resolves.toEqual({ added: 1, removed: 0 })

    expect(keptIds(store.keep)).not.toContain(firstOther.id)
    expectSameJournal(store.held(), {
      consultations: [shared, secondOther],
      deletionRecords: [ownRecord],
    })
  })

  it('never keeps an incoming Consultation its own Journal’s Deletion Records name', async () => {
    const incomingRecord = deletionRecordOf(firstOther.id, deletedAt)
    const store = memoryStore({ consultations: [shared] })

    await expect(
      mergeJournal(store.ports, {
        consultations: [firstOther, secondOther],
        deletionRecords: [incomingRecord],
      }),
    ).resolves.toEqual({ added: 1, removed: 0 })

    expect(keptIds(store.keep)).not.toContain(firstOther.id)
    expectSameJournal(store.held(), {
      consultations: [shared, secondOther],
      deletionRecords: [incomingRecord],
    })
  })

  it('removes a held Consultation that the incoming Journal both holds and names', async () => {
    const incomingRecord = deletionRecordOf(firstOwn.id, deletedAt)
    const store = memoryStore({ consultations: [shared, firstOwn] })

    await expect(
      mergeJournal(store.ports, {
        consultations: [firstOwn],
        deletionRecords: [incomingRecord],
      }),
    ).resolves.toEqual({ added: 0, removed: 1 })

    expectSameJournal(store.held(), {
      consultations: [shared],
      deletionRecords: [incomingRecord],
    })
  })

  it('changes nothing and counts nothing for an empty Journal', async () => {
    const ownRecord = deletionRecordOf(firstOther.id, deletedAt)
    const store = memoryStore({
      consultations: [shared, firstOwn],
      deletionRecords: [ownRecord],
    })

    await expect(
      mergeJournal(store.ports, { consultations: [], deletionRecords: [] }),
    ).resolves.toEqual({ added: 0, removed: 0 })

    expect(store.keep).not.toHaveBeenCalled()
    expect(store.remove).not.toHaveBeenCalled()
    expectSameJournal(store.held(), {
      consultations: [shared, firstOwn],
      deletionRecords: [ownRecord],
    })
  })

  it('merging the same Journal twice is the same as merging it once, and counts nothing the second time', async () => {
    const incoming: Journal = {
      consultations: [shared, firstOther, secondOther],
      deletionRecords: [deletionRecordOf(firstOwn.id, deletedAt)],
    }
    const store = memoryStore({ consultations: [shared, firstOwn, secondOwn] })

    await expect(mergeJournal(store.ports, incoming)).resolves.toEqual({
      added: 2,
      removed: 1,
    })
    const afterOnce = store.held()
    await expect(mergeJournal(store.ports, incoming)).resolves.toEqual({
      added: 0,
      removed: 0,
    })

    expectSameJournal(store.held(), afterOnce)
  })

  it('merged both ways, leaves both Stores with the union less every deleted Consultation', async () => {
    // Each side once held what the other has since deleted.
    const deletedByOwn = deletionRecordOf(firstOther.id, deletedAt)
    const deletedByOther = deletionRecordOf(
      firstOwn.id,
      '2026-11-27T09:15:00.000+08:00',
    )
    const own = memoryStore({
      consultations: [shared, firstOwn, secondOwn],
      deletionRecords: [deletedByOwn],
    })
    const other = memoryStore({
      consultations: [shared, firstOther, secondOther],
      deletionRecords: [deletedByOther],
    })

    await expect(
      mergeJournal(other.ports, await exportJournal(own.ports)),
    ).resolves.toEqual({ added: 1, removed: 1 })
    await expect(
      mergeJournal(own.ports, await exportJournal(other.ports)),
    ).resolves.toEqual({ added: 1, removed: 1 })

    const union: Journal = {
      consultations: [shared, secondOwn, secondOther],
      deletionRecords: [deletedByOwn, deletedByOther],
    }
    expectSameJournal(own.held(), union)
    expectSameJournal(other.held(), union)

    await expect(
      mergeJournal(other.ports, await exportJournal(own.ports)),
    ).resolves.toEqual({ added: 0, removed: 0 })
    await expect(
      mergeJournal(own.ports, await exportJournal(other.ports)),
    ).resolves.toEqual({ added: 0, removed: 0 })
    expectSameJournal(own.held(), union)
    expectSameJournal(other.held(), union)
  })

  it('reads the Store’s own Deletion Records before keeping', async () => {
    const store = memoryStore({ consultations: [shared] })
    const order: string[] = []
    store.keep.mockImplementation(() => {
      order.push('keep')
      return Promise.resolve()
    })
    const ports = {
      consultationStore: {
        ...store.ports.consultationStore,
        deletionRecords: () => {
          order.push('deletionRecords')
          return Promise.resolve([])
        },
      },
    }

    await mergeJournal(ports, {
      consultations: [firstOther],
      deletionRecords: [],
    })

    expect(order).toContain('keep')
    expect(order.indexOf('deletionRecords')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('deletionRecords')).toBeLessThan(order.indexOf('keep'))
  })

  describe('rejects with the Store failure unchanged', () => {
    const failure = new Error('the Journal cannot be written')

    it('when remove fails', async () => {
      const store = memoryStore({ consultations: [firstOwn] })
      store.remove.mockImplementation(() => Promise.reject(failure))

      await expect(
        mergeJournal(store.ports, {
          consultations: [],
          deletionRecords: [deletionRecordOf(firstOwn.id, deletedAt)],
        }),
      ).rejects.toBe(failure)
    })

    it('when keep fails', async () => {
      const store = memoryStore()
      store.keep.mockImplementation(() => Promise.reject(failure))

      await expect(
        mergeJournal(store.ports, {
          consultations: [firstOther],
          deletionRecords: [],
        }),
      ).rejects.toBe(failure)
    })

    it('when the Store’s Deletion Records cannot be read', async () => {
      const store = memoryStore()
      const ports = {
        consultationStore: {
          ...store.ports.consultationStore,
          deletionRecords: () => Promise.reject(failure),
        },
      }

      await expect(
        mergeJournal(ports, {
          consultations: [firstOther],
          deletionRecords: [],
        }),
      ).rejects.toBe(failure)
      expect(store.keep).not.toHaveBeenCalled()
    })
  })
})
