# UML sequence diagrams

Participants are named by their role in the hexagon (ADR-0037): driving
adapters, use cases, the pure Oracle, and driven ports with their adapters.

## 1. Virtual Cast in the CLI

```mermaid
sequenceDiagram
  autonumber
  actor Q as Querent
  participant V as CLI Viewer (driving adapter)
  participant UC as Cast a Consultation (use case)
  participant O as Oracle (pure)
  participant CL as Clock (port)
  participant S as Consultation Store: Markdown (port)
  participant P as Presentation: Markdown renderer
  participant K as Scripture Catalogue (port)

  Q->>V: Query
  V->>UC: begin(Query, Division Method = Virtual)
  UC->>O: empty Casting
  O-->>UC: Casting [], valid Picks 1–47
  loop 18 Rounds (6 Lines × 3, bottom-up)
    UC-->>V: Round state, valid Picks
    Q->>V: divides on screen (Pick)
    V->>UC: Pick
    UC->>O: apply Pick to Casting
    O-->>UC: next Casting (Remainders, Set-aside, and the Line Value when a Line completes)
  end
  O-->>UC: Transformation
  UC->>CL: now
  CL-->>UC: Divined At
  UC->>S: keep(version-2 record with new Consultation Id)
  S->>P: render body (decorative)
  P-->>S: Markdown body
  S-->>UC: kept (atomic write, date--Id.md)
  UC->>O: resolve(Transformation)
  O-->>UC: Hexagrams, structure, Applicable Passages (Citations)
  UC->>K: text(Citations, Reading Preference, channel)
  K-->>UC: passages labelled with Edition
  UC-->>V: Readout
```

## 2. Automatic Cast in the PWA, via the REST engine

The PWA bundles neither Oracle nor catalogue (ADR-0037). It draws Picks with
WebCrypto and submits each one to the engine.

```mermaid
sequenceDiagram
  autonumber
  actor Q as Querent
  participant W as PWA (driving adapter, API client)
  participant GS as Google Sign-in
  participant R as REST engine
  participant O as Oracle (pure)
  participant RS as Random Source: WebCrypto
  participant SW as Service worker cache
  participant S as Consultation Store: IndexedDB

  Q->>W: Query, Division Method = Automatic
  W->>GS: sign in (owner's account)
  GS-->>W: ID token
  W->>R: GET / (entry point)
  R-->>W: HAL links, incl. castings
  W->>R: follow castings link → empty Casting
  R->>O: empty Casting
  R-->>W: HAL: Round state, Remainder Groups, next-pick, divide
  loop 18 Rounds
    W->>RS: uniform integers
    RS-->>W: random values
    Note over W: choose a Remainder Group (¼ each),<br/>then a Pick uniformly within it
    W->>SW: GET next-pick expanded, e.g. /castings/L1/…/Ln/…-{pick}
    alt cached (immutable)
      SW-->>W: HAL
    else not cached
      SW->>R: same URL, with token
      R->>O: apply Pick
      O-->>R: next Casting
      R-->>SW: HAL, Cache-Control: private, immutable
      SW-->>W: HAL
    end
  end
  W->>R: follow transformation link → /transformations/978678
  R-->>W: Standing, Emerging, Moving Lines, links to passages
  W->>R: follow applicable-passage links → /works/zhouyi/passages/…
  R-->>W: text labelled with Edition
  W->>S: keep(version-2 record, Divined At = now, Division Method = Automatic)
  W-->>Q: Readout
```

## 3. Open a Consultation (CLI)

```mermaid
sequenceDiagram
  autonumber
  actor Q as Querent
  participant V as CLI (driving adapter)
  participant UC as Open a Consultation (use case)
  participant S as Consultation Store: Markdown
  participant O as Oracle (pure)
  participant K as Scripture Catalogue
  participant P as Presentation

  Q->>V: open Consultation Id
  V->>UC: open(Id)
  UC->>S: get(Id)
  S-->>UC: version-2 record (from frontmatter, body never read)
  opt Cast Consultation
    UC->>O: replay(Casting)
    O-->>UC: Transformation
    Note over UC: must equal the kept Transformation,<br/>otherwise the record is corrupt
  end
  UC->>O: resolve(Transformation)
  O-->>UC: Hexagrams, structure, Applicable Passages
  UC->>K: text(Citations, Reading Preference, channel)
  K-->>UC: labelled passages
  UC->>P: Readout
  P-->>Q: display
  Note over S: nothing is written: reading never writes
```

## 4. Merge Journals (CLI → PWA)

```mermaid
sequenceDiagram
  autonumber
  actor Q as Querent
  participant CLI as CLI
  participant SM as Consultation Store: Markdown
  participant B as Bundle file
  participant W as PWA
  participant SI as Consultation Store: IndexedDB

  Q->>CLI: export Journal
  CLI->>SM: list Consultations, list Deletion Records
  SM-->>CLI: records, Deletion Records
  CLI->>B: write bundle (version-2 records + Deletion Records)
  Q->>W: merge bundle into this Journal
  W->>B: read
  W->>SI: list Consultations, list Deletion Records
  Note over W: union by Consultation Id,<br/>minus Ids in either side's Deletion Records,<br/>union of Deletion Records
  W->>SI: add new Consultations, remove deleted, add Deletion Records
  W-->>Q: merged (counts added / removed)
```
