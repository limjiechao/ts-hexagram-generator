# Survey 03: Consultation aggregate and persistence

Scope: `domain/consultation-file/src/{frontmatter,file,casting-replay,legacy-converter,utils-timestamp}.ts`, `apps/cli/src/{workspace-root,migrate-legacy}.ts`, `cli/history-ui/src/{history-scan,history-app}.tsx?`, `cli/playground-ui/src/playground-app.tsx`, the casting save sites, and ADR-0008 / 0015 / 0020. Nothing under `consultations/` was opened.

## 1. What the Consultation aggregate is today

There is **no domain type named Consultation**. A grep for `type|interface Consultation` across `domain/` and `cli/` finds nothing. The aggregate exists only as a **persistence envelope**, `ConsultationEnvelope`, in `domain/consultation-file/src/frontmatter.ts:82-109`:

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | literal `1` (`typeof CURRENT_SCHEMA_VERSION`) | frontmatter.ts:30, 90. Checked strict-equal on load (frontmatter.ts:181). There is no migration path (ADR-0008:12, 244). |
| `timestamp` | `string` (ISO with a `+0800`-style offset) | Not a branded or Date type. Generated from wall-clock time inside the I/O function (file.ts:95, utils-timestamp.ts:18). |
| `query` | `string` | Empty string is allowed. The legacy converter maps `(Query not provided)` to `''` (legacy-converter.ts:69-75). |
| `hexagram` | `Hexagram`, a bottom-first 6-tuple | Stored on disk as an `L6..L1` mapping (frontmatter.ts:71-80). |
| `casting` / `castingAbsence` | the `CastingPresence` discriminated union | frontmatter.ts:105-107. The illegal both-null and both-set states cannot be represented (ADR-0008:189-234, locked by `tests/envelope-types.test-d.ts`). |

**Invariants and where they are enforced:**
- **Exactly one of casting or absence is set.** This is enforced by the type (frontmatter.ts:105). The save params mirror it with `castingAbsence?: never` (file.ts:55-70).
- **The casting must replay to the hexagram.** This is enforced **only on parse** (frontmatter.ts:223, casting-replay.ts:22) and in the legacy converter (legacy-converter.ts:121). `saveConsultationFile` and `serializeFrontmatter` **do not check it**. Nothing stops a caller from writing a casting/hexagram pair that will fail to load. The write path trusts the flow reducer, so this "prove, don't trust" check is asymmetric in the other direction.
- **Absence reasons form a closed enum** of `legacy-no-table | legacy-unreplayable | playground`. The enum lives in **`domain/core/src/types.ts:120-137`**, so persistence and migration vocabulary (two of the three values say "legacy") sits in the oracle core.
- **Read-time default.** A missing `castingAbsence` key is read as `legacy-no-table` (frontmatter.ts:203-204). ADR-0008:145-187 records this as deliberate.
- **Identity is the file path.** The envelope has no id. `HistoryEntry.path` (history-scan.ts:11), delete (history-app.tsx:214), and focus restore all key on the path. The filename timestamp (file.ts:84) and the envelope `timestamp` (file.ts:95) come from **two separate `dayjs()` calls**, so they can differ across a second boundary. Two saves in the same second **silently overwrite** each other, because `fs.writeFile` is called with the default `'w'` flag (file.ts:85, 102).
- **Derived data is never persisted** (ADR-0008:44-48). This is the right call for a pure aggregate: names, the emerging hexagram and texts are always recomputed.

**Verdict:** the aggregate is a well-typed *record*, but it is modelled as a file DTO in an I/O package, not as a domain entity. Its invariants are split three ways: the `core/types` guards, the `consultation-file` parser, and the casting-ui reducer.

## 2. Implicit repository, Node API inventory, and codec versus I/O

The repository is implicit and spread across six packages. Every fs, path and process call on the persistence path:

