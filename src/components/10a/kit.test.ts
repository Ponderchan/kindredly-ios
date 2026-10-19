/* Behaviour lock for the 10a React Native twins' recipes (components/10a/kit).
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/components/10a/kit.test.ts
   kit.ts imports theme/post the way Metro wants it (no extension), and the
   theme table is JSON, so a load hook adds ".ts" to an extensionless
   relative import and the JSON import attribute, in this process only.
   The stamp colours are read as text from data/stamps.ts (it imports i18n,
   which imports React Native). Every line prints ok/FAIL and the process
   exits non-zero if any fail. */

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
  load: (url, context, next) =>
    next(url, url.endsWith(".json") ? { ...context, importAttributes: { ...context.importAttributes, type: "json" } } : context),
});

const kit = await import("./kit.ts");
const { THEMES, THEME_KEYS } = await import("../../theme/themes.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

/* ── the sticker press ── */
ok("a pressed sticker goes down onto its shadow", kit.stickerPressOffset(3, true) === 3 && kit.stickerPressOffset(6, true) === 6);
ok("a pressed sticker without a shadow dips 1pt", kit.stickerPressOffset(0, true) === 1);
ok("at rest it doesn't move", kit.stickerPressOffset(4, false) === 0 && kit.stickerPressOffset(0, false) === 0);

/* ── the InkPanel variants (H:32, H:72) ── */
{
  const t = kit.INK_PANEL.today;
  const m = kit.INK_PANEL.me;
  ok("today: corners 28, 6/6, padding 18 20 14", t.radius === 28 && t.shadow === 6 && t.padding.top === 18 && t.padding.right === 20 && t.padding.bottom === 14 && t.padding.left === 20);
  ok("me: corners 24, 5/5, padding 16", m.radius === 24 && m.shadow === 5 && [m.padding.top, m.padding.right, m.padding.bottom, m.padding.left].every((p) => p === 16));
  ok("both: a 2.5 outline", t.border === 2.5 && m.border === 2.5);
}

/* ── the reply strip (H:124) ── */
ok("strip: 54 tall, corners 26, 2.5 outline, 4/4 shadow, padding 0 8 0 20", kit.REPLY_STRIP.minHeight === 54 && kit.REPLY_STRIP.radius === 26 && kit.REPLY_STRIP.border === 2.5 && kit.REPLY_STRIP.shadow === 4 && kit.REPLY_STRIP.padLeft === 20 && kit.REPLY_STRIP.padRight === 8);
ok("strip: the field is system 17", kit.REPLY_STRIP.fontSize === 17);
ok("one line sits centred in the resting height", kit.REPLY_FIELD_PAD * 2 + kit.REPLY_STRIP.lineHeight + kit.REPLY_STRIP.border * 2 === kit.REPLY_STRIP.minHeight);
ok("it grows to five lines", kit.REPLY_FIELD_MAX === 5 * kit.REPLY_STRIP.lineHeight + 2 * kit.REPLY_FIELD_PAD);

/* ── the send key (owner question 3's default) ── */
ok("the enabled key is the plane (owner question 3, recommended)", kit.SEND_STYLE === "plane");
ok("nothing written → disabled", kit.sendKeyState({ hasWords: false, canSend: false }) === "disabled");
ok("words the caller won't send yet (too short, in flight) → disabled", kit.sendKeyState({ hasWords: true, canSend: false }) === "disabled");
ok("words that can go → enabled", kit.sendKeyState({ hasWords: true, canSend: true }) === "enabled");
ok("ready words a full pouch holds → dimmed", kit.sendKeyState({ hasWords: true, canSend: true, held: true }) === "dimmed");
ok("held but nothing written → still disabled", kit.sendKeyState({ hasWords: false, canSend: true, held: true }) === "disabled");
ok("disabled takes no press; enabled and dimmed do", !kit.sendTakesPress("disabled") && kit.sendTakesPress("enabled") && kit.sendTakesPress("dimmed"));
ok("only a send that went clears the field", kit.sendClearsField("enabled") && !kit.sendClearsField("dimmed") && !kit.sendClearsField("disabled"));

/* ── contrast ── */
ok("black on white is 21:1", Math.abs(kit.contrastRatio("#000000", "#FFFFFF") - 21) < 0.01);
ok("a colour on itself is 1:1", kit.contrastRatio("#3A34D6", "#3A34D6") === 1);
ok("an unreadable colour is 1:1, not a throw", kit.contrastRatio("blue", "#FFFFFF") === 1 && kit.contrastRatio("#FFF", "#000000") === 1);

/* ── every theme ── */
const stamps = [...new Set([...readFileSync(new URL("../../data/stamps.ts", import.meta.url), "utf8").matchAll(/color: "(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]))];
ok("the stamp colours were found", stamps.length >= 36);

for (const key of THEME_KEYS) {
  const tk = THEMES[key];

  const n = kit.noticeColors(tk);
  ok(`${key}: the notice lies on lav`, n.ground === tk.lav);
  ok(`${key}: the notice's 14pt type clears 4.5:1`, kit.contrastRatio(n.ink, n.ground) >= 4.5);
  ok(`${key}: the notice's type is ind where ind can be read, else ink`, n.ink === (kit.contrastRatio(tk.ind, tk.lav) >= 4.5 ? tk.ind : tk.ink));

  const toast = kit.toastColors(tk);
  ok(`${key}: the toast is ink with the page colour on it, readable`, toast.fill === tk.ink && toast.text === tk.bg && kit.contrastRatio(toast.fill, toast.text) >= 4.5);

  for (const surface of ["sf", "bg", "soft2"] as const) {
    const bad = stamps.filter((c) => {
      const l = kit.topicTagLook(c, tk, tk[surface]);
      return l.fill !== c.toUpperCase() || l.text !== "#FFFFFF" || l.border !== tk.ln || l.shadow !== tk.ln || kit.contrastRatio(l.text, l.fill) < 3;
    });
    // the App Store tag: the stamp's colour solid, white words, ln outline and shadow (3:1 until
    // the palette pass lifts every hex to 4.5:1 against white)
    ok(`${key} ${surface}: every stamp's tag is its colour, solid, with white words${bad.length ? " (" + bad.join(" ") + ")" : ""}`, bad.length === 0);
  }
  ok(`${key}: a tag defaults to the card face`, JSON.stringify(kit.topicTagLook("#2E7D4F", tk)) === JSON.stringify(kit.topicTagLook("#2E7D4F", tk, tk.sf)));
  ok(`${key}: a stamp without a colour is the quiet grey, readable`, (() => { const l = kit.topicTagLook(null, tk); return l.fill === kit.TOPIC_TAG_NEUTRAL && kit.contrastRatio(l.text, l.fill) >= 4.5; })());

  const r = kit.rowStyleFor(tk);
  ok(`${key}: the row keeps the owner's sizes (52 face, gap 14, name 17/600, preview 15/20, badge 20)`, r.face === 52 && r.gap === 14 && r.name.fontSize === 17 && r.name.fontWeight === "600" && r.preview.fontSize === 15 && r.preview.lineHeight === 20 && r.badge.height === 20);
  ok(`${key}: the row sits 22 in (H:63-65)`, r.pad === 22 && r.row.paddingHorizontal === 22);
  ok(`${key}: row colours by role — name ink, preview sub, badge ind`, r.name.color === tk.ink && r.preview.color === tk.sub && r.badge.backgroundColor === tk.ind && r.badgeText.color === tk.bg);
  ok(`${key}: the time keeps its size — system 13, no mono — and is always mute`, r.time.color === tk.mute && r.time.fontSize === 13 && r.time.fontFamily === undefined && r.time.fontWeight === undefined);
  ok(`${key}: the hairline is line, the disc soft2, the row filled with the page`, r.hairline.borderBottomColor === tk.line && r.disc.backgroundColor === tk.soft2 && r.row.backgroundColor === tk.bg);
  ok(`${key}: the badge number reads on ind`, kit.contrastRatio(r.badgeText.color as string, r.badge.backgroundColor as string) >= 4.5);

  const [from, to] = kit.fadeColors(tk.bg);
  ok(`${key}: the fade starts from the page colour at nothing`, from === `${tk.bg}00` && to === tk.bg);
}

/* ── the rest ── */
ok("a topic tag is mono 11 (the 9/10/11 rule)", kit.TOPIC_TAG_SIZE === 11);
ok("translate: their language → yours", kit.translateCode("ES", "EN", false) === "ES→EN");
ok("translate: turned round once in yours", kit.translateCode("ES", "EN", true) === "EN←ES");
ok("the fade: 176 tall, solid from 42%", kit.BOTTOM_FADE.height === 176 && kit.BOTTOM_FADE.solidAt === 0.42);
ok("a fade into something that isn't #RRGGBB starts transparent", kit.fadeColors("rgb(1,2,3)")[0] === "transparent");
ok("badges: 1–9, then 9+", kit.badgeCount(1) === "1" && kit.badgeCount(9) === "9" && kit.badgeCount(10) === "9+" && kit.badgeCount(250) === "9+");

/* ── the notifications-off bar ── */
{
  const now = Date.UTC(2026, 9, 16);
  const day = 24 * 3600 * 1000;
  const base = { ready: true, closedAt: null, now, isGuest: false, perm: "ask" as const };
  ok("two weeks of quiet after ×", kit.NOTIFY_QUIET_MS === 14 * day);
  ok("off, signed in, never closed → shows", kit.notifyBannerShows(base));
  ok("refused (only Settings can turn them on) → shows too", kit.notifyBannerShows({ ...base, perm: "settings" }));
  ok("not before the closed-at has been read", !kit.notifyBannerShows({ ...base, ready: false }));
  ok("closed yesterday → stays away", !kit.notifyBannerShows({ ...base, closedAt: now - day }));
  ok("closed fifteen days ago → asks once more", kit.notifyBannerShows({ ...base, closedAt: now - 15 * day }));
  ok("never to a guest", !kit.notifyBannerShows({ ...base, isGuest: true }));
  ok("never when they already work", !kit.notifyBannerShows({ ...base, perm: "granted" }));
  ok("never when the permission couldn't be read", !kit.notifyBannerShows({ ...base, perm: null }));
  ok("the dev preview shows it whatever the phone says", kit.notifyBannerShows({ ...base, perm: "granted", isGuest: true, preview: true }));
  ok("…and × still closes the preview", !kit.notifyBannerShows({ ...base, perm: "granted", preview: true, closedAt: now - 1000 }));
}

/* ── the chat composers' bars and the + tray (2026-10-18) ── */
{
  const r = kit.REPLY_BAR;
  ok("reply bar: 54, corners 16, a 2 outline, a 2/2 shadow, padding 0 8 0 14, 6 apart", r.minHeight === 54 && r.radius === 16 && r.border === 2 && r.shadow === 2 && r.padRight === 8 && r.padLeft === 14 && r.gap === 6);
  ok("reply bar: one line centred in the resting height", kit.REPLY_BAR_PAD * 2 + r.lineHeight + 2 * r.border === r.minHeight);
  ok("reply bar: four lines at most, about 110 tall", kit.REPLY_BAR_MAX >= 105 && kit.REPLY_BAR_MAX <= 115);
  const k = kit.KINDRED_BAR;
  ok("kindreds bar: a 48 row, 26 icons on 44 targets, a 40 capsule", k.rowHeight === 48 && k.target === 44 && k.icon === 26 && k.capsule === 40);
  ok("kindreds bar: one line centred in the capsule", kit.KINDRED_BAR_PAD * 2 + k.lineHeight === k.capsule);
  ok("kindreds bar: grows to five lines", kit.KINDRED_BAR_MAX === 5 * k.lineHeight + 2 * kit.KINDRED_BAR_PAD);
  const c = THEMES.classic;
  const n = THEMES.midnight;
  ok("send disc: ink when it can send, #C9C6D6 when it can't, on the light themes", kit.sendDiscLook(c, "enabled").ground === c.ink && kit.sendDiscLook(c, "disabled").ground === "#C9C6D6");
  ok("send disc: the Kindreds bar's own fill", kit.sendDiscLook(c, "enabled", c.ind).ground === c.ind);
  ok("send disc: dimmed is the enabled disc at .35", kit.sendDiscLook(c, "dimmed").ground === c.ink && kit.sendDiscLook(c, "dimmed").opacity === 0.35);
  ok("send disc: Midnight's off is its faint, the plane its page", kit.sendDiscLook(n, "disabled").ground === n.faint && kit.sendDiscLook(n, "enabled").plane === n.bg);
  ok("open keys: ink, Midnight's lav", kit.openKeyFill(c) === c.ink && kit.openKeyFill(n) === n.lav);
  ok("the + tray: 270 over a 34 home inset, 250 with none", kit.playTrayHeight(34) === 270 && kit.playTrayHeight(0) === 250);
  ok("play cards: the mood fills on a light theme", kit.playCardFill(c, "calm") === "#DDEFD6" && kit.playCardFill(c, "happy") === "#F6E7C6");
  ok("play cards: Midnight mixes the mood's ink into sf, a dark tint", kit.contrastRatio(kit.playCardFill(n, "tired"), n.ink) >= 4.5 && kit.playCardFill(n, "tired") !== n.sf);
  ok("play cards: none is sf", kit.playCardFill(c, "none") === c.sf);
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
