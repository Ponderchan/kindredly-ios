/* USAGE STICKERS — fixed facts, fixed clock. Run:
     npx tsx src/lib/usage-stickers.test.ts */
import { EMPTY_COUNTERS, usageStickers, type UsageFacts } from "./usage-stickers";
import type { ThreadSummary } from "./db";

let fail = 0;
const ok = (c: boolean, label: string) => {
  if (!c) fail++;
  console.log(`${c ? "ok  " : "FAIL"}  ${label}`);
};
const NOW = "2026-09-18T12:00:00.000Z";
const at = (day: number, hour: number) => new Date(Date.UTC(2026, 8, day, hour, 0, 0)).toISOString(); // September, UTC
const ids = (l: ReturnType<typeof usageStickers>) => l.map((s) => s.id);
const thread = (p: Partial<ThreadSummary>): ThreadSummary =>
  ({ id: "t", stamp: "off-chest", revealed: false, mine: 0, theirs: 0, otherName: null, other: "u", preview: "", lastSenderMe: true, lastAt: Date.parse(NOW), ...p }) as ThreadSummary;
const base = (p: Partial<UsageFacts>): UsageFacts => ({
  now: NOW, letters: [], replies: [], threads: [], journal: [], keptN: 0, dressed: false, named: false, counters: { ...EMPTY_COUNTERS }, ...p,
});
const LONG = "The kitchen light was on when I got home and there was bread on the table and nobody had used the plate so I sat down.";

/* local hours: the rule reads getHours(), so build stamps from local time */
const local = (day: number, hour: number) => new Date(2026, 8, day, hour, 0, 0).toISOString();

{
  const nights = [1, 2, 3, 4, 5, 6].map((d) => ({ at: local(d, 23), text: LONG, stamp: "cant-sleep" }));
  const r = usageStickers(base({ letters: nights }));
  ok(ids(r).includes("night_writer"), "six letters at 23:00 → night_writer");
  ok(ids(r).includes("streaker"), "six days in a row → streaker");
  ok(ids(r).includes("three_am_type"), "six late-night stamps → three_am_type");
  ok(!ids(r).includes("early_bird"), "…and not early_bird");
}
{
  const r = usageStickers(base({ letters: [1, 2, 3, 4].map((d) => ({ at: local(d, 23), text: LONG })) }));
  ok(!ids(r).includes("night_writer"), "four letters are not enough for a time sticker");
}
{
  const three = [{ at: local(10, 9), text: LONG }, { at: local(10, 13), text: LONG }, { at: local(10, 20), text: LONG }];
  const r = usageStickers(base({ letters: three, replies: [{ at: local(10, 21), text: LONG }] }));
  ok(ids(r).includes("marathoner"), "four pieces in one day → marathoner");
}
{
  const r = usageStickers(base({ letters: [{ at: local(1, 10), text: LONG }, { at: local(17, 10), text: LONG }] }));
  ok(ids(r).includes("comeback_kid"), "a sixteen-day gap → comeback_kid");
}
{
  const old = Date.parse(NOW) - 9 * 864e5;
  const r = usageStickers(base({ threads: [thread({ id: "a", theirs: 2, mine: 1, lastSenderMe: false, lastAt: old }), thread({ id: "b", theirs: 1, mine: 1, lastSenderMe: false, lastAt: old }), thread({ id: "c", revealed: true, mine: 6, theirs: 6 })] }));
  ok(ids(r).includes("ghost"), "two threads waiting on me for 9 days → ghost");
  ok(r.find((s) => s.id === "ghost")!.private, "ghost is private");
  ok(ids(r).includes("name_trader") && ids(r).includes("slow_burn") && ids(r).includes("two_timer"), "revealed + deep + several live → name_trader, slow_burn, two_timer");
}
{
  const r = usageStickers(base({ counters: { seen: 30, replied: 2, translated: 6, courierVisits: 12 }, named: true, dressed: true }));
  ok(ids(r).includes("picky") && r.find((s) => s.id === "picky")!.private, "2 replies in 30 seen → picky, private");
  ok(ids(r).includes("translator") && ids(r).includes("homebody") && ids(r).includes("namer") && ids(r).includes("dresser"), "counters and the bird → translator, homebody, namer, dresser");
}
{
  const r = usageStickers(base({ counters: { seen: 12, replied: 5, translated: 0, courierVisits: 0 } }));
  ok(ids(r).includes("generous") && !ids(r).includes("picky"), "5 replies in 12 seen → generous");
}
{
  const j = (i: number, mood: string, type: "text" | "photo" = "text") => ({ id: "j" + i, date: at(i, 10), type, body: LONG, mood } as any);
  const r = usageStickers(base({ journal: [j(1, "calm"), j(2, "calm", "photo"), j(3, "content", "photo"), j(4, "calm", "photo"), j(5, "numb"), j(6, "calm"), j(7, "calm")] }));
  ok(ids(r).includes("sealer") && ids(r).includes("photo_journaler") && ids(r).includes("softie"), "seven pages, three photos, soft moods → sealer, photo_journaler, softie");
  ok(r.filter((s) => s.group === "sealed").every((s) => s.private), "every sealed sticker is private");
}
{
  const r = usageStickers(base({ journal: [] }));
  ok(r.length === 0, "nothing counted → no stickers");
}
{
  const family = "My mother called again tonight and my brother was there too, the whole family on one phone, and I miss my dad more when they do that.";
  const r = usageStickers(base({ letters: [1, 2, 3, 4].map((d) => ({ at: local(d, 12), text: family })) }));
  ok(ids(r).includes("family_person"), `family in four letters → family_person (${ids(r).join(",")})`);
}
console.log(fail ? `\n${fail} FAILED` : "\nall ok");
process.exit(fail ? 1 : 0);
