// Portable: this file imports Foundation only, so the 1.1.0 pure-Swift app can take it as is.

import Foundation

/*
 THE LAB'S BOOK (journal book, 2026-11-10; dev only). One KBook that reaches every template and
 every hard case, so the pages can be judged on a simulator without a journal: KBookLab shows it
 (kindredly:///dev/journal-book-lab), and it is the book the engine was run on when it was written.

 The words of the first sections are the approved mock's own (.claude/journal-book/gen2.py and
 gen.py: the demo journal's lines, its November, its year pattern), in English: a dev page, as
 the gallery's samples are. The EDGES section is there for the pagination: Chinese and Japanese,
 Arabic and Hebrew, one endless word, emoji alone, an empty page, line ends at the end, a mood
 that is only a group, a drifted line that crosses a page break, a caption too long for its
 photo. Photos are "lab:<n>" stand-ins (no file: a tinted block), and there is no picture of Wren
 here, so the drifted line's label stands alone and the back cover has no bird.

 `sections` names which of the book's pages each row of the lab shows.
 */
enum KBookSample {
  /// A row of the lab: its title and the model pages (indexes into `book.pages`) it shows.
  struct Section: Equatable {
    let title: String
    let sources: [Int]
  }

  private static let moods: [String: (color: String, bg: String)] = [
    "calm": ("#8FBBD9", "#EFF5F9"), "content": ("#F3B07A", "#FDF3EC"), "cheerful": ("#F6C445", "#FDF6E4"),
    "in-love": ("#F2708F", "#FDEAEF"), "sleepy": ("#9C9BD6", "#F1F1F9"), "pleased": ("#F0A9B6", "#FCF2F4"),
    "drained": ("#8A8496", "#EEEDF0"), "frustrated": ("#E4703F", "#FBEAE4"), "heartbroken": ("#B85670", "#F5E7EA"),
    "okay": ("#A8B4A0", "#F2F4F1"), "playful": ("#5CC08E", "#E8F6EF"), "surprised": ("#5FC3D9", "#E8F6F9"),
    // a page that chose only a group's colour
    "group-low": ("#7E9BC4", "#ECF1F6"),
  ]
  private static let order = ["calm", "content", "cheerful", "in-love", "sleepy", "pleased", "drained", "frustrated", "heartbroken", "okay", "playful", "surprised"]

  private static func mood(_ id: String) -> KBookMood {
    let pair = moods[id] ?? ("#8FBBD9", "#EFF5F9")
    return KBookMood(id: id, name: id, color: pair.color, bg: pair.bg)
  }

  private static func color(_ id: String) -> String {
    moods[id]?.color ?? ""
  }

