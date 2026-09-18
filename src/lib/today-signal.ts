import { extractPiece } from "./writing-engine/stickers/extract";
import { STICKER_BY_TRAIT } from "./writing-engine/stickers/catalog";
import { toPiece } from "./writing-engine/stickers";
import type { TraitId } from "./writing-engine/stickers/types";
import { THEME_STICKER, longEnough, pieceThemes } from "./usage-stickers";
import type { PoolLetter } from "./db";

/* THE ACTUAL REASON — what this letter and the reader have in common.
   ────────────────────────────────────────────────────────────────────────
   "Your auras are close" was a number's shadow: true, unverifiable, and it
   named nothing. The chip on the Today card says the one thing that can be
   pointed at. Five reads, in the owner's order — the more it is about a
   person, the earlier it comes; the more it is about the system, the later:

     subject — the letter is about something you keep writing about (the
               theme rule the counted layer uses, ∩ your subject stickers;
               the private ones never, even here)
     stamp   — the stamp they chose is one you have posted under yourself
     label   — the letter fires a sticker rule you already wear (per-piece
               verdict, not the board: THIS letter has it, and so do you)
     hour    — the letter was written in your band and you are a night
               writer / early bird by the counted layer's last full read
     close   — the nightly matcher named this author. Still true, still the
               fallback, drawn as two rings instead of a sentence

   Nothing is generated. A letter that shares nothing gets no chip. */

export type Signal =
  | { kind: "subject"; stickerId: string }
  | { kind: "stamp" }
  | { kind: "label"; stickerId: string }
  | { kind: "hour"; stickerId: "night_writer" | "early_bird" }
  | { kind: "close" };

/** what the reader's own aura left on the phone for Today to read */
export interface AuraFacts {
  /** the writing stickers you wear now */
  stickers: Set<string>;
  /** the counted layer's ids, last full read */
  usage: Set<string>;
  /** every stamp you have posted a letter under */
  stamps: Set<string>;
}

export function signalFrom(letter: PoolLetter, me: AuraFacts): Signal | null {
  const readable = !!letter.body && letter.body.trim().length >= 3 && letter.kind !== "voice";

  /* the subject */
  if (readable && longEnough(letter.body) && me.usage.size) {
    for (const theme of pieceThemes(letter.body)) {
      const st = THEME_STICKER[theme];
      if (st && !st.private && me.usage.has(st.id)) return { kind: "subject", stickerId: st.id };
    }
  }

  /* the stamp */
  if (letter.stamp && me.stamps.has(letter.stamp)) return { kind: "stamp" };

  /* one sticker the letter shows and the reader wears */
  if (readable && me.stickers.size) {
    try {
      const f = extractPiece(toPiece(letter.id, "letter", letter.body, letter.created_at, letter.lang));
      const shared = (Object.keys(f.verdicts) as TraitId[])
        .filter((tr) => f.verdicts[tr]?.verdict === "support")
        .map((tr) => STICKER_BY_TRAIT[tr]?.id)
        .filter((id): id is string => !!id && me.stickers.has(id));
      if (shared.length) return { kind: "label", stickerId: shared[0] };
    } catch {
      /* an unreadable piece shares nothing */
    }
  }

  /* the same hour — the letter's stamp read on this phone's clock, which is
     the reader's own band; the writer's clock is not on the row */
  const at = Date.parse(letter.created_at);
  if (!Number.isNaN(at)) {
    const h = new Date(at).getHours();
    if (me.usage.has("night_writer") && (h >= 22 || h < 5)) return { kind: "hour", stickerId: "night_writer" };
    if (me.usage.has("early_bird") && h >= 5 && h < 9) return { kind: "hour", stickerId: "early_bird" };
  }

  if (letter.close != null) return { kind: "close" };
  return null;
}
