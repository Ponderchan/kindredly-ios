import { COUNTER_FROM, LETTER_MAX, OPENING_MIN, REPLY_MIN } from "../../lib/weighted-count";
import { PAPERS, paperOf, type PaperGate } from "../../data/papers";

/* THE COMPOSE PAGE, AS DATA (10a step 5). Pure: no React, no React Native,
   no i18n, no storage — every word comes in through `fmt`, so
   `node src/screens/compose/compose-model.test.ts` locks the rules. Both
   renderers of the page draw what these return: the SwiftUI page
   (ComposeNative → KComposeView) and the React Native fallback
   (ComposeRN), through the one state hook (useComposeState), so a remote
   flip between them never changes when a letter may go, what the key
   says, what the counts say, or what happens to the words on the way out.

   THE KEY HAS THREE DOORS (owner 2026-09-20, drawn the 10a way):
   - filling: the words aren't enough yet. LET IT TRAVEL in mute on the
     wide key, a wash rising from its left toward the floor and the count
     beside the label ("7/20", `count`) — the App Store page's key, brought
     back by the owner on 2026-10-18 (10a step 5 had drawn the floor as a
     line with no digits; he wanted the composer as it was). A letter over
     the ceiling is filling too, with no wash and no count (the count near
     the ceiling says by how much);
   - needStamp: the words are ready and no stamp is chosen: PICK A MOOD
     STAMP in ind, a chevron nudging toward the stamp key; the key opens
     the stamps;
   - ready: LET IT TRAVEL in ind (SEND where it doesn't fit);
   - sending: SENDING… in mute, not pressable.
   And while the chosen paper can't go yet (letter papers, 2026-10-20;
   contract §5.4), whatever the words, unless a send is in flight:
   - paperFirstClass: a First Class paper picked by a non-member: SEND ON
     FIRST CLASS PAPER → in gold, pressable; it opens the paywall;
   - paperLocked: Airmail before a first kindred: OPENS WITH YOUR FIRST
     KINDRED, not pressable.
   Picking a paper that can go gives the key its three doors back.

   THE QUOTA (owner question 6's default): free writers only, signed in
   with a real account, once First Class has answered — "N LEFT TODAY" on
   the small line above the toolbar, NONE LEFT TODAY at zero, and at zero
   the daily-cap panel shows at once. First Class, a guest, the store-mode
   demo, or a count we couldn't read: nothing. The count only SHOWS; the
   server DECIDES. At zero the send asks the server first (bump-letters,
   before the courier takes off): a 429 keeps the panel and nothing flies,
   a yes sends — a day that turned (UTC), or a First Class writer whose
   entitlement read failed (the server counts First Class letters too, so
   their row can read five or more). A yes for First Class takes the count
   and the panel off the page.

   THE QUESTION. Turning it off keeps its words (one tap must never throw
   away what was typed); it simply stops riding with the letter — not sent,
   not guarded, not drafted — until it is turned on again, words and all.
   A recording never carries a question, so the ASK cell is off while
   speaking.

   LEAVING. The guarded ✕ is the page's only way out (no edge swipe). A
   page with words, a question, or a recording asks first; a recording
   can't be kept as a draft (it lives in the temp dir), so a voice page
   with no words offers only DISCARD and KEEP WRITING. The silent autosave
   when the page goes runs only for a page that left without deciding:
   never after DISCARD (that re-saved the very draft just thrown away),
   never after SAVE AS DRAFT (that saved it a second time, with a new id),
   never after a send. */

/** what the page is writing */
export type ComposeMode = "write" | "speak";
/** what sits where the keyboard was */
export type ComposeTray = null | "stamps" | "more" | "paper";
export type KeyStage = "filling" | "needStamp" | "ready" | "sending" | "paperFirstClass" | "paperLocked";
export type KeyTone = "mute" | "ind";
export type CountTone = "mute" | "amber" | "post";

/** the words, in the reader's language (t from lib/i18n in the app) */
export type ComposeFormat = { t: (key: string, vars?: Record<string, string | number>) => string };

