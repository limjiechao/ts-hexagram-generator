#set document(title: "Consultations, 2026-11-12", date: none)
#set page(paper: "a4", margin: 2cm, numbering: "1")
#set text(
  font: ("Libertinus Serif", "Noto Serif CJK TC", "Noto Sans Symbols 2"),
  size: 10pt,
  lang: "en",
)
#set heading(numbering: none)
#show heading.where(level: 1): set text(size: 14pt)
#show heading.where(level: 2): set text(size: 12pt)
#show heading.where(level: 3): set text(size: 10.5pt)

// The template. Every text from a Consultation or the Catalogue reaches it
// as a string, so nothing in one is read as markup.

#let zh(body) = text(lang: "zh", region: "tw", body)
#let in-lines(body) = body.split("\n").join(linebreak())
#let line-names = ("初", "二", "三", "四", "五", "上")
#let ordinals = ("1st", "2nd", "3rd", "4th", "5th", "6th")

// One Edition's text, under its short name: (short name, text, Chinese).
#let edition-text(item) = {
  let (short-name, body, chinese) = item
  block(breakable: true, below: 1em)[
    #strong(short-name) \
    #if chinese { zh(body) } else { body }
  ]
}

// A Hexagram's number and its name in each Edition shown.
#let named(number, names) = {
  let shown = names.map(((short-name, body, chinese)) => if chinese { zh(body) } else { body })
  "#" + str(number) + " " + shown.join(" / ")
}

// A Line drawn: one bar for a yang Line, two for a yin Line.
#let bar(value) = {
  let full = box(width: 3.6em, height: 0.55em, fill: black)
  let half = box(width: 1.5em, height: 0.55em, fill: black)
  if calc.odd(value) { full } else { half + h(0.6em) + half }
}

// A Moving Line is marked with text as well as drawn: ○ for 9, ✕ for 6.
#let mark(value, change) = {
  if change != "moving" { "" } else if value == 9 { "○" } else { "✕" }
}

#let position(at) = zh(line-names.at(at - 1)) + ", " + ordinals.at(at - 1)

// A Figure's rows, Line 6 at the top: Line Value, bar, mark, position.
#let figure-rows(lines) = {
  let rows = range(6, 0, step: -1).map(at => {
    let (value, change) = lines.at(at - 1)
    (str(value), bar(value), mark(value, change), position(at))
  })
  rows.flatten()
}

#let figure-grid(lines) = block(breakable: false, grid(
  columns: 4,
  column-gutter: 0.8em,
  row-gutter: 0.5em,
  align: horizon,
  ..figure-rows(lines),
))

// A Trigram's name and imagery in each Edition shown.
#let trigram-names(trigrams) = {
  let shown = trigrams.map(((short-name, name, imagery, chinese)) => if chinese {
    zh(name + " " + imagery)
  } else {
    name + ", " + imagery
  })
  shown.join("; ")
}

#let query(body, divined-at) = [
  = Query
  #in-lines(body)

  #divined-at
]

#let ledger-row((line, round, stalks, left-heap, left-fours, left-remainder, right-heap, right-fours, right-remainder, set-aside, fours, value)) = (
  if round == 3 { zh(line-names.at(line - 1)) + str(line) } else { [] },
  str(round), str(stalks),
  str(left-heap), str(left-fours), str(left-remainder),
  str(right-heap), str(right-fours), "1", str(right-remainder),
  str(set-aside),
  if value == none { str(fours) } else { "⇒ " + str(value) },
)

// A ledger heading: the Chinese term above the English one.
#let both(chinese, english) = zh(chinese) + linebreak() + english

#let casting(division-method, rounds) = [
  = Casting
  Division Method: #division-method

  #set text(size: 9pt)
  #table(
    columns: 12,
    align: right,
    stroke: none,
    table.header(
      [], [], [],
      table.cell(colspan: 3, align: center, zh("左") + " Left"),
      table.cell(colspan: 4, align: center, zh("右") + " Right"),
      [], [],
      both("爻", "Line"), both("變", "Round"), both("蓍", "Stalks"),
      both("左", "Heap"), both("揲", "Fours"), both("扐", "Remainder"),
      both("右", "Heap"), both("揲", "Fours"), both("掛", "Hung Stalk"),
      both("扐", "Remainder"), both("歸奇", "Set-aside"), both("營", "Tally"),
      table.hline(),
    ),
    ..rounds.map(ledger-row).flatten(),
  )
]

#let no-casting() = [
  = Casting
  _A Recorded Consultation has no Casting._
]

