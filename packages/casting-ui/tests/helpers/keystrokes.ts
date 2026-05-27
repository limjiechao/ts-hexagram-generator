// Raw keystroke byte sequences for `ink-testing-library`'s `stdin.write()`.
// These mirror what an actual terminal sends when the user presses the key.
// Names + values colocated here so future tests do not duplicate the
// constants and accidentally drift apart.

export const ENTER = '\r'
export const BACKSPACE = '' // DEL — what xterm + most TUIs send for Backspace
export const ESCAPE = ''
export const CTRL_C = ''
export const SPACE = ' '

export const ARROW_UP = '[A'
export const ARROW_DOWN = '[B'
export const ARROW_RIGHT = '[C'
export const ARROW_LEFT = '[D'

export const TAB = '\t'
export const CTRL_R = ''