/** The main key, as both renderers draw it. */
export type KeyVM = {
  stage: KeyStage;
  /** LET IT TRAVEL / PICK A MOOD STAMP / SENDING… */
  label: string;
  /** what the key says where `label` doesn't fit (SEND), "" for none: only
      while filling or ready — the other two labels are never squeezed by a
      stamp pill (needStamp has no pill; sending is short) */
  narrowLabel: string;
  tone: KeyTone;
  /** pressable: ready (sends) or needStamp (opens the stamps) */
  enabled: boolean;
  /** the wash toward the floor, 0..1, or -1 for none (not filling, speaking, or over the ceiling) */
  progress: number;
  /** the count beside the label while the wash shows ("7/20"), "" otherwise */
  count: string;
  /** the chevron leaning toward the stamp key */
  nudge: boolean;
  /** VoiceOver's value on the key (a11y pass cm-8: the wash and "7/20" are hidden from it, so a
      dimmed key said nothing about why): how many are still to go while filling below the floor
      ("13 more to go"), how far over the ceiling past it; "" otherwise */
  countA11y: string;
  /** VoiceOver's hint on the key: what PICK A MOOD STAMP does and why a stamp is needed; "" otherwise */
  hintA11y: string;
};

/** The count near the ceiling, or null below it. */
export type CountVM = { text: string; tone: CountTone };

/** How the page was left, for the autosave when it goes. */
export type LeaveOutcome = { kind: "open" } | { kind: "saved"; id: string } | { kind: "discarded" } | { kind: "sent" };

/** What the leave guard offers. */
export type LeaveGuard = {
  /** ask before leaving (false: just go back) */
  guard: boolean;
  /** SAVE AS DRAFT is offered: there are words to keep */
  canSaveDraft: boolean;
};

/** What a draft saves (lib/drafts saveDraft's input). */
export type DraftInput = { id: string | null; stamp: string; body: string; ask: string };

/** One stamp in the tray. */
export type StampItemVM = { id: string; name: string; inkHex: string; a11yLabel: string };
/** `mark`: a seasonal set's small marker beside its head (mono caps, "SEASONAL"); absent for the rest */
export type StampSectionVM = { title: string; items: StampItemVM[]; mark?: string };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The words are enough to go (the stamp aside). Written: the floor
    (OPENING_MIN, weighted) and under the ceiling (LETTER_MAX). Spoken: a
    recording, and the line that travels with it (moderation reads it). */
export function wordsReadyFor(p: { mode: ComposeMode; weight: number; hasRecording: boolean }): boolean {
  if (p.mode === "speak") return p.hasRecording && p.weight >= REPLY_MIN;
  return p.weight >= OPENING_MIN && p.weight <= LETTER_MAX;
}

