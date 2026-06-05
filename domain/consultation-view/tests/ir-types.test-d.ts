import { expectTypeOf } from 'vitest'

import type { ConsultationSection } from '../src/ir.js'

// A serializer must handle every variant; this proves the discriminant set.
function kindOf(s: ConsultationSection): string {
  switch (s.kind) {
    case 'query':
      return 'query'
    case 'casting':
      return 'casting'
    case 'transformation':
      return 'transformation'
    case 'hexagram':
      return 'hexagram'
    case 'text':
      return 'text'
    // no default — a new variant must surface as a compile error here
  }
}
expectTypeOf(kindOf).toBeFunction()