| Call | Location | Owner |
|---|---|---|
| `fs.mkdir`, `fs.writeFile` (save) | domain/consultation-file/src/file.ts:83, 102 | domain package (!) |
| `fs.readFile` (load) | file.ts:116 | domain package |
| `path.join(process.cwd(), 'consultations')` | file.ts:44-46 (`defaultConsultationsDir`) | domain package |
| `path.join(dir, consultation-<ts>.md)` (naming policy) | file.ts:85 | domain package |
| `fs.readdir` + `.md` filter (list/scan) | cli/history-ui/src/history-scan.ts:33-39 | cli |
| `fs.readFile` + `fs.writeFile` (self-heal) | cli/history-ui/src/history-app.tsx:33-35 | cli |
| `fs.unlink` (delete) | history-app.tsx:214 | cli |
| `path.relative(process.cwd(), …)` (display) | history-app.tsx:236, 249, 278; history-list.tsx:405; history-list-footer.tsx:88; history-list-transforms.ts:79; playground-app.tsx:298 | cli |
| `fs.readdir/mkdir/readFile/writeFile/rename` (migration) | apps/cli/src/migrate-legacy.ts:10-41 | app |
| `existsSync`, `fileURLToPath`, `path.dirname` | apps/cli/src/workspace-root.ts:1-59 | app |
| `defaultConsultationsDir()` fallbacks | cli/history-ui/src/run-history-viewer.tsx:7; cli/shell/src/hexagram-app.tsx:166 | cli |
| `saveConsultationFile` callers | cli/casting-ui/src/viewer.tsx:357; log-and-save.ts:22; cli/playground-ui/src/playground-app.tsx:293 | cli |

**Codec versus I/O split.** About 85% of `consultation-file` is a pure codec. The pure parts are `serializeFrontmatter` and `parseFrontmatter` (string ⇄ envelope+body), the `L6..L1` converters, `castingReplaysTo`, and `convertLegacyTxt`, which is pure text → envelope. Only `file.ts` does I/O, about 40 lines. That is a good seam, but it is not cleanly named:
- **What is pure:** the envelope validation in frontmatter.ts:178-227 (schema check, shape guards, absence default, replay).
- **What is tied to the Markdown format:** gray-matter framing and YAML (frontmatter.ts:11-28, 153, 167).
- **The problem:** the validation is fused with the YAML parse inside `parseFrontmatter`.

**Can Typst or IndexedDB reuse the codec unchanged? No, not as-is.** Both would need "plain object → validated envelope" without going through YAML text. The fix is cheap: split out `decodeEnvelope(raw: unknown): Result<Consultation, Reason>` and `encodeEnvelope(c): PlainRecord` from frontmatter.ts:178-227 and 134-149. After that:
- the Markdown adapter would be gray-matter + YAML around those functions;
- IndexedDB would store the plain record directly, because the structured clone of the `L6..L1` object already works;
- Typst would embed the same plain record as a `#let data = (…)` dictionary or a YAML/JSON sidecar.

## 3. Body as an injected opaque projection, and self-heal

**The separation is right.** The canonical record (envelope) and the read model (body) are cleanly split:
- The envelope is canonical. The body is produced by `markdownConsultationBody` in `cli/text-grid` and passed in as an opaque string (file.ts:58-65; ADR-0022).
- `consultation-file` does not depend on `consultation-view`. `text-grid` takes it only as a devDependency, for fixtures (cli/text-grid/package.json:53).

This is effectively a projection per medium, and it maps directly onto Typst: a Typst adapter would render its own projection from the same IR.

