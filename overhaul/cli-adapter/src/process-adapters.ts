import type { CommandIo, CommandPorts } from '#src/commands/entry-point.js'

/**
 * The process's own terminal, as a command takes it: stdout decides the mode
 * (ADR-0010, amended by ADR-0044), and the environment is read for `NO_COLOR`
 * and `CI` only.
 */
export function processIo(process: NodeJS.Process): CommandIo {
  throw new Error('Not implemented', { cause: process })
}

/**
 * The real adapters a bin passes: the system Clock and the Random Source on
 * `node:crypto`, throwing stubs for the Scripture Catalogue and the Consultation
 * Store until their adapters land, and the Journal's folder (ADR-0020).
 */
export function processPorts(process: NodeJS.Process): CommandPorts {
  throw new Error('Not implemented', { cause: process })
}
