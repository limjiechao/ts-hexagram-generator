# Data Flow Diagrams

Notation: rectangles are external entities, rounded boxes are processes, and
cylinders are data stores.

## Level 0: context diagram

```mermaid
flowchart LR
  OWN["Owner<br/>(Querent · Maintainer)"]
  GS["Google Sign-in"]
  WIT["Witness sources<br/>(ctext pages, Legge scan, Wilhelm–Baynes EPUB)"]
  LEG["Legacy .txt files"]

  SYS(("0<br/>Hexagram oracle"))

  OWN -- "Query, Division Method, Picks or Transcriptions,<br/>Recorded Transformations, Reading Preference" --> SYS
  SYS -- "Readouts, Applicable Passages with text,<br/>Journal listings, Typst/PDF, merge bundles" --> OWN
  OWN -- "merge bundles" --> SYS
  GS -- "ID token (owner only)" --> SYS
  WIT -- "transcribed Edition text (build time)" --> SYS
  LEG -- "legacy consultations" --> SYS
```

## Level 1

```mermaid
flowchart TB
  OWN["Owner"]
  GS["Google Sign-in"]
  WIT["Witness sources"]
  LEG["Legacy .txt files"]

  P1(["1 Perform a Casting<br/>(Oracle)"])
  P2(["2 Resolve Transformation<br/>(Oracle)"])
  P3(["3 Supply passage text<br/>(Scripture Catalogue)"])
  P4(["4 Keep / Browse / Open / Delete<br/>(Journal)"])
  P5(["5 Render Readout / Export<br/>(Presentation)"])
  P6(["6 Merge Journals"])
  P7(["7 Import legacy files<br/>(anti-corruption layer)"])
  P8(["8 Curate Editions<br/>(build time)"])
  P9(["9 Authenticate<br/>(REST and PWA only)"])

  D1[("D1 Consultations<br/>Markdown files · IndexedDB")]
  D2[("D2 Deletion Records")]
  D3[("D3 Hexagram table (64 rows)")]
  D4[("D4 Scripture Catalogue<br/>Works · Editions · passages")]
  D5[("D5 Legacy archive")]

  OWN -- "Picks / Transcriptions" --> P1
  P1 -- "Transformation, Casting" --> P4
  OWN -- "Query, Divined At, Transformation (Recorded)" --> P4
  P4 -- "version-2 records" --> D1
  D1 -- "version-2 records" --> P4
  P4 -- "Deletion Records" --> D2
  D2 -- "Deletion Records" --> P6
  P4 -- "Casting to replay" --> P1
  P4 -- "Transformation" --> P2
  OWN -- "Transformation (Explore)" --> P2
  D3 -- "Hexagram structure" --> P2
  P2 -- "Hexagrams, structure, Citations" --> P5
  P2 -- "Citations" --> P3
  D4 -- "Edition text" --> P3
  OWN -- "Reading Preference" --> P3
  P3 -- "labelled passages (Licence Gate applied)" --> P5
  P5 -- "Readout, Typst/PDF" --> OWN
  P5 -- "Markdown body" --> D1
  OWN -- "bundle" --> P6
  P6 -- "merged records" --> D1
  D1 -- "version-2 records" --> P6
  P6 -- "merged Deletion Records" --> D2
  P6 -- "bundle" --> OWN
  LEG -- ".txt" --> P7
  P7 -- "Cast or Recorded records" --> P4
  P7 -- "originals" --> D5
  WIT -- "transcriptions" --> P8
  P8 -- "Editions, Witnesses, licences" --> D4
  GS -- "ID token" --> P9
  P9 -- "owner admitted" --> P1
  P9 -- "owner admitted" --> P2
  P9 -- "owner admitted" --> P3
```

Notes:

- The Oracle (processes 1 and 2) reads only D3 and holds no other data.
  Everything it produces is a pure function of its input.
- The Markdown body (P5 → D1) is decorative. The Journal never reads it back
  (ADR-0046).
- Process 9 guards the REST engine (and therefore the PWA). The CLI does not
  authenticate. All channels are Private Channels (ADR-0032).
- Process 8 is the build-time curation of Editions from Witnesses. It is not a
  runtime use case.
