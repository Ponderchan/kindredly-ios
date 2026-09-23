import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { scoped as AsyncStorage } from "./scoped-store";
import { supabase } from "./supabase";

/* YOUR COURIER — her name, and the shell she came out of.
   (One word for her job, everywhere: courier, never messenger — it is
   the word First Class travels on.)
   ────────────────────────────────────────────────────────────────────────
   The bird was called Wren by us. Now she's called whatever you called her
   in onboarding, and every line she speaks anywhere in the app uses that
   name. "Wren" survives only as the fallback for anyone who came in before
   naming existed, and for anyone who skips it.

   HER NAME IS THE ACCOUNT'S (owner, 2026-09-23: named her here, and the web
   shelf called her something else). The device keeps a copy so she has a
   name before the network answers, but the truth is user_metadata.wren —
   the same field the web reads — so she is called one thing on the phone,
   in the browser, and on a phone you have not set up yet.

   The SHELL is stored too. It used to be picked on its own screen and then
   silently dropped on save, which made that screen a piece of theatre — you
   chose a colour and the app forgot before you finished onboarding. If a
   step asks a person to choose, the choice has to survive. */

const NAME_KEY = "kindredly_wren_name";
const EGG_KEY = "kindredly_wren_egg";

export const DEFAULT_WREN = "Wren";

export async function saveWrenName(name: string): Promise<void> {
  const n = name.trim().slice(0, 16);
  if (!n) return;
  try {
    await AsyncStorage.setItem(NAME_KEY, n);
  } catch {
    /* a name is not worth failing onboarding over */
  }
  try {
    await supabase?.auth.updateUser({ data: { wren: n } });   // …and up, so the web calls her the same thing
  } catch {
    /* offline: the device has it, and the next save carries it up */
  }
}

/** her name on the account, or null — user_metadata.wren, the web's field */
async function profileWrenName(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();   // the metadata rides on the local session
    const m = (data.session?.user?.user_metadata || {}) as Record<string, unknown>;
    const n = typeof m.wren === "string" ? m.wren.trim() : "";
    return n || null;
  } catch {
    return null;
  }
}

export async function getWrenName(): Promise<string> {
  /* the device first — she has a name before the network answers — and the
     account when this device was never told one (a reinstall, a new phone,
     or a name given in the browser) */
  let local = "";
  try {
    local = (await AsyncStorage.getItem(NAME_KEY))?.trim() || "";
  } catch {
    /* no store: the account may still know */
  }
  const theirs = await profileWrenName();
  if (!local) {
    if (theirs) { try { await AsyncStorage.setItem(NAME_KEY, theirs); } catch { /* read-only is fine */ } return theirs; }
    return DEFAULT_WREN;
  }
  /* named here before the name synced — carry it up once */
  if (!theirs) { try { await supabase?.auth.updateUser({ data: { wren: local } }); } catch { /* next time */ } }
  return local;
}

/* Copy all over the app is AUTHORED with the literal name "Wren" — it's the
   default, it reads naturally in source, and it keeps the strings greppable.
   At render time, any line spoken by or about her passes through here and
   the owner's chosen name is swapped in. \b keeps it to the whole word, and
   "Wren's" comes out as "Pip's" for free. This only ever runs on our own
   copy and on her AI summaries — never on a user's writing. */
export function speakAs(text: string, name: string): string {
  if (!text || !name || name === DEFAULT_WREN) return text;
  return text.replace(/\bWren\b/g, name);
}

export async function saveWrenEgg(variant: number): Promise<void> {
  try {
    await AsyncStorage.setItem(EGG_KEY, String(variant));
  } catch {
    /* ignore */
  }
}

export async function getWrenEgg(): Promise<number> {
  try {
    const v = parseInt((await AsyncStorage.getItem(EGG_KEY)) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/** her name, for any screen that speaks about her. Re-reads on focus so a
    rename in Me lands everywhere without a relaunch. */
export function useWrenName(): string {
  const [name, setName] = useState(DEFAULT_WREN);
  const load = useCallback(() => {
    let alive = true;
    void getWrenName().then((n) => {
      if (alive) setName(n);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);
  return name;
}

/* Names offered by the dice on the naming screen. Short, sayable, and none
   of them cute-for-cute's-sake — she carries what you couldn't say out loud,
   so "Bubbles" would undercut her the first time she used it. */
/** the one name the naming screen refuses: it is the courier's own —
    the official account at the top of Kindreds is Wren (owner, 2026-09-20) */
export const isReservedName = (name: string): boolean => name.trim().toLowerCase() === DEFAULT_WREN.toLowerCase();

export const NAME_IDEAS = [
  "Pip",
  "Juno",
  "Moth",
  "Sable",
  "Otis",
  "Bea",
  "Kite",
  "Nim",
  "Fen",
  "Rook",
  "Wisp",
  "Alba",
  "Cricket",
  "Sol",
  "Ash",
];
