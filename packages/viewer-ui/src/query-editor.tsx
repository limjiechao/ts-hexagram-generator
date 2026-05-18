import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'

import { Cursor, isGlobalExitKey } from './editor-primitives.js'

interface QueryEditorProps {
  value: string
  focused: boolean
  width: number
  placeholder?: string
  onChange: (next: string) => void
  onSubmit: () => void
}

/**
 * Single-line editable query box. Controlled — caller owns the buffer.
 *
 * Accepts printable characters (including 'q'), Backspace/Delete, and Enter.
 * Ignores Escape and Ctrl+C so the viewer's global handler can exit cleanly.
 */
export function QueryEditor({
  value,
  focused,
  width,
  placeholder,
  onChange,
  onSubmit,
}: QueryEditorProps): ReactElement {
  useInput(
    (input, key) => {
      if (isGlobalExitKey(input, key)) return
      if (key.return) {
        if (value.trim().length > 0) onSubmit()
        return
      }
      if (key.backspace || key.delete) {
        if (value.length > 0) onChange(value.slice(0, -1))
        return
      }
      // Printable input only — Ink usually reports control sequences via the
      // `key` flags, but the testing harness (and some terminals) can pass
      // raw control bytes through `input`. The Unicode `\p{Cc}` (Control)
      // category rejects escape, Ctrl-C, arrow-key escapes, etc., so none
      // of those ever land in the buffer.
      if (input.length > 0 && !/\p{Cc}/u.test(input)) {
        onChange(value + input)
      }
    },
    { isActive: focused },
  )

  if (value.length === 0 && placeholder !== undefined) {
    // `paddingX={1}` inset the cursor and placeholder one column from the
    // border so they line up with the read-only `<QueryBox>` (which renders
    // its content with a leading space). The cursor still sits at content
    // column 0 — i.e. immediately where the next typed character will
    // appear — and the placeholder follows on the same row.
    return (
      <Box
        borderStyle="round"
        borderColor={focused ? 'cyan' : undefined}
        paddingX={1}
        width={width}
        flexShrink={0}
      >
        {focused && <Cursor />}
        <Text dimColor>{placeholder}</Text>
      </Box>
    )
  }

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyan' : undefined}
      paddingX={1}
      width={width}
      flexShrink={0}
    >
      <Text>{value}</Text>
      {focused && <Cursor />}
    </Box>
  )
}
