import { describe, expect, it } from 'vitest'

import {
  runConsultationViewer,
  runManualConsultationViewer,
} from '../src/index.js'

// The package surface is the consumer contract: every bin and the composed
// CLI imports from `@hexagram/casting-ui` (the root index re-export), never
// the deep src paths. A passing build alone won't catch a missing re-export
// — these explicit assertions do.

describe('@hexagram/casting-ui — package exports', () => {
  it('exports runConsultationViewer', () => {
    expect(typeof runConsultationViewer).toBe('function')
  })

  it('exports runManualConsultationViewer', () => {
    expect(typeof runManualConsultationViewer).toBe('function')
  })
})
