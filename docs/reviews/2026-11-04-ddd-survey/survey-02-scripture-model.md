# Survey 02: The scriptural reference model

Scope: `domain/core/src/models/*`, `domain/core/src/getters.ts`, `domain/core/scripts/generate-json-files.ts`, ADR-0007, the line-semantics helpers, the consultation-view text selection and its serializers, the playground readings strip, and `refactor.md`. Nothing under `consultations/` was opened.

Each finding is marked **[F]** (a fact, with a path:line citation) or **[I]** (an inference or a recommendation).

---

## 1. The data model

### Keys and orderings
- **[F]** A hexagram key is a 6-character string `H[12]{6}`, read bottom line first, where `1` = yang and `2` = yin. It is a template-literal type (`domain/core/src/models/foundation.ts:1-9`). The 64 keys are listed in Wen Wang order in the unexported `HEXAGRAM_KEYS` (`foundation.ts:154-221`). The type `HexagramKey<Order>` is indexed by `WenWangOrder` (1..64), which is defined at `foundation.ts:302-309`.
- **[F]** A trigram key is `T[12]{3}`, also bottom line first (`domain/core/src/models/trigram.ts:22-34`). The trigram records are indexed by Fuxi order 1..8 (乾兌離震巽坎艮坤, `trigram.ts:1-3`).
- **[F]** Each hexagram also carries `Order.Fuxi`, a `Binary` string (`0b…`), and its Unicode code point, pinyin and zhuyin (`domain/core/src/models/hexagram.ts:30-53`).
- **[F]** I checked the generated JSON with a node script over `hexagrams.json` and `trigrams.json`:
  - There are 64 hexagrams and 8 trigrams.
  - For every hexagram, `Binary` equals the key bits in bottom-first order.
  - `Trigram.Lower` and `Trigram.Upper` equal key characters 1-3 and 4-6.
  - The Unicode code point equals `0x4DC0 + WenWang − 1`.
  - `Fuxi` equals the binary value + 1.
  - Every hexagram has non-empty Scripture text for the hexagram and for L1..L6 in all four variants.
  - The structural model is therefore internally consistent.
- **[F]** There is a name collision. `Hexagram` in `foundation.ts:9` is the polarity-string type. `Hexagram` in `domain/core/src/types.ts:13` is the `[Line×6]` tuple.

### Record shape
- **[F]** `GenericHexagramRecord` has the fields `{ Key, Name, Metadata, Text }` (`hexagram.ts:113-118`).
- **[F]** `Text` has four variants: `Chinese.{Traditional, Simplified}` and `English.{WilhelmBaynes, Legge}` (`hexagram.ts:99-108`).
- **[F]** The nominal per-variant shape is `Scripture{Hexagram 卦辭, Lines L1..L6 爻辭}` plus `Exegesis{Judgment 彖傳, Imagery{Hexagram 大象, Lines 小象}}` (`hexagram.ts:73-97`).
- **[F]** That nominal `HexagramText` type is unused. The variant types are `typeof` the data constants (for example `hexagram-text-english-legge.ts`, at the end of the file). As a result the variants differ structurally:
  - Chinese Traditional and Simplified have `Exegesis = {Judgment, Imagery}`.
  - Legge has `{Judgment, Imagery, Miscellaneous, Sequence}`, and `Miscellaneous` is empty in 28 of the 64 records.
  - Wilhelm-Baynes has `{Judgment, Imagery, Miscellaneous, Sequence, Extracts}`, and `Extracts` is a string in 19 records and `null` in the rest.
- **[F]** `LineTexts` holds only `L1..L6` (`foundation.ts:1248-1255`). There is no slot for 用九/用六, and no 文言 or 繫辭 text. The only mention of 用九/用六 in the repo is a comment at `cli/playground-ui/src/readings-panel.tsx:11`.
- **[F]** The trigram record has the fields `{Key, Name, Imagery, Metadata}` (`trigram.ts:340-345`).

### Is it a clean, read-only reference catalogue?
- **[I]** Mostly yes. It is pure, constant data with no I/O. Lookup is total over 64 keys, and the derived fields are consistent. That makes it a good candidate for a Published Language or Open Host.
- **[I]** Three things work against that:
  - The shapes differ by translation.
  - The PascalCase field names mix the source corpus's terms with the app's.
  - The public read surface is very thin: only `getHexagramRecord(Hexagram tuple)` and `getTrigramRecord(TrigramKey)` (`domain/core/src/getters.ts:27-35`).
    - The key derivation `getHexagramKey` is private (`getters.ts:16-25`).
    - There is no lookup by Wen Wang number, by key string or by Fuxi number.
    - `foundation.ts` is not an exported subpath (`domain/core/package.json` exports list).

