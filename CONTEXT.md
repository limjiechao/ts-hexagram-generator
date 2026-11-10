# Hexagram Generator

An oracle for the _Yijing_: casting a Transformation by the yarrow-stalk
procedure (or recording one divined elsewhere), resolving what follows from
it, and keeping Consultations on record. The app casts; the user interprets
(ADR-0014).

## Context map

| Context                  | Kind       | Owns                                                                                                                              |
| ------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Oracle**               | Core       | Casting, Resolution, Transformation, Hexagram and its invariant structure, Applicable Passages (as references only)               |
| **Scripture Catalogue**  | Supporting | Corpora (Yijing 經, 十翼 Commentaries, Yilin), editions per script, translations, names, Received Sequence Number, text, licences |
| **Consultation Journal** | Supporting | Consultations (Cast or Recorded), Query, Divined At, Division Method                                                              |
| **Presentation**         | Generic    | Readouts in every medium; combines Oracle results with Catalogue text and decides nothing                                         |

- **Oracle → Scripture Catalogue**: the Oracle publishes Figures,
  Transformations and passage references; the Catalogue conforms to those
  identities. The Oracle never sees text.
- **Oracle → Consultation Journal**: the Journal keeps Picks and
  Transformations, and asks the Oracle to replay a Casting to check it yields
  the kept Transformation.
- **Legacy import → Consultation Journal**: an anti-corruption layer
  translating pre-overhaul files into Cast or Recorded Consultations.
- Transcription, Line Retraction, the Playground ("explore a Transformation"),
  Record a Consultation, and browsing Consultations are **use cases** across
  these contexts, not contexts of their own.

## Oracle

**Oracle**:
The core domain: **Casting** produces a Transformation, and **Resolution**
derives what follows from one, without interpreting it. The two are joined
only by the Transformation.

### Casting

**Casting** (大衍筮法):
The yarrow-stalk procedure of the Great Expansion that yields exactly one
Transformation. Yarrow is the only casting method.
_Avoid_: coin casting, generating, rolling.

**Round** (變):
One pass of the four operations (四營: 分二、掛一、揲四、歸奇). Three Rounds
make a Line (三變成爻); eighteen make a Transformation (十有八變而成卦). A
Casting is fully determined by the Picks of its eighteen Rounds.
_Avoid_: change (collides with Changed Line), cast (as a noun for a Round),
split.

**Division** (分而為二):
The one free act of a Round: parting the stalks into a left heap and a right
heap. A valid Division leaves at least one countable stalk in the right heap
once the Hung Stalk is taken from it.
_Avoid_: split, part, parting.

**Pick**:
The number that records a Division: the count of stalks in the left heap. The
only freely chosen value in a Round; everything else in the Round follows
from it.
_Avoid_: index, split point.

**Hung Stalk** (掛一):
The single stalk taken from the right heap and hung between the fingers.
_Avoid_: suspended stalk.

**Remainder** (奇):
What is left of a heap after counting it off in fours (揲四); always 1 to 4,
never 0.

**Remainder Group**:
The valid Picks of a Round that leave the same left Remainder. When the
machine divides, it chooses a Remainder Group with probability ¼ each, then a
Pick within it — as a hand that cannot steer its split would (ADR-0023).

**Set-aside** (歸奇於扐):
The Hung Stalk together with both Remainders of a Round: 5 or 9 in the first
Round of a Line, 4 or 8 in the second and third.
_Avoid_: suspended (for the set-aside total).

### Transformation and Hexagrams

**Transformation** (卦變, written "X之Y", e.g. 乾之坤):
One of the 4,096 outcomes of a divination: a Standing Hexagram together with
its Moving Lines, which together fix the Emerging Hexagram. A result with no
Moving Lines is still a Transformation — the identity X之X.
_Avoid_: permutation, casting, reading, figure, hexagram (for the 4,096-valued
thing).

**Hexagram** (卦):
One of the 64 six-line figures of yin and yang lines. Standing and emerging
are always Hexagrams.
_Avoid_: using "hexagram" for the six Line Values (6/7/8/9), which name a
Transformation; gua (in English text).

