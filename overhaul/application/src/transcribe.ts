import type { PartialCasting } from '@hexagram/oracle/casting'
import {
  transcribe as transcribeByOracle,
  type DivisionResult,
  type Transcription,
} from '@hexagram/oracle/division'

/**
 * A step of use case 1: one Division from a Transcription, for Physical
 * Division. It returns the Oracle's next Casting, complete after the
 * eighteenth Round, or its refusal naming the failed check as the `refused`
 * result, never a throw.
 */
export function transcribe(
  casting: PartialCasting,
  transcription: Transcription,
): DivisionResult {
  return transcribeByOracle(casting, transcription)
}
