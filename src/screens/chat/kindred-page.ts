import type { ThreadDetail } from "../../lib/db";
import type { TFn } from "../../lib/format";
import { TAKEN_BACK } from "../../lib/thread-detail-core";

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
     as a pen-pal mosaic here while their Kindreds row is round). */

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

/** The page's title: A KINDRED once names are traded, A VOICE YOU KNOW before. */
export const pageTitle = (d: Pick<ThreadDetail, "revealed">, t: TFn): string => (d.revealed ? t("kd.kindred") : t("kd.voiceKnown"));

/** "12 — 6 yours · 6 theirs" */
export function lettersValue(d: Pick<ThreadDetail, "myCount" | "otherCount">, t: TFn): string {
  return t("kd.lettersVal", { n: d.myCount + d.otherCount, mine: d.myCount, theirs: d.otherCount });
}

/** Who wrote the opening: YOU WROTE FIRST, or {NAME} WROTE FIRST. */
export function whoBegan(d: Pick<ThreadDetail, "openingFromMe">, name: string, t: TFn, locale: string): string {
  return d.openingFromMe ? t("kd.youFirst") : t("kd.theyFirst", { name: name.toLocaleUpperCase(locale) });
}

/** TALK TO is a door only while someone is behind it: none for a deleted account (readable, not
    actionable — owner). */
export const canTalk = (d: Pick<ThreadDetail, "gone" | "other">): boolean => !d.gone && !!d.other;
