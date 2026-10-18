/* The new onboarding's run (screens/onboarding/flow). Not wired to a runner; run by hand from the
   repo root with plain node (types stripped by Node itself; the hook below adds ".ts" to the app's
   extensionless imports):
     node src/screens/onboarding/flow.test.ts
   What it locks: the thirteen screens and four side states, the grounds and the pips, the 18+
   gate (no auto-pass, the wheel's current year reads as unanswered, the anonymous session made
   only when 3 passes, the block and the dropped session under 18), who walks which screens (the
   member who never finished starts on 2 and skips known answers and 11; 13 skipped when iOS
   already lets Kindredly knock), back and skip, resume after a kill (walked back to what still
   qualifies), the letter posted exactly once as 12 starts, and finish()'s payload (no pen name,
   both switches always booleans, never a mark for they). */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const F = await import("./flow.ts");
type ObCtx = import("./flow.ts").ObCtx;
type ObDraft = import("./flow.ts").ObDraft;
type Effect = import("./flow.ts").Effect;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const kinds = (fx: Effect[]) => fx.map((e) => e.kind).join(",");

// a fixed "now": 19 October 2026, noon
const NOW = new Date(2026, 9, 19, 12, 0, 0).getTime();
const TODAY = F.dayOf(new Date(NOW));
const ctx = (o: Partial<ObCtx> = {}): ObCtx => ({ ...F.NO_ONE, notif: "ask", ...o });
const draft = (o: Partial<ObDraft> = {}): ObDraft => ({ ...F.freshDraft(NOW), ...o });
const LETTER = "i keep rehearsing conversations i will never have";

/* ── the screens ── */
ok("thirteen screens, numbered 1–13", F.SCREENS.length === 13 && F.SCREEN_NO.doorstep === 1 && F.SCREEN_NO.envelope === 6 && F.SCREEN_NO.knock === 13);
ok("four side states on 1, 3, 8, 11", F.SIDE_HOME.signin === "doorstep" && F.SIDE_HOME.underage === "birthday" && F.SIDE_HOME.tray === "stamp" && F.SIDE_HOME.code === "address");
ok("labels: 6, 3x, 11a", F.labelOf("envelope") === "6" && F.labelOf("birthday", "underage") === "3x" && F.labelOf("address", "code") === "11a");
ok("screenFrom: by number and by name, junk null", F.screenFrom(7) === "letter" && F.screenFrom("7") === "letter" && F.screenFrom("hatch") === "hatch" && F.screenFrom(14) === null && F.screenFrom("x") === null);

/* ── the grounds ── */
ok("grounds: blue 1–6 and 8, paper 7, shell 10–13", ["doorstep", "egg", "birthday", "pronoun", "face", "envelope", "stamp"].every((s) => F.groundOf(s as any) === "blue") && F.groundOf("letter") === "paper" && ["name", "address", "flight", "knock"].every((s) => F.groundOf(s as any) === "shell"));
ok("9 is blue until the crack, then Shell", F.groundOf("hatch", { born: false }) === "blue" && F.groundOf("hatch", { born: true }) === "shell");
ok("status bar: light on blue, dark on paper and Shell", F.barOf("blue") === "light" && F.barOf("paper") === "dark" && F.barOf("shell") === "dark");

/* ── the egg ── */
ok("pips: 0 on 3, 1 on 4, 2 on 5, 3 on 6, 4 from 7", F.pipsLit("birthday") === 0 && F.pipsLit("pronoun") === 1 && F.pipsLit("face") === 2 && F.pipsLit("envelope") === 3 && F.pipsLit("letter") === 4 && F.pipsLit("stamp") === 4 && F.pipsLit("egg") === 0);
ok("egg places: hero on 2 and 9, nest on 3–6 and 8, flap on 7, none on 1 and 10+", F.eggPlace("egg") === "hero" && F.eggPlace("hatch") === "hero" && F.eggPlace("stamp") === "nest" && F.eggPlace("letter") === "flap" && F.eggPlace("doorstep") === null && F.eggPlace("name") === null);
ok("voice lines on 2–8 only", F.voiceKey("egg") === "ob2.voice.egg" && F.voiceKey("stamp") === "ob2.voice.stamp" && F.voiceKey("doorstep") === null && F.voiceKey("name") === null);

