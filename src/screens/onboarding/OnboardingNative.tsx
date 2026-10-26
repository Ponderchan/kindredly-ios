import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActionSheetIOS, Keyboard, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Host } from "@expo/ui/swift-ui";
import { KIsland, KOnboardingView, useKCommands, useRev, type KObAuth, type KObDob, type KObDoor, type KObEnvelope, type KObEvent, type KObFace, type KObHatch, type KObLetter, type KObMake, type KObName, type KObShell, type KObWord, type KOnboardingCommands, type KScreenHandle } from "../../../modules/kindredly-ui";
import type { KComposeSection } from "../../../modules/kindredly-ui/src/Compose";
import type { SurfaceHostLink } from "../../components/NativeSurface";
import { LaunchFrame } from "../../components/LaunchAnimation";
import { EGG_SHELLS } from "../../components/EggShell";
import { FirstFlight, type FlightColors } from "../../components/FirstFlight";
import { HATCH_READ_S, HatchStage } from "../../components/HatchStage";
import { WrenBird } from "../../components/WrenBird";
import { FACES, getFace } from "../../data/aura-avatar-lib";
import { getStamp, sname } from "../../data/stamps";
import { firstWord } from "../../lib/first-word";
import { frostSpec } from "../../lib/frost";
import { postmark, monthsShort } from "../../lib/format";
import { starterStamp } from "../../lib/hatch-engine";
import { LANGS, setLang, t } from "../../lib/i18n";
import { useAssetImageRefs } from "../../lib/images";
import { openPrivacy, openTerms } from "../../lib/legal";
import { makeFaceHref, setMadeFaceWorn, useMadeFace, useMadeFaceAvatarId, useMakeFaceOn } from "../../lib/make-face";
import { useSeason } from "../../lib/season";
import { strangerName } from "../../lib/stranger-name";
import { useLetterFamily, useLetterFont, useTheme } from "../../lib/theme";
import { OPENING_MIN, weightedCount } from "../../lib/weighted-count";
import { screenNow } from "../../lib/wren";
import { NAME_IDEAS, WREN_NAME_MAX, isReservedName } from "../../lib/wren-name";
import { ZODIAC_TEXT, zodiacKey } from "../../lib/zodiac";
import { letterFitLines } from "../../theme/post";
import { THEMES } from "../../theme/themes";
import { traySections } from "../compose/useComposeState";
import { ageOn, clampDob, dayOf, dobString, gate, groundOf, lettersLeft, pipsLit, signOf, voiceKey, type ObDraft } from "./flow";
import { useObRun, type ObRun } from "./Onboarding2";
import * as haptics from "./parts/haptics";
import { OB, OB_MAX_FONT, TYPE } from "./parts/tokens";
import { TOPBAR_H } from "./parts/frame";
import { leaveDoorstepEgg } from "./screens/s01-geometry";
import { SAMPLE_UID, SAMPLE_UID_YOU } from "./screens/s06-envelope-front";
import { clockLine } from "./screens/S07Letter";
import { ENV_H, ENV_W, EnvelopeFront, envelopeDate, yourCourierName } from "./screens/s08-envelope";
import { keptLine, useHatchRead } from "./screens/s09-read";
import { Chick, type Nudge } from "./screens/s10-chick";
import { prefetchFlightPool, takeFlightPool } from "./screens/s10-pool";
import type { ObScreenProps } from "./types";
import type { PoolLetter } from "../../lib/db";
import "../../data/strings-onboarding2";
import "../../data/strings-identity";
import "../../data/strings-a11y-onboarding";
import "../../data/strings-make-face";

/* THE ONBOARDING IN SWIFTUI (binary 1.2.6, App Store 1.0.7; app_surfaces "onboarding", OFF by
   default — the owner turns it on with a row after device testing). One Host for the whole run
   (it keeps the keyboard's safe area, so the letter's bar and the name's key ride the keyboard),
   holding KOnboardingView and its four islands: Wren flying on the doorstep's slide 2, HatchStage
   on 9, the named chick on 10, 11 and 13, and FirstFlight on 12 and behind 13.

   THE RUN IS THE SAME RUN. useObRun (Onboarding2) is the runner both renderers share: who is here,
   the draft, the flow's moves and effects, the anonymous session, the pending sign-in,
   persistence. This file only turns its props into the Swift view's props, and every tap Swift
   reports into the same call the React Native screen makes (props.set, advance, skip, back,
   openSide, closeSide, signedIn, addressDone, and the services). What the React Native screens
   keep in local state that isn't drawing — a sign-in in flight, the email fold's stage, the
   hatch's word, the chick's nudges — is kept here, with the same rules, so the two renderers
   behave the same. Swift plays the motion and says when it is over (then the move is made).

   The haptics are the run's own (parts/haptics): Swift asks for one by name ("haptic"), TS plays it. */

const CUE_COUNT = 18; // S07Letter's eighteen cues (ob.cue.1 … 18)
const IDEAS = ["Pip", "Juno", "Otis", "Moth", "Bea", "Fen"].filter((n) => NAME_IDEAS.includes(n));
const FLIGHT_COLORS: FlightColors = { ground: OB.shell, ink: OB.ink, sub: OB.inkSoft, faint: OB.inkSoft, card: OB.paper, accent: OB.blue };
const HATCH_CHROME = { ink: OB.ink, accent: OB.blue, panel: OB.paper, line: OB.ink };
/** the envelope FirstFlight carries out, on its 390-wide chart (S12Flight CARRY_W) */
const CARRY_W = 152;
const FACE_THEM = FACES.find((f) => f.pool === "f") ?? FACES[0];
const FACE_YOU = FACES.find((f) => f.pool === "m") ?? FACES[1];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Fold = { stage: "key" | "email" | "code"; busy: boolean; bad: string; email: string; mode: "otp" | "attach" };
const FOLD0: Fold = { stage: "key", busy: false, bad: "", email: "", mode: "otp" };

