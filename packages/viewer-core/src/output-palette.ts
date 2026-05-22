// ANSI palette shared by every output surface (the Ink viewer + the plain
// console composer + the saved-file output). Kept in its own module so
// nothing that just needs colour constants has to also pull in section
// renderers or filesystem I/O.
//
// IMPORTANT: do not change the underlying ANSI bytes for the semantic
// aliases that flow through the populated-output path — the byte-identity
// fixtures in `tests/fixtures/plain-output-*.txt` depend on them.

export const BOLD_GREY = '[1;90m'
export const BOLD_WHITE = '[1;97m'
export const BOLD_RED = '[1;91m'
// Dimmed red (SGR 2;91) — the home banner's moving lines on their dim pulse
// beat. Pairs with BOLD_RED for the bright beat.
export const DIM_RED = '[2;91m'
export const NORMAL = '[0m'
export const NORMAL_GREY = '[90m'

// Reset the foreground colour only (SGR 39). Unlike NORMAL (SGR 0) this
// leaves other attributes intact — notably Ink's `dimColor` wrapper — so a
// colour run can end without un-dimming the surrounding text.
export const DEFAULT_FG = '[39m'

// Semantic palette — aliases over the base ANSI constants so callers can
// reference intent ("placeholder", "heading") instead of raw weights.
export const HEADING_GREY: typeof BOLD_GREY = BOLD_GREY // section titles, column labels
export const VALUE_WHITE: typeof BOLD_WHITE = BOLD_WHITE // populated numbers, user input
export const MUTED_GREY: typeof NORMAL_GREY = NORMAL_GREY // labels, hints
export const PLACEHOLDER_GREY = '[37m' // medium-dim for the `·` placeholder

// White foreground (SGR 37) — the home banner's seal + wordmark. A
// separately-named alias from PLACEHOLDER_GREY (same bytes, different intent)
// so the banner is a first-class output surface, not a borrowed placeholder.
export const WHITE = '[37m'
