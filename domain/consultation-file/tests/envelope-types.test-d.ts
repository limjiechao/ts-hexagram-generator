import type {
  CastingAbsenceReason,
  CastingRecord,
  Hexagram,
} from '@hexagram/core/types'
import { expectTypeOf } from 'vitest'

import type { SaveConsultationParams } from '../src/file.js'
import type {
  ConsultationEnvelope,
  CURRENT_SCHEMA_VERSION,
} from '../src/frontmatter.js'

// S3 — the type/disk contract must not be wider than the runtime invariant.
// The loader strict-equal-rejects every schemaVersion except
// `CURRENT_SCHEMA_VERSION` (ADR-0008 rejected versioned migrations), so a
// validated envelope can only carry that one literal. A plain `number` here
// would lie about a migration dimension the code does not implement; this
// pins the field to the truth. Enforced by `pnpm type:check` (tsconfig
// includes `tests/`).
expectTypeOf<ConsultationEnvelope['schemaVersion']>().toEqualTypeOf<
  typeof CURRENT_SCHEMA_VERSION
>()

// S3 — `casting` and `castingAbsence` are mutually exclusive (ADR-0008): a
// recorded casting carries no absence reason; an absent casting must record
// one. The exclusivity used to live only in runtime guards (the serializer
// spread, `saveConsultationFile`'s throw, the parser branch). These assertions
// lift it into the type: each impossible shape must NOT be assignable to the
// envelope / save-params union. Before the discriminated union every shape WAS
// assignable, so each `.not.toExtend` failed `type:check`; after it they pass.
type CommonFields = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  timestamp: string
  query: string
  hexagram: Hexagram
}

// Envelope: both-null (an absent casting with no reason) is unrepresentable.
expectTypeOf<
  CommonFields & { casting: null; castingAbsence: null }
>().not.toExtend<ConsultationEnvelope>()

// Envelope: both-set (a recorded casting with a reason) is unrepresentable.
expectTypeOf<
  CommonFields & {
    casting: CastingRecord
    castingAbsence: CastingAbsenceReason
  }
>().not.toExtend<ConsultationEnvelope>()

// Save params: a null casting with no reason is unrepresentable (this is the
// case the removed runtime throw used to catch — now a compile error).
expectTypeOf<{
  query: string
  hexagram: Hexagram
  casting: null
}>().not.toExtend<SaveConsultationParams>()

// Save params: a recorded casting with a reason is unrepresentable.
expectTypeOf<{
  query: string
  hexagram: Hexagram
  casting: CastingRecord
  castingAbsence: CastingAbsenceReason
}>().not.toExtend<SaveConsultationParams>()
