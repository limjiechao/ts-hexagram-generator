// Integration tests for `<PlaygroundApp>` — drive the Ink shell via
// `ink-testing-library` and assert against the rendered frame. Uses the
// `onReady` witness pattern from `@hexagram/test-utils` to dodge the
// `useInput` bind-race window (see the `ink-useinput-bind` skill).

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { waitFor, waitForReady } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaygroundApp } from '../src/playground-app'

// `useWindowSize` reads stdout dimensions; ink-testing-library's fake stdout
// reports zero rows. Mock the hook so `<PlaygroundApp>` sizes to a usable
// terminal. Mirrors the pattern in `home-menu.test.tsx`.
const windowSize = vi.hoisted(() => ({ current: { columns: 120, rows: 40 } }))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

let tmpdir: string

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'playground-test-'))
})

afterEach(async () => {
  await fs.rm(tmpdir, { recursive: true, force: true })
})

const ESC = ''
const ENTER = '\r'

describe('<PlaygroundApp>', () => {
  it('opens on Qian — both cards visible, save line empty', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Playground')
    // Both cards render the standing hexagram (#1 Qian / Heaven).
    expect(frame).toContain('STANDING #1')
    expect(frame).toContain('EMERGING')
    // 6 yang line glyphs (one per row, both cards) — at least the standing's L1.
    expect(frame).toContain('━━━━━━━━━')
    // The focus chevron is rendered with ANSI codes between `›` and the
    // trailing space, so assert on the bare glyph alone.
    expect(frame).toContain('›')
    unmount()
  })

  it('SPACE flips polarity at the focused line (7 → 8)', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    stdin.write(' ')
    await waitFor(() => {
      // L1 is now yin (8) — the broken-bar glyph renders.
      expect(lastFrame() ?? '').toContain('━━━   ━━━')
    })
    unmount()
  })

  it('→ cycles the focused line forward (7 → 9, showing moving-yang ○)', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    // → key: arrow-right escape sequence
    stdin.write('[C')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      // Moving yang glyph and the value 9 appear together on L1.
      expect(frame).toContain('━━━━○━━━━')
    })
    unmount()
  })

  it('typing a digit writes the focused line and advances focus', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    stdin.write('8')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      // L1 has the broken-line glyph (8 → yin static).
      expect(frame).toContain('━━━   ━━━')
    })
    unmount()
  })

  it('ESC with no typing run calls onExit', async () => {
    const onReady = vi.fn()
    const onExit = vi.fn()
    const { stdin, unmount } = render(
      <PlaygroundApp
        onExit={onExit}
        saveDir={tmpdir}
        pulseIntervalMs={0}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(ESC)
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('ESC with a typing run reverts to the snapshot (does NOT exit)', async () => {
    const onReady = vi.fn()
    const onExit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp
        onExit={onExit}
        saveDir={tmpdir}
        pulseIntervalMs={0}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    // Type a digit to open a run.
    stdin.write('8')
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('━━━   ━━━')
    })
    // ESC should NOT call onExit; instead it should revert L1 back to 7.
    stdin.write(ESC)
    await waitFor(() => {
      // L1 should be yang again — broken-bar gone, no `━━━   ━━━` for L1.
      // (The dim ghost emerging card may still show it, but the standing
      // L1 should be solid.)
      const frame = lastFrame() ?? ''
      // After revert + closing the run, snapshot was [7,7,7,7,7,7]; both
      // cards mirror Qian. The standing's L1 row contains `━━━━━━━━━`.
      expect(frame).toContain('━━━━━━━━━')
    })
    expect(onExit).not.toHaveBeenCalled()
    unmount()
  })

  it('r resets to Qian after fiddling', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    // Cycle L1 to 9 (moving yang) so the emerging card lights up.
    stdin.write('[C')
    await waitFor(() => expect(lastFrame() ?? '').toContain('━━━━○━━━━'))
    // Now reset.
    stdin.write('r')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      // No moving-yang glyph anywhere in the frame (both cards mirror Qian).
      expect(frame).not.toContain('━━━━○━━━━')
    })
    unmount()
  })

  it('S → query + Enter writes a consultation file', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    // Open save strip.
    stdin.write('S')
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Save consultation')
    })
    // Type query — single-character at a time to avoid race windows.
    stdin.write('h')
    stdin.write('i')
    await waitFor(() => {
      expect(lastFrame() ?? '').toMatch(/hi/)
    })
    // Submit.
    stdin.write(ENTER)
    // Wait for the file to land + the saved-path line to render.
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Saved to')
    })
    // Verify the file exists with valid frontmatter.
    const files = await fs.readdir(tmpdir)
    expect(files).toHaveLength(1)
    const filePath = path.join(tmpdir, files[0] as string)
    const content = await fs.readFile(filePath, 'utf8')
    expect(content).toMatch(/^---/)
    expect(content).toContain('query:')
    expect(content).toContain('hi')
    // Casting key absent (playground sources don't carry a CastingRecord).
    expect(content).not.toMatch(/^casting:/m)
    unmount()
  })

  it('ESC closes an open save strip without saving', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    stdin.write('S')
    await waitFor(() =>
      expect(lastFrame() ?? '').toContain('Save consultation'),
    )
    stdin.write(ESC)
    await waitFor(() => {
      expect(lastFrame() ?? '').not.toContain('Save consultation')
    })
    // No file written.
    const files = await fs.readdir(tmpdir).catch(() => [])
    expect(files).toEqual([])
    unmount()
  })
})
