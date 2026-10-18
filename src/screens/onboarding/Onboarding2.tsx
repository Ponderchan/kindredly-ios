import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LaunchFrame, takeLaunchHandoff, type LaunchHandoff } from "../../components/LaunchAnimation";
import { readPerm } from "../../components/NotifyBanner";
import { useAuth } from "../../lib/auth";
import { starterStamp } from "../../lib/hatch-engine";
import { getLang, t, useLang } from "../../lib/i18n";
import { isPronounId } from "../../lib/pronouns";
import { demoContext, demoOn, devConfig, seedDraftFor, takeDevStart, type DevStart } from "./dev";
import * as block from "./device-block";
import * as drafts from "./draft-store";
import {
  SCREENS,
  addressDone as flowAddressDone,
  advance as flowAdvance,
  back as flowBack,
  canAdvance as flowCanAdvance,
  dayOf,
  eggPlace,
  enter,
  finishPayload,
  gate,
  groundOf,
  jump,
  pipsLit,
  signedIn as flowSignedIn,
  skip as flowSkip,
  voiceKey,
  type AddressChoice,
  type Effect,
  type Move,
  type NotifState,
  type ObCtx,
  type ObDraft,
  type SideId,
} from "./flow";
import { Ground } from "./parts/grounds";
import { nestTop } from "./parts/frame";
import { NestEgg } from "./parts/nest-egg";
import { FONT, OB } from "./parts/tokens";
import { SCREEN_COMPONENTS } from "./screens";
import { useObServices } from "./services";
import { ObRunContext, type ObScreenProps } from "./types";
import "../../data/strings-onboarding2";
import { OB_MAX_FONT } from "./parts/tokens";

/* THE NEW ONBOARDING'S RUNNER (storyboard 2026-10-18; identity switch on).
   ────────────────────────────────────────────────────────────────────────
   app/onboarding renders this when the identity switch is on (or its dev
   preview). It holds the draft and "who is here", asks the flow (flow.ts)
   what every press means, carries out what the flow returns — the
   anonymous session, the block, the post, the notification prompt, the
   arrival — through the services (real, or the DEMO stubs: on by default in
   a dev build, screens/onboarding/dev), and draws the current screen from
   the registry (screens/index.ts) on its ground.

   WHAT IT DRAWS, besides the screen:
   · the GROUND (parts/grounds), which also sets the status bar's text;
   · on 3–6 and 8, ONE persistent NestEgg in the frame's nest slot (parts/
     frame nestTop), outside the keyed screen, so it never remounts as the
     screens change under it and a pip lights where the eye already is;
   · until the context and the draft are known, the launch's last frame
     (LaunchFrame) — so straight from the launch, nothing blinks;
   · in demo, a small DEMO tag at the top right.

   WHO IS HERE. Real: from lib/auth (no session / anonymous / a real account,
   the uid, the profile's onboarded flag or this phone's own note that this
   uid finished, the account's known answers) plus two reads from the phone
   (iOS's notification state, the under-18 block). Demo: the dev entry's
   variant, moved by the stubs.

   WAITING FOR THE ACCOUNT. A sign-in on 1a and a link or switch on 11 land
   through onAuthStateChange a moment after the call returns, so signedIn()
   and addressDone() wait (up to four seconds) for the context to show the
   account before asking the flow — which needs it to choose Today or 2, and
   to know whose answers win in finish(). The post (12) is computed from the
   context as it is when 12 begins.

   THE ANONYMOUS SESSION. Made when 3 passes (the flow's effect). If that
   fails (offline), it is tried again on every screen change and every five
   seconds while past the gate without one; 6 shows "Your courier is
   thinking of a name…" until a uid exists (the screen reads props.uid). */

type RunState = { draft: ObDraft; side: SideId | null };