**Smells:**
- **The save API mixes write-model and read-model concerns.** `saveConsultationFile({..., body})` (file.ts:65) forces every caller to remember to render the body *with the right arguments*.
  - The legacy migration already gets this wrong. migrate-legacy.ts:33-37 calls `markdownConsultationBody(query, hexagram, casting)` **without `castingAbsence`**. Every migrated null-casting file is therefore written with a reasonless "Casting not recorded" notice and gets rewritten on first open. This is the same class of bug ADR-0008:160-163 calls fixed ("B5") for history.
  - The viewer, log-and-save and playground each repeat the render call (viewer.tsx:357-363, log-and-save.ts:22-28, playground-app.tsx:284-293).
  - In a hexagonal design the Markdown **adapter** should own `render(consultation) → body`, and the port should take only the domain record.
- **Self-heal lives in the UI, not in the repository.** `rerenderOnDisk` is in `cli/history-ui/src/history-app.tsx:19-37`, yet ADR-0008:267 says file.ts owns "body re-render + self-heal". That ADR line is wrong.
- **Self-heal makes a read mutate storage.** Opening a consultation writes to disk (history-app.tsx:35). This is a non-atomic `writeFile` (no temp-file + rename), so a crash mid-write corrupts the canonical frontmatter.

**What this implies for the repository contract.** `get(id)` must be a pure read. Self-heal becomes an adapter-private concern, a "write-back the derived projection" policy of the Markdown adapter that is only meaningful for media that store a projection. IndexedDB has no body, so it would never self-heal. Typst would regenerate on export. The "Body refreshed; data unchanged" notice then becomes an adapter-reported outcome such as a `ProjectionRefreshed` event or a `{ refreshed: boolean }` field. It does not belong in domain flow.

## 4. Legacy conversion as an anti-corruption layer

**Mostly yes.** `convertLegacyTxt` (legacy-converter.ts:30-62) is a pure translator from foreign text to a canonical envelope:
- it strips ANSI;
- it parses two table vintages, HEAP (L140-159) and SPLIT (L171-186);
- it **proves** the recovered casting by replay (L121) rather than trusting it.

The I/O lives separately in `apps/cli/src/migrate-legacy.ts`, and the history scan ignores `legacy/` because it reads only `.md` files.

**Where legacy knowledge leaks:**
- **Into the core vocabulary.** `legacy-no-table` and `legacy-unreplayable` are members of `CastingAbsenceReason` in `domain/core/src/types.ts:120-123`. The view IR has strings for them too (`domain/consultation-view/src/ir.ts:46-47`).
- **Into the canonical parser.** The read-time `legacy-no-table` default is applied in frontmatter.ts:203-204.

Only the parser default is real leakage. The enum values are arguably legitimate domain facts about *why* a casting is absent, but the names encode their origin rather than a domain concept. A better shape would be `absent: { reason: 'not-recorded' | 'unverifiable' | 'not-cast' }`, with the legacy origin kept as adapter metadata.

**Other notes:**
- The migration is a one-shot and is not idempotent-safe: it would overwrite an existing `.md` of the same name (migrate-legacy.ts:39-40).
- The fixtures are invented, as ADR-0015 requires (`domain/consultation-file/tests/fixtures/legacy-real-*.txt`, the Greyfen corpus).

## 5. Node coupling of the YAML frontmatter, and browser blockers

- **`gray-matter@4.0.3`, the main blocker.** It is CommonJS.
  - `index.js:3` does `require('fs')`. The package's `"browser": {"fs": false}` field softens this for bundlers.
  - More importantly, `matter()` calls `toFile()` → `utils.toBuffer` → **`Buffer.from`** on every parse (`lib/to-file.js:28`, `lib/utils.js:36`). Without a Buffer polyfill this throws in a browser.
  - It also keeps an unbounded module-global `matter.cache` keyed by file content (index.js:34).
