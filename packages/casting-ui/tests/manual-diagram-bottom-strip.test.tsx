import stringWidth from 'string-width'
import { describe, expect, it } from 'vitest'

import { bottomStripRow } from '../src/manual-diagram-bottom-strip'

describe('bottomStripRow', () => {
  const ESC = String.fromCodePoint(27)

  it('editing + not commit-ready — blank left, back hint right', () => {
    const row = bottomStripRow({
      branch: 'editing',
      commitReady: false,
      renderWidth: 78,
    })
    expect(row.startsWith(' ')).toBe(true)
    // MISSING owns the count now — the strip carries no "accounted" total.
    expect(row).not.toContain('accounted')
    expect(row).not.toContain('Press Enter')
    expect(row.endsWith('Shift+Tab: go back')).toBe(true)
    expect(stringWidth(row)).toBe(78)
  })

  it('editing + commit-ready — "Press Enter to commit" left, back hint right', () => {
    const row = bottomStripRow({
      branch: 'editing',
      commitReady: true,
      renderWidth: 78,
    })
    expect(row.startsWith('Press Enter to commit')).toBe(true)
    expect(row.endsWith('Shift+Tab: go back')).toBe(true)
    expect(stringWidth(row)).toBe(78)
  })

  it('error branch — suspended-sum message + back hint (BOLD_RED)', () => {
    const row = bottomStripRow({
      branch: 'error',
      errorKind: 'suspended-sum',
      remL: 1,
      remR: 4,
      sum: 6,
      expectedLabel: '4 or 8',
      renderWidth: 78,
    })
    expect(row).toContain('Suspended sum (1 + 1 + 4) = 6, expected 4 or 8')
    expect(row).toContain('Shift+Tab: go back')
    expect(row).toContain(`${ESC}[1;91m`)
  })

  it('error branch — zero-remainder identifies the side', () => {
    const rightOnly = bottomStripRow({
      branch: 'error',
      errorKind: 'zero-remainder',
      remL: 2,
      remR: 0,
      renderWidth: 78,
    })
    expect(rightOnly).toContain('Right heap has no remainder')
    expect(rightOnly).toContain(
      'fully divisible heaps yield remainder 4, not 0',
    )
    const leftOnly = bottomStripRow({
      branch: 'error',
      errorKind: 'zero-remainder',
      remL: 0,
      remR: 3,
      renderWidth: 78,
    })
    expect(leftOnly).toContain('Left heap has no remainder')
    const both = bottomStripRow({
      branch: 'error',
      errorKind: 'zero-remainder',
      remL: 0,
      remR: 0,
      renderWidth: 78,
    })
    expect(both).toContain('Left and right heaps have no remainder')
  })

  it('resolved branch — BOLD_GREEN "→ next cast: N unparted"', () => {
    const row = bottomStripRow({
      branch: 'resolved',
      next: 40,
      renderWidth: 78,
    })
    expect(row).toContain('→ next cast: 40 unparted')
    expect(row).not.toContain('accounted')
    expect(row).toContain(`${ESC}[1;92m`)
    expect(stringWidth(row)).toBe(78)
  })
})