/** The main key (see THE KEY HAS THREE DOORS above). */
export function keyFor(
  p: {
    mode: ComposeMode;
    weight: number;
    wordsReady: boolean;
    hasStamp: boolean;
    busy: boolean;
    tray: ComposeTray;
    /** whether the chosen paper can go (papers.ts paperGate); "ok" when absent. Speaking ignores it: a voice letter carries no paper */
    paperGate?: PaperGate;
  },
  fmt: ComposeFormat,
): KeyVM {
  const gate = p.mode === "write" ? (p.paperGate ?? "ok") : "ok";
  if (!p.busy && gate === "firstClass") {
    return { stage: "paperFirstClass", label: fmt.t("pp.key.fc"), narrowLabel: fmt.t("pp.key.fc.narrow"), tone: "ind", enabled: true, progress: -1, count: "", nudge: false, countA11y: "", hintA11y: fmt.t("pp.a11y.upgrade") };
  }
  if (!p.busy && gate === "kindred") {
    return { stage: "paperLocked", label: fmt.t("pp.key.locked"), narrowLabel: fmt.t("pp.key.locked.narrow"), tone: "mute", enabled: false, progress: -1, count: "", nudge: false, countA11y: "", hintA11y: "" };
  }
  const stage: KeyStage = p.busy ? "sending" : p.wordsReady && !p.hasStamp ? "needStamp" : p.wordsReady ? "ready" : "filling";
  const label = stage === "sending" ? fmt.t("cp.sending") : stage === "needStamp" ? fmt.t("cp.needStamp") : fmt.t("cp.travel");
  const narrowLabel = stage === "filling" || stage === "ready" ? fmt.t("ld.send") : "";
  const filling = stage === "filling" && p.mode === "write" && p.weight < OPENING_MIN;
  return {
    stage,
    label,
    narrowLabel,
    tone: stage === "ready" || stage === "needStamp" ? "ind" : "mute",
    enabled: stage === "ready" || stage === "needStamp",
    progress: filling ? clamp01(p.weight / OPENING_MIN) : -1,
    count: filling ? `${p.weight}/${OPENING_MIN}` : "",
    nudge: stage === "needStamp" && p.tray !== "stamps",
    countA11y: filling ? keyLeftA11y(OPENING_MIN - Math.max(0, p.weight), fmt) : stage === "filling" && p.mode === "write" && p.weight > LETTER_MAX ? fmt.t("ui.overLimit", { n: p.weight - LETTER_MAX }) : "",
    hintA11y: stage === "needStamp" ? fmt.t("cp.a11y.needStampHint") : "",
  };
}

/** "13 more to go" (one has its own key: "Falta 1", not "Faltan 1") */
function keyLeftA11y(left: number, fmt: ComposeFormat): string {
  return left === 1 ? fmt.t("cp.a11y.keyLeftOne") : fmt.t("cp.a11y.keyLeft", { n: left });
}

/** The count, only near the ceiling of a written letter (from COUNTER_FROM,
    so nobody writes to a number): "N OVER THE LIMIT" in postmark red past
    it, "N LEFT" in brass within 40 of it, in mute before that. Localized
    (it used to be `${n} over` / `${n} left` in English for everyone). */
export function countFor(p: { mode: ComposeMode; weight: number }, fmt: ComposeFormat): CountVM | null {
  if (p.mode !== "write" || p.weight < COUNTER_FROM) return null;
  const over = p.weight - LETTER_MAX;
  if (over > 0) return { text: fmt.t("ui.overLimit", { n: over }), tone: "post" };
  const left = -over;
  // one left has its own key: "QUEDAN 1" / "RESTAM 1" are wrong in Spanish and Portuguese
  return { text: left === 1 ? fmt.t("cp.charsLeftOne") : fmt.t("cp.charsLeft", { n: left }), tone: over > -40 ? "amber" : "mute" };
}

/** Letters left today from the day's count (letters_daily) and the cap. */
export function leftFromCount(count: number, cap: number): number {
  const c = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return Math.max(0, cap - c);
}

/** Who sees the quota: a real account, signed in, that First Class has
    answered for and isn't First Class. A guess (the entitlement read can
    fail closed): it draws the count, it never refuses a send. */
export function isFreeWriter(p: { signedIn: boolean; isGuest: boolean; premium: boolean; premiumSettled: boolean }): boolean {
  return p.signedIn && !p.isGuest && p.premiumSettled && !p.premium;
}

/** The send asks the server (bump-letters) before the courier takes off:
    only when the count we show says none left. Everywhere else the bump
    runs under the flight, after her gate. */
export function bumpBeforeFlight(p: { free: boolean; left: number | null }): boolean {
  return p.free && p.left === 0;
}

/** The day's count after the server let a letter go: null for First Class
    (no count, no panel: it said premium), the count against its cap for a
    free writer, undefined when it sent no count (leave the page as it is). */
export function leftAfterBump(b: { premium: boolean; count?: unknown; cap?: unknown }, fallbackCap: number): number | null | undefined {
  if (b.premium) return null;
  if (typeof b.count !== "number" || !Number.isFinite(b.count)) return undefined;
  const cap = typeof b.cap === "number" && Number.isFinite(b.cap) ? b.cap : fallbackCap;
  return leftFromCount(b.count, cap);
}

