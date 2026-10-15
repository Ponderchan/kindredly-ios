import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readWren, writeWren } from "./wren-profile";

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


export const DEFAULT_WREN = "Wren";

/** The longest name she takes: 16 characters, everywhere she is named — the naming step
    (onboarding maxLength 16), the one-field page (screens/edit-profile COURIER_NAME_MAX) and
    here. The old rename prompt took 18 and this cut two of them without a word. */
export const WREN_NAME_MAX = 16;

export async function saveWrenName(name: string): Promise<void> {
  const n = name.trim().slice(0, WREN_NAME_MAX);
  if (n) await writeWren("name", n);
}

export async function getWrenName(): Promise<string> {
  return (await readWren("name", (v) => v.length > 0)) || DEFAULT_WREN;
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
  await writeWren("egg", String(variant));
}

export async function getWrenEgg(): Promise<number> {
  const v = parseInt((await readWren("egg", (x) => Number.isFinite(parseInt(x, 10)))) || "0", 10);
  return Number.isFinite(v) ? v : 0;
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
