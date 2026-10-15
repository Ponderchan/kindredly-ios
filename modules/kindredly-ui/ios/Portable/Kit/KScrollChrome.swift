// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 SCROLL-DRIVEN CHROME without redrawing the list. Headers that shrink or hide as you scroll
 (Notes, Today's title turning into a postmark, Me's ME turning into the pen name), Kindreds'
 band that opens on a deep pull, chat's "at the bottom" and "near the top" all read the same few
 facts about one scroll view. If those facts lived in the screen's own @State, every frame of a
 scroll would redraw the whole screen, list and all. They live in a KScrollModel instead, which
 publishes only when a value it serves actually changes, and the views that read it are small
 children, never the screen:

     @StateObject private var chrome = KScrollModel(offsetCap: 120)

     ScrollView { LazyVStack { … } }
       .kScrollChrome(chrome)
       .overlay(alignment: .top) { NotesHeader(chrome: chrome) }   // reads chrome.offset

 What it publishes (all on the main thread, each only when it changes):
 - offset: how far the content has scrolled from its top, in points (contentOffset.y +
   contentInsets.top: 0 at rest, negative while pulled down past the top), rounded to
   `quantum` and clamped to ...offsetCap. A consumer that only cares about the first 120
   points sets offsetCap: 120, and the model goes quiet once past it: that is the "clamped per
   consumer" rule. Two consumers with different needs use two models (kScrollChrome takes
   several).
 - direction: .towardEnd or .towardTop, with a hysteresis (3pt by default): it only flips once
   the content has moved that far back from the furthest point it reached, so a trembling
   finger doesn't flash a hiding header. .none until the first move.
 - isAtBottom: the end of the content is within atBottomWithin (60) of the bottom of the view.
 - isNearTop: offset is within nearTopWithin (600), for paging older items in.
 - isInteracting: a finger is on the content (ScrollPhase .interacting).
 - pullDepth: while a finger is on the content, the deepest it has pulled past the top so far
   (a positive number of points); 0 otherwise. When the finger lifts, onPullRelease gets the
   deepest pull of that gesture (Kindreds opens its band past a threshold), then it goes back
   to 0.
 */
@MainActor
public final class KScrollModel: ObservableObject {
  /// Which way the content last moved, past the hysteresis.
  public enum Direction: Sendable {
    /// not moved yet
    case none
    /// toward the end of the content (the finger going up): headers hide
    case towardEnd
    /// back toward the top: headers come back
    case towardTop
  }

  @Published public private(set) var offset: CGFloat = 0
  @Published public private(set) var direction: Direction = .none
  @Published public private(set) var isAtBottom = true
  @Published public private(set) var isNearTop = true
  @Published public private(set) var isInteracting = false
  @Published public private(set) var pullDepth: CGFloat = 0

  /// The deepest pull of a gesture, when the finger lifts (points past the top, > 0). Set by
  /// the owner; called on the main thread.
  public var onPullRelease: ((CGFloat) -> Void)?

  private let offsetCap: CGFloat
  private let quantum: CGFloat
  private let hysteresis: CGFloat
  private let atBottomWithin: CGFloat
  private let nearTopWithin: CGFloat
  /// the furthest point reached in the current direction, which a reversal is measured from
  private var anchor: CGFloat?
  private var deepestPull: CGFloat = 0

  /// - Parameters:
  ///   - offsetCap: the largest offset published; past it the model stops publishing offset
  ///   - quantum: offset is rounded to this many points (1 by default)
  ///   - hysteresis: how far the content must come back before direction flips (3)
  ///   - atBottomWithin: isAtBottom within this many points of the end (60)
  ///   - nearTopWithin: isNearTop within this many points of the top (600)
  public init(offsetCap: CGFloat = .infinity, quantum: CGFloat = 1, hysteresis: CGFloat = 3, atBottomWithin: CGFloat = 60, nearTopWithin: CGFloat = 600) {
    self.offsetCap = offsetCap
    self.quantum = max(0.5, quantum)
    self.hysteresis = hysteresis
    self.atBottomWithin = atBottomWithin
    self.nearTopWithin = nearTopWithin
  }

  /// One frame's facts (the modifier calls this; a test may too).
  /// - Parameters:
  ///   - offset: contentOffset.y + contentInsets.top
  ///   - distanceToBottom: how far the end of the content is below the bottom of the view
  func update(offset raw: CGFloat, distanceToBottom: CGFloat) {
    let q = (min(raw, offsetCap) / quantum).rounded() * quantum
    if q != offset { offset = q }

    // direction, measured from the furthest point reached
    if let a = anchor {
      let moved = raw - a
      switch direction {
      case .towardEnd where raw > a, .towardTop where raw < a:
        anchor = raw
      default:
        if moved > hysteresis {
          if direction != .towardEnd { direction = .towardEnd }
          anchor = raw
        } else if moved < -hysteresis {
          if direction != .towardTop { direction = .towardTop }
          anchor = raw
        }
      }
    } else {
      anchor = raw
    }

    let bottom = distanceToBottom <= atBottomWithin
    if bottom != isAtBottom { isAtBottom = bottom }
    let top = raw <= nearTopWithin
    if top != isNearTop { isNearTop = top }

    if isInteracting, raw < 0 {
      let depth = -raw
      if depth > deepestPull {
        deepestPull = depth
        let qd = (depth / quantum).rounded() * quantum
        if qd != pullDepth { pullDepth = qd }
      }
    }
  }

  /// A finger went down on the content, or lifted (the modifier calls this).
  func setInteracting(_ now: Bool) {
    guard now != isInteracting else { return }
    isInteracting = now
    if now {
      deepestPull = 0
    } else {
      let depth = deepestPull
      deepestPull = 0
      if pullDepth != 0 { pullDepth = 0 }
      if depth > 0 { onPullRelease?(depth) }
    }
  }
}

/// The facts read from a scroll view's geometry each frame.
struct KScrollFacts: Equatable {
  var offset: CGFloat
  var distanceToBottom: CGFloat
}

public extension View {
  /// Feeds this scroll view's offset, direction, ends and pulls to the models (see the note at
  /// the top of KScrollChrome.swift). Put it on the ScrollView itself.
  func kScrollChrome(_ models: KScrollModel...) -> some View {
    modifier(KScrollChromeModifier(models: models))
  }
}

struct KScrollChromeModifier: ViewModifier {
  let models: [KScrollModel]

  func body(content: Content) -> some View {
    content
      .onScrollGeometryChange(for: KScrollFacts.self) { geo in
        let offset = geo.contentOffset.y + geo.contentInsets.top
        let maxOffset = geo.contentSize.height + geo.contentInsets.bottom - geo.containerSize.height
        // rounded to half a point, so a still view doesn't call the models every frame
        return KScrollFacts(
          offset: (offset * 2).rounded() / 2,
          distanceToBottom: (max(0, maxOffset - geo.contentOffset.y) * 2).rounded() / 2
        )
      } action: { _, facts in
        for model in models {
          model.update(offset: facts.offset, distanceToBottom: facts.distanceToBottom)
        }
      }
      .onScrollPhaseChange { _, phase in
        let interacting = phase == .interacting
        for model in models {
          model.setInteracting(interacting)
        }
      }
  }
}
