import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, type HostInstance, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type Text, type View } from "react-native";
import type { KChatItem } from "../../../modules/kindredly-ui/src/Conversation";
import type { RenderWindow } from "../../lib/render-window";
import { indexOfKey } from "./build-items";
import { atBottomOf, follow, jumpsNow, settlesAtEnd, spendsOwn, staleKeys, type Follow, type FollowFacts } from "./follow";
import { useKeyboardSettle } from "./useKeyboardRN";

/* THE REACT NATIVE CONVERSATION'S LIST (10a step 5, slice chat-rn): the
   room and chat fallbacks' ScrollView, behaving as the SwiftUI list does.

   · A render window, like Swift's: the newest 80 rows, 80 more when the
     top comes within 600pt (useRenderWindow), so a 300-line room never
     mounts 300 rows with a menu Host each (MessageMenu, the cause of the
     jank). Older rows go in above without moving what you are reading:
     the ScrollView keeps the first visible row in place
     (maintainVisibleContentPosition), and the follow rule never answers a
     prepend.
   · It follows its end only while you are at it (screens/chat/follow):
     new lines, a translation landing, the keyboard, the trace tray and a
     growing composer all keep the newest line in sight at the end (spec
     bug 9), and none of them move someone reading further up. The first
     content opens at the newest line. An own send, a reply begun or a fold
     sent go to the end from anywhere (the window back at the newest first).
   · The keyboard (KeyboardAvoidingView animates its padding with
     LayoutAnimation, so the scrollToEnd onLayout runs lands on the frame's
     old height) and the tray (which rises the same way) are followed again
     once they have settled, when the reader was at the end as they began
     and no finger is on the list (settlesAtEnd).
   · A tapped quote widens the window to the line it quotes if it has to,
     scrolls to it once it is laid out and lights it for a moment
     (room/[id].tsx's 90pt above, opacity 0.5 for 1.4s), and VoiceOver's
     focus lands on the line it reached (KChatBubble's voFocus in SwiftUI).
     A row's position is used only while the row is mounted: one that left
     the window is forgotten, so a jump never lands on a stale y.

   Give the ScrollView `listProps`, each row `rowLayout(key)`, and each
   row's VoiceOver element `a11yRef(key)` (a fold half under its own key). */

/** a row's VoiceOver element: a Pressable, the View MessageMenu wraps, a Text */
export type A11yNode = View | Text;

/** how far down from the top the window grows (KConversation's reach) */
const REACH_TOP = 600;
/** a quote's line lands this far below the top of the list */
const JUMP_ABOVE = 90;
/** and stays lit this long */
const LIT_MS = 1400;
/** VoiceOver's focus moves once the jump's scroll has landed */
const FOCUS_AFTER_MS = 350;

