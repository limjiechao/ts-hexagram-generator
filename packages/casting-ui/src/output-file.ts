import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type { CastingRecord, Hexagram } from '@hexagram/types'

import {
  buildConsultationSections,
  consultationConsoleOutput,
  type ConsultationSections,
} from './output-composers.js'
import { BOLD_GREY, NORMAL } from './output-palette.js'
import { getFilesystemSafeTimestamp } from './utils-dayjs.js'

/**
 * Save consultation output to a timestamped file.
 *
 * @param consoleOutput - The formatted console output with ANSI color codes.
 * @param outputDirectory - Directory to save the file. Defaults to
 *   `<cwd>/consultations`, i.e. relative to where the consuming CLI was
 *   invoked — not relative to this library's install path.
 * @returns The full path of the created file.
 */
export async function consultationFileOutput(
  consoleOutput: string,
  outputDirectory: string = path.join(process.cwd(), 'consultations'),
): Promise<string> {
  // Strip ANSI color codes for the saved file.
  // oxlint-disable-next-line no-control-regex
  const textOutput = consoleOutput.replaceAll(/\u001B\[[0-9;]*m/g, '')

  // Ensure output directory exists (create if needed)
  await fs.mkdir(outputDirectory, { recursive: true })

  // Generate filesystem-safe, timezone-aware timestamp
  const timestamp = getFilesystemSafeTimestamp()
  const filePath = path.join(outputDirectory, `consultation-${timestamp}.txt`)

  await fs.writeFile(filePath, textOutput, { encoding: 'utf8' })

  return filePath
}

/**
 * Build the consultation sections and persist the plain output to a
 * timestamped file, without printing anything. Used by the Ink viewer path,
 * which owns the screen — the file is saved up front so the viewer can show
 * the saved path in its footer.
 */
export async function saveConsultation(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): Promise<{
  sections: ConsultationSections
  savedPath: string
  plainOutput: string
}> {
  const sections = buildConsultationSections(query, hexagram, casting)
  const plainOutput = consultationConsoleOutput(query, hexagram, casting)
  const savedPath = await consultationFileOutput(plainOutput)

  return { sections, savedPath, plainOutput }
}

export async function logAndSaveConsultationOutput(
  question: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): Promise<void> {
  const consoleOutput = consultationConsoleOutput(question, hexagram, casting)

  console.clear()
  console.info(consoleOutput)

  const filePath = await consultationFileOutput(consoleOutput)

  console.info('')
  console.info(`${BOLD_GREY}Consultation output saved to ${filePath}.${NORMAL}`)
  console.info('')
}
