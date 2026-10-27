/* Behaviour lock for the shared sheets' Swift feed (components/shared-sheets-model): the dims
   split as lib/theme writes them, the leave sheet's card kept to the same room as the React
   Native card, and the keys carried over field for field.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/components/shared-sheets-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { leaveSheetFrame, nativeLeaveKeys, reportCardHeight, REPORT_CARD_ROOM, rgbaParts, signUpBottomMargin } from "./shared-sheets-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

/* lib/theme scrimColor, copied (it lives beside React Native): the dims the sheets lay */
const scrimColor = (dark: boolean, a = 0.3): string => (dark ? `rgba(0,0,0,${Math.min(0.6, +(a + 0.15).toFixed(2))})` : `rgba(30,27,53,${a})`);

/* ── the dims ── */
{
  const light = rgbaParts(scrimColor(false, 0.3));
  ok("the light dim is the 10a navy at .3", light.hex === "#1E1B35" && light.alpha === 0.3);
  const dark = rgbaParts(scrimColor(true, 0.3));
  ok("Midnight's dim is black at .45", dark.hex === "#000000" && dark.alpha === 0.45);
  const signUp = rgbaParts("rgba(30,27,53,0.3)");
  ok("the sign-up sheet's fixed dim splits the same", signUp.hex === "#1E1B35" && signUp.alpha === 0.3);
  ok("a hex is itself at full strength", rgbaParts("#e0483c").hex === "#E0483C" && rgbaParts("#e0483c").alpha === 1);
  ok("spaces and rgb() are read", rgbaParts(" rgb( 1, 2, 255 ) ").hex === "#0102FF" && rgbaParts("rgb(1,2,255)").alpha === 1);
  ok("anything else is the 10a dim, never a crash", rgbaParts("navy").hex === "#1E1B35" && rgbaParts("").alpha === 0.3);
}

/* ── the leave sheet's card: LeaveSheet's own formulas ── */
{
  const RN = (winH: number, top: number, bottom: number, bottomExtra: number, modal: boolean) => ({
    maxHeight: winH - top - 12 - (modal ? 0 : bottomExtra),
    bottomMargin: Math.max(bottom - 26, 8) + (modal ? 0 : bottomExtra),
  });
  const cases: [number, number, number, number, boolean][] = [
    [852, 59, 34, 0, false],
    [852, 59, 34, 96, false],
    [852, 59, 34, 96, true],
    [667, 20, 0, 0, true],
    [667, 20, 0, 80, false],
  ];
  ok(
    "the same room as the React Native card, in a Modal or over a tab bar",
    cases.every(([winH, top, bottom, bottomExtra, modal]) => {
      const a = leaveSheetFrame({ winH, top, bottom, bottomExtra, modal });
      const b = RN(winH, top, bottom, bottomExtra, modal);
      return a.maxHeight === b.maxHeight && a.bottomMargin === b.bottomMargin;
    }),
  );
  ok("a Modal ignores the tab bar's room", leaveSheetFrame({ winH: 852, top: 59, bottom: 34, bottomExtra: 96, modal: true }).bottomMargin === 8);
  ok("the sign-up sheet's room is the Modal one", signUpBottomMargin(34) === 8 && signUpBottomMargin(0) === 8 && signUpBottomMargin(50) === 24);
}

/* ── the keys ── */
{
  const words = (s: string) => `w:${s}`;
  const keys = nativeLeaveKeys(
    [
      { label: "SAVE AS DRAFT", kind: "primary" },
      { label: "DISCARD", kind: "destructive", busy: true },
      { label: "日本語", kind: "quiet", lead: "🇯🇵", selected: true, accessibilityLabel: "日本語", accessibilityLanguage: "ja" },
    ],
    words,
  );
  ok("one key per action, in order", keys.length === 3 && keys[0].label === "w:SAVE AS DRAFT" && keys[1].label === "w:DISCARD");
  ok("blanks are filled", keys[0].lead === "" && keys[0].selected === false && keys[0].voiceLabel === "" && keys[0].voiceLanguage === "" && keys[0].busy === false);
  ok("busy carries", keys[1].busy === true && keys[1].kind === "destructive");
  ok("the language row keeps its flag, its own name and its voice", keys[2].lead === "🇯🇵" && keys[2].selected && keys[2].voiceLabel === "日本語" && keys[2].voiceLanguage === "ja");
}

/* ── the report card's Host ── */
{
  ok("the card is its Host less the room each side", reportCardHeight(200) === 200 - 2 * REPORT_CARD_ROOM);
  ok("a Host not laid out yet is no negative card", reportCardHeight(0) === 0);
}

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
console.log("all ok");
