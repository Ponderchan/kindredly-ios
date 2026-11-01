/* The rating ask's rules (lib/rating-ask-core). Run by hand from the repo root:
     node src/lib/rating-ask-core.test.ts */

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

const { forcedVariant, emptyRating, parseRating, withVariant, arm, ratingDue, markShown, markTapped, markLater, ratingAskOn, MAX_ASKS, ARMED_FOR_MS, SNOOZE_DAYS } = await import(
  "./rating-ask-core.ts"
);

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const DAY = 86400_000;
const T = 1_800_000_000_000;

ok("switch on with no table", ratingAskOn(null) === true);
ok("switch off by a row", ratingAskOn({ ratingask: false }) === false);

ok("no row: no forced ask", forcedVariant(null) === null && forcedVariant({ ratingask: true }) === null);
ok("letter row forces the letter", forcedVariant({ ratingask_letter: true }) === "letter");
ok("review row forces the review", forcedVariant({ ratingask_review: true }) === "review");
ok("both: the letter", forcedVariant({ ratingask_letter: true, ratingask_review: true }) === "letter");
ok("false rows force nothing", forcedVariant({ ratingask_letter: false, ratingask_review: false }) === null);
ok("torn record is fresh", JSON.stringify(parseRating("{oops")) === JSON.stringify(emptyRating()));
ok("round trip", JSON.stringify(parseRating(JSON.stringify(markShown(arm(withVariant(emptyRating(), 0.2), "reply", T), T)))) === JSON.stringify(markShown(arm(withVariant(emptyRating(), 0.2), "reply", T), T)));

ok("variant low = letter", withVariant(emptyRating(), 0.1).variant === "letter");
ok("variant high = review", withVariant(emptyRating(), 0.9).variant === "review");
ok("variant kept", withVariant(withVariant(emptyRating(), 0.1), 0.9).variant === "letter");

const fresh = emptyRating();
ok("nothing armed, nothing due", !ratingDue(fresh, T));
const a = arm(fresh, "kindred", T);
ok("armed is due", ratingDue(a, T + 1000));
ok("armed goes stale", !ratingDue(a, T + ARMED_FOR_MS + 1));

const s1 = markShown(a, T);
ok("shown clears the moment", s1.armed === null && s1.shown.length === 1);
ok("not again the same day", !ratingDue(arm(s1, "reply", T + 3600_000), T + 3600_000));
ok("again the next day", ratingDue(arm(s1, "reply", T + DAY), T + DAY));

const later = markLater(s1, T);
ok("Not now: quiet", !ratingDue(arm(later, "reply", T + 10 * DAY), T + 10 * DAY));
ok("Not now: back after the snooze", ratingDue(arm(later, "reply", T + (SNOOZE_DAYS + 1) * DAY), T + (SNOOZE_DAYS + 1) * DAY));

const tapped = markTapped(s1);
ok("tapped: never again", !ratingDue(arm(tapped, "reply", T + 400 * DAY), T + 400 * DAY));

let many = emptyRating();
for (let i = 0; i < MAX_ASKS; i++) many = markShown(arm(many, "reply", T + i * 2 * DAY), T + i * 2 * DAY);
ok("at most three", many.shown.length === MAX_ASKS && !ratingDue(arm(many, "reply", T + 100 * DAY), T + 100 * DAY));

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
