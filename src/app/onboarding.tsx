import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang } from "../lib/i18n";
import { openPrivacy, openTerms } from "../lib/legal";
import { monthsShort } from "../lib/format";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { F2, Y as Y_ART } from "../theme/y2k";
import { FIXED_INK, useEggOS, type EggPalette, type EggSkin } from "../lib/egg-os";
import { Wheel } from "../components/Wheel";
import { useAuth } from "../lib/auth";
import { fetchPool, POOL_CACHE_KEY, publishLetter, upsertFingerprint, type PoolLetter } from "../lib/db";
import { FirstFlight } from "../components/FirstFlight";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ARRIVAL_AT_KEY, ARRIVAL_FRESH, ARRIVAL_SENT, setFlag, unsetFlag, TODAY_RITUAL } from "../lib/flags";
import { rationPool } from "../lib/ration";
import { signatureVector, voiceSignature } from "../lib/signature";
import { WardrobeRack } from "../components/WardrobeRack";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenSkin } from "../components/WrenBird";
import { wrenStageDirty } from "../lib/wren-stage";
import { EGG_SHELLS, EggShell } from "../components/EggShell";
import { HATCH_READ_S, HatchStage } from "../components/HatchStage";
import { HatchlingRig, useChickIdle } from "../components/HatchlingRig";
import { FeedEgg } from "../components/FeedEgg";
import { AvatarImage } from "../components/AvatarImage";
import { FACES } from "../data/aura-avatar-lib";
import { readMood } from "../lib/wren-read";
import { ACCESSORY_META, bumpStageFloor, skinUnlocked } from "../lib/wren-style";
import { useWrenSkinControl } from "../lib/wren-skin";
import { useEntitlement } from "../lib/entitlement";
import { PaywallBody } from "./paywall";
import { EMPTY_STATS } from "../lib/stats";
import { hatchlingForm, saveHatchlingForm, type HatchlingForm } from "../lib/hatchling-form";
import { hatch, saveArchetype, type DimScore, starterStamp } from "../lib/hatch-engine";
import { NAME_IDEAS, isReservedName, saveWrenEgg, saveWrenName } from "../lib/wren-name";
import { track } from "../lib/track";
import { PRONOUNS, type PronounId, pronoun, saveWrenPronoun, saveYourPronoun } from "../lib/pronouns";
import { OPENING_MIN, weightedCount } from "../lib/weighted-count";
import { MOODS, MOOD_IDS, moodName, type MoodId } from "../data/moods";
import { MoodIcon } from "../components/MoodIcon";

/* Onboarding — EGG OS.
   ────────────────────────────────────────────────────────────────────────
   Nine screens on a Y2K handheld pet console: you choose a courier, say what
   to call her, feed her your first words, and watch her hatch into a card
   with a rarity on it and then fly off carrying your letter.

     welcome   KINDREDLY.EXE — the pitch, and the way in
     username  your pen name
     you       your pronouns — asked, never guessed
     cakeday   your birthday, which exists for the 18+ gate
     avatar    a face — yours alone until reveal, then it travels with your name
     egg       CHOOSE YOUR COURIER — the shell she'll come out of
     naming    her name AND her pronoun, so the hatch key says HIM/HER/THEM
     write     feed her words; the meter fills as you write
     hatch     NEW HATCH UNLOCKED, then she leaves with it

   THE EGG IS PRESENT THE WHOLE TIME. Steps 2–5 are short forms with a lot of
   air under them, and dead air on a toy reads as a broken toy. So the egg
   sits in a console readout at the foot of every one of them, breathing, with
   a status line that changes as you go — it fills the space with the one
   thing the flow is actually about, instead of with decoration.

   PRONOUNS ARE ASKED, NOT INFERRED, and default to they/them if skipped.
   There is nothing here to infer from — this product knows nothing about you
   but your writing — and a wrong guess misgenders a real person in a way the
   neutral default never does. See lib/pronouns.ts.

   TWO SCREENS THAT USED TO BE THEATRE NOW KEEP THEIR PROMISES:

   · The egg is SAVED. It used to be picked and then dropped on the way out —
     you chose a shell and the app had forgotten before onboarding finished.
     It's also no longer "a colour": the screen says what the choice is, which
     is the bird who carries your letters.

   · The mood row is READ. It used to set nothing at all — her hatch face came
     from readMood() off the text either way. A picked mood now wins.

   COLOUR: every hue in theme/y2k.ts is an app token now. The first build of
   this used a saturated periwinkle of its own and you could feel the seam at
   the handoff. The Y2K-ness is all form — 2px borders, hard shadows, meters —
   and none of it hue.

   And the tokens are the runtime theme's (10a): every component here takes
   the console skin from useEggOS() (lib/egg-os has which Y key is which
   token), so the console is Classic's pale wash, Lavender's, Paper's or
   Midnight's. Three things keep their colours in every theme: the egg and
   hatchling art (the unchosen egg in the dock still reads the static Y, as
   Y_ART), the sign-in row, which is drawn to Apple's and Google's own
   button rules, and the content fills — the brass key, the cream cue deck,
   the age warning, the mood faces — whose type is a fixed dark ink. */

type Step = "welcome" | "username" | "you" | "cakeday" | "avatar" | "egg" | "write" | "hatch" | "naming" | "dress" | "fare" | "flight";
/* THE DOCTRINE ORDER (owner, 2026-08-25): you feed the egg BEFORE anything
   has a name — the bird must exist before it can be named, and naming an
   egg is naming a stranger. So: shell → words → hatch → name → first
   flight. Everything after the hatch is post-birth: no meter, no back. */
const ORDER: Step[] = ["welcome", "username", "you", "cakeday", "avatar", "egg", "write", "hatch", "naming", "dress", "fare", "flight"];
const GUEST_ORDER: Step[] = ORDER.filter((s) => !["username", "you", "cakeday", "avatar"].includes(s));

/* EVERY STEP'S CONTENT IS OPTICALLY CENTRED between the progress meter and
   the key. It used to be top-aligned, so a short step — the welcome worst of
   all — packed everything against the meter and left a third of the screen
   dead underneath. A console reads as a console because its screen is
   composed; content shoved to the top over a void reads as a page that failed
   to finish loading.

   `flexGrow: 1` matters as much as the centring: without it a content
   container only grows to fit its children, so justifyContent has no room to
   work in and nothing moves. The two steps that carry an incubator dock get a
   matching flexible gap ABOVE the content, since they already had one below
   it — one spacer centres nothing. */
const CENTRED = { flexGrow: 1, justifyContent: "center" } as const;

// the three cards on the door — a letter's whole life (ob.door.1..3)
const CARDS = [0, 1, 2] as const;

/* the welcome headline + sub, shared by the visible copy and the off-screen
   measuring pass so the two can never drift apart. Functions of the console
   palette, so they're coloured by the theme in effect. */
const headStyle = (Y: EggPalette) => ({ fontFamily: F2.serif, fontSize: 29, color: Y.ink, textAlign: "center" as const, marginTop: 18, lineHeight: 36 });
const subStyle = (Y: EggPalette, mono: EggSkin["mono"]) => [mono(11, "r"), { color: Y.dim, textAlign: "center" as const, marginTop: 8, lineHeight: 18, letterSpacing: 0.2 }];

/* the sealed list's inline short forms live in the catalog as ob.sealed.<key>;
   this set says which dimension keys actually have one */
const SEALED_KEYS = new Set(["rhythm","vocabulary","perspective","emotion","function","punctuation","structure","sentence","quirks"]);

/* one hint per feeding (ob.feed.1..5) — each slot invites a different
   register, because three samples of the same register teach the engine less
   than one each of observation, memory and confession */
const FEED_COUNT = 5;
const CUE_COUNT = 18; // prompts in the cue deck (ob.cue.1..18)
/* where each fed thought sits around the egg — flanking it, never over it */
const ORBIT: { top: number; left?: number; right?: number; rot: string }[] = [
  { top: 40, left: 0, rot: "-6deg" },
  { top: 52, right: 0, rot: "5deg" },
  { top: 124, left: 0, rot: "4deg" },
  { top: 120, right: 0, rot: "-5deg" },
  { top: 150, left: 118, rot: "-2deg" },
];

// what the readout says about the egg at each stage (ob.eggstat.<step>)
const EGG_STATUS_STEPS: Step[] = ["username", "you", "cakeday", "avatar"];

