# A Cast Consultation records its Division Method

Status: Accepted
Date: 2026-11-05
Amends: [ADR-0011](0011-manual-casting-flow-design.md) ("No provenance field")

A Cast Consultation records how its Divisions were made, as one of three
**Division Methods**:

- **Physical**: a person divided real yarrow stalks, entered by Transcription.
- **Virtual**: a person divided virtual stalks on screen (slider or typed
  number; the widget is a UI detail).
- **Automatic**: the machine divided (ADR-0023).

A Recorded Consultation has no Casting, so it has no Division Method.

## Why

To a practitioner, "I divided real stalks" and "the machine divided for me"
are different acts. Someone reviewing their journal may care which it was. Once
a Consultation is saved, nothing else can reveal it: the Picks look alike.
ADR-0011 rejected a `castMethod` field "for no reader benefit", in order to
keep manual and interactive saves byte-identical. With the domain redrawn
around the Consultation as a record of a divination, the reader benefit is
this distinction itself. Byte-identity of the Casting still holds; only this
one field differs.

The names describe _who divided what_, not the UI. "Random" was rejected
because every honest Division is uncontrolled; that is the premise of
ADR-0023. "Chosen" was rejected because it suggests selecting an outcome.
"Yarrow" was rejected because all three methods follow the yarrow procedure.

## Considered options

- **No provenance (ADR-0011's stance).** Rejected: it discards the one fact
  that distinguishes a traditional divination from a simulated one.
- **Record the UI input mode (slider / typed / manual / random).** Rejected:
  the slider and typed number are the same act in different widgets, and
  widget names would leak UI into the domain record.
