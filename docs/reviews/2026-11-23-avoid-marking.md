# M-003: marking the checkable _Avoid_ forms (ratified, R-242)

A drafter's proposal under R-241 for R-196's one-time glossary edit, ratified
by the owner as R-242. The draft only added backticks inside `_Avoid_:` lists;
with them removed, it was byte-identical to its parent. The ratification then
spelled out the shared nouns on lines 97 and 102 and rewrapped lines 347–348.
No `_Avoid_` line had backticks before; the three code spans already in the file
(lines 242, 243, 387) are untouched. `pnpm format:check` passes; oxfmt changes
nothing.

## The rule I applied

A form is marked when it can be matched as an R-197 token run (identifiers
split at camelCase, `_` and digit boundaries; strings split on non-letters;
lowercased; the last word may take an `s`) **without hitting correct domain
language**. In practice:

- Multi-word forms are marked unless a qualifier allows a legitimate use.
- A single word is marked only when it has no correct use in this app's code
  or UI: `permutation`, `gua`, `yao`, `overturned`, `inverted`, `rendition`,
  `DRM`, `exegesis`, `question`, `trash`, `rewind`, `undo`.
- A word that is itself a glossary term or part of one (casting, reading,
  figure, hexagram, scripture, reference, source, text) is never marked. The
  tree check below shows these hit `CastConsultation`, `ReadingPreference`,
  `ScriptureCatalogue`, `RandomSource` and the like.
- A qualifier the matcher cannot express ("(alone)", "(for the number)", "(as
  identity)", "(in UI text)") leaves the form unmarked. The exception is "(in
  English text)", because identifiers are English text (Q2 of the 2026-11-22
  drift-signals review). There the bare form is marked and the qualifier stays
  outside the backticks.
- Chinese forms are left unmarked. Each one carries a qualifier, and scripture
  strings may legitimately contain them.

## Per-line table

Key: **S** = a shared noun was written once; the owner spelled out each full
form on ratification (R-242).

| Line    | Marked                                                                   | Unmarked, with reason                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 41      | `coin casting`                                                           | generating, rolling: common verbs with legitimate general uses                                                                                                           |
| 47–48   | —                                                                        | change: common word, `onChange`; cast: qualifier "(as a noun)", noun and verb read alike, and it hits Cast Consultation; split: common word (string helpers)             |
| 54      | —                                                                        | split, part: common words; parting: the definition above uses it as plain prose                                                                                         |
| 60      | `split point`                                                            | index: common word; 9 hits today on loop indices                                                                                                                         |
| 64      | `suspended stalk`                                                        | —                                                                                                                                                                        |
| 78      | —                                                                        | suspended: qualified "(for the set-aside total)"; the bare word has other uses. The owner could add `suspended total`                                                    |
| 86–87   | `permutation`                                                            | casting, figure, hexagram: glossary terms; reading: part of Reading Preference                                                                                           |
| 92–93   | `gua`                                                                    | `using "hexagram" for the six Line Values …`: prose, not a term                                                                                                          |
| 97      | **S** `primary hexagram`, `original hexagram`, `present hexagram`        | —                                                                                                                                                                        |
| 102     | **S** `changed hexagram`, `relating hexagram`, `future hexagram`         | —                                                                                                                                                                        |
| 108     | —                                                                        | key, code: common words, qualified "(for the identity)"                                                                                                                  |
| 113     | —                                                                        | bit: common word, qualified; 0/1: not letters, so it yields no tokens                                                                                                    |
| 119     | `binary order`                                                           | Fuxi order: qualified "(for the number)", so it is legitimate for the order itself                                                                                       |
| 123     | `gua`                                                                    | hexagram: glossary term, qualified                                                                                                                                       |
| 127     | `inner trigram`, `bottom trigram`                                        | —                                                                                                                                                                        |
| 131     | `outer trigram`, `top trigram`                                           | —                                                                                                                                                                        |
| 137     | `inner hexagram`, `mutual hexagram`                                      | —                                                                                                                                                                        |
| 142     | `complementary hexagram`                                                 | opposite: common word; 旁通: Chinese, "(as the English term)"                                                                                                            |
| 148     | `overturned`, `inverted`                                                 | —                                                                                                                                                                        |
| 154     | `yao`                                                                    | —                                                                                                                                                                        |
| 180     | `changing line`, `old line`                                              | 變爻: Chinese, and the correct term for Changed Line                                                                                                                     |
| 186     | `transformed line`, `emerging line`, `changing line`                     | —                                                                                                                                                                        |
| 191     | `unchanging line`, `fixed line`                                          | —                                                                                                                                                                        |
| 200     | —                                                                        | interpretation: correct UI text may say the app gives none; reading: part of Reading Preference                                                                          |
| 204     | —                                                                        | judgment: a heading in Translation text; scripture: part of Scripture Catalogue (1 hit today)                                                                            |
| 223     | `primary line`                                                           | selection: common word; 主爻: Chinese, may appear in commentary text                                                                                                     |
| 229     | —                                                                        | reference: "(alone)" cannot be expressed, and it is part of Passage Reference                                                                                            |
| 238     | —                                                                        | book, text: common words, qualified; text hits `PassageText`                                                                                                             |
| 245     | `passage id`                                                             | reference: "(alone)"; key: common word                                                                                                                                   |
| 257     | `rendition`                                                              | version, variant: common words (package version, UI variant)                                                                                                             |
| 263     | —                                                                        | source, provenance: "(alone)" cannot be expressed; source hits `RandomSource`                                                                                            |
| 271     | —                                                                        | version: common word; rendering: React rendering                                                                                                                         |
| 280     | `permission check`, `DRM`                                                | —                                                                                                                                                                        |
| 286–287 | —                                                                        | internal: common word; authenticated: "(alone)"                                                                                                                          |
| 295     | —                                                                        | settings, options: common words, qualified "(for this concept)"                                                                                                          |
| 301     | `Wen Wang order`, `King Wen number`, `hexagram number`                   | —                                                                                                                                                                        |
| 307     | `exegesis`                                                               | explanation: common word                                                                                                                                                 |
| 313     | `Yilin passage`, `Yilin reading`                                         | —                                                                                                                                                                        |
| 322     | —                                                                        | entry, reading, session, study: common words                                                                                                                             |
| 329     | —                                                                        | file name, path, key, timestamp: qualified "(as identity)", and a store adapter legitimately has file names and paths                                                    |
| 339     | `manual consultation`, `imported consultation`, `playground save`        | —                                                                                                                                                                        |
| 347–348 | `question`, `search term` (rewrapped onto line 348)                      | filter: the Query entry itself names the history list's filter as a separate, legitimate concept (1 hit today)                                                           |
| 354     | `saved at`, `created at`                                                 | timestamp: common word                                                                                                                                                   |
| 363–364 | `input mode`, `flow kind`                                                | provenance: line 263 allows it in combination, so marking it here would contradict that; random, manual, interactive: qualified common words (`RandomSource` hits)      |
| 370     | —                                                                        | history: qualified, and the history list is legitimate; database: a store adapter may legitimately use it                                                                |
| 376     | `trash`                                                                  | tombstone: "(in UI text)", but signal 2 also scans identifiers                                                                                                           |
| 382     | —                                                                        | sync: common word (`*Sync` APIs); import: "(alone)"                                                                                                                      |
| 388     | `unreadable consultation`, `broken consultation`                         | —                                                                                                                                                                        |
| 397     | `manual pick`, `manual input`                                            | —                                                                                                                                                                        |
| 404     | `rewind`, `undo`                                                         | void: common word, and a TypeScript operator                                                                                                                             |
| 412     | —                                                                        | view, display, panel: common UI words                                                                                                                                    |
| 418     | —                                                                        | `using "viewer" loosely for any screen`: prose, not a term                                                                                                               |

