import { Text } from 'ink'
import { useEffect, useState, type ReactElement } from 'react'

// A blinky-block cursor stand-in. Ink has no native cursor primitive, so we
// inverse a single trailing space to draw the eye to the caret. Rendered only
// when the host editor is focused. The blink-off frame still occupies a
// column so layout doesn't jump.
export function Cursor(): ReactElement {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 500)
    return () => clearInterval(id)
  }, [])
  return on ? <Text inverse> </Text> : <Text> </Text>
}

// Returns true for keystrokes the global viewer handler must always own —
// Escape, Ctrl+C — so editors don't accidentally consume them. `q` is NOT in
// this list because it must remain a typable character inside the query box.
export function isGlobalExitKey(
  _input: string,
  key: { escape?: boolean; ctrl?: boolean },
): boolean {
  if (key.escape) return true
  if (key.ctrl) return true
  return false
}
