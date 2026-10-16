import { t, getLang, type Lang } from "./i18n";
import { hashStr } from "./mosaic";

/** A t()-shaped function. The date and name helpers below take one (and a
    locale) as optional parameters, so a pure builder can hand them its own
    and a node test never has to load i18n. */
export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** BCP 47 tag per app language — what every date here is formatted in. */
export const LOCALE_TAGS: Record<Lang, string> = { en: "en-US", es: "es-ES", pt: "pt-BR", id: "id-ID", fr: "fr-FR", de: "de-DE", it: "it-IT", ja: "ja-JP", ko: "ko-KR" };

/* dates format in the reader's locale, so JUL 29 becomes 29 de jul. / 29 jul */
export const localeTag = (): string => LOCALE_TAGS[getLang()] || "en-US";
const LOCALE = localeTag;
/* Small pure formatters + deterministic identity helpers.
   shade/dLong/dShort/today ported from kindredly-v20.jsx; hashStr/postNo/
   avatarFor ported from the web system.js so anonymous "correspondent
   numbers" and glyph avatars match the web byte-for-byte. */

/** shift an #rrggbb hex by ±d per channel → "rgb(r,g,b)" (v20 shade). */
export function shade(hex: string, d: number): string {
  const h = hex.replace("#", "");
  const v = (i: number) =>
    Math.max(0, Math.min(255, parseInt(h.substr(i, 2), 16) + d));
  return `rgb(${v(0)},${v(2)},${v(4)})`;
}

export const dLong = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(LOCALE(), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const dShort = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(LOCALE(), { month: "short", day: "numeric" });
/* the postmark on a letter: the short date squeezed the way a rubber stamp
   would — SEP.19, 19.SEPT, 19.SET. Latin locales pad with spaces and dots
   in their own ways ("19. Sept.", "19 de set."), so collapse all of it to
   one dot and drop the Portuguese "de"; CJK dates ("9月19日", "9월 19일")
   are already a stamp and are left alone. */
export const postmark = (d: string | number | Date): string => {
  const s = dShort(d).toUpperCase();
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(s)) return s;
  return s.replace(/\.?\s+/g, ".").replace(/\.DE\./, ".").replace(/\.$/, "");
};

export const today = () => new Date().toISOString().slice(0, 10);

/** seconds → m:ss (v20 calls fmt() for voice/video durations but never defines it). */
export function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/* ── deterministic identity (web system.js parity) ── */

/* How long ago a letter was written. The product's texture is slowness, so
   this is deliberately coarse — nobody needs "3h 41m", and a letter written
   at 2am reads differently from one written at noon whatever the gap. */
/* a list's time (Kindreds, 2026-10-10): today the clock, before that the day —
   short in every language, so the line beside it keeps its words */
export function listWhen(at: string | number | Date): string {
  const d = new Date(at);
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit", hour12: false });
  return dShort(d);
}

