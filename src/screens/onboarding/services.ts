import { useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, type Href } from "expo-router";
import { useAuth, type AuthResult } from "../../lib/auth";
import { fetchPool, POOL_CACHE_KEY, publishLetter, upsertFingerprint, type PoolLetter } from "../../lib/db";
import { ARRIVAL_AT_KEY, ARRIVAL_FRESH, ARRIVAL_SENT, TODAY_RITUAL, WARDROBE_SLIP, setFlag, unsetFlag } from "../../lib/flags";
import { hatch, saveArchetype } from "../../lib/hatch-engine";
import { hatchlingForm, saveHatchlingForm } from "../../lib/hatchling-form";
import { saveWrenPronoun, saveYourPronoun } from "../../lib/pronouns";
import { rationPool } from "../../lib/ration";
import { signatureVector, voiceSignature } from "../../lib/signature";
import { supabase } from "../../lib/supabase";
import { track } from "../../lib/track";
import { saveWrenEgg, saveWrenName } from "../../lib/wren-name";
import { wrenStageDirty } from "../../lib/wren-stage";
import { bumpStageFloor } from "../../lib/wren-style";
import { readPerm, turnNotificationsOn } from "../../components/NotifyBanner";
import { DEMO_UID, demoMember, devConfig, devNote, setDevPayload } from "./dev";
import * as block from "./device-block";
import * as drafts from "./draft-store";
import type { FinishPayload, NotifState, ObCtx } from "./flow";
import type { ObServices } from "./types";

