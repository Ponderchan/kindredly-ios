import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* WHAT TO CALL PEOPLE — the reader's, and the courier's.
   ────────────────────────────────────────────────────────────────────────
   Two separate questions that happen to need the same little grammar table:

     you      how the app refers to the person using it
     courier  how it refers to the bird, so the hatch key can read
              HATCH HIM / HATCH HER / HATCH THEM instead of always "her"

   THE DEFAULT IS THEY/THEM, and it stays they/them if the question is
   skipped. A guess that misgenders a real person is a worse failure than a
   neutral pronoun ever is, and there is nothing to guess FROM here — this
   product deliberately knows nothing about you but your writing.

   Kept on the device. The `profiles` row has no column for this and adding
   one would be a backend migration for something the client renders alone. */

export type PronounId = "she" | "he" | "they";

export interface Pronoun {
  id: PronounId;
  label: string;
  subj: string; // she  — "she carries your letters"
  obj: string; //  her  — "hatch her"
  poss: string; // her  — "her first letter"
  is: string; //   is   — they/them takes a plural verb
}

export const PRONOUNS: Pronoun[] = [
  { id: "she", label: "she / her", subj: "she", obj: "her", poss: "her", is: "is" },
  { id: "he", label: "he / him", subj: "he", obj: "him", poss: "his", is: "is" },
  { id: "they", label: "they / them", subj: "they", obj: "them", poss: "their", is: "are" },
];

export const DEFAULT_PRONOUN: PronounId = "they";

export function pronoun(id: PronounId | null | undefined): Pronoun {
  return PRONOUNS.find((p) => p.id === id) || PRONOUNS[2];
}

/** Capitalised subject — "She carries…", "They carry…" */
export function Subj(id: PronounId | null | undefined): string {
  const s = pronoun(id).subj;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const YOU_KEY = "kindredly_you_pronoun";
const BIRD_KEY = "kindredly_wren_pronoun";

async function put(k: string, v: PronounId) {
  try {
    await AsyncStorage.setItem(k, v);
  } catch {
    /* never worth failing onboarding over */
  }
}
async function get(k: string): Promise<PronounId> {
  try {
    const v = (await AsyncStorage.getItem(k)) as PronounId | null;
    return v && PRONOUNS.some((p) => p.id === v) ? v : DEFAULT_PRONOUN;
  } catch {
    return DEFAULT_PRONOUN;
  }
}

export const saveYourPronoun = (p: PronounId) => put(YOU_KEY, p);
export const getYourPronoun = () => get(YOU_KEY);
export const saveWrenPronoun = (p: PronounId) => put(BIRD_KEY, p);
export const getWrenPronoun = () => get(BIRD_KEY);

/** the courier's pronoun, for any screen that speaks about her/him/them */
export function useWrenPronoun(): Pronoun {
  const [id, setId] = useState<PronounId>(DEFAULT_PRONOUN);
  const load = useCallback(() => {
    let alive = true;
    void getWrenPronoun().then((v) => {
      if (alive) setId(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);
  return pronoun(id);
}
