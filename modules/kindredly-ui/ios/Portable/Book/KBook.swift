// Portable: this file imports Foundation only, so the 1.1.0 pure-Swift app can take it as is.

import Foundation

/*
 THE JOURNAL BOOK'S MODEL (journal book, 2026-11-10). The First Class export of Notes is a typeset
 A5 PDF made on the phone; TypeScript builds the whole book as plain data (src/lib/
 journal-book-core.ts buildBook: every string already in the reader's language, every number
 counted from their pages) and Swift only draws it. These types are the Swift mirror of that data,
 field for field with .claude/journal-book/CONTRACT.md ("The model"), which three assistants build
 against: change a shape here and the TS side and the export screen break, so don't.

 KBook.decode(json:) reads the JSON string the module function hands over. It is forgiving where a
 small drift between the two sides should not cost the reader their book, and strict where the
 thing is not a book at all:
 - a page whose `kind` this binary doesn't know is skipped (a newer JS may add kinds);
 - a field that is missing reads as its empty value ("" / 0 / [] / no mood / no media);
 - JSON that isn't an object with a `pages` list, or that has no page this binary can draw,
   throws KBookError with a sentence that says which.

 Nothing here draws. The pages are flattened and paginated by KBookRenderer.pages(book:)
 (KBookRenderer.swift) and drawn by KBookPageView (KBookPageView.swift).
 */

/// A mood as a page carries it: src/data/moods.ts `col` and `bg`, "#RRGGBB".
public struct KBookMood: Equatable, Sendable {
  /// the stored mood id ("cheerful", "group-low"); the face is KMoodArt's "mood-<id>"
  public let id: String
  /// its name in the reader's language (VoiceOver reads it; it is not printed)
  public let name: String
  /// the numeral, the band, the highlight, the face's tile
  public let color: String
  /// the page's ground
  public let bg: String

  public init(id: String, name: String, color: String, bg: String) {
    self.id = id
    self.name = name
    self.color = color
    self.bg = bg
  }
}

/// What a page holds besides its words.
public enum KBookMedia: Equatable, Sendable {
  case none
  /// file:// uris on this phone, cover first; the layout is chosen by how many of them load
  case photos([String])
  /// "VOICE · 1:14 · STAYS IN THE APP"
  case voice(label: String)
  /// "FILM · 0:12 · STAYS IN THE APP"
  case video(label: String)
}

public struct KBookCover: Equatable, Sendable {
  public let title: String
  /// "— Mira", or "" for a reader without a pen name
  public let by: String
  /// up to five mood ids, the most written first
  public let faces: [String]
  public let top: String
  public let foot: String

  public init(title: String, by: String, faces: [String], top: String, foot: String) {
    self.title = title
    self.by = by
    self.faces = faces
    self.top = top
    self.foot = foot
  }
}

public struct KBookYearMonth: Equatable, Sendable {
  public let label: String
  /// one string per day of the month: "" (no page) or that day's mood colour "#RRGGBB"
  public let days: [String]

  public init(label: String, days: [String]) {
    self.label = label
    self.days = days
  }
}

public struct KBookYear: Equatable, Sendable {
  public let year: String
  public let lead: String
  public let months: [KBookYearMonth]
  public let foot: String

  public init(year: String, lead: String, months: [KBookYearMonth], foot: String) {
    self.year = year
    self.lead = lead
    self.months = months
    self.foot = foot
  }
}

public struct KBookDay: Equatable, Sendable {
  public let n: Int
  /// "" = no page that day
  public let mood: String
  public let color: String

  public init(n: Int, mood: String, color: String) {
    self.n = n
    self.mood = mood
    self.color = color
  }
}

public struct KBookMonth: Equatable, Sendable {
  /// "NOV"
  public let label: String
  /// empty cells before day 1, in a week that starts on the reader's first weekday
  public let blanks: Int
  public let days: [KBookDay]
  public let foot: String

