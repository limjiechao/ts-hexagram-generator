# Consultation file format

Status: Accepted
Date: 2026-05-19

A saved consultation is a Markdown file (`consultation-<timestamp>.md`) with a YAML
frontmatter envelope. **The frontmatter is canonical; the Markdown body is
decorative** — re-rendered from the envelope on every load.

The envelope has six fields and nothing derived:

- `schemaVersion: 1` — checked **strict-equal** on load. A mismatch is not migrated;
  the row surfaces as `[unreadable]` in the history browser.
- `timestamp` — ISO 8601 with offset.
- `query` — the divination question (YAML block scalar for multi-line).
- `hexagram` — a mapping keyed **`L6..L1` (visual top-first)**; a converter inverts
  to/from the bottom-first `Hexagram` tuple at the package boundary.
- `casting` — a mapping keyed **`L6..L1` (visual top-first)**; a converter inverts
  to/from the bottom-first `CastingRecord` at the package boundary. **Absent** (no
  key) when there is no recorded casting.
- `castingAbsence` — present **iff `casting` is absent**: a closed enum
  (`legacy-no-table` | `legacy-unreplayable` | `playground`) recording **why** the
  casting is absent. A present `casting` carries no `castingAbsence`. **No
  `schemaVersion` bump:** a pre-field null-casting file (no `castingAbsence` key)
  defaults to `legacy-no-table` on read and gains the key on the next self-heal
  rewrite.

Two deliberate asymmetries:

1. **Bottom-first in memory, top-first on disk.** The algorithm builds a hexagram
   from the bottom up, so the tuple is bottom-first; a human reads a hexagram top
   down, so the file is `L6..L1`. This inversion applies uniformly to **both**
   `hexagram` and `casting`: `hexagramToYaml`/`hexagramFromYaml` and
   `castingToYaml`/`castingFromYaml` make it explicit and testable at the boundary.
2. **Derived data is never persisted.** Hex names, emerging hexagram, scripture,
   exegesis, and translations are recomputed via `@hexagram/core/getters`
   ([ADR-0007](0007-hexagram-and-trigram-data.md)) on every render. On open, the freshly
   rendered body is byte-compared against disk and the file is rewritten if they
   differ — so a renderer upgrade self-heals old files with no migration.

Legacy pre-Markdown `.txt` files are migrated by `convertLegacyTxt` (run via
`hexagram-history --convert-legacy`). It handles **Shape A** (has a CASTING table —
full casting recovered, validated by replaying the splits through
`makeLineGenerator` and confirming the same hexagram) and **Shape B** (no table —
sets `casting: null`, `castingAbsence: legacy-no-table`). When a Shape-A table
fails replay-validation the casting is dropped and tagged
`castingAbsence: legacy-unreplayable` (the *fact of* unreplayability is recorded;
the casting data still is not). The replay-validate step means Shape A's recovered
casting is proven, not trusted.

## Amendment — 2026-06-07: the casting-absence reason

A `casting: null` envelope has three otherwise-indistinguishable origins — a
legacy Shape-B file, a legacy Shape-A replay failure, and a playground save. This
ADR originally said the absence carried "no sentinel" and provenance was
intentionally not kept. That stance is **superseded for the *absence* case
only**: the compulsory `castingAbsence` field now records *why* casting is absent,
so the three origins are distinguishable in the file and in the readout (the
"Casting not recorded" notice names the reason). This does **not** reverse
[ADR-0011](0011-manual-casting-flow-design.md) — a casting that *happened*
(interactive / random / manual) still carries no provenance; `castingAbsence`
exists only when casting *did not* happen.

## Considered options

- **JSON / TOML / pure YAML.** Rejected: Markdown+frontmatter is human-readable as
  a reading _and_ machine-parsable as data; the body doubles as the rendered
  artifact.
- **Persist the body / derived fields as source of truth.** Rejected: it would
  require migrations on every renderer or data change; recompute-and-self-heal
  avoids a migration treadmill.
- **Versioned migrations instead of strict-equal `schemaVersion`.** Rejected: strict
  refusal (`[unreadable]`) is safer than silently misreading an evolved schema; the
  format is young enough that hard failure is the right default.
- **Trust the stored legacy casting table.** Rejected: replaying it through the
  algorithm proves correctness for free.

## Consequences

- Bumping `schemaVersion` makes every older file `[unreadable]` until a migration
  is written — an intentional forcing function, not an oversight.
- The body on disk is disposable; never hand-edit it expecting it to stick (it is
  re-rendered on next open).
- `consultation-file` stays UI-free ([ADR-0002](0002-monorepo-structure-and-package-decomposition.md))
  so the format can be read/written headlessly.

## Where it's enforced

- `domain/consultation-file/src/frontmatter.ts` — envelope, `CURRENT_SCHEMA_VERSION`,
  the `L6..L1` converters, strict-equal load, `castingAbsence` serialize/parse +
  the `legacy-no-table` read-time default.
- `domain/consultation-file/src/file.ts` — save/load, body re-render + self-heal;
  `saveConsultationFile` requires `castingAbsence` when `casting` is null.
- `domain/consultation-file/src/legacy-converter.ts` — Shape A/B migration, tagging
  the two null-casting origins `legacy-no-table` vs `legacy-unreplayable`.
- `domain/core/src/types.ts` — the `CastingAbsenceReason` vocabulary + guard.
