import {
  BOLD_WHITE,
  NORMAL,
  QUERY_ACCENT_BAR_PREFIX,
} from '@hexagram/viewer-core'
import { Text, useInput } from 'ink'
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
 * Renders with the same left `▌` accent-bar treatment as the read-only
 * `<QueryBox>` so the editable and frozen variants look consistent.
 *
 * Accepts printable characters (including 'q'), Backspace/Delete, and Enter.
 * Ignores Escape and Ctrl+C so the viewer's global handler can exit cleanly.
 */
export function QueryEditor(props: QueryEditorProps): ReactElement {
  const { value, focused, placeholder, onChange, onSubmit } = props
  // `props.width` is kept in the interface for call-site compatibility but
  // the accent-bar form renders inline text with no fixed-width constraint.
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
    // Empty buffer: accent bar + cursor (if focused) + dimmed placeholder.
    return (
      <Text>
        <Text dimColor>{QUERY_ACCENT_BAR_PREFIX}</Text>
        {focused && <Cursor />}
        <Text dimColor>{placeholder}</Text>
      </Text>
    )
  }

  return (
    <Text>
      <Text dimColor>{QUERY_ACCENT_BAR_PREFIX}</Text>
      <Text>{`${BOLD_WHITE}${value}${NORMAL}`}</Text>
      {focused && <Cursor />}
    </Text>
  )
}