  public init(label: String, blanks: Int, days: [KBookDay], foot: String) {
    self.label = label
    self.blanks = blanks
    self.days = days
    self.foot = foot
  }
}

public struct KBookStat: Equatable, Sendable {
  public let value: String
  public let label: String
  /// "" or a mood id whose face is drawn after the label
  public let mood: String

  public init(value: String, label: String, mood: String) {
    self.value = value
    self.label = label
    self.mood = mood
  }
}

public struct KBookMonthEnd: Equatable, Sendable {
  public let top: String
  /// 1…3, each a real count
  public let stats: [KBookStat]
  public let foot: String

  public init(top: String, stats: [KBookStat], foot: String) {
    self.top = top
    self.stats = stats
    self.foot = foot
  }
}

public struct KBookEntry: Equatable, Sendable {
  /// the journal page's id; the voice page's waveform is drawn from it
  public let id: String
  /// "05"
  public let day: String
  /// "THURSDAY · NOVEMBER · 21:14"
  public let dateLine: String
  /// nil: a page with no stored mood, drawn on white with ink numerals
  public let mood: KBookMood?
  public let body: String
  /// the exact line that drifted out, "" for none; highlighted where the body still holds it
  public let drift: String
  /// "THIS LINE DRIFTED OUT"
  public let driftLabel: String
  public let media: KBookMedia
  /// "19 NOV · CONTINUED"
  public let contLabel: String
  /// "CONTINUES →"
  public let continues: String

  public init(
    id: String, day: String, dateLine: String, mood: KBookMood?, body: String, drift: String = "",
    driftLabel: String = "", media: KBookMedia = .none, contLabel: String = "", continues: String = ""
  ) {
    self.id = id
    self.day = day
    self.dateLine = dateLine
    self.mood = mood
    self.body = body
    self.drift = drift
    self.driftLabel = driftLabel
    self.media = media
    self.contLabel = contLabel
    self.continues = continues
  }
}

public struct KBookBack: Equatable, Sendable {
  public let lines: [String]
  /// "" or a file:// uri of Wren's picture (her snapshot; Swift never redraws her)
  public let wren: String
  public let foot: String

  public init(lines: [String], wren: String, foot: String) {
    self.lines = lines
    self.wren = wren
    self.foot = foot
  }
}

/// One page of the model, in print order. An entry may become several printed pages.
public enum KBookPage: Equatable, Sendable {
  case cover(KBookCover)
  case year(KBookYear)
  case month(KBookMonth)
  case monthEnd(KBookMonthEnd)
  case entry(KBookEntry)
  case back(KBookBack)
}

public struct KBook: Equatable, Sendable {
  /// "kindredly-book-2026" | "kindredly-book-2026-11": the PDF's name without ".pdf"
  public let fileStem: String
  /// the reader's Letter font key, as KLetterFace(key:) reads it
  public let letterFont: String
  public let pages: [KBookPage]

  public init(fileStem: String, letterFont: String, pages: [KBookPage]) {
    self.fileStem = fileStem
    self.letterFont = letterFont
    self.pages = pages
  }
}

/// Why a book could not be read or made. The description is a whole sentence: the module function
/// rejects its promise with it, and the export screen may show it.
public enum KBookError: Error, LocalizedError, CustomStringConvertible, Equatable {
  /// the JSON string is not a journal book
  case notABook(String)
  /// the PDF could not be written
  case cannotWrite(String)

  public var description: String {
    switch self {
    case let .notABook(why): return "This is not a journal book: \(why)."
    case let .cannotWrite(why): return "The book could not be written: \(why)."
    }
  }

  public var errorDescription: String? { description }
}

// MARK: - Reading the JSON

public extension KBook {
  /// The book in the JSON string TS sends (JSON.stringify of the contract's `Book`).
  static func decode(json: String) throws -> KBook {
    guard let data = json.data(using: .utf8), !data.isEmpty else {
      throw KBookError.notABook("the text is empty")
    }
    do {
      return try JSONDecoder().decode(KBook.self, from: data)
    } catch let error as KBookError {
      throw error
    } catch let error as DecodingError {
      throw KBookError.notABook(Self.reason(error))
    } catch {
      throw KBookError.notABook(error.localizedDescription)
    }
  }