export function sinceShort(iso: string | number | Date): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2) return t("fmt.justNow");
  if (min < 60) return t("fmt.minAgo", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? t("fmt.hourAgo") : t("fmt.hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("fmt.yesterday") : t("fmt.daysAgo", { n: d });
}

/* The one 32-bit FNV-1a every identity derives from. It lives with FACE v1
   in lib/mosaic (pure, so node can lock it); re-exported here for the
   callers that have always imported it from format. Never fork it. */
export { hashStr };

/** stable anonymous "No. 1000–9999" from a user id (shown before reveal). */
export function postNo(uid: string | null | undefined): number {
  return 1000 + (hashStr("post:" + (uid || "")) % 9000);
}

/* A PEN PAL'S NAME, BEFORE THEY HAVE ONE. "No. 4481" was typed out in
   English in seven places (chat, the reader, Kindreds, Wren's home, the
   flight log…) while a translated "No." already existed (pw.stub.no:
   N.º, N°, Nr.). This is the one place it is built now. */
/**
 * A pen pal's anonymous name from their user id: "No. 4481" (en), "N.º 4481" (es/pt),
 * "N° 4481" (fr), "Nr. 4481" (de). A null id is a deleted account, which has no
 * number: it reads t("ld.unsigned") instead.
 * @param opts.upper   upper-case for mono labels ("NO. 4481")
 * @param opts.compact no space, the postmark style ("No.4481"; with upper, "NO.4481")
 * @param opts.t       the caller's t (a pure builder's); defaults to i18n t
 * @param opts.locale  the locale for upper-casing; defaults to the reader's
 */
export function penPalName(other: string | null | undefined, opts: { upper?: boolean; compact?: boolean; t?: TFn; locale?: string } = {}): string {
  const tr = opts.t ?? t;
  if (!other) return tr("ld.unsigned");
  const s = tr("pw.stub.no") + (opts.compact ? "" : " ") + postNo(other);
  return opts.upper ? s.toLocaleUpperCase(opts.locale ?? localeTag()) : s;
}

/* ── step 5 date labels ─────────────────────────────────────────────────
   Every date a SwiftUI screen shows is formatted here, in TS, so Swift
   never formats a date and no screen hardcodes "en-US". Each takes an
   optional locale (default: the reader's language) so a pure builder can
   pass the one it was given. */

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/; // kana, CJK ideographs, hangul — the same test postmark() uses

/**
 * A day as a label: the locale's own short date, upper-cased, in the locale's
 * own order — "OCT 14" (en), "14 OCT" (es), "14 DE OUT." (pt), "14 OCT." (fr),
 * "14. OKT." (de), "14 OTT" (it), "14 OKT" (id); ja/ko keep their dShort
 * ("10月14日", "10월 14일"). With year: "OCT 14, 2026", "2026年10月14日".
 * Used for note cards, chat day rules, joined/used-on dates.
 */
export function noteDay(d: string | number | Date, opts: { locale?: string; year?: boolean } = {}): string {
  const locale = opts.locale ?? localeTag();
  const s = new Date(d).toLocaleDateString(locale, opts.year ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
  return CJK.test(s) ? s : s.toLocaleUpperCase(locale);
}

/** A clock time, 24-hour, in the locale's own separator: "14:05", id "14.05". Midnight is "00:05", never "24:05". */
export function time24(d: string | number | Date, opts: { locale?: string } = {}): string {
  const s = new Date(d).toLocaleTimeString(opts.locale ?? localeTag(), { hour: "2-digit", minute: "2-digit", hour12: false });
  return s.replace(/^24(?=\D)/, "00");
}

/**
 * A clock time in the reader's own clock: en "8:00 AM", de "8:00", ja "8:00", ko "오전 8:00",
 * id "8.00". Unlike time24 it keeps the locale's 12- or 24-hour habit, so a line like
 * "I'm back at {t}" reads the way the reader's phone tells the time.
 */
export function clockTime(d: string | number | Date, opts: { locale?: string } = {}): string {
  return new Date(d).toLocaleTimeString(opts.locale ?? localeTag(), { hour: "numeric", minute: "2-digit" });
}

/**
 * A calendar month's title in the locale's own order: "OCTOBER 2026", "OCTUBRE DE 2026",
 * "2026年10月", "2026년 10월". Upper-cased unless opts.upper is false (CJK has no case).
 */
export function monthTitle(d: string | number | Date, opts: { locale?: string; upper?: boolean } = {}): string {
  const locale = opts.locale ?? localeTag();
  const s = new Date(d).toLocaleDateString(locale, { month: "long", year: "numeric" });
  return opts.upper === false ? s : s.toLocaleUpperCase(locale);
}

/* WHICH DAY A WEEK STARTS ON (owner question 11, built with the default):
   Monday where the reader's calendars start on Monday, Sunday elsewhere.
   One table, so the owner's answer is a one-line change. */
/** 0 = Sunday, 1 = Monday — the first column of a calendar, per app language. */
export const FIRST_WEEKDAY: Record<Lang, 0 | 1> = { en: 0, pt: 0, ja: 0, ko: 0, id: 0, de: 1, fr: 1, es: 1, it: 1 };

/** The first weekday for a language (default: the reader's). */
export const firstWeekday = (lang: Lang = getLang()): 0 | 1 => FIRST_WEEKDAY[lang] ?? 0;

/**
 * The seven narrow weekday letters for a calendar header, starting at `firstDay`
 * (0 = Sunday, 1 = Monday): en "S M T W T F S", de from Monday "M D M D F S S",
 * ja "日 月 火 …". Upper-cased in the locale.
 */
export function weekdayLetters(firstDay: number = firstWeekday(), opts: { locale?: string } = {}): string[] {
  const locale = opts.locale ?? localeTag();
  const start = ((Math.trunc(firstDay) % 7) + 7) % 7;
  // 2023-01-01 was a Sunday; local noon keeps every zone on the same date
  return Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((start + i) % 7), 12).toLocaleDateString(locale, { weekday: "narrow" }).toLocaleUpperCase(locale));
}