/** The real context, or null until the phone's own reads are in. */
function useRealCtx(active: boolean): ObCtx | null {
  const auth = useAuth();
  const [notif, setNotif] = useState<NotifState | null>(active ? null : "unknown");
  const [blocked, setBlocked] = useState<boolean | null>(active ? null : false);
  const [finished, setFinished] = useState<string | null | undefined>(active ? undefined : null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const readNotif = () =>
      readPerm()
        .then((p) => alive && setNotif(p))
        .catch((e) => {
          console.warn("[onboarding] notification permission unreadable:", e);
          if (alive) setNotif("unknown");
        });
    void readNotif();
    void block.isBlocked(false).then((b) => alive && setBlocked(b));
    void drafts.finishedUid(false).then((u) => alive && setFinished(u));
    // back from Settings (13 after a refusal) or the system prompt: read it again
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") void readNotif();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [active]);

  const { session, user, onboarded, profile } = auth;
  const uid = user?.id ?? null;
  const account: ObCtx["account"] = !session ? "none" : user?.is_anonymous ? "guest" : "member";
  const p = profile as Record<string, unknown>;
  return useMemo(() => {
    if (!active || notif === null || blocked === null || finished === undefined || !auth.ready) return null;
    return {
      account,
      uid,
      onboarded: account !== "none" && (onboarded || (!!uid && finished === uid)),
      known:
        account === "member"
          ? {
              dob: typeof p.dob === "string" ? p.dob : null,
              pronoun: isPronounId(p.pronoun) ? p.pronoun : null,
              avatarId: typeof p.avatarId === "string" ? p.avatarId : null,
              showMark: typeof p.showMark === "boolean" ? p.showMark : null,
              showSign: typeof p.showSign === "boolean" ? p.showSign : null,
            }
          : {},
      notif,
      blocked,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, notif, blocked, finished, auth.ready, account, uid, onboarded, p.dob, p.pronoun, p.avatarId, p.showMark, p.showSign]);
}

export default function Onboarding2() {
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const [demo] = useState(demoOn); // fixed for this run
  const [devStart] = useState<DevStart | null>(() => (__DEV__ ? takeDevStart() : null));
  // the launch's note is read once, at mount (takeLaunchHandoff consumes it)
  const [firstHandoff] = useState<LaunchHandoff | null>(takeLaunchHandoff);
  const handoffRef = useRef<LaunchHandoff | null>(firstHandoff);

  /* ── who is here ── */
  /* demo: the dev entry's variant, plus the demo's own remembered block (so 3x in one demo
     run is still 3x in the next, as on a real phone) */
  const [demoCtx, setDemoCtx] = useState<ObCtx | null>(null);
  const demoRead = useRef(false); // once per run: a Fast Refresh re-runs effects, and must not reset who is here mid-run
  useEffect(() => {
    if (!demo || demoRead.current) return;
    demoRead.current = true;
    void block.isBlocked(true).then((b) => {
      const c = demoContext(devConfig());
      setDemoCtx({ ...c, blocked: c.blocked || b });
    });
  }, [demo]);
  const realCtx = useRealCtx(!demo);
  const ctx = demo ? demoCtx : realCtx;
  const patchDemoCtx = useCallback((p: Partial<ObCtx>) => setDemoCtx((c) => (c ? { ...c, ...p } : c)), []);
  const services = useObServices({ demo, patchDemoCtx });

  /* ── the run ── */
  const [run, setRun] = useState<RunState | null>(null);
  const runRef = useRef<RunState | null>(null);
  runRef.current = run;
  const ctxRef = useRef<ObCtx | null>(ctx);
  ctxRef.current = ctx;
  const finishP = useRef<Promise<void>>(Promise.resolve());
  const booted = useRef(false);
  const leaving = useRef(false);

  const runEffects = useCallback(
    async (fx: Effect[], d: ObDraft) => {
      for (const e of fx) {
        try {
          switch (e.kind) {
            case "track":
              services.track(e.step, e.i);
              break;
            case "anon-session":
              void ensureSession.current();
              break;
            case "remember-block":
              await services.rememberBlock();
              break;
            case "drop-session":
              await services.dropGuestSession();
              break;
            case "post": {
              const c = ctxRef.current;
              if (!c) break;
              const payload = finishPayload(d, c, { lang: getLang(), suggestedStamp: starterStamp(null, d.letter) });
              finishP.current = services.finish(payload).catch((err) => console.warn("[onboarding] finish failed:", err));
              break;
            }
            case "ask-notifications":
              await services.askNotifications();
              break;
            case "open-notification-settings":
              await services.openNotificationSettings();
              break;
            case "arrive":
              if (leaving.current) break;
              leaving.current = true;
              await finishP.current;
              await services.arrive(ctxRef.current?.uid ?? d.uid);
              break;
            case "today":
              if (leaving.current) break;
              leaving.current = true;
              await services.today();
              break;
          }
        } catch (err) {
          console.warn(`[onboarding] effect ${e.kind} failed:`, err);
        }
      }
    },
    [services],
  );

  const apply = useCallback(
    (m: Move) => {
      const next = { draft: m.draft, side: m.side };
      runRef.current = next; // a press right after this one reads the new state, not the last render's
      setRun(next);
      void runEffects(m.effects, m.draft);
    },
    [runEffects],
  );

  /* the anonymous session: made when 3 passes, retried while past the gate without one */
  const creating = useRef(false);
  const ensureSession = useRef(async () => {});
  ensureSession.current = async () => {
    const c = ctxRef.current;
    const r = runRef.current;
    if (!c || !r || c.account !== "none" || c.blocked || creating.current) return;
    if (r.side === "underage" || gate(r.draft.dob, dayOf(new Date())) !== "adult") return;
    creating.current = true;
    try {
      await services.createAnonSession();
    } finally {
      creating.current = false;
    }
  };
  const pastGate = !!run && SCREENS.indexOf(run.draft.screen) > SCREENS.indexOf("birthday");
  useEffect(() => {
    if (!pastGate || ctx?.account !== "none") return;
    void ensureSession.current();
    const id = setInterval(() => void ensureSession.current(), 5000);
    return () => clearInterval(id);
  }, [pastGate, ctx?.account, run?.draft.screen]);

  /* the draft learns its uid as soon as there is one */
  useEffect(() => {
    if (!run || !ctx?.uid || ctx.account === "none" || run.draft.uid) return;
    setRun((r) => (r ? { ...r, draft: { ...r.draft, uid: ctx.uid } } : r));
  }, [ctx?.uid, ctx?.account, run]);

  /* ── boot: the draft and the context → where this person lands ── */
  useEffect(() => {
    if (booted.current || !ctx) return;
    booted.current = true;
    void (async () => {
      const saved = devStart ? null : await services.loadDraft();
      let m = enter(ctx, saved, Date.now());
      if (devStart && !m.leave) {
        const d = devStart.seed ? seedDraftFor(m.draft, devStart.screen) : m.draft;
        m = jump(d, devStart.screen, devStart.side, Date.now());
      }
      /* straight to Today (an onboarded account, a guest who finished here):
         no screen is drawn — the launch's last frame stays up and Today
         dissolves in over it, as it always has */
      if (m.leave) void runEffects(m.effects, m.draft);
      else apply(m);
    })();
  }, [ctx, devStart, services, apply, runEffects]);

  /* ── persist the draft on every change (a quarter second after the last) ── */
  useEffect(() => {
    if (!run || leaving.current) return;
    const id = setTimeout(() => {
      if (!leaving.current) void services.saveDraft(run.draft); // never after the run has ended and cleared it
    }, 250);
    return () => clearTimeout(id);
  }, [run, services]);

  /* ── waiting for an account to land (1a's sign-in, 11's link or switch) ── */
  type Pending = { kind: "signin" } | { kind: "address"; choice: Exclude<AddressChoice, "guest">; fromUid: string | null };
  const [pending, setPending] = useState<{ p: Pending; at: number } | null>(null);
  useEffect(() => {
    if (!pending || !ctx || !run) return;
    const { p } = pending;
    const landed = ctx.account === "member" && (p.kind === "signin" || p.choice !== "switched" || ctx.uid !== p.fromUid);
    const settle = () => {
      setPending(null);
      const c = ctxRef.current ?? ctx;
      const r = runRef.current ?? run;
      apply(p.kind === "signin" ? flowSignedIn(r.draft, c, Date.now()) : flowAddressDone(r.draft, p.choice, c, Date.now()));
    };
    if (landed) {
      settle();
      return;
    }
    const id = setTimeout(() => {
      console.warn("[onboarding] the account didn't land within 4 s; going on with what is known");
      settle();
    }, Math.max(0, 4000 - (Date.now() - pending.at)));
    return () => clearTimeout(id);
  }, [pending, ctx, run, apply]);

  /* ── what the screens call ── */
  const set = useCallback((patch: Partial<ObDraft>) => {
    const r = runRef.current;
    if (!r) return;
    const next = { ...r, draft: { ...r.draft, ...patch, updatedAt: Date.now() } };
    runRef.current = next;
    setRun(next);
  }, []);
  const advance = useCallback(
    (patch?: Partial<ObDraft>) => {
      const r = runRef.current;
      const c = ctxRef.current;
      if (!r || !c) return;
      apply(flowAdvance(patch ? { ...r.draft, ...patch } : r.draft, c, Date.now()));
    },
    [apply],
  );
  const skip = useCallback(() => {
    const r = runRef.current;
    const c = ctxRef.current;
    if (!r || !c) return;
    apply(flowSkip(r.draft, c, Date.now()));
  }, [apply]);
  const goBack = useCallback(() => {
    const r = runRef.current;
    const c = ctxRef.current;
    if (!r || !c) return;
    const m = flowBack(r.draft, c, Date.now());
    if (m) apply(m);
  }, [apply]);
  const openSide = useCallback((side: SideId) => {
    const r = runRef.current;
    if (!r) return;
    runRef.current = { ...r, side };
    setRun(runRef.current);
  }, []);
  const closeSide = useCallback(() => {
    const r = runRef.current;
    if (!r || r.side === "underage") return; // 3x has no way out
    runRef.current = { ...r, side: null };
    setRun(runRef.current);
  }, []);
  const signedIn = useCallback(() => setPending({ p: { kind: "signin" }, at: Date.now() }), []);
  const addressDone = useCallback(
    (choice: Exclude<AddressChoice, "guest">) => setPending({ p: { kind: "address", choice, fromUid: ctxRef.current?.uid ?? null }, at: Date.now() }),
    [],
  );
  const finished = useCallback(() => finishP.current, []);
  const now = useCallback(() => Date.now(), []);

  if (!ctx || !run) return <LaunchFrame />;

  const { draft, side } = run;
  const screen = draft.screen;
  // the launch's hand-off is screen 1's, once: gone as soon as the run leaves 1
  if (screen !== "doorstep") handoffRef.current = null;
  const hasBack = !ctx.blocked && side !== "underage" && flowBack(draft, ctx, Date.now()) !== null;
  const props: ObScreenProps = {
    draft,
    ctx,
    side,
    set,
    advance,
    canAdvance: flowCanAdvance(draft, ctx, dayOf(new Date())),
    skip,
    back: hasBack ? goBack : null,
    openSide,
    closeSide,
    signedIn,
    addressDone,
    finished,
    services,
    uid: ctx.account === "none" ? null : ctx.uid,
    handoff: screen === "doorstep" ? handoffRef.current : null,
    lang,
    demo,
    now,
  };
  const ground = groundOf(screen, draft);
  const Screen = SCREEN_COMPONENTS[screen];
  const vk = voiceKey(screen);

  return (
    <ObRunContext.Provider value={props}>
      <Ground kind={ground}>
        {/* no fade for screen 1 straight from the launch: its first frame IS the launch's last
            (storyboard §4), and a fade from nothing would dip the mark under the route's own fade */}
        <Animated.View key={screen} entering={screen === "doorstep" && props.handoff ? undefined : FadeIn.duration(220)} style={{ flex: 1 }}>
          <Screen {...props} />
        </Animated.View>
        {eggPlace(screen) === "nest" && (
          <View pointerEvents="none" style={{ position: "absolute", top: nestTop(insets.top), left: 0, right: 0, alignItems: "center" }}>
            <NestEgg shell={draft.shell} lit={pipsLit(screen)} voice={vk ? t(vk) : null} on={ground} still={side === "underage"} />
          </View>
        )}
        {demo && (
          <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 12, right: 12, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: OB.ink }}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ fontFamily: FONT.monoSemi, fontSize: 9, letterSpacing: 1.4, color: OB.acid }}>DEMO</Text>
          </View>
        )}
      </Ground>
    </ObRunContext.Provider>
  );
}