/* WHAT THE RUN ASKS OF THE WORLD — the real services and the DEMO stubs.
   ────────────────────────────────────────────────────────────────────────
   The screens and the runner never import lib/auth, lib/db or lib/notify:
   they go through ObServices (types.ts), and useObServices hands them the
   real thing or, in demo (screens/onboarding/dev: on by default in a dev
   build), stubs that move the demo's who-is-here and log what they would
   have done. So a walkthrough on the simulator posts nothing, makes and
   links no account, and never spends iOS's one-time notification prompt.

   THE REAL ONES, in short:
   · 1a signIn / emailSignIn: a returning person's plain sign-in. With an
     anonymous session on the phone the provider links first; if the identity
     already has an account, it moves there (switchAccount) — on 1a that is
     exactly what "Sign in the way you did last time" means.
   · 11 link / emailAttach: onto the SAME user id (lib/auth: Apple's and
     Google's linkIdentity, the email attach), answering { exists } so the
     screen can ask "That's already an account. Switch to it?".
   · finish (12): the old run's finish, minus everything the new one moved
     out (the pen name, the dress, the fare): the fingerprint, the letter to
     the pool at its floor, the bird (form and archetype read from the
     letter, the shell, the name, the pronoun), your pronoun, the profile
     with both identity switches, the stage poked. Best-effort throughout —
     a failure never blocks getting in — but logged, never swallowed.
   · arrive: the first-arrival flags Today reads once (TODAY_RITUAL,
     ARRIVAL_FRESH, the arrival time) plus the wardrobe slip, the draft
     cleared, this uid noted as finished here, then Today.
   · today: someone who already finished (an onboarded account, a guest
     back on this phone) — the draft cleared and Today, WITHOUT those flags,
     so the first arrival never replays on a later cold start. */

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useObServices({ demo, patchDemoCtx }: { demo: boolean; patchDemoCtx: (p: Partial<ObCtx>) => void }): ObServices {
  const auth = useAuth();
  const router = useRouter();
  const { appleAvailable, signInWithApple, signInWithGoogle, signInWithEmail, switchAccount, verifyEmailCode, signInAnonymously, signOut, saveProfile } = auth;

  return useMemo<ObServices>(() => {
    if (demo) return demoServices(patchDemoCtx, (to) => router.replace(to as Href), appleAvailable);

    const real: ObServices = {
      demo: false,
      appleAvailable,

      async signIn(p) {
        const r = p === "apple" ? await signInWithApple({ onExists: "ask" }) : await signInWithGoogle({ onExists: "ask" });
        return "exists" in r ? switchAccount(p) : r;
      },
      async emailSignIn(email) {
        const r = await signInWithEmail(email, undefined, { onExists: "ask" });
        return "exists" in r ? switchAccount("email", email) : r;
      },
      link: (p) => (p === "apple" ? signInWithApple({ onExists: "ask" }) : signInWithGoogle({ onExists: "ask" })),
      emailAttach: (email) => signInWithEmail(email, undefined, { onExists: "ask" }),
      switchAccount: (p, email) => switchAccount(p, email),
      emailVerify: (email, code, mode) => verifyEmailCode(email, code, mode),

      async prefetchPool(): Promise<PoolLetter[]> {
        /* the same three that will head Today's first desk, and Today paints
           from the same cache the moment it opens (the old run did this too) */
        try {
          const l = (await fetchPool(40)) || [];
          if (l.length) await AsyncStorage.setItem(POOL_CACHE_KEY, JSON.stringify(l.slice(0, 40))).catch((e) => console.warn("[onboarding] the pool cache wasn't written:", e));
          return rationPool(l).slice(0, 3);
        } catch (e) {
          console.warn("[onboarding] the pool wasn't fetched; the flight brings back what it can:", e);
          return [];
        }
      },
      async notifPerm(): Promise<NotifState> {
        try {
          return await readPerm();
        } catch (e) {
          console.warn("[onboarding] notification permission unreadable:", e);
          return "unknown";
        }
      },

      async createAnonSession() {
        const r = await signInAnonymously();
        if ("error" in r) console.warn("[onboarding] the anonymous session wasn't made (will retry):", r.error);
        return "ok" in r;
      },
      async dropGuestSession() {
        // only ever an anonymous session: a real account is never signed out by the gate
        try {
          const u = supabase ? (await supabase.auth.getUser()).data.user : null;
          if (u?.is_anonymous) await signOut();
        } catch (e) {
          console.warn("[onboarding] the guest session wasn't dropped:", e);
        }
      },
      rememberBlock: () => block.rememberBlock(false),

      async finish(p: FinishPayload) {
        await unsetFlag(ARRIVAL_SENT);
        const text = p.letter?.text ?? p.profile.firstLine;
        if (p.letter) {
          try {
            await upsertFingerprint(signatureVector(text), voiceSignature(text).words);
          } catch (e) {
            console.warn("[onboarding] the fingerprint wasn't written:", e);
          }
          await setFlag(ARRIVAL_SENT);
          const id = await publishLetter(p.letter.stamp, p.letter.text, p.letter.lang).catch((e) => {
            console.warn("[onboarding] the first letter didn't post:", e);
            return null;
          });
          if (id) track("ob2_done", { mode: p.mode });
          else console.warn("[onboarding] the first letter didn't post (publishLetter returned nothing)");
        }
        try {
          if (p.wren) {
            await bumpStageFloor("hatch");
            const read = hatch([text]);
            await saveHatchlingForm(hatchlingForm(read.dims));
            await saveWrenEgg(p.wren.shell);
            await saveWrenName(p.wren.name);
            await saveWrenPronoun(p.wren.pronoun);
            await saveArchetype(read.archetype.id);
          }
          await saveYourPronoun(p.profile.pronoun);
        } catch (e) {
          console.warn("[onboarding] the bird wasn't fully saved:", e);
        }
        // the pronoun goes up with the rest: the matcher reads it (0021), quietly; NO pen name
        const r = await saveProfile({ ...p.profile });
        if ("error" in r) console.warn("[onboarding] the profile didn't reach the account (kept on the phone):", r.error);
        wrenStageDirty();
      },
      async askNotifications() {
        await turnNotificationsOn("ask");
        return (await real.notifPerm()) === "granted";
      },
      openNotificationSettings: () => turnNotificationsOn("settings"),
      async arrive(uid) {
        await setFlag(TODAY_RITUAL);
        await setFlag(ARRIVAL_FRESH);
        await setFlag(WARDROBE_SLIP);
        await AsyncStorage.setItem(ARRIVAL_AT_KEY, String(Date.now())).catch((e) => console.warn("[onboarding] the arrival time wasn't written:", e));
        await drafts.clearDraft(false);
        await drafts.noteFinished(uid, false);
        router.replace("/(tabs)/letters");
      },
      async today() {
        await drafts.clearDraft(false);
        router.replace("/(tabs)/letters");
      },
      track: (step, i) => track("ob2_step", { step, i }),
      loadDraft: () => drafts.loadDraft(false),
      saveDraft: (d) => drafts.saveDraft(d, false),
    };
    return real;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, appleAvailable]);
}

/* ── the DEMO stubs ─────────────────────────────────────────────────────── */

