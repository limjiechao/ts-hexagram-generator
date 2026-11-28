#set document(title: "Consultations, 2026-10-28", date: none)
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
#let transformation-row(standing, emerging-figure, at) = {
  let (value, change) = standing.lines.at(at - 1)
  let (emerging-value, _) = emerging-figure.lines.at(at - 1)
  (
    str(value), bar(value), mark(value, change), position(at),
    if change == "moving" { "→" } else { "" },
    str(emerging-value), bar(emerging-value), position(at),
  )
}

#let transformation(standing, emerging-figure) = [
  = Transformation
  #grid(
    columns: 8,
    column-gutter: 0.8em,
    row-gutter: 0.5em,
    align: horizon,
    ..range(6, 0, step: -1).map(at => transformation-row(standing, emerging-figure, at)).flatten(),
  )
  #grid(
    columns: 2,
    column-gutter: 2em,
    [*Standing Hexagram* \ #figure-summary(standing)],
    [*Emerging Hexagram* \ #figure-summary(emerging-figure)],
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

#query("Will Steward Aelric’s embassy to Westmill succeed?", "2026-10-28")

#no-casting()

#transformation(
  (
    number: 1,
    names: (
      ("Invented Chinese", "乾", true),
      ("Legge", "I. The Khien Hexagram", false),
    ),
    lines: ((7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
    lower: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
  ),
  (
    number: 1,
    names: (
      ("Invented Chinese", "乾", true),
      ("Legge", "I. The Khien Hexagram", false),
    ),
    lines: ((7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
    lower: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
  ),
)

#hexagram-tab(
  "Standing Hexagram",
  (
    number: 1,
    names: (
      ("Invented Chinese", "乾", true),
      ("Legge", "I. The Khien Hexagram", false),
    ),
    lines: ((7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
    lower: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
  ),
  nuclear: (1, (
    ("Invented Chinese", "乾", true),
    ("Legge", "I. The Khien Hexagram", false),
  )),
  inverse: (2, (
    ("Invented Chinese", "坤", true),
    ("Legge", "II. The Khwăn Hexagram", false),
  )),
  reversed: (1, (
    ("Invented Chinese", "乾", true),
    ("Legge", "I. The Khien Hexagram", false),
  )),
  passages: (
    (
      "卦辭",
      (
        ("Invented Chinese", "擬文（zhouyi 111111）。", true),
        ("Legge", "Khien (represents) what is great and originating, penetrating, advantageous, correct and firm.", false),
      ),
      (
        ("大象", (
          ("Invented Chinese", "擬文（daxiang 111111）。", true),
          ("Legge", "I. Heaven, in its motion, (gives the idea of) strength. The superior man, in accordance with this, nerves himself to ceaseless activity.", false),
        )),
      ),
    ),
  ),
)

#hexagram-tab(
  "Emerging Hexagram",
  (
    number: 1,
    names: (
      ("Invented Chinese", "乾", true),
      ("Legge", "I. The Khien Hexagram", false),
    ),
    lines: ((7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static"), (7, "static")),
    upper: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
    lower: (
      ("Invented Chinese", "乾", "天", true),
      ("Legge", "khien", "Heaven, the Sky", false),
    ),
  ),
  nuclear: (1, (
    ("Invented Chinese", "乾", true),
    ("Legge", "I. The Khien Hexagram", false),
  )),
  inverse: (2, (
    ("Invented Chinese", "坤", true),
    ("Legge", "II. The Khwăn Hexagram", false),
  )),
  reversed: (1, (
    ("Invented Chinese", "乾", true),
    ("Legge", "I. The Khien Hexagram", false),
  )),
  passages: (),
)

#editions((
  ("Invented Chinese", "An invented Chinese Edition, for the export fixtures (2026)", "invented for the export fixtures; it transcribes no source", false),
  ("Legge", "Legge, Sacred Books of the East vol. 16 (Oxford, 1882)", "a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)", false),
))