#let figure-summary(figure) = [
  #named(figure.number, figure.names) \
  Upper: #trigram-names(figure.upper) \
  Lower: #trigram-names(figure.lower)
]

// The Standing and Emerging Hexagrams side by side, an arrow from each
// Moving Line to the Changed Line it becomes.
#let transformation-row(standing, emerging, at) = {
  let (value, change) = standing.lines.at(at - 1)
  let (emerging-value, _) = emerging.lines.at(at - 1)
  (
    str(value), bar(value), mark(value, change), position(at),
    if change == "moving" { "→" } else { "" },
    str(emerging-value), bar(emerging-value), position(at),
  )
}

#let transformation(standing, emerging) = [
  = Transformation
  #grid(
    columns: 8,
    column-gutter: 0.8em,
    row-gutter: 0.5em,
    align: horizon,
    ..range(6, 0, step: -1).map(at => transformation-row(standing, emerging, at)).flatten(),
  )
  #grid(
    columns: 2,
    column-gutter: 2em,
    [*Standing Hexagram* \ #figure-summary(standing)],
    [*Emerging Hexagram* \ #figure-summary(emerging)],
  )
]

#let hexagram-tab(heading-text, figure, nuclear: none, inverse: none, reversed: none, passages: ()) = [
  = #heading-text #figure.number
  #figure-grid(figure.lines)

  Line Values, the bottom first: #figure.lines.map(((value, change)) => str(value)).join(", ")

  Upper Trigram: #trigram-names(figure.upper) \
  Lower Trigram: #trigram-names(figure.lower)

  == Name
  #for item in figure.names { edition-text(item) }

  == Structure
  - #zh("互卦") Nuclear Hexagram: #named(..nuclear)
  - #zh("錯卦") Inverse Hexagram: #named(..inverse)
  - #zh("綜卦") Reversed Hexagram: #named(..reversed)

  #for (label, texts, commentaries) in passages [
    == #zh(label)
    #for item in texts { edition-text(item) }
    #for (commentary-label, commentary-texts) in commentaries [
      === #zh(commentary-label)
      #for item in commentary-texts { edition-text(item) }
    ]
  ]
]

#let yilin-verse(texts) = [
  = Yilin Verse
  #for item in texts { edition-text(item) }
]

// Each Edition shown, with its Witness.
#let editions(shown) = [
  = Editions and Witnesses
  #for (short-name, title, witness, unidentified) in shown [
    #block(breakable: true, below: 1em)[
      #strong(short-name) \
      #title \
      Witness: #witness
      #if unidentified [ \ _An unidentified Edition._ ]
    ]
  ]
]

#query("How will Steward Aelric’s journey to Westmill unfold: by the \"#2 road\" or the ford\\ferry at $3 a crossing?", "2026-11-12 23:59")