**Standing Hexagram** (本卦):
The Hexagram a Transformation starts from.
_Avoid_: primary, original, present hexagram.

**Emerging Hexagram** (之卦):
The Hexagram a Transformation arrives at; equal to the Standing Hexagram when
no line moves.
_Avoid_: changed, relating, future hexagram.

**Figure**:
The six yin/yang polarities of a Hexagram, read bottom-up from the first Line
Position. A Hexagram's only identity; names and sequence numbers are attached
to it, never the other way round.
_Avoid_: key, code (for the identity).

**Fuxi Sequence Number** (伏羲六十四卦次序):
A Hexagram's place 1–64 in the order transmitted by 邵雍: its Figure read as a
binary number (yin = 1, the first Line Position the highest bit), plus one.
乾 is 1, 坤 is 64. The same for every text tradition.
_Avoid_: Fuxi order (for the number), binary order.

**Trigram** (經卦 / 八卦):
One of the eight three-line figures: 乾 兌 離 震 巽 坎 艮 坤.
_Avoid_: hexagram (for a three-line figure), gua (in English text).

**Lower Trigram** (內卦 / 下卦):
The Trigram formed by Line Positions 1–3 of a Hexagram.
_Avoid_: inner trigram (in English text), bottom trigram.

**Upper Trigram** (外卦 / 上卦):
The Trigram formed by Line Positions 4–6 of a Hexagram.
_Avoid_: outer trigram (in English text), top trigram.

**Nuclear Hexagram** (互卦):
The Hexagram whose Lower Trigram is Line Positions 2–4 and whose Upper Trigram
is Line Positions 3–5 of a given Hexagram. Structure only; what it signifies
is left to the user.
_Avoid_: inner hexagram, mutual hexagram.

**Inverse Hexagram** (錯卦):
The Hexagram obtained by flipping the polarity of every Line of a given
Hexagram. Structure only.
_Avoid_: opposite, complementary hexagram, 旁通 (as the English term).

**Reversed Hexagram** (綜卦):
The Hexagram obtained by turning a given Hexagram upside down (Position _k_
becomes Position 7 − _k_). For the eight Hexagrams that read the same upside
down, it is the Hexagram itself. Structure only.
_Avoid_: overturned, inverted (collides with Inverse Hexagram).

### Lines

**Line** (爻):
One of the six places of a Transformation or Hexagram.
_Avoid_: yao (in English text).

**Line Position**:
The place of a Line, counted bottom-up from 1 to 6 (初, 二, 三, 四, 五, 上).
Position 1 is always the bottom line, whatever order a medium displays them
in. Traditional names such as 初九 and 上六 are derived from position and
value, not a separate concept.

**Line Value**:
One of four values a Line takes in a Transformation: **Old Yin 6** (老陰),
**Young Yang 7** (少陽), **Young Yin 8** (少陰), **Old Yang 9** (老陽).

**Moving Line** (動爻):
A Line of the Standing Hexagram whose value is Old (6 or 9), and which
therefore flips polarity in the Emerging Hexagram. It is called _moving_
because it is the line that moves: the source of change in the matter. The
line it becomes is the Changed Line (動為始，變為終). The terms are borrowed
at their plain dictionary meaning only:

> 1. 動爻（本爻）
>    - 定義：指在搖卦時發生陰陽變化的那個爻（陽變陰、陰變陽）。
>    - 代表事態的「變數」和主動發起變化的根源（內因）。
> 2. 變爻
>    - 定義：由動爻變動之後產生的新爻（位於變卦中相應的位置）。
>    - 代表事情發展的結果、去向或時間節點（動為始，變為終）。

_Avoid_: changing line, old line, 變爻 (for the moving line itself).

**Changed Line** (變爻):
The Line at the same Position in the Emerging Hexagram that a Moving Line
becomes; always Young (6 becomes 7, 9 becomes 8). It stands for the outcome of
the change.
_Avoid_: transformed line, emerging line, changing line.

**Static Line** (靜爻):
A Line whose value is Young (7 or 8); it keeps its polarity in the Emerging
Hexagram.
_Avoid_: unchanging line, fixed line.

### Resolution and passages

