#set document(title: "Consultations, 2026-10-28 to 2026-11-12", date: none)
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

#editions((
  ("Invented Chinese", "An invented Chinese Edition, for the export fixtures (2026)", "invented for the export fixtures; it transcribes no source", false),
  ("Legge", "Legge, Sacred Books of the East vol. 16 (Oxford, 1882)", "a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)", false),
))

#pagebreak()

#query("Will the beacon on Greyfen Tor be lit before the thaw?", "2026-11-05 07:45")

#casting("Virtual", (
  (6, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (6, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (6, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (5, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (5, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (5, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (4, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (4, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (4, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (3, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (3, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (3, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (2, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (2, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (2, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (1, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9, 9),
  (1, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (1, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
))

#transformation(
  (
    number: 1,
    names: (
      ("Invented Chinese", "乾", true),
      ("Legge", "I. The Khien Hexagram", false),
    ),
    lines: ((9, "moving"), (9, "moving"), (9, "moving"), (9, "moving"), (9, "moving"), (9, "moving")),
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
    number: 2,
    names: (
      ("Invented Chinese", "坤", true),
      ("Legge", "II. The Khwăn Hexagram", false),
    ),
    lines: ((8, "changed"), (8, "changed"), (8, "changed"), (8, "changed"), (8, "changed"), (8, "changed")),
    upper: (
      ("Invented Chinese", "坤", "地", true),
      ("Legge", "khwăn", "The earth", false),
    ),
    lower: (
      ("Invented Chinese", "坤", "地", true),
      ("Legge", "khwăn", "The earth", false),
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
    lines: ((9, "moving"), (9, "moving"), (9, "moving"), (9, "moving"), (9, "moving"), (9, "moving")),
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
    (
      "初九",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.1）。", true),
        ("Legge", "1. In the first (or lowest) NINE, undivided, (we see its subject as) the dragon lying hid (in the deep). It is not the time for active doing.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.1）。", true),
          ("Legge", "1. 'The dragon lies hid in the deep;--it is not the time for active doing:'--(this appears from) the strong and undivided line's being in the lowest place.", false),
        )),
      ),
    ),
    (
      "九二",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.2）。", true),
        ("Legge", "2. In the second NINE, undivided, (we see its subject as) the dragon appearing in the field. It will be advantageous to meet with the great man.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.2）。", true),
          ("Legge", "2. 'The dragon appears in the field:'--the diffusion of virtuous influence has been wide.", false),
        )),
      ),
    ),
    (
      "九三",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.3）。", true),
        ("Legge", "3. In the third NINE, undivided, (we see its subject as) the superior man active and vigilant all the day, and in the evening still careful and apprehensive. (The position is) dangerous, but there will be no mistake.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.3）。", true),
          ("Legge", "3. 'Active and vigilant all the day:'--(this refers to) the treading of the (proper) path over and over again.", false),
        )),
      ),
    ),
    (
      "九四",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.4）。", true),
        ("Legge", "4. In the fourth NINE, undivided, (we see its subject as the dragon looking) as if he were leaping up, but still in the deep. There will be no mistake.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.4）。", true),
          ("Legge", "4. 'He seems to be leaping up, but is still in the deep:'--if he advance, there will be no error.", false),
        )),
      ),
    ),
    (
      "九五",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.5）。", true),
        ("Legge", "5. In the fifth NINE, undivided, (we see its subject as) the dragon on the wing in the sky. It will be advantageous to meet with the great man.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.5）。", true),
          ("Legge", "5. 'The dragon is on the wing in the sky:'--the great man rouses himself to his work.", false),
        )),
      ),
    ),
    (
      "上九",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.6）。", true),
        ("Legge", "6. In the sixth (or topmost) NINE, undivided, (we see its subject as) the dragon exceeding the proper limits. There will be occasion for repentance.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.6）。", true),
          ("Legge", "6. 'The dragon exceeds the proper limits;--there will be occasion for repentance:'--a state of fulness, that is, should not be indulged in long.", false),
        )),
      ),
    ),
    (
      "用九",
      (
        ("Invented Chinese", "擬文（zhouyi 111111.all-moving）。", true),
        ("Legge", "(The lines of this hexagram are all strong and undivided, as appears from) the use of the number nine. If the host of dragons (thus) appearing were to divest themselves of their heads, there would be good fortune.", false),
      ),
      (
        ("小象", (
          ("Invented Chinese", "擬文（xiaoxiang 111111.all-moving）。", true),
          ("Legge", "'The same undivided line is used' (in all the places of this hexagram), but the attribute of heaven (thereby denoted) should not (always) take the foremost place.", false),
        )),
      ),
    ),
  ),
)