/* ── the gate ── */
ok("wheel starts on the current year", F.wheelYears(TODAY)[0] === 2026 && F.wheelYears(TODAY).length === F.WHEEL_YEARS);
ok("unanswered until a date", F.gate(null, TODAY) === "unanswered");
ok("the current year is the wheel not yet turned: unanswered (never a block)", F.gate({ y: 2026, m: 0, d: 1 }, TODAY) === "unanswered" && F.gate({ y: 2026, m: 11, d: 31 }, TODAY) === "unanswered");
ok("18 today is adult; 18 tomorrow is a minor", F.gate({ y: 2008, m: 9, d: 19 }, TODAY) === "adult" && F.gate({ y: 2008, m: 9, d: 20 }, TODAY) === "minor");
ok("a five-year-old is a minor", F.gate({ y: 2021, m: 3, d: 2 }, TODAY) === "minor");
ok("29 February: older on 1 March of a common year", F.ageOn({ y: 2004, m: 1, d: 29 }, { y: 2022, m: 1, d: 28 }) === 17 && F.ageOn({ y: 2004, m: 1, d: 29 }, { y: 2022, m: 2, d: 1 }) === 18);
ok("validDob: 31 April and 29 Feb 2023 are not days; 29 Feb 2024 is", !F.validDob({ y: 2000, m: 3, d: 31 }) && !F.validDob({ y: 2023, m: 1, d: 29 }) && F.validDob({ y: 2024, m: 1, d: 29 }));
ok("clampDob: 31 February → the month's last", F.clampDob({ y: 2023, m: 1, d: 31 }).d === 28 && F.clampDob({ y: 2024, m: 1, d: 31 }).d === 29);
ok("dob string round trip", F.dobString({ y: 1998, m: 5, d: 4 }) === "1998-06-04" && JSON.stringify(F.parseDob("1998-06-04")) === JSON.stringify({ y: 1998, m: 5, d: 4 }) && F.parseDob("1998-02-31") === null && F.parseDob("junk") === null);
ok("star sign from the wheel (m is 0-based)", F.signOf({ y: 2001, m: 5, d: 14 }) === "gemini" && F.signOf(null) === null);

{
  const at3 = draft({ screen: "birthday" });
  ok("3: key dim with no date", !F.canAdvance(at3, ctx(), TODAY) && F.advance(at3, ctx(), NOW).draft.screen === "birthday" && F.advance(at3, ctx(), NOW).effects.length === 0);
  const adult = draft({ screen: "birthday", dob: { y: 2001, m: 5, d: 14 } });
  const m = F.advance(adult, ctx(), NOW);
  ok("3 passes with no session: the anonymous session is made right then, then 4", kinds(m.effects) === "anon-session,track" && m.draft.screen === "pronoun" && m.draft.anonMade);
  const g = F.advance(adult, ctx({ account: "guest", uid: "u1" }), NOW);
  ok("3 passes with a session already: none made", !g.effects.some((e) => e.kind === "anon-session") && g.draft.screen === "pronoun");
  const minor = draft({ screen: "birthday", dob: { y: 2012, m: 1, d: 3 } });
  const n = F.advance(minor, ctx(), NOW);
  ok("under 18: 3x, the block remembered, no session made", n.side === "underage" && kinds(n.effects) === "remember-block" && n.draft.screen === "birthday");
  const back3 = F.advance({ ...minor, anonMade: true }, ctx({ account: "guest", uid: "u1" }), NOW);
  ok("a passed gate re-answered under 18: the block, and the guest session dropped", back3.side === "underage" && kinds(back3.effects) === "remember-block,drop-session" && !back3.draft.anonMade);
  ok("a blocked device never moves on", F.advance(adult, ctx({ blocked: true }), NOW).side === "underage" && F.back(adult, ctx({ blocked: true }), NOW) === null);
}

/* ── who walks what ── */
{
  const all = F.pathFor(ctx(), TODAY);
  ok("a newcomer walks all thirteen", all.length === 13 && all[0] === "doorstep");
  ok("13 is skipped when iOS already lets Kindredly knock", !F.pathFor(ctx({ notif: "granted" }), TODAY).includes("knock"));
  const mem = ctx({ account: "member", uid: "m1", known: { dob: "1990-03-02", pronoun: "he" } });
  const mp = F.pathFor(mem, TODAY);
  ok("a member who never finished: from 2, skipping known answers (3, 4) and 11", mp[0] === "egg" && !mp.includes("doorstep") && !mp.includes("birthday") && !mp.includes("pronoun") && mp.includes("face") && !mp.includes("address"));
  const memMinor = ctx({ account: "member", uid: "m1", known: { dob: "2013-03-02" } });
  ok("a member's known birthday under 18 doesn't skip 3", F.pathFor(memMinor, TODAY).includes("birthday"));
}