**Resolution**:
Deriving, from any Transformation, its Standing and Emerging Hexagrams, its
Moving Lines, the Applicable Passages, and for each Hexagram its Lower and
Upper Trigrams and its Nuclear, Inverse and Reversed Hexagrams. It does not
care whether the Transformation was cast or chosen.
_Avoid_: interpretation, reading.

**Hexagram Statement** (卦辭):
The 經 statement attached to a Hexagram.
_Avoid_: judgment, scripture (too broad).

**Line Statement** (爻辭):
The 經 statement attached to one Line Position of a Hexagram.

**All-Moving Statement** (用九 / 用六):
The additional 經 statement that only 乾 and 坤 carry, for when all six of
their lines move.

**Applicable Passages**:
The 經 passages that bear on a Transformation, all of equal standing: for
X之X, the Standing Hexagram's Hexagram Statement; otherwise the Standing
Hexagram's Hexagram Statement, the Line Statement of every Moving Line (in the
Standing Hexagram), and the Emerging Hexagram's Hexagram Statement; plus the
All-Moving Statement when all six lines of 乾 or 坤 move. No line is ignored
and none is ranked above another — the oracle has 4,096 outcomes, not 384. A
Changed Line's Line Statement is not applicable: it speaks of the Emerging
Hexagram's own transformation onward (姤 初六 belongs to 姤之乾, not to
乾之姤).
_Avoid_: selection, primary line, 主爻 (no ranking exists).

## Scripture Catalogue

**Work**:
A scripture as an abstract text, independent of any Edition: the 周易 經,
each part of the 十翼 (彖傳, 大象, 小象, 文言, …), the 焦氏易林. Each Work has
its own Citation scheme. A Translation is an Edition of the Work it
translates, even when several Works are printed in one book.
_Avoid_: book, text (for the abstract work).

**Citation**:
The Edition-independent name of a passage within a Work, built on Oracle
identities — e.g. 周易 `111111.3` (Line Statement 3 of 乾), 焦氏易林
`111111.000000` (the verse for 乾之坤). Every Edition of the Work is aligned
to the same Citations.
_Avoid_: passage id, reference (alone), key.

**Edition**:
A published text of a work, in one script — e.g. the 武英殿十三經注疏本
《周易正義》 (1739), the base Traditional edition of the Yijing. The app never mechanically converts
text from one script to another; text in each script is taken as found in a
Witness. When the Edition behind a Witness cannot be identified, the text is
kept and labelled **unidentified**, never presented as a known Edition.
_Avoid_: version, rendition, variant.

**Witness**:
The concrete source an Edition's text was transcribed from — e.g. a set of
ctext.org pages, with when they were retrieved. Every passage text names its
Edition and its Witness.
_Avoid_: source (alone), provenance (alone).

**Translation**:
An Edition of a work in another language, aligned passage by passage to the
Yijing's passages — currently Legge (_Sacred Books of the East_ vol. 16,
1882; Witness: a scanned copy) and Wilhelm–Baynes (Princeton; Witness: an
EPUB). A Translation that lacks a passage shows nothing for it; another
Translation is never substituted.
_Avoid_: version, rendering.

**Licence Gate**:
The rule that an Edition's text is shown only on the channels its licence
permits — decided per Edition, never per request. Legge (public domain): every
channel. Wilhelm–Baynes (in copyright) and the ctext-sourced Chinese:
Private Channels only. Every channel today is a Private Channel, so nothing
is gated in practice; a public channel would omit gated text and never
substitute other text for it.
_Avoid_: permission check, DRM.

**Private Channel**:
A channel only the owner can reach: the local CLI, or the PWA and REST API
behind sign-in restricted to the owner's own account. Every Edition may be
shown on a Private Channel. All channels are private.
_Avoid_: internal, authenticated (alone — authentication for anyone but the
owner would not make a channel private).

**Reading Preference**:
What the person viewing wants shown with a resolution: Chinese script
(Traditional by default), Translations in order (Legge by default),
Commentaries (大象 and 小象 by default), and the Yilin Verse (off by default).
It belongs to the viewer, never to a Consultation: the same Consultation can
be read in any script or Translation. The Licence Gate applies after it.
_Avoid_: settings, options (for this concept).

