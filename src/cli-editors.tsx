import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'

import { BOLD_RED, NORMAL } from './cli-utils-output.js'

// A blinky-block cursor stand-in. Ink has no native cursor primitive, so we
// inverse a single trailing space to draw the eye to the caret. Rendered only
// when the host editor is focused.
function Cursor(): ReactElement {
  return <Text inverse> </Text>
}

// Returns true for keystrokes the global viewer handler must always own —
// Escape, Ctrl+C — so editors don't accidentally consume them. `q` is NOT in
// this list because it must remain a typable character inside the query box.
function isGlobalExitKey(
  _input: string,
  key: { escape?: boolean; ctrl?: boolean },
): boolean {
  if (key.escape) return true
  if (key.ctrl) return true
  return false
}

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

  const display = value.length === 0 ? (placeholder ?? '') : value
  const dim = value.length === 0 && placeholder !== undefined
  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyan' : undefined}
      width={width}
      flexShrink={0}
    >
      <Text dimColor={dim}>{display}</Text>
      {focused && <Cursor />}
    </Box>
  )
}

interface NumberInputProps {
  value: string
  focused: boolean
  min: number
  max: number
  onChange: (next: string) => void
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
}

/**
 * Bounded integer input — replaces `@inquirer/prompts`'s `number` for the
 * in-tab casting prompts. Controlled buffer (string so leading zeros are
 * tolerated mid-edit). The submit gate is the source of truth for validation;
 * digits accumulate freely so the user can keep typing past `max` and correct
 * with Backspace before pressing Enter.
 */
export function NumberInput({
  value,
  focused,
  min,
  max,
  onChange,
  onSubmit,
  onError,
}: NumberInputProps): ReactElement {
  useInput(
    (input, key) => {
      if (isGlobalExitKey(input, key)) return
      if (key.return) {
        if (value.length === 0) return // empty Enter is a no-op (Inquirer parity)
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
          onError(`Pick a number from ${min} to ${max}.`)
          return
        }
        onError(null)
        onSubmit(parsed)
        return
      }
      if (key.backspace || key.delete) {
        if (value.length > 0) onChange(value.slice(0, -1))
        onError(null)
        return
      }
      // Digits only. The harness may batch multiple digits into one `input`
      // (`stdin.write('24')` arrives as a single chunk), so accept any run
      // of pure digits. Arrow keys etc. arrive as escape sequences which
      // contain control bytes and fail the all-digit test.
      if (input.length > 0 && /^\d+$/.test(input)) {
        onChange(value + input)
      }
    },
    { isActive: focused },
  )

  return (
    <>
      <Text>{value}</Text>
      {focused && <Cursor />}
    </>
  )
}

const ORDINAL_WORD: Record<0 | 1 | 2, '1st' | '2nd' | '3rd'> = {
  0: '1st',
  1: '2nd',
  2: '3rd',
}

interface CastingPromptBoxProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  min: number
  max: number
  buffer: string
  error: string | null
  width: number
  onChange: (next: string) => void
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
}

/**
 * The bordered prompt that hosts the in-tab `<NumberInput>` during the
 * casting phase. Title + prompt + (optional) error. Phrasing mirrors the
 * Inquirer prompt used by `getSplitIndex()` so muscle memory is preserved.
 *
 * Rendered height: 3 rows normally, 4 when `error !== null`. The viewer's
 * layout maths accounts for this so chrome never collides.
 */
export function CastingPromptBox({
  lineNumber,
  castIndex,
  min,
  max,
  buffer,
  error,
  width,
  onChange,
  onSubmit,
  onError,
}: CastingPromptBoxProps): ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text
        dimColor
      >{`Line ${lineNumber} · ${ORDINAL_WORD[castIndex]} Cast`}</Text>
      <Box flexDirection="row">
        <Text>{`Divide the stalks. Pick a number from ${min} to ${max}: `}</Text>
        <NumberInput
          value={buffer}
          focused
          min={min}
          max={max}
          onChange={onChange}
          onSubmit={onSubmit}
          onError={onError}
        />
      </Box>
      {error !== null && <Text>{`${BOLD_RED}${error}${NORMAL}`}</Text>}
    </Box>
  )
}
