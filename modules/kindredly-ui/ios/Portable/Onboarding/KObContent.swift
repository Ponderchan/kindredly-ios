// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WHAT THE ONBOARDING DRAWS, AS TS HANDS IT OVER (src/screens/onboarding/OnboardingNative.tsx).

 TypeScript runs the run: the flow (flow.ts) decides every move, the runner carries out its
 effects (the anonymous session, the block, the post, the knock), the services talk to the
 world, and the per-screen state that is not drawing (a sign-in in flight, the email fold's
 stage, the hatch's word) lives there too. Swift only draws the screen TS names, plays its
 motion, holds the words being typed (uncontrolled fields) and reports every tap through one
 channel (KObActions.send). Every word comes from TS, already translated and filled in, in
 `words`, keyed by the names OnboardingNative gives them.
 */

public enum KObScreen: String, Sendable {
  case doorstep, egg, birthday, pronoun, face, envelope, letter, stamp, hatch, name, address, flight, knock

  /// the screens the runner's one nest egg sits over (flow eggPlace "nest")
  var nest: Bool {
    switch self {
    case .birthday, .pronoun, .face, .envelope, .stamp: return true
    default: return false
    }
  }
}

/// A side state, drawn over (or instead of the body of) its screen.
public enum KObSide: String, Sendable {
  case signin, underage, tray, code
}

public enum KObGround: String, Sendable {
  case blue, paper, shell

  var color: Color {
    switch self {
    case .blue: return KOb.blue
    case .paper: return KOb.sheet
    case .shell: return KOb.shell
    }
  }

  /// the colour of type standing directly on it
  var type: Color { self == .blue ? KOb.white : KOb.ink }
}

/// One of the four shells on 2: its name in mono capitals and what VoiceOver says for it.
public struct KObShellInfo: Equatable, Sendable {
  public var name: String
  public var a11y: String
  public init(name: String, a11y: String) {
    self.name = name
    self.a11y = a11y
  }
}

/// Screen 1: how the launch handed over, and slide 1–3's samples.
public struct KObDoor: Equatable, Sendable {
  public enum Entry: String, Sendable { case full, still, rest }
  public var entry: Entry = .rest
  /// when the launch handed over (ms since 1970): the hand-off holds its first frame until the
  /// route's 450ms fade is done
  public var handedAt: Double = 0
  /// the phone's language isn't one of the nine: the language chip shows
  public var showLang = false
  /// slide 1's date (postmark: OCT.18)
  public var date = ""
  /// the sample stranger's courier name in the reader's language ("Sunday Kite")
  public var sample = ""
  public var frostThem: KFrostSpec?
  public var frostYou: KFrostSpec?
  public var faceThem: KImageRef?
  public var faceYou: KImageRef?
  public init() {}
}

/// "Continue with email" unfolding in place (1a and 11): the key, the address, the code.
public struct KObFold: Equatable, Sendable {
  public enum Stage: String, Sendable { case key, email, code }
  public var stage: Stage = .key
  public var busy = false
  /// the refusal under the field, or "" (the caption shows)
  public var bad = ""
  public init() {}
}

/// The account keys' state (1a, 11).
public struct KObAuth: Equatable, Sendable {
  /// Sign in with Apple is available here (its key shows, first)
  public var apple = true
  /// the key working: apple, google, switch, or ""
  public var busy = ""
  /// 1a: what the last try said, under the keys
  public var err = ""
  public var fold = KObFold()
  /// 11: the last try failed (one line under the keys)
  public var failed = false
  /// 11: that address already owns an account ("Switch to it?")
  public var exists = false
  /// 11: the switch went by email; its six digits are asked for
  public var switchCode = false
  public var switchBusy = false
  public var switchBad = false
  public init() {}
}

/// 3: the wheel's answer and today.
public struct KObDob: Equatable, Sendable {
  /// a date was set (the wheel turned)
  public var set = false
  public var y = 2000
  /// 0–11
  public var m = 0
  public var d = 1
  public var today = (y: 2026, m: 0, d: 1)
  /// the months as the reader's language shortens them
  public var months: [String] = []
  /// the sign's line glyph once a full adult date is set
  public var sign: KLineGlyph?
  public init() {}

  public static func == (a: KObDob, b: KObDob) -> Bool {
    a.set == b.set && a.y == b.y && a.m == b.m && a.d == b.d && a.today == b.today && a.months == b.months && a.sign == b.sign
  }
}

public struct KObFaceItem: Equatable, Identifiable, Sendable {
  public var id: String
  public var image: KImageRef?
  public var a11y: String
  public init(id: String, image: KImageRef?, a11y: String) {
    self.id = id
    self.image = image
    self.a11y = a11y
  }
}

/// 5's "＋ Make yours" cell (only while the makeface switch is on).
public struct KObMakeFace: Equatable, Sendable {
  public enum State: String, Sendable { case free, used, yours }
  public var state: State = .free
  /// the face made, once it exists ("yours")
  public var image: KImageRef?
  /// what selecting it stores (TS's own value for the made face); "" while there is none
  public var id = ""
  public init() {}
}

public struct KObFaces: Equatable, Sendable {
  public var items: [KObFaceItem] = []
  public var selected = ""
  public var make: KObMakeFace?
  public init() {}
}

/// Your envelope as a stranger sees it (6, 8, the reveal strip).
public struct KObEnvelope: Equatable, Sendable {
  /// the session exists (the name and the window can be drawn)
  public var hasUid = false
  /// your courier name in your language
  public var name = ""
  public var frost: KFrostSpec?
  /// the face you picked on 5 (nil: none, or "Later")
  public var face: KImageRef?
  public var hasFace = false
  /// she/he answered (the mark's switch shows)
  public var mark: KLineGlyph?
  /// the sign from 3
  public var sign: KLineGlyph?
  public var showMark = true
  public var showSign = true
  /// 6's docket date (OCT.18) and 8's (OCT 18)
  public var date = ""
  public var envDate = ""
  public init() {}
}

/// 7's meter and key, from the letter as typed.
public struct KObLetter: Equatable, Sendable {
  /// weighted characters still missing (0 once it travels)
  public var left = 20
  public var fill: Double = 0
  /// lib/wren screenNow found no link, email or number
  public var clean = true
  public var ready = false
  /// the cue being dealt (the ↻ turns half a turn each)
  public var cueTurn = 0
  /// characters on the page (the flap egg twitches on each change and warms with it)
  public var len = 0
  public init() {}
}

public struct KObStampState: Equatable, Sendable {
  /// the stamp up big (the one picked, or the one the letter suggests)
  public var shown = ""
  /// 8a: today's tray (compose-model stampSections)
  public var sections: [KComposeStampSection] = []
  public init() {}
}

public struct KObHatch: Equatable, Sendable {
  /// where the crack is (window points): the Shell flood starts there
  public var flood: CGPoint?
  /// the chick is out (HatchStage onBorn)
  public var hatched = false
  /// the read-out's length (HATCH_READ_S)
  public var readS: Double = 4.6
  public init() {}
}

public struct KObName: Equatable, Sendable {
  /// the chick island's size (smaller while the keyboard is up)
  public var chick: CGFloat = 104
  /// the six ideas, in capitals
  public var ideas: [String] = []
  /// the name as typed, trimmed
  public var typed = ""
  public var pronoun = "she"
  /// "Wren" was typed (the courier's own name)
  public var reserved = false
  public init() {}
}

/// Everything one render of the run needs.
public struct KObContent: Equatable, Sendable {
  public var screen: KObScreen = .doorstep
  public var side: KObSide?
  public var ground: KObGround = .blue
  public var canAdvance = false
  public var hasBack = false
  /// the runner's "no fade": 1 straight from the launch, 2 straight from 1
  public var noFade = false
  public var demo = false
  /// this screen's words, by the names OnboardingNative gives them
  public var words: [String: String] = [:]
  public var shell = 0
  public var shells: [KObShellInfo] = []
  /// the nest egg's warmth pips lit, and its voice line
  public var pips = 0
  public var voice = ""
  /// 3x: the egg goes still
  public var still = false
  public var door = KObDoor()
  public var auth = KObAuth()
  public var dob = KObDob()
  /// 4: the answer picked before ("" none, or a skip)
  public var pronoun = ""
  public var faces = KObFaces()
  public var env = KObEnvelope()
  public var letter = KObLetter()
  public var stamp = KObStampState()
  public var hatch = KObHatch()
  public var name = KObName()
  /// 13: iOS refused before (Yes opens Settings)
  public var refused = false
  public init() {}

  /// a word by its name, or "" (a missing word is a blank, never a crash)
  func w(_ key: String) -> String { words[key] ?? "" }
}

/// What the run tells its owner: one channel, one object for the run's life.
///   type   what happened (OnboardingNative's switch lists them all)
///   s      a string that goes with it (an id, the words typed)
///   n      a number that goes with it (an index, a height)
public final class KObActions {
  public var onEvent: (_ type: String, _ s: String, _ n: Double) -> Void = { _, _, _ in }
  public init() {}

  func send(_ type: String, _ s: String = "", _ n: Double = 0) {
    onEvent(type, s, n)
  }
}

/// The run's fields, as long-lived as the view: seeded and focused by TS's commands.
public final class KObDriver: ObservableObject {
  public let letter = KFieldController()
  public let name = KFieldController()
  public let email = KFieldController()
  public let code = KFieldController()
  public let switchCode = KFieldController()

  public init() {}

  public func controller(_ target: String) -> KFieldController? {
    switch target {
    case "letter": return letter
    case "name": return name
    case "email": return email
    case "code": return code
    case "switchCode": return switchCode
    default: return nil
    }
  }

  public func blurAll() {
    [letter, name, email, code, switchCode].forEach { $0.blur() }
  }

  public var anyFocused: Bool { [letter, name, email, code, switchCode].contains { $0.isFocused } }
}