## Counts

- 52 `_Avoid_` lines; 129 forms in all.
- **57 forms marked** (55 distinct: `gua` and `changing line` each appear
  twice), including the 4 shared-noun forms spelled out on ratification.
- **72 forms left unmarked**, 2 of them prose.
- The total agrees with the challenger's parse of 129 forms (41 checkable, 88
  skipped). The difference is in judgment, not in parsing.

## Points the owner decided (R-242)

1. **Shared nouns on lines 97 and 102:** spelled out in full and marked, so
   signal 2 now flags `relatingHexagram`.
2. **`search term`:** lines 347–348 rewrapped so the span sits on one line;
   the reader need not handle a line break inside a code span.
3. **`provenance` (lines 263 and 363) conflicts.** Line 263 forbids it only
   "(alone)"; line 363 forbids it outright. Marking it on 363 would flag every
   use, so both stay unmarked.
4. **Borderline single words**, marked: `question`, `undo`, `trash`,
   `inverted`. Unmarked: `interpretation`, `parting`, `database`,
   `tombstone`. Kept as drafted.

## Check against today's tree

I ran a throwaway script, since deleted, over each `overhaul/<pkg>` with
`scanTree` from `scripts/drift/scanner.ts`. It took declared identifiers from
`src/` and `tests/` and strings from `src/` (R-200, R-203), and used the R-197
matcher described above. I ran it against all 57 marked forms. A positive
control (`not implemented`) hit both an identifier and a string, so the script does read both kinds.

**Marked forms: 0 hits.** There are no real leaks and no false positives today.

For contrast, the single words left unmarked hit 21 times, every one a false
positive on correct language:

- `index`: 9 hits, in `oracle/src/complete-casting.ts` and its test.
- `cast`: `CastConsultation`, `keepCastConsultation`.
- `reading`: `ReadingPreference`, `defaultReadingPreference`.
- `text`: `PassageText`, `lookUpPassageTexts`, `passageTexts`.
- `figure`: `Figure`.
- `scripture`: `ScriptureCatalogue`.
- `random` and `source`: `RandomSource`.
- `filter`: `browse-consultations.ts:16`.
