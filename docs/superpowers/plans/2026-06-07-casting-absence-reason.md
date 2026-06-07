# Casting-Absence Reason Field (finding S4) Implementation Plan

> **For agentic workers:** This is a SELF-CONTAINED handoff. You need no other
> conversation context. REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans` to
> implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Implement
> **Phase A first** (it is independently shippable and makes the saved file
> self-describing); **Phase B** (readout surfacing) and **Phase C** (docs) layer
> on top. Work on branch `claude/cool-carson-Aig03`. Do NOT create a PR. End
> every commit message body with the trailer line
> `https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh` and put no model
> identifier anywhere.

**Goal:** Record *why* a consultation's casting is absent (`casting: null`) so the
three indistinguishable origins — legacy file with no table, legacy table that
failed replay, and playground save — become distinguishable in the saved file
and in the readout.

**Architecture:** Add a closed-enum frontmatter field `castingAbsence`, present
*iff* `casting` is absent. Compulsory at the write boundary (a save with a null
casting must carry a reason); tolerant at the read boundary (a pre-existing
null-casting file with no field defaults to `legacy-no-table`). **No
`schemaVersion` bump** — old files stay readable and upgrade lazily via the
existing self-heal rewrite. The reason flows envelope → `buildConsultationView`
→ IR `CastingSection` → ANSI/Markdown serializers so the "Casting not recorded"
notice names the reason.

**Tech Stack:** TypeScript, pnpm + Turborepo monorepo, vitest, gray-matter +
js-yaml (YAML frontmatter), Ink (terminal UI). Byte-locked golden fixtures.

---

## Background — what S4 is (read once, then refer back)

A saved consultation is a Markdown file with a YAML frontmatter envelope. When a
consultation has no casting, `casting` is `null`, serialized as the **absence of
the `casting` key** (not `casting: null`). That single absent-key state has three
origins that the format currently cannot tell apart:

- **A — legacy Shape-B conversion** (a migrated `.txt` with no CASTING table).
- **B — legacy Shape-A replay failure** (a `.txt` that HAS a table, but the
  recorded splits do not replay back to the file's own hexagram — corrupt data).
- **C — playground save** (the live line-explorer has no real yarrow casting).

There is no discriminator field today; all three render the same "Casting not
recorded" notice. This is currently documented as *intentional* (ADR-0008/0006/
0011 say "no provenance field, no sentinel"). This plan **deliberately changes
that decision** for the absence case only, per an approved design.

### Approved design decisions (do not relitigate)

1. **Compulsory reason field**, named `castingAbsence`, holding one of a closed
   enum: `'legacy-no-table' | 'legacy-unreplayable' | 'playground'`.
2. **Present iff `casting` is absent.** A file with a real `casting` carries no
   `castingAbsence`.
3. **No `schemaVersion` bump.** `CURRENT_SCHEMA_VERSION` stays `1`.
4. **Existing `casting: null` files (no field) default to `legacy-no-table`** on
   read.
5. **Surface the reason in the readout** (the "Casting not recorded" notice
   becomes reason-aware). This is Phase B and changes ANSI/Markdown bytes →
   fixtures regenerate intentionally.
6. **ADR reconciliation:** this does NOT reverse ADR-0011. ADR-0011 forbids a
   `castMethod` field for casts that *happened* (interactive/random/manual);
   `castingAbsence` only exists when casting *did not* happen. Present-casting
   files still carry no provenance. Frame the ADR-0008 edit as that
   clarification.

### Grounded facts (verified against source 2026-06-07 — re-confirm line numbers; they may drift)

- Envelope type + serialize/parse: `domain/consultation-file/src/frontmatter.ts`
  - `ConsultationEnvelope` interface at `frontmatter.ts:68-76` (`casting: CastingRecord | null`).
  - `CURRENT_SCHEMA_VERSION = 1` at `frontmatter.ts:26`.
  - `serializeFrontmatter` omits the casting key when null at `frontmatter.ts:98-108` (the spread `...(envelope.casting === null ? {} : { casting: ... })`).
  - `parseFrontmatter` maps absent `casting` → `null` at `frontmatter.ts:153-164`; the strict `schemaVersion !== CURRENT_SCHEMA_VERSION` check is at `frontmatter.ts:142-144`; the destructure of fields is at `frontmatter.ts:137-140`.
  - YAML engine pins `sortKeys: false` (insertion order) at `frontmatter.ts:18-24`. **Key order is insertion order**, so where you insert `castingAbsence` in the `data` object determines byte output.
- Save API: `domain/consultation-file/src/file.ts`
  - `saveConsultationFile(params)` at `file.ts:51-78`; it builds the envelope at `file.ts:66-75` and the body via `markdownConsultationBody(query, hexagram, casting)` at `file.ts:61-65`.
- Markdown body composer: `domain/consultation-file/src/markdown.ts`
  - `markdownConsultationBody(query, hexagram, casting)` at `markdown.ts:14-22` → `buildConsultationView(query, hexagram, casting)` at `markdown.ts:20`.
- Legacy converter: `domain/consultation-file/src/legacy-converter.ts`
  - `convertLegacyTxt` assembles the envelope at `legacy-converter.ts:43-53` from `extractCasting(text, hexagram)`.
  - `extractCasting` returns `CastingRecord | null` at `legacy-converter.ts:90-107`: `null` for no-table at `:95` (`if (rows === null) return null`) and `null` for replay-failure at `:106` (`return castingReplaysTo(...) ? casting : null`).
- Playground save: `cli/playground-ui/src/playground-app.tsx`
  - the save params object at `playground-app.tsx:283-289`, `casting: null` at `:286`, `saveConsultationFile(params)` at `:289`.
- Migration log: `apps/cli/src/migrate-legacy.ts`
  - the per-file log line at `migrate-legacy.ts:45` (`... ${envelope.casting === null ? ' (casting unrecovered)' : ''}`).
- IR: `domain/consultation-view/src/ir.ts`
  - `CastingSection` at `ir.ts:26-31` (`rows: readonly LedgerRow[] | null`).
- View builder: `domain/consultation-view/src/build-view.ts`
  - `buildConsultationView(query, hexagram, casting)` at `build-view.ts:184-253`; the casting section literal at `build-view.ts:193-197`.
- Serializers (the notice strings):
  - Markdown: `domain/consultation-file/src/serialize-markdown.ts:34-35` (`if (section.rows === null) return `## CASTING\n\n_Casting not recorded._\n``).
  - ANSI: `cli/readout/src/serialize-ansi.ts:44-50` (`Casting not recorded`).
- `buildConsultationView` production callers (only three): `markdown.ts:20`,
  `cli/readout/src/output-composers.ts:50`, `cli/casting-ui/src/output-composers.ts:15`.
  The last two are live/plain rendering of a (possibly partial) real casting and
  never carry an absence reason → the new param must be **optional**, defaulting
  to "no reason".
- **No saved-file fixture currently has a null casting** (`grep -L '^casting:' domain/consultation-file/tests/fixtures/md-file-*.md` is empty). Null-casting rendering IS exercised by the legacy-converter and playground tests; check those fixtures/assertions when regenerating.

---

## File structure / decomposition

**Phase A — data layer (makes the saved file self-describing):**
- `domain/core/src/types.ts` — new `CastingAbsenceReason` type + an `isCastingAbsenceReason` guard (home of the casting vocabulary; both `consultation-file` and `consultation-view` already depend on `@hexagram/core/types`).
- `domain/consultation-file/src/frontmatter.ts` — envelope field, serialize, parse + default.
- `domain/consultation-file/src/file.ts` — `saveConsultationFile` requires the reason when casting is null.
- `domain/consultation-file/src/legacy-converter.ts` — distinguish the two legacy nulls.
- `cli/playground-ui/src/playground-app.tsx` — pass `castingAbsence: 'playground'`.
- `apps/cli/src/migrate-legacy.ts` — log the specific reason (optional nicety).

**Phase B — readout surfacing (reason appears in the notice):**
- `domain/consultation-view/src/ir.ts` — `CastingSection.absenceReason`.
- `domain/consultation-view/src/build-view.ts` — optional 4th param threads the reason into the casting section.
- `domain/consultation-file/src/markdown.ts` + `domain/consultation-file/src/file.ts` — pass the reason into the body composer.
- `domain/consultation-file/src/serialize-markdown.ts` + `cli/readout/src/serialize-ansi.ts` — reason-aware notice.
- The history-load readout path — thread `envelope.castingAbsence` into the rendered Readout (trace `ConsultationReadout` props in `cli/history-ui` / `cli/readout`).
- Regenerate `pnpm generate-fixtures`.

**Phase C — docs:**
- `docs/adr/0008-consultation-file-format.md` (amend), `docs/adr/0006-...md` + `docs/adr/0011-...md` (clarifying notes), `CLAUDE.md`/`AGENTS.md` + `CONTEXT.md` where they describe the three-origin collapse.

---

## PHASE A — data layer

### Task A1: `CastingAbsenceReason` type + guard in core

**Files:**
- Modify: `domain/core/src/types.ts`
- Test: `domain/core/tests/types.test.ts` (create if absent, else append)

- [ ] **Step 1: Write the failing test**

In `domain/core/tests/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isCastingAbsenceReason } from '../src/types.js'