/** Three sample letters for the first flight in a demo (the real pool is never read into Today's cache). */
const SAMPLE_POOL: PoolLetter[] = [
  { id: "demo-1", author: "00000000-0000-4000-8000-0000000000a1", stamp: "cant-sleep", body: "it's 2am and the fridge is the only thing awake with me.", lang: "en", created_at: new Date().toISOString() },
  { id: "demo-2", author: "00000000-0000-4000-8000-0000000000a2", stamp: "growing", body: "got the job. telling a stranger first.", lang: "en", created_at: new Date().toISOString() },
  { id: "demo-3", author: "00000000-0000-4000-8000-0000000000a3", stamp: "miss-someone", body: "i still set two cups out some mornings.", lang: "en", created_at: new Date().toISOString() },
];

function demoServices(patch: (p: Partial<ObCtx>) => void, go: (to: string) => void, appleAvailable: boolean): ObServices {
  const s: ObServices = {
    demo: true,
    appleAvailable,
    async signIn(p) {
      await wait(400);
      patch(demoMember());
      devNote(`1a: signed in with ${p} — stubbed (${devConfig().signInAs} account)`);
      return { ok: true };
    },
    async emailSignIn(email) {
      await wait(300);
      devNote(`1a: code "sent" to ${email.replace(/^(.).*(@.*)$/, "$1…$2")} — stubbed; any 6 digits but 999999 work`);
      return { sent: true, mode: "otp" };
    },
    async link(p): Promise<AuthResult> {
      await wait(400);
      if (devConfig().addressExists) {
        devNote(`11: ${p} is "already an account" — stubbed`);
        return { exists: true, provider: p };
      }
      patch({ account: "member" });
      devNote(`11: ${p} linked onto the same user id — stubbed`);
      return { ok: true };
    },
    async emailAttach(email): Promise<AuthResult> {
      await wait(300);
      if (devConfig().addressExists) {
        devNote(`11: the email is "already an account" — stubbed`);
        return { exists: true, provider: "email" };
      }
      devNote(`11: attach code "sent" to ${email.replace(/^(.).*(@.*)$/, "$1…$2")} — stubbed`);
      return { sent: true, mode: "attach" };
    },
    async switchAccount(p): Promise<AuthResult> {
      await wait(400);
      if (p === "email") {
        devNote("11: switch — sign-in code \"sent\" — stubbed");
        return { sent: true, mode: "otp" };
      }
      patch(demoMember());
      devNote(`11: switched to the ${p} account — stubbed (${devConfig().signInAs})`);
      return { ok: true };
    },
    async emailVerify(_email, code, mode): Promise<AuthResult> {
      await wait(300);
      if (code === "999999") return { error: "demo: that code is the wrong one" };
      patch(mode === "attach" ? { account: "member" } : demoMember());
      devNote(`email code accepted (${mode}) — stubbed`);
      return { ok: true };
    },
    async prefetchPool() {
      return SAMPLE_POOL;
    },
    async notifPerm() {
      return devConfig().notif;
    },
    async createAnonSession() {
      await wait(250);
      patch({ account: "guest", uid: DEMO_UID });
      devNote("3 passed: anonymous session — stubbed (no user made)");
      return true;
    },
    async dropGuestSession() {
      patch({ account: "none", uid: null });
      devNote("3 re-answered under 18: guest session dropped — stubbed");
    },
    async rememberBlock() {
      await block.rememberBlock(true);
      patch({ blocked: true });
      devNote("under 18: block remembered (demo key)");
    },
    async finish(p) {
      setDevPayload(p);
      devNote(`12: POST STUBBED — the letter (${p.letter?.text.length ?? 0} chars, stamp ${p.letter?.stamp ?? "—"}) did not leave the phone; profile and bird not saved`);
      await wait(600);
    },
    async askNotifications() {
      devNote("13: iOS's prompt NOT asked — stubbed");
      return true;
    },
    async openNotificationSettings() {
      devNote("13: would open Kindredly's notification settings — stubbed");
    },
    async arrive() {
      await drafts.clearDraft(true);
      devNote("arrive: flags not set; back to the dev entry instead of Today");
      go("/dev/onboarding2?done=1");
    },
    async today() {
      await drafts.clearDraft(true);
      devNote("already onboarded: straight to Today (no first-arrival flags) — back to the dev entry instead");
      go("/dev/onboarding2?done=1");
    },
    track() {
      /* demo: nothing tracked (the simulator's account would own the event) */
    },
    loadDraft: () => drafts.loadDraft(true),
    saveDraft: (d) => drafts.saveDraft(d, true),
  };
  return s;
}
