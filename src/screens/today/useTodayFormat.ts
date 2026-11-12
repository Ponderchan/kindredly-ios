import { useMemo } from "react";
import { hasString, t, useLang } from "../../lib/i18n";
import { clockTime, fmt as clock, penPalName, postNo, postmark } from "../../lib/format";
import { useWhoBook } from "../../lib/who";
import type { WhoBook } from "../../lib/stranger-who";
import { getStamp, sname } from "../../data/stamps";
import { isCustomStampId, lookOf, tagOf, useCustomStamps } from "../../lib/custom-stamps";
import { stickerName } from "../../lib/sticker-copy";
import type { TodayFormat } from "./today-cards";

/* HOW A DESK LETTER IS NAMED AND DATED, for today-cards' builders: the words, the dates, who the
   writers are (lib/who: the identity switch, the courier names, the frost, the star sign) and
   what each stamp is called. Today's desk reads it (useTodayDesk), and so does the Kindreds tab's
   empty page, whose drifting lines are the same letters (screens/kindreds/useCatchDesk): one
   place decides how a letter's header reads, so a line caught there is the card met on Today.

   `letters` are the ones about to be drawn: their writers' marks are asked for once and drawn
   when they land, and their photo stamps ("c:<uuid>", lib/custom-stamps) resolved before the
   cards are built (the format changes when they do, so the cards are rebuilt). */
export function useTodayFormat(letters: readonly { author: string | null; stamp: string }[]): { fmt: TodayFormat; who: WhoBook } {
  const lang = useLang(); // the words and the dates follow the reader's language
  const authors = useMemo(() => letters.map((l) => l.author), [letters]);
  const who = useWhoBook({ uids: authors });
  const customStamp = useCustomStamps(useMemo(() => letters.map((l) => l.stamp), [letters]));
  const fmt = useMemo<TodayFormat>(
    () => ({
      t,
      has: hasString,
      postmark: (iso) => postmark(iso),
      postNo: (uid) => postNo(uid),
      penPal: (uid, o) => penPalName(uid, { upper: o.upper, compact: o.compact }),
      who,
      clock: (s) => clock(s),
      clockHour: (h) => {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        return clockTime(d);
      },
      stampTime: (ms) => `${postmark(ms)} · ${clockTime(ms)}`,
      stamp: (id) => {
        if (isCustomStampId(id)) {
          const info = customStamp(id);
          if (!info) return null;
          const topic = tagOf(info);
          return { color: info.hex, name: topic, spoken: topic && lookOf(info) !== "frame" ? t("cs2.use.a11yStamp", { topic }) : t("cs2.use.a11yBlank") };
        }
        const st = getStamp(id);
        return st ? { color: st.color, name: sname(st.name) } : null;
      },
      stickerName,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, who, customStamp],
  );
  return { fmt, who };
}
