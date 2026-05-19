import type { CastingRecord, PartialSplitRecord } from '@hexagram/types'

// Pure column-padding helpers (no ANSI). Mirrors the geometry used in the
// casting-ui `castingSection`, but emits plain text inside a ```text fence.
function castCenter(text: string, width: number): string {
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  return `${' '.repeat(leftPad)}${text}${' '.repeat(rightPad)}`
}
function castRight(text: string, width: number): string {
  const leading = Math.max(0, width - text.length - 1)
  return `${' '.repeat(leading)}${text} `
}

const TOP =
  '┌──────┬──────────────────────────────────────────────────────────────────────────┐'
const CAST_OUTER_DIVIDER =
  '│      ├────────────────────────┬────────────────────────┬────────────────────────┤'
const CAST_INNER_DIVIDER =
  '│      ├────────┬───────────────┼────────┬───────────────┼────────┬───────────────┤'
const HEAP_INNER_DIVIDER =
  '│      │        ├───────┬───────┤        ├───────┬───────┤        ├───────┬───────┤'
const MID =
  '├──────┼────────┼───────┼───────┼────────┼───────┼───────┼────────┼───────┼───────┤'
const BOTTOM =
  '└──────┴────────┴───────┴───────┴────────┴───────┴───────┴────────┴───────┴───────┘'

/**
 * Markdown version of the casting table. Same box-drawing geometry as the
 * casting-ui renderer, but no ANSI styling — content is wrapped in a
 * ```text fence so monospace is preserved when rendered.
 */
export function castingMarkdownSection(casting: CastingRecord): string {
  const castLabel = `│      │${castCenter('Cast', 74)}│`
  const nth = (text: string): string => castCenter(text, 24)
  const nthLabel = `│      │${nth('1st')}│${nth('2nd')}│${nth('3rd')}│`
  const heapBanner = `        │${castCenter('Heap', 15)}`
  const heapLabel = `│      │${heapBanner}│${heapBanner}│${heapBanner}│`
  const colCell = `${castRight('Stalks', 8)}│${castRight('Left', 7)}│${castRight('Right', 7)}`
  const colLabels = `│${castRight('Line', 6)}│${colCell}│${colCell}│${colCell}│`

  const cell = (split: PartialSplitRecord): string => {
    if (split === null)
      return `${castRight('·', 8)}│${castRight('·', 7)}│${castRight('·', 7)}`
    return `${castRight(String(split.max), 8)}│${castRight(String(split.pick), 7)}│${castRight(String(split.max - split.pick), 7)}`
  }

  const indexedLines = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const
  const dataRows = indexedLines
    .map(([lineNumber, lineCasting]) => {
      const [first, second, third] = lineCasting
      return `│${castRight(String(lineNumber), 6)}│${cell(first)}│${cell(second)}│${cell(third)}│`
    })
    .join('\n')

  return `## CASTING

\`\`\`text
${TOP}
${castLabel}
${CAST_OUTER_DIVIDER}
${nthLabel}
${CAST_INNER_DIVIDER}
${heapLabel}
${HEAP_INNER_DIVIDER}
${colLabels}
${MID}
${dataRows}
${BOTTOM}
\`\`\`
`
}
