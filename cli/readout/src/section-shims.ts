// TEMPORARY section-builder shims (removed in Task 3d.2). They preserve the
// legacy per-section builder names that casting-ui's consultationConsoleOutput
// and the readout/casting-ui tests still import, each routed through the
// parity-proven IR serializers so the output stays byte-identical. Once the
// composer collapse (Phase 3d) removes their last callers, this file is deleted.

import {
  buildConsultationView,
  type CastingSection,
  type HexagramSection,
  type TextSection,
  type TransformationSection,
} from '@hexagram/consultation-view'
import type { Hexagram, PartialCastingRecord } from '@hexagram/core/types'

import {
  serializeCastingAnsi,
  serializeHexagramAnsi,
  serializeQueryAnsi,
  serializeTextAnsi,
  serializeTransformationAnsi,
} from './serialize-ansi.js'

// A static placeholder for shims that only consume one section of the view.
const PLACEHOLDER: Hexagram = [7, 7, 7, 7, 7, 7]

export function castingSection(casting: PartialCastingRecord | null): string {
  return serializeCastingAnsi(
    buildConsultationView('', PLACEHOLDER, casting).sections.find(
      (s) => s.kind === 'casting',
    )! as CastingSection,
  )
}

export function querySection(query: string): string {
  return serializeQueryAnsi({ kind: 'query', query })
}

export function transformationSection(hexagram: Hexagram): string {
  return serializeTransformationAnsi(
    buildConsultationView('', hexagram, null).sections.find(
      (s) => s.kind === 'transformation',
    )! as TransformationSection,
  )
}

export function standingHexagramSection(hexagram: Hexagram): string {
  return serializeHexagramAnsi(
    buildConsultationView('', hexagram, null).sections.find(
      (s) => s.kind === 'hexagram' && s.role === 'standing',
    )! as HexagramSection,
  )
}

export function emergingHexagramSection(hexagram: Hexagram): string {
  const emerging = buildConsultationView('', hexagram, null).sections.find(
    (s) => s.kind === 'hexagram' && s.role === 'emerging',
  ) as HexagramSection | undefined
  // Only ever called for moving hexagrams (the console composer's moving
  // branch); a static hexagram has no emerging section.
  if (emerging === undefined)
    throw new Error('emergingHexagramSection: no emerging section (static)')
  return serializeHexagramAnsi(emerging)
}

export function hexagramTextSection(hexagram: Hexagram): string {
  return serializeTextAnsi(
    buildConsultationView('', hexagram, null).sections.find(
      (s) => s.kind === 'text' && s.role === 'hexagram',
    )! as TextSection,
  )
}

export function linesBlock(hexagram: Hexagram): string {
  return serializeTextAnsi(
    buildConsultationView('', hexagram, null).sections.find(
      (s) => s.kind === 'text' && s.role === 'lines',
    )! as TextSection,
  )
}