/* ── entering ── */
{
  const e = F.enter(ctx(), null, NOW);
  ok("a newcomer lands on 1", e.draft.screen === "doorstep" && !e.leave && kinds(e.effects) === "track");
  const om = F.enter(ctx({ account: "member", uid: "m", onboarded: true }), null, NOW);
  ok("an onboarded member goes straight to Today — no first-arrival flags", om.leave && kinds(om.effects) === "today");
  ok("a guest who finished on this phone goes straight to Today", kinds(F.enter(ctx({ account: "guest", uid: "g", onboarded: true }), null, NOW).effects) === "today");
  ok("a stale onboarded flag without a session is ignored", !F.enter(ctx({ account: "none", onboarded: true }), null, NOW).leave);
  const b = F.enter(ctx({ blocked: true }), null, NOW);
  ok("a blocked device lands on 3x", b.draft.screen === "birthday" && b.side === "underage" && !b.leave);
  const mem = F.enter(ctx({ account: "member", uid: "m1", known: { dob: "1990-03-02", pronoun: "he", avatarId: "f3" } }), null, NOW);
  ok("a member who never finished starts on 2 with the known answers filled", mem.draft.screen === "egg" && mem.draft.pronoun === "he" && mem.draft.avatarId === "f3" && mem.draft.dob?.y === 1990 && mem.draft.uid === "m1");
  const stale = F.enter(ctx({ account: "member", uid: "m1", known: { dob: "1990-03-02", pronoun: "he" } }), draft({ screen: "face", dob: { y: 2001, m: 0, d: 1 }, pronoun: "she" }), NOW);
  ok("a member's known answers win over a draft from before the sign-in (their screens are skipped)", stale.draft.dob?.y === 1990 && stale.draft.pronoun === "he");
  const memMinor = F.enter(ctx({ account: "member", uid: "m1", known: { dob: "2013-03-02" } }), null, NOW);
  ok("a member whose account says under 18: 3x and the block", memMinor.side === "underage" && kinds(memMinor.effects) === "remember-block");
}

/* ── resume after a kill ── */
{
  const guest = ctx({ account: "guest", uid: "g1" });
  const adultDob = { y: 2000, m: 1, d: 2 };
  const r6 = F.enter(guest, draft({ screen: "envelope", dob: adultDob, uid: "g1", pronoun: "she" }), NOW);
  ok("resumes on the same screen with the answers", r6.draft.screen === "envelope" && r6.draft.pronoun === "she");
  ok("the letter draft is kept", F.enter(guest, draft({ screen: "letter", dob: adultDob, uid: "g1", letter: "half a thought" }), NOW).draft.letter === "half a thought");
  ok("past the gate with no session: back to 3 (Next makes it again)", F.enter(ctx(), draft({ screen: "face", dob: adultDob }), NOW).draft.screen === "birthday");
  ok("past the letter with a short letter: back to 7", F.enter(guest, draft({ screen: "stamp", dob: adultDob, uid: "g1", letter: "too short" }), NOW).draft.screen === "letter");
  ok("past the hatch without a hatch: back to 9", F.enter(guest, draft({ screen: "name", dob: adultDob, uid: "g1", letter: LETTER }), NOW).draft.screen === "hatch");
  const fl = F.enter(guest, draft({ screen: "flight", dob: adultDob, uid: "g1", letter: LETTER, born: true, wrenName: "Otis", address: "guest" }), NOW);
  ok("killed on 12 before it posted: 12 again, and it posts now", fl.draft.screen === "flight" && fl.draft.posted && kinds(fl.effects) === "post,track");
  const fl2 = F.enter(guest, draft({ screen: "flight", dob: adultDob, uid: "g1", letter: LETTER, born: true, posted: true }), NOW);
  ok("killed on 12 after it posted: 13, never a second post", fl2.draft.screen === "knock" && !fl2.effects.some((e) => e.kind === "post"));
  const k13 = F.enter(ctx({ account: "guest", uid: "g1", onboarded: true }), draft({ screen: "knock", uid: "g1", dob: adultDob, letter: LETTER, born: true, posted: true }), NOW);
  ok("killed on 13 after finish() marked the account onboarded: back on 13, not straight to Today", k13.draft.screen === "knock" && !k13.leave);
  const k13g = F.enter(ctx({ account: "guest", uid: "g1", onboarded: true, notif: "granted" }), draft({ screen: "knock", uid: "g1", dob: adultDob, letter: LETTER, born: true, posted: true }), NOW);
  ok("…and with knocks already allowed: the first arrival (arrive), not a plain Today", kinds(k13g.effects) === "arrive");
  ok("posted, and iOS already allows knocks: Today", F.enter(ctx({ account: "guest", uid: "g1", notif: "granted" }), draft({ screen: "flight", dob: adultDob, letter: LETTER, born: true, posted: true }), NOW).leave);
  const mem = ctx({ account: "member", uid: "g1" });
  const a = F.enter(mem, draft({ screen: "address", dob: adultDob, uid: "g1", letter: LETTER, born: true, wrenName: "Otis" }), NOW);
  ok("on 11 but the account arrived (linked, then killed): straight to 12, which posts", a.draft.screen === "flight" && a.effects.some((e) => e.kind === "post"));
  ok("a draft made under another account is dropped", F.enter(ctx({ account: "guest", uid: "g2" }), draft({ screen: "face", dob: adultDob, uid: "g1" }), NOW).draft.screen === "doorstep");
  const gone = F.enter(ctx(), draft({ screen: "flight", dob: adultDob, uid: "m1", letter: LETTER, born: true, posted: true }), NOW);
  ok("a member's posted draft left behind (killed mid-flight, then signed out): the next person starts fresh, never on its 13", gone.draft.screen === "doorstep" && !gone.draft.posted && gone.draft.letter === "" && !gone.effects.some((e) => e.kind === "arrive" || e.kind === "post"));
}

