// Linted as overhaul/remainder-group-policy/src/policy-type-imports-oracle.ts

// Twin for B4: the policy may take oracle's types, by a top-level
// `import type` or a type-position `import()`, since neither loads code.
import type { Pick } from '@hexagram/oracle/pick'

export type PolicyPick = Pick
export type PolicyRemainder = import('@hexagram/oracle/remainder').Remainder
