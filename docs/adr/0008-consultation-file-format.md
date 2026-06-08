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
  key) when there is no recorded casting. Each line is three split rows; each split
  is the pair **`{ pick, recordedMax }`** on disk. `recordedMax` is the round's
  recorded ceiling (`unparted − 1`, reserving the suspended stalk 掛一) — never a
  legal pick (the selectable range is `[1, recordedMax − 1]`). The converter passes
  each split through opaquely, so the on-disk key tracks the in-memory `SplitRecord`
  field name. **The key was renamed from the misleading `max` (S3, 2026-06-07) with
  NO `schemaVersion` bump** — this is a POC rename, so a pre-rename file carrying the
  old `max:` key now loads as `[unreadable]` (`invalid-shape`); that is accepted, not
  migrated.
- `castingAbsence` — present **iff `casting` is absent**: a closed enum
  (`legacy-no-table` | `legacy-unreplayable` | `playground`) recording **why** the
  casting is absent. A present `casting` carries no `castingAbsence`. **No
  `schemaVersion` bump:** a pre-field null-casting file (no `castingAbsence` key)
  defaults to `legacy-no-table` on read and gains the key on the next self-heal
  rewrite. This optimistic default is a deliberate choice — see the
  _2026-06-08 (S6)_ amendment below for why it is safe.

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
`castingAbsence: legacy-unreplayable` (the _fact of_ unreplayability is recorded;
the casting data still is not). The replay-validate step means Shape A's recovered
casting is proven, not trusted.

## Amendment — 2026-06-07: the casting-absence reason

A `casting: null` envelope has three otherwise-indistinguishable origins — a
legacy Shape-B file, a legacy Shape-A replay failure, and a playground save. This
ADR originally said the absence carried "no sentinel" and provenance was
intentionally not kept. That stance is **superseded for the _absence_ case
only**: the compulsory `castingAbsence` field now records _why_ casting is absent,
so the three origins are distinguishable in the file and in the readout (the
"Casting not recorded" notice names the reason). This does **not** reverse
[ADR-0011](0011-manual-casting-flow-design.md) — a casting that _happened_
(interactive / random / manual) still carries no provenance; `castingAbsence`
exists only when casting _did not_ happen.

## Amendment — 2026-06-08: `.md` load replay-validates its casting (S7)

This ADR rejected "trust the stored legacy casting table" on the grounds that
**replaying it through the algorithm proves correctness for free**, and the
legacy migration accordingly treats Shape-A casting as _proven, not trusted_.
That principle was never applied to our **own** `.md` load path: `parseFrontmatter`
accepted any structurally-valid `casting` (an `isCastingRecord` shape check) with
no replay against the stored `hexagram`. The result was an asymmetry (S7) — a
hand-edited or corrupted `.md` carrying a well-shaped but physically-impossible
casting loaded and rendered a _trusted ledger_, while the identical data arriving
via legacy `.txt` was rejected as `legacy-unreplayable`. "The casting is
validated" was true at one boundary and false at the other.

**We will replay-validate the casting on `.md` load**, closing the asymmetry: the
recorded 18 splits are replayed through `makeLineGenerator` and must reproduce the
stored `hexagram` — the same check the legacy converter already runs. The replay
predicate (`castingReplaysTo`, today private to `legacy-converter.ts`) is hoisted
to a shared location so both load paths use one definition (DRY — one
authoritative replay rule).

**On replay failure the row surfaces as `[unreadable]`** via a new
`parseFrontmatter` reason (`casting-unreplayable`), matching how every other
corruption is handled (`invalid-shape`, `schema-version-mismatch`) and this ADR's
strict-refusal philosophy ("refusal is safer than silently misreading"). A `.md`
is our own output and always replays unless tampered with or corrupted, so a
failure is corruption, not a salvage case — it fails closed.

- **Rejected — keep shape-check-only and sanction the asymmetry.** It directly
  contradicts this ADR's own "free correctness" argument; "our own output, so
  trust it" is the same reasoning used to reject "trust the legacy table."
- **Rejected — downgrade a non-replaying `.md` to `casting: null` + an absence
  reason** (mirroring the legacy converter's salvage). Salvage semantics belong to
  _migration_ of foreign input, not to loading our own output; downgrading masks
  corruption as an ordinary "casting not recorded" row and adds a fourth absence
  origin that collides with the absence-reason model.

Consequences: every `.md` load now runs the generator once (cheap, bounded — 18
splits); a corrupted/hand-edited casting now fails closed rather than rendering a
false ledger; the new reason is additive (no `schemaVersion` bump — shape and
version checks are unchanged); `castingReplaysTo` becomes shared `consultation-file`
API consumed by both `frontmatter.ts` (or `file.ts`) and `legacy-converter.ts`.

## Amendment — 2026-06-08: the read-time absence default is deliberate (S6)

The 2026-06-07 amendment introduced `castingAbsence` and made it **compulsory on
save** (`saveConsultationFile` throws when `casting` is null without a reason). But
the read path defaults a **missing** `castingAbsence` key to `legacy-no-table`
(`frontmatter.ts`), and the three `casting: null` origins are structurally
identical on disk — so a key-less file is _asserted_ to be `legacy-no-table`
whether or not that is its true origin. A cold read (S6) flagged this as a fork:
the default could be read as "we know it's legacy-no-table" or as "we don't know
and are guessing." This amendment **records the choice rather than changing the
behavior**: the optimistic default stays, and stays deliberate.

It is safe because the only files that can reach it are a **frozen, shrinking
population**:

- The app can no longer _write_ a key-less null-casting file. Save fails closed
  (above), and the history self-heal threads the reason into the re-rendered body
  (B5 fix, `history-app.tsx` → `markdownConsultationBody`'s 4th arg), so a
  round-trip never drops the key.
- The default therefore fires only for **pre-field files** (`castingAbsence`
  landed 2026-06-07) or externally hand-edited/corrupted ones. For a genuine
  pre-field Shape-B legacy file `legacy-no-table` is simply _correct_; for a
  pre-field playground/unreplayable save it is a **mislabel**, but a cosmetic one
  — it changes only the "Casting not recorded (…)" notice string. The canonical
  frontmatter is untouched, no casting data is fabricated, and the row stays
  history-browsable. "Data unchanged" remains true.

We cannot do better without a `schemaVersion` bump: a pre-field file is still
`schemaVersion: 1` (S3 pinned the version to literal `1`), so there is no marker
to separate "old schema, field not expected" from "field expected but dropped."

- **Rejected — add a distinct `unspecified` / `unknown` absence reason for the
  read-time default.** It would be more honest about a key-less file, but it
  widens the closed enum with a value that is **never written** (only synthesized
  on read), adds a notice-string + test surface, and downgrades the _common,
  correct_ case (genuine legacy-no-table files) to a vaguer label to flag a frozen
  edge case. The asymmetry of a read-only sentinel is not worth it given B5 has
  closed the live key-drop path.

Consequences: no code change — the read-time default and the `CastingAbsenceReason`
enum are unchanged; the safety of the default is now load-bearing on the save-side
compulsion and the B5 self-heal fix, and is recorded here so the default reads as
intentional, not accidental.

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