export default function Onboarding() {
  // the console skin in the theme's colours; tk is the 10a tokens (t is the catalog's)
  const { Y, bevel, card, key: keyBtn, tag, mono, t: tk, dark } = useEggOS();
  const router = useRouter();
  const lang = useLang(); // repaint when the reader changes language
  const auth = useAuth();
  const { session, onboarded, appleAvailable } = auth;

  const [step, setStep] = useState<Step>("welcome");
  /* DEV ONLY: kindredly:///onboarding?step=avatar opens the console at a
     step, so a screen can be looked at without walking in from the door */
  const params = useLocalSearchParams<{ step?: string }>();
  useEffect(() => {
    if (__DEV__ && params.step && (ORDER as string[]).includes(params.step)) setStep(params.step as Step);
  }, [params.step]);

  /* EVERY STEP, NOT JUST THE LAST ONE. onboard_done alone tells you how
     many finished and nothing about the ones who didn't — and this is the
     steepest stretch in the whole funnel. One event per step ARRIVED-AT
     makes each drop-off visible: how many saw the egg, how many fed it,
     how many never named her. Only the step name and its index travel;
     nothing anyone typed does. */
  useEffect(() => {
    track("onboard_step", { step, i: ORDER.indexOf(step) });
  }, [step]);
  const [cardI, setCardI] = useState(0);

  const authScrollRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState("");
  const [youPro, setYouPro] = useState<PronounId | null>(null);
  const nowY = new Date().getFullYear();
  const [dob, setDob] = useState({ m: 7, d: 12, y: nowY - 20 });
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [eggVar, setEggVar] = useState(0);
  const [birdName, setBirdName] = useState("");
  const [birdPro, setBirdPro] = useState<PronounId>("she");
  const [note, setNote] = useState(""); // the thought being typed
  const [thoughts, setThoughts] = useState<string[]>([]); // the fed ones, 3–5
  const [mood, setMood] = useState<MoodId | null>(null);
  const [hatchPhase, setHatchPhase] = useState<"crack" | "born">("crack");
  const [flying, setFlying] = useState(false);
  const [stops, setStops] = useState<PoolLetter[]>([]); // what she brings back from the first crossing
  const finishP = useRef<Promise<void> | null>(null);
  const [readProg, setReadProg] = useState(0); // the read-out above the egg, 0→1
  const [celebrate, setCelebrate] = useState(0); // bumped when the hatch key is pressed
  const [saidFirst, setSaidFirst] = useState<string | null>(null); // her first word, for the copy under the headline
  const [cue, setCue] = useState(() => Math.floor(Math.random() * 18)); // which prompt the cue deck shows — a random start
  /* A GUEST SKIPS THE FORM and goes straight to the shell — but the 18+ gate
     is not a form field, it's the condition for a letter leaving the phone.
     So it is asked late, once, before the first flight (cakeLate). */
  const [dobSet, setDobSet] = useState(false);
  /* HER LOOK AND DRESS. She hatches in Sky, bare — the default bird, the
     one every screen draws until someone chooses otherwise. The dress step
     tries anything on her, First Class or not, so the effect can be seen;
     the fare page comes only when NEXT is pressed with something First
     Class still on her — a page in the flow, not a sheet. Its × puts her
     back the way she hatched and goes on to the flight (owner, 2026-09-19). */
  const [look, setLook] = useState<WrenSkin>("sticker");
  const [dress, setDress] = useState<WrenAccessory>("none");
  const { premium } = useEntitlement();
  const skinCtl = useWrenSkinControl();
  const [kick, setKick] = useState(0); // bumped when a step is completed — the incubator egg jumps
  const [nudge, setNudge] = useState<{ n: number; re: "chirp" | "tilt" | "happy" }>({ n: 0, re: "chirp" }); // the hatchling, poked from outside
  const [cakeLate, setCakeLate] = useState(false);
  /* the shell picker: the egg ROLLS toward the tile you chose, then settles */
  const roll = useSharedValue(0);
  const rollStyle = useAnimatedStyle(() => ({ transform: [{ translateX: roll.value * 0.5 }, { rotate: `${roll.value}deg` }] }));
  const [pageFocus, setPageFocus] = useState(false);
  const [fedPulse, setFedPulse] = useState(0); // bumped per FEED — the egg swallows
  /* FEED: the page shrinks away toward the egg, then snaps back empty */
  const fly = useSharedValue(0);
  const flyStyle = useAnimatedStyle(() => ({
    opacity: 1 - fly.value,
    transform: [{ translateX: fly.value * 120 }, { translateY: -fly.value * 150 }, { scale: 1 - fly.value * 0.7 }],
  }));
  const spin = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailVal, setEmailVal] = useState("");
  const [emailBad, setEmailBad] = useState(false);
  const [codeStage, setCodeStage] = useState<null | "otp" | "attach">(null);
  const [codeVal, setCodeVal] = useState("");
  const [codeBad, setCodeBad] = useState(false);
  const finishing = useRef(false);

  /* the egg breathes wherever it appears, and twitches harder once it's
     cracking — same shared value, two amplitudes */
  const wob = useSharedValue(0);
  useEffect(() => {
    wob.value = withRepeat(
      withSequence(withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const breathe = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wob.value * 2.6}deg` }, { scale: 1 + wob.value * 0.012 }],
  }));

  /* THE LETTERS SHE BRINGS BACK ARE REAL. The pool is fetched while you
     name her, so the first crossing has three genuine stops — and Today
     paints from the same cache the moment it opens. */
  useEffect(() => {
    if ((step !== "naming" && step !== "flight") || stops.length) return;
    fetchPool(40)
      .then((p) => {
        const l = p || [];
        setStops(rationPool(l).slice(0, 3)); // the same three that will head the desk
        if (l.length) void AsyncStorage.setItem(POOL_CACHE_KEY, JSON.stringify(l.slice(0, 40))).catch(() => {});
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* returning, already-onboarded → straight in. ONLY from the door: the
     flag also flips at the end of THIS run (finish() saves the profile with
     onboarded: true while her first flight is still playing), and this
     redirect used to fire the moment that save came back — a fast network
     cut the flight short, a slow one let it finish. The flight's own
     onFlightDone is the only way out of the flight. */
  useEffect(() => {
    if (session && onboarded && step === "welcome") router.replace("/(tabs)/letters");
  }, [session, onboarded, step, router]);

  // signed in but not set up → start the console at step two
  useEffect(() => {
    if (session && !auth.isGuest && !onboarded && step === "welcome") setStep("username");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboarded]);

  // the three cards on the door light up in turn
  useEffect(() => {
    if (step !== "welcome") return;
    const id = setInterval(() => setCardI((i) => (i + 1) % CARDS.length), 1600);
    return () => clearInterval(id);
  }, [step]);

  /* THE READ-OUT. The engine does all its reading in a blink; the list above
     the egg ticks through it over the seconds the shell takes to crack, so
     the read and the birth are one moment (components/HatchStage). */
  useEffect(() => {
    if (step !== "hatch") return;
    setHatchPhase("crack");
    setReadProg(0);
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / (HATCH_READ_S * 1000));
      setReadProg(p);
      if (p >= 1) clearInterval(id);
    }, 90);
    return () => clearInterval(id);
  }, [step]);

  const doApple = async () => {
    setBusy("apple");
    const r = await auth.signInWithApple();
    setBusy(null);
    if ("error" in r) Alert.alert(t("ob.apple.title"), r.error);
  };
  const doGoogle = async () => {
    setBusy("google");
    const r = await auth.signInWithGoogle();
    setBusy(null);
    if ("error" in r) Alert.alert(t("ob.continueGoogle"), r.error);
  };
  /* Alert.prompt was the last stock dialog on this screen — a system text
     box floating over the sign-in stack it didn't match. The email key now
     unfolds IN PLACE: the same key geometry becomes an input, the primary
     action sits under it, and nothing ever leaves the page. */
  const doEmail = () => setEmailOpen((v) => !v);
  /* the unfolded form lives at the bottom of a scroll view — when the
     keyboard rises it covers exactly that region, so the fold-out walks the
     page down to meet it (and again when the code stage swaps in). */
  useEffect(() => {
    if (!emailOpen) return;
    const tm = setTimeout(() => authScrollRef.current?.scrollToEnd({ animated: true }), 320);
    return () => clearTimeout(tm);
  }, [emailOpen, codeStage]);
  const sendEmailLink = async () => {
    const email = emailVal.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailBad(true);
      return;
    }
    setEmailBad(false);
    setBusy("email");
    const r = await auth.signInWithEmail(email);
    setBusy(null);
    if ("error" in r) Alert.alert(t("ob.continueEmail"), r.error);
    else setCodeStage("sent" in r && r.mode === "attach" ? "attach" : "otp");
  };
  const verifyCode = async (raw?: string) => {
    const token = (raw ?? codeVal).trim();
    if (token.length !== 6 || !codeStage) return;
    setBusy("email");
    const r = await auth.verifyEmailCode(emailVal.trim(), token, codeStage);
    setBusy(null);
    if ("error" in r) {
      setCodeBad(true);
      setCodeVal("");
    }
    // success needs no navigation here — the session lands and the
    // welcome step's own effect walks the reader forward
  };

  // birthday derived — the only reason this screen exists is the 18 below
  const years = Array.from({ length: 80 }, (_, i) => nowY - 13 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const yi = Math.max(0, years.indexOf(dob.y));
  let age = nowY - dob.y;
  const nd = new Date();
  if (nd.getMonth() < dob.m || (nd.getMonth() === dob.m && nd.getDate() < dob.d)) age -= 1;
  const ageOk = age >= 18;
  const dobStr = `${dob.y}-${String(dob.m + 1).padStart(2, "0")}-${String(dob.d).padStart(2, "0")}`;

  const line = note.trim();
  const handle = username.trim();
  const her = birdName.trim();
  const pro = pronoun(birdPro);
  // the key says HATCH OTIS once she's named, HATCH HIM/HER/THEM before that
  const HER = (her || pro.obj).toUpperCase();
  /* WHO HATCHES comes from the Hatch Engine (lib/hatch-engine.ts): nine
     dimensions scored 0–100 with a locked/growing confidence each, blended by
     the owner's weights, matched against the archetype table. Wren is grown
     from the writing DNA, never selected. wrenTypeFor survives only to pick
     what she wears, which is all it was ever load-bearing for. */
  /* ONE thought hatches her. Three-to-five was the spec draft, and it is a
     wall at the exact moment someone is least invested — the engine marks
     what it hasn't read as GROWING anyway, so a thin first read is honest by
     construction. More feeds lock more dimensions; the meter sells that as
     an invitation instead of a toll. The line still in the input counts as
     fed, so nobody loses words to a button they didn't press. */
  const fed = [...thoughts, ...(line.length >= 2 ? [line] : [])];
  const corpus = fed.join("\n\n");
  const hatched = useMemo(() => hatch(fed), [corpus]); // eslint-disable-line react-hooks/exhaustive-deps
  const hatchMood: WrenMood = mood ? moodToWren(mood) : readMood(corpus); // picked mood wins
  const canFeed = line.length >= 2 && thoughts.length < 5;
  const canHatch = fed.length >= 1;

  const feed = () => {
    if (!canFeed) return;
    setThoughts((t) => [...t, line]);
    setNote("");
    setFedPulse((n) => n + 1);
    setCue((c) => c + 1);
    fly.value = withSequence(withTiming(1, { duration: 380, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 0 }));
  };

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    await unsetFlag(ARRIVAL_SENT);
    if (corpus.length >= 2) {
      try {
        await upsertFingerprint(signatureVector(corpus), voiceSignature(corpus).words);
      } catch {
        /* best-effort */
      }
      /* the pool gets ONE thought, not a concatenation — a letter is a single
         coherent thing. The longest of what they fed.

         It used to go at ANY length, because a hatch is allowed on one
         thought and a gate beside it that disagreed had once dropped the
         letter silently. The gate is now explicit and the same one the desk
         uses. */
      const opener = [...fed].sort((a, b) => weightedCount(b) - weightedCount(a))[0];
      /* AND IT CLEARS THE SAME FLOOR AS ANY LETTER. Below this it used to go
         anyway — you may hatch on one word, but one word is not a letter,
         and the pool was filling with them (owner, 2026-09-19). She still
         flies; what's too short stays on the phone. */
      if (opener && weightedCount(opener) >= OPENING_MIN) {
        await setFlag(ARRIVAL_SENT);
        try {
          /* the language was HARDCODED "en". Every opening letter this
             product has ever seeded was stamped English regardless of what
             it was written in — which is the same fact that decides whether
             a reader is offered "read it in yours". Their language, not a
             constant. */
          await publishLetter(starterStamp(mood, opener), opener, getLang());
          track("onboard_done", { fed: fed.length });
        } catch {
          /* best-effort — never block getting in */
        }
      }
    }
    try {
      await bumpStageFloor("hatch");
      /* She is shaped by what she was fed, not sorted into one of four types
         and handed a pair of headphones for it. The read that produced her
         nine dimensions produces her proportions too, and it is kept so she
         is the same chick tomorrow. */
      await saveHatchlingForm(hatchlingForm(hatched.dims));
      await saveWrenEgg(eggVar);
      skinCtl.pick(skinUnlocked(look, EMPTY_STATS, premium) ? look : "sticker");
      skinCtl.dress(ACCESSORY_META.find((a) => a.id === dress)?.free || premium ? dress : "none");
      await saveWrenName(her);
      await saveWrenPronoun(birdPro);
      await saveArchetype(hatched.archetype.id);
      if (youPro) await saveYourPronoun(youPro);
    } catch {
      /* best-effort */
    }
    /* the pronoun goes up with the rest: the matcher reads it (0021), quietly */
    await auth.saveProfile({ handle, dob: dobStr, avatarId, firstLine: fed[0] || undefined, pronoun: youPro });
    wrenStageDirty();
  };

  /* LET'S GO — her first crossing plays over this page while the letter
     posts and the profile saves underneath; when both are done, Today. */
  const letHerGo = () => {
    setFlying(true);
    finishP.current = finish();
  };
  const onFlightDone = async () => {
    try {
      await finishP.current;
    } catch {
      /* finish is best-effort by construction */
    }
    await setFlag(TODAY_RITUAL);
    await setFlag(ARRIVAL_FRESH);
    try {
      await AsyncStorage.setItem(ARRIVAL_AT_KEY, String(Date.now()));
    } catch {
      /* best-effort */
    }
    router.replace("/(tabs)/letters");
  };

  /* on from the name: a guest who never gave a birthday gives it here,
     then the rack; everyone else goes straight to the rack */
  const toDress = () => {
    if (!dobSet) {
      setCakeLate(true);
      setStep("cakeday");
    } else setStep("dress");
  };

  /* is anything on her that she'd need First Class to keep? */
  const lookOpen = skinUnlocked(look, EMPTY_STATS, premium);
  const dressOpen = !!ACCESSORY_META.find((a) => a.id === dress)?.free || premium;
  const wearingFirstClass = !lookOpen || !dressOpen;
  /* she goes on to the flight as she hatched, minus nothing that's hers */
  const shedAndFly = () => {
    if (!lookOpen) setLook("sticker");
    if (!dressOpen) setDress("none");
    setStep("flight");
  };

  /* every step forward kicks the incubator — the egg answers each thing you
     tell it, so the dock is a reaction, not a decoration */
  const go = (next: Step) => {
    setKick((k) => k + 1);
    setStep(next);
  };
  /* THE METER COUNTS THE STEPS THIS PERSON WALKS. A guest goes from the
     door to the shell, past the four form screens, and the meter used to
     credit them anyway: six of seven bars lit on their first screen. The
     guest's run is its own, shorter sequence. */
  const walk = auth.isGuest || !session ? GUEST_ORDER : ORDER;
  const stepIdx = walk.indexOf(step);
  const bars = walk.indexOf("hatch");
  const back = () => setStep(step === "egg" && !dobSet ? "welcome" : ORDER[Math.max(0, stepIdx - 1)]);
  const eggStatus = EGG_STATUS_STEPS.includes(step) ? t(`ob.eggstat.${step}`) : undefined;

  /* ── 1 · THE DOOR ──────────────────────────────────────────────────
     A letter's whole life in three cards — write, carry, reply — that
     light up in turn, under one headline that holds still (W39). The old
     window carousel cycled the headline with the card, and the sign-in keys
     underneath walked up and down with each language's line count. */
  if (step === "welcome") {
    return (
      <Console>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={authScrollRef} contentContainerStyle={{ ...CENTRED, paddingVertical: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
            <View style={{ flexDirection: "row" }}>
              {CARDS.map((k, i) => (
                <DoorCard key={k} i={i} on={cardI === i} />
              ))}
            </View>

            <Text style={headStyle(Y)}>
              {t("ob.door.h")} <Text style={{ fontFamily: F2.serifItalic, fontStyle: "italic" }}>{t("ob.door.hi")}</Text>
            </Text>
            <Text style={subStyle(Y, mono)}>{t("ob.door.s")}</Text>
          </View>

          <View style={{ paddingHorizontal: 18, marginTop: 24 }}>
              <>
                {/* THE APPLE KEY IS DRAWN, TO APPLE'S OWN GUIDELINES — black,
                    the logo, "Continue with Apple", 52pt — so its logo sits
                    in the same left column as the other two. The system
                    component centres its logo with the text and can't be
                    told otherwise; three keys with two alignments read as a
                    mistake (owner, 2026-09-19). Custom buttons are allowed
                    by the HIG when they keep the logo, wording and sizing. */}
                {appleAvailable ? (
                  <AuthKey dark first icon={<AppleLogo />} label={busy === "apple" ? "…" : t("ob.continueApple")} onPress={doApple} disabled={!!busy} dim={!!busy && busy !== "apple"} />
                ) : null}
                <AuthKey
                  icon={<GoogleG />}
                  label={busy === "google" ? "…" : t("ob.continueGoogle")}
                  onPress={doGoogle}
                  disabled={!!busy}
                  dim={!!busy && busy !== "google"}
                  first={!appleAvailable}
                />
                {!emailOpen ? (
                  <AuthKey
                    icon={<MailGlyph />}
                    label={t("ob.continueEmail")}
                    onPress={doEmail}
                    disabled={!!busy}
                    dim={!!busy && busy !== "email"}
                  />
                ) : codeStage ? (
                  <>
                    {/* the fields the email key unfolds into are keys of the
                        sign-in row, so like the row they keep their white, their
                        type and their red in every theme (see AuthKey) */}
                    <View
                      style={{
                        height: 52,
                        borderRadius: 10,
                        marginTop: 12,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: codeBad ? "#D0342C" : "rgba(0,0,0,0.18)",
                        justifyContent: "center",
                      }}
                    >
                      <TextInput
                        value={codeVal}
                        onChangeText={(v) => {
                          const d = v.replace(/\D/g, "").slice(0, 6);
                          setCodeVal(d);
                          if (codeBad) setCodeBad(false);
                          if (d.length === 6) void verifyCode(d);
                        }}
                        autoFocus
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        placeholder="••••••"
                        placeholderTextColor="rgba(31,31,31,0.3)"
                        style={{ fontSize: 24, letterSpacing: 12, color: "#1F1F1F", textAlign: "center", height: 52 }}
                      />
                    </View>
                    <Text style={{ fontSize: 13, color: codeBad ? "#D0342C" : Y.dim, textAlign: "center", marginTop: 10, lineHeight: 19 }}>
                      {busy === "email" ? "…" : codeBad ? t("ob.code.bad") : t("ob.code.cap", { email: emailVal.trim() })}
                    </Text>
                    <Pressable onPress={() => { setCodeStage(null); setCodeVal(""); setCodeBad(false); }} hitSlop={8} style={{ alignSelf: "center", marginTop: 8, padding: 4 }}>
                      <Text style={{ fontSize: 13, color: Y.blue }}>{t("ob.code.again")}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View
                      style={{
                        height: 52,
                        borderRadius: 10,
                        marginTop: 12,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: emailBad ? "#D0342C" : "rgba(0,0,0,0.18)",
                        justifyContent: "center",
                      }}
                    >
                      <View style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 24, alignItems: "center", justifyContent: "center" }}>
                        <MailGlyph />
                      </View>
                      <TextInput
                        value={emailVal}
                        onChangeText={(v) => {
                          setEmailVal(v);
                          if (emailBad) setEmailBad(false);
                        }}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        placeholder={t("ob.email.ph")}
                        placeholderTextColor="rgba(31,31,31,0.35)"
                        onSubmitEditing={sendEmailLink}
                        returnKeyType="send"
                        style={{ fontSize: 17, color: "#1F1F1F", paddingLeft: 54, paddingRight: 18, height: 52 }}
                      />
                    </View>
                    <AuthKey
                      dark
                      icon={<MailGlyph size={18} color="#FFFFFF" />}
                      label={busy === "email" ? "…" : t("ob.email.send")}
                      onPress={sendEmailLink}
                      disabled={!!busy}
                    />
                    <Text style={{ fontSize: 13, color: emailBad ? "#D0342C" : Y.dim, textAlign: "center", marginTop: 10 }}>
                      {emailBad ? t("ob.email.bad") : t("ob.email.body")}
                    </Text>
                  </>
                )}
                {/* clear of the email key's hard shadow — it used to follow a
                    line of text, and now it follows a bevelled button */}
                <Pressable
                  onPress={() => {
                    /* fire-and-forget: the session usually lands before they
                       finish typing a pen name, and nothing on the next few
                       screens needs it yet */
                    void auth.signInAnonymously();
                    setStep("egg");
                  }}
                  style={{ alignItems: "center", paddingTop: 18 }}
                >
                  {/* "Explore first, sign in later" promised something the product can't
                      keep: without a session the pool is unreadable (RLS is
                      `to authenticated`), so there is very little to explore.
                      "Just looking" is what a person actually says walking into
                      a shop — it promises nothing, and unlike Skip or Continue
                      as guest it doesn't imply they're dodging the real thing. */}
                  <Text style={[mono(11, "r"), { color: Y.dim }]}>{t("ob.justLooking")}</Text>
                </Pressable>

                {/* the agreement line (1.2 UGC): every door in, including "Just
                    looking", passes this sentence. Underlines mark what's a
                    link; Y.dim keeps it quiet — consent copy that shouts reads
                    as a trap. */}
                <Text style={[mono(9.5, "r"), { color: Y.dim, textAlign: "center", paddingTop: 14, lineHeight: 15 }]}>
                  {t("ob.agree.pre")}{" "}
                  <Text onPress={() => openTerms()} style={{ textDecorationLine: "underline" }}>
                    {t("ob.agree.terms")}
                  </Text>{" "}
                  &{" "}
                  <Text onPress={() => openPrivacy()} style={{ textDecorationLine: "underline" }}>
                    {t("ob.agree.privacy")}
                  </Text>
                </Text>
              </>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 2 · pen name ───────────────────────────────────────────────────── */
  if (step === "username") {
    return (
      <Console step={stepIdx} bars={bars} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ flex: 1 }} />
          <Head plain={t("ob.username.plain")} em={t("ob.username.em")} sub={t("ob.username.sub")} />
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ paddingHorizontal: 18, marginTop: 20 }}>
            <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 56 }]}>
              <Text style={[mono(15, "b"), { color: Y.blue, marginRight: 8 }]}>›</Text>
              <TextInput
                value={username}
                onChangeText={(v) => {
                  if (!username && v) setKick((k) => k + 1);
                  setUsername(v);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                autoFocus
                placeholder={t("ob.username.placeholder")}
                placeholderTextColor={Y.faint}
                keyboardAppearance={dark ? "dark" : "light"}
                style={{ flex: 1, fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 21, color: Y.ink }}
              />
            </View>
          </Animated.View>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <EggDock status={eggStatus} style={breathe} kick={kick} />
          </View>
          <Foot label={`${t("ob.next")} ›`} on={handle.length > 0} onPress={() => go("you")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 3 · what to call you ───────────────────────────────────────────── */
  if (step === "you") {
    return (
      <Console step={stepIdx} bars={bars} onBack={back}>
        <View style={{ flex: 1 }} />
        <Head plain={t("ob.you.plain", { name: handle || t("ob.hey") })} em={t("ob.you.em")} sub={t("ob.you.sub")} />
        <View style={{ paddingHorizontal: 18, marginTop: 20 }}>
          {PRONOUNS.map((p, i) => {
            const on = youPro === p.id;
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(90 + i * 70).duration(420)}>
                <Pressable
                  onPress={() => {
                    setYouPro(on ? null : p.id);
                    setKick((k) => k + 1);
                  }}
                  style={[
                    card,
                    bevel(on ? 4 : 2.5, on ? 4 : 2.5),
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      height: 58,
                      marginBottom: 12,
                      backgroundColor: on ? Y.blue : Y.panel,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: on ? Y.onFill : Y.ln,
                      marginRight: 14,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Y.onFill }} /> : null}
                  </View>
                  <Text style={{ fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 20, color: on ? Y.onFill : Y.ink }}>{t(`pr.${p.id}`)}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <EggDock status={eggStatus} style={breathe} kick={kick} />
        </View>
        <Foot label={`${t("ob.next")} ›`} on onPress={() => go("cakeday")} skip={youPro ? undefined : t("ob.preferNot")} onSkip={() => go("cakeday")} />
      </Console>
    );
  }

  /* ── 4 · cakeday ────────────────────────────────────────────────────── */
  if (step === "cakeday") {
    return (
      <Console step={cakeLate ? undefined : stepIdx} bars={bars} onBack={cakeLate ? () => setStep("naming") : back}>
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
          <Head plain={t("ob.cakeday.plain", { name: handle || t("ob.hey") })} em={t("ob.cakeday.em")} sub={t("ob.cakeday.sub")} />
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ paddingHorizontal: 18, marginTop: 16 }}>
            <View style={[card, bevel(4, 4), { flexDirection: "row", overflow: "hidden" }]}>
              <Wheel items={monthsShort()} value={dob.m} onChange={(i) => setDob((d) => ({ ...d, m: i }))} />
              <Wheel items={days} value={dob.d - 1} onChange={(i) => setDob((d) => ({ ...d, d: i + 1 }))} />
              <Wheel items={years} value={yi} onChange={(i) => setDob((d) => ({ ...d, y: years[i] }))} />
              {/* the selection band, ruled once across the three columns in the divider colour */}
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 88, height: 2, backgroundColor: tk.line }} />
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 132, height: 2, backgroundColor: tk.line }} />
            </View>

            {/* the age, live — one pill that turns when the answer does. The
                under-18 state is a warning, which 10a has no token for: its
                pink, its postmark red and its brown type are a fixed set */}
            <View style={{ alignItems: "center", marginTop: 16 }}>
              <View style={[tag, bevel(2.5, 2.5), { backgroundColor: ageOk ? Y.panel : "#FBE7E1", borderColor: ageOk ? Y.ln : Y.warn, shadowColor: ageOk ? Y.ln : Y.warn, paddingHorizontal: 16, paddingVertical: 8 }]}>
                <Text style={[mono(10.5, "b"), { color: ageOk ? Y.ink : "#8E3B2A", letterSpacing: 1 }]}>
                  {ageOk ? t("ob.ageIs", { n: String(age) }) + " ✓" : t("ob.age.under", { n: String(age) })}
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        {!cakeLate && <EggDock status={eggStatus} style={breathe} kick={kick} />}
        <Foot
          label={ageOk ? `${t("ob.next")} ›` : t("ob.age.only")}
          on={ageOk}
          onPress={() => {
            setDobSet(true);
            go(cakeLate ? "dress" : "avatar");
          }}
        />
      </Console>
    );
  }

  /* ── 5 · a face ─────────────────────────────────────────────────────
     THE POOL FOLLOWS THE PRONOUN. she → the f pool, he → the m pool,
     they / skipped → both, interleaved. No tabs: what you said two screens
     ago already answered it. The chosen face lands on the incubator's
     corner: you, and your egg (W39). */
  if (step === "avatar") {
    const list = youPro === "she" ? FACES.filter((a) => a.pool === "f") : youPro === "he" ? FACES.filter((a) => a.pool === "m") : FACES;
    return (
      <Console step={stepIdx} bars={bars} onBack={back}>
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
          <Head plain={t("ob.avatar.plain")} em={t("ob.avatar.em")} sub={t("ob.avatar.sub")} />
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ paddingHorizontal: 18, marginTop: 16 }}>
            <View style={[card, bevel(4, 4), { padding: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }]}>
              {list.map((a) => {
                const on = avatarId === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      setAvatarId(on ? null : a.id);
                      if (!on) setKick((k) => k + 1);
                    }}
                    style={{ margin: 4 }}
                  >
                    <View
                      style={[
                        on ? bevel(2.5, 2.5) : null,
                        {
                          width: 54,
                          height: 54,
                          borderRadius: 27,
                          borderWidth: on ? 3 : 2,
                          borderColor: on ? Y.blue : Y.ln,
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: [{ scale: on ? 1.08 : 1 }],
                        },
                      ]}
                    >
                      <AvatarImage id={a.id} seed={a.id} size={52} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
        <EggDock status={eggStatus} style={breathe} kick={kick} face={avatarId} />
        <Foot label={`${t("ob.next")} ›`} on onPress={() => go("egg")} skip={t("ob.skipNow")} onSkip={() => go("egg")} />
      </Console>
    );
  }

  /* ── 6 · choose your courier ────────────────────────────────────────
     The egg used to sit inside a drawn handheld with A/B/C keys under it —
     a device inside the device, and three keys that did what the four
     tiles already did. Now it stands on the ground and ROLLS toward the
     tile you tap; the birthmark on its crown changes with it. The tiles
     carry the names, and the chosen one is pressed in (W39). */
  if (step === "egg") {
    return (
      <Console step={stepIdx} bars={bars} onBack={back}>
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
          <Head plain={t("ob.egg.plain")} em={t("ob.egg.em")} sub={t("ob.egg.sub")} />

          <Animated.View entering={ZoomIn.delay(80).duration(380)} style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={[mono(9.5, "b"), { color: Y.dim, letterSpacing: 2 }]}>{t("ob.eggLv")}</Text>
            <Animated.View style={[rollStyle, { marginTop: 4 }]}>
              <Animated.View style={breathe}>
                <EggShell variant={eggVar} size={232} />
              </Animated.View>
            </Animated.View>
          </Animated.View>

          {/* the four shells, named */}
          <View style={{ flexDirection: "row", paddingHorizontal: 18, marginTop: 6 }}>
            {EGG_SHELLS.map((s, i) => {
              const on = eggVar === i;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    roll.value = (i - eggVar) * 40;
                    roll.value = withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) });
                    setEggVar(i);
                  }}
                  style={[
                    card,
                    on ? null : bevel(3, 3),
                    {
                      flex: 1,
                      marginHorizontal: 4,
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 14,
                      backgroundColor: on ? Y.ink : Y.panel,
                      transform: [{ translateX: on ? 3 : 0 }, { translateY: on ? 3 : 0 }],
                    },
                  ]}
                >
                  <View style={{ width: 22, height: 28, borderRadius: 11, borderTopLeftRadius: 13, borderTopRightRadius: 13, borderWidth: 2, borderColor: Y.ln, backgroundColor: s.mid }} />
                  <Text style={[mono(8.5, "b"), { color: on ? Y.onFill : Y.ink, marginTop: 8, letterSpacing: 0.8 }]}>{s.name.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Foot label={t("ob.egg.cta")} on onPress={() => setStep("write")} />
      </Console>
    );
  }

  /* ── 8 · name what hatched ── POST-BIRTH: no meter, no back. You cannot
     climb back into the shell, and the form is over — this is the first
     thing you do FOR someone rather than about yourself. */
  if (step === "naming") {
    return (
      <Console>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={CENTRED} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Head plain={t("ob.naming.plain")} em={t("ob.naming.em")} sub={t("ob.naming.sub")} />

            <Animated.View entering={ZoomIn.delay(60).duration(340)} style={{ alignItems: "center", marginTop: 12 }}>
              <Hatchling mood={hatchMood} shell={eggVar} form={hatchlingForm(hatched.dims)} dims={hatched.dims} skin={look} accessory={dress} tag={her ? her.toUpperCase().slice(0, 8) : null} nudge={nudge} />
            </Animated.View>

            <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
              <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 56 }]}>
                <Text style={[mono(15, "b"), { color: Y.blue, marginRight: 8 }]}>›</Text>
                <TextInput
                  value={birdName}
                  onChangeText={(v) => {
                    if (v.length > birdName.length) setNudge((n) => ({ n: n.n + 1, re: "chirp" }));
                    setBirdName(v);
                  }}
                  autoCorrect={false}
                  maxLength={16}
                  placeholder={t("ob.naming.placeholder")}
                  placeholderTextColor={Y.faint}
                  keyboardAppearance={dark ? "dark" : "light"}
                  style={{ flex: 1, fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 21, color: Y.ink }}
                />
                {/* the dice, in the box: roll a name */}
                <Pressable
                  onPress={() => {
                    setBirdName(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)]);
                    setNudge((x) => ({ n: x.n + 1, re: "happy" }));
                  }}
                  hitSlop={8}
                  style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 2, borderColor: Y.ln, backgroundColor: Y.brass, alignItems: "center", justifyContent: "center", marginLeft: 8 }}
                >
                  <DiceGlyph />
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
                {NAME_IDEAS.slice(0, 6).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      setBirdName(n);
                      setNudge((x) => ({ n: x.n + 1, re: "chirp" }));
                    }}
                    style={[tag, birdName === n ? null : bevel(2, 2), { margin: 4, paddingHorizontal: 11, backgroundColor: birdName === n ? Y.blue : Y.panel }]}
                  >
                    <Text style={[mono(9.5, "b"), { color: birdName === n ? Y.onFill : Y.ink }]}>{n.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>

              {/* and what to call them — this is what makes the hatch key read
                  HATCH HIM / HATCH HER / HATCH THEM */}
              {/* Wren is the courier's own name — the official desk at the top
                  of Kindreds — so yours needs another */}
              {isReservedName(her) && (
                <Text style={[mono(9.5, "b"), { color: Y.blue, marginTop: 12, textAlign: "center" }]}>{t("ob.naming.reserved")}</Text>
              )}
              <Text style={[mono(9.5, "b"), { color: Y.dim, marginTop: 20, textAlign: "center" }]}>
                {her ? t("ob.naming.goesBy", { name: her.toUpperCase() }) : t("ob.naming.goesByThey")}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
                {PRONOUNS.map((p) => {
                  const on = birdPro === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setBirdPro(p.id);
                        setNudge((x) => ({ n: x.n + 1, re: "tilt" }));
                      }}
                      style={[tag, bevel(on ? 3 : 2, on ? 3 : 2), { marginHorizontal: 4, paddingHorizontal: 12, backgroundColor: on ? Y.blue : Y.panel }]}
                    >
                      <Text style={[mono(9.5, "b"), { color: on ? Y.onFill : Y.ink }]}>{t(`pr.${p.id}`).toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
          <Foot label={t("ob.naming.next")} on={her.length > 0 && !isReservedName(her)} onPress={toDress} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 9 · dress her ── POST-BIRTH ─────────────────────────────────────
     Looks (the skins) and dress (the pieces), tried on live. Sky and two
     pieces are free; a First Class one opens the fare page. Moss waits for
     the first kindred and says so. LET HER GO is what keeps the choice. */
  if (step === "dress") {
    /* EVERYTHING TRIES ON. A tap puts the look or the piece on her, free or
       not, so the effect can be seen on her — the fare comes up on NEXT,
       and only if something First Class is still on her then. */
    const tryLook = (id: WrenSkin) => {
      setLook(id);
      setNudge((x) => ({ n: x.n + 1, re: "happy" }));
    };
    const tryDress = (id: WrenAccessory) => {
      setDress(id);
      setNudge((x) => ({ n: x.n + 1, re: "chirp" }));
    };
    return (
      <Console>
        <ScrollView contentContainerStyle={CENTRED} showsVerticalScrollIndicator={false}>
          <Head plain={t("ob.dress.plain", { name: her || t("ob.naming.placeholder") })} em={t("ob.dress.em")} sub={t("ob.dress.sub")} />
          <Animated.View entering={ZoomIn.delay(60).duration(340)} style={{ alignItems: "center", marginTop: 12 }}>
            <Hatchling mood={hatchMood} shell={eggVar} form={hatchlingForm(hatched.dims)} dims={hatched.dims} skin={look} accessory={dress} tag={(her || t("ob.naming.placeholder")).toUpperCase().slice(0, 8)} nudge={nudge} />
          </Animated.View>

          <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
            {/* the same rack as her room — everything tries on here */}
            <WardrobeRack
              tone="console"
              skin={look}
              accessory={dress}
              stats={EMPTY_STATS}
              premium={premium}
              stage="hatch"
              form={hatchlingForm(hatched.dims)}
              mark={EGG_SHELLS[eggVar].mark}
              onLook={(id) => tryLook(id)}
              onDress={(id) => tryDress(id)}
            />
          </View>
        </ScrollView>
        <Foot label={wearingFirstClass ? `${t("ob.next")} ›` : t("ob.naming.cta")} on tone={wearingFirstClass ? undefined : "brass"} onPress={() => (wearingFirstClass ? setStep("fare") : setStep("flight"))} />
      </Console>
    );
  }

  /* ── 10 · THE FARE ── a page, not a sheet. Only reached with something
     First Class on her. × takes those off and goes on to the flight;
     bought, she keeps them and goes on the same way. */
  if (step === "fare") {
    const what = !lookOpen && !dressOpen ? t("ob.fare.both") : !lookOpen ? t("ob.fare.look") : t("ob.fare.dress");
    return (
      <PaywallBody
        source="onboarding_dress"
        courier={her || t("ob.naming.placeholder")}
        head={t("ob.fare.head", { what })}
        lead={t("ob.fare.lead", { name: her || t("ob.naming.placeholder") })}
        onClose={shedAndFly}
        onDone={() => setStep("flight")}
      />
    );
  }

  /* ── 7 · feed it thoughts (W39) ─────────────────────────────────────
     THE EGG LISTENS. It sits over the page and reacts to the typing — the
     glow, the twitch, the swell — and everything fed orbits it as a chip
     (tap one to take it back). The page hears you in four steps and says
     so in its corner; FEED sends the page into the egg. A cue deck sits
     between them for anyone who opens the box and finds nothing to say.
     There is no counter card: the egg's pips are the meter. */
  if (step === "write") {
    const n = thoughts.length;
    const dl = line.length;
    const hear = n >= FEED_COUNT ? t("ob.hear.full") : dl === 0 ? t("ob.hear.listen") : dl < 24 ? t("ob.hear.goOn") : dl < 70 ? t("ob.hear.warmer") : t("ob.hear.you");
    // faint → brass → the courier's pink → the accent; the brass and pink are fixed in every theme
    const hearDot = dl === 0 ? Y.faint : dl < 24 ? Y.brass : dl < 70 ? "#E9A6B4" : Y.blue;
    const left = FEED_COUNT - n;
    const sub = n === 0 ? t("ob.write.sub") : n < FEED_COUNT ? (left === 1 ? t("ob.write.sMore1") : t("ob.write.sMore", { n: String(left) })) : t("ob.write.s5");
    return (
      <Console step={stepIdx} bars={bars} onBack={back}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* the egg, and what it has eaten, in orbit */}
            <View style={{ height: 172, marginHorizontal: 18, alignItems: "center", justifyContent: "center" }}>
              <View style={{ position: "absolute", left: 0, right: 0, top: 6, flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[mono(9.5, "b"), { color: Y.dim, letterSpacing: 2 }]}>{t("ob.feed.label")}</Text>
                <Text style={[mono(9.5, "b"), { color: n ? Y.blue : Y.dim, letterSpacing: 2 }]}>{n ? t("ob.feed.fed", { n: String(n) }) : t("ob.feed.hungry")}</Text>
              </View>
              <FeedEgg shell={eggVar} fed={n} draftLen={dl} pulse={fedPulse} breathe={breathe} />
              {thoughts.map((th, i) => {
                const o = ORBIT[i] ?? ORBIT[ORBIT.length - 1];
                return (
                  <Animated.View key={`${i}-${th.slice(0, 8)}`} entering={ZoomIn.duration(360).easing(Easing.out(Easing.back(1.6)))} style={{ position: "absolute", top: o.top, left: o.left, right: o.right, maxWidth: 124 }}>
                    <View style={{ transform: [{ rotate: o.rot }] }}>
                      <Pressable onPress={() => setThoughts((arr) => arr.filter((_, j) => j !== i))} style={[card, bevel(2, 2), { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }]}>
                        <Text numberOfLines={1} style={{ fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 12, color: Y.ink }}>
                          {th}
                        </Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* ONE LINE OF HEADLINE, whatever the language — it shrinks to fit
                rather than dropping a word onto a line of its own. The grey
                line under it is a chip, not loose type (owner, 2026-09-19). */}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ fontFamily: F2.serif, fontSize: 23, lineHeight: 30, color: Y.ink, textAlign: "center", paddingHorizontal: 22 }}>
              {n === 0 ? (
                <>
                  {t("ob.write.plain")} <Text style={{ fontFamily: F2.serifItalic, fontStyle: "italic" }}>{t("ob.write.em")}</Text>
                </>
              ) : (
                t(`ob.write.t${Math.min(n, FEED_COUNT)}`)
              )}
            </Text>
            <View style={{ alignItems: "center", marginTop: 8, paddingHorizontal: 22 }}>
              <View style={[tag, { backgroundColor: Y.groundDeep, borderColor: "transparent", paddingHorizontal: 14, paddingVertical: 6, maxWidth: 340 }]}>
                <Text style={[mono(9.5, "b"), { color: Y.dim, textAlign: "center", lineHeight: 15, letterSpacing: 0.4 }]}>{sub}</Text>
              </View>
            </View>

            {n < FEED_COUNT && (
              <View style={{ paddingHorizontal: 18 }}>
                {/* the cue deck — tap to shuffle. Its cream and gold label are
                    the deck's own and stay in every theme, so the cue on it is
                    in the fixed dark ink; its outline and the shuffle key are
                    the console's */}
                <Pressable
                  onPress={() => {
                    setCue((c) => c + 1);
                    spin.value = withTiming(spin.value + 180, { duration: 400, easing: Easing.out(Easing.cubic) });
                  }}
                  style={{ marginTop: 14, height: 36, borderRadius: 999, backgroundColor: "#FFF3D6", borderWidth: 2, borderColor: Y.ln, flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 4 }}
                >
                  <Text style={[mono(9, "b"), { color: "#8A6A1F", letterSpacing: 1.6 }]}>{t("ob.cue.label")}</Text>
                  <Text numberOfLines={1} style={{ flex: 1, marginLeft: 8, marginRight: 6, fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 13.5, color: Y.fixedInk }}>
                    {t(`ob.cue.${(cue % CUE_COUNT) + 1}`)}
                  </Text>
                  <Animated.View style={[spinStyle, { width: 26, height: 26, borderRadius: 13, backgroundColor: Y.panel, borderWidth: 2, borderColor: Y.ln, alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 13, color: Y.ink, marginTop: -1 }}>↻</Text>
                  </Animated.View>
                </Pressable>

                {/* the page */}
                <Animated.View
                  style={[
                    flyStyle,
                    card,
                    bevel(pageFocus ? 6 : 4, pageFocus ? 6 : 4),
                    { marginTop: 10, borderColor: pageFocus ? Y.blue : Y.ln, shadowColor: pageFocus ? Y.blue : Y.ln, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 48, overflow: "hidden" },
                  ]}
                >
                  {/* ruled, like the page it is */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <View key={i} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 12 + 27 + i * 28, height: 1, backgroundColor: Y.groundDeep }} />
                  ))}
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    onFocus={() => setPageFocus(true)}
                    onBlur={() => setPageFocus(false)}
                    multiline
                    autoFocus
                    placeholder={t("ob.write.ph")}
                    placeholderTextColor={Y.faint}
                    keyboardAppearance={dark ? "dark" : "light"}
                    style={{ fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 17, lineHeight: 28, color: Y.ink, minHeight: 84, paddingTop: 0, marginTop: 0 }}
                  />
                  <View style={{ position: "absolute", left: 14, bottom: 15, flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: hearDot, marginRight: 6 }} />
                    <Text style={[mono(9.5, "b"), { color: dl ? Y.ink : Y.faint, letterSpacing: 1.4 }]}>{hear}</Text>
                  </View>
                  <Pressable
                    onPress={feed}
                    disabled={!canFeed}
                    style={[tag, canFeed ? bevel(2, 2) : null, { position: "absolute", right: 12, bottom: 10, backgroundColor: canFeed ? Y.blue : Y.panel, borderColor: canFeed ? Y.ln : Y.faint }]}
                  >
                    <Text style={[mono(9.5, "b"), { color: canFeed ? Y.onFill : Y.faint }]}>{t("ob.feed.btn")}</Text>
                  </Pressable>
                </Animated.View>

                {/* how it feels — the product's own mood faces */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                  <Text style={[mono(9.5, "b"), { color: Y.dim, letterSpacing: 1.8, marginRight: 8 }]}>{t("ob.feel")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 4, paddingRight: 24 }}>
                    {MOOD_IDS.slice(0, 9).map((id) => {
                      const on = mood === id;
                      return (
                        <Pressable key={id} onPress={() => setMood(on ? null : id)} style={{ marginRight: 8 }}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              borderWidth: 2,
                              borderColor: on ? Y.blue : Y.ln,
                              backgroundColor: MOODS[id].bg,
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              transform: [{ scale: on ? 1.14 : 1 }],
                            }}
                          >
                            <MoodIcon id={id} size={27} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}
          </ScrollView>
          <Foot label={canHatch ? t("ob.write.hatch") : t("ob.write.feedFirst")} on={canHatch} tone="brass" onPress={() => setStep("hatch")} />
        </KeyboardAvoidingView>
      </Console>
    );
  }

  /* ── 10 · FIRST FLIGHT — the ending that teaches everything ─────────
     The fed words fold into a letter; the newly named bird picks it up and
     leaves with it. Three things land wordlessly: it came from my words,
     it is mine, it carries my letters. The button is a release, not a
     next — she goes because you let her. */
  if (step === "flight") {
    const opener = [...fed].sort((a, b) => weightedCount(b) - weightedCount(a))[0] || "";
    /* the page says what will actually happen: a thought under the floor
       hatches her but does not leave the phone (owner, 2026-09-19), and
       "folded into a letter" was a promise the pool never received */
    const travels = weightedCount(opener) >= OPENING_MIN;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Y.ground }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 }}>
          {!flying ? (
            <>
              <Animated.Text entering={FadeIn.duration(400)} style={{ fontFamily: F2.serif, fontSize: 31, color: Y.ink, textAlign: "center" }}>
                {/* the emphasis lands on the possessive in English and on the
                    courier's name elsewhere — grammar decides, per language */}
                {t("ob.flight.plain", { name: her })} <Text style={{ fontFamily: F2.serifItalic, fontStyle: "italic" }}>{t("ob.flight.em", { name: her })}</Text>
              </Animated.Text>
              <Text style={[mono(10, "b"), { color: Y.dim, marginTop: 10, letterSpacing: 0.6, textAlign: "center" }]}>{t(travels ? "ob.flight.sub" : "ob.flight.subKept")}</Text>

              <Animated.View entering={FadeInDown.delay(220).duration(480)} style={{ alignItems: "center", marginTop: 22 }}>
                <Animated.View style={breathe}>
                  <WrenBird size={110} mood="delight" stage="hatch" form={hatchlingForm(hatched.dims)} mark={EGG_SHELLS[eggVar].mark} skin={look} accessory={dress} />
                </Animated.View>
                {/* the letter is the words they just fed — real, not an icon */}
                <View style={[card, bevel(4, 4), { maxWidth: 300, marginTop: -8, paddingHorizontal: 16, paddingVertical: 13, transform: [{ rotate: "-2deg" }] }]}>
                  <Text numberOfLines={3} style={{ fontFamily: F2.serifItalic, fontStyle: "italic", fontSize: 15, lineHeight: 22, color: Y.ink }}>
                    {opener}
                  </Text>
                  <Text style={[mono(8.5, "b"), { color: Y.faint, marginTop: 8 }]}>{t("ob.carriedBy", { name: her.toUpperCase() })}</Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(500).duration(480)} style={{ width: "100%", maxWidth: 340, marginTop: 30 }}>
                <Pressable onPress={letHerGo} style={[keyBtn, bevel(4, 4), { backgroundColor: Y.blue }]}>
                  <Text style={[mono(12.5, "b"), { color: Y.onFill }]}>{t("ob.letGo", { name: HER })}</Text>
                </Pressable>
              </Animated.View>
            </>
          ) : (
            <FirstFlight her={her} opener={opener} stops={stops} form={hatchlingForm(hatched.dims)} mark={EGG_SHELLS[eggVar].mark} skin={look} accessory={dress} onDone={() => void onFlightDone()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  /* ── 9 · THE HATCH — one screen ──────────────────────────────────────
     The read and the birth happen together (components/HatchStage): up top
     the list ticks through what it read while the egg below knocks, cracks
     and goes. THE DOCTRINE HOLDS: no verdict at birth — no archetype, no
     nine bars. "Something hatched", one thing it caught in your words, her.
     No meter and no back: the form ended where the bird began. */
  const readItems = [...fed.map((_, i) => t("ob.read.thought", { n: String(i + 1).padStart(2, "0") })), t("ob.read.rhythm"), t("ob.read.voice"), t("ob.read.waking")];
  const dim0 = hatched.dims[0];
  const dimPhrase = SEALED_KEYS.has(dim0.key) ? t(`ob.sealed.${dim0.key}`) : dim0.label.toLowerCase();
  const born = hatchPhase === "born";
  return (
    <Console>
      <HatchStage
        shell={eggVar}
        fed={fed}
        mood={hatchMood}
        form={hatchlingForm(hatched.dims)}
        dims={hatched.dims}
        skin={look}
        celebrate={celebrate}
        onBorn={() => setHatchPhase("born")}
        onWord={setSaidFirst}
        header={
          <View style={{ paddingHorizontal: 26, paddingTop: 22, minHeight: 128 }}>
            {!born ? (
              <>
                <Text style={[mono(10, "b"), { color: Y.dim, letterSpacing: 2 }]}>{t("ob.hatch.eyebrow")}</Text>
                <Text style={{ fontFamily: F2.serif, fontSize: 30, lineHeight: 35, color: Y.ink, marginTop: 8 }}>{t("ob.hatch.title")}</Text>
                <View style={{ marginTop: 12 }}>
                  {readItems.map((label, i) => {
                    const done = readProg * readItems.length > i + 0.5;
                    return (
                      <View key={label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
                        <Text style={[mono(10, "b"), { width: 16, color: done ? Y.ink : Y.faint }]}>{done ? "✓" : "·"}</Text>
                        <Text style={[mono(10, "b"), { letterSpacing: 1.2, color: done ? Y.ink : Y.faint }]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <Animated.View entering={FadeInDown.duration(480)}>
                {/* THE HEADLINE IS THE EVENT. Then one plain line that says
                    where the bubble came from and what it caught — the
                    dimension as a phrase in a sentence, never a tag. */}
                <Text style={{ fontFamily: F2.serif, fontSize: 34, lineHeight: 39, color: Y.ink }}>
                  {t("ob.hatched.plain")} <Text style={{ fontFamily: F2.serifItalic, fontStyle: "italic" }}>{t("ob.hatched.em")}</Text>
                </Text>
                <Text style={[mono(11, "r"), { color: Y.dim, marginTop: 10, lineHeight: 17, letterSpacing: 0.2 }]}>
                  {saidFirst ? t("ob.born.word", { dim: dimPhrase }) : t("ob.born.noWord", { dim: dimPhrase })}
                </Text>
              </Animated.View>
            )}
          </View>
        }
      />
      <Foot
        label={born ? t("ob.born.name") : t("ob.hatching")}
        on={born}
        tone="brass"
        onPress={() => {
          setCelebrate((c) => c + 1);
          setTimeout(() => setStep("naming"), 420);
        }}
      />
    </Console>
  );
}

/* ── the console shell ───────────────────────────────────────────────── */

/* Everything but the reveal lives inside this: the pale wash ground, a
   segmented progress readout, one way back. The bar is the console's own
   display, and it's why nine screens don't read as nine screens — you can
   see the whole run from the second one. */
function Console({ children, step, bars = ORDER.indexOf("hatch"), onBack }: { children: React.ReactNode; step?: number; bars?: number; onBack?: () => void }) {
  const { Y } = useEggOS();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Y.ground }}>
      {step != null && (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={14} style={{ marginRight: 10 }}>
              <Svg width={15} height={15} viewBox="0 0 24 24">
                <Path d="M15 4 L7 12 L15 20" stroke={Y.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, flexDirection: "row" }}>
            {Array.from({ length: bars }, (_, i) => (
              <Seg key={i} on={i <= step} i={i} last={i === bars - 1} />
            ))}
          </View>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}

/* one segment of the meter — it springs in rather than snapping, so moving
   forward has a small physical reward of its own */
function Seg({ on, i, last }: { on: boolean; i: number; last: boolean }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.value = withDelay(i * 40, withSpring(on ? 1 : 0, { damping: 13, stiffness: 180 }));
  }, [on, i, v]);
  const s = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  const { Y } = useEggOS();
  return (
    <View style={{ flex: 1, height: 11, marginRight: last ? 0 : 3, borderWidth: 1.8, borderColor: Y.ln, overflow: "hidden" }}>
      <Animated.View style={[s, { flex: 1, backgroundColor: Y.blue, transformOrigin: "left center" }]} />
    </View>
  );
}

/* THE EGG DOCK. Steps 2–5 are short forms with a lot of air under them, and
   dead air on a toy reads as a broken toy. Rather than filling it with
   decoration, it gets filled with the thing the flow is actually about:
   your egg, breathing, saying a little less nothing each screen. */
function EggDock({ status, style, kick = 0, face }: { status?: string; style: any; kick?: number; face?: string | null }) {
  const { Y, bevel, card, mono } = useEggOS();
  const jump = useSharedValue(0);
  const first = useRef(kick);
  useEffect(() => {
    if (kick === first.current) return;
    jump.value = withSequence(withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 7, stiffness: 240 }));
  }, [kick, jump]);
  const kicked = useAnimatedStyle(() => ({ transform: [{ translateY: -jump.value * 6 }, { scaleX: 1 + jump.value * 0.1 }, { scaleY: 1 - jump.value * 0.08 }] }));
  if (!status) return null;
  return (
    <Animated.View entering={FadeInDown.delay(260).duration(460)} style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
      <View style={[card, bevel(4, 4), { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 }]}>
        <View
          style={{
            width: 54,
            height: 54,
            borderWidth: 2,
            borderColor: Y.ln,
            borderRadius: 12,
            backgroundColor: Y.ground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View style={kicked}>
            <Animated.View style={style}>
              <UnknownEgg />
            </Animated.View>
          </Animated.View>
          {/* the face you picked, pinned to the corner: you and your egg */}
          {!!face && (
            <Animated.View
              entering={ZoomIn.duration(360).easing(Easing.out(Easing.back(1.8)))}
              style={{ position: "absolute", right: -9, top: -9, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Y.ln, backgroundColor: Y.panel, overflow: "hidden" }}
            >
              <AvatarImage id={face} seed={face} size={22} />
            </Animated.View>
          )}
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[mono(9, "b"), { color: Y.faint }]}>{t("ob.incubator")}</Text>
          <Text style={[mono(10.5, "b"), { marginTop: 3 }]}>{status}</Text>
        </View>
        <Dots />
      </View>
    </Animated.View>
  );
}

/* THE EGG BEFORE IT'S CHOSEN. The dock runs from the pen name to the face
   — every one of those screens comes before the shell is picked, so what's
   in the incubator can't be a shell yet. A dashed outline and a question
   mark, breathing: something's in here, and it isn't decided.
   It is egg art, so its cream, its dashed outline and its pale "?" keep
   their colours in every theme (the outline is the static Y_ART.ink). */
function UnknownEgg() {
  const { mono } = useEggOS(); // the "?"'s face only; its colour is its own
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1, true);
  }, [pulse]);
  const fade = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.4 }));
  return (
    <Animated.View style={[fade, { width: 34, height: 40, alignItems: "center", justifyContent: "center" }]}>
      <Svg width={34} height={40} viewBox="-100 -110 200 220" style={{ position: "absolute" }}>
        <Path d="M0 -100 C58 -100 82 -30 82 20 C82 78 46 108 0 108 C-46 108 -82 78 -82 20 C-82 -30 -58 -100 0 -100Z" fill="#FFF6E8" stroke={Y_ART.ink} strokeWidth={8} strokeDasharray="18 14" strokeLinecap="round" />
      </Svg>
      <Text style={[mono(15, "b"), { color: "#B9B3E0", marginTop: 3 }]}>?</Text>
    </Animated.View>
  );
}

/* three dots that fill in turn — the console thinking. Written out rather
   than mapped: useAnimatedStyle is a hook, so a loop or a helper that calls
   it three times breaks the rules of hooks and takes the screen with it. */
function Dots() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(3.99, { duration: 1600, easing: Easing.linear }), -1, false);
  }, [t]);
  const a = useAnimatedStyle(() => ({ opacity: t.value >= 1 ? 1 : 0.22 }));
  const b = useAnimatedStyle(() => ({ opacity: t.value >= 2 ? 1 : 0.22 }));
  const c = useAnimatedStyle(() => ({ opacity: t.value >= 3 ? 1 : 0.22 }));
  const { Y } = useEggOS();
  const dot = { width: 6, height: 6, borderRadius: 3, backgroundColor: Y.blue, marginLeft: 4 } as const;
  return (
    <View style={{ flexDirection: "row" }}>
      <Animated.View style={[a, dot]} />
      <Animated.View style={[b, dot]} />
      <Animated.View style={[c, dot]} />
    </View>
  );
}

/* the headline: plain words, then the one in italic serif that carries it */
function Head({ plain, em, sub }: { plain: string; em: string; sub: string }) {
  const { Y, mono } = useEggOS();
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={{ paddingHorizontal: 18, paddingTop: 12 }}>
      <Text style={{ fontFamily: F2.serif, fontSize: 26, color: Y.ink, textAlign: "center", lineHeight: 33 }}>
        {plain} <Text style={{ fontFamily: F2.serifItalic, fontStyle: "italic" }}>{em}</Text>
      </Text>
      {!!sub && <Text style={[mono(11, "r"), { color: Y.dim, textAlign: "center", marginTop: 9, lineHeight: 18, letterSpacing: 0.2 }]}>{sub}</Text>}
    </Animated.View>
  );
}

/* the key at the bottom of every step */
function Foot({
  label,
  on,
  onPress,
  tone,
  skip,
  onSkip,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  tone?: "brass";
  skip?: string;
  onSkip?: () => void;
}) {
  const { Y, bevel, key: keyBtn, mono } = useEggOS();
  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 10, paddingTop: 8 }}>
      <Pressable
        onPress={() => on && onPress()}
        disabled={!on}
        style={[keyBtn, bevel(4, 4), { backgroundColor: tone === "brass" ? Y.brass : Y.blue, opacity: on ? 1 : 0.4 }]}
      >
        {/* the gold stays gold in every theme, so the label on it is the fixed dark ink */}
        <Text style={[mono(12.5, "b"), { color: tone === "brass" ? Y.fixedInk : Y.onFill }]}>{label}</Text>
      </Pressable>
      {skip ? (
        <Pressable onPress={onSkip} style={{ paddingTop: 12, alignItems: "center" }}>
          <Text style={[mono(9.5, "b"), { color: Y.dim }]}>{skip}</Text>
        </Pressable>
      ) : (
        <View style={{ height: 10 }} />
      )}
    </View>
  );
}

/* THE HATCHLING — the thing that was just born, not a portrait of the adult.
   Three faults in the old card, and they were all the same fault: she wasn't
   alive in there.

   · She was drawn at stage "wren", the grown bird. WrenBird has had a
     hatchling all along (stage="hatch"); onboarding just never asked for it.
   · The sticker skin's white keyline is die-cut for lifting her off a busy
     page. On a dark card where she's the only object it reads as a sticker
     stuck on — hence `bare`.
   · She didn't move and she didn't answer. A newly hatched pet you cannot
     poke is a picture of a pet.

   So: she sits in the halves of the shell YOU chose two screens ago, she
   breathes on her own, and she answers a finger — a squash-and-stretch hop,
   a change of face, and a small mark over her head. Four faces cycle, so the
   third poke isn't the second poke again. */
/* THE SIGN-IN ROW SPEAKS iOS, NOT EGG OS. Everywhere else this screen
   wears the console skin — bevels, mono caps, the blue. The three keys that
   ask for a person's account are the one place familiarity IS the design:
   they match the native Apple button's geometry exactly (52pt, radius 10),
   carry the real four-colour G, and speak in the system face with sentence
   case. A sign-in button that looks like every other app's is the point.
   So the row keeps its colours in every theme: the black key, the white
   keys, their type and the glyphs on them are the buttons Apple's and
   Google's rules describe, not the console's chrome (SIGNIN_INK below). */
function AuthKey({
  icon,
  label,
  dark = false,
  first = false,
  onPress,
  disabled,
  dim,
}: {
  icon: React.ReactNode;
  label: string;
  dark?: boolean;
  first?: boolean;
  onPress: () => void;
  disabled?: boolean;
  dim?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 10,
        marginTop: first ? 0 : 12,
        backgroundColor: dark ? (pressed ? "#222222" : "#000000") : pressed ? "#F2F2F2" : "#FFFFFF",
        borderWidth: dark ? 0 : 1,
        borderColor: "rgba(0,0,0,0.18)",
        alignItems: "center",
        justifyContent: "center",
        opacity: dim ? 0.5 : 1,
      })}
    >
      {/* the icon is PINNED at 18pt, the label is centred: one column of
          marks down the three keys, the way every real sign-in stack does it */}
      <View style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 24, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <Text style={{ fontSize: 17, fontWeight: "600", color: dark ? "#FFFFFF" : "#1F1F1F" }}>{label}</Text>
    </Pressable>
  );
}

/* the Apple logo, white on the black key (Apple's mark, at their proportions) */
function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M16.37 12.68c-.02-2.42 1.98-3.58 2.07-3.64-1.13-1.65-2.88-1.88-3.5-1.9-1.49-.15-2.91.88-3.67.88-.76 0-1.92-.86-3.16-.84-1.62.02-3.12.95-3.96 2.4-1.69 2.93-.43 7.27 1.21 9.65.8 1.16 1.76 2.47 3.01 2.42 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.15.76 1.3-.02 2.13-1.18 2.92-2.35.92-1.35 1.3-2.65 1.32-2.72-.03-.01-2.53-.97-2.55-3.88zM13.97 5.57c.67-.81 1.12-1.94 1-3.07-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.87-1.02 2.97 1.07.08 2.17-.55 2.84-1.35z"
      />
    </Svg>
  );
}
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.5-1.12 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11C3.25 21.3 7.31 24 12 24z" />
      <Path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.28A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.11z" />
      <Path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z" />
    </Svg>
  );
}
/* the dice sits on the brass key, which is gold in every theme, so it is
   drawn in the fixed dark ink */
function DiceGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={4} fill="none" stroke={FIXED_INK} strokeWidth={2.2} />
      <Circle cx={8.5} cy={8.5} r={1.9} fill={FIXED_INK} />
      <Circle cx={15.5} cy={8.5} r={1.9} fill={FIXED_INK} />
      <Circle cx={8.5} cy={15.5} r={1.9} fill={FIXED_INK} />
      <Circle cx={15.5} cy={15.5} r={1.9} fill={FIXED_INK} />
      <Circle cx={12} cy={12} r={1.9} fill={FIXED_INK} />
    </Svg>
  );
}
/* the mail glyph is drawn on the sign-in row's white keys (and in white on
   the black one), so its dark is the row's own, the same in every theme */
const SIGNIN_INK = "#111113";
function MailGlyph({ size = 20, color = SIGNIN_INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.2} y={4.8} width={19.6} height={14.4} rx={2.6} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M3.4 6.6 12 13.2 20.6 6.6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const POKES: WrenMood[] = ["delight", "curious", "wink", "happy"];

function Hatchling({ mood, shell, form, dims, skin, accessory, tag: nameTag, nudge }: { mood: WrenMood; shell: number; form?: HatchlingForm; dims?: DimScore[]; skin?: WrenSkin; accessory?: WrenAccessory; tag?: string | null; nudge?: { n: number; re: "chirp" | "tilt" | "happy" } }) {
  /* the console's colours for what's drawn around her — the mark over her
     head and the name tag on its cord. She and her shell keep their own. */
  const { Y, mono } = useEggOS();
  const [pokes, setPokes] = useState(0);
  const [said, setSaid] = useState<"chirp" | "tilt" | "happy" | null>(null);
  const idle = useChickIdle(dims, !said); // her own habits, between the things you make her do
  const squish = useSharedValue(0); // 0 rest, drives the whole hop
  const spark = useSharedValue(0);
  const tilt = useSharedValue(0);
  const swing = useSharedValue(0);

  // idle breath — slow, and never fully still
  const air = useSharedValue(0);
  useEffect(() => {
    air.value = withRepeat(
      withSequence(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) })),
      -1,
      true,
    );
  }, [air]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: -air.value * 2.5 - squish.value * 14 },
      { scaleX: 1 + squish.value * -0.12 + air.value * 0.01 },
      { scaleY: 1 + squish.value * 0.16 + air.value * 0.015 },
      { rotate: `${tilt.value}deg` },
    ],
  }));
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value, transform: [{ translateY: -spark.value * 16 }, { scale: 0.6 + spark.value * 0.5 }] }));
  const tagStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));

  /* NAMED FROM OUTSIDE: a letter typed makes her chirp, a pronoun makes her
     tilt her head, the dice makes her happy. The tag swings on each. */
  const firstNudge = useRef(nudge?.n ?? 0);
  useEffect(() => {
    if (!nudge || nudge.n === firstNudge.current) return;
    setSaid(nudge.re);
    swing.value = withSequence(withTiming(-7, { duration: 90 }), withSpring(0, { damping: 6, stiffness: 200 }));
    if (nudge.re === "chirp") {
      squish.value = withSequence(withTiming(0.5, { duration: 80 }), withSpring(0, { damping: 9, stiffness: 240 }));
      spark.value = withSequence(withTiming(1, { duration: 120 }), withDelay(200, withTiming(0, { duration: 280 })));
    } else if (nudge.re === "tilt") {
      tilt.value = withSequence(withSpring(-12, { damping: 10, stiffness: 180 }), withDelay(700, withSpring(0, { damping: 10, stiffness: 180 })));
    } else {
      squish.value = withSequence(withTiming(-1, { duration: 90 }), withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2.6)) }), withSpring(0, { damping: 9, stiffness: 220 }));
    }
    const id = setTimeout(() => setSaid(null), nudge.re === "tilt" ? 1000 : 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge?.n]);

  const poke = () => {
    setPokes((n) => n + 1);
    // down, past the top, settle — the shape of something small jumping
    squish.value = withSequence(
      withTiming(-1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2.6)) }),
      withSpring(0, { damping: 9, stiffness: 220 }),
    );
    spark.value = withSequence(withTiming(1, { duration: 160 }), withDelay(280, withTiming(0, { duration: 320 })));
  };

  const face: WrenMood = said === "chirp" ? "listen" : said === "tilt" ? "curious" : said === "happy" ? "happy" : pokes > 0 ? POKES[(pokes - 1) % POKES.length] : mood;
  const sh = EGG_SHELLS[shell] ?? EGG_SHELLS[0];

  return (
    <Pressable onPress={poke} hitSlop={16} style={{ width: 150, height: 132, alignItems: "center", justifyContent: "flex-end" }}>
      {/* the mark over her head when she answers */}
      <Animated.Text style={[sparkStyle, { position: "absolute", top: 4, left: 30, fontSize: 17, color: Y.blue }]}>♪</Animated.Text>

      {/* SHE SITS IN THE SHELL, and the shell is drawn OVER her lower half so
          she's inside it rather than standing in front of it. The first
          attempt was a zigzag strip behind her and it read as a pink mountain
          range. The colour is the one you picked two screens ago — the only
          part of her you got to choose, kept and shown. */}
      <Animated.View style={[body, { marginBottom: 30 }]}>
        <HatchlingRig size={104} mood={face} form={form} mark={sh.mark} skin={skin} accessory={accessory} idle={idle} />
      </Animated.View>

      <Svg width={150} height={62} viewBox="0 0 150 62" style={{ position: "absolute", bottom: 0 }}>
        {/* the bottom half she's sitting in — jagged rim, rounded belly */}
        <Path
          d="M33 16 L43 28 L53 10 L64 26 L75 8 L86 26 L96 12 L106 26 L117 16 L118 28 C118 48 101 60 75 60 C49 60 32 48 32 28 Z"
          fill={sh.base}
        />
        <Path d="M33 16 L43 28 L53 10 L64 26 L75 8 L86 26 L96 12 L106 26 L117 16" fill="none" stroke={sh.speck} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={56} cy={42} r={2} fill={sh.speck} />
        <Circle cx={92} cy={38} r={1.8} fill={sh.speck} />
        <Circle cx={74} cy={50} r={1.6} fill={sh.speck} />
      </Svg>

      {/* the name, on a tag round her neck, as it's typed — in front of the
          shell, since that's where her chest is */}
      {!!nameTag && (
        <Animated.View entering={ZoomIn.duration(260)} style={{ position: "absolute", left: 0, right: 0, bottom: 20, alignItems: "center" }}>
        <Animated.View style={[tagStyle, { alignItems: "center", transformOrigin: "top center" }]}>
          <Svg width={44} height={9} viewBox="0 0 44 9" style={{ marginBottom: -3 }}>
            <Path d="M2 1 q20 11 40 0" fill="none" stroke={Y.ln} strokeWidth={1.6} />
          </Svg>
          <View style={{ backgroundColor: Y.panel, borderWidth: 2, borderColor: Y.ln, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={[mono(9, "b"), { letterSpacing: 0.8 }]}>{nameTag}</Text>
          </View>
        </Animated.View>
        </Animated.View>
      )}
    </Pressable>
  );
}

/* one strand of the DNA: mark, name, number. No bar and no nine-row table —
   the point of this screen is that something was born, not that something was
   measured. */
/* one dimension as a bar: label, fill, number. Brass = locked (trusted),
   the app's blue = still growing — colour carries the confidence, so no tag. */
function BarRow({ d }: { d: DimScore }) {
  const { Y, mono, t: tk } = useEggOS();
  const col = d.locked ? Y.brass : Y.blue;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
      <Text style={{ width: 118, fontFamily: F2.serif, fontSize: 15.5, color: Y.ink }}>{d.label}</Text>
      {/* the track: the pale accent fill */}
      <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: tk.lav, marginHorizontal: 10, overflow: "hidden" }}>
        <View style={{ width: `${d.score}%`, height: 7, borderRadius: 4, backgroundColor: col, opacity: d.locked ? 1 : 0.85 }} />
      </View>
      <Text style={[mono(13, "b"), { color: col, width: 30, textAlign: "right", fontVariant: ["tabular-nums"] }]}>{d.score}</Text>
    </View>
  );
}

/* the letter she leaves with — big enough to actually read as a letter */
function CarriedLetter() {
  const { Y } = useEggOS();
  return (
    <Svg width={92} height={68} viewBox="0 0 92 68">
      <Rect x={2} y={2} width={88} height={64} rx={4} fill={Y.panel} stroke={Y.ln} strokeWidth={2.6} />
      <Path d="M2 6 L46 40 L90 6" fill="none" stroke={Y.ln} strokeWidth={2.4} strokeLinejoin="round" />
      <Rect x={62} y={44} width={20} height={16} fill={Y.blue} stroke={Y.ln} strokeWidth={2} />
      <Rect x={10} y={48} width={34} height={3} fill={Y.ink} opacity={0.5} />
      <Rect x={10} y={56} width={22} height={3} fill={Y.ink} opacity={0.3} />
    </Svg>
  );
}

/* one of the three cards on the door: number, art, word. The lit one lifts
   off its shadow; the others sit flat and grey — on the theme's soft
   ground, a shade set apart from the lit card's face. */
function DoorCard({ i, on }: { i: number; on: boolean }) {
  const { Y, bevel, card, mono, t: tk } = useEggOS();
  const lift = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lift.value = withSpring(on ? 1 : 0, { damping: 14, stiffness: 160 });
  }, [on, lift]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -lift.value * 2 }, { translateY: -lift.value * 2 }] }));
  return (
    <Animated.View
      style={[
        st,
        card,
        on ? bevel(4, 4) : null,
        { flex: 1, marginHorizontal: 5, height: 118, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? Y.panel : tk.soft },
      ]}
    >
      <Text style={[mono(9, "b"), { position: "absolute", top: 8, left: 10, color: on ? Y.blue : Y.faint, letterSpacing: 1.6 }]}>{`0${i + 1}`}</Text>
      <DoorArt i={i} on={on} />
      <Text style={[mono(9.5, "b"), { marginTop: 6, letterSpacing: 1.6, color: on ? Y.ink : Y.faint }]}>{t(`ob.door.${i + 1}`)}</Text>
    </Animated.View>
  );
}

/* the art on each card, drawn once and moving only while its card is lit:
   a page being written, a courier on her arc, a sealed reply. They are
   line icons in the console's colours, so they take the theme's (ink or
   faint strokes, the card face, the accent); the courier's pink and the
   seal's brass are hers and stay. */
function DoorArt({ i, on }: { i: number; on: boolean }) {
  const { Y } = useEggOS();
  const ph = useSharedValue(0);
  useEffect(() => {
    ph.value = 0;
    if (on) ph.value = withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) });
  }, [on, ph]);
  const [p, setP] = useState(0);
  useAnimatedReaction(
    () => ph.value,
    (v) => {
      runOnJS(setP)(Math.round(v * 24) / 24);
    },
  );
  const ink = on ? Y.ink : Y.faint;
  if (i === 0)
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Rect x={8} y={6} width={28} height={34} rx={3} fill={Y.panel} stroke={ink} strokeWidth={2} />
        {[16, 12, 17, 9].map((w, k) => (
          <Rect key={k} x={14} y={14 + k * 6} width={k < Math.floor(p * 5) ? w : 0} height={2.4} rx={1.2} fill={Y.blue} />
        ))}
        <Path d={`M${14 + Math.min(1, p * 1.25) * 16} ${13 + Math.min(3, Math.floor(p * 5)) * 6} l6 -7`} stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    );
  if (i === 1)
    return (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M4 30 Q22 8 40 30" fill="none" stroke={Y.faint} strokeWidth={2} strokeDasharray="3 4" />
        <G transform={`translate(${4 + p * 36} ${30 - Math.sin(p * Math.PI) * 22})`}>
          <Ellipse cx={0} cy={0} rx={7} ry={5.5} fill="#E9A6B4" stroke={ink} strokeWidth={2} />
          <Path d={`M-5 -2 q5 ${-6 - Math.sin(p * 40) * 4} 10 0`} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
          <Rect x={-4} y={3} width={8} height={5.5} rx={1} fill={Y.panel} stroke={ink} strokeWidth={1.6} />
        </G>
      </Svg>
    );
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={6} y={12} width={32} height={22} rx={3} fill={Y.panel} stroke={ink} strokeWidth={2} />
      <Path d="M6 14 L22 26 L38 14" fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={22} cy={24} r={4.5 * Math.min(1, p * 2)} fill={Y.brass} stroke={ink} strokeWidth={1.6} />
      <Circle cx={35} cy={11} r={5 + Math.sin(p * Math.PI) * 1.5} fill={Y.blue} stroke={ink} strokeWidth={2} />
    </Svg>
  );
}

/* the nine moods, mapped onto the faces she actually has */
function moodToWren(m: MoodId): WrenMood {
  const tone = MOODS[m].tone;
  if (tone === "low" || tone === "edge") return "worry";
  if (tone === "up" || tone === "spark") return "delight";
  if (tone === "flat") return "think";
  return "listen";
}