**Received Sequence Number** (文王卦序):
A Hexagram's place 1–64 in the received text's order (乾 1, 坤 2, 屯 3, …).
It follows no rule and depends on the text tradition: the Mawangdui
manuscript orders the Hexagrams differently.
_Avoid_: Wen Wang order, King Wen number, hexagram number.

**Commentary** (傳):
A passage from the 十翼 (彖傳, 大象, 小象, 文言, …) attached to a 經
passage. Commentaries accompany Applicable Passages; they are never
Applicable Passages themselves.
_Avoid_: exegesis, explanation.

**Yilin Verse** (林辭):
A verse of the 焦氏易林 for one Transformation (4,096 in all, X之X
included). A parallel corpus outside the Oracle, consulted only as a
reference — chiefly to mine imagery — and never an Applicable Passage.
_Avoid_: Yilin passage, Yilin reading.

## Consultation Journal

**Consultation**:
A divination kept on record: a Query, the moment it was divined, and its
Transformation — plus its Casting when one exists, which must yield exactly
that Transformation. Everything else (Hexagrams, Applicable Passages) is
derived, never kept. Every Consultation is either Cast or Recorded.
_Avoid_: entry, reading, session, study.

**Consultation Id**:
The opaque identifier a Consultation receives once, when first kept, and
keeps for ever — the same in every store. It carries no meaning; Consultations
are ordered by Divined At, never by Id. A kept Consultation is never edited,
only removed.
_Avoid_: file name, path, key, timestamp (as identity).

**Cast Consultation**:
A Consultation divined in the app; it carries its Casting, from which its
Transformation follows.

**Recorded Consultation**:
A Consultation divined elsewhere (physical stalks, an old notebook) and
entered afterwards from its Transformation. It has no Casting, and none is
ever invented for it: many Pick sequences give the same Transformation.
_Avoid_: manual consultation, imported consultation, playground save.

**Query**:
The divination _question_ — exactly one per Consultation, required and
non-blank, kept exactly as the user wrote it (it may span several lines). It
belongs to the Consultation, not the Oracle: Casting and Resolution never see
it. Distinct from the history list's **filter** (a transient UI search string
that narrows the list and carries no divination meaning).
_Avoid_: question (in code/UI labels — the canonical term is "query"), search
term, filter.

**Divined At**:
The moment a Consultation's divination took place — for a Recorded
Consultation, as entered by the user, possibly to the day only. Not the
moment it was saved.
_Avoid_: timestamp, saved at, created at.

**Division Method**:
How the Divisions of a Cast Consultation were made — **Physical** (a person
divided real yarrow stalks, entered by Transcription), **Virtual** (a person
divided virtual stalks on screen) or **Automatic** (the machine divided). All
three follow the same yarrow procedure, and every honest Division is
uncontrolled; the method records only who divided what. A Recorded
Consultation has none.
_Avoid_: provenance, input mode, flow kind, random (for Automatic), manual
(for Physical), interactive (for Virtual).

**Journal**:
The Consultations kept in one Consultation Store, together with its Deletion
Records. The owner may have several Journals (one per device or store);
Merging Journals unites them.
_Avoid_: history (for the record itself), database.

**Deletion Record**:
The record that a Consultation Id was deleted, kept so that Merging Journals
does not bring the Consultation back. A deleted Consultation's content is
gone; only its Id and when it was deleted remain.
_Avoid_: tombstone (in UI text), trash.

**Merging Journals**:
Uniting two Journals: the union of their Consultations by Consultation Id,
minus every Consultation named in either Journal's Deletion Records. Because
Consultations are immutable and Ids unique, a merge has no conflicts.
_Avoid_: sync (no server is involved), import (alone).

**Unreadable file**:
A stored record that failed to load as a Consultation. Not a Consultation —
it is a candidate that _failed_ to become one. Counted and shown separately
(`40 consultations · 2 unreadable`).
_Avoid_: unreadable consultation, broken consultation.

## Use cases