/** "N LEFT TODAY" for a free writer whose count we know, "" otherwise. */
export function quotaFor(p: { free: boolean; left: number | null }, fmt: ComposeFormat): string {
  if (!p.free || p.left == null) return "";
  if (p.left <= 0) return fmt.t("cp.left.none");
  if (p.left === 1) return fmt.t("cp.left.one");
  return fmt.t("cp.left.n", { n: p.left });
}

/** The daily-cap panel shows: after the server said so (a 429), or at once
    for a free writer with none left. */
export function capVisible(p: { capHit: boolean; free: boolean; left: number | null }): boolean {
  return p.capHit || (p.free && p.left === 0);
}

/** Which colour the count near the ceiling takes: postmark red past it;
    within 40 of it, brass that reads as small mono text — brassSeal on the
    light pages (goldText is under 3:1 there), goldText on Midnight (where
    it is the one that reads); the theme's mute before that. A brand name
    (themes.json brand), so both renderers pick the same one. */
export function countBrand(tone: CountTone, dark: boolean): "mute" | "brassSeal" | "goldText" | "postRed" {
  if (tone === "post") return "postRed";
  if (tone === "amber") return dark ? "goldText" : "brassSeal";
  return "mute";
}

/** Wren's one line: her language hello (once per language, an empty page,
    a non-English interface), else while speaking the prompt for the missing
    line or her read of the mood, else the ladder toward the floor. Every
    candidate comes in already in the reader's language; the result is in
    the language's own quotation marks (cp.quote). */
export function wrenLineFor(
  p: { langHello: boolean; mode: ComposeMode; hasRecording: boolean; weight: number; hello: string; voicePrompt: string; moodLine: string; ladderLine: string },
  fmt: ComposeFormat,
): string {
  const line = p.langHello
    ? p.hello
    : p.mode === "speak"
      ? p.hasRecording && p.weight < REPLY_MIN
        ? p.voicePrompt
        : p.moodLine
      : p.ladderLine;
  return fmt.t("cp.quote", { s: line });
}

/** The question as it rides with the letter: its words while it is on,
    nothing while it is off (its words are kept, not sent; see THE QUESTION). */
const riding = (ask: string, askOn: boolean) => (askOn ? ask : "");

/** What goes out: the letter with its question under it (only while the
    question is on), or the line that travels with a recording. */
export function sendBody(mode: ComposeMode, text: string, ask: string, askOn: boolean): string {
  if (mode === "speak") return text.trim();
  const a = riding(ask, askOn).trim();
  return a ? `${text.trim()}\n\n${a}` : text.trim();
}

/** The leave guard: words (the letter, or its question while it is on) or
    a recording ask first; only words can be kept as a draft. */
export function leaveGuard(p: { text: string; ask: string; askOn: boolean; hasRecording: boolean }): LeaveGuard {
  const words = p.text.trim() !== "" || riding(p.ask, p.askOn).trim() !== "";
  return { guard: words || p.hasRecording, canSaveDraft: words };
}

/** What SAVE AS DRAFT keeps: the letter (trimmed) and its question while it
    is on, under the draft's own id when it has one. */
export function draftToKeep(snap: { text: string; ask: string; askOn: boolean; sel: string | null; draftId: string | null }): DraftInput {
  return { id: snap.draftId, stamp: snap.sel ?? "", body: snap.text.trim(), ask: riding(snap.ask, snap.askOn) };
}

/** The silent autosave when the page goes, or null: only for a written page
    that left without deciding (see LEAVING above), with at least a few
    characters; the question only while it is on. */
export function autosaveDraft(
  snap: { text: string; ask: string; askOn: boolean; sel: string | null; mode: ComposeMode; draftId: string | null },
  outcome: LeaveOutcome,
): DraftInput | null {
  if (outcome.kind !== "open") return null;
  if (snap.mode !== "write") return null; // a recording doesn't survive as a draft
  if (snap.text.trim().length < 3) return null;
  return { id: snap.draftId, stamp: snap.sel ?? "", body: snap.text, ask: riding(snap.ask, snap.askOn) };
}

