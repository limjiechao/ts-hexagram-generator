// Editor primitives shared by every in-Ink single-line text editor in the
// codebase — the casting flow's `<QueryEditor>` and the playground's
// `<SaveStrip>`. Two tiny pieces:
//
//   - `<Cursor>` — a blinky-block cursor stand-in. Ink has no native cursor
//     primitive, so we inverse a single trailing space to draw the eye to
//     the caret. The blink-off frame still occupies a column so layout
//     doesn't jump.
//
//   - `isGlobalExitKey()` — returns `true` for keystrokes the global
//     viewer/playground handler must always own (Escape, any Ctrl combo).
//     Single source of truth: every editor early-returns on this so a stray
//     Ctrl+C or Esc never gets consumed by the editor's input buffer.

import { Text } from 'ink'
import { useEffect, useState, type ReactElement } from 'react'

/** A blinky-block cursor stand-in. Renders an inverse space when focused. */
export function Cursor(): ReactElement {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setOn((value) => !value), 500)
    return () => {
      clearInterval(id)
    }
  }, [])
  return on ? <Text inverse> </Text> : <Text> </Text>
}

/**
 * Returns `true` for keystrokes the global host handler must always own —
 * Escape and any Ctrl combo. `q` and other letter keys are NOT in this list
 * because they must remain typable inside the editor buffer.
 */
export function isGlobalExitKey(
  _input: string,
  key: { escape?: boolean; ctrl?: boolean },
): boolean {
  if (key.escape) return true
  if (key.ctrl) return true
  return false
}
