import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  buildConsultationView,
  castingSection,
  querySection,
} from '../src/build-view.js'
import type {
  CastingSection,
  QuerySection,
  TextSection,
  TransformationSection,
} from '../src/ir.js'

const casting: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 1, recordedMax: 48 },
  { pick: 2, recordedMax: 43 },
  { pick: 3, recordedMax: 39 },
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

describe('buildConsultationView medium divergence (S5)', () => {
  // The IR's ONE deliberate medium-aware divergence (ADR-0018 + the visibility
  // matrix above buildConsultationView): for a STATIC hexagram the same
  // hexagram-level scripture is emitted as `text:hexagram` (ANSI-only) AND
  // `text:lines:none` (Markdown-only). Without this guard a refactor that
  // "unified" the media flags would change neither section order nor kind —
  // so nothing else here would catch it — yet it would break each medium's
  // legacy byte layout. Pin the divergence as an executable invariant.
  const textSection = (h: Hexagram, role: string, variant: string) =>
    buildConsultationView('Q', h, casting).sections.find(
      (s): s is TextSection =>
        s.kind === 'text' &&
        (s as TextSection).role === role &&
        (s as TextSection).variant === variant,
    )!

  it('static hexagram: scripture is ANSI via text:hexagram, Markdown via text:lines:none — same words', () => {
    const staticHex: Hexagram = [7, 8, 7, 8, 7, 8]
    const hexagramText = textSection(staticHex, 'hexagram', 'hexagram')
    const linesNone = textSection(staticHex, 'lines', 'none')

    expect(hexagramText.media).toEqual(['ansi'])
    expect(linesNone.media).toEqual(['markdown'])
    // Same words, two section identities — the divergence is medium, not content.
    expect(linesNone.variants).toEqual(hexagramText.variants)
  })

  it('one moving line: LINES carries the line reading and renders in both media', () => {
    const movingHex: Hexagram = [6, 7, 8, 7, 8, 7]
    // Standing + emerging hexagram scripture stay ANSI-only.
    for (const s of buildConsultationView('Q', movingHex, casting).sections)
      if (s.kind === 'text' && s.role === 'hexagram')
        expect(s.media).toEqual(['ansi'])
    // The LINES block now carries the moving-line reading (not the hexagram
    // scripture) and is shared by both media — no divergence in this case.
    expect(textSection(movingHex, 'lines', 'one').media).toEqual([
      'ansi',
      'markdown',
    ])
  })
})

describe('buildConsultationView absence reason', () => {
  it('threads the reason into the casting section when casting is null', () => {
    const view = buildConsultationView(
      'q',
      [7, 7, 7, 7, 7, 7],
      null,
      'playground',
    )
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
  // ADR-0018: buildConsultationView is the SOLE owner of each section's `media`
  // projection. These pin that it mints query/casting via the shared public
  // sub-builders, so a second authority (e.g. the mid-flow render in
  // buildPartialCastingSections) can reuse them instead of hand-writing a
  // divergent `media` literal — see seam B2 in the 2026-06-08 review.
  it('mints the query section via the querySection sub-builder', () => {
    const view = buildConsultationView(
      'a question',
      [7, 7, 7, 7, 7, 7],
      casting,
    )
    const section = view.sections.find(
      (s) => s.kind === 'query',
    ) as QuerySection
    expect(section).toEqual(querySection('a question'))
  })
  it('mints the casting section via the castingSection sub-builder', () => {
    const view = buildConsultationView('q', [7, 7, 7, 7, 7, 7], casting)
    const section = view.sections.find(
      (s) => s.kind === 'casting',
    ) as CastingSection
    expect(section).toEqual(castingSection(casting))
  })
  it('mints the null/absence casting section via the sub-builder', () => {
    const view = buildConsultationView(
      'q',
      [7, 7, 7, 7, 7, 7],
      null,
      'playground',
    )
    const section = view.sections.find(
      (s) => s.kind === 'casting',
    ) as CastingSection
    expect(section).toEqual(castingSection(null, 'playground'))
  })
  it('never leaks a reason into a present-casting render', () => {
    const view = buildConsultationView(
      'q',
      [7, 7, 7, 7, 7, 7],
      casting,
      'playground',
    )
    const section = view.sections.find((s) => s.kind === 'casting') as
      | CastingSection
      | undefined
    expect(section?.rows).not.toBeNull()
    expect(section?.absenceReason).toBeNull()
  })
})
