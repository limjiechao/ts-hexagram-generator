// Unit test for the pulse timer hook. Wraps `usePulse` in a tiny Ink
// component so we can observe the toggling boolean via the rendered frame.
// Uses real timers + `waitFor` because Ink's render cycle is asynchronous —
// `vi.useFakeTimers` would fire the `setInterval` callback synchronously
// but the React-driven re-render wouldn't propagate to ink-testing-library's
// frame buffer in time for the assertion.

import { waitFor } from '@hexagram/test-utils'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { usePulse } from '../src/use-pulse.js'

function PulseProbe({ intervalMs }: { intervalMs: number }): ReactElement {
  const pulse = usePulse(intervalMs)
  return <Text>{pulse ? 'on' : 'off'}</Text>
}

describe('usePulse', () => {
  it('starts at `false` and toggles on the next interval tick', async () => {
    const { lastFrame, unmount } = render(<PulseProbe intervalMs={40} />)
    expect(lastFrame()).toBe('off')
    await waitFor(() => expect(lastFrame()).toBe('on'))
    await waitFor(() => expect(lastFrame()).toBe('off'))
    unmount()
  })

  it('stays frozen on `false` when intervalMs <= 0', async () => {
    const { lastFrame, unmount } = render(<PulseProbe intervalMs={0} />)
    expect(lastFrame()).toBe('off')
    // Give the event loop several macrotasks; the frame must not change.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(lastFrame()).toBe('off')
    unmount()
  })
})
