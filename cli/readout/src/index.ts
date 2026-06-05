// @hexagram/readout — the Consultation Readout renderer: the tabbed,
// scrollable readout component plus the IR→ANSI serializers that turn a
// consultation view into per-tab strings. Depends on @hexagram/viewer-core
// for the generic chrome (ScreenShell, TabBar, palette, layout maths),
// @hexagram/consultation-view for the medium-neutral IR + vocabulary, and
// @hexagram/core/getters for the derived hexagram data it renders.

// Tabbed scrollable consultation readout — the generic chrome engine wired to
// consultation sections; serves both the casting-flow view and standalone
// readouts (history) via slots. Owns its own input handling.
export {
  ConsultationReadout,
  type CastingPromptPan,
  type ConsultationReadoutProps,
} from './consultation-readout.js'

// Output composers — assemble the per-tab section strings consumed by the
// viewer and the plain console renderer.
export {
  buildConsultationSections,
  buildPartialCastingSections,
  type ConsultationSections,
} from './output-composers.js'

// Plain-console projection of the consultation-view IR (used by casting-ui's
// consultationConsoleOutput).
export { serializeConsoleOutput } from './serialize-ansi.js'

// Casting-table row geometry helpers, re-exported from their canonical home
// (@hexagram/consultation-view) so the viewer's auto-follow scroll keeps
// resolving them via @hexagram/readout.
export {
  castingTableActiveRow,
  castingTableFollowRow,
} from '@hexagram/consultation-view'
