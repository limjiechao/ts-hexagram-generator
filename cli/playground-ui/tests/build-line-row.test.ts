// Characterization test: locks buildLineRow's exact output bytes across the
// input matrix BEFORE the convergence refactor, then guards it through the
// rewrite. The pulse-on vs pulse-off pair MUST be identical — that equality
// is the proof that `pulse` is inert in this function (it only ever fed
// deriveBannerLine's role, which buildLineRow never reads), justifying its
// removal in this task.

import type { Line } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { buildLineRow } from '../src/playground-display-rows'

// One representative cell per axis. Standing 9 = moving yang (→ emerging 8);
// standing 7 = static yang (→ emerging 7). Position label is the 3rd-place
// label the call site computes from POSITION_LABELS[3].
interface Case {
  readonly name: string
  readonly standingLine: Line
  readonly emergingLine: Line
  readonly focused: boolean
  readonly hasMoving: boolean
}

const cases: readonly Case[] = [
  { name: 'moving + focused + hasMoving', standingLine: 9, emergingLine: 8, focused: true, hasMoving: true },
  { name: 'moving + unfocused + hasMoving', standingLine: 9, emergingLine: 8, focused: false, hasMoving: true },
  { name: 'static + focused + hasMoving', standingLine: 7, emergingLine: 7, focused: true, hasMoving: true },
  { name: 'static + unfocused + ghost (no moving)', standingLine: 7, emergingLine: 7, focused: false, hasMoving: false },
  { name: 'static + focused + ghost (no moving)', standingLine: 7, emergingLine: 7, focused: true, hasMoving: false },
]

describe('buildLineRow output is stable across the input matrix', () => {
  for (const c of cases) {
    it(`${c.name} matches the locked snapshot`, () => {
      const row = buildLineRow({
        standingLine: c.standingLine,
        emergingLine: c.emergingLine,
        position: 3,
        focused: c.focused,
        hasMoving: c.hasMoving,
      })
      expect(row).toMatchSnapshot()
    })
  }

  // The pulse-inertness invariant was proven in the pre-rewrite snapshot run
  // (pulse=true and pulse=false produced byte-identical rows). `pulse` is now
  // gone from LineRowInputs, so there is nothing left to assert here.
})
