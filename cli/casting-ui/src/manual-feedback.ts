// UI-layer manual-flow helpers. The I Ching INVARIANTS live in
// `@hexagram/core/manual-validation` (validateManualSplit); this module owns
// ONLY the casting-ui concerns: parsing a digit buffer, and routing the
// validator's outcome to a render surface. It does NOT re-export the core
// validator — consumers import validateManualSplit / ManualSplitValidation
// straight from core, so the package boundary stays legible.

import type { ManualSplitValidation } from '@hexagram/core/manual-validation'

/**
 * Where each validator outcome surfaces in the manual prompt — the SINGLE
 * statement of routing that was previously implicit across the render
 * (`missingColor`, the strip-branch selector) and the bottom-strip type:
 *
 *   - 'gauge' — conservation: shown ONLY as the red MISSING gauge, never as
 *     strip text (a counting error reads best as a number, not a sentence).
 *   - 'strip' — zero-remainder / suspended-sum: rule violations shown as
 *     BOLD_RED strip text.
 *   - 'none'  — incomplete / ok: no error surface (mid-edit or commit-ready).
 *
 * The `switch` is exhaustive over `ManualSplitValidation['kind']`, so adding a
 * new core outcome forces a routing decision here (the missing `case` fails
 * `tsc`).
 */
export function manualFeedbackSurface(
  kind: ManualSplitValidation['kind'],
): 'strip' | 'gauge' | 'none' {
  switch (kind) {
    case 'conservation':
      return 'gauge'
    case 'zero-remainder':
    case 'suspended-sum':
      return 'strip'
    case 'incomplete':
    case 'ok':
      return 'none'
  }
}

// Parse a digit-buffer into an integer, or `null` if the buffer is empty or
// fails the integer check. Module-scoped so React doesn't recreate it per
// render; closure-less.
export function parseManualBuffer(buffer: string): number | null {
  if (buffer.length === 0) return null
  const parsed = Number.parseInt(buffer, 10)
  return Number.isInteger(parsed) ? parsed : null
}
