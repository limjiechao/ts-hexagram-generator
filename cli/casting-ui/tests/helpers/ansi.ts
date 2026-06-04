// Strip SGR ANSI so layout assertions can match the textual skeleton
// independent of the Scheme B field colouring (dim labels / cyan computed /
// bold-white input) woven into the heap-card rows.
// oxlint-disable-next-line no-control-regex
const SGR_PATTERN = /\u001B\[[0-9;]*m/g

export const stripAnsi = (s: string): string => s.replaceAll(SGR_PATTERN, '')
