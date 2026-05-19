import { Text, useInput } from 'ink'
import type { ReactElement } from 'react'

import { Cursor, isGlobalExitKey } from './editor-primitives.js'

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
        const parsed = Number.parseInt(value, 10)
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