/* ── keys: advance, skip, back ── */
{
  const g = ctx({ account: "guest", uid: "g1" });
  ok("1 → 2 → 3", F.advance(draft(), ctx(), NOW).draft.screen === "egg" && F.advance(draft({ screen: "egg" }), ctx(), NOW).draft.screen === "birthday");
  ok("4: dim until a pronoun, one tap moves on", !F.canAdvance(draft({ screen: "pronoun" }), g, TODAY) && F.advance(draft({ screen: "pronoun", pronoun: "she" }), g, NOW).draft.screen === "face");
  const s4 = F.skip(draft({ screen: "pronoun" }), g, NOW);
  ok("4 skip: they, and on to 5", s4.draft.pronoun === "they" && s4.draft.pronounSkipped && s4.draft.screen === "face");
  const s5 = F.skip(draft({ screen: "face", avatarId: "x" }), g, NOW);
  ok("5 Later: no face, on to 6", s5.draft.avatarId === null && s5.draft.faceLater && s5.draft.screen === "envelope");
  ok("6: waits for the session (the courier name needs a uid)", !F.canAdvance(draft({ screen: "envelope" }), ctx(), TODAY) && F.canAdvance(draft({ screen: "envelope" }), g, TODAY));
  ok("7: dim at 19 weighted characters, on at 20", !F.canAdvance(draft({ screen: "letter", letter: "abcdefghijklmnopqrs" }), g, TODAY) && F.canAdvance(draft({ screen: "letter", letter: "abcdefghijklmnopqrst" }), g, TODAY));
  ok("lettersLeft counts down to 0", F.lettersLeft("abc") === 17 && F.lettersLeft(LETTER) === 0 && F.letterReady(LETTER));
  ok("10: Wren is reserved", !F.canAdvance(draft({ screen: "name", wrenName: "wren " }), g, TODAY) && F.canAdvance(draft({ screen: "name", wrenName: "Otis" }), g, TODAY));
  const n10 = F.advance(draft({ screen: "name", wrenName: "Otis", letter: LETTER, born: true }), g, NOW);
  ok("10 → 11 for a guest", n10.draft.screen === "address" && !n10.draft.posted);
  const n10m = F.advance(draft({ screen: "name", wrenName: "Otis", letter: LETTER, born: true }), ctx({ account: "member", uid: "m" }), NOW);
  ok("10 → 12 for a member, and it posts as it arrives", n10m.draft.screen === "flight" && n10m.draft.posted && kinds(n10m.effects) === "post,track");
  const s11 = F.skip(draft({ screen: "address", letter: LETTER, born: true }), g, NOW);
  ok("11 Not now: the guest, the terms agreed, 12 posts", s11.draft.address === "guest" && s11.draft.termsAt === NOW && s11.draft.screen === "flight" && kinds(s11.effects) === "post,track");
  const ad = F.addressDone(draft({ screen: "address", letter: LETTER, born: true }), "google", ctx({ account: "member", uid: "g1" }), NOW);
  ok("11 linked: on to 12 with the terms agreed, one post", ad.draft.address === "google" && ad.draft.termsAt === NOW && ad.draft.screen === "flight" && ad.effects.filter((e) => e.kind === "post").length === 1);
  ok("…and arriving on 12 again never posts twice", !F.addressDone(ad.draft, "google", ctx({ account: "member", uid: "g1" }), NOW).effects.some((e) => e.kind === "post"));
  const f12 = F.advance(ad.draft, ctx({ account: "member", uid: "g1" }), NOW);
  ok("12 lands → 13", f12.draft.screen === "knock");
  const yes = F.advance({ ...f12.draft, knock: "yes" }, ctx({ account: "member", uid: "g1", notif: "ask" }), NOW);
  ok("13 Yes: iOS's prompt, then Today", kinds(yes.effects) === "ask-notifications,arrive" && yes.leave);
  const yesS = F.advance({ ...f12.draft, knock: "yes" }, ctx({ account: "member", uid: "g1", notif: "settings" }), NOW);
  ok("13 Yes after a refusal: Kindredly's notification settings, then Today", kinds(yesS.effects) === "open-notification-settings,arrive");
  const plain = F.advance(f12.draft, ctx({ account: "member", uid: "g1", notif: "ask" }), NOW);
  ok("13's primary key is the yes (never dim): advance() alone asks iOS", F.canAdvance(f12.draft, ctx(), TODAY) && plain.draft.knock === "yes" && kinds(plain.effects) === "ask-notifications,arrive");
  const no = F.skip(f12.draft, ctx({ account: "member", uid: "g1" }), NOW);
  ok("13 Not now: nothing asked of iOS, Today", kinds(no.effects) === "arrive" && no.draft.knock === "no");
  ok("12 lands when iOS already allows knocks: straight to Today", F.advance(ad.draft, ctx({ account: "member", uid: "g1", notif: "granted" }), NOW).leave);
  ok("12's tap only skips the animation", F.skip(ad.draft, g, NOW).effects.length === 0 && F.skip(ad.draft, g, NOW).draft.screen === "flight");

  ok("back: 2 → 1, 6 → 5, 8 → 7", F.back(draft({ screen: "egg" }), ctx(), NOW)?.draft.screen === "doorstep" && F.back(draft({ screen: "envelope" }), g, NOW)?.draft.screen === "face" && F.back(draft({ screen: "stamp" }), g, NOW)?.draft.screen === "letter");
  ok("no back on 1 or from 9 on", F.back(draft(), ctx(), NOW) === null && ["hatch", "name", "address", "flight", "knock"].every((s) => F.back(draft({ screen: s as any }), g, NOW) === null));
  const mem = ctx({ account: "member", uid: "m", known: { dob: "1990-01-01" } });
  ok("a member's back stops at their first screen, and skips known ones", F.back(draft({ screen: "egg" }), mem, NOW) === null && F.back(draft({ screen: "pronoun" }), mem, NOW)?.draft.screen === "egg");
  ok("back keeps every answer", F.back(draft({ screen: "letter", letter: "kept", pronoun: "he" }), g, NOW)?.draft.letter === "kept");
}