### Duplication between the TS sources and the JSON
- **[F]** ADR-0007 says the JSON is "the runtime source consumed via `resolveJsonModule`" (`docs/adr/0007-hexagram-and-trigram-data.md:8-10`), and AGENTS.md:287 repeats this. That is **false today**:
  - `getters.ts:3,5` import `HEXAGRAM_RECORDS` and `TRIGRAM_RECORDS` from the `.ts` modules.
  - `git grep` finds no runtime import of `hexagrams.json` or `trigrams.json`. The only references are the generator writing them (`domain/core/scripts/generate-json-files.ts:8,12`).
- **[I]** The JSON is a dead artefact of about 10.5k lines, duplicated by hand from the TS. Nothing checks that the two stay in sync; regeneration is a manual `pnpm generate-json-files` (`domain/core/package.json:75`).
- **[I]** For an Open Host this is backwards. The JSON (or a schema-described export of it) should be the published artefact, with a CI check against the source.
- **[F]** Unverified: I could not run `tsx` to compare the TS records with the JSON byte-for-byte (the sandbox denied it). The last commit touching both is the `domain/` move, `e55c3f5`.

---

## 2. Where the "applicable text" rule lives, and how complete it is

### Location
- **[F]** The rule lives in the **IR layer** (`@hexagram/consultation-view`). It is not in the domain core.
  - `linesSection` counts the moving lines and branches on 0, 1, or 2 and more (`domain/consultation-view/src/build-view.ts:145-170`).
  - `oneMovingLineVariants` picks `Scripture.Lines[Lk]` and `Exegesis.Imagery.Lines[Lk]` (`build-view.ts:114-141`).
- **[F]** Core provides only primitives: `isMovingLine`, `movingLineIndices`, `hasMovingLines` and `getEmergingHexagram` (`domain/core/src/line-semantics.ts:21-84`).
- **[F]** The 2+ moving-line notice text is **duplicated in two serializers**:
  - `cli/readout/src/serialize-ansi.ts:237-243`
  - `cli/text-grid/src/serialize-markdown.ts:159-165`
- **[F]** A third, separate decision lives in the playground. `singleMovingIndex` is computed in `cli/playground-ui/src/playground-lines.ts:64-66` and gates the strip in `cli/playground-ui/src/playground-app.tsx:154`. The playground shows nothing for 0 or 2+ moving lines (`readings-panel.tsx:8-12`). It does reuse `movingLineVariants` for the text itself.

### Exactly what is implemented
| Moving lines | Text shown (for all 4 language variants) |
|---|---|
| 0 | The standing hexagram's 卦辭 + 大象 (ANSI: the `text:hexagram` section; Markdown: the `lines:none` section) (`build-view.ts:147-156, 247-259`) |
| 1 | The standing 卦辭 + 大象, **and** the emerging 卦辭 + 大象, **and** the moving line's 爻辭 + 小象 (`build-view.ts:314-341`) |
| 2–6 | The standing and emerging 卦辭 + 大象, plus the notice "No available reference scripture or exegesis for multiple moving lines." (`build-view.ts:164-169`) |

- **[F]** The "exegesis" shown is always **Imagery (象傳)**. `Exegesis.Judgment` (彖傳), `Miscellaneous`, `Sequence` and `Extracts` are never read anywhere outside `models/`, per a `git grep` for those field names.
- **[F]** In Wilhelm-Baynes, `Imagery.Lines` holds the combined "a) line text b) commentary" (for example `hexagram-text-english-wilhelm-baynes.ts:24`). So the English "exegesis" for a line repeats its scripture, which the Chinese variants do not.

### Gap against Zhu Xi's 考變占 (易學啟蒙), from my own knowledge
| n | Zhu Xi's rule | Implemented? |
|---|---|---|
| 0 | Standing 卦辭 | Yes |
| 1 | The moving line's 爻辭 in the standing hexagram | Yes |
| 2 | The two moving lines' 爻辭 in the standing hexagram; the upper line is primary | No (notice) |
| 3 | 卦辭 of standing and emerging; standing (貞) is primary, emerging (悔) secondary | Partially: both 卦辭 are always shown, but with no primacy and no rule label |
| 4 | The two **static** lines of the **emerging** hexagram; the lower is primary | No |
| 5 | The one static line of the **emerging** hexagram | No |
| 6 | 乾 → 用九, 坤 → 用六; otherwise the emerging 卦辭 | No, and the data cannot express it (no 用九/用六 slot) |

- **[I]** So the rule is roughly two-sevenths complete. It sits in the presentation IR, not in a pure domain "resolution" function. A REST API or PWA would have to re-derive it from `build-view.ts`, which also builds layout-specific IR.
- **[I]** Pending `refactor.md` adds a `textKind` with the values `hexagram | no-changing-lines | one-changing-line | many-changing-lines`. That bakes "many" in as a single empty case and moves further from a 0–6 rule, so it should be weighed against the overhaul.
- **[F]** `refactor.md` is partly stale: it names `domain/consultation-file/src/serialize-markdown.ts` (`refactor.md:20`), but that file now lives at `cli/text-grid/src/serialize-markdown.ts`.

