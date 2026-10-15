import { Component, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { AppState, View, type StyleProp, type ViewStyle } from "react-native";
import { useIsFocused } from "expo-router";
import { Host } from "@expo/ui/swift-ui";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui";
import { armNative, clearNative, nativeOn, surfacesReady, surfacesSettled, useNativeSurface, type NativeSurfaceKey } from "../lib/surfaces";
import { useTheme } from "../lib/theme";

/* ONE SWITCH IN FRONT OF EVERY SWIFT SCREEN (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   Every screen drawn in SwiftUI keeps the React Native screen it replaces,
   and this picks between them:

     <NativeSurface
       surface="today" view="KTodayView" mode="mount"
       native={() => <SurfaceHost field>…<KToday …/></SurfaceHost>}
       fallback={() => <TodayRN …/>}
     />

   The React Native screen is drawn when ANY of these holds:
     · nativeOn(surface) is false — NATIVE_DEFAULTS, or a row in
       app_surfaces (lib/surfaces), or the crash breadcrumb below;
     · the binary doesn't have the Swift view (isKindredlyUIViewAvailable:
       a dev client built before the view existed, any pre-1.3.0 binary);
     · the Swift path threw a JS error (caught here; that surface stays
       React Native for the rest of this process);
     · the screen crashed the app while opening on the last two launches
       that tried it, on this binary.

   It chooses only once the phone's own answers are in (surfacesReady():
   a local read, never the network), so a cold start from a push can't pick
   Swift past a kill row the phone already has. Until then — a few
   milliseconds, and only for a screen that mounts in the app's first
   moments — it draws `pending` (the theme's page colour by default).

   TWO MODES.
     "mount"  decides once and never changes under the reader. For anything
              holding a field or a draft: room, chat, today, compose,
              settings, editprofile.
     "live"   follows the table, but swaps only while the screen is not
              focused (a tab in the background, a page under a push), so a
              kill row reaches a running app without yanking a screen out
              from under a thumb. For kindreds, notes, me.

   THE CRASH BREADCRUMB. Before the Swift path mounts, armNative(surface)
   writes a mark and waits for it to reach the disk (the screen draws
   `pending` for that moment). The Host's first onLayoutContent starts a
   3s clock, and the mark is cleared when it runs out — or 1s after the
   screen goes away sooner, or when the app goes to the background after
   it has laid out, or after 6s whatever happens, so a screen that never
   reports a layout can't be blamed for a phone simply being closed. A mark
   still set at the next launch is a strike (lib/surfaces-resolve).

   Hand the screen's one Host the clearing callback in either of two ways:
   draw it with <SurfaceHost> (which also sets the 10a Host defaults), or
   pass `host.onLayoutContent` from the native render's argument (or
   useSurfaceHost()) to your own <Host onLayoutContent>. */

/* the arming mark's clocks */
const CLEAR_AFTER_LAYOUT_MS = 3000;
const CLEAR_AFTER_UNMOUNT_MS = 1000;
const CLEAR_ANYWAY_MS = 6000;
/* the longest a screen waits for the phone's own answers before choosing
   with what it has (they resolve in milliseconds; this is a guard) */
const READY_CAP_MS = 1500;

/* surfaces whose Swift path threw in this process: React Native until the
   next launch (a JS error in a renderer tends to repeat; the fallback is a
   full screen) */
const jsFailed = new Set<string>();

type LayoutEvent = { nativeEvent: { width: number; height: number } };

/** What the native render gets: hand onLayoutContent to the screen's one
    Host (SurfaceHost does it for you). */
export type SurfaceHostLink = {
  /** the surface key this Swift screen is drawn for */
  surface: string;
  /** pass to <Host onLayoutContent>; clears the crash breadcrumb once the
      Swift screen has laid out and stood for a few seconds */
  onLayoutContent: (e: LayoutEvent) => void;
};

const SurfaceCtx = createContext<SurfaceHostLink | null>(null);

/** The surrounding NativeSurface's Host link, for a Host placed deeper than
    the native render itself. null outside a NativeSurface's Swift path. */
export function useSurfaceHost(): SurfaceHostLink | null {
  return useContext(SurfaceCtx);
}

export type NativeSurfaceProps = {
  /** the app_surfaces key (lib/surfaces NATIVE_DEFAULTS) */
  surface: NativeSurfaceKey;
  /** the KindredlyUI view the Swift path draws ("KTodayView"); checked
      against the binary before the Swift path is chosen */
  view: string;
  /** "mount" decides once; "live" follows the table while unfocused (see above) */
  mode: "mount" | "live";
  /** the Swift screen: one Host (SurfaceHost) holding the view and its
      React Native islands; React Native overlays may sit beside it. Called
      inside a component of its own, within the error boundary (it may use
      hooks, though a component returned from it is tidier). */
  native: (host: SurfaceHostLink) => ReactNode;
  /** the React Native screen, complete and themed (called the same way) */
  fallback: () => ReactNode;
  /** drawn while the phone's answers are read and the mark is written
      (a frame or two at most); default: the theme's page colour */
  pending?: () => ReactNode;
};

/** The switch in front of a Swift screen — see the comment above. */
export function NativeSurface(props: NativeSurfaceProps) {
  return props.mode === "live" ? <LiveSurface {...props} /> : <SurfaceBody {...props} follow={false} focused />;
}

/* useIsFocused needs a navigator, so only the live mode asks for it */
function LiveSurface(props: NativeSurfaceProps) {
  const focused = useIsFocused();
  const on = useNativeSurface(props.surface); // re-renders when the table or the breadcrumb changes
  return <SurfaceBody {...props} follow focused={focused} on={on} />;
}

type Phase = "wait" | "rn" | "arming" | "native";

function SurfaceBody({
  surface,
  view,
  native,
  fallback,
  pending,
  follow,
  focused,
  on,
}: NativeSurfaceProps & { follow: boolean; focused: boolean; on?: boolean }) {
  const { t: tk } = useTheme();
  const choose = useCallback(() => nativeOn(surface) && !jsFailed.has(surface) && isKindredlyUIViewAvailable(view), [surface, view]);
  const [phase, setPhase] = useState<Phase>(() => (surfacesSettled() ? (choose() ? "arming" : "rn") : "wait"));

  // the phone's answers, then the choice
  useEffect(() => {
    if (phase !== "wait") return;
    let alive = true;
    let capTimer: ReturnType<typeof setTimeout> | undefined;
    const cap = new Promise<void>((done) => {
      capTimer = setTimeout(done, READY_CAP_MS);
    });
    void Promise.race([surfacesReady(), cap]).then(() => {
      if (alive) setPhase(choose() ? "arming" : "rn");
    });
    return () => {
      alive = false;
      clearTimeout(capTimer);
    };
  }, [phase, choose]);

  // the mark on disk, then the Swift screen
  useEffect(() => {
    if (phase !== "arming") return;
    let alive = true;
    void armNative(surface).then(() => {
      if (alive) setPhase("native");
      else clearNative(surface); // gone before it mounted: nothing opened, nothing to blame
    });
    return () => {
      alive = false;
    };
  }, [phase, surface]);

  // live mode: follow the table, but only while nobody is looking
  useEffect(() => {
    if (!follow || focused || (phase !== "rn" && phase !== "native")) return;
    const want = choose();
    if (want && phase === "rn") setPhase("arming");
    else if (!want && phase === "native") setPhase("rn");
  }, [follow, focused, on, phase, choose]);

  const onLayoutContent = useClearOnStand(surface, phase === "native");
  const link = useMemo<SurfaceHostLink>(() => ({ surface, onLayoutContent }), [surface, onLayoutContent]);

  const onJsError = useCallback(() => {
    jsFailed.add(surface);
    setPhase("rn");
  }, [surface]);

  if (phase === "rn") return <Render key="rn" fn={fallback} />;
  if (phase === "native")
    return (
      <SurfaceCtx.Provider value={link}>
        <SurfaceBoundary surface={surface} onError={onJsError}>
          <Render key="native" fn={() => native(link)} />
        </SurfaceBoundary>
      </SurfaceCtx.Provider>
    );
  return pending ? <Render key="pending" fn={pending} /> : <View style={{ flex: 1, backgroundColor: tk.bg }} />;
}

/* Each render prop is called inside a component of its own, never in
   SurfaceBody: so the native one throws INSIDE the boundary (an error while
   building the Swift screen's props is caught too), and a render prop that
   calls hooks keeps them in its own component rather than adding them to
   SurfaceBody's on one phase and not the next. */
function Render({ fn }: { fn: () => ReactNode }) {
  return <>{fn()}</>;
}

/* The arming mark's clearing, for one stretch of the Swift path being
   mounted. Returns the Host's onLayoutContent. */
function useClearOnStand(surface: string, active: boolean): (e: LayoutEvent) => void {
  const st = useRef({ laidOut: false, cleared: true, standTimer: null as ReturnType<typeof setTimeout> | null });

  const clearNow = useCallback(() => {
    const s = st.current;
    if (s.cleared) return;
    s.cleared = true;
    if (s.standTimer) clearTimeout(s.standTimer);
    s.standTimer = null;
    clearNative(surface);
  }, [surface]);

  useEffect(() => {
    if (!active) return;
    const s = st.current;
    s.laidOut = false;
    s.cleared = false;
    const anyway = setTimeout(clearNow, CLEAR_ANYWAY_MS);
    const sub = AppState.addEventListener("change", (a) => {
      if (a === "background" && s.laidOut) clearNow();
    });
    return () => {
      clearTimeout(anyway);
      sub.remove();
      if (s.standTimer) clearTimeout(s.standTimer);
      s.standTimer = null;
      if (!s.cleared) {
        // gone without taking the app down — but a crash while tearing the
        // Host down (the focus/unmount family) still has a second to land
        s.cleared = true;
        setTimeout(() => clearNative(surface), CLEAR_AFTER_UNMOUNT_MS);
      }
    };
  }, [active, surface, clearNow]);

  return useCallback(
    (_e: LayoutEvent) => {
      const s = st.current;
      if (s.laidOut || s.cleared) return;
      s.laidOut = true;
      s.standTimer = setTimeout(clearNow, CLEAR_AFTER_LAYOUT_MS);
    },
    [clearNow],
  );
}

/* A JS error anywhere in the Swift path hands the screen to React Native.
   It draws nothing itself once it has caught (the parent switches to the
   fallback outside it), so an error in the fallback is never caught here
   and can't loop. */
class SurfaceBoundary extends Component<{ surface: string; onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.warn(`[surfaces] the SwiftUI ${this.props.surface} screen threw; drawing React Native instead for this session:`, error, info.componentStack);
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/* ── SurfaceHost: the one Host of a Swift screen, with the 10a defaults ──
   (foundation list_host_pattern):
     · fills the screen (flex 1) — never matchContents on a scroll axis;
     · ignores every safe area — the screen gets its room as props
       (useScreenInsets) — except the keyboard's when it holds a field
       (`field`: ignoreSafeArea "container", so the hosting controller keeps
       the keyboard region and the dock rides the keyboard natively);
     · light or dark from the theme, so system-drawn parts (menus, the
       keyboard, context-menu previews) match;
     · reports its first layout to the crash breadcrumb.
   ONE per screen: never one per row. */
export function SurfaceHost({
  field = false,
  style,
  pointerEvents,
  onLayoutContent,
  children,
}: {
  /** the screen holds a text field: keep the keyboard's safe area */
  field?: boolean;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
  /** also told of every content layout (after the breadcrumb is) */
  onLayoutContent?: (e: LayoutEvent) => void;
  children: ReactNode;
}) {
  const link = useContext(SurfaceCtx);
  const { dark } = useTheme();
  const linkLayout = link?.onLayoutContent;
  const onLayout = useCallback(
    (e: LayoutEvent) => {
      linkLayout?.(e);
      onLayoutContent?.(e);
    },
    [linkLayout, onLayoutContent],
  );
  return (
    <Host
      style={[{ flex: 1 }, style]}
      ignoreSafeArea={field ? "container" : "all"}
      colorScheme={dark ? "dark" : "light"}
      pointerEvents={pointerEvents}
      onLayoutContent={onLayout}
    >
      {children}
    </Host>
  );
}
