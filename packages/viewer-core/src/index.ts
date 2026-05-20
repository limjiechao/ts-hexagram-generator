// @hexagram/viewer-core — generic terminal-UI building blocks shared by the
// consultation viewer flows. Chrome (TabBar / FooterBar / QueryBox /
// scrolling), layout maths, the data-driven keymap, the ANSI palette, and the
// section/composer renderers that turn a consultation into per-tab strings.

// Tabbed scrollable consultation readout shell — generic chrome engine that
// serves both the casting-flow view and standalone readouts via slots.
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

// ANSI palette constants used by the formatted output.
export {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  HEADING_GREY,
  MUTED_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
  VALUE_WHITE,
} from './output-palette.js'

// Section builders — the per-section ANSI string renderers.
export {
  castingSection,
  emergingHexagramSection,
  linesBlock,
  noMovingLinesSection,
  querySection,
  standingHexagramSection,
  transformationSection,
} from './output-sections.js'

// Pure validators / type guards shared by the renderers.
export {
  assertLine1ToLine6,
  isLine1ToLine6,
  isLineIndex,
  isMovingLine,
} from './utils-validators.js'

// Viewer chrome — TabBar / FooterBar / QueryBox / scrolling primitives.
export {
  FooterBar,
  KEY_HINTS_FLOW_DEFAULT,
  KEY_HINTS_TEMPLATE,
  keyHintsForCasting,
  QueryBox,
  ScrollableSection,
  ScrollbarTrack,
  TabBar,
  type NonEmpty,
  type TabDescriptor,
  type TabId,
} from './viewer-chrome.js'

// Data-driven viewer keymap.
export {
  ALWAYS,
  BINDINGS,
  dispatchKey,
  IN_CASTING_SLIDER,
  IN_DONE,
  type FlowMode,
  type FlowStateSlice,
  type InputMode,
  type KeyBinding,
  type KeyContext,
} from './viewer-keymap.js'

// Layout maths — scroll / wrap / clamp helpers, height constants, progress bar.
export {
  ANSI_PATTERN,
  clamp,
  computeWrapWidth,
  ELLIPSIS,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  MARGIN_CONTENT_TO_NEXT,
  MARGIN_QUERY_TO_TABS,
  MIN_CONTENT_WIDTH,
  QUERY_BORDER_HEIGHT,
  renderProgressBar,
  stripAnsi,
  TAB_BAR_HEIGHT,
  truncateEnd,
  truncateStart,
  wrapToWidth,
} from './viewer-layout.js'
