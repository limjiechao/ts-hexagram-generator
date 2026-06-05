import { BOLD_GREEN, BOLD_RED, NORMAL, terminalWidth } from '@hexagram/viewer-core'

// Bottom-strip error-branch discriminant. The strip's `error` branch wraps
// these args; they are flat-extended into BottomStripArgs below. Conservation
// is NOT here — the MISSING gauge owns conservation visually (red when the
// completed count ≠ unparted), so the strip never duplicates it as text.
type BottomStripErrorArgs =
  | {
      errorKind: 'suspended-sum'
      remL: number
      remR: number
      sum: number
      expectedLabel: string
    }
  | {
      errorKind: 'zero-remainder'
      remL: number
      remR: number
    }

export type BottomStripArgs =
  | {
      // Mid-edit (incomplete or conservation-failing) or commit-ready. The
      // live count lives in the MISSING gauge, so the strip only nudges:
      // blank while not ready, "Press Enter to commit" once fully valid.
      branch: 'editing'
      commitReady: boolean
      renderWidth: number
    }
  | ({ branch: 'error'; renderWidth: number } & BottomStripErrorArgs)
  | {
      branch: 'resolved'
      next: number
      renderWidth: number
    }

function zeroRemainderSide(remL: number, remR: number): string {
  if (remL === 0 && remR === 0) return 'Left and right heaps have no remainder'
  if (remL === 0) return 'Left heap has no remainder'
  return 'Right heap has no remainder'
}

function errorMessageText(args: BottomStripErrorArgs): string {
  switch (args.errorKind) {
    case 'suspended-sum':
      return `Suspended sum (1 + ${args.remL} + ${args.remR}) = ${args.sum}, expected ${args.expectedLabel}`
    case 'zero-remainder':
      return `${zeroRemainderSide(args.remL, args.remR)} — fully divisible heaps yield remainder 4, not 0`
  }
}

// Build a row of exactly `renderWidth` display cols with `left` left-aligned
// and `right` right-aligned. ANSI in the segments doesn't count toward width.
function leftRightRow(
  left: string,
  right: string,
  renderWidth: number,
): string {
  const leftW = terminalWidth(left)
  const rightW = terminalWidth(right)
  const gap = Math.max(1, renderWidth - leftW - rightW)
  return `${left}${' '.repeat(gap)}${right}`
}

/**
 * One-row feedback strip below the manual prompt's body. Three branches, each
 * with a uniform `Shift+Tab: go back` hint on the right:
 *
 *  - **editing** — blank left while mid-edit (the MISSING gauge carries the
 *    live count); "Press Enter to commit" once `commitReady`.
 *  - **error** — BOLD_RED suspended-sum / zero-remainder message on the left
 *    (conservation is owned by the MISSING gauge, never shown here as text).
 *  - **resolved** — BOLD_GREEN "→ next cast: N unparted", left-aligned.
 *
 * Output is exactly `renderWidth` display cols wide.
 */
export function bottomStripRow(args: BottomStripArgs): string {
  const backHint = 'Shift+Tab: go back'
  if (args.branch === 'editing') {
    const left = args.commitReady ? 'Press Enter to commit' : ''
    return leftRightRow(left, backHint, args.renderWidth)
  }
  if (args.branch === 'resolved') {
    const message = `→ next cast: ${args.next} unparted`
    const colored = `${BOLD_GREEN}${message}${NORMAL}`
    const trailing = Math.max(0, args.renderWidth - terminalWidth(colored))
    return `${colored}${' '.repeat(trailing)}`
  }
  const message = errorMessageText(args)
  const left = `${BOLD_RED}${message}${NORMAL}`
  return leftRightRow(left, backHint, args.renderWidth)
}