/** Keep a value while its content is the same (a re-render then re-sends nothing native). */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

/** Does the phone speak one of the nine? Only when it doesn't is the language chip shown (S01Doorstep). */
function phoneLangIsOneOfOurs(): boolean {
  try {
    const tag = (Intl.DateTimeFormat().resolvedOptions().locale || "en").toLowerCase();
    return /^(en|es|pt|id|in|fr|de|it|ja|ko)(\b|[-_])/.test(tag);
  } catch {
    return true;
  }
}

const words = (o: Record<string, string>): KObWord[] => Object.entries(o).map(([k, v]) => ({ k, v: v ?? "" }));

/** The Swift run, or the launch's last frame until the run knows who is here. */
export function OnboardingNative({ host }: { host: SurfaceHostLink }) {
  const run = useObRun();
  if (!run) return <LaunchFrame />;
  return <ObNative run={run} host={host} />;
}

function ObNative({ run, host }: { run: ObRun; host: SurfaceHostLink }) {
  const { props, noFade } = run;
  const { draft, ctx, side, services } = props;
  const screen = draft.screen;
  const router = useRouter();
  const letterFont = useLetterFont();
  const { key: theme } = useTheme();
  const safe = useSafeAreaInsets();
  const insets = useMemo(() => ({ top: safe.top, bottom: safe.bottom, tabBarRoom: 0 }), [safe.top, safe.bottom]);
  const { width: W, height: H } = useWindowDimensions();
  const viewRef = useRef<KScreenHandle>(null);
  const live = useRef(props);
  live.current = props;

  /* the words in the fields, for a view that (re)attaches and for each screen that has one */
  const commands = useKCommands<KOnboardingCommands>(viewRef, {
    blurOnUnmount: true,
    onViewAttach: () => {
      commands.send("setText", { target: "letter", value: live.current.draft.letter });
      commands.send("setText", { target: "name", value: live.current.draft.wrenName });
    },
  });
  useEffect(() => {
    if (screen === "letter") commands.send("setText", { target: "letter", value: live.current.draft.letter });
    if (screen === "name") commands.send("setText", { target: "name", value: live.current.draft.wrenName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /* ── the portraits as files Swift can load ── */
  const mods = useMemo(() => Object.fromEntries(FACES.map((f) => [f.id, f.src])) as Record<string, number>, []);
  const refs = useAssetImageRefs(mods);
  const made = useMadeFace();
  const madeId = useMadeFaceAvatarId();
  const makeOn = useMakeFaceOn();
  const yours = made.state === "yours" && !!madeId;
  const faceRef = (id: string | null) => {
    if (!id) return null;
    if (madeId && id === madeId) return made.image ? { uri: made.image, key: id } : null;
    const r = refs[id];
    return r ? { uri: r.uri, key: r.key } : null;
  };

  /* 5: back from the flow with a face worn ("This is me" there), it is the one picked (S05Face) */
  const wasYours = useRef(yours);
  useEffect(() => {
    if (screen === "face" && yours && !wasYours.current && madeId && draft.avatarId !== madeId) props.set({ avatarId: madeId, faceLater: false });
    wasYours.current = yours;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yours, madeId]);
  /* 5: a library face or Later, after a face was made: it is no longer worn */
  const unwear = () => {
    if (made.state !== "free") void setMadeFaceWorn(null);
  };

  /* ── 1a and 11: the account keys ── */
  const [busy, setBusy] = useState<"" | "apple" | "google" | "switch">("");
  const [err, setErr] = useState("");
  const [fold, setFold] = useState<Fold>(FOLD0);
  const foldRef = useRef(fold);
  foldRef.current = fold;
  const [failed, setFailed] = useState(false);
  const [exists, setExists] = useState<null | { provider: "apple" | "google" | "email"; email?: string }>(null);
  const [switchEmail, setSwitchEmail] = useState<string | null>(null);
  const [switchState, setSwitchState] = useState({ busy: false, bad: false });
  const addressDone = useRef(false);
  const alive = useRef(true);
  // set on every mount too: a re-run effect (Fast Refresh, Strict Mode) otherwise left it false for
  // good and a sign-in never landed (its spinner stayed on; seen 2026-10-27)
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  /* a side opened or closed, or a screen changed: the fold starts over, as React Native's remounts it */
  useEffect(() => {
    setFold(FOLD0);
    setErr("");
  }, [screen, side === "signin"]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (msg: string) => AccessibilityInfo.announceForAccessibility(msg);

  /* ── 9 ── */
  const read = useHatchRead(draft.letter);
  const [flood, setFlood] = useState<{ x: number; y: number } | null>(null);
  const [hatched, setHatched] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [stageH, setStageH] = useState(0);
  const leaving = useRef<string | null>(null);

  /* ── 10 ── */
  const [nudge, setNudge] = useState<Nudge>({ n: 0, re: "chirp" });
  const poke = (re: Nudge["re"]) => setNudge((x) => ({ n: x.n + 1, re }));
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKb(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKb(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /* ── 12 ── */
  const [stops, setStops] = useState<PoolLetter[]>([]);
  const flightLeft = useRef(false);

  /* entering a screen: what its React Native screen did on mount */
  useEffect(() => {
    leaving.current = null;
    if (screen === "letter" && draft.cue === 0 && !draft.letter) props.set({ cue: 1 + Math.floor(Math.random() * (CUE_COUNT - 1)) });
    if (screen === "name") prefetchFlightPool(services);
    if (screen === "hatch") {
      setFlood(null);
      setHatched(false);
      setSaid(null);
    }
    if (screen === "address") {
      addressDone.current = false;
      setExists(null);
      setSwitchEmail(null);
      setFailed(false);
      setBusy("");
    }
    if (screen === "flight") {
      flightLeft.current = false;
      let on = true;
      void takeFlightPool(services).then((l) => on && setStops(l));
      return () => {
        on = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /* 7: VoiceOver hears the meter reaching the mark and the house rule biting or letting go */
  const left = lettersLeft(draft.letter);
  const clean = screenNow(draft.letter).ok;
  const was = useRef({ left, clean });
  useEffect(() => {
    if (screen !== "letter") return;
    const p = was.current;
    was.current = { left, clean };
    if (p.clean && !clean) say(t("ob2.letter.ruleHit"));
    else if (clean && left === 0 && (p.left > 0 || !p.clean)) say(t("ob2.letter.ready"));
  }, [left, clean, screen]);

  /* ── the email fold, for 1a (sign in) and 11 (attach) ── */
  const foldSend = async (email: string, attach: boolean) => {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      setFold((f) => ({ ...f, bad: t("ob.email.bad") }));
      say(t("ob.email.bad"));
      return;
    }
    if (attach) setFailed(false);
    else setErr("");
    setFold((f) => ({ ...f, bad: "", busy: true, email: e }));
    const r = attach ? await services.emailAttach(e) : await services.emailSignIn(e);
    if (!alive.current) return;
    if ("sent" in r) {
      setFold((f) => ({ ...f, busy: false, stage: "code", mode: attach ? "attach" : r.mode ?? "otp" }));
      commands.send("setText", { target: "code", value: "" });
      if (attach) props.openSide("code");
      return;
    }
    if ("ok" in r && !attach) {
      setFold((f) => ({ ...f, busy: false, stage: "code" }));
      props.signedIn();
      return;
    }
    if ("exists" in r && attach) {
      setFold((f) => ({ ...f, busy: false }));
      setExists({ provider: "email", email: e });
      return;
    }
    // 11 says it didn't attach, whatever came back; 1a says what the sign-in said (S11Address, s01-signin)
    const msg = attach ? t("ob2.address.failed") : "error" in r ? r.error : t("ob.code.bad");
    if ("error" in r && attach) console.warn("[onboarding] 11: the email wasn't attached:", r.error);
    setFold((f) => ({ ...f, busy: false, bad: msg }));
    say(msg);
  };
  const foldCode = async (typed: string, attach: boolean) => {
    const d = typed.replace(/\D/g, "").slice(0, 6);
    if (d !== typed) commands.send("setText", { target: "code", value: d });
    if (foldRef.current.bad) setFold((f) => ({ ...f, bad: "" }));
    if (d.length !== 6 || foldRef.current.busy) return;
    const f0 = foldRef.current;
    setFold((f) => ({ ...f, busy: true }));
    const r = await services.emailVerify(f0.email, d, attach ? "attach" : f0.mode);
    if (!alive.current) return;
    setFold((f) => ({ ...f, busy: false }));
    if ("ok" in r) {
      if (attach) finishAddress("email");
      else props.signedIn();
      return;
    }
    if (attach) haptics.refuse();
    setFold((f) => ({ ...f, bad: t("ob.code.bad") }));
    commands.send("setText", { target: "code", value: "" });
    say(t("ob.code.bad"));
  };

  /* ── 11 ── */
  function finishAddress(choice: "apple" | "google" | "email" | "switched") {
    if (addressDone.current) return;
    addressDone.current = true;
    haptics.success();
    props.addressDone(choice);
  }
  const link = async (p: "apple" | "google") => {
    if (busy || addressDone.current) return;
    setBusy(p);
    setFailed(false);
    try {
      const r = await services.link(p);
      if ("ok" in r) finishAddress(p);
      else if ("exists" in r) setExists({ provider: p });
      else if ("error" in r) {
        console.warn(`[onboarding] 11: ${p} didn't link:`, r.error);
        setFailed(true);
        say(t("ob2.address.failed"));
      }
    } finally {
      if (alive.current) setBusy("");
    }
  };
  const doSwitch = async () => {
    if (!exists || busy) return;
    setBusy("switch");
    setFailed(false);
    try {
      const r = await services.switchAccount(exists.provider, exists.email);
      if ("ok" in r) finishAddress("switched");
      else if ("sent" in r && exists.email) {
        setSwitchEmail(exists.email);
        setSwitchState({ busy: false, bad: false });
        commands.send("setText", { target: "switchCode", value: "" });
        props.openSide("code");
      } else if ("error" in r) {
        console.warn("[onboarding] 11: the switch didn't go through:", r.error);
        setFailed(true);
        say(t("ob2.address.failed"));
      }
    } finally {
      if (alive.current) setBusy("");
    }
  };
  const switchCode = async (typed: string) => {
    const d = typed.replace(/\D/g, "").slice(0, 6);
    if (d !== typed) commands.send("setText", { target: "switchCode", value: d });
    setSwitchState((s) => (s.bad ? { ...s, bad: false } : s));
    if (d.length !== 6 || switchState.busy || !switchEmail) return;
    setSwitchState({ busy: true, bad: false });
    const r = await services.emailVerify(switchEmail, d, "otp");
    if (!alive.current) return;
    if ("ok" in r) {
      setSwitchState({ busy: false, bad: false });
      finishAddress("switched");
      return;
    }
    haptics.refuse();
    setSwitchState({ busy: false, bad: true });
    commands.send("setText", { target: "switchCode", value: "" });
    say(t("ob.code.bad"));
  };

  /* ── 1a ── */
  const signIn = async (p: "apple" | "google") => {
    if (busy) return;
    setBusy(p);
    setErr("");
    const r = await services.signIn(p);
    if (!alive.current) return;
    if ("ok" in r) {
      props.signedIn(); // the key keeps spinning until the runner moves on
      return;
    }
    setBusy("");
    if ("error" in r) {
      setErr(r.error);
      say(r.error);
    }
  };

  /* ── what Swift reports ── */
  const onEvent = (e: KObEvent) => {
    const p = live.current;
    const d = p.draft;
    switch (e.type) {
      case "haptic": {
        const h = (haptics as unknown as Record<string, (() => void) | undefined>)[e.s];
        h?.();
        return;
      }
      case "advance":
        return advance(e.s);
      case "skip":
        if (d.screen === "pronoun" && leaving.current) return;
        if (d.screen === "address" && busy) return;
        if (d.screen === "face") unwear();
        return p.skip();
      case "back":
        return p.back?.();
      case "side":
        if (e.s === "signin" || e.s === "tray" || e.s === "code") p.openSide(e.s);
        return;
      case "closeSide":
        if (busy) return;
        return p.closeSide();
      case "lang":
        ActionSheetIOS.showActionSheetWithOptions({ options: [...LANGS.map((l) => l.label), t("ob2.doorstep.langCancel")], cancelButtonIndex: LANGS.length }, (i) => {
          if (i >= 0 && i < LANGS.length) setLang(LANGS[i].id);
        });
        return;
      case "shell":
        if (e.n >= 0 && e.n < EGG_SHELLS.length) p.set({ shell: Math.round(e.n) });
        return;
      case "dob": {
        const [y, m, dd] = e.s.split("-").map(Number);
        if ([y, m, dd].every(Number.isInteger)) p.set({ dob: clampDob({ y, m, d: dd }) });
        return;
      }
      case "changeAge":
        return p.changeAge?.();
      case "pronoun":
        if (e.s === "she" || e.s === "he" || e.s === "they") {
          leaving.current = "pronoun";
          p.set({ pronoun: e.s, pronounSkipped: false });
        }
        return;
      case "face":
        if (!e.s) return;
        if (e.s !== madeId) unwear();
        p.set({ avatarId: e.s, faceLater: false });
        return;
      case "dice": {
        const pool = facePool(d).filter((a) => a.id !== d.avatarId);
        if (!pool.length) return;
        unwear();
        p.set({ avatarId: pool[Math.floor(Math.random() * pool.length)].id, faceLater: false });
        return;
      }
      case "makeFace":
        router.push(makeFaceHref("onboarding", { dob: d.dob ? dobString(d.dob) : null }));
        return;
      case "mark":
        p.set({ showMark: !(d.showMark ?? true) });
        return;
      case "sign":
        p.set({ showSign: !(d.showSign ?? true) });
        return;
      case "letter":
        p.set({ letter: e.s });
        return;
      case "cue":
        p.set({ cue: d.cue + 1 });
        return;
      case "stampPick":
        if (e.s) {
          p.set({ stamp: e.s });
          p.closeSide();
        }
        return;
      case "flooded":
        if (!d.born) p.set({ born: true, firstWord: firstWord([d.letter]) });
        return;
      case "stage":
        setStageH(Math.max(0, Math.round(e.n)));
        return;
      case "name":
        if (e.s.length > d.wrenName.length) {
          haptics.chirp();
          poke("chirp");
        }
        p.set({ wrenName: e.s });
        return;
      case "idea":
      case "nameDice": {
        const n = e.type === "idea" ? e.s : (() => {
          const pool = NAME_IDEAS.filter((x) => x !== d.wrenName.trim());
          return pool[Math.floor(Math.random() * pool.length)];
        })();
        if (!n) return;
        haptics.tick();
        poke("happy");
        p.set({ wrenName: n });
        commands.send("setText", { target: "name", value: n });
        return;
      }
      case "wrenPronoun":
        if (e.s === "she" || e.s === "he" || e.s === "they") {
          haptics.tick();
          poke("tilt");
          p.set({ wrenPronoun: e.s });
        }
        return;
      case "signIn":
        if (e.s === "apple" || e.s === "google") void signIn(e.s);
        return;
      case "link":
        if (e.s === "apple" || e.s === "google") void link(e.s);
        return;
      case "foldOpen":
        setFold({ ...FOLD0, stage: "email" });
        commands.send("focus", { target: "email" });
        return;
      case "emailSend":
        if (!foldRef.current.busy) void foldSend(e.s, d.screen === "address");
        return;
      case "code":
        void foldCode(e.s, d.screen === "address");
        return;
      case "codeAgain":
        setFold((f) => ({ ...f, stage: "email", bad: "" }));
        commands.send("setText", { target: "code", value: "" });
        return;
      case "terms":
        void (e.n === 1 ? openPrivacy() : openTerms());
        return;
      case "startNew":
        if (busy) return;
        p.closeSide();
        p.advance();
        return;
      case "switch":
        void doSwitch();
        return;
      case "switchCode":
        void switchCode(e.s);
        return;
      case "otherWay":
        setExists(null);
        setSwitchEmail(null);
        setFailed(false);
        setFold(FOLD0);
        p.closeSide();
        return;
      default:
        console.log("[onboarding] Swift sent an event this build doesn't know:", e.type);
    }
  };

  /* the primary key, or the screen moving on once its motion is over */
  function advance(s: string) {
    const p = live.current;
    switch (p.draft.screen) {
      case "doorstep":
        leaveDoorstepEgg();
        return p.advance();
      case "letter":
        // the house rule holds the key as well as the floor (S07Letter `ready`)
        if (!p.canAdvance || !screenNow(p.draft.letter).ok) return;
        return p.advance();
      case "stamp":
        return p.advance(s ? { stamp: s } : undefined);
      case "hatch":
        if (!p.canAdvance || !hatched || leaving.current) return;
        leaving.current = "hatch";
        setCelebrate((c) => c + 1); // it hops as the screen goes
        setTimeout(() => live.current.advance(), 320);
        return;
      case "name":
        if (!p.canAdvance || leaving.current) return;
        leaving.current = "name";
        Keyboard.dismiss();
        commands.send("blur", {});
        poke("happy");
        setTimeout(() => live.current.advance(), 280);
        return;
      default:
        return p.advance();
    }
  }

  /* ── the props ── */
  const today = dayOf(new Date(props.now()));
  const nestScreen = screen === "birthday" || screen === "pronoun" || screen === "face" || screen === "envelope" || screen === "stamp";
  const vk = voiceKey(screen);
  const voice = nestScreen && vk ? t(vk) : "";
  const lit = Math.min(4, Math.max(0, pipsLit(screen)));
  const sign = signOf(draft.dob);
  const g = gate(draft.dob, today);
  const answered = g !== "unanswered" && !!draft.dob;
  const shownSign = answered ? sign : null;
  const uid = props.uid;
  const courier = useMemo(() => (uid ? strangerName(uid, { lang: props.lang, unsigned: "" }) : ""), [uid, props.lang]);
  const markable = draft.pronoun === "she" || draft.pronoun === "he";
  const suggested = starterStamp(null, draft.letter);
  const shownStamp = draft.stamp ?? suggested;
  const her = draft.wrenName.trim() || t("ob2.name.ph");
  const season = useSeason().stamps;

  const w = useSameContent(words(wordsFor()));
  function wordsFor(): Record<string, string> {
    const o: Record<string, string> = { back: t("ob2.back") };
    if (nestScreen) {
      const step = t("a11yob.step", { n: lit, total: 4 });
      o["nest.a11y"] = t("a11yob.egg");
      o["nest.value"] = voice ? `${step}. ${voice}` : step;
    }
    const fold = () => {
      o["fold.continue"] = t("ob.continueEmail");
      o["fold.ph"] = t("ob.email.ph");
      o["fold.send"] = t("ob.email.send");
      o["fold.body"] = t("ob.email.body");
      o["fold.codeCap"] = t("ob.code.cap", { email: foldRef.current.email });
      o["fold.again"] = t("ob.code.again");
    };
    switch (screen) {
      case "doorstep": {
        const heads = [t("ob2.doorstep.s1.head"), t("ob2.doorstep.s2.head"), t("ob2.doorstep.s3.head")];
        const them = strangerName(SAMPLE_UID, { lang: props.lang, unsigned: "" });
        Object.assign(o, {
          "launch.tag": t("launch.tag"),
          "launch.sub": t("launch.sub"),
          "door.head0": heads[0],
          "door.head1": heads[1],
          "door.head2": heads[2],
          "door.chip0": t("ob2.doorstep.s1.chip"),
          "door.chip1": t("ob2.doorstep.s2.chip", { name: them }),
          "door.chip2": t("ob2.doorstep.s3.chip"),
          "door.slide0": t("ob2.doorstep.slideA11y", { head: heads[0], n: 1 }),
          "door.slide1": t("ob2.doorstep.slideA11y", { head: heads[1], n: 2 }),
          "door.slide2": t("ob2.doorstep.slideA11y", { head: heads[2], n: 3 }),
          "door.app": t("ob2.doorstep.app"),
          "door.key": t("ob2.doorstep.key"),
          "door.signin": t("ob2.doorstep.signin"),
          "door.s1letter": t("ob2.doorstep.s1.letter"),
          "door.yourCity": t("ff.yourCity"),
          "door.themCaps": them.toLocaleUpperCase(),
          "door.count": t("ob2.doorstep.s3.count", { n: "{n}" }),
          "door.you": t("ob2.doorstep.s3.you"),
          "door.lang": t("ob2.doorstep.lang"),
          "door.langChip": `${LANGS.find((l) => l.id === props.lang)?.label ?? "English"} ▾`,
        });
        if (side === "signin") {
          Object.assign(o, {
            "signin.close": t("ob2.signin.close"),
            "signin.title": t("ob2.signin.title"),
            "signin.line": t("ob2.signin.line"),
            "signin.apple": t("ob.continueApple"),
            "signin.google": t("ob.continueGoogle"),
            "signin.terms": t("ob2.signin.terms"),
            "signin.new": t("ob2.signin.new"),
          });
          fold();
        }
        break;
      }
      case "egg":
        Object.assign(o, { voice: t("ob2.voice.egg"), head: t("ob2.egg.head"), line: t("ob2.egg.line"), key: t("ob2.egg.key") });
        break;
      case "birthday": {
        const months = monthsShort();
        const age = answered && draft.dob ? ageOn(draft.dob, today) : null;
        const wm = draft.dob ?? { y: today.y, m: today.m, d: today.d };
        Object.assign(o, {
          head: t("ob2.birthday.head"),
          before: t("ob2.birthday.before"),
          after: shownSign ? `${ZODIAC_TEXT[shownSign]} ${t("ob2.birthday.after", { sign: t(zodiacKey(shownSign)) })}` : "",
          age: age !== null ? t("ob.ageIs", { n: age }) : "",
          key: t("ob2.birthday.key"),
          month: t("ob2.birthday.month"),
          day: t("ob2.birthday.day"),
          year: t("ob2.birthday.year"),
          wheelA11y: t("ob2.birthday.wheelA11y", { month: months[wm.m] ?? "", day: wm.d, year: wm.y }),
          gate: g,
          "underage.head": t("ob2.underage.head"),
          "underage.line": t("ob2.underage.line"),
          "underage.change": props.changeAge ? t("ob2.underage.change") : "",
        });
        break;
      }
      case "pronoun":
        Object.assign(o, {
          head: t("ob2.pronoun.head"),
          line: t("ob2.pronoun.line"),
          "chip.she": t("ob2.pronoun.she"),
          "chip.he": t("ob2.pronoun.he"),
          "chip.they": t("ob2.pronoun.they"),
          hint: t("ob2.pronoun.hint"),
          skip: t("ob2.pronoun.skip"),
        });
        break;
      case "face":
        Object.assign(o, {
          head: t("ob2.face.head"),
          line: t("ob2.face.line"),
          key: t("ob2.face.key"),
          later: t("ob2.face.later"),
          random: t("ep.random"),
          // two lines at the dot, so the cell's label never starts a line with "·"
          "make.free": t("mf.tag.makeFree").replace(/\s*·\s*/, "\n"),
          "make.used": t("mf.tag.first"),
          "make.yours": t("mf.tag.yours"),
          "make.a11y": t("mf.entry.a11y"),
          "make.yoursA11y": t("mf.result.a11y"),
        });
        break;
      case "envelope": {
        const showMark = markable && (draft.showMark ?? true);
        const showSign = !!sign && (draft.showSign ?? true);
        const label = t("ob2.envelope.onLetters", { glyph: "\u0000" }).split("\u0000");
        Object.assign(o, {
          head: t("ob2.envelope.head"),
          thinking: t("ob2.envelope.thinking"),
          to: t("ob2.envelope.to"),
          caption: t("ob2.envelope.caption"),
          key: t("ob2.envelope.key"),
          cardA11y: uid
            ? t("id.preview.a11y", { who: [courier, showMark ? t(`id.mark.${draft.pronoun}`) : null, showSign && sign ? t(zodiacKey(sign)) : null].filter(Boolean).join(", ") })
            : t("ob2.envelope.thinking"),
          markA11y: draft.pronoun === "he" ? t("id.ob.mark.he") : t("id.ob.mark.she"),
          signA11y: sign ? t("ob2.envelope.signA11y", { sign: t(zodiacKey(sign)) }) : "",
          "sw.before": (label[0] ?? "").trim(),
          "sw.after": (label[1] ?? "").trim(),
          stripLabel: t("ob2.envelope.stripLabel"),
          stripSign: t("ob2.envelope.stripSign"),
          stripLine: t("ob2.envelope.stripLine"),
        });
        break;
      }
      case "letter":
        Object.assign(o, {
          voice: t("ob2.voice.letter"),
          clock: clockLine(props.now()),
          head: t("ob2.letter.head"),
          line: t("ob2.letter.line"),
          cue: t(`ob.cue.${(draft.cue % CUE_COUNT) + 1}`),
          stuck: t("ob2.letter.stuck"),
          stuckA11y: t("ob2.letter.stuckA11y"),
          ph: t("ob.write.ph"),
          rule: t("ob2.letter.rule"),
          ruleHit: t("ob2.letter.ruleHit"),
          left: t("ob2.letter.left", { n: left }),
          ready: t("ob2.letter.ready"),
          key: t("ob2.letter.key"),
        });
        break;
      case "stamp":
        Object.assign(o, {
          eyebrow: t("ob2.stamp.eyebrow"),
          name: (sname(getStamp(shownStamp)?.name) || shownStamp).toLowerCase(),
          line: t(draft.stamp && draft.stamp !== suggested ? "ob2.stamp.linePicked" : "ob2.stamp.line"),
          key: t("ob2.stamp.key"),
          another: t("ob2.stamp.another"),
          trayHead: t("ob2.stamp.trayHead"),
          trayDone: t("ob2.stamp.trayDone"),
          "env.to": t("ob2.stamp.to"),
          "env.a11y": t("ob2.stamp.envA11y", { name: courier }),
        });
        break;
      case "hatch":
        Object.assign(o, {
          chip0: t("ob2.hatch.rhythm"),
          chip1: t("ob2.hatch.pauses"),
          chip2: t("ob2.hatch.tells"),
          eyebrow: t("ob.hatch.eyebrow"),
          title: t("ob.hatch.title"),
          tap: t("ob2.hatch.tap"),
          born: keptLine("ob.hatched.plain", "ob.hatched.em"),
          bornLine: said ? t("ob.born.word", { dim: read.dimPhrase }) : t("ob.born.noWord", { dim: read.dimPhrase }),
          key: t("ob2.hatch.key"),
        });
        break;
      case "name": {
        const trimmed = draft.wrenName.trim();
        Object.assign(o, {
          head: t("ob2.name.head"),
          line: t("ob2.name.line"),
          ph: t("ob2.name.ph"),
          dice: t("ob2.name.dice"),
          goesBy: trimmed ? t("ob.naming.goesBy", { name: trimmed.toLocaleUpperCase() }) : t("ob.naming.goesByThey"),
          "p.she": t("ob2.name.she"),
          "p.he": t("ob2.name.he"),
          "p.they": t("ob2.name.they"),
          reserved: t("ob.naming.reserved"),
          key: t("ob2.name.key", { name: trimmed || t("ob2.name.ph") }),
          max: String(WREN_NAME_MAX),
        });
        break;
      }
      case "address":
        Object.assign(o, {
          head: t("ob2.address.head"),
          line: t("ob2.address.line", { name: her }),
          terms: t("ob2.address.terms"),
          termsLink: t("ob2.address.termsLink"),
          privacyLink: t("ob2.address.privacyLink"),
          apple: t("ob.continueApple"),
          google: t("ob.continueGoogle"),
          failed: t("ob2.address.failed"),
          guest: t("ob2.address.guest"),
          guestLine: t("ob2.address.guestLine"),
          exists: t("ob2.address.exists"),
          existsLine: t("ob2.address.existsLine"),
          switch: t("ob2.address.switch"),
          other: t("ob2.address.other"),
          codeCap: t("ob.code.cap", { email: switchEmail ?? "" }),
          codeBad: t("ob.code.bad"),
        });
        fold();
        break;
      case "knock":
        Object.assign(o, {
          head: t("ob2.knock.head"),
          line: t("ob2.knock.line"),
          settings: t("ob2.knock.settings"),
          yes: t("ob2.knock.yes"),
          no: t("ob2.knock.no"),
          sign: t("ob2.knock.sign", { name: her }),
        });
        break;
      default:
        break;
    }
    return o;
  }

  const shells = useSameContent<KObShell[]>(EGG_SHELLS.map((s) => ({ name: s.name.toUpperCase(), a11y: t("ob2.egg.shellA11y", { name: s.name }) })));

  const door = useSameContent<KObDoor>(
    screen === "doorstep"
      ? {
          entry: !props.handoff ? "rest" : props.handoff.mode === "still" ? "still" : "full",
          handedAt: props.handoff?.at ?? 0,
          showLang: !phoneLangIsOneOfOurs(),
          date: postmark(props.now()),
          sample: strangerName(SAMPLE_UID, { lang: props.lang, unsigned: "" }),
          frostThem: frostSpec(SAMPLE_UID),
          frostYou: frostSpec(SAMPLE_UID_YOU),
          faceThem: faceRef(FACE_THEM.id),
          faceYou: faceRef(FACE_YOU.id),
        }
      : { entry: "rest", handedAt: 0, showLang: false, date: "", sample: "", frostThem: null, frostYou: null, faceThem: null, faceYou: null },
  );

  const auth = useSameContent<KObAuth>({
    apple: services.appleAvailable,
    busy,
    err,
    fold: { stage: fold.stage, busy: fold.busy, bad: fold.bad },
    failed,
    exists: !!exists,
    switchCode: !!switchEmail,
    switchBusy: switchState.busy,
    switchBad: switchState.bad,
  });

  const dob = useSameContent<KObDob>({
    set: !!draft.dob,
    y: draft.dob?.y ?? today.y,
    m: draft.dob?.m ?? today.m,
    d: draft.dob?.d ?? today.d,
    ty: today.y,
    tm: today.m,
    td: today.d,
    months: screen === "birthday" ? monthsShort() : [],
    sign: shownSign ?? "",
  });

  const pool = facePool(draft);
  const faces = useSameContent<KObFace[]>(
    screen === "face" ? pool.map((a, i) => ({ id: a.id, image: faceRef(a.id), a11y: t("a11yob.face", { n: i + 1, total: pool.length }) })) : [],
  );
  const make = useSameContent<KObMake>({
    show: screen === "face" && makeOn,
    state: made.state,
    image: yours && made.image && madeId ? { uri: made.image, key: madeId } : null,
    id: yours && madeId ? madeId : "",
  });

  const envelope = useSameContent<KObEnvelope>({
    hasUid: !!uid,
    name: courier,
    frost: uid ? frostSpec(uid) : null,
    face: faceRef(draft.avatarId),
    hasFace: !!draft.avatarId && !!(getFace(draft.avatarId) || draft.avatarId === madeId),
    mark: markable ? (draft.pronoun as "she" | "he") : "",
    sign: sign ?? "",
    showMark: draft.showMark ?? true,
    showSign: draft.showSign ?? true,
    date: screen === "envelope" ? postmark(props.now()) : "",
    envDate: screen === "stamp" ? envelopeDate(props.now()) : "",
  });

  const letter = useSameContent<KObLetter>({
    left,
    fill: Math.min(1, weightedCount(draft.letter.trim()) / OPENING_MIN),
    clean,
    ready: props.canAdvance && clean,
    cueTurn: draft.cue,
    len: draft.letter.length,
  });

  const sections = useSameContent<KComposeSection[]>(
    screen === "stamp" && side === "tray" ? traySections({ suggested: [suggested], recent: [], tk: THEMES.classic, season }) : [],
  );

  const hatch = useSameContent<KObHatch>({ flood: !!flood, floodX: flood?.x ?? 0, floodY: flood?.y ?? 0, hatched, readS: HATCH_READ_S });

  const chickSize = screen === "name" ? (kb ? 64 : 104) : 96;
  const name = useSameContent<KObName>({ chick: chickSize, ideas: IDEAS, typed: draft.wrenName.trim(), pronoun: draft.wrenPronoun, reserved: isReservedName(draft.wrenName.trim()) });

  const rev = useRev(w, shells, faces, sections, dob.months, name.ideas);
  const ground = groundOf(screen, draft);

  const act = useRef(onEvent);
  act.current = onEvent;
  const onEventStable = useCallback((e: KObEvent) => act.current(e), []);

  return (
    <View style={{ flex: 1, backgroundColor: ground === "blue" ? OB.blue : ground === "paper" ? OB.sheet : OB.shell }}>
      <StatusBar style={ground === "shell" ? "dark" : "light"} animated />
      <Host style={{ flex: 1 }} ignoreSafeArea="container" colorScheme="light" onLayoutContent={host.onLayoutContent}>
        <KOnboardingView
          ref={commands.ref}
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          screen={screen}
          side={side ?? ""}
          ground={ground}
          canAdvance={props.canAdvance}
          hasBack={!!props.back}
          noFade={noFade}
          demo={props.demo}
          words={w}
          shell={draft.shell}
          shells={shells}
          pips={lit}
          voice={voice}
          still={side === "underage"}
          door={door}
          auth={auth}
          dob={dob}
          pronoun={draft.pronounSkipped ? "" : draft.pronoun ?? ""}
          faces={faces}
          selectedFace={draft.avatarId ?? ""}
          make={make}
          envelope={envelope}
          letter={letter}
          stampShown={shownStamp}
          sections={sections}
          hatch={hatch}
          name={name}
          refused={ctx.notif === "settings"}
          onEvent={onEventStable}
        >
          {/* every island on every render, in this order (Slot.tsx) */}
          <KIsland name="routeBird" style={{ width: 50, height: 50 }}>
            {screen === "doorstep" ? <WrenBird size={50} pose="fly" stage="wren" skin="sticker" accessory="none" /> : null}
          </KIsland>
          <KIsland name="hatch" interactive style={{ width: W, height: screen === "hatch" ? stageH : 0 }}>
            {screen === "hatch" && stageH > 0 ? (
              <HatchIsland
                draft={draft}
                read={read}
                celebrate={celebrate}
                top={insets.top}
                onBurst={setFlood}
                onBorn={() => setHatched(true)}
                onWord={setSaid}
              />
            ) : null}
          </KIsland>
          <KIsland name="chick" interactive style={{ width: chickSize * 1.6, height: chickSize * 1.12 }}>
            {screen === "name" || screen === "address" || screen === "knock" ? (
              <Chick
                shell={draft.shell}
                form={read.form}
                mood={screen === "knock" ? "delight" : read.mood}
                size={chickSize}
                nudge={screen === "name" ? nudge : undefined}
                tag={screen === "name" && draft.wrenName.trim() ? draft.wrenName.trim().toLocaleUpperCase() : null}
                name={screen === "name" ? draft.wrenName.trim() || null : null}
              />
            ) : null}
          </KIsland>
          <KIsland name="flight" interactive={screen === "flight"} style={{ width: W, height: H }}>
            {screen === "flight" ? (
              <FlightIsland props={props} stops={stops} her={her} courier={courier} form={read.form} onLanded={() => void landed()} />
            ) : screen === "knock" ? (
              <FirstFlight still her={her} opener="" stops={[]} colors={FLIGHT_COLORS} onDone={() => {}} />
            ) : null}
          </KIsland>
        </KOnboardingView>
      </Host>
    </View>
  );

  /** 12: when it lands, wait for finish() (the post and the saves), then on */
  async function landed() {
    if (flightLeft.current) return;
    flightLeft.current = true;
    try {
      await live.current.finished();
    } catch (e) {
      console.warn("[onboarding] 12: finish() failed; going on anyway:", e);
    }
    live.current.advance();
  }
}

/** 5's pool: the pronoun answered one screen ago chose it (she → f, he → m, they or a skip → both). */
function facePool(d: ObDraft) {
  return d.pronoun === "she" ? FACES.filter((a) => a.pool === "f") : d.pronoun === "he" ? FACES.filter((a) => a.pool === "m") : FACES;
}

/* 9: HatchStage, the copy under it drawn by Swift (its footer is empty here); the header keeps the
   top bar's room, as on the React Native screen */
function HatchIsland({
  draft,
  read,
  celebrate,
  top,
  onBurst,
  onBorn,
  onWord,
}: {
  draft: ObDraft;
  read: ReturnType<typeof useHatchRead>;
  celebrate: number;
  top: number;
  onBurst: (at: { x: number; y: number }) => void;
  onBorn: () => void;
  onWord: (w: string | null) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <HatchStage
        shell={draft.shell}
        fed={[draft.letter]}
        mood={read.mood}
        form={read.form}
        dims={read.read.dims}
        skin="sticker"
        celebrate={celebrate}
        burst="flood"
        onBurst={onBurst}
        chrome={HATCH_CHROME}
        tapHelps
        onBorn={onBorn}
        onWord={onWord}
        header={<View style={{ height: top + TOPBAR_H }} />}
        footer={null}
      />
    </View>
  );
}

/* 12: the existing FirstFlight on the run's Shell grid, carrying YOUR envelope front (s08-envelope),
   as S12Flight draws it */
function FlightIsland({
  props,
  stops,
  her,
  courier,
  form,
  onLanded,
}: {
  props: ObScreenProps;
  stops: PoolLetter[];
  her: string;
  courier: string;
  form: ReturnType<typeof useHatchRead>["form"];
  onLanded: () => void;
}) {
  const { draft } = props;
  const s = CARRY_W / ENV_W;
  const carry = { w: Math.ceil(CARRY_W + 4 * s), h: Math.ceil(ENV_H * s + 4 * s) };
  const stamp = draft.stamp ?? starterStamp(null, draft.letter);
  return (
    <FirstFlight
      her={her}
      opener={draft.letter.trim()}
      stops={stops}
      form={form}
      mark={(EGG_SHELLS[draft.shell] ?? EGG_SHELLS[0]).mark}
      skin="sticker"
      accessory="none"
      colors={FLIGHT_COLORS}
      head={<FlightHead her={her} />}
      envelope={
        <EnvelopeFront
          uid={props.uid}
          lang={props.lang}
          pronoun={draft.pronoun}
          showMark={draft.showMark}
          showSign={draft.showSign}
          dob={draft.dob}
          now={props.now()}
          stamp={stamp}
          corner="filled"
          width={CARRY_W}
        />
      }
      envelopeSize={carry}
      line={courier ? <FlightLine courier={courier} /> : undefined}
      onDone={onLanded}
    />
  );
}

/* S12Flight's own head and line, unchanged (they are drawn inside FirstFlight's chart) */

function FlightHead({ her }: { her: string }) {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={[TYPE.headline, { color: OB.ink, textAlign: "center" }]}>
        {keptLine("ob.flight.plain", "ob.flight.em", { name: her })}
      </Text>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.inkSoft, marginTop: 10 }]}>
        {t("ob2.flight.sub")}
      </Text>
    </View>
  );
}

function FlightLine({ courier }: { courier: string }) {
  const letterKey = useLetterFont();
  const said = useLetterFamily(true);
  return (
    <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={letterFitLines(letterKey, 2)} style={{ ...said, fontSize: 17, lineHeight: 23, color: OB.ink, textAlign: "center" }}>
      {t("ob2.flight.line", { name: courier })}
    </Text>
  );
}
