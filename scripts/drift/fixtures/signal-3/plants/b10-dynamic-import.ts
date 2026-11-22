// Linted as overhaul/application/src/b10-dynamic-import.ts

export async function loadGuard(): Promise<void> {
  await import('@hexagram/oracle/complete-casting')
}
