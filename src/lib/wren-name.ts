import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* YOUR COURIER — her name, and the shell she came out of.
   (One word for her job, everywhere: courier, never messenger — it is
   the word First Class travels on.)
   ────────────────────────────────────────────────────────────────────────
   The bird was called Wren by us. Now she's called whatever you called her
   in onboarding, and every line she speaks anywhere in the app uses that
   name. "Wren" survives only as the fallback for anyone who came in before
   naming existed, and for anyone who skips it.

   The SHELL is stored too. It used to be picked on its own screen and then
   silently dropped on save, which made that screen a piece of theatre — you
   chose a colour and the app forgot before you finished onboarding. If a
   step asks a person to choose, the choice has to survive. */

const NAME_KEY = "kindredly_wren_name";
const EGG_KEY = "kindredly_wren_egg";

export const DEFAULT_WREN = "Wren";

export async function saveWrenName(name: string): Promise<void> {
  const n = name.trim().slice(0, 16);
  try {
    if (n) await AsyncStorage.setItem(NAME_KEY, n);
  } catch {
    /* a name is not worth failing onboarding over */
  }
}

export async function getWrenName(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(NAME_KEY))?.trim() || DEFAULT_WREN;
  } catch {
    return DEFAULT_WREN;
  }
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
export const NAME_IDEAS = [
  "Wren",
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
