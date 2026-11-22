// Linted as overhaul/oracle/tests/pure-tests-node-and-random.test.ts

// Twin for B1 and B2: a pure package's tests are outside the purity list.
import { readFileSync } from 'node:fs'

export function readSample(path: string): string {
  return readFileSync(path, 'utf8')
}

export function rollSample(): number {
  return Math.random()
}
