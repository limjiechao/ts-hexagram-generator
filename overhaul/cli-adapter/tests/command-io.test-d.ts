import process from 'node:process'

import type { CommandIo } from '#src/commands/entry-point.js'

// The process's streams and plain fakes fit CommandIo with no assertion.

export const processIo: CommandIo = {
  stdin: process.stdin,
  signals: process,
  stdout: process.stdout,
  stderr: process.stderr,
  isTTY: process.stdout.isTTY,
  rows: process.stdout.rows,
  columns: process.stdout.columns,
  env: process.env,
}

const fakeOutput = {
  write: (): boolean => true,
  on: (): void => {},
  off: (): void => {},
}

export const fakeIo: CommandIo = {
  stdin: { on: (): void => {}, off: (): void => {}, pause: (): void => {} },
  signals: { on: (): void => {}, off: (): void => {} },
  stdout: { ...fakeOutput, isTTY: true, columns: 80, rows: 32 },
  stderr: fakeOutput,
  isTTY: true,
  rows: 32,
  columns: 80,
  env: {},
}
