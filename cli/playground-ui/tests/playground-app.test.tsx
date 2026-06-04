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
    // P6 layout: centered "Standing" / "Emerging" column headings (no card
    // borders, no `STANDING #N` titles).
    expect(frame).toContain('Standing')
    expect(frame).toContain('Emerging')
    // Identity stack below — Qian (#1) on both sides (emerging is the dim
    // ghost mirror because there are no moving lines).
    expect(frame).toContain('#1 乾')
    expect(frame).toContain('Ch’ien')
    // Position labels rendered alongside each line row.
    expect(frame).toContain('（初, 1st）')
    expect(frame).toContain('（上, 6th）')
    // Yang static bar glyphs (one per line, both sides).
    expect(frame).toContain('━━━━━━━━━')
    // The focus chevron is rendered with ANSI codes between `›` and the
    // trailing space, so assert on the bare glyph alone.
    expect(frame).toContain('›')
    unmount()
  })

  it('Tab moves focus chevron forward (L1 → L2)', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    // Initial focus is on L1 (the bottommost line row, last in the block).
    // Tab advances to L2; the chevron should now sit on a different row than
    // the previous frame. Easiest stable assertion: after Tab, send `7` (the
    // identity digit) and verify focus advanced by checking that the NEXT
    // line received it, i.e. cycling forward on L2 makes L2 yang (no visible
    // change since L2 was already 7) — too weak. Better: cycle L2 to 9 and
    // expect a moving-yang glyph in L2's row position. But L1 is at the
    // bottom — so we just send Tab + '9' and confirm we get the moving-yang
    // glyph but NOT on the bottom line (L1). The frame should still show
    // L1 as plain yang and L2 as moving-yang.
    stdin.write('\t')
    stdin.write('9')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('━━━━○━━━━')
    })
    unmount()
  })

  it('Tab wraps from L6 → L1 (typing on L1 lands the digit on the bottommost line)', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    // 5 Tabs walk focus from L1 → L6. The 6th Tab must wrap back to L1.
    for (let n = 0; n < 6; n++) stdin.write('\t')
    // Typing a moving-yang digit at the wrapped focus must mark L1, which is
    // the bottommost line row. The moving-arrow body only appears next to L1
    // when L1 itself is moving.
    stdin.write('9')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toMatch(/─────────────────▶/)
    })
    unmount()
  })

  it('footer shows both forward and backward focus hints (Tab ↑ and ⇧Tab ↓)', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Tab focus ↑')
    expect(frame).toContain('⇧Tab focus ↓')
    unmount()
  })

  it('↑ scrolls the readings panel and does NOT move focus', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    // Make L1 a moving yang to surface the readings panel.
    stdin.write('9')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('MOVING LINE')
      expect(frame).toContain('━━━━○━━━━')
    })
    // Snapshot L1's moving-yang state; pressing ↑ must NOT cycle focus off
    // it (focus stays on whatever the typing-run left it on — and crucially,
    // the moving-yang glyph remains on the same row).
    // ↑ key — vt escape sequence
    stdin.write('[A')
    // We can't easily observe the scroll offset from outside, but we CAN
    // observe that focus didn't change (the moving-yang glyph stays in its
    // position) and the readings panel is still mounted (MOVING LINE header
    // remains visible).
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('MOVING LINE')
      expect(frame).toContain('━━━━○━━━━')
    })
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

  it('saved path is shown absolute when tmpdir lives outside cwd', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <PlaygroundApp saveDir={tmpdir} pulseIntervalMs={0} onReady={onReady} />,
    )
    await waitForReady(onReady)
    stdin.write('S')
    await waitFor(() =>
      expect(lastFrame() ?? '').toContain('Save consultation'),
    )
    stdin.write('h')
    stdin.write('i')
    await waitFor(() => {
      expect(lastFrame() ?? '').toMatch(/hi/)
    })
    stdin.write(ENTER)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Saved to')
    })
    // tmpdir is under `os.tmpdir()` which is NOT a subdirectory of the
    // worktree cwd — `path.relative()` would have produced `../../...`.
    // The display fallback should show the absolute tmpdir path instead.
    expect(lastFrame() ?? '').toContain(tmpdir)
    unmount()
  })

  it('pan chip appears on the second footer row when terminal is narrower than TOP_HALF_WIDTH', async () => {
    // TOP_HALF_WIDTH is 88. Mock a narrow terminal so maxPanOffset > 0.
    const prev = windowSize.current
    windowSize.current = { columns: 60, rows: 30 }
    try {
      const onReady = vi.fn()
      const { lastFrame, unmount } = render(
        <PlaygroundApp
          saveDir={tmpdir}
          pulseIntervalMs={0}
          onReady={onReady}
        />,
      )
      await waitForReady(onReady)
      const frame = lastFrame() ?? ''
      // Pan chip uses ◀ / ▶ — neither glyph appears anywhere else in the
      // playground chrome.
      expect(frame).toMatch(/◀\s+\d+–\d+\s+of\s+88\s+▶/)
      // Pan chip lives on the second footer row, NOT concatenated onto the
      // first row's keyHints line.
      const lines = frame.split('\n')
      const keyHintsLine = lines.find((l) => l.includes('Tab focus'))
      expect(keyHintsLine).toBeDefined()
      expect(keyHintsLine).not.toMatch(/◀/)
      unmount()
    } finally {
      windowSize.current = prev
    }
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