  private static func reason(_ error: DecodingError) -> String {
    func path(_ context: DecodingError.Context) -> String {
      let keys = context.codingPath.map(\.stringValue).joined(separator: ".")
      return keys.isEmpty ? "the top of the JSON" : "\"\(keys)\""
    }
    switch error {
    case let .dataCorrupted(context):
      return context.codingPath.isEmpty ? "the text is not JSON" : "\(path(context)) can't be read"
    case let .keyNotFound(key, _):
      return "\"\(key.stringValue)\" is missing"
    case let .typeMismatch(_, context):
      return "\(path(context)) is not the kind of value a book has there"
    case let .valueNotFound(_, context):
      return "\(path(context)) is empty"
    @unknown default:
      return "the JSON can't be read"
    }
  }
}

/// Any key by name: the model's fields are read one by one so a missing one can fall back.
private struct KBookKey: CodingKey {
  let stringValue: String
  var intValue: Int? { nil }

  init(_ name: String) { stringValue = name }
  init?(stringValue: String) { self.stringValue = stringValue }
  init?(intValue: Int) { return nil }
}

private extension KeyedDecodingContainer where Key == KBookKey {
  /// A string; a number is read as its digits; anything else, or nothing, is "".
  func str(_ name: String) -> String {
    let key = KBookKey(name)
    if let value = try? decodeIfPresent(String.self, forKey: key) { return value }
    if let value = try? decodeIfPresent(Int.self, forKey: key) { return String(value) }
    if let value = try? decodeIfPresent(Double.self, forKey: key) { return String(value) }
    return ""
  }

  /// A whole number; digits in a string are read; anything else, or nothing, is 0.
  func int(_ name: String) -> Int {
    let key = KBookKey(name)
    if let value = try? decodeIfPresent(Int.self, forKey: key) { return value }
    if let value = try? decodeIfPresent(Double.self, forKey: key), value.isFinite { return Int(value) }
    if let value = try? decodeIfPresent(String.self, forKey: key), let n = Int(value) { return n }
    return 0
  }

  /// A list of strings; entries that aren't strings are left out; nothing is [].
  func strs(_ name: String) -> [String] {
    guard let list = try? decodeIfPresent([KBookLoose<String>].self, forKey: KBookKey(name)) else { return [] }
    return list.compactMap(\.value)
  }

  /// A list of T; entries that can't be read are left out; nothing is [].
  func list<T: Decodable>(_ name: String, of type: T.Type) -> [T] {
    guard let list = try? decodeIfPresent([KBookLoose<T>].self, forKey: KBookKey(name)) else { return [] }
    return list.compactMap(\.value)
  }
}

/// One list entry that may fail to decode without failing the list.
private struct KBookLoose<T: Decodable>: Decodable {
  let value: T?

  init(from decoder: Decoder) throws {
    value = try? T(from: decoder)
  }
}

extension KBookMood: Decodable {
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: KBookKey.self)
    self.init(id: c.str("id"), name: c.str("name"), color: c.str("color"), bg: c.str("bg"))
  }
}

extension KBookMedia: Decodable {
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: KBookKey.self)
    switch c.str("type") {
    case "photos":
      let uris = c.strs("uris").filter { !$0.isEmpty }
      self = uris.isEmpty ? .none : .photos(uris)
    case "voice": self = .voice(label: c.str("label"))
    case "video": self = .video(label: c.str("label"))
    default: self = .none
    }
  }
}

extension KBookYearMonth: Decodable {
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: KBookKey.self)
    // a day that isn't a string still takes its square, as an empty one
    let days = (try? c.decodeIfPresent([KBookLoose<String>].self, forKey: KBookKey("days"))) ?? []
    self.init(label: c.str("label"), days: days.map { $0.value ?? "" })
  }
}