---

## 3. Yilin 焦氏易林

- **[F]** There is no trace of it. A `git grep -i` for `yilin`, `易林`, `焦氏`, `焦延壽` and `jiao` returned nothing.
- **[I]** What a Yilin catalogue needs:
  - 4,096 verses keyed by the ordered pair (本卦, 之卦). That includes the 64 self-pairs X之X, which are the 0-moving-line case.
  - Each verse is a single 林辭, with optional translation, collation and source-edition fields.
- **[I]** Key fact for the design: **the 4,096 line permutations and the 4,096 ordered (standing, emerging) pairs are in bijection.** Each line maps to a pair of polarities:
  - 7 = (yang, yang)
  - 9 = (yang, yin)
  - 8 = (yin, yin)
  - 6 = (yin, yang)
  - So a Yilin key is derived, not new: `pairKey(hex) = (getHexagramKey(hex), getHexagramKey(getEmergingHexagram(hex)))`. The permutation string itself (for example `"978876"`) is an equally canonical key.
- **[I]** The current model supports this, with three gaps:
  1. `getHexagramKey` is private.
  2. There is no `PairKey` type. A string such as `H111111-H222222` or `{from, to}` would do.
  3. The `HexagramKey` type lists only the 64 literals (`foundation.ts:221`), so a pair type is a 4,096-member union. A template-literal type `` `${HexagramKey}>${HexagramKey}` `` is fine for TypeScript.
- **[I]** In size, Yilin text would be about 64× the per-hexagram text in Chinese alone. It should be a separate, lazily loaded catalogue module or file, not folded into `HEXAGRAM_RECORDS`.

---

## 4. Can all 4,096 permutations be enumerated and resolved purely today?

- **[F]** These pure building blocks exist:
  - `isHexagram` and `assertIsHexagram` (`types.ts:14-19`) validate a tuple.
  - `getEmergingHexagram` (`line-semantics.ts:82`).
  - `movingLineIndices` (`line-semantics.ts:29`).
  - `getHexagramRecord` and `getTrigramRecord` (`getters.ts:27-35`).
  - `movingLineVariants` (`build-view.ts:222`).
  - `buildConsultationView(query, hexagram, null)` (`build-view.ts:275`) is pure and total over any `Hexagram`.
- **[F]** Nothing enumerates the permutations. The nearest thing enumerates the 64 keys in a measurement script (`cli/playground-ui/scripts/measure-identity-stack-width.ts:46`).
- **[I]** What is missing for a stateless resource such as `GET /readings/{978876}`:
  1. A canonical permutation identifier with `parse` and `format` functions. Only array validation exists today.
  2. An `enumeratePermutations()` generator over 4^6. This is trivial to add.
  3. A **domain-level** `resolveReading(hex) → {standing, emerging, movingPositions, rule: ZhuXiCase, applicableTexts: TextRef[]}` that returns *references* (key + passage id), not presentation strings. Today the nearest thing, `buildConsultationView`, mixes in query, casting, diagram rows, identity strings and media visibility.
  4. Public key and record lookups: a key-string lookup, `getHexagramKey`, and a lookup by Wen Wang number. Hypermedia links (standing → emerging → line passage) need addressable passage ids such as `H111111/scripture/lines/L3`, and nothing defines them.
  5. The Zhu Xi 2–6 rules plus 用九/用六 data.
- **[F]** Determinism: the catalogue has no I/O and no randomness, so precomputing or caching every permutation is feasible today. At 4,096 × 4 variants the data is small.

---

## 5. Data quality, integrity and provenance

