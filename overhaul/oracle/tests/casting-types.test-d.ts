import { expectTypeOf } from 'vitest'

import type { PartialCasting } from '#src/casting.js'
import type { Round } from '#src/round.js'

// Checked by `pnpm type:check`, as the tsconfig includes `tests/`.

type Line = readonly [Round, Round, Round]

type Rounds = PartialCasting['rounds']

expectTypeOf<readonly []>().toExtend<Rounds>()
expectTypeOf<readonly [readonly [Round]]>().toExtend<Rounds>()
expectTypeOf<readonly [Line, readonly [Round, Round]]>().toExtend<Rounds>()
expectTypeOf<readonly [Line, Line, Line, Line, Line]>().toExtend<Rounds>()
expectTypeOf<
  readonly [Line, Line, Line, Line, Line, readonly [Round, Round]]
>().toExtend<Rounds>()

// Eighteen Rounds make a complete Casting, never a partial one.
expectTypeOf<
  readonly [Line, Line, Line, Line, Line, Line]
>().not.toExtend<Rounds>()

// A Line holds at most three Rounds.
expectTypeOf<
  readonly [readonly [Round, Round, Round, Round]]
>().not.toExtend<Rounds>()

// A Casting has six Lines.
expectTypeOf<
  readonly [Line, Line, Line, Line, Line, Line, readonly [Round]]
>().not.toExtend<Rounds>()

// Only the last Line may be unfinished.
expectTypeOf<readonly [readonly [Round], Line]>().not.toExtend<Rounds>()
