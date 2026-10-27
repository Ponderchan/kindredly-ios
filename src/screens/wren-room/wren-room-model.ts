import type { WrenLocal, WrenMail, WrenPost } from "../../lib/wren-desk";
import type { GuideId } from "../../data/guides";

/* WREN'S ROOM, AS DATA (the rules both renderers draw from).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word comes in through
   `words` and every day through `dayOf`, so
     node src/screens/wren-room/wren-room-model.test.ts
   locks the rules. The React Native room (app/room/wren.tsx, the
   "wrenroom" switch's fallback) builds its transcript and its speaker
   labels with these; WrenRoomNative turns wrenRoomRows into the Swift page
   (KWrenRoomView).

   THE TRANSCRIPT. Her posts, your mail, the makers' replies to it (at the
   time they replied) and her own answers kept on this phone, in one stream
   by time, oldest first.

   THE SPEAKER. WREN, WREN · EVENT, WREN · NOTE for her posts; YOU,
   YOU · A BUG, YOU · AN IDEA for your mail; WREN for a reply; YOU for a
   question she answered on the phone, WREN for a guide opened from a chip.

   THE ROWS (as the React Native page lays them out). A day rule over the
   first item of each day. One label per run of the same voice: a label
   again after a day rule, or when the voice changes (a question she
   answered is YOU, then always her WREN label over the answer). */

export type WrenRoomItem =
  | { type: "post"; post: WrenPost; at: string }
  | { type: "mail"; mail: WrenMail; at: string }
  | { type: "reply"; mail: WrenMail; at: string }
  | { type: "local"; local: WrenLocal; at: string };

/** the chips shown until MORE opens all the guides */
export const FIRST_CHIPS: GuideId[] = ["letters", "kindreds", "aura"];

/** Posts, mail, the makers' replies and her answers on the phone, oldest first. */
export function buildWrenStream(posts: readonly WrenPost[], mail: readonly WrenMail[], local: readonly WrenLocal[]): WrenRoomItem[] {
  const all: WrenRoomItem[] = [
    ...posts.map((post) => ({ type: "post" as const, post, at: post.at })),
    ...mail.map((m) => ({ type: "mail" as const, mail: m, at: m.at })),
    ...mail.filter((m) => m.reply).map((m) => ({ type: "reply" as const, mail: m, at: m.repliedAt || m.at })),
    ...local.map((l) => ({ type: "local" as const, local: l, at: l.at })),
  ];
  return all.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/** The words a speaker label is made of, already translated (and in capitals where drawn so). */
export type WrenSpeakerWords = {
  /** t("ui.you") */
  you: string;
  /** OFFICIAL_NAME in capitals */
  wren: string;
  /** t("wo.bug.t") in capitals */
  bug: string;
  /** t("wo.idea.t") in capitals */
  idea: string;
  /** t("wo.kind.event") */
  event: string;
  /** t("wo.kind.note") */
  note: string;
};

/** Who is speaking in an item: WREN · EVENT, YOU · A BUG, … */
export function wrenSpeaker(x: WrenRoomItem, w: WrenSpeakerWords): string {
  if (x.type === "mail") return x.mail.kind === "bug" ? `${w.you} · ${w.bug}` : x.mail.kind === "idea" ? `${w.you} · ${w.idea}` : w.you;
  if (x.type === "local") return x.local.q ? w.you : w.wren;
  if (x.type === "reply") return w.wren;
  return x.post.kind === "event" ? `${w.wren} · ${w.event}` : x.post.kind === "note" ? `${w.wren} · ${w.note}` : w.wren;
}

/** An item's key for the life of its row. */
export function wrenItemKey(it: WrenRoomItem): string {
  return it.type === "post" ? `p-${it.post.id}` : it.type === "local" ? `l-${it.local.id}` : it.type === "reply" ? `r-${it.mail.id}` : `m-${it.mail.id}`;
}

/** A post's link back into the app, kindredly:///guide/<id>: the id (the caller checks it is a guide), or null. */
export function guideSlugOf(url: string): string | null {
  const m = url.match(/^kindredly:\/\/\/?guide\/([a-z]+)$/);
  return m ? m[1] : null;
}

/** One row's layout facts: what stands above its words. */
export type WrenRoomRowFacts = {
  key: string;
  item: WrenRoomItem;
  /** the day rule over the row, "" for none */
  dayLabel: string;
  /** the first row: its day rule has no space above it */
  first: boolean;
  /** the speaker label over the row, "" for none */
  label: string;
  /** the label is yours (drawn quiet, in mute) */
  labelMine: boolean;
  /** the label sits right under a day rule (no space above it) */
  labelUnderDay: boolean;
  /** a question she answered on the phone, drawn as yours before her answer; "" for none */
  question: string;
  /** her label over the answer to that question (always there with a question); "" for none */
  answerLabel: string;
  /** the words are yours (drawn in sub) */
  mine: boolean;
};

/** The rows of the transcript, as the room lays them out (see THE ROWS above). `dayOf` is the
    day rule's words for a time (dShort in capitals): two items share a day when it says the same. */
export function wrenRoomRows(stream: readonly WrenRoomItem[], w: WrenSpeakerWords, dayOf: (at: string) => string): WrenRoomRowFacts[] {
  return stream.map((it, i) => {
    const prev = i > 0 ? stream[i - 1] : null;
    const day = dayOf(it.at);
    const newDay = !prev || day !== dayOf(prev.at);
    const label = wrenSpeaker(it, w);
    const sameSpeaker = !!prev && wrenSpeaker(prev, w) === label;
    const shows = newDay || !sameSpeaker;
    const base = { key: wrenItemKey(it), item: it, dayLabel: newDay ? day : "", first: i === 0, labelUnderDay: newDay };
    if (it.type === "local") {
      const q = it.local.q;
      return q
        ? { ...base, label: shows ? w.you : "", labelMine: true, question: q, answerLabel: w.wren, mine: false }
        : { ...base, label: shows ? w.wren : "", labelMine: false, question: "", answerLabel: "", mine: false };
    }
    const mine = label.startsWith(w.you);
    return { ...base, label: shows ? label : "", labelMine: mine, question: "", answerLabel: "", mine };
  });
}
