# Hexagram Generator

A monorepo for casting _I Ching_ hexagrams — by traditional yarrow-stalk
divination or random generation — and browsing past readings. This glossary
covers the whole single-context repo (`types`, `core`, `consultation`,
`viewer-core`, `casting-ui`, `history-ui`, `cli`).

## Language

**Consultation**:
A completed divination — a query, its casting, and the resulting hexagram(s) —
saved as one Markdown file under `consultations/`. The canonical user-facing
noun for a saved reading.
_Avoid_: entry (code-only — `HistoryEntry` is the type name, but UI text always
says "consultation"), reading, session.

**Unreadable file**:
A `.md` file in `consultations/` whose frontmatter envelope failed to parse or
load. Not a Consultation — it is a candidate that _failed_ to become one.
Counted and shown separately (`40 consultations · 2 unreadable`).
_Avoid_: unreadable consultation, broken consultation.

**Query**:
The divination _question_ — one per Consultation, persisted in the frontmatter
envelope, the thing the hexagram is cast to answer. Permanent and meaningful.
Distinct from the history list's **filter** (a transient UI search string that
narrows the list and carries no divination meaning).
_Avoid_: question (in code/UI labels — the canonical term is "query"), search
term, filter.

**Readout**:
The tabbed, scrollable _display_ of a single Consultation (Casting /
Transformation / Standing / Emerging tabs). A Readout only displays — it owns
no divination flow. `history-ui` shows a saved Consultation by rendering a
Readout directly.
_Avoid_: view, display, panel.

**Viewer**:
The casting orchestrator that owns the divination _flow_ state machine
(`awaitingQuery → casting → computing → done`) and produces a Consultation. A
Viewer drives a flow and renders a Readout to display it; a Readout has no
Viewer when there is no flow (e.g. browsing history).
_Avoid_: using "viewer" loosely for any screen — it names the casting
orchestrator specifically.

## Relationships

- A **Viewer** drives one divination flow and produces one **Consultation**.
- A **Readout** displays one **Consultation** (saved, or in progress under a
  Viewer).
- The History list browses many **Consultations** plus any **Unreadable
  files**; opening one shows it in a **Readout**.
- The screen frame shared by the Readout and the History list (title bar,
  scroll gutter, footer) is _not_ a Readout — it is a generic UI shell and
  carries no divination meaning.

## Example dialogue

> **Dev:** "When the history list opens a row, it shows a **Readout**. Is that
> the same component the casting flow uses?"
> **Domain expert:** "Same Readout, yes — but with no **Viewer** behind it.
> Casting runs a Viewer that drives the flow and feeds an in-progress Readout;
> history just loads a saved **Consultation** straight into a Readout. No flow."
>
> **Dev:** "And the `/` filter box — should it look like the Readout's query?"
> **Domain expert:** "No. The **Query** is the divination question, saved with
> the Consultation. The filter is a throwaway search string. Don't make them
> look alike — a user must never think the list is asking them for a question."

## Flagged ambiguities

- "entry" was used in UI text (`40 entries`) alongside "consultation" (`No
consultations yet.`) for the same concept — resolved: **Consultation** is the
  user-facing noun; "entry" is a code-only term and never appears in UI text.
- The history list's **filter** input was described as "the question you're
  filtering by," conflating it with a **Query** — resolved: they are distinct.
  A Query is the persisted divination question; the filter is a transient UI
  search string. They do not share a widget, a label, or the word "query."
- "New Consultation" / "Past Consultation" implied two _kinds_ of Consultation
  — resolved: there is one **Consultation** noun. Freshly cast and
  loaded-from-history is a property of the **Readout**'s provenance, not of the
  Consultation. Readout titles say `Consultation · interactive|random|loaded
<when>`; no New/Past adjective on the noun.