/** The + tray's ASK cell: lit while the question shows under the letter;
    off while speaking (a recording carries no question, and the field is
    drawn only under a written letter), so a tap there neither lights it
    nor queues a focus for a field that isn't on the page. */
export function askCell(p: { askOpen: boolean; mode: ComposeMode }): { on: boolean; disabled: boolean } {
  return { on: p.askOpen && p.mode === "write", disabled: p.mode === "speak" };
}

/** The + key's dot: something rides with the letter (the question while it
    is on, the voice). A question turned off rides with nothing. */
export function plusDot(p: { tray: ComposeTray; askOn: boolean; mode: ComposeMode }): boolean {
  return p.tray !== "more" && (p.askOn || p.mode === "speak");
}

/** The stamp tray's sections, in order: the season's stamps while a season
    lasts (owner, 2026-10-26: first of all, with a small marker), FOR THIS
    LETTER (read off the letter), RECENTLY USED, then the six categories. An id no stamp has
    (a stale recent, a suggestion table naming a stamp since renamed) is
    dropped, as ComposeTray drops it, so Swift never gets an id it has no
    art or name for; a section left empty isn't sent. */
export function stampSections(p: {
  seasonal?: { title: string; mark: string; ids: readonly string[] } | null;
  suggested: { title: string; ids: readonly string[] };
  recent: { title: string; ids: readonly string[] };
  categories: readonly { title: string; ids: readonly string[] }[];
  item: (id: string) => StampItemVM | null;
}): StampSectionVM[] {
  const out: StampSectionVM[] = [];
  const marked: { title: string; mark?: string; ids: readonly string[] }[] = p.seasonal ? [p.seasonal] : [];
  const all: { title: string; mark?: string; ids: readonly string[] }[] = [...marked, p.suggested, p.recent, ...p.categories];
  for (const s of all) {
    const seen = new Set<string>();
    const items: StampItemVM[] = [];
    for (const id of s.ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const it = p.item(id);
      if (it) items.push(it);
    }
    if (items.length) out.push(s.mark ? { title: s.title, items, mark: s.mark } : { title: s.title, items });
  }
  return out;
}

/* A TRAY NAME'S COLOUR (the bright palette, owner 2026-10-19). The name under a stamp in the tray
   is drawn in the stamp's own name shade, not the stamp colour and not a walked channel ink:
   `nameLight` (the palette's name_classic, OKLCH L 0.52 at the hex's hue) on the light themes —
   Classic, Lavender, Paper — and `nameDark` (name_midnight, the hex itself) on Midnight. Both are
   data/stamps.ts fields; measured on the tray's ground (tk.soft) every one clears 4.5:1 (4.74+ on
   the light themes, 4.85+ on Midnight). Pure: the caller passes the stamp (or null), whether the
   theme is dark, and the theme's ink for a stamp with no shades (an id stamps.ts doesn't know). */
export function trayNameHex(
  stamp: { nameLight?: string | null; nameDark?: string | null } | null | undefined,
  dark: boolean,
  inkFallback: string,
): string {
  const c = dark ? stamp?.nameDark : stamp?.nameLight;
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : inkFallback;
}

/* A TRAY NAME'S SIZE (the owner, 2026-10-18: most names on one line). The tray's names are set in
   the mono, whose every Latin glyph is 0.6 em wide (a CJK or other wide glyph a whole em), so
   whether a name fits its column is arithmetic, not a measurement: one line at 9 if it fits, else
   one line at 8, else wrapped at 9 in up to three lines (else at 8) — never cut short. The SwiftUI tray asks the same question of
   the real text (ViewThatFits in KStampTray); this is React Native's answer. `room` is the
   column's width in pt. */