- **`js-yaml@3.14` (`safeLoad`/`safeDump`).** These are deprecated APIs, removed in js-yaml 4. The library itself is browser-compatible.
- **`dayjs` with the utc/timezone plugins.** Browser-safe.
- **`file.ts`.** It imports `node:fs/promises`, `node:path` and `node:process` at module top (file.ts:1-3). The package exports it as a separate subpath (`./file`), so the frontmatter codec is importable without it. Good.
- **`casting-replay.ts`.** It imports `@hexagram/core`, whose index is pure. But `@hexagram/core/random-casting` and `crypto-random` import `node:crypto`, which is out of this slice.
- **Timestamp fragility.** js-yaml quotes `'…+0800'` on dump (probed), so round-trips work. A hand-written `+08:00` would load as a `Date` and fail as `invalid-shape` (frontmatter.ts:184).
- **History sort.** history-scan.ts:59 compares ISO strings lexically, which is wrong across differing offsets.

**Browser fix:** replace gray-matter with a roughly 20-line `---` fence splitter and use js-yaml 4 `load`/`dump`, or the `yaml` package.

## 6. Proposal

**Domain (pure core; no I/O and no clock):**
```ts
type ConsultationId = Brand<string, 'ConsultationId'>     // stable, not a path
type Consultation = {
  id: ConsultationId
  recordedAt: Instant                      // injected via Clock port, one read
  query: Query
  hexagram: Hexagram
  casting: CastingPresence                 // existing union, reasons renamed
}
// smart constructor enforces replay at creation, not just on load
recordConsultation(input, clock, ids): Result<Consultation, InvariantViolation>
```

**Domain events:**
- `ConsultationRecorded { id, recordedAt, hexagram, hasCasting }`
- `ConsultationDeleted { id }`
- adapter-level only, not domain: `ConsultationProjectionRefreshed { id }` and `LegacyConsultationImported { id, absence }`

**Port** (in an application layer, for example `domain/consultation` or `application/*`):
```ts
interface ConsultationRepository {
  save(c: Consultation): Promise<Result<void, SaveError>>          // 'conflict' | 'io'
  get(id: ConsultationId): Promise<Result<Consultation, LoadError>> // pure read
  list(q?: { filter?: string }): Promise<{
    items: ConsultationSummary[]; unreadable: UnreadableRecord[] }>
  remove(id: ConsultationId): Promise<Result<void, RemoveError>>
}
// Codec, medium-neutral, shared by every adapter:
encode(c: Consultation): ConsultationRecordV1          // plain JSON-safe object
decode(raw: unknown): Result<Consultation, DecodeFailure> // schema+shape+replay
```

**Adapters:**
- **MarkdownFs:** gray-matter/YAML + text-grid body + self-heal + filename policy + workspace root.
- **Typst:** template + data dict.
- **IndexedDB:** object store keyed by `id`, storing `ConsultationRecordV1`. It needs a `schemaVersion`-aware upgrade path, which ADR-0008's strict-refuse stance does not provide.

**What stays out of the core:**
- YAML/gray-matter, the `L6..L1` disk orientation, the body/projection and self-heal;
- filenames, dirs, `process.cwd`, `workspace-root`, `path.relative` display;
- legacy `.txt` parsing;
- `dayjs` formatting, the clock and id generation (these become ports or injected values);
- the `[unreadable]` presentation.

**Ratings:**
- **Code quality: 4/5.** Excellent types (the discriminated union, the literal schema version), WHY-comments, a shared replay rule and fixture discipline. It loses a point for the two-clock filename/timestamp skew, silent same-second overwrite, non-atomic self-heal writes, the missing absence argument in migrate-legacy, `as never` at history-app.tsx:170, and ADR drift: ADR-0008:10 says "six fields" where CLAUDE.md says five, ADR-0008:267 misplaces self-heal, and ADR-0020:29 calls `workspaceConsultationsDir` "pure" although it does `existsSync`.
- **Design integrity: 3/5.** The canonical/projection split and replay-proof loading are sound DDD instincts. But the aggregate is a file DTO living in an I/O package, there is no repository and no identity, CRUD is scattered across six packages (domain, history-ui, playground-ui, casting-ui, shell, apps), the read path mutates storage, and the codec is fused to YAML.
