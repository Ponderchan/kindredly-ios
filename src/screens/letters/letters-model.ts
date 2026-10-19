/* MY LETTERS, AS FACTS (Me 4a, ME4A §4.3). Pure and shared: the Swift My letters page
   (MyLettersNative), the React Native one (app/my-letters MyLettersRN keeps its own copy of the
   same rules) and Me's letters peek (useMeModel) all read their cards from here, so the counts on
   Me, "See all n" and the page always agree.

   Every letter you sent into the pool, newest first, with what came of it: the correspondences
   that grew from it (matched by the letter's id once 0020 stamped it, else by the opening's text
   for older rows — today's my-letters rule, lifted out unchanged), and the drafts kept on this
   phone. Imports types only, so its node test needs no stubs:
     node src/screens/letters/letters-model.test.ts */

import type { WritingRow } from "../../lib/aura";
import type { ThreadSummary } from "../../lib/db";
import type { Draft } from "../../lib/drafts";
import type { FaceInput } from "../../lib/faces";

export type LetterStatus =
  | { kind: "quiet" }
  | { kind: "answered"; n: number }
  /** someone who signed wrote back: their name, how many more answered, their face */
  | { kind: "replied"; who: string; more: number; face: FaceInput | null };

export type LetterCardFacts = {
  kind: "letter" | "draft";
  id: string;
  /** ISO; "" when the row has none */
  date: string;
  stamp: string | null;
  body: string;
  reads: number;
  answers: ThreadSummary[];
  status: LetterStatus;
  /** where a tap goes: the first answer's room (names traded) or chat, a draft's composer; null = nowhere */
  opens: string | null;
};

export type LetterTag = "answered" | "quiet" | "draft";
export type LetterFilter = "all" | "answered" | "quiet" | "drafts";
export const LETTER_FILTERS: readonly LetterFilter[] = ["all", "answered", "quiet", "drafts"];

/** "2026.09.23" (the first ten characters of the ISO date, dotted); "" for none */
export const letterDate = (iso: string): string => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "");

/** The status of a letter from its answers: quiet, answered (n), or replied (by someone named). */
export function letterStatus(answers: ThreadSummary[]): LetterStatus {
  if (answers.length === 0) return { kind: "quiet" };
  const named = answers.find((th) => th.revealed && th.otherName);
  if (named) {
    return {
      kind: "replied",
      who: named.otherName as string,
      more: answers.length - 1,
      // a kindred, drawn round (lib/faces threadFaceInput for a revealed thread)
      face: { role: "kindred", seed: named.other, avatarId: named.otherFace ?? null, gone: !!named.gone },
    };
  }
  return { kind: "answered", n: answers.length };
}

/** Every letter and draft as a card, newest first. `letters` null (not read yet) gives the drafts alone. */
export function buildLetterCards(letters: WritingRow[] | null, threads: ThreadSummary[], drafts: Draft[]): LetterCardFacts[] {
  const byId = new Map<string, ThreadSummary[]>();
  const byOpening = new Map<string, ThreadSummary[]>();
  for (const th of threads) {
    if (!th.fromMyLetter) continue;
    if (th.letterId) byId.set(th.letterId, [...(byId.get(th.letterId) ?? []), th]);
    else if (th.opening) byOpening.set(th.opening, [...(byOpening.get(th.opening) ?? []), th]);
  }
  const ls: LetterCardFacts[] = (letters ?? []).map((l) => {
    const answers = [...(byId.get(l.id) ?? []), ...(byOpening.get(l.body) ?? [])];
    const first = answers[0];
    return {
      kind: "letter",
      id: l.id,
      date: l.created_at ?? "",
      stamp: l.stamp ?? null,
      body: l.body,
      reads: l.reads ?? 0,
      answers,
      status: letterStatus(answers),
      opens: first ? (first.revealed ? `/room/${first.id}` : `/chat/${first.id}`) : null,
    };
  });
  const ds: LetterCardFacts[] = drafts.map((d) => ({
    kind: "draft",
    id: d.id,
    date: d.date,
    stamp: d.stamp || null,
    body: d.body,
    reads: 0,
    answers: [],
    status: { kind: "quiet" },
    opens: `/compose?draft=${d.id}`,
  }));
  return [...ls, ...ds].sort((a, b) => b.date.localeCompare(a.date));
}

export const letterTag = (c: LetterCardFacts): LetterTag => (c.kind === "draft" ? "draft" : c.answers.length > 0 ? "answered" : "quiet");

/** The four filters' counts: letters (all, answered, quiet) and drafts. */
export function letterCounts(cards: LetterCardFacts[]): Record<LetterFilter, number> {
  let all = 0;
  let answered = 0;
  let drafts = 0;
  for (const c of cards) {
    if (c.kind === "draft") drafts++;
    else {
      all++;
      if (c.answers.length > 0) answered++;
    }
  }
  return { all, answered, quiet: all - answered, drafts };
}