/* ── signing in on 1a ── */
{
  ok("1a, an onboarded account: Today, without the first-arrival flags", kinds(F.signedIn(draft(), ctx({ account: "member", uid: "m", onboarded: true }), NOW).effects) === "today");
  const s = F.signedIn(draft(), ctx({ account: "member", uid: "m", known: { dob: "1991-07-07" } }), NOW);
  ok("1a, an account that never finished: 2, its birthday filled (3 will be skipped)", s.draft.screen === "egg" && s.draft.dob?.y === 1991 && s.draft.uid === "m" && !F.pathFor(ctx({ account: "member", uid: "m", known: { dob: "1991-07-07" } }), TODAY).includes("birthday"));
}

/* ── finish() ── */
{
  const d = draft({ screen: "flight", dob: { y: 1999, m: 4, d: 9 }, pronoun: "she", avatarId: "f2", letter: "  " + LETTER + " ", wrenName: " Otis ", wrenPronoun: "he", shell: 2, address: "guest" });
  const p = F.finishPayload(d, ctx({ account: "guest", uid: "g" }), { lang: "de", suggestedStamp: "almost-texted" });
  ok("payload: profile with dob, pronoun, both switches on by default for she", p.profile.dob === "1999-05-09" && p.profile.pronoun === "she" && p.profile.showMark === true && p.profile.showSign === true && p.profile.avatarId === "f2");
  ok("payload: NO pen name anywhere", !("handle" in p.profile) && !JSON.stringify(p).includes("handle") && !JSON.stringify(p).includes("penName"));
  ok("payload: the bird (shell, trimmed name, pronoun)", p.wren?.shell === 2 && p.wren?.name === "Otis" && p.wren?.pronoun === "he" && p.mode === "new");
  ok("payload: the letter trimmed, the suggested stamp, the language", p.letter?.text === LETTER && p.letter?.stamp === "almost-texted" && p.letter?.lang === "de" && p.profile.firstLine === LETTER);
  ok("payload: a picked stamp wins", F.finishPayload({ ...d, stamp: "cant-sleep" }, ctx(), { lang: "en", suggestedStamp: "x" }).letter?.stamp === "cant-sleep");
  const they = F.finishPayload({ ...d, pronoun: "they", showMark: true }, ctx(), { lang: "en", suggestedStamp: "x" });
  ok("payload: never a mark for they", they.profile.showMark === false && they.profile.pronoun === "they");
  ok("payload: a skipped pronoun saves they", F.finishPayload({ ...d, pronoun: null }, ctx(), { lang: "en", suggestedStamp: "x" }).profile.pronoun === "they");
  ok("payload: switches turned off stay off", (() => {
    const q = F.finishPayload({ ...d, showMark: false, showSign: false }, ctx(), { lang: "en", suggestedStamp: "x" });
    return q.profile.showMark === false && q.profile.showSign === false;
  })());
  ok("payload: a short letter never posts", F.finishPayload({ ...d, letter: "short" }, ctx(), { lang: "en", suggestedStamp: "x" }).letter === null);
  const sw = F.finishPayload({ ...d, address: "switched" }, ctx({ account: "member", uid: "m", onboarded: true, known: { dob: "1980-01-01", pronoun: "he", showMark: false } }), { lang: "en", suggestedStamp: "x" });
  ok("payload: switched to an onboarded account — its answers and its bird stay; the letter comes along", sw.mode === "switched" && sw.wren === null && sw.profile.dob === "1980-01-01" && sw.profile.pronoun === "he" && sw.profile.showMark === false && sw.letter?.text === LETTER);
  const swNew = F.finishPayload({ ...d, address: "switched" }, ctx({ account: "member", uid: "m", onboarded: false }), { lang: "en", suggestedStamp: "x" });
  ok("payload: switched to an account that never finished — this run's bird and answers", swNew.wren?.name === "Otis" && swNew.profile.pronoun === "she");
}