export const TRAY_NAME_SIZES = [9, 8] as const;
const TRAY_NAME_TRACKING = 0.2;
const wideGlyph = (cp: number): boolean =>
  (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6);
export function trayNameWidth(name: string, size: number): number {
  let ems = 0;
  let glyphs = 0;
  for (const ch of name) {
    ems += wideGlyph(ch.codePointAt(0) ?? 0) ? 1 : 0.6;
    glyphs++;
  }
  return ems * size + Math.max(0, glyphs - 1) * TRAY_NAME_TRACKING;
}
/** the most lines a wrapped tray name takes (a11y pass cm-9: two at 9 cut "never told anyone" with
    an ellipsis on a 375 phone, where a column leaves 53pt and "never told" needs 54) */
export const TRAY_NAME_MAX_LINES = 3;
/** how many lines `name` wraps to at `size` in `room`: word by word, a word wider than the room
    broken where it overflows (as the text system does) */
export function trayNameLines(name: string, size: number, room: number): number {
  let lines = 0;
  let line = "";
  for (const word of name.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (trayNameWidth(next, size) <= room) {
      line = next;
      continue;
    }
    if (line) lines++;
    line = "";
    const w = trayNameWidth(word, size);
    if (w <= room) line = word;
    // a word that alone overflows takes whole lines of its own (its last piece closes its line)
    else lines += Math.ceil(w / Math.max(1, room));
  }
  return lines + (line ? 1 : 0);
}
export type TrayNameFit = { size: number; lines: 1 | 2 | 3 };
/** One line at 9, else one line at 8, else wrapped at 9 in up to three lines, else at 8 (the
    SwiftUI tray's ViewThatFits and its last choice's .minimumScaleFactor(8 / 9)). */
export function trayNameFit(name: string, room: number): TrayNameFit {
  for (const size of TRAY_NAME_SIZES) if (trayNameWidth(name, size) <= room) return { size, lines: 1 };
  const clamp = (n: number) => Math.min(TRAY_NAME_MAX_LINES, Math.max(2, n)) as 2 | 3;
  const at9 = trayNameLines(name, TRAY_NAME_SIZES[0], room);
  if (at9 <= TRAY_NAME_MAX_LINES) return { size: TRAY_NAME_SIZES[0], lines: clamp(at9) };
  return { size: TRAY_NAME_SIZES[1], lines: clamp(trayNameLines(name, TRAY_NAME_SIZES[1], room)) };
}

/* THE STAMP TRAY'S TWO TABS (owner 2026-10-19, the WeChat sticker panel; contract §7 C).
   Tab 1 = the 36 (the sections above); tab 2 = my own photo stamps. The tab row exists only while
   the feature does (D10): the 0038 quota answered (my_stamp_quota, null = not run / offline /
   signed out) AND this binary has the Stamp Press. Otherwise "hidden": no row, today's tray.
   The custom tab lists my APPROVED stamps only (contract §9 Q3: pending ones live in Me and the
   album), newest first as my_custom_stamps answers them, each with its #topic in lower case
   under it; never a stranger's kept stamp (they aren't in my_custom_stamps at all). Empty = the
   dashed + and its line. Free at 3/3 (quota.why "quota") makes the + open the 3/3 card. */
export type TrayTab = "official" | "custom";
export type CustomTrayState = "hidden" | "empty" | "list";
export type CustomTrayItemVM = { id: string; topic: string; hex: string; a11yLabel: string };
export type CustomTrayVM = { state: CustomTrayState; items: CustomTrayItemVM[]; full: boolean };

