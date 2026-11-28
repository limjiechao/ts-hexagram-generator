#set document(title: "Consultations, 2026-10-30", date: none)
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

#query("Should the Greyfen Hold council\nseat a new reeve this spring?", "2026-10-30 08:05")

#no-casting()

#transformation(
  (
    number: 64,
    names: (
      ("Invented Chinese", "未濟", true),
      ("Legge", "LXIV. The Wei Žî Hexagram", false),
    ),
    lines: ((6, "moving"), (7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
    lower: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
  ),
  (
    number: 38,
    names: (
      ("Invented Chinese", "睽", true),
      ("Legge", "XXXVIII. The Khwei Hexagram", false),
    ),
    lines: ((7, "changed"), (7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
    lower: (
      ("Invented Chinese", "兌", "澤", true),
      ("Legge", "tui", "Water, collected as in a marsh or lake", false),
    ),
  ),
)

#hexagram-tab(
  "Standing Hexagram",
  (
    number: 64,
    names: (
      ("Invented Chinese", "未濟", true),
      ("Legge", "LXIV. The Wei Žî Hexagram", false),
    ),
    lines: ((6, "moving"), (7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
    lower: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
  ),
  nuclear: (63, (
    ("Invented Chinese", "既濟", true),
    ("Legge", "LXIII. The Kî Žî Hexagram", false),
  )),
  inverse: (63, (
    ("Invented Chinese", "既濟", true),
    ("Legge", "LXIII. The Kî Žî Hexagram", false),
  )),
  reversed: (63, (
    ("Invented Chinese", "既濟", true),
    ("Legge", "LXIII. The Kî Žî Hexagram", false),
  )),
  passages: (
    (
      "卦辭",
      (
        ("Invented Chinese", "擬文（zhouyi 010101）。", true),
        ("Legge", "Wei Žî intimates progress and success (in the circumstances which it implies). (We see) a young fox that has nearly crossed (the stream), when its tail gets immersed. There will be no advantage in any way.", false),
      ),
      (
        ("大象", (
          ("Invented Chinese", "擬文（daxiang 010101）。", true),
          ("Legge", "LXIV. (The trigram representing) water and that for fire above it form Wei Žî. The superior man, in accordance with this, carefully discriminates among (the qualities of) things, and the (different) positions they (naturally) occupy.", false),
        )),
      ),
    ),
    (
      "初六",
      (
        ("Invented Chinese", "擬文（zhouyi 010101.1）。", true),
        ("Legge", "1. The first SIX, divided, shows its subject (like a fox) whose tail gets immersed. There will be occasion for regret.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 010101.1）。", true),
          ("Legge", "1. 'His tail gets immersed:'--this is the very height of ignorance.", false),
        )),
      ),
    ),
  ),
)

#hexagram-tab(
  "Emerging Hexagram",
  (
    number: 38,
    names: (
      ("Invented Chinese", "睽", true),
      ("Legge", "XXXVIII. The Khwei Hexagram", false),
    ),
    lines: ((7, "changed"), (7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
    lower: (
      ("Invented Chinese", "兌", "澤", true),
      ("Legge", "tui", "Water, collected as in a marsh or lake", false),
    ),
  ),
  nuclear: (63, (
    ("Invented Chinese", "既濟", true),
    ("Legge", "LXIII. The Kî Žî Hexagram", false),
  )),
  inverse: (39, (
    ("Invented Chinese", "蹇", true),
    ("Legge", "XXXIX. The Kien Hexagram", false),
  )),
  reversed: (37, (
    ("Invented Chinese", "家人", true),
    ("Legge", "XXXVII. The Kiâ Zăn Hexagram", false),
  )),
  passages: (
    (
      "卦辭",
      (
        ("Invented Chinese", "擬文（zhouyi 110101）。", true),
        ("Legge", "Khwei indicates that, (notwithstanding the condition of things which it denotes), in small matters there will (still) be good success.", false),
      ),
      (
        ("大象", (
          ("Invented Chinese", "擬文（daxiang 110101）。", true),
          ("Legge", "XXXVIII. (The trigram representing) fire above, and that for (the waters of) a marsh below, form Khwei. The superior man, in accordance with this, where there is a general agreement, yet admits diversity.", false),
        )),
      ),
    ),
  ),
)

#editions((
  ("Invented Chinese", "An invented Chinese Edition, for the export fixtures (2026)", "invented for the export fixtures; it transcribes no source", false),
  ("Legge", "Legge, Sacred Books of the East vol. 16 (Oxford, 1882)", "a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)", false),
))