export function useChatListRN(items: readonly KChatItem[], built: readonly KChatItem[], win: RenderWindow) {
  const scrollRef = useRef<ScrollView>(null);
  const st = useRef({
    atBottom: true,
    painted: false,
    ownPending: false,
    dragging: false,
    firstKey: undefined as string | undefined,
    lastKey: undefined as string | undefined,
    viewport: 0,
  });
  const rowY = useRef(new Map<string, number>());
  const pendingJump = useRef<string | null>(null);
  /** where VoiceOver should land after the jump: the quoted line itself (a fold half), else its row */
  const pendingFocus = useRef<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );
  const later = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, Math.max(0, ms));
    timers.current.add(id);
  }, []);

  /* each row's VoiceOver element, by key — one stable callback per key, so a re-render doesn't
     detach and re-attach every ref */
  const nodes = useRef(new Map<string, A11yNode>());
  const refFns = useRef(new Map<string, (node: A11yNode | null) => void>());
  const a11yRef = useCallback((key: string) => {
    let fn = refFns.current.get(key);
    if (!fn) {
      fn = (node: A11yNode | null) => {
        if (node) nodes.current.set(key, node);
        else nodes.current.delete(key);
      };
      refFns.current.set(key, fn);
    }
    return fn;
  }, []);

  /* rows that left the window are forgotten: their y belongs to an older, longer list, and a jump
     to one of them must wait for its fresh layout */
  useEffect(() => {
    const mounted = new Set<string>();
    for (const it of items) {
      mounted.add(it.key);
      for (const h of it.fold?.halves ?? []) mounted.add(h.key);
    }
    for (const k of staleKeys(rowY.current.keys(), mounted)) rowY.current.delete(k);
    for (const k of staleKeys(refFns.current.keys(), mounted)) {
      refFns.current.delete(k);
      nodes.current.delete(k);
    }
  }, [items]);

  const apply = (d: Follow) => {
    if (d === "none") return;
    scrollRef.current?.scrollToEnd({ animated: d === "glide" });
    st.current.atBottom = true;
  };

  const decide = (facts: FollowFacts) => {
    const d = follow(facts);
    if (spendsOwn(facts, d)) st.current.ownPending = false;
    if (d === "jump" && !st.current.painted) st.current.painted = true;
    apply(d);
  };

  const onContentSizeChange = (_w: number, h: number) => {
    const s = st.current;
    const firstKey = items[0]?.key;
    const lastKey = items[items.length - 1]?.key;
    const prepended = !!s.firstKey && firstKey !== s.firstKey && lastKey === s.lastKey;
    s.firstKey = firstKey;
    s.lastKey = lastKey;
    decide({ event: "content", painted: s.painted, hasContent: items.length > 0 && h > 0, atBottom: s.atBottom, ownPending: s.ownPending, prepended });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    const s = st.current;
    if (h === s.viewport) return;
    s.viewport = h;
    // never the first paint: before the rows are measured an end is no end, and the content's own
    // first change would then glide down from the top in front of the reader
    decide({ event: "viewport", painted: s.painted, hasContent: s.painted && items.length > 0, atBottom: s.atBottom, ownPending: false });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    st.current.atBottom = atBottomOf({ contentHeight: contentSize.height, offsetY: contentOffset.y, viewportHeight: layoutMeasurement.height });
    if (st.current.painted && contentOffset.y < REACH_TOP && win.hasMore) win.grow();
  };
  const onScrollBeginDrag = () => {
    st.current.dragging = true;
  };
  const onScrollEndDrag = () => {
    st.current.dragging = false;
  };

  /** to the end, gliding, once a motion that moved the list's height has settled — unless the
      reader has scrolled away (or holds the list) since it began */
  const settle = useCallback(() => {
    const s = st.current;
    if (!s.painted || s.dragging || !s.atBottom) return;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  // the keyboard: KeyboardAvoidingView's LayoutAnimation leaves onLayout's scrollToEnd short
  useKeyboardSettle(() => ({ painted: st.current.painted, atEnd: st.current.atBottom, dragging: st.current.dragging }), settle);
  /** a layout motion of `ms` (the tray rising or going) starts now: at the end now, at the end
      once it settled */
  const settleAfter = useCallback(
    (ms: number) => {
      const s = st.current;
      if (!settlesAtEnd({ painted: s.painted, atEndBefore: s.atBottom, dragging: s.dragging })) return;
      later(ms + 30, settle);
    },
    [later, settle],
  );

  /** go to the end after delayMs — an own send, a reply begun, a fold sent — from anywhere, the
      window back at the newest first */
  const requestEnd = useCallback(
    (animated: boolean, delayMs: number) => {
      st.current.ownPending = true;
      win.reset();
      later(delayMs, () => {
        scrollRef.current?.scrollToEnd({ animated });
        st.current.atBottom = true;
        st.current.ownPending = false;
      });
    },
    [win, later],
  );

  const light = (key: string) => {
    setLit(key);
    later(LIT_MS, () => setLit((cur) => (cur === key ? null : cur)));
  };

  const tryJump = () => {
    const key = pendingJump.current;
    if (!key) return;
    const y = rowY.current.get(key);
    if (y == null) return;
    const focusKey = pendingFocus.current ?? key;
    pendingJump.current = null;
    pendingFocus.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - JUMP_ABOVE), animated: true });
    light(key);
    // VoiceOver goes where the eye went: the quoted line (a fold half), else its row
    later(FOCUS_AFTER_MS, () => {
      const node = nodes.current.get(focusKey) ?? nodes.current.get(key);
      if (node) AccessibilityInfo.sendAccessibilityEvent(node as unknown as HostInstance, "focus");
    });
  };

  /** a tapped quote: to the line it quotes (a fold half finds its fold), widening the window first
      when the line is older than it — and then waiting for that row's own layout, never a position
      remembered from when it was last mounted */
  const jumpTo = (key: string) => {
    const index = indexOfKey(built, key);
    if (index < 0) return;
    const mounted = jumpsNow(index, win);
    win.include(index);
    pendingJump.current = built[index].key;
    pendingFocus.current = key;
    if (mounted) tryJump();
  };

  /** each row reports where it sits (a quote's jump lands on it) */
  const rowLayout = (key: string) => (e: LayoutChangeEvent) => {
    rowY.current.set(key, e.nativeEvent.layout.y);
    if (pendingJump.current === key) tryJump();
  };

  const listProps = {
    ref: scrollRef,
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    onContentSizeChange,
    onLayout,
    scrollEventThrottle: 32,
    // older rows going in above keep the row you are reading where it is
    maintainVisibleContentPosition: { minIndexForVisible: 0 },
    // a tap on a row's button works with the keyboard up; a tap on empty space puts it away
    keyboardShouldPersistTaps: "handled" as const,
    // a drag down the list takes the keyboard with it (the iOS chat norm)
    keyboardDismissMode: "interactive" as const,
    showsVerticalScrollIndicator: false,
  };

  return { scrollRef, listProps, rowLayout, a11yRef, lit, requestEnd, jumpTo, settleAfter };
}
