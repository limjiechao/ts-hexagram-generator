import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { markdownConsultationBody } from '../src/markdown.js'

const casting: CastingRecord = [
  [
    { pick: 1, recordedMax: 48 },
    { pick: 2, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
  [
    { pick: 1, recordedMax: 48 },
    { pick: 2, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
  [
    { pick: 1, recordedMax: 48 },
    { pick: 2, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
  [
    { pick: 1, recordedMax: 48 },
    { pick: 2, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
  [
    { pick: 1, recordedMax: 48 },
    { pick: 2, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
  [
    { pick: 1, recordedMax: 48 },
    { pick: 2, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
]

describe('markdownConsultationBody', () => {
  it('composes the body in QUERY → CASTING → TRANSFORMATION → STANDING → [EMERGING] → LINES order', () => {
    const hex: Hexagram = [6, 7, 8, 7, 8, 7]
    const body = markdownConsultationBody('Q', hex, casting)
    const idxQuery = body.indexOf('## QUERY')
    const idxCasting = body.indexOf('## CASTING')
    const idxTransformation = body.indexOf('## TRANSFORMATION')
    const idxStanding = body.indexOf('## STANDING HEXAGRAM')
    const idxEmerging = body.indexOf('## EMERGING HEXAGRAM')
    const idxLines = body.indexOf('## LINES')
    expect(idxQuery).toBeLessThan(idxCasting)
    expect(idxCasting).toBeLessThan(idxTransformation)
    expect(idxTransformation).toBeLessThan(idxStanding)
    expect(idxStanding).toBeLessThan(idxEmerging)
    expect(idxEmerging).toBeLessThan(idxLines)
  })

  it('omits the EMERGING section when there are no moving lines', () => {
    const hex: Hexagram = [7, 8, 7, 8, 7, 8]
    const body = markdownConsultationBody('Q', hex, casting)
    expect(body).not.toContain('## EMERGING HEXAGRAM')
    expect(body).toContain('_(No transformation)_')
  })

  it('renders "Casting not recorded" when casting is null', () => {
    const hex: Hexagram = [6, 7, 8, 7, 8, 7]
    const body = markdownConsultationBody('Q', hex, null)
    expect(body).toContain('## CASTING\n\n_Casting not recorded._')
    // The rest of the body still renders.
    expect(body).toContain('## STANDING HEXAGRAM')
  })
})
