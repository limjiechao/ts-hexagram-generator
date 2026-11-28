import { beginCasting } from '@hexagram/application/begin-casting'
import { browseConsultations } from '@hexagram/application/browse-consultations'
import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import { deleteConsultation } from '@hexagram/application/delete-consultation'
import { divide } from '@hexagram/application/divide'
import { drawAutomaticPick } from '@hexagram/application/draw-automatic-pick'
import { exportConsultations } from '@hexagram/application/export-consultations'
import { importLegacyFiles } from '@hexagram/application/import-legacy-files'
import {
  buildCastConsultation,
  keepCastConsultation,
} from '@hexagram/application/keep-cast-consultation'
import {
  lookUpEditions,
  lookUpHexagramNames,
  lookUpPassageTexts,
  lookUpReceivedSequenceNumber,
  lookUpTrigramNames,
} from '@hexagram/application/look-up-catalogue'
import {
  exportJournal,
  mergeJournal,
} from '@hexagram/application/merge-journals'
import { nextRound } from '@hexagram/application/next-round'
import { openConsultation } from '@hexagram/application/open-consultation'
import type { RandomSource } from '@hexagram/application/random-source'
import { recordConsultation } from '@hexagram/application/record-consultation'
import { resolveTransformation } from '@hexagram/application/resolve-transformation'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { transcribe } from '@hexagram/application/transcribe'

/** A use case with its ports supplied: its signature minus the ports argument. */
type PortsSupplied<UseCase> = UseCase extends (
  ports: never,
  ...inputs: infer Inputs
) => infer Output
  ? (...inputs: Inputs) => Output
  : never

/**
 * The CLI's composition root (ADR-0037): it takes the driven ports and returns
 * use case 8's lookups, use case 1's Automatic Division step and its last
 * step, build and keep, use case 2, record, use case 3, resolve, use case 4,
 * browse, use case 5, open, use case 6, delete, use case 7, import, use case
 * 9, export, and use case 10's export and merge, with those ports supplied,
 * and use case 1's steps for a Division by Pick and a Physical Division,
 * which take no ports and so pass through unchanged.
 */
export function composeCli(ports: {
  readonly scriptureCatalogue: ScriptureCatalogue
  readonly randomSource: RandomSource
  readonly consultationStore: ConsultationStore
  readonly clock: Clock
}): {
  readonly lookUpPassageTexts: PortsSupplied<typeof lookUpPassageTexts>
  readonly lookUpHexagramNames: PortsSupplied<typeof lookUpHexagramNames>
  readonly lookUpReceivedSequenceNumber: PortsSupplied<
    typeof lookUpReceivedSequenceNumber
  >
  readonly lookUpTrigramNames: PortsSupplied<typeof lookUpTrigramNames>
  readonly lookUpEditions: PortsSupplied<typeof lookUpEditions>
  readonly beginCasting: typeof beginCasting
  readonly nextRound: typeof nextRound
  readonly drawAutomaticPick: PortsSupplied<typeof drawAutomaticPick>
  readonly divide: typeof divide
  readonly transcribe: typeof transcribe
  readonly buildCastConsultation: PortsSupplied<typeof buildCastConsultation>
  readonly keepCastConsultation: PortsSupplied<typeof keepCastConsultation>
  readonly recordConsultation: PortsSupplied<typeof recordConsultation>
  readonly resolveTransformation: PortsSupplied<typeof resolveTransformation>
  readonly browseConsultations: PortsSupplied<typeof browseConsultations>
  readonly openConsultation: PortsSupplied<typeof openConsultation>
  readonly deleteConsultation: PortsSupplied<typeof deleteConsultation>
  readonly importLegacyFiles: PortsSupplied<typeof importLegacyFiles>
  readonly exportConsultations: PortsSupplied<typeof exportConsultations>
  readonly exportJournal: PortsSupplied<typeof exportJournal>
  readonly mergeJournal: PortsSupplied<typeof mergeJournal>
} {
  return {
    lookUpPassageTexts: (citation, preference) =>
      lookUpPassageTexts(ports, citation, preference),
    lookUpHexagramNames: (hexagram, preference) =>
      lookUpHexagramNames(ports, hexagram, preference),
    lookUpReceivedSequenceNumber: (hexagram) =>
      lookUpReceivedSequenceNumber(ports, hexagram),
    lookUpTrigramNames: (trigram, preference) =>
      lookUpTrigramNames(ports, trigram, preference),
    lookUpEditions: (work) => lookUpEditions(ports, work),
    beginCasting,
    nextRound,
    drawAutomaticPick: (remainderGroups) =>
      drawAutomaticPick(ports, remainderGroups),
    divide,
    transcribe,
    buildCastConsultation: (query, casting, divisionMethod) =>
      buildCastConsultation(ports, query, casting, divisionMethod),
    keepCastConsultation: (consultation) =>
      keepCastConsultation(ports, consultation),
    recordConsultation: (query, divinedAt, transformation) =>
      recordConsultation(ports, query, divinedAt, transformation),
    resolveTransformation: (transformation, preference) =>
      resolveTransformation(ports, transformation, preference),
    browseConsultations: (filter) => browseConsultations(ports, filter),
    openConsultation: (id) => openConsultation(ports, id),
    deleteConsultation: (id) => deleteConsultation(ports, id),
    importLegacyFiles: (records, divisionMethod) =>
      importLegacyFiles(ports, records, divisionMethod),
    exportConsultations: (filter, preference) =>
      exportConsultations(ports, filter, preference),
    exportJournal: () => exportJournal(ports),
    mergeJournal: (journal) => mergeJournal(ports, journal),
  }
}