/* 12 abstract glyph avatars × 8 palettes = 96 stable identities (system.js). */
export const AVATAR_GLYPHS = [
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.6"/>',
  '<path d="M4 10c2.5-2.6 5 2.6 7.5 0s5-2.6 7.5 0"/><path d="M4 15c2.5-2.6 5 2.6 7.5 0s5-2.6 7.5 0"/>',
  '<path d="M12 3l2.4 5.8L21 9.4l-4.6 3.8L17.6 20 12 16.5 6.4 20l1.2-6.8L3 9.4l6.6-.6z"/>',
  '<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/>',
  '<path d="M20 13.5A7.5 7.5 0 1 1 10.5 4a5.8 5.8 0 0 0 9.5 9.5z"/>',
  '<circle cx="7" cy="7" r="1.6"/><circle cx="12" cy="7" r="1.6"/><circle cx="17" cy="7" r="1.6"/><circle cx="7" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="17" cy="12" r="1.6"/><circle cx="7" cy="17" r="1.6"/><circle cx="12" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
  '<path d="M12 21c-4-3-7-6-7-10a7 7 0 0 1 14 0c0 4-3 7-7 10z"/><circle cx="12" cy="11" r="2.2"/>',
  '<path d="M4 18l5-7 3.5 4.5L15 12l5 6z"/><circle cx="8" cy="7" r="1.6"/>',
  '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 8l8 6 8-6"/>',
  '<path d="M13 2L5 13h5l-1 9 8-12h-5z"/>',
  '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16" opacity=".6"/>',
  '<path d="M12 3c3 4 3 8 0 10s-3 6 0 8" /><path d="M8 8h8M8 16h8" opacity=".5"/>',
];
export const AVATAR_COLORS = [
  { fg: "#3A3AF5", bg: "#E6E6FB" },
  { fg: "#4E8641", bg: "#E3EFDF" },
  { fg: "#C86E7A", bg: "#F5E2E5" },
  { fg: "#D69A55", bg: "#F5E7D2" },
  { fg: "#A98CD9", bg: "#ECE4F6" },
  { fg: "#2E7BAA", bg: "#DCEAF3" },
  { fg: "#C6A21E", bg: "#F4EAC4" },
  { fg: "#4E5468", bg: "#E1E3E9" },
];
export function avatarFor(seed: string) {
  const h = hashStr("av:" + String(seed));
  const glyph = AVATAR_GLYPHS[h % AVATAR_GLYPHS.length];
  const col =
    AVATAR_COLORS[Math.floor(h / AVATAR_GLYPHS.length) % AVATAR_COLORS.length];
  return { glyph, fg: col.fg, bg: col.bg };
}

/* The cakeday wheel's twelve months. Derived from the reader's locale rather
   than kept as four hand-written arrays — Intl already knows every month name
   in every language we ship, and a hardcoded English list is exactly the kind
   of stale copy that survives a localization sweep unnoticed. The trailing
   period some locales add ("jan.") is dropped; the wheel sets its own case. */
export const monthsShort = (): string[] =>
  Array.from({ length: 12 }, (_, i) => {
    const m = new Date(2000, i, 1).toLocaleString(localeTag(), { month: "short" }).replace(/\.$/, "");
    return m.charAt(0).toUpperCase() + m.slice(1);
  });
