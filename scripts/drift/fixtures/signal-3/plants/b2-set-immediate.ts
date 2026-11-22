// Linted as overhaul/application/src/b2-set-immediate.ts

export function deferReading(): void {
  setImmediate(() => undefined)
}