#casting("Physical", (
  (6, 3, 40, 3, 0, 3, 37, 8, 4, 8, 8, 8),
  (6, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (6, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (5, 3, 36, 3, 0, 3, 33, 7, 4, 8, 7, 7),
  (5, 2, 44, 3, 0, 3, 41, 9, 4, 8, 9, none),
  (5, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (4, 3, 40, 3, 0, 3, 37, 8, 4, 8, 8, 8),
  (4, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (4, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (3, 3, 36, 3, 0, 3, 33, 7, 4, 8, 7, 7),
  (3, 2, 44, 3, 0, 3, 41, 9, 4, 8, 9, none),
  (3, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (2, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (2, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (2, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (1, 3, 32, 3, 0, 3, 29, 6, 4, 8, 6, 6),
  (1, 2, 40, 3, 0, 3, 37, 8, 4, 8, 8, none),
  (1, 1, 49, 4, 0, 4, 45, 10, 4, 9, 10, none),
))

#transformation(
  (
    number: 48,
    names: (
      ("Invented Chinese", "井", true),
      ("Legge", "XLVIII. The Žing Hexagram", false),
    ),
    lines: ((6, "moving"), (9, "moving"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
    upper: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
    lower: (
      ("Invented Chinese", "巽", "風", true),
      ("Legge", "sun", "The wind, wood", false),
    ),
  ),
  (
    number: 63,
    names: (
      ("Invented Chinese", "既濟", true),
      ("Legge", "LXIII. The Kî Žî Hexagram", false),
    ),
    lines: ((7, "changed"), (8, "changed"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
    upper: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
    lower: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
  ),
)

#hexagram-tab(
  "Standing Hexagram",
  (
    number: 48,
    names: (
      ("Invented Chinese", "井", true),
      ("Legge", "XLVIII. The Žing Hexagram", false),
    ),
    lines: ((6, "moving"), (9, "moving"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
    upper: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
    lower: (
      ("Invented Chinese", "巽", "風", true),
      ("Legge", "sun", "The wind, wood", false),
    ),
  ),
  nuclear: (38, (
    ("Invented Chinese", "睽", true),
    ("Legge", "XXXVIII. The Khwei Hexagram", false),
  )),
  inverse: (21, (
    ("Invented Chinese", "噬嗑", true),
    ("Legge", "XXI. The Shih Ho Hexagram", false),
  )),
  reversed: (47, (
    ("Invented Chinese", "困", true),
    ("Legge", "XLVII. The Khwăn Hexagram", false),
  )),
  passages: (
    (
      "卦辭",
      (
        ("Invented Chinese", "擬文（zhouyi 011010）。", true),
        ("Legge", "(Looking at) Žing, (we think of) how (the site of) a town may be changed, while (the fashion of) its wells undergoes no change. (The water of a well) never disappears and never receives (any great) increase, and those who come and those who go can draw and enjoy the benefit. If (the drawing) have nearly been accomplished, but, before the rope has quite reached the water, the bucket is broken, this is evil.", false),
        ("Invented English", "Invented English filler for zhouyi 011010.", false),
      ),
      (
        ("大象", (
          ("Invented Chinese", "擬文（daxiang 011010）。", true),
          ("Legge", "XLVIII. (The trigram representing) wood and above it that for water form Žing. The superior man, in accordance with this, comforts the people, and. stimulates them to mutual helpfulness.", false),
        )),
      ),
    ),
    (
      "初六",
      (
        ("Invented Chinese", "擬文（zhouyi 011010.1）。", true),
        ("Legge", "1. The first SIX, divided, shows a well so muddy that men will not drink of it; or an old well to which neither birds (nor other creatures) resort.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 011010.1）。", true),
          ("Legge", "1. 'A well so muddy that men will not drink of it:'--this is indicated by the low position (of the line).'An old well to which the birds do not come:'--it has been forsaken in the course of time.", false),
        )),
      ),
    ),
    (
      "九二",
      (
        ("Invented Chinese", "擬文（zhouyi 011010.2）。", true),
        ("Legge", "2. The second NINE, undivided, shows a well from which by a hole the water escapes and flows away to the shrimps (and such small creatures among the grass), or one the water of which leaks away from a broken basket.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 011010.2）。", true),
          ("Legge", "2. 'A well from which by a hole the water escapes, and flows away to the shrimps:'--(the subject of this second line has) none co-operating with him (above).", false),
        )),
      ),
    ),
  ),
)

#hexagram-tab(
  "Emerging Hexagram",
  (
    number: 63,
    names: (
      ("Invented Chinese", "既濟", true),
      ("Legge", "LXIII. The Kî Žî Hexagram", false),
    ),
    lines: ((7, "changed"), (8, "changed"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
    upper: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
    lower: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
  ),
  nuclear: (64, (
    ("Invented Chinese", "未濟", true),
    ("Legge", "LXIV. The Wei Žî Hexagram", false),
  )),
  inverse: (64, (
    ("Invented Chinese", "未濟", true),
    ("Legge", "LXIV. The Wei Žî Hexagram", false),
  )),
  reversed: (64, (
    ("Invented Chinese", "未濟", true),
    ("Legge", "LXIV. The Wei Žî Hexagram", false),
  )),
  passages: (
    (
      "卦辭",
      (
        ("Invented Chinese", "擬文（zhouyi 101010）。", true),
        ("Legge", "Kî Žî intimates progress and success in small matters. There will be advantage in being firm and correct. There has been good fortune in the beginning; there may be disorder in the end.", false),
        ("Invented English", "Invented English filler for zhouyi 101010.", false),
      ),
      (
        ("大象", (
          ("Invented Chinese", "擬文（daxiang 101010）。", true),
          ("Legge", "LXIII. (The trigram representing) fire and that for water above it form Kî Žî. The superiorman, in accordance with this, thinks of evil (that may come), and beforehand guards against it.", false),
        )),
      ),
    ),
  ),
)

#yilin-verse((
  ("Invented Chinese", "擬文（yilin 011010 101010）。", true),
))

#editions((
  ("Invented Chinese", "An invented Chinese Edition, for the export fixtures (2026)", "invented for the export fixtures; it transcribes no source", false),
  ("Legge", "Legge, Sacred Books of the East vol. 16 (Oxford, 1882)", "a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)", false),
  ("Invented English", "An invented English Translation, for the export fixtures (2026)", "invented for the export fixtures; its source is not known", true),
))
