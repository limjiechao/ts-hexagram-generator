// Linted as overhaul/application/src/b2-clear-immediate.ts

export function cancelDeferral(): void {
  clearImmediate(undefined)
}