**Transcription**:
Entering the observed counts of a physical Round — piles of four and
Remainder for each heap — which become a Pick only once they pass the
conservation and Set-aside checks. A Transcription can be edited freely until
committed.
_Avoid_: manual pick, manual input.

**Line Retraction**:
Silently discarding the Picks of the incomplete Line, or of the just-completed
Line before the next Line's first Pick, so the Rounds can be transcribed or
divided again after a mistake. Offered only for Physical Division; it leaves
no trace in the Casting. A Casting itself is never rewound.
_Avoid_: rewind, undo, void.

## Presentation

**Readout**:
The display of a single Consultation (or of a Transformation being explored):
its Casting, Transformation, Hexagrams and Applicable Passages with their
text. A Readout only displays — it owns no divination flow.
_Avoid_: view, display, panel.

**Viewer**:
The terminal component that runs the casting use case and shows its progress
in a Readout. A Readout has no Viewer when there is no flow (e.g. browsing
Consultations).
_Avoid_: using "viewer" loosely for any screen.

## Relationships

- A **Casting** yields exactly one **Transformation**; a **Transformation**
  fixes its **Standing** and **Emerging Hexagrams** and its **Moving Lines**.
- **Resolution** of a **Transformation** gives its **Applicable Passages** (as
  references); the **Scripture Catalogue** supplies their text and any
  **Commentary**.
- A **Consultation** holds one **Query** and one **Transformation**; a **Cast
  Consultation** also holds its **Casting** and **Division Method**.
- A **Readout** displays one **Consultation**; browsing lists many
  **Consultations** plus any **Unreadable files**.

## Example dialogue

> **Dev:** "Someone has three lines moving in 乾之否. Which line text do we
> show first?"
> **Domain expert:** "All three **Line Statements**, plus both **Hexagram
> Statements** — with equal standing. There is no primary line. Order them
> bottom-up if you must order them, but order carries no rank."
>
> **Dev:** "And the 姤 初六 text, since line 1 changed?"
> **Domain expert:** "No. That's the **Changed Line**'s statement — it speaks
> of 姤 moving on, not of 乾 becoming 姤."
>
> **Dev:** "A user wants to save last week's stalk divination from their
> notebook. Do we fake the Picks?"
> **Domain expert:** "Never. It's a **Recorded Consultation**: the **Query**,
> when it was **Divined At**, and its **Transformation**. No **Casting**."

## Flagged ambiguities

- "Hexagram" named both the 64 yin/yang figures and the 4,096-valued tuple of
  six line values (6/7/8/9) — resolved: **Hexagram** is the 64 figures only;
  the 4,096-valued thing is a **Transformation**.
- "Moving", "changing" and "old" line were used interchangeably, and 變爻 was
  glossed as the moving line — resolved: **Moving Line** is 動爻, the line in
  the Standing Hexagram; 變爻 is the distinct line it becomes in the Emerging
  Hexagram. "Old" names only the Line Values 6 and 9.
- Pick, split, part, cast, round, division and change all named the same act —
  resolved: a **Round** (變) contains one **Division**, recorded as a **Pick**.
  "Suspended" named both the Hung Stalk and the whole Set-aside — resolved:
  **Hung Stalk** (掛一) and **Set-aside** (歸奇) are distinct.
- Zhu Xi's 考變占 ranks one passage as primary and, with four or five Moving
  Lines, reads the Static Lines instead — rejected: **Applicable Passages**
  include every Moving Line's Line Statement with equal standing, and never
  substitute Static Lines.
- "interactive / random / manual" described how a Casting was made, naming UI
  widgets — resolved: **Division Method** is Physical, Virtual or Automatic.
- "entry" was used in UI text alongside "consultation" for the same concept —
  resolved: **Consultation** is the user-facing noun; "entry" never appears in
  UI text.
- The history list's **filter** was described as "the question you're
  filtering by", conflating it with a **Query** — resolved: they are distinct
  and share no widget, label, or the word "query".
- "New Consultation" / "Past Consultation" implied two kinds of Consultation —
  resolved: the kinds are **Cast** and **Recorded**; freshly divined versus
  loaded is a property of the **Readout**, not of the Consultation.
