// Linted as overhaul/cli-adapter/src/b7-dynamic-import-oracle.ts

export async function loadPick(): Promise<void> {
  await import('@hexagram/oracle/pick')
}