const CUSTOM_STAMP_ID = /^c:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** "#topic" as a tile or a pill says it: lower case, no "#" doubled, "" for no topic. */
export function customTopicTag(topic: string): string {
  const s = topic.trim().replace(/^#+/, "");
  return s ? `#${s.toLowerCase()}` : "";
}

export function customTray(
  p: {
    /** my_stamp_quota's why, or null; `quota` null = the feature is hidden */
    quota: { why: "quota" | "cap" | "account" | null } | null;
    pressAvailable: boolean;
    stamps: readonly { id: string; status: string; topic: string; hex: string }[];
  },
  fmt: ComposeFormat,
): CustomTrayVM {
  if (!p.quota || !p.pressAvailable) return { state: "hidden", items: [], full: false };
  const seen = new Set<string>();
  const items: CustomTrayItemVM[] = [];
  for (const s of p.stamps) {
    if (s.status !== "approved" || !CUSTOM_STAMP_ID.test(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    const topic = customTopicTag(s.topic);
    items.push({ id: s.id, topic, hex: s.hex, a11yLabel: topic ? fmt.t("cs2.use.a11yStamp", { topic: topic.slice(1) }) : fmt.t("cs2.use.a11yBlank") });
  }
  return { state: items.length ? "list" : "empty", items, full: p.quota.why === "quota" };
}

/** The tab the tray opens on: the last one used (kindredly_tray_tab), official while there is no
    custom tab. */
export function trayTabFor(saved: unknown, state: CustomTrayState): TrayTab {
  return state !== "hidden" && saved === "custom" ? "custom" : "official";
}

/** Back from the Stamp Press opened from this page (contract §4.5): the stamp approved after the
    + was tapped, as the value a letter carries ("c:<uuid>"), or null. */
export function pressedReturn(pressed: { stamp: { id: string }; at: number } | null, openedAt: number | null): string | null {
  if (!pressed || openedAt === null || !(pressed.at > openedAt)) return null;
  const raw = pressed.stamp.id.toLowerCase();
  const id = raw.startsWith("c:") ? raw : `c:${raw}`;
  return CUSTOM_STAMP_ID.test(id) ? id : null;
}

/* THE PAPER STRIP (letter papers, 2026-10-20; contract §5.2, §5.6). All seven papers in the
   strip's order, every one pickable: a paper that can't go yet is still previewed on the page and
   the key says why (keyFor). Its badge: "1st" (gold) on every First Class paper, "lock" on
   Airmail while there is no first kindred, none otherwise; VoiceOver hears the same as a value.
   The head names the chosen paper in capitals, with "· FIRST CLASS" (gold) after a First Class
   one and "· FIRST KINDRED" (ind) after Airmail without a kindred. */
export type PaperItemVM = { id: string; name: string; badge: "" | "1st" | "lock"; a11yLabel: string; a11yValue: string };
export type PaperHeadVM = { title: string; tag: string; tagTone: "gold" | "ind" | "none" };

export function paperItems(p: { hasKindred: boolean; lang: string }, fmt: ComposeFormat): PaperItemVM[] {
  return PAPERS.map((paper) => {
    const name = fmt.t(paper.nameKey);
    const badge: PaperItemVM["badge"] = paper.tier === "first" ? "1st" : paper.tier === "kindred" && !p.hasKindred ? "lock" : "";
    return {
      id: paper.id,
      // swatches in lower case, the strip's quiet voice — except German, whose nouns keep their
      // capital (Luftpost, Kassenbon; owner, 2026-10-20: "as German readers expect")
      name: p.lang === "de" ? name : name.toLocaleLowerCase(p.lang),
      badge,
      a11yLabel: fmt.t("pp.a11y.paper", { name }),
      a11yValue: badge === "1st" ? fmt.t("pp.a11y.fc") : badge === "lock" ? fmt.t("pp.a11y.locked") : "",
    };
  });
}

export function paperHead(p: { paper: string; hasKindred: boolean; lang: string }, fmt: ComposeFormat): PaperHeadVM {
  const paper = paperOf(p.paper);
  const title = fmt.t("pp.strip.head", { name: fmt.t(paper.nameKey).toLocaleUpperCase(p.lang) });
  if (paper.tier === "first") return { title, tag: fmt.t("pp.strip.fc"), tagTone: "gold" };
  if (paper.tier === "kindred" && !p.hasKindred) return { title, tag: fmt.t("pp.strip.kindred"), tagTone: "ind" };
  return { title, tag: "", tagTone: "none" };
}
