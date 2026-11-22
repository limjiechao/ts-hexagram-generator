// Linted as overhaul/cli-adapter/src/adapter-node-and-clock.ts
// Twin for B1, B2 and B7: the CLI adapter may use effects and import
// application.

import { readFileSync } from 'node:fs'

import type { Clock } from '@hexagram/application/clock'

export type AdapterClock = Clock

export function readSaved(path: string): string {
  return readFileSync(path, 'utf8')
}

export function stampMoment(): number {
  return Date.now()
}
