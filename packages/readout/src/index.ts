// @hexagram/readout — the Consultation Readout renderer: the tabbed,
// scrollable readout component plus the per-section ANSI string builders that
// turn a consultation into per-tab strings. Depends on @hexagram/viewer-core
// for the generic chrome (ScreenShell, TabBar, palette, layout maths) and on
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

// Section builders — the per-section ANSI string renderers, plus the shared
// geometry constants (position labels, inter-column connector / gap) that
// downstream renderers like the playground reuse for byte-identical layout.
export {
  castingSection,
  castingTableActiveRow,
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  MOVING_ARROW,
  POSITION_LABELS,
  querySection,
  standingHexagramSection,
  STATIC_GAP,
  transformationSection,
} from './output-sections.js'
