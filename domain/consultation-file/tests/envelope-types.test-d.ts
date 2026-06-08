import { expectTypeOf } from 'vitest'

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