#hexagram-tab(
  "Emerging Hexagram",
  (
    number: 2,
    names: (
      ("Invented Chinese", "坤", true),
      ("Legge", "II. The Khwăn Hexagram", false),
    ),
    lines: ((8, "changed"), (8, "changed"), (8, "changed"), (8, "changed"), (8, "changed"), (8, "changed")),
    upper: (
      ("Invented Chinese", "坤", "地", true),
      ("Legge", "khwăn", "The earth", false),
    ),
    lower: (
      ("Invented Chinese", "坤", "地", true),
      ("Legge", "khwăn", "The earth", false),
    ),
  ),
  nuclear: (2, (
    ("Invented Chinese", "坤", true),
    ("Legge", "II. The Khwăn Hexagram", false),
  )),
  inverse: (1, (
    ("Invented Chinese", "乾", true),
    ("Legge", "I. The Khien Hexagram", false),
  )),
  reversed: (2, (
    ("Invented Chinese", "坤", true),
    ("Legge", "II. The Khwăn Hexagram", false),
  )),
  passages: (
    (
      "卦辭",
      (
        ("Invented Chinese", "擬文（zhouyi 000000）。", true),
        ("Legge", "Khwăn (represents) what is great and originating, penetrating, advantageous, correct and having the firmness of a mare. When the superior man (here intended) has to make any movement, if he take the initiative, he will go astray; if he follow, he will find his (proper) lord. The advantageousness will be seen in his getting friends in the south-west, and losing friends in the north-east. If he rest in correctness and firmness, there will be good fortune.", false),
      ),
      (
        ("大象", (
          ("Invented Chinese", "擬文（daxiang 000000）。", true),
          ("Legge", "II. The (capacity and sustaining) power of the earth is what is denoted by Khwăn. The superior man, in accordance with this, with his large virtue supports (men and) things.", false),
        )),
      ),
    ),
  ),
)

#editions((
  ("Invented Chinese", "An invented Chinese Edition, for the export fixtures (2026)", "invented for the export fixtures; it transcribes no source", false),
  ("Legge", "Legge, Sacred Books of the East vol. 16 (Oxford, 1882)", "a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)", false),
))

#pagebreak()

#query("Should the granary at Greyfen Hold be rebuilt before winter?", "2026-11-02 21:14")

#casting("Automatic", (
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
  (2, 3, 40, 3, 0, 3, 37, 8, 4, 8, 8, 8),
  (2, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10, none),
  (2, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
  (1, 3, 36, 3, 0, 3, 33, 7, 4, 8, 7, 7),
  (1, 2, 44, 3, 0, 3, 41, 9, 4, 8, 9, none),
  (1, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11, none),
))

#transformation(
  (
    number: 63,
    names: (
      ("Invented Chinese", "既濟", true),
      ("Legge", "LXIII. The Kî Žî Hexagram", false),
    ),
    lines: ((7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
    upper: (
      ("Invented Chinese", "坎", "水", true),
      ("Legge", "khân", "Water, as in rain, clouds, springs, streams and defiles. The moon", false),
    ),
    lower: (
      ("Invented Chinese", "離", "火", true),
      ("Legge", "lî", "Fire, as in lightning; the sun", false),
    ),
  ),
  (
    number: 63,
    names: (
      ("Invented Chinese", "既濟", true),
      ("Legge", "LXIII. The Kî Žî Hexagram", false),
    ),
    lines: ((7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
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
    number: 63,
    names: (
      ("Invented Chinese", "既濟", true),
      ("Legge", "LXIII. The Kî Žî Hexagram", false),
    ),
    lines: ((7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
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

#hexagram-tab(
  "Emerging Hexagram",
  (
    number: 63,
    names: (
      ("Invented Chinese", "既濟", true),
      ("Legge", "LXIII. The Kî Žî Hexagram", false),
    ),
    lines: ((7, "static"), (8, "static"), (7, "static"), (8, "static"), (7, "static"), (8, "static")),
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
  passages: (),
)

#editions((
  ("Invented Chinese", "An invented Chinese Edition, for the export fixtures (2026)", "invented for the export fixtures; it transcribes no source", false),
  ("Legge", "Legge, Sacred Books of the East vol. 16 (Oxford, 1882)", "a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)", false),
))

#pagebreak()

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

#pagebreak()

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
