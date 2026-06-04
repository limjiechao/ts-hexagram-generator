import { Box, Text } from 'ink'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { ScreenShell, type ScreenShellProps } from '../src/screen-shell.js'

// `useWindowSize` is not used by ScreenShell directly, but Ink internals may
// use it. ScreenShell receives cols/rows as props so no mock is needed.

function renderShell(overrides: Partial<ScreenShellProps> = {}) {
  const defaults: ScreenShellProps = {
    cols: 80,
    rows: 24,
    aboveContent: null,
    contentSlot: <Text>CONTENT</Text>,
    scrollbarSlot: <Text> </Text>,
    belowContent: null,
    footerSlot: (
      <Box flexDirection="column" flexShrink={0}>
        <Text dimColor>status line</Text>
        <Text>bottom line</Text>
      </Box>
    ),
  }
  return render(<ScreenShell {...defaults} {...overrides} />)
}

describe('ScreenShell — frame structure', () => {
  it('renders the content slot', () => {
    const { lastFrame, unmount } = renderShell()
    expect(lastFrame() ?? '').toContain('CONTENT')
    unmount()
  })

  it('renders the footer slot', () => {
    const { lastFrame, unmount } = renderShell()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('status line')
    expect(frame).toContain('bottom line')
    unmount()
  })

  it('renders the scrollbar slot', () => {
    const { lastFrame, unmount } = renderShell({
      scrollbarSlot: <Text>░</Text>,
    })
    expect(lastFrame() ?? '').toContain('░')
    unmount()
  })

  it('does not render a title when title is absent', () => {
    const { lastFrame, unmount } = renderShell({ title: undefined })
    // No title means no BOLD_GREY escape before a title string
    const frame = lastFrame() ?? ''
    expect(frame).not.toContain('PAST READING')
    unmount()
  })

  it('renders a BOLD_GREY title line when title is provided', () => {
    const { lastFrame, unmount } = renderShell({ title: 'PAST READING' })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('PAST READING')
    unmount()
  })

  it('renders aboveContent above the scrollable content row', () => {
    const { lastFrame, unmount } = renderShell({
      aboveContent: <Text>ABOVE</Text>,
      contentSlot: <Text>SCROLLABLE</Text>,
    })
    const frame = lastFrame() ?? ''
    const abovePos = frame.indexOf('ABOVE')
    const contentPos = frame.indexOf('SCROLLABLE')
    expect(abovePos).toBeGreaterThanOrEqual(0)
    expect(contentPos).toBeGreaterThanOrEqual(0)
    // aboveContent appears before the scrollable content
    expect(abovePos).toBeLessThan(contentPos)
    unmount()
  })

  it('renders belowContent below the scrollable content row', () => {
    const { lastFrame, unmount } = renderShell({
      contentSlot: <Text>SCROLLABLE</Text>,
      belowContent: <Text>BELOW</Text>,
      footerSlot: <Text>FOOTER</Text>,
    })
    const frame = lastFrame() ?? ''
    const contentPos = frame.indexOf('SCROLLABLE')
    const belowPos = frame.indexOf('BELOW')
    const footerPos = frame.indexOf('FOOTER')
    expect(contentPos).toBeGreaterThanOrEqual(0)
    expect(belowPos).toBeGreaterThanOrEqual(0)
    expect(footerPos).toBeGreaterThanOrEqual(0)
    // belowContent is between content and footer
    expect(contentPos).toBeLessThan(belowPos)
    expect(belowPos).toBeLessThan(footerPos)
    unmount()
  })

  it('renders the scrollbar slot next to the content slot in a row', () => {
    const { lastFrame, unmount } = renderShell({
      contentSlot: <Text>SCROLLABLE</Text>,
      scrollbarSlot: <Text>|</Text>,
    })
    const frame = lastFrame() ?? ''
    // Both content and scrollbar appear in the same line (row layout)
    const lines = frame.split('\n')
    const rowWithBoth = lines.find(
      (line) => line.includes('SCROLLABLE') && line.includes('|'),
    )
    expect(rowWithBoth).toBeDefined()
    unmount()
  })
})

describe('ScreenShell — innerCols calculation', () => {
  it('passes innerCols = cols - 2 - 1 to the aboveContent render prop', () => {
    let receivedCols = -1
    const { unmount } = renderShell({
      cols: 80,
      aboveContent: (innerCols: number) => {
        receivedCols = innerCols
        return <Text>above</Text>
      },
    })
    // innerCols = 80 - 2 (paddingX) - 1 (scrollbar) = 77
    expect(receivedCols).toBe(77)
    unmount()
  })

  it('passes innerCols to the contentSlot render prop', () => {
    let receivedCols = -1
    const { unmount } = renderShell({
      cols: 100,
      contentSlot: (innerCols: number) => {
        receivedCols = innerCols
        return <Text>content</Text>
      },
    })
    // innerCols = 100 - 2 - 1 = 97
    expect(receivedCols).toBe(97)
    unmount()
  })

  it('passes innerCols to the belowContent render prop', () => {
    let receivedCols = -1
    const { unmount } = renderShell({
      cols: 60,
      belowContent: (innerCols: number) => {
        receivedCols = innerCols
        return <Text>below</Text>
      },
    })
    // innerCols = 60 - 2 - 1 = 57
    expect(receivedCols).toBe(57)
    unmount()
  })
})

describe('ScreenShell — null/undefined optional slots', () => {
  it('renders without aboveContent', () => {
    expect(() => {
      const { unmount } = renderShell({ aboveContent: null })
      unmount()
    }).not.toThrow()
  })

  it('renders without belowContent', () => {
    expect(() => {
      const { unmount } = renderShell({ belowContent: null })
      unmount()
    }).not.toThrow()
  })

  it('renders without a title', () => {
    expect(() => {
      const { unmount } = renderShell({ title: undefined })
      unmount()
    }).not.toThrow()
  })
})
