import SwiftUI

/*
 THE COMMAND BUS: the imperative channel from TypeScript into a step-5 screen view.

 Why a channel at all: every prop change makes the virtual view convert the WHOLE props map
 (all keys, not only the changed one) from folly to ObjC, deep-compare each key and re-run the
 adapter's body (expo-modules-core SwiftUIVirtualViewSharedImpl+Private.h:77-95,
 SwiftUIViewProps.swift:55-78). So state that changes often never rides on props: composer
 canSend, playback, focus and blur, scroll requests, text seeds. TS sends those through the
 view's "command" AsyncFunction (registered for every screen in KindredlyUIModule.swift), which
 lands here as send(name, args), and the view reacts without a props round.

 The JS side is modules/kindredly-ui/src/commands.ts (useKCommands), which queues until the
 native view exists and sends the queue from the view's ref callback the moment it attaches
 (commands.ref); this side buffers until a SwiftUI view listens. Between the two, a command sent
 before the view mounted (in the mounting render, from a mount effect, while a NativeSurface
 was still arming) still arrives, in order.

 Rules:
 - Delivery is on the main thread, in the order sent. The AsyncFunction already runs on main
   (expo forces view functions onto the main queue: SwiftUIViewDefinitionBuilder.swift:32-46);
   a send from any other thread is hopped onto main first.
 - While nobody listens, commands are kept (the last 100) and replayed, in order, on the next
   main-queue turn after the first listener attaches. That covers commands sent before the
   view appeared and while it was off screen (a tab's view disappears when another tab is
   shown; the Kindreds "reset" on blur still arrives when it comes back).
 - Every listener gets every command. A listener ignores the names it doesn't know.

 The standard names screens use, with their args (JS numbers arrive as Double/NSNumber; read
 them with the k* helpers below, which accept either):
 - setText  { target: String, value: String }      seed or restore a KField's text
 - focus    { target: String }                     focus a field by its target name
 - blur     { }                                     drop focus from every field of the screen
 - scrollTo { key: String | "end" | "top", animated: Bool }   see KScrollRequest
 - playback { key, playing, positionS, durationS, at (ms since 1970) }   voice card state
 - composer { … }                                   screen-specific composer state
 - reset    { }                                     back to the screen's resting state
 KCommandName holds them as constants.

 Adapter-side only (it is reached through the Expo AsyncFunction); the Portable views never see
 the bus, they get plain values and closures from their adapter.
 */

/// The standard command names (see the list at the top of KCommandBus.swift). Screens may add
/// their own names; these are the shared ones, spelled once.
enum KCommandName {
  static let setText = "setText"
  static let focus = "focus"
  static let blur = "blur"
  static let scrollTo = "scrollTo"
  static let playback = "playback"
  static let composer = "composer"
  static let reset = "reset"
}

/// The imperative channel into one screen view. KScreenProps owns one (`props.commands`); the
/// view listens with `.onKCommand(props.commands) { name, args in … }`, or an adapter-side
/// controller with `subscribe`.
final class KCommandBus {
  typealias Handler = (_ name: String, _ args: [String: Any]) -> Void

  /// How many commands are kept while nobody listens; the oldest go first past this.
  static let bufferLimit = 100

  private var listeners: [Int: Handler] = [:]
  private var nextId = 0
  private var buffer: [(name: String, args: [String: Any])] = []
  /// a replay is scheduled: new sends join the buffer behind it, so the order holds
  private var replayPending = false

  init() {}

  /// Delivers a command to every listener, on the main thread. Kept for later while there is
  /// no listener (see the rules at the top of the file).
  func send(_ name: String, _ args: [String: Any] = [:]) {
    guard Thread.isMainThread else {
      DispatchQueue.main.async { [weak self] in self?.send(name, args) }
      return
    }
    if listeners.isEmpty || replayPending {
      buffer.append((name, args))
      if buffer.count > Self.bufferLimit {
        buffer.removeFirst(buffer.count - Self.bufferLimit)
      }
      return
    }
    deliver(name, args)
  }

  /// Attaches a listener; the returned subscription detaches it when cancelled or released.
  /// Commands kept while nobody listened are replayed on the next main-queue turn. Main thread only.
  func subscribe(_ handler: @escaping Handler) -> KCommandSubscription {
    assert(Thread.isMainThread, "KCommandBus.subscribe off the main thread")
    let id = nextId
    nextId += 1
    listeners[id] = handler
    if !buffer.isEmpty && !replayPending {
      replayPending = true
      DispatchQueue.main.async { [weak self] in self?.replay() }
    }
    return KCommandSubscription { [weak self] in self?.listeners[id] = nil }
  }

