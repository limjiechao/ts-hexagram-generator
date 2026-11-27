# UML activity diagrams

Sources: CONTEXT.md (Casting vocabulary),
[ADR-0023](../adr/0023-random-division-equiprobable-remainder-groups.md),
[ADR-0026](../adr/0026-consultation-is-cast-or-recorded.md),
[ADR-0027](../adr/0027-cast-consultation-records-division-method.md),
[ADR-0046](../adr/0046-consultation-record-v2-and-markdown-store.md),
[ADR-0037](../adr/0037-application-layer-channels-and-journals.md).

## 1. Cast a Consultation

One Casting is eighteen Rounds: six Lines, bottom-up, three Rounds each. The
only branch that differs by Division Method is how a Round's Pick is obtained.

```mermaid
flowchart TD
  start((●)) --> query["Pose the Query"]
  query --> qok{"Query non-blank?"}
  qok -- no --> query
  qok -- yes --> method["Choose Division Method:<br/>Physical · Virtual · Automatic"]
  method --> round["Begin next Round<br/>(Line n, Round r; stalks = 49 or what remains)"]

  round --> how{"Division Method"}
  how -- Physical --> tr["Transcribe the Round:<br/>piles of four and Remainder, each heap"]
  tr --> chk{"Checks pass?<br/>complete · Remainders 1–4 ·<br/>conservation · Set-aside"}
  chk -- no --> tr
  chk -- yes --> pick
  how -- Virtual --> vd["Person divides on screen<br/>within the valid Picks"]
  vd --> pick
  how -- Automatic --> rg["Choose a Remainder Group, ¼ each"]
  rg --> rp["Choose a Pick uniformly within it"]
  rp --> pick

  pick["Apply the Pick:<br/>Hung Stalk, count by fours, Remainders, Set-aside"] --> more{"Third Round of the Line?"}
  more -- no --> round
  more -- yes --> line["Line Value = remaining stalks ÷ 4<br/>(6, 7, 8 or 9)"]
  line --> retract{"Physical: retract this Line<br/>before the next Line's first Pick?"}
  retract -- "yes (silent)" --> round
  retract -- no --> six{"Sixth Line?"}
  six -- no --> round
  six -- yes --> tf["Transformation determined"]

  tf --> keep["Keep the Consultation:<br/>Consultation Id · Divined At = now ·<br/>Query · Transformation · Casting · Division Method"]
  keep --> store[("Consultation Store<br/>(atomic write)")]
  store --> resolve["Resolve the Transformation<br/>and show the Readout"]
  resolve --> stop((◉))
```

Notes:

- A Pick is valid when it leaves at least one stalk in the left heap, and at
  least one countable stalk in the right heap after the Hung Stalk is taken.
  With N stalks, the valid Picks are 1 … N − 2.
- **Retract a Line** discards that Line's Picks and returns to its first
  Round. It is drawn only after a Line completes, but it is also available
  during an incomplete Line. Nothing about it is kept.
- A Casting is never rewound. A Pick, once applied and not retracted, stays.

## 2. Record a Consultation

```mermaid
flowchart TD
  start((●)) --> q["Enter the Query"]
  q --> d["Enter Divined At<br/>(date-time, or date only)"]
  d --> t["Enter the Transformation:<br/>six Line Values, bottom-up"]
  t --> ok{"Query non-blank,<br/>six values each 6–9?"}
  ok -- no --> q
  ok -- yes --> keep["Keep the Consultation:<br/>Consultation Id · Divined At · Query · Transformation<br/>(no Casting, no Division Method)"]
  keep --> store[("Consultation Store")]
  store --> stop((◉))
```

No Casting is ever invented for a Recorded Consultation: many Pick sequences
give the same Transformation.

## 3. Merge Journals

```mermaid
flowchart TD
  start((●)) --> exp["Export Journal A:<br/>its Consultations + its Deletion Records"]
  exp --> bundle[/"Bundle (version-2 records)"/]
  bundle --> imp["Merge the bundle into Journal B"]
  imp --> union["Union of Consultations by Consultation Id"]
  union --> minus["Drop every Consultation named in<br/>either side's Deletion Records"]
  minus --> dr["Union the Deletion Records"]
  dr --> storeB[("Journal B's Consultation Store")]
  storeB --> stop((◉))
```

Merging is symmetric and idempotent, and it has no conflicts: Consultations
are immutable and Consultation Ids are unique. A bundle contains private data
and must never be committed to the repository.