describe('isCastingAbsenceReason', () => {
  it('accepts the three known reasons', () => {
    expect(isCastingAbsenceReason('legacy-no-table')).toBe(true)
    expect(isCastingAbsenceReason('legacy-unreplayable')).toBe(true)
    expect(isCastingAbsenceReason('playground')).toBe(true)
  })
  it('rejects unknown strings and non-strings', () => {
    expect(isCastingAbsenceReason('legacy')).toBe(false)
    expect(isCastingAbsenceReason('')).toBe(false)
    expect(isCastingAbsenceReason(undefined)).toBe(false)
    expect(isCastingAbsenceReason(null)).toBe(false)
    expect(isCastingAbsenceReason(3)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @hexagram/core test -- types.test`
Expected: FAIL — `isCastingAbsenceReason` is not exported.

- [ ] **Step 3: Add the type + guard**

In `domain/core/src/types.ts`, add near the casting types (after `SplitRecord` /
`LineCasting`):

```ts
/**
 * Why a consultation has no recorded casting. Present in the saved envelope only
 * when `casting` is absent (see ADR-0008). The three origins are otherwise
 * indistinguishable:
 *  - 'legacy-no-table'    — migrated legacy .txt with no CASTING table (also the
 *                           read-time default for pre-field null-casting files).
 *  - 'legacy-unreplayable'— migrated legacy .txt whose table failed replay.
 *  - 'playground'         — saved from the playground line-explorer (never cast).
 */
export type CastingAbsenceReason =
  | 'legacy-no-table'
  | 'legacy-unreplayable'
  | 'playground'

const CASTING_ABSENCE_REASONS: readonly CastingAbsenceReason[] = [
  'legacy-no-table',
  'legacy-unreplayable',
  'playground',
]

export function isCastingAbsenceReason(
  value: unknown,
): value is CastingAbsenceReason {
  return (
    typeof value === 'string' &&
    (CASTING_ABSENCE_REASONS as readonly string[]).includes(value)
  )
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm --filter @hexagram/core test -- types.test`
Expected: PASS.

- [ ] **Step 5: Confirm the subpath export resolves**

`CastingAbsenceReason` ships via the existing `@hexagram/core/types` subpath (it
lives in `types.ts`, already an export entry — see `domain/core/tsdown.config.ts`
and `package.json#exports`). No new export entry needed. Run
`pnpm --filter @hexagram/core type:check`; Expected: green.

- [ ] **Step 6: Commit**

```bash
git add domain/core/src/types.ts domain/core/tests/types.test.ts
git commit  # subject: "feat(core): add CastingAbsenceReason vocabulary + guard"
```

### Task A2: envelope field + serialize + parse default

**Files:**
- Modify: `domain/consultation-file/src/frontmatter.ts:68-76` (interface), `:98-108` (serialize), `:137-164` (parse)
- Test: `domain/consultation-file/tests/frontmatter.test.ts` (append; create if absent)

- [ ] **Step 1: Write the failing tests**

Append to `domain/consultation-file/tests/frontmatter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  parseFrontmatter,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '../src/frontmatter.js'

const baseHexagram = [7, 7, 7, 7, 7, 7] as const

function nullCastingEnvelope(
  reason: 'legacy-no-table' | 'legacy-unreplayable' | 'playground',
): ConsultationEnvelope {
  return {
    schemaVersion: 1,
    timestamp: '2026-06-07T10:00:00+0800',
    query: 'q',
    hexagram: [...baseHexagram] as ConsultationEnvelope['hexagram'],
    casting: null,
    castingAbsence: reason,
  }
}

describe('castingAbsence frontmatter', () => {
  it('serializes castingAbsence when casting is null and omits the casting key', () => {
    const text = serializeFrontmatter(nullCastingEnvelope('playground'), 'body')
    expect(text).toMatch(/^castingAbsence: playground$/m)
    expect(text).not.toMatch(/^casting:/m)
  })

  it('round-trips each reason', () => {
    for (const reason of ['legacy-no-table', 'legacy-unreplayable', 'playground'] as const) {
      const text = serializeFrontmatter(nullCastingEnvelope(reason), 'body')
      const parsed = parseFrontmatter(text)
      expect(parsed.ok).toBe(true)
      if (parsed.ok) {
        expect(parsed.data.envelope.casting).toBeNull()
        expect(parsed.data.envelope.castingAbsence).toBe(reason)
      }
    }
  })

  it('defaults a pre-field null-casting file to legacy-no-table', () => {
    // A file written before this field: no `casting`, no `castingAbsence`.
    const legacy =
      '---\nschemaVersion: 1\ntimestamp: 2026-01-01T00:00:00+0800\nquery: q\n' +
      'hexagram:\n  L6: 7\n  L5: 7\n  L4: 7\n  L3: 7\n  L2: 7\n  L1: 7\n---\n\nbody\n'
    const parsed = parseFrontmatter(legacy)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.data.envelope.casting).toBeNull()
      expect(parsed.data.envelope.castingAbsence).toBe('legacy-no-table')
    }
  })

  it('a present casting carries a null castingAbsence', () => {
    const text =
      '---\nschemaVersion: 1\ntimestamp: 2026-01-01T00:00:00+0800\nquery: q\n' +
      'hexagram:\n  L6: 7\n  L5: 7\n  L4: 7\n  L3: 7\n  L2: 7\n  L1: 7\n' +
      'casting:\n  L6:\n    - {pick: 24, max: 48}\n    - {pick: 20, max: 43}\n    - {pick: 16, max: 39}\n' +
      '  L5:\n    - {pick: 24, max: 48}\n    - {pick: 20, max: 43}\n    - {pick: 16, max: 39}\n' +
      '  L4:\n    - {pick: 24, max: 48}\n    - {pick: 20, max: 43}\n    - {pick: 16, max: 39}\n' +
      '  L3:\n    - {pick: 24, max: 48}\n    - {pick: 20, max: 43}\n    - {pick: 16, max: 39}\n' +
      '  L2:\n    - {pick: 24, max: 48}\n    - {pick: 20, max: 43}\n    - {pick: 16, max: 39}\n' +
      '  L1:\n    - {pick: 24, max: 48}\n    - {pick: 20, max: 43}\n    - {pick: 16, max: 39}\n---\n\nbody\n'
    const parsed = parseFrontmatter(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.data.envelope.casting).not.toBeNull()
      expect(parsed.data.envelope.castingAbsence).toBeNull()
    }
  })

  it('rejects an unknown castingAbsence value as invalid-shape', () => {
    const bad =
      '---\nschemaVersion: 1\ntimestamp: 2026-01-01T00:00:00+0800\nquery: q\n' +
      'hexagram:\n  L6: 7\n  L5: 7\n  L4: 7\n  L3: 7\n  L2: 7\n  L1: 7\n' +
      'castingAbsence: bogus\n---\n\nbody\n'
    const parsed = parseFrontmatter(bad)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason).toBe('invalid-shape')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @hexagram/consultation-file test -- frontmatter.test`
Expected: FAIL — `castingAbsence` not on the envelope / not serialized.

- [ ] **Step 3: Update the interface**

Replace `frontmatter.ts:68-76` with:

```ts
export interface ConsultationEnvelope {
  schemaVersion: number
  timestamp: string
  query: string
  hexagram: Hexagram
  /** `null` when the consultation has no recorded casting. */
  casting: CastingRecord | null
  /**
   * Why `casting` is absent — non-null IFF `casting` is null (ADR-0008). A
   * pre-field null-casting file (no key) parses back as 'legacy-no-table'.
   */
  castingAbsence: CastingAbsenceReason | null
}
```

Add `CastingAbsenceReason` + `isCastingAbsenceReason` to the import from
`@hexagram/core/types` at `frontmatter.ts:1-8`:

```ts
import {
  isCastingAbsenceReason,
  isCastingRecord,
  isHexagram,
  type CastingAbsenceReason,
  type CastingRecord,
  type Hexagram,
  type Line,
  type LineCasting,
} from '@hexagram/core/types'
```

- [ ] **Step 4: Update serialize**

Replace the `data` object spread at `frontmatter.ts:98-108` with — note
`castingAbsence` takes the casting key's slot so insertion order stays
`schemaVersion → timestamp → query → hexagram → (casting | castingAbsence)`:

```ts
  const data = {
    schemaVersion: envelope.schemaVersion,
    timestamp: envelope.timestamp,
    query: envelope.query,
    hexagram: hexagramToYaml(envelope.hexagram),
    // Exactly one of `casting` / `castingAbsence` is present. A null casting
    // omits the casting key and records WHY it is absent (ADR-0008). Defensive
    // default keeps serialize total even if a caller forgot the reason.
    ...(envelope.casting === null
      ? { castingAbsence: envelope.castingAbsence ?? 'legacy-no-table' }
      : { casting: castingToYaml(envelope.casting) }),
  }
```

- [ ] **Step 5: Update parse**

At `frontmatter.ts:137-140` add `castingAbsence` to the destructure:

```ts
  const {
    schemaVersion,
    timestamp,
    query,
    hexagram,
    casting,
    castingAbsence,
  } = data as Record<string, unknown>
```

Replace the casting block at `frontmatter.ts:153-164` with:

```ts
  // `casting` is optional: an absent key means "no casting recorded". When
  // casting is absent, `castingAbsence` records why — defaulting to
  // 'legacy-no-table' for pre-field files (ADR-0008). A present-but-unknown
  // castingAbsence value is corruption → invalid-shape.
  let castingRecord: CastingRecord | null
  let absence: CastingAbsenceReason | null
  if (casting === undefined) {
    castingRecord = null
    if (castingAbsence === undefined) {
      absence = 'legacy-no-table'
    } else if (isCastingAbsenceReason(castingAbsence)) {
      absence = castingAbsence
    } else {
      return { ok: false, reason: 'invalid-shape' }
    }
  } else {
    if (!isYamlCasting(casting)) return { ok: false, reason: 'invalid-shape' }
    castingRecord = castingFromYaml(casting)
    if (!isCastingRecord(castingRecord)) {
      return { ok: false, reason: 'invalid-shape' }
    }
    absence = null
  }
```

Add `castingAbsence: absence` to the returned envelope at `frontmatter.ts:169-174`:

```ts
      envelope: {
        schemaVersion,
        timestamp,
        query,
        hexagram: hexagramTuple,
        casting: castingRecord,
        castingAbsence: absence,
      },
```

- [ ] **Step 6: Run tests + type-check**

Run: `pnpm --filter @hexagram/consultation-file test -- frontmatter.test`
Expected: PASS. Then `pnpm --filter @hexagram/consultation-file type:check`.
**Expected breakage:** `file.ts` and `legacy-converter.ts` no longer satisfy the
envelope type (missing `castingAbsence`). That is fixed in A3/A4 — it is fine for
this step's type:check to flag them; do not patch them here beyond what A3/A4
specify. If you prefer green between commits, do A2+A3+A4 then commit; otherwise
commit A2 now knowing the package type:check is red until A4.

- [ ] **Step 7: Commit**

```bash
git add domain/consultation-file/src/frontmatter.ts domain/consultation-file/tests/frontmatter.test.ts
git commit  # subject: "feat(consultation-file): record castingAbsence reason in the envelope"
```

### Task A3: `saveConsultationFile` requires the reason when casting is null

**Files:**
- Modify: `domain/consultation-file/src/file.ts:51-78`
- Test: `domain/consultation-file/tests/file.test.ts` (append; create if absent)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { saveConsultationFile, loadConsultationFile } from '../src/file.js'

const hex = [7, 7, 7, 7, 7, 7] as const

describe('saveConsultationFile castingAbsence', () => {
  it('persists the reason for a null casting and reads it back', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hx-'))
    const p = await saveConsultationFile({
      query: 'q',
      hexagram: [...hex] as never,
      casting: null,
      castingAbsence: 'playground',
      dir,
    })
    const text = await fs.readFile(p, 'utf8')
    expect(text).toMatch(/^castingAbsence: playground$/m)
    const loaded = await loadConsultationFile(p)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.envelope.castingAbsence).toBe('playground')
  })

  it('throws if a null casting is saved without a reason', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hx-'))
    await expect(
      saveConsultationFile({
        query: 'q',
        hexagram: [...hex] as never,
        casting: null,
        dir,
        // castingAbsence intentionally omitted
      } as never),
    ).rejects.toThrow(/castingAbsence/)
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @hexagram/consultation-file test -- file.test`
Expected: FAIL.

- [ ] **Step 3: Update `saveConsultationFile`**

Replace the signature + envelope build at `file.ts:51-78`. Add the import of
`CastingAbsenceReason` to the `@hexagram/core/types` import at `file.ts:5`:

```ts
import type {
  CastingAbsenceReason,
  CastingRecord,
  Hexagram,
} from '@hexagram/core/types'
```

```ts
export async function saveConsultationFile(params: {
  query: string
  hexagram: Hexagram
  casting: CastingRecord | null
  /** Required when `casting` is null — why casting is absent (ADR-0008). */
  castingAbsence?: CastingAbsenceReason
  dir?: string
}): Promise<string> {
  if (params.casting === null && params.castingAbsence === undefined) {
    throw new Error(
      'saveConsultationFile: castingAbsence is required when casting is null',
    )
  }
  const dir = params.dir ?? defaultConsultationsDir()
  await fs.mkdir(dir, { recursive: true })
  const fileSafe = getFilesystemSafeTimestamp()
  const filePath = path.join(dir, `consultation-${fileSafe}.md`)
  const body = markdownConsultationBody(
    params.query,
    params.hexagram,
    params.casting,
    params.casting === null ? params.castingAbsence! : null, // Phase B uses this
  )
  const text = serializeFrontmatter(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: getIsoTimestamp(),
      query: params.query,
      hexagram: params.hexagram,
      casting: params.casting,
      castingAbsence: params.casting === null ? params.castingAbsence! : null,
    },
    body,
  )
  await fs.writeFile(filePath, text, 'utf8')
  return filePath
}
```

> NOTE: the 4th arg to `markdownConsultationBody` is added in Phase B (Task B2).
> If you are implementing Phase A standalone and want green type-checks, drop the
> 4th arg here and add it in B2. The `castingAbsence` envelope field is the
> Phase-A deliverable; the body-surfacing is Phase B.

- [ ] **Step 4: Run tests + type-check**

Run: `pnpm --filter @hexagram/consultation-file test -- file.test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add domain/consultation-file/src/file.ts domain/consultation-file/tests/file.test.ts
git commit  # subject: "feat(consultation-file): require castingAbsence at the save boundary"
```

### Task A4: legacy converter distinguishes the two legacy nulls

**Files:**
- Modify: `domain/consultation-file/src/legacy-converter.ts:43-53` (envelope), `:90-107` (`extractCasting`)
- Test: `domain/consultation-file/tests/legacy-converter.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Find an existing no-table legacy fixture (Shape B) and an existing
failed-replay fixture in the legacy test corpus (`grep -rl` the test for the
fixtures it already uses). Assert the reason:

```ts
// Pseudocode skeleton — wire to the real fixtures the suite already loads.
import { describe, expect, it } from 'vitest'
import { convertLegacyTxt } from '../src/legacy-converter.js'

describe('convertLegacyTxt castingAbsence', () => {
  it('marks a no-table (Shape B) file legacy-no-table', () => {
    const res = convertLegacyTxt({ text: SHAPE_B_TEXT, filenameTimestamp: '2026-01-01T00-00-00+0800' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).toBeNull()
      expect(res.envelope.castingAbsence).toBe('legacy-no-table')
    }
  })
  it('marks a present-but-unreplayable table legacy-unreplayable', () => {
    const res = convertLegacyTxt({ text: SHAPE_A_BROKEN_TEXT, filenameTimestamp: '2026-01-01T00-00-00+0800' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).toBeNull()
      expect(res.envelope.castingAbsence).toBe('legacy-unreplayable')
    }
  })
  it('a recovered table has a null castingAbsence', () => {
    const res = convertLegacyTxt({ text: SHAPE_A_VALID_TEXT, filenameTimestamp: '2026-01-01T00-00-00+0800' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).not.toBeNull()
      expect(res.envelope.castingAbsence).toBeNull()
    }
  })
})
```

If the suite has no broken-Shape-A fixture, construct one by taking a valid HEAP/
SPLIT table fixture and corrupting one `pick` so replay throws/mismatches (the
`legacy-real-*.txt` corpus + the existing converter tests are the source of
truth for the table format).

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @hexagram/consultation-file test -- legacy-converter.test`
Expected: FAIL (`castingAbsence` not on the result / always null).

- [ ] **Step 3: Make `extractCasting` return a discriminated result**

Replace `extractCasting` at `legacy-converter.ts:90-107` with a version that
returns the reason alongside the null:

```ts
type ExtractedCasting =
  | { casting: CastingRecord; absence: null }
  | { casting: null; absence: 'legacy-no-table' | 'legacy-unreplayable' }

function extractCasting(text: string, expected: Hexagram): ExtractedCasting {
  const rows = parseHeapTable(text) ?? parseSplitTable(text)
  if (rows === null) return { casting: null, absence: 'legacy-no-table' }

  const casting: CastingRecord = [
    splitsToLineCasting(rows[1]!),
    splitsToLineCasting(rows[2]!),
    splitsToLineCasting(rows[3]!),
    splitsToLineCasting(rows[4]!),
    splitsToLineCasting(rows[5]!),
    splitsToLineCasting(rows[6]!),
  ]

  return castingReplaysTo(casting, expected)
    ? { casting, absence: null }
    : { casting: null, absence: 'legacy-unreplayable' }
}
```

Update the envelope assembly at `legacy-converter.ts:43-53`:

```ts
  const extracted = extractCasting(text, hexagram)
  return {
    ok: true,
    envelope: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: filenameTimestampToIso(input.filenameTimestamp),
      query,
      hexagram,
      casting: extracted.casting,
      castingAbsence: extracted.absence,
    },
  }
```

Update the explanatory comment block at `legacy-converter.ts:38-42` to say the
two null cases now carry distinct reasons (`legacy-no-table` vs
`legacy-unreplayable`) rather than "no sentinel". Likewise soften the
`replayLine` comment at `legacy-converter.ts:189-195` ("provenance is
intentionally not kept" is now false — the reason IS kept).

- [ ] **Step 4: Run tests + the whole package**

Run: `pnpm --filter @hexagram/consultation-file test` and
`pnpm --filter @hexagram/consultation-file type:check`. Both green.

- [ ] **Step 5: Commit**

```bash
git add domain/consultation-file/src/legacy-converter.ts domain/consultation-file/tests/legacy-converter.test.ts
git commit  # subject: "feat(consultation-file): distinguish legacy-no-table from legacy-unreplayable"
```

### Task A5: playground passes `castingAbsence: 'playground'`

**Files:**
- Modify: `cli/playground-ui/src/playground-app.tsx:283-289`
- Test: `cli/playground-ui/tests/playground-app.test.tsx` (the existing save test, ~line 296)

- [ ] **Step 1: Update the existing save assertion to expect the reason**

In `cli/playground-ui/tests/playground-app.test.tsx`, find the save test that
asserts `expect(content).not.toMatch(/^casting:/m)` and add:

```ts
expect(content).toMatch(/^castingAbsence: playground$/m)
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @hexagram/playground-ui test -- playground-app`
Expected: FAIL.

- [ ] **Step 3: Pass the reason in the save params**

Update `playground-app.tsx:283-289`:

```ts
      const params: Parameters<typeof saveConsultationFile>[0] = {
        query,
        hexagram: state.lines,
        casting: null,
        castingAbsence: 'playground',
      }
      if (saveDir !== undefined) params.dir = saveDir
      saveConsultationFile(params)
```

- [ ] **Step 4: Run tests** → PASS. `pnpm --filter @hexagram/playground-ui type:check` green.

- [ ] **Step 5: Commit**

```bash
git add cli/playground-ui/src/playground-app.tsx cli/playground-ui/tests/playground-app.test.tsx
git commit  # subject: "feat(playground): record playground saves as castingAbsence=playground"
```

### Task A6: migration log names the reason (optional nicety)

**Files:**
- Modify: `apps/cli/src/migrate-legacy.ts:45`

- [ ] **Step 1:** Replace the log suffix at `migrate-legacy.ts:45` so it prints
  the specific reason instead of the generic `(casting unrecovered)`:

```ts
    `OK ${name} → ${path.basename(mdPath)}${
      envelope.casting === null
        ? ` (casting absent: ${envelope.castingAbsence})`
        : ''
    }\n`,
```

- [ ] **Step 2:** Run `pnpm --filter @hexagram/cli type:check` (or the apps/cli
  filter) → green. (This is stderr log text; if a test asserts the old wording,
  update it.)

- [ ] **Step 3: Commit**

```bash
git add apps/cli/src/migrate-legacy.ts
git commit  # subject: "feat(cli): migration log names the casting-absence reason"
```

### Phase A gate

- [ ] Run `pnpm test`, `pnpm type:check`, `pnpm lint:check` — all green.
- [ ] **Fixture check:** run `git status` on `**/tests/fixtures/**`. Phase A
  changes the *envelope* only. The saved-file fixtures (`md-file-*.md`) have no
  null-casting case (confirmed), so they should NOT change. If a legacy or
  playground test fixture asserts file *content*, update it deliberately (the new
  `castingAbsence:` line is correct). Do NOT regenerate the readout fixtures yet —
  that is Phase B.

---

## PHASE B — surface the reason in the readout

### Task B1: IR `CastingSection.absenceReason`

**Files:**
- Modify: `domain/consultation-view/src/ir.ts:26-31`

- [ ] **Step 1:** Add the field to `CastingSection`:

```ts
export interface CastingSection {
  readonly kind: 'casting'
  readonly media: readonly SectionMedium[]
  /** null → "Casting not recorded" caption; otherwise the 18 ledger rows. */
  readonly rows: readonly LedgerRow[] | null
  /**
   * When `rows` is null, why casting is absent (drives the reason-aware notice).
   * null/absent for live-flow renders (partial real casting) where no reason
   * applies. Imported from core to avoid restating the vocabulary.
   */
  readonly absenceReason?: import('@hexagram/core/types').CastingAbsenceReason | null
}
```

(Prefer a top-of-file `import type { CastingAbsenceReason } from '@hexagram/core/types'`
and reference it directly rather than the inline `import(...)` — match the file's
existing import style.)

- [ ] **Step 2:** `pnpm --filter @hexagram/consultation-view type:check` → green
  (field is optional, so nothing breaks yet). Commit:

```bash
git add domain/consultation-view/src/ir.ts
git commit  # subject: "feat(consultation-view): CastingSection carries the absence reason"
```

### Task B2: thread the reason through `buildConsultationView` + body composer

**Files:**
- Modify: `domain/consultation-view/src/build-view.ts:184-197`
- Modify: `domain/consultation-file/src/markdown.ts:14-22`
- (file.ts already passes the 4th arg from Task A3)

- [ ] **Step 1: Write a failing test** in `domain/consultation-view/tests/build-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildConsultationView } from '../src/build-view.js'

describe('buildConsultationView absence reason', () => {
  it('threads the reason into the casting section when casting is null', () => {
    const view = buildConsultationView('q', [7, 7, 7, 7, 7, 7], null, 'playground')
    const casting = view.sections.find((s) => s.kind === 'casting')
    expect(casting && 'absenceReason' in casting && casting.absenceReason).toBe('playground')
  })
  it('defaults to null reason when omitted (live flow)', () => {
    const view = buildConsultationView('q', [7, 7, 7, 7, 7, 7], null)
    const casting = view.sections.find((s) => s.kind === 'casting')
    expect(casting && 'absenceReason' in casting ? casting.absenceReason ?? null : null).toBeNull()
  })
})
```

- [ ] **Step 2:** Run → FAIL. `pnpm --filter @hexagram/consultation-view test -- build-view`.

- [ ] **Step 3:** Update `buildConsultationView` signature + casting section at
  `build-view.ts:184-197`. Add the import of `CastingAbsenceReason` to the
  `@hexagram/core/types` import at `build-view.ts:7`:

```ts
export function buildConsultationView(
  query: string,
  hexagram: Hexagram,
  casting: PartialCastingRecord | null,
  absenceReason: CastingAbsenceReason | null = null,
): ConsultationView {
```

```ts
    {
      kind: 'casting',
      media: ['ansi', 'markdown'],
      rows: casting === null ? null : buildLedgerRows(casting),
      absenceReason: casting === null ? absenceReason : null,
    },
```

- [ ] **Step 4:** Update `markdownConsultationBody` at `markdown.ts:14-22` to take
  and forward the reason:

```ts
export function markdownConsultationBody(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
  absenceReason: CastingAbsenceReason | null = null,
): string {
  return serializeConsultationMarkdownBody(
    buildConsultationView(query, hexagram, casting, absenceReason),
  )
}
```

Add `CastingAbsenceReason` to the `@hexagram/core/types` import at `markdown.ts:2`.

- [ ] **Step 5:** Run `pnpm --filter @hexagram/consultation-view test` and
  `type:check`; then `pnpm --filter @hexagram/consultation-file type:check`. Green.
  (The two live-flow callers `readout/output-composers.ts:50` and
  `casting-ui/output-composers.ts:15` pass 3 args; the 4th defaults to null — no
  change needed there.)

- [ ] **Step 6: Commit**

```bash
git add domain/consultation-view/src/build-view.ts domain/consultation-file/src/markdown.ts domain/consultation-view/tests/build-view.test.ts
git commit  # subject: "feat(consultation-view): thread absence reason into the casting section"
```

### Task B3: reason-aware notice in both serializers

**Files:**
- Modify: `domain/consultation-file/src/serialize-markdown.ts:34-35`
- Modify: `cli/readout/src/serialize-ansi.ts:44-50`

- [ ] **Step 1:** Define the human label once. Add to
  `domain/consultation-view/src/ir.ts` (so both serializers import it):

```ts
import type { CastingAbsenceReason } from '@hexagram/core/types'

/** Human-readable phrase for each absence reason, shared by all serializers. */
export const CASTING_ABSENCE_LABEL: Record<CastingAbsenceReason, string> = {
  'legacy-no-table': 'legacy file had no casting table',
  'legacy-unreplayable': 'recorded casting could not be validated',
  playground: 'playground exploration',
}
```

- [ ] **Step 2:** Markdown notice at `serialize-markdown.ts:34-35`:

```ts
export function serializeCastingMarkdown(section: CastingSection): string {
  if (section.rows === null) {
    const why = section.absenceReason
      ? ` (${CASTING_ABSENCE_LABEL[section.absenceReason]})`
      : ''
    return `## CASTING\n\n_Casting not recorded${why}._\n`
  }
  // ...unchanged ledger path...
```

Import `CASTING_ABSENCE_LABEL` from `@hexagram/consultation-view/ir`.

- [ ] **Step 3:** ANSI notice at `serialize-ansi.ts:44-50`:

```ts
export function serializeCastingAnsi(section: CastingSection): string {
  if (section.rows === null) {
    const why = section.absenceReason
      ? ` (${CASTING_ABSENCE_LABEL[section.absenceReason]})`
      : ''
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded${why}
`.trim()
  }
  // ...unchanged ledger path...
```

- [ ] **Step 4:** Add a focused serializer unit test (each reason → expected
  phrase) in the respective package test files.

- [ ] **Step 5:** Run `pnpm --filter @hexagram/consultation-file test`,
  `pnpm --filter @hexagram/readout test`, both `type:check`. Green except golden
  fixtures (next step).

- [ ] **Step 6: Commit**

```bash
git add domain/consultation-view/src/ir.ts domain/consultation-file/src/serialize-markdown.ts cli/readout/src/serialize-ansi.ts <new serializer tests>
git commit  # subject: "feat(readout): name the casting-absence reason in the notice"
```

### Task B4: thread the reason into the history-load readout

**Files:**
- Trace + modify: the loaded-file render path. The history browser loads an
  envelope and renders a `ConsultationReadout`. Find where the loaded
  `envelope.casting` reaches `buildConsultationView` / `ConsultationReadout` and
  pass `envelope.castingAbsence` alongside it.

- [ ] **Step 1:** `grep -rn "ConsultationReadout\|buildConsultationSections\|buildConsultationView" cli/history-ui cli/readout` and follow how a loaded consultation is rendered. The readout composer at `cli/readout/src/output-composers.ts:50` currently takes `(query, hexagram, casting)`; add an optional `absenceReason` param mirroring B2 and have the history render pass `envelope.castingAbsence`.

- [ ] **Step 2:** Add/extend a history-ui test that loads a null-casting fixture
  (playground or legacy) and asserts the rendered readout shows the reason phrase.

- [ ] **Step 3:** Run the history-ui + readout suites; `type:check`. Green.

- [ ] **Step 4: Commit**

```bash
git add cli/readout/src/output-composers.ts cli/history-ui/src/... <tests>
git commit  # subject: "feat(history): show the casting-absence reason for loaded consultations"
```

### Task B5: regenerate the golden fixtures (intentional byte change)

- [ ] **Step 1:** Run `pnpm generate-fixtures`. This is the SANCTIONED update for
  this slice (unlike a pure refactor). Inspect the diff:

```bash
pnpm generate-fixtures
git diff --stat -- '**/tests/fixtures/**'
git diff -- '**/tests/fixtures/**'
```

- [ ] **Step 2:** Confirm every changed fixture byte is **only** in a null-casting
  case and is **only** the new ` (reason phrase)` suffix on "Casting not
  recorded" (+ the `castingAbsence:` frontmatter line for any null-casting
  saved-file fixture). No casting-present fixture may change. If a casting-present
  fixture changed, STOP — something leaked (the `absenceReason` should be null
  whenever rows are non-null).

- [ ] **Step 3:** Run `pnpm test` (all suites green against regenerated fixtures).

- [ ] **Step 4: Commit**

```bash
git add '**/tests/fixtures/**'
git commit  # subject: "test: regenerate fixtures for reason-aware casting-absence notice"
```

---

## PHASE C — documentation / ADRs

### Task C1: amend ADR-0008

**File:** `docs/adr/0008-consultation-file-format.md`

- [ ] Add `castingAbsence` to the envelope field list (the five-field list near
  the top). State: present iff `casting` is absent; closed enum
  `legacy-no-table | legacy-unreplayable | playground`; **no `schemaVersion`
  bump**; pre-field null-casting files default to `legacy-no-table`. Update the
  Shape-A/Shape-B paragraph: Shape B → `legacy-no-table`, a Shape-A replay
  failure → `legacy-unreplayable` (no longer "no sentinel"). Add a short
  "Amendment — 2026-06-07" note explaining this supersedes the earlier
  "provenance intentionally not kept" stance for the *absence* case.

### Task C2: clarifying notes in ADR-0006 and ADR-0011

**Files:** `docs/adr/0006-...md`, `docs/adr/0011-...md`

- [ ] ADR-0006: where it says a degenerate legacy pick "converts to `null` …
  provenance intentionally not kept", add a note that the null is now tagged
  `legacy-unreplayable` (the *fact of* unreplayability is recorded; the casting
  data still is not recovered).
- [ ] ADR-0011: add a one-line clarification that "No provenance field" still
  holds for casts that *happened* (no `castMethod` for interactive/random/manual);
  `castingAbsence` is orthogonal — it exists only when casting is absent. This is
  a clarification, not a reversal.

### Task C3: domain docs

**Files:** `CLAUDE.md`/`AGENTS.md`, `CONTEXT.md` (and `docs/adr/README.md` index if it summarizes 0008)

- [ ] Update the passages that describe `casting: null` as "three intentionally
  indistinguishable origins" to note they are now distinguished by
  `castingAbsence` (legacy-no-table / legacy-unreplayable / playground).

- [ ] **Commit** Phase C:

```bash
git add docs/adr/0008-*.md docs/adr/0006-*.md docs/adr/0011-*.md CLAUDE.md AGENTS.md CONTEXT.md docs/adr/README.md
git commit  # subject: "docs: record the castingAbsence reason decision (ADR-0008 amendment)"
```

---

## Verification (run after each phase; full run at the end)

- `pnpm test` — all suites green (note: the rng distribution test is ~40s by design).
- `pnpm type:check` — green.
- `pnpm lint:check` — no new errors (6 pre-existing warnings are acceptable; verify via `git stash` they predate your change).
- **Boundary check:** the new `CastingAbsenceReason` lives in `@hexagram/core/types`; both `consultation-file` (domain) and `consultation-view` (domain) import it — no `domain → cli` edge introduced. `pnpm lint:check` enforces the boundary (ESLint `no-restricted-imports`, ADR-0019).
- **Fixture intent:** Phase A changes only the envelope (saved-file fixtures unaffected — no null-casting `md-file-*`). Phase B changes the rendered notice → fixtures regenerate, and the diff must be confined to null-casting cases + the new reason phrase. A casting-present fixture changing is a red flag.
- **Self-heal sanity:** opening a pre-field null-casting file defaults its reason to `legacy-no-table` and (via the existing body self-heal rewrite) will add the `castingAbsence:` line on next save — consistent with ADR-0008's renderer-upgrade self-heal. Confirm `parseFrontmatter` accepts both pre-field and post-field files at `schemaVersion: 1`.

## Out of scope / do not touch

- **No `schemaVersion` bump.** Do not change `CURRENT_SCHEMA_VERSION`.
- **The manual validator, `assertSelectablePick`, the pick-clamp invariant** — untouched (that was the S2 work).
- **Present-casting provenance** (interactive vs random vs manual) stays unrecorded — ADR-0011 still holds; this plan only explains *absence*.
- **The `casting` key shape itself** (`L6..L1`, `{pick, max}`) — unchanged.

## Risks

- **Leaking a non-null `absenceReason` into a present-casting render** → would
  change casting-present fixtures. Guarded by `absenceReason: casting === null ? … : null` in `buildConsultationView` and the Phase-B gate fixture inspection.
- **Key-order drift in frontmatter** → would change every fixture. Mitigated by
  putting `castingAbsence` in the casting key's slot and keeping `sortKeys: false`.
- **Forgetting a `saveConsultationFile` caller** that saves a null casting → the
  new runtime assertion throws loudly at the call site (fail fast, by design).
  Known null-casting savers: playground (A5) and the legacy migration (which
  saves via `markdownConsultationBody` + `serializeFrontmatter`, not
  `saveConsultationFile` — verify `migrate-legacy.ts` builds its envelope with
  `castingAbsence` from the converter result).

---

## HANDOFF PROMPT (paste to a fresh implementation agent)

> Implement the plan at
> `docs/superpowers/plans/2026-06-07-casting-absence-reason.md` in
> `/home/user/ts-hexagram-generator`. It is a self-contained, TDD,
> commit-by-commit plan to add a compulsory `castingAbsence` reason field
> (finding S4) so the three origins of an absent casting become distinguishable.
>
> Rules: work on branch `claude/cool-carson-Aig03` (already checked out; do NOT
> use any other branch; do NOT open a PR). Implement **Phase A first** (it is
> independently shippable), then Phase B, then Phase C — as the plan's separate
> single-intent commits. Each commit message records WHY and ends with the
> trailer `https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh`; put no model
> identifier anywhere. Use TodoWrite to track tasks.
>
> Hard guardrails (in the plan, do not violate): NO `schemaVersion` bump;
> `castingAbsence` is present IFF `casting` is absent; pre-field null-casting
> files default to `legacy-no-table` on read; never let a non-null
> `absenceReason` reach a present-casting render. Phase B regenerates golden
> fixtures via `pnpm generate-fixtures` — this is intentional, but the diff MUST
> be confined to null-casting cases + the new reason phrase; a casting-present
> fixture changing means you leaked the reason — stop and fix.
>
> After each phase run `pnpm test`, `pnpm type:check`, `pnpm lint:check` and
> report actual output. If a verification fails and you can't resolve it within
> the plan's scope, STOP and report with the command output rather than
> committing a broken state. When done, push
> `git push -u origin claude/cool-carson-Aig03` (retry 4× backoff on network
> errors only) and report the commit SHAs + the fixture diff stat + verification
> output.
