// Linted as overhaul/remainder-group-policy/src/b1-dynamic-node-fs.ts

export async function loadFileSystem(): Promise<void> {
  await import('node:fs')
}
