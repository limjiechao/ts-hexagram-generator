import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { buildConsultationView } from '../src/build-view.js'
import type {
  CastingSection,
  TextSection,
  TransformationSection,
} from '../src/ir.js'

const casting: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 1, max: 48 },
  { pick: 2, max: 43 },
  { pick: 3, max: 39 },
]) as CastingRecord

const kinds = (h: Hexagram) =>
  buildConsultationView('Q', h, casting).sections.map((s) =>
    s.kind === 'text' || s.kind === 'hexagram'
      ? `${s.kind}:${(s as { role: string }).role}`
      : s.kind,
  )

describe('buildConsultationView section order + gate', () => {
  it('no moving lines: no emerging hexagram/text sections', () => {
    expect(kinds([7, 8, 7, 8, 7, 8])).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'text:hexagram',
      'text:lines',
    ])
    const v = buildConsultationView('Q', [7, 8, 7, 8, 7, 8], casting)
    expect(v.hasMovingLines).toBe(false)
    const transformation = v.sections.find(
      (s) => s.kind === 'transformation',
    )! as TransformationSection
    expect(transformation.body).toBeNull()
  })

  it('one moving line: emerging present, LINES variant=one', () => {
    const ks = kinds([6, 7, 8, 7, 8, 7])
    expect(ks).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'text:hexagram',
      'hexagram:emerging',
      'text:hexagram',
      'text:lines',
    ])
    const lines = buildConsultationView(
      'Q',
      [6, 7, 8, 7, 8, 7],
      casting,
    ).sections.at(-1)! as TextSection
    expect(lines.variant).toBe('one')
    expect(lines.variants).toHaveLength(4)
  })

  it('multi moving lines: LINES variant=multi, no variants', () => {
    const lines = buildConsultationView(
      'Q',
      [6, 9, 7, 8, 7, 8],
      casting,
    ).sections.at(-1)! as TextSection
    expect(lines.variant).toBe('multi')
    expect(lines.variants).toHaveLength(0)
  })

  it('null casting: casting rows is null', () => {
    const v = buildConsultationView('Q', [6, 7, 8, 7, 8, 7], null)
    const cast = v.sections.find((s) => s.kind === 'casting')! as CastingSection
    expect(cast.rows).toBeNull()
  })

  it('full casting: 18 ledger rows, line label only on cast-3 rows', () => {
    const cast = buildConsultationView(
      'Q',
      [7, 7, 7, 7, 7, 7],
      casting,
    ).sections.find((s) => s.kind === 'casting')! as CastingSection
    const rows = cast.rows!
    expect(rows).toHaveLength(18)
    expect(rows.filter((r) => r.showLine)).toHaveLength(6)
    // first block is line 6, cast 3 on top
    expect(rows[0]).toMatchObject({
      lineNumber: 6,
      castNumber: 3,
      showLine: true,
    })
    // trailing rule on every block-bottom except the last
    expect(rows.filter((r) => r.trailingRule)).toHaveLength(5)
  })
})

describe('buildConsultationView absence reason', () => {
  it('threads the reason into the casting section when casting is null', () => {
    const view = buildConsultationView('q', [7, 7, 7, 7, 7, 7], null, 'playground')
    const section = view.sections.find((s) => s.kind === 'casting') as
      | CastingSection
      | undefined
    expect(section?.rows).toBeNull()
    expect(section?.absenceReason).toBe('playground')
  })
  it('defaults to null reason when omitted (live flow)', () => {
    const view = buildConsultationView('q', [7, 7, 7, 7, 7, 7], null)
    const section = view.sections.find((s) => s.kind === 'casting') as
      | CastingSection
      | undefined
    expect(section?.absenceReason ?? null).toBeNull()
  })
  it('never leaks a reason into a present-casting render', () => {
    const view = buildConsultationView('q', [7, 7, 7, 7, 7, 7], casting, 'playground')
    const section = view.sections.find((s) => s.kind === 'casting') as
      | CastingSection
      | undefined
    expect(section?.rows).not.toBeNull()
    expect(section?.absenceReason).toBeNull()
  })
})