/** The cards a filter shows: All is every letter (drafts have their own filter). */
export function filterCards(cards: LetterCardFacts[], f: LetterFilter): LetterCardFacts[] {
  return cards.filter((c) => {
    const tag = letterTag(c);
    return f === "all" ? tag !== "draft" : f === "drafts" ? tag === "draft" : tag === f;
  });
}

/* ── the Swift page's records (Me 4a, Prompt 8): every word resolved ───── */

export type MyLettersFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** upper-case in the reader's locale (mono labels) */
  upper: (s: string) => string;
  /** a stamp's colour ("#RRGGBB") and name, "" when unknown */
  stamp: (id: string) => { hex: string; name: string };
};

export type MyLettersStringsView = {
  title: string;
  write: string;
  manage: string;
  cancel: string;
  remove: string;
  back: string;
  none: string;
  noDrafts: string;
};

export type MyLettersCardView = {
  id: string;
  kind: "letter" | "draft";
  tag: "answered" | "quiet" | "draft";
  date: string;
  reads: number;
  answers: number;
  stampId: string;
  stampHex: string;
  body: string;
  tone: "quiet" | "answered" | "replied" | "draft";
  status: string;
  /** the replier's face, to be resolved (useFaceSources) by the host; null for none */
  face: FaceInput | null;
  opens: boolean;
  a11y: string;
};

export type MyLettersView = {
  strings: MyLettersStringsView;
  filters: { key: LetterFilter; label: string; count: number }[];
  cards: MyLettersCardView[];
};

const FILTER_KEY: Record<LetterFilter, string> = { all: "ml.f.all", answered: "ml.f.answered", quiet: "ml.f.quiet", drafts: "ml.f.drafts" };

/** The status band's words for a letter. */
export function statusWords(c: LetterCardFacts, fmt: MyLettersFormat): { tone: MyLettersCardView["tone"]; status: string } {
  const { t, upper } = fmt;
  if (c.kind === "draft") return { tone: "draft", status: "" };
  const s = c.status;
  if (s.kind === "replied") return { tone: "replied", status: s.more > 0 ? t("ml.repliedMore", { who: s.who, n: s.more }) : t("ml.replied", { who: s.who }) };
  if (s.kind === "answered") return { tone: "answered", status: upper(`${t("ml.answered")} · ${s.n}`) };
  return { tone: "quiet", status: upper(t("ml.quiet")) };
}

export function cardView(c: LetterCardFacts, fmt: MyLettersFormat): MyLettersCardView {
  const { t, upper } = fmt;
  const day = letterDate(c.date);
  const stamp = c.stamp ? fmt.stamp(c.stamp) : { hex: "", name: "" };
  const { tone, status } = statusWords(c, fmt);
  if (c.kind === "draft") {
    const date = upper([t("ml.draft"), day].filter(Boolean).join(" · "));
    const body = c.body || t("ml.draftEmpty");
    return {
      id: c.id,
      kind: "draft",
      tag: "draft",
      date,
      reads: 0,
      answers: 0,
      stampId: c.stamp ?? "",
      stampHex: stamp.hex,
      body,
      tone,
      status,
      face: null,
      opens: !!c.opens,
      a11y: [date, body].join(", "),
    };
  }
  const n = c.answers.length;
  const a11y = [
    day,
    stamp.name,
    c.body,
    status,
    t("m4.ml.a11y.reads", { n: c.reads }),
    n === 1 ? t("m4.ml.a11y.replyOne") : t("m4.ml.a11y.replies", { n }),
  ].filter(Boolean);
  return {
    id: c.id,
    kind: "letter",
    tag: letterTag(c) === "answered" ? "answered" : "quiet",
    date: day,
    reads: c.reads,
    answers: n,
    stampId: c.stamp ?? "",
    stampHex: stamp.hex,
    body: c.body,
    tone,
    status,
    face: c.status.kind === "replied" ? c.status.face : null,
    opens: !!c.opens,
    a11y: a11y.join(", "),
  };
}

export function buildMyLettersView(cards: LetterCardFacts[], fmt: MyLettersFormat): MyLettersView {
  const { t } = fmt;
  const counts = letterCounts(cards);
  return {
    strings: {
      title: t("ml.title"),
      write: t("ml.write"),
      manage: t("ml.manage"),
      cancel: t("ml.cancel"),
      remove: t("ml.rm.remove"),
      back: t("a11y.back"),
      none: t("ml.none"),
      noDrafts: t("m4.ml.noDrafts"),
    },
    filters: LETTER_FILTERS.map((k) => ({ key: k, label: t(FILTER_KEY[k]), count: counts[k] })),
    cards: cards.map((c) => cardView(c, fmt)),
  };
}