  /// gen2.py year_rows(): a fixed pattern, not random
  private static var yearMonths: [KBookYearMonth] {
    let names = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV"]
    let lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30]
    return zip(names, lengths).enumerated().map { mi, pair in
      let days = (0..<pair.1).map { d -> String in
        let on = (d * 7 + mi * 13) % 17 < 5 + mi % 4
        return on ? color(order[(d * 5 + mi * 3) % order.count]) : ""
      }
      return KBookYearMonth(label: pair.0, days: days)
    }
  }

  /// gen.py NOV: the demo journal's November; 1 November 2026 is a Sunday, the week starts on Monday
  private static var november: KBookMonth {
    let written: [Int: String] = [
      1: "calm", 2: "content", 4: "sleepy", 5: "cheerful", 6: "in-love", 7: "calm", 8: "pleased", 9: "content", 10: "sleepy",
      13: "frustrated", 14: "okay", 17: "playful", 19: "heartbroken", 21: "calm", 22: "cheerful", 25: "drained", 27: "surprised", 28: "content",
    ]
    let days = (1...30).map { n -> KBookDay in
      let id = written[n] ?? ""
      return KBookDay(n: n, mood: id, color: color(id))
    }
    return KBookMonth(label: "NOV", blanks: 6, days: days, foot: "18 OF 30 · MOSTLY CALM")
  }

  private static let short = "I said no to something today and the world did not end. I keep checking. It really didn’t."
  private static let photoLine = "The light hit the kitchen wall like this for exactly four minutes."
  private static let long1 = "Packed his mug last. Couldn’t decide if it was mine to keep. It has a chip on the rim that fits my thumb, "
    + "which is not a reason, but it felt like one at two in the afternoon with the tape gun in my other hand."
  private static let long2 = "I put it in the box marked KITCHEN and then took it out again. The flat is mostly echo now. "
    + "I keep finding the places where the light used to land on things that aren’t there."
  private static let long3 = "Tomorrow the keys go back. Tonight I am drinking tea out of the mug, and I have decided that is an answer."
  private static let long4 = "The man from the letting agency walked through with a clipboard and said the walls were in good condition, "
    + "as if they had been trying. I nodded like someone who had never cried in that hallway."
  private static let long5 = "On the way out I counted the stairs. Forty-one. I lived there for three years and never knew."
  /// sits where the long entry's first page ends, so its highlight crosses the page break
  private static let driftLine = "I keep finding the places where the light used to land on things that aren’t there."

  private static func entry(
    _ id: String, day: String, date: String, mood moodId: String?, body: String, drift: String = "", media: KBookMedia = .none
  ) -> KBookPage {
    .entry(KBookEntry(
      id: id, day: day, dateLine: date, mood: moodId.map { mood($0) }, body: body, drift: drift,
      driftLabel: "THIS LINE DRIFTED OUT", media: media, contLabel: "\(day) NOV · CONTINUED", continues: "CONTINUES →"
    ))
  }

  private static func labPhotos(_ count: Int, from first: Int = 1) -> KBookMedia {
    .photos((first..<(first + count)).map { "lab:\($0)" })
  }

  /// The model pages, in rows; `book` puts them in one book in this order.
  private static let rows: [(title: String, pages: [KBookPage])] = [
    ("1 · OPENING AND EACH MONTH", [
      .cover(KBookCover(title: "my year in pages", by: "— Mira", faces: ["cheerful", "calm", "in-love", "sleepy", "playful"], top: "KINDREDLY", foot: "2026 · 112 PAGES")),
      .year(KBookYear(year: "2026", lead: "112 PAGES · 97 DAYS · 11 MONTHS", months: yearMonths, foot: "EACH SQUARE IS A DAY YOU WROTE")),
      .month(november),
      .monthEnd(KBookMonthEnd(
        top: "NOVEMBER, COUNTED",
        stats: [
          KBookStat(value: "18", label: "days you wrote", mood: ""),
          KBookStat(value: "7", label: "of them calm", mood: "calm"),
          KBookStat(value: "412", label: "words on your longest page", mood: ""),
        ],
        foot: "EVERY NUMBER IS COUNTED FROM YOUR PAGES"
      )),
    ]),
    ("2 · WORDS", [
      entry("lab-short", day: "05", date: "THURSDAY · NOVEMBER · 21:14", mood: "cheerful", body: short),
      entry("lab-long", day: "19", date: "THURSDAY · NOVEMBER · 14:02", mood: "heartbroken", body: [long1, long2, long4, long5, long3].joined(separator: "\n\n")),
      entry(
        "lab-drift", day: "07", date: "SATURDAY · NOVEMBER · 23:30", mood: "calm",
        body: "the sea did that thing again. filmed it so i’d believe it later.", drift: "filmed it so i’d believe it later."
      ),
      entry("lab-nomood", day: "11", date: "WEDNESDAY · NOVEMBER · 08:40", mood: nil, body: "No mood picked. Just the page, and what was on it."),
      entry(
        "lab-drift-long", day: "20", date: "FRIDAY · NOVEMBER · 01:12", mood: "sleepy",
        body: [long1, long2, long4, long5, long3].joined(separator: "\n\n"), drift: driftLine
      ),
    ]),
    ("3 · PHOTOS, VOICE AND FILM", [
      entry("lab-one", day: "09", date: "MONDAY · NOVEMBER · 15:48", mood: "content", body: photoLine, media: labPhotos(1)),
      entry("lab-four", day: "10", date: "MONDAY · NOVEMBER · 15:48", mood: "content", body: photoLine, media: labPhotos(4)),
      entry("lab-two-up", day: "12", date: "THURSDAY · NOVEMBER · 10:05", mood: "playful", body: "Two upright ones stand side by side.", media: .photos(["lab:1", "lab:3"])),
      entry("lab-two-flat", day: "12", date: "THURSDAY · NOVEMBER · 10:06", mood: "playful", body: "One upright, one lying down: stacked.", media: .photos(["lab:1", "lab:2"])),
      entry("lab-nine", day: "22", date: "SUNDAY · NOVEMBER · 16:20", mood: "pleased", body: "Found a four-leaf clover. Didn’t pick it.", media: labPhotos(9)),
      entry("lab-six", day: "23", date: "MONDAY · NOVEMBER · 12:00", mood: "okay", body: "Six of them. Two rows.", media: labPhotos(6)),
      entry(
        "lab-voice", day: "25", date: "WEDNESDAY · NOVEMBER · 03:11", mood: "drained",
        body: "3am thoughts, recorded so I’d stop thinking them.", media: .voice(label: "VOICE · 1:14 · STAYS IN THE APP")
      ),
      entry(
        "lab-film", day: "26", date: "THURSDAY · NOVEMBER · 18:30", mood: "surprised",
        body: [long2, long4, long5].joined(separator: "\n\n"), media: .video(label: "FILM · 0:12 · STAYS IN THE APP")
      ),
      entry(
        "lab-one-long", day: "27", date: "FRIDAY · NOVEMBER · 07:02", mood: "surprised",
        body: [photoLine, long2, long3].joined(separator: " "), drift: photoLine, media: labPhotos(1, from: 2)
      ),
    ]),
    ("4 · EDGES", [
      entry(
        "lab-cjk", day: "14", date: "土曜日 · 11月 · 22:05", mood: "okay",
        body: "今天把他的杯子最后一个装进箱子。杯沿有个缺口，正好贴合我的拇指，这不算理由，但下午两点手里拿着胶带的时候，它像是个理由。"
          + "我把它放进写着“厨房”的箱子，又拿了出来。房间里现在几乎只剩回声，我总是发现光曾经落在那些已经不在的东西上的位置。\n\n"
          + "明日、鍵を返す。今夜はそのマグカップでお茶を飲んでいて、それが答えだと決めた。階段を数えたら四十一段あった。三年も住んでいたのに、知らなかった。"
          + "不動産屋の人はクリップボードを持って部屋を歩き、壁の状態は良好ですねと言った。まるで壁が努力していたかのように。"
      ),
      entry(
        "lab-rtl", day: "15", date: "SUNDAY · NOVEMBER · 09:30", mood: "calm",
        body: "اليوم قلت لا لشيء ما ولم ينته العالم. ما زلت أتحقق. لم ينته حقًا.\n\nהיום אמרתי לא למשהו והעולם לא נגמר. אני ממשיך לבדוק.\n\nAnd one line in English after them.",
        drift: "ما زلت أتحقق."
      ),
      entry(
        "lab-word", day: "16", date: "MONDAY · NOVEMBER · 13:13", mood: "frustrated",
        body: "Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaftsmitgliederversammlungsprotokoll and then a normal word."
      ),
      entry("lab-emoji", day: "17", date: "TUESDAY · NOVEMBER · 19:00", mood: "playful", body: "🌧️🌧️🌧️☕️📚🕯️🐈‍⬛🌙✨👩‍👩‍👧‍👦🏳️‍🌈🫠🫶🏽🥲🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊🌊"),
      entry("lab-empty", day: "18", date: "WEDNESDAY · NOVEMBER · 00:00", mood: "sleepy", body: ""),
      entry("lab-newlines", day: "21", date: "SATURDAY · NOVEMBER · 21:00", mood: "calm", body: "\n\nOne line.\n\n\n\nAnother, after too many line ends.\nAnd a third right under it.\n\n\n"),
      entry("lab-group", day: "24", date: "TUESDAY · NOVEMBER · 17:45", mood: "group-low", body: "Only a colour today. No face picked."),
      entry("lab-drift-gone", day: "28", date: "SATURDAY · NOVEMBER · 11:11", mood: "content", body: "The line that drifted out was edited away afterwards.", drift: "it used to say something else here"),
    ]),
    ("5 · BACK COVER", [
      .back(KBookBack(lines: ["kept on this phone.", "carried by nobody."], wren: "", foot: "KINDREDLY · 2026")),
    ]),
  ]

  /// The lab's book in the Letter font named ("newsreader", "system", "garamond", "sfmono").
  static func book(letterFont: String) -> KBook {
    KBook(fileStem: "kindredly-book-lab", letterFont: letterFont, pages: rows.flatMap(\.pages))
  }

  /// Which of the book's pages each row shows.
  static let sections: [Section] = {
    var at = 0
    return rows.map { row in
      defer { at += row.pages.count }
      return Section(title: row.title, sources: Array(at..<(at + row.pages.count)))
    }
  }()
}
