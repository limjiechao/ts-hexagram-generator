import { BOLD_RED, BOLD_WHITE } from '@hexagram/viewer-core'

/**
 * The single home of the standing-column line colour. A standing line's value
 * renders BOLD_RED when it is a moving line (the line about to change), else
 * BOLD_WHITE. The emerging column never uses this — emerging lines are always
 * static — so callers gate on `role === 'standing'` themselves.
 *
 * Shared by the transformation + hexagram ANSI serializers (this package) and
 * the playground's standing/emerging line rows (@hexagram/playground-ui) so the
 * "moving line is red" decision lives in one place rather than being
 * hand-mirrored at each site (seam B3; ADR-0018 — the readout layer owns ANSI
 * presentation, renderers stay thin).
 */
export function standingLineColor(moving: boolean): string {
  return moving ? BOLD_RED : BOLD_WHITE
}
