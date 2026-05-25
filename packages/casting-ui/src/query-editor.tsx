import {
  BOLD_WHITE,
  NORMAL,
  QUERY_ACCENT_BAR_PREFIX,
} from '@hexagram/viewer-core'
import { Text, useInput } from 'ink'
import { useEffect, useRef, type ReactElement } from 'react'

import { Cursor, isGlobalExitKey } from './editor-primitives.js'

interface QueryEditorProps {
  value: string
  focused: boolean
  width: number
  placeholder?: string
  onChange: (next: string) => void
  onSubmit: () => void
  /**
   * Witness — fires once on every `focused: false → true` transition, from a
   * `useEffect` so it runs on the same post-commit macrotask as Ink's internal
   * `useInput` listener registration. Callers (viewer, tests) can gate the
   * next keystroke on this signal and dodge the bind-race window where bytes
   * written between commit and bind would be silently dropped. See the
   * `ink-useinput-bind` skill.
   */
  onReady?: () => void
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
  const { value, focused, placeholder, onChange, onSubmit, onReady } = props
  // `props.width` is kept in the interface for call-site compatibility but
  // the accent-bar form renders inline text with no fixed-width constraint.

  // Latest-`onReady` ref so the fire-once effect below never has to depend on
  // (and re-run for) a fresh closure from the parent.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

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

  // Witness the `focused: false → true` transition from inside a `useEffect`
  // — which runs on the same post-commit macrotask phase as Ink's internal
  // `useInput` listener registration. Firing here is positive proof that the
  // keyboard handler is bound: callers (viewer, tests) can gate the next
  // keystroke on `onReady` and dodge the bind-race window where bytes written
  // between commit and bind would be silently dropped.
  const wasFocusedRef = useRef(false)
  useEffect(() => {
    if (focused && !wasFocusedRef.current) {
      wasFocusedRef.current = true
      onReadyRef.current?.()
    } else if (!focused && wasFocusedRef.current) {
      wasFocusedRef.current = false
    }
  }, [focused])

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