/* ── what is collected where; the draft on disk ── */
ok("COLLECTS names every screen, and only draft fields", F.SCREENS.every((s) => Array.isArray(F.COLLECTS[s])) && Object.values(F.COLLECTS).flat().every((k) => k in F.freshDraft(0)));
ok("the draft has no pen name field", !Object.keys(F.freshDraft(0)).some((k) => /handle|pen/i.test(k)));
{
  const d = draft({ screen: "stamp", dob: { y: 2000, m: 2, d: 3 }, letter: LETTER, stamp: "growing", showSign: false, knock: null });
  const back = F.parseDraft(F.serializeDraft(d));
  ok("draft round trip", JSON.stringify(back) === JSON.stringify(d));
  ok("junk and other versions are dropped", F.parseDraft("{") === null && F.parseDraft(JSON.stringify({ ...d, v: 2 })) === null && F.parseDraft(JSON.stringify({ ...d, screen: "nope" })) === null && F.parseDraft(null) === null);
  const bad = F.parseDraft(JSON.stringify({ ...d, shell: 9, dob: { y: 2000, m: 1, d: 31 }, pronoun: "it", knock: "maybe", address: "fax" }));
  ok("bad fields fall back one by one", !!bad && bad.shell === 0 && bad.dob === null && bad.pronoun === null && bad.knock === null && bad.address === null && bad.letter === LETTER);
}

if (fails) {
  console.log(`\n${fails} failing`);
  process.exit(1);
}
console.log("\nall passing");
