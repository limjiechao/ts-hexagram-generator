// Linted as overhaul/application/src/b2-queue-microtask.ts

export function queueReading(): void {
  queueMicrotask(() => undefined)
}
