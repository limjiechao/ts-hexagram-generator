import { Cursor, isGlobalExitKey } from '@hexagram/viewer-core'
import { Text, useInput } from 'ink'
import { useEffect, useRef, type ReactElement } from 'react'

interface NumberInputProps {
  value: string
  focused: boolean
  min: number
  max: number
  onChange: (next: string) => void
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
  /**
   * Witness signal — fired once per `focused: false → true` transition from
   * inside the same `useEffect` that binds `useInput`. Lets the parent (and
   * tests) gate cross-state keystrokes on the input handler being live,
   * sidestepping Ink's bind race where `useInput` registers on the macrotask
   * after commit and bytes written in between are silently dropped.
   */
  onReady?: () => void
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
  onReady,
}: NumberInputProps): ReactElement {
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

  // Witness the `focused: false → true` transition from inside a `useEffect`
  // — which runs on the same post-commit macrotask phase as Ink's internal
  // `useInput` listener registration. Firing here is positive proof that the
  // keyboard handler is bound: callers (parent, tests) can gate the next
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

  return (
    <>
      <Text>{value}</Text>
      {focused && <Cursor />}
    </>
  )
}