  private func replay() {
    replayPending = false
    // nobody left by the time the turn came: keep them for the next listener
    guard !listeners.isEmpty else { return }
    let pending = buffer
    buffer.removeAll()
    for command in pending {
      deliver(command.name, command.args)
    }
  }

  private func deliver(_ name: String, _ args: [String: Any]) {
    // a snapshot, so a handler that subscribes or cancels doesn't upset the loop
    for handler in listeners.values {
      handler(name, args)
    }
  }
}

/// A listener's place on a KCommandBus. Cancel it, or let it go: either detaches the listener.
final class KCommandSubscription {
  private var onCancel: (() -> Void)?

  init(_ onCancel: @escaping () -> Void) {
    self.onCancel = onCancel
  }

  func cancel() {
    onCancel?()
    onCancel = nil
  }

  deinit {
    cancel()
  }
}

// MARK: - Listening from a SwiftUI view

extension View {
  /// Calls `handler` for every command sent to `bus` while this view is on screen, on the main
  /// thread. Commands sent before it appeared (or while it was away) are replayed in order just
  /// after it appears. The latest `handler` is always the one called, so it may read values the
  /// body computed.
  ///
  ///     .onKCommand(props.commands) { name, args in
  ///       switch name {
  ///       case KCommandName.scrollTo: if let request = KScrollRequest(args) { … }
  ///       case KCommandName.blur: controller.blur()
  ///       default: break
  ///       }
  ///     }
  func onKCommand(_ bus: KCommandBus, perform handler: @escaping KCommandBus.Handler) -> some View {
    modifier(KCommandListener(bus: bus, handler: handler))
  }
}

private struct KCommandListener: ViewModifier {
  let bus: KCommandBus
  let handler: KCommandBus.Handler
  @State private var box = KCommandListenerBox()

  func body(content: Content) -> some View {
    // not a state change: the box is a plain object, so this doesn't invalidate the view
    box.handler = handler
    return content
      .onAppear { box.attach(to: bus) }
      .onDisappear { box.detach() }
  }
}

private final class KCommandListenerBox {
  var handler: KCommandBus.Handler?
  private var subscription: KCommandSubscription?
  private weak var bus: KCommandBus?

  func attach(to bus: KCommandBus) {
    if subscription != nil && self.bus === bus { return }
    detach()
    self.bus = bus
    subscription = bus.subscribe { [weak self] name, args in self?.handler?(name, args) }
  }

  func detach() {
    subscription?.cancel()
    subscription = nil
  }
}

// MARK: - Reading args

/// The `scrollTo` command's target: { key: "top" | "end" | <an item key>, animated: Bool }.
enum KScrollRequest: Equatable {
  case top
  case end
  case key(String)

  /// nil when the args carry no usable key
  init?(_ args: [String: Any]) {
    guard let key = args.kString("key"), !key.isEmpty else { return nil }
    switch key {
    case "top": self = .top
    case "end": self = .end
    default: self = .key(key)
    }
  }
}

extension Dictionary where Key == String, Value == Any {
  /// A string arg; nil when absent or not a string.
  func kString(_ key: String) -> String? {
    self[key] as? String
  }

  /// A number arg as Double, from any JS number (NSNumber, Double, Int); nil when absent.
  func kDouble(_ key: String) -> Double? {
    // Double, Int and NSNumber all bridge to NSNumber
    (self[key] as? NSNumber)?.doubleValue
  }

  /// A number arg rounded toward zero to Int; nil when absent, not finite, or past Int's range
  /// (Int(_:) would trap on, say, 1e20 or a nanosecond timestamp sent by mistake).
  func kInt(_ key: String) -> Int? {
    guard let d = kDouble(key), d.isFinite else { return nil }
    return Int(exactly: d.rounded(.towardZero))
  }

  /// A boolean arg; JS booleans arrive as Bool (or NSNumber 0/1). nil when absent.
  func kBool(_ key: String) -> Bool? {
    (self[key] as? NSNumber)?.boolValue
  }

  /// A JS timestamp (milliseconds since 1970, as Date.now() gives) as a Date; nil when absent.
  func kDate(_ key: String) -> Date? {
    guard let ms = kDouble(key), ms.isFinite else { return nil }
    return Date(timeIntervalSince1970: ms / 1000)
  }

  /// A nested object arg; nil when absent or not an object.
  func kObject(_ key: String) -> [String: Any]? {
    self[key] as? [String: Any]
  }
}
