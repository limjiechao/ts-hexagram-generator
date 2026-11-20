import { expectTypeOf } from 'vitest'

import type {
  DivisionRule,
  NextRound,
  NextRoundResult,
  Refusal,
} from '#src/division.js'

// Checked by `pnpm type:check`, as the tsconfig includes `tests/`.
expectTypeOf<DivisionRule>().toEqualTypeOf<
  | 'valid-pick'
  | 'complete'
  | 'remainders'
  | 'conservation'
  | 'set-aside'
  | 'replay'
>()

// The only Casting `nextRound` refuses is one that does not replay.
expectTypeOf<NextRoundResult>().toEqualTypeOf<
  | { readonly outcome: 'next'; readonly round: NextRound }
  | {
      readonly outcome: 'refused'
      readonly refusal: Refusal & { readonly rule: 'replay' }
    }
>()
