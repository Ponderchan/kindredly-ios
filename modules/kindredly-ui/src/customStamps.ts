import { requireOptionalNativeModule } from "expo";

/* CUSTOM STAMPS INTO SWIFT (contract .claude/custom-stamps/CONTRACT.md §4.2). Swift never talks to
   the network: src/lib/custom-stamps resolves "c:<uuid>" ids (0038 custom_stamps_for, signed links)
   and pushes them here, into the registry KStamp draws photo stamps from at every tier
   (KCustomStamps, ios/Portable/Kit/KStampArt.swift; the functions in KindredlyUIModule.swift).

   A row: { id: "c:<uuid>", state: ok|pending|rejected|removed|deleted|hidden|blank, hex: "#RRGGBB",
   gold, topic (no "#"), url (https, file:// or ""), key (the picture's cache key: its storage path,
   never the signed link), mine, kept }. Rows merge by id (a later row replaces the earlier one).

   Words: the four the Today card's stamp menu says (Keep this stamp / Report this stamp / Never
   mind / In your album ✓) and the two VoiceOver names, in the reader's language; sent once and on
   every language change.

   Every function is a no-op answering false on a binary without them (old builds, Android). */

export type KCustomStampRow = {
  id: string;
  state: "ok" | "pending" | "rejected" | "removed" | "deleted" | "hidden" | "blank";
  hex: string;
  gold: boolean;
  topic: string;
  url: string;
  key: string;
  mine: boolean;
  kept: boolean;
};

export type KCustomStampWords = {
  keep: string;
  report: string;
  neverMind: string;
  inAlbum: string;
  /** VoiceOver for a photo stamp: "Photo stamp, #{topic}" ({topic} is filled in Swift) */
  a11yStamp: string;
  /** VoiceOver for the empty frame */
  a11yBlank: string;
};

type Native = {
  setCustomStamps?: (rows: KCustomStampRow[]) => void;
  clearCustomStamps?: () => void;
  setCustomStampWords?: (words: KCustomStampWords) => void;
};

const native = (): Native | null => requireOptionalNativeModule<Native>("KindredlyUI");

function call<K extends keyof Native>(name: K, ...args: Parameters<NonNullable<Native[K]>>): boolean {
  const n = native();
  const f = n?.[name] as ((...a: unknown[]) => void) | undefined;
  if (typeof f !== "function") return false;
  try {
    f.apply(n, args);
    return true;
  } catch (e) {
    console.warn(`[kindredly-ui] ${name} failed:`, e);
    return false;
  }
}

/** Merges rows into Swift's registry (by id). */
export const setCustomStamps = (rows: KCustomStampRow[]): boolean => (rows.length ? call("setCustomStamps", rows) : true);
/** Empties Swift's registry (sign-out). */
export const clearCustomStamps = (): boolean => call("clearCustomStamps");
/** The stamp menu's words and the VoiceOver names, in the reader's language. */
export const setCustomStampWords = (words: KCustomStampWords): boolean => call("setCustomStampWords", words);
/** Whether this binary has the registry at all (a photo stamp can be drawn by Swift). */
export const hasCustomStampRegistry = (): boolean => typeof native()?.setCustomStamps === "function";
