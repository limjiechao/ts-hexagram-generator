# Product identity

Status: Accepted
Date: 2026-05-22

The product is named **易筮占** (Chinese) / **Yijing Yarrow Oracle** (English), with
the Chinese tagline **黑窗問易，受命終端**. The names are not decorative — they encode
the product's stance, so they're recorded here as a decision rather than left to a
splash-screen string.

**易筮占 traces the full arc of a consultation, in classical order:**

- **易** — the _Yijing_ itself (the bare, most-classical name for the Book of
  Changes), the text consulted.
- **筮** — divination _by yarrow stalks_ specifically (distinct from 卜 shell
  pyromancy and from 占 interpretation); the 大衍筮法 procedure the app implements.
- **占** — the _interpretation_ of the resulting hexagram.

So the name reads 易 (what you turn to) → 筮 (what you do) → 占 (what you arrive at).
The English name maps stage-by-stage, not literally: **Yijing** (the text) ·
**Yarrow** (the method — the botanical specificity is the credential that this is
the real procedure, not three-coin shortcut) · **Oracle** (the practice, as
Anglophone practitioners say "consult the oracle"). _Yijing_ (pinyin) over _I Ching_
(Wade-Giles) deliberately addresses practitioners and sidesteps the New Age freight.

**The load-bearing boundary: the app performs 筮; the user performs 占.** The app
casts and delivers the user to the moment of _receiving the response_ — and stops
there. Interpretation is the user's work. The tagline enacts this: 黑窗問易 ("in the
black window, consult the Yi") + 受命終端 ("receive the mandate, at the terminal") —
it ends at 受命 (reception), never claiming 占. Both phrases quote the _Xici_
divination stance (問 … 受命) and double-code for a technical reader (受命 also reads
"receive the command"; 終端 is the formal word for terminal).

This boundary is why the product can be honest: it names the engine it _is_ (筮) and
declines to claim the meaning-making it _isn't_ (占).

## Considered options

- **Name only the engine** (e.g. 易卦 / a hexagram-generator name). Rejected:
  truthful but incomplete — it ignores that consultation is an arc, and risks
  implying the app interprets.
- **Claim the whole act** (a name promising answers/interpretation). Rejected:
  dishonest — the app does not perform 占; the user does.
- **`I Ching` romanization.** Rejected: it mismatches the practitioner audience and
  carries counterculture/mysticism associations the product doesn't want.

## Consequences

- UI copy must respect the 筮/占 boundary: the app delivers the reading and the
  reception of it; it does not tell the user what it _means_.
- Naming and tagline are a fixed identity; new surfaces (banners, help text) should
  align to it, not coin competing names.

## Where it's enforced

- The Home banner / splash and CLI identity copy in `@hexagram/shell`.
- `CONTEXT.md` — the domain vocabulary that keeps "consultation", "reading", and the
  Viewer/Readout split consistent with this stance.

> Note: this ADR distils a longer etymological essay that previously lived as an
> untracked `MEMO.md`; the decision content is captured here.
