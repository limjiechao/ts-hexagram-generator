declare const consultationId: unique symbol

/**
 * Opaque, assigned once when a Consultation is first kept, and the same in
 * every store: a ULID (ADR-0046). Consultations are ordered by Divined At,
 * never by Id. Only `isConsultationId` admits one.
 */
export type ConsultationId = string & { readonly [consultationId]: true }

/** The ULID alphabet: Crockford's base 32, without I, L, O and U. */
const ulidPattern = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/

/**
 * Admits exactly 26 characters of the ULID alphabet, upper case, the first
 * `0` to `7`: 26 characters hold 130 bits, and a larger first character
 * overflows a ULID's 128 (ADR-0046).
 */
export function isConsultationId(value: string): value is ConsultationId {
  return ulidPattern.test(value)
}
