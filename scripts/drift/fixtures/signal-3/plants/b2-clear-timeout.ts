// Linted as overhaul/application/src/b2-clear-timeout.ts

export function cancelDelay(): void {
  clearTimeout(undefined)
}