- **[F]** **The LICENSE belongs to a template.** It reads "Copyright © 2025 三咲智子 Kevin Deng (https://github.com/sxzz)" (`LICENSE:3`), apparently left over from a starter. `domain/core/package.json:6` says MIT.
- **[F]** **There is no provenance for the texts.** No file records the source edition or URL for the Chinese (Traditional or Simplified), Legge, or Wilhelm-Baynes text. A `git grep` for "public domain", copyright, ctext or wikisource in the docs found nothing.
- **[I]** Legge (1882) is public domain. The Wilhelm-Baynes English (Princeton, 1950) is very likely **still under copyright**, which is a licensing risk for a public REST API or PWA. The Chinese received text is public domain, but a specific edition or punctuation choice may carry rights.
- **[F]** **The JSON is stale-able and unused** (see §1), and the ADR and AGENTS.md describe it incorrectly.
- **[F]** **Translation shapes are inconsistent** (§1). The extra fields are untyped against the nominal `HexagramText`. Legge's `Miscellaneous` is blank in 28 records (expected, since 雜卦 pairs hexagrams, but the pairing is implicit). Wilhelm-Baynes `Extracts` is `string | null`.
- **[F]** **Wilhelm-Baynes line "exegesis" duplicates the scripture** (a/b format, `hexagram-text-english-wilhelm-baynes.ts:24-29`). Legge does not.
- **[F]** **There are OCR and typing artefacts.** Legge #2 imagery L3 reads "tinder restraint" (`hexagram-text-english-legge.ts:59`). Wilhelm-Baynes #1 L6 has a stray blank line, "means:\n\nArrogant" (`hexagram-text-english-wilhelm-baynes.ts:14`).
- **[F]/[I]** **The trigram "WenWang" order is questionable.**
  - The comment cites 說卦 帝出乎震… (震, 巽, 離, 坤, 兌, 乾, 坎, 艮), but the map gives 坎1 巽2 離3 乾4 兌5 艮6 坤7 震8 (`trigram.ts:5-15`).
  - That matches neither the 說卦 sequence nor the Lo Shu numbering. It looks wrong.
  - It is unused at runtime: the only `Order.WenWang` consumers read the hexagram order, and nothing reads the trigram order.
- **[F]** **There is no data-validation test.** `domain/core/tests/getters.test.ts` (32 lines) has three tests covering #1, #2 and moving-line folding. The structural invariants I checked in §1 are not locked in by any test.
- **[F]** Naming: `Exegesis.Judgment` here means 彖傳, while Wilhelm uses "Judgment" for 卦辭. That is a terminology trap for API consumers.

---

## 6. Proposed bounded context: Scripture Reference (a read-only catalogue)

**[I]** This is a proposal.

**Value objects**
- `Polarity` (yang | yin).
- `LineValue` (6 | 7 | 8 | 9).
- `LinePosition` (1..6).
- `HexagramKey` (`H[12]{6}`) and `TrigramKey`.
- `Permutation` (6 `LineValue`s; canonical string `"978876"`, bottom-first).
- `TransformationKey` (standing → emerging pair; in bijection with `Permutation`).
- `CorpusId` (`yijing`, `yilin`).
- `VariantId` (`zh-Hant`, `zh-Hans`, `en-legge`, `en-wilhelm-baynes`).
- `PassageRef` ({corpus, hexagramKey | transformationKey, kind: `judgment-卦辭` | `line-爻辭` | `use-用九六` | `tuan-彖` | `great-image-大象` | `small-image-小象` | `yilin-verse`, position?}).
- `Provenance` (edition, translator, licence, URL).

**Entities and aggregates (read-only)**
- `HexagramEntry`: identity, orders, trigrams, Unicode, and passages by variant.
- `TrigramEntry`.
- `YilinVerse`: keyed by `TransformationKey`.
- `Corpus`: variant list plus provenance.

**Domain services (pure)**
- `deriveTransformation(Permutation) → {standing, emerging, movingPositions}`. This belongs to the casting/oracle core, and it already exists in parts.
- `resolveApplicableReading(Permutation, policy = ZhuXi) → {case: 0..6, primary: PassageRef[], secondary: PassageRef[]}`. This is a *policy*, so other schools could be added later.

**Read port (driven, implemented by in-memory/JSON, IndexedDB or HTTP adapters)**
```ts
interface ScriptureCatalogue {
  hexagram(key: HexagramKey): HexagramEntry
  trigram(key: TrigramKey): TrigramEntry
  passage(ref: PassageRef, variant: VariantId): Passage | undefined
  yilin(t: TransformationKey, variant?: VariantId): YilinVerse | undefined
  corpora(): readonly Corpus[]
}
```

**Relation to the casting context**
- Casting is upstream. It produces a `Permutation` (the cast's six line values) and knows nothing about texts.
- The Reference context is a **Published Language / Open Host**. Casting, the REST API, the PWA and the persistence adapters consume `Permutation`, `HexagramKey` and `PassageRef` as a shared kernel of value objects.
- Consultations persist only the `Permutation` and casting; texts stay derived, as ADR-0008 already decides.
- The consultation-view IR becomes a downstream **conformist** that turns `resolveApplicableReading` output into presentation. It stops making its own `linesSection` decision.

**Rating: 3 out of 5.** The catalogue data is consistent, pure and complete for 卦辭, 爻辭 and 象 across four variants, and the key scheme maps cleanly to pair keys. Against that:
- The text-selection rule covers only 2 of the 7 Zhu Xi cases and lives in the presentation IR.
- 用九/用六 cannot be represented.
- The JSON is a dead, unchecked duplicate.
- The variant shapes are inconsistent.
- The public lookup surface is minimal.
- Provenance and licensing are absent, and the LICENSE holder is wrong.
