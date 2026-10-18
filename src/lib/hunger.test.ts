import "../data/strings";   // the catalog registers itself — her lines are read through t()
import { hungerRead } from "./hunger";
import { whoBook } from "./stranger-who";
import { strangerName } from "./stranger-name";
import type { ThreadSummary } from "./db";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const DAY = 864e5, now = Date.parse("2026-09-22T12:00:00Z");
const th = (o: Partial<ThreadSummary>): ThreadSummary => ({ id: "t", stamp: "crush", revealed: false, mine: 1, theirs: 1, otherName: null, other: "u-1", preview: "", lastSenderMe: false, lastAt: now - 3 * DAY, ...o });
const iso = (days: number) => new Date(now - days * DAY).toISOString();

ok("fed: wrote yesterday, nobody waiting → nothing", hungerRead({ threads: [], lastWrittenAt: iso(1), now }) === null);
ok("3 days → peckish", hungerRead({ threads: [], lastWrittenAt: iso(3), now })?.tier === "peckish");
ok("7 days → hungry", hungerRead({ threads: [], lastWrittenAt: iso(8), now })?.tier === "hungry");
ok("14 days → starving, wilting", hungerRead({ threads: [], lastWrittenAt: iso(20), now })?.wilt === true);
ok("nothing ever written, no date → nothing", hungerRead({ threads: [], lastWrittenAt: null, now }) === null);
ok("a reply of mine counts as writing", hungerRead({ threads: [th({ lastSenderMe: true, lastAt: now - DAY })], lastWrittenAt: iso(30), now }) === null);
ok("their word 1 day old → not yet", hungerRead({ threads: [th({ lastAt: now - DAY })], lastWrittenAt: iso(1), now }) === null);
const owed = hungerRead({ threads: [th({ lastAt: now - 3 * DAY })], lastWrittenAt: iso(1), now });
ok("their word 3 days old → owed, listen, names the room", owed?.tier === "owed" && owed.mood === "listen" && owed.thread === "t");
ok("6 days → owed-long, worry", hungerRead({ threads: [th({ lastAt: now - 6 * DAY })], lastWrittenAt: iso(1), now })?.tier === "owed-long");
ok("a person outranks the bag", hungerRead({ threads: [th({ lastAt: now - 3 * DAY })], lastWrittenAt: iso(30), now })?.tier === "owed");
ok("a correspondent who left is not waiting", hungerRead({ threads: [th({ lastAt: now - 6 * DAY, gone: true })], lastWrittenAt: iso(1), now }) === null);
ok("the longest wait speaks", hungerRead({ threads: [th({ id: "a", lastAt: now - 3 * DAY }), th({ id: "b", lastAt: now - 9 * DAY })], lastWrittenAt: iso(1), now })?.thread === "b");
ok("a kindred is named", hungerRead({ threads: [th({ revealed: true, otherName: "Mara", lastAt: now - 3 * DAY })], lastWrittenAt: iso(1), now })?.line.startsWith("Mara") === true);

/* who she names: the pen pal's number as ever, or (the identity switch on) the courier name */
const penPal = (u: string | null | undefined) => (u ? "N.º " + u : "UNSIGNED");
const owedTh = [th({ lastAt: now - 3 * DAY })];
const plain = hungerRead({ threads: owedTh, lastWrittenAt: iso(1), now })!;
ok("a pen pal is their number (No. — her line's own words)", plain.line.startsWith("No. "));
const offBook = whoBook({ identity: false, t: (k) => k, lang: "en", penPal });
ok("identity off: a book changes nothing", JSON.stringify(hungerRead({ threads: owedTh, lastWrittenAt: iso(1), now, book: offBook })) === JSON.stringify(plain));
const onBook = whoBook({ identity: true, t: (k) => k, lang: "en", penPal });
const courier = strangerName("u-1", { lang: "en", unsigned: "" });
ok("identity on: she names the courier name", hungerRead({ threads: owedTh, lastWrittenAt: iso(1), now, book: onBook })!.line.startsWith(courier + " "));
ok("identity on: a kindred is still their pen name", hungerRead({ threads: [th({ revealed: true, otherName: "Mara", lastAt: now - 3 * DAY })], lastWrittenAt: iso(1), now, book: onBook })!.line.startsWith("Mara"));

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
