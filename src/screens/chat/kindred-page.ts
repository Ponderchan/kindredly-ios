import type { ThreadDetail, ThreadMessage } from "../../lib/db";
import type { TFn } from "../../lib/format";
import { TAKEN_BACK, type ThreadDetailStatus } from "../../lib/thread-detail-core";
import { isOpening } from "./build-items";

/* A KINDRED'S PAGE, ITS RULES (10a step 5, slice chat-rn).
   ────────────────────────────────────────────────────────────────────────
   kindred/[id] stays React Native, on the theme, with the fixes the spec
   and its critic found, held here as plain functions so
   `node src/screens/chat/kindred-page.test.ts` can check them:

   · what their letters told you, and how alike you write, are read from
     what each of you WROTE: a line taken back is nobody's writing (critic:
     the page counted "(taken back)" as their words, skewing the read and
     the resonance %), the room already filters them;
   · TALK TO goes BACK when the screen underneath is the room (or, before
     names, the chat) it would open — entered from the room's header it
     used to replace, leaving two copies of the room on the stack (spec
     bug 12) — and otherwise replaces this page with it;
   · a kindred is a round face, a pen pal a square mosaic, a deleted
     account the veil (owner 10-15; critic: a faceless kindred was drawn
     as a pen-pal mosaic here while their Kindreds row is round);
   · TALK TO is gone too when the server calls the thread missing, and
     "where it began" shows the opening or nothing — never the first reply
     in its place;
   · identity Phase 1 (the switch on): a pen pal you know the voice of is
     their frosted window, never a developing mosaic (pageFace), and a
     kindred's card loses THE FACE YOU WATCHED ARRIVE — there was no face
     arriving, only the frost (plan §1 5a). WHO BEGAN reads id.kd.theyFirst,
     whose words never agree with the name. Switch off: all as before. */

/** Each side's writing: the bodies they wrote, the opening on its side, nothing taken back. */
export function writingOf(d: ThreadDetail): { mine: string[]; theirs: string[] } {
  const said = d.messages.filter((m) => !m.recalledAt && m.body !== TAKEN_BACK && !!m.body);
  const mine = said.filter((m) => m.mine).map((m) => m.body);
  const theirs = said.filter((m) => !m.mine).map((m) => m.body);
  if (d.opening) (d.openingFromMe ? mine : theirs).unshift(d.opening);
  return { mine, theirs };
}

/** The route under this page in the stack, as navigation state gives it. */
export type RouteBelow = { name?: string; params?: Record<string, unknown> | undefined } | null | undefined;

export type TalkTo = { kind: "back" } | { kind: "replace"; href: string };

/** Where TALK TO goes: the room once names are traded, the chat before; back when that very
    screen is underneath, a replace otherwise (spec bug 12). */
export function talkTo(d: Pick<ThreadDetail, "revealed">, id: string, below: RouteBelow): TalkTo {
  const route = d.revealed ? "room/[id]" : "chat/[id]";
  const href = d.revealed ? `/room/${id}` : `/chat/${id}`;
  const belowId = below?.params?.id;
  if (below?.name === route && String(belowId ?? "") === id) return { kind: "back" };
  return { kind: "replace", href };
}

/** How they are drawn: round (a kindred, their portrait or the stranger glyph), the veil (a
    deleted account) or their mosaic (a pen pal you know the voice of). */
export function faceKind(d: Pick<ThreadDetail, "revealed" | "gone" | "other">): "round" | "veil" | "mosaic" {
  if (d.gone || !d.other) return "veil";
  return d.revealed ? "round" : "mosaic";
}

/** faceKind with the identity switch: a pen pal is their frosted window once it is on (the renderer
    draws WhoBook.frost(d.other)); off, exactly faceKind. */
export function pageFace(d: Pick<ThreadDetail, "revealed" | "gone" | "other">, identity: boolean): "round" | "veil" | "mosaic" | "frost" {
  const k = faceKind(d);
  return identity && k === "mosaic" ? "frost" : k;
}

/** The small mosaic under a kindred's name, THE FACE YOU WATCHED ARRIVE: only for a kindred with
    someone behind them, and never with the identity switch on (no face arrived, the frost did). */
export const showsArrivalMosaic = (d: Pick<ThreadDetail, "revealed" | "gone" | "other">, identity: boolean): boolean => !identity && faceKind(d) === "round";

/** The page's title: A KINDRED once names are traded, A VOICE YOU KNOW before. */
export const pageTitle = (d: Pick<ThreadDetail, "revealed">, t: TFn): string => (d.revealed ? t("kd.kindred") : t("kd.voiceKnown"));

/** "12 — 6 yours · 6 theirs" */
export function lettersValue(d: Pick<ThreadDetail, "myCount" | "otherCount">, t: TFn): string {
  return t("kd.lettersVal", { n: d.myCount + d.otherCount, mine: d.myCount, theirs: d.otherCount });
}

/** Who wrote the opening: YOU WROTE FIRST, or {NAME} WROTE FIRST (switch on: id.kd.theyFirst, written
    so that no verb agrees with the name). */
export function whoBegan(d: Pick<ThreadDetail, "openingFromMe">, name: string, t: TFn, locale: string, identity = false): string {
  return d.openingFromMe ? t("kd.youFirst") : t(identity ? "id.kd.theyFirst" : "kd.theyFirst", { name: name.toLocaleUpperCase(locale) });
}

/** TALK TO is a door only while someone is behind it: none for a deleted account, and none for a
    thread the server calls missing (gone, or hidden by a block) even while a kept copy is shown —
    readable, not actionable (owner; the room, the chat and the reader close in place the same). */
export const canTalk = (d: Pick<ThreadDetail, "gone" | "other">, status?: ThreadDetailStatus): boolean => !d.gone && !!d.other && status !== "missing";

/** The letter that started it: the conversation's first letter only when it IS the opening. An
    opening with no words and no voice media (a caption-less voice letter whose media wasn't
    copied) is dropped from the conversation, and the first reply must not stand in for it under
    YOU / THEY WROTE FIRST — then there is no card (review: parity-3). */
export function openingLetter(letters: readonly ThreadMessage[]): ThreadMessage | null {
  const first = letters[0];
  return first && isOpening(first) ? first : null;
}
