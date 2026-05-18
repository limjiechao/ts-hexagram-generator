// Inquirer-driven interactive flow (plain mode and library use).
export { getHexagramViaInteraction } from './interactive-flow.js'

// Output composers — assemble per-tab strings for the viewer or the plain
// console renderer.
export {
  buildConsultationSections,
  buildPartialCastingSections,
  consultationConsoleOutput,
  type ConsultationSections,
} from './output-composers.js'

// File I/O — writes the saved consultation under `consultations/`.
export {
  consultationFileOutput,
  logAndSaveConsultationOutput,
} from './output-file.js'

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

// Inquirer prompt for the user's consultation query.
export { getUserQuery } from './prompts.js'

// CLI flag resolution (output mode, input mode, wrap width).
export {
  DEFAULT_MAX_WRAP_WIDTH,
  resolveInputMode,
  resolveOutputMode,
  resolveWrapWidth,
  type InputMode,
  type OutputMode,
} from './utils-mode.js'

// Ink viewer entry — full-screen tabbed consultation flow.
export { runConsultationViewer, type FlowKind } from './viewer.js'