extension KBookDay: Decodable {
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: KBookKey.self)
    self.init(n: c.int("n"), mood: c.str("mood"), color: c.str("color"))
  }
}

extension KBookStat: Decodable {
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: KBookKey.self)
    self.init(value: c.str("value"), label: c.str("label"), mood: c.str("mood"))
  }
}

extension KBookPage: Decodable {
  /// Throws for a kind this binary doesn't know; KBook reads its pages loosely, so that page is
  /// skipped and the rest of the book is kept.
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: KBookKey.self)
    switch c.str("kind") {
    case "cover":
      self = .cover(KBookCover(
        title: c.str("title"), by: c.str("by"), faces: c.strs("faces").filter { !$0.isEmpty },
        top: c.str("top"), foot: c.str("foot")
      ))
    case "year":
      self = .year(KBookYear(
        year: c.str("year"), lead: c.str("lead"), months: c.list("months", of: KBookYearMonth.self), foot: c.str("foot")
      ))
    case "month":
      self = .month(KBookMonth(
        label: c.str("label"), blanks: max(0, c.int("blanks")), days: c.list("days", of: KBookDay.self), foot: c.str("foot")
      ))
    case "monthEnd":
      self = .monthEnd(KBookMonthEnd(top: c.str("top"), stats: c.list("stats", of: KBookStat.self), foot: c.str("foot")))
    case "entry":
      let mood = (try? c.decodeIfPresent(KBookMood.self, forKey: KBookKey("mood"))) ?? nil
      let media = (try? c.decodeIfPresent(KBookMedia.self, forKey: KBookKey("media"))) ?? nil
      self = .entry(KBookEntry(
        id: c.str("id"), day: c.str("day"), dateLine: c.str("dateLine"),
        // a mood without a colour can't be drawn as one: it is a page without a mood
        mood: mood.flatMap { $0.color.isEmpty ? nil : $0 },
        body: c.str("body"), drift: c.str("drift"), driftLabel: c.str("driftLabel"),
        media: media ?? .none, contLabel: c.str("contLabel"), continues: c.str("continues")
      ))
    case "back":
      self = .back(KBookBack(lines: c.strs("lines"), wren: c.str("wren"), foot: c.str("foot")))
    case let other:
      throw DecodingError.dataCorrupted(DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "unknown page kind \"\(other)\""))
    }
  }
}

extension KBook: Decodable {
  public init(from decoder: Decoder) throws {
    let c: KeyedDecodingContainer<KBookKey>
    do {
      c = try decoder.container(keyedBy: KBookKey.self)
    } catch {
      throw KBookError.notABook("the JSON is not an object")
    }
    guard c.contains(KBookKey("pages")) else {
      throw KBookError.notABook("it has no \"pages\"")
    }
    guard let loose = try? c.decode([KBookLoose<KBookPage>].self, forKey: KBookKey("pages")) else {
      throw KBookError.notABook("\"pages\" is not a list")
    }
    let pages = loose.compactMap(\.value)
    guard !pages.isEmpty else {
      throw KBookError.notABook(loose.isEmpty ? "it has no pages" : "none of its \(loose.count) pages is a kind this version can draw")
    }
    self.init(fileStem: c.str("fileStem"), letterFont: c.str("letterFont"), pages: pages)
  }
}

public extension KBook {
  /// The PDF's file name without its extension: `fileStem` kept to letters, digits, ".", "-" and
  /// "_" (it becomes a path in Caches, so nothing in it may climb out of the folder), or
  /// "kindredly-book" when nothing is left.
  var safeFileStem: String {
    let allowed = Set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
    var stem = String(fileStem.map { allowed.contains($0) ? $0 : "-" })
    while stem.hasPrefix(".") || stem.hasPrefix("-") { stem.removeFirst() }
    stem = String(stem.prefix(80))
    return stem.isEmpty ? "kindredly-book" : stem
  }
}
