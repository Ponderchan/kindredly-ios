import { fetchThreads } from "./db";
import { loadJournal } from "./journal";
import { loadKept } from "./kept";
import { getFlags } from "./flags";
import type { GrowthStats } from "../data/growth";

/* One aggregation for the profile + growth stamps. All local/product data. */
export async function collectGrowthStats(createdAt?: string | null): Promise<GrowthStats> {
  const [threads, journal, kept, flags] = await Promise.all([
    fetchThreads(),
    loadJournal(),
    loadKept(),
    getFlags(),
  ]);
  const t = threads || [];
  const at = createdAt ? Date.parse(createdAt) : NaN;
  const day = Number.isNaN(at) ? 1 : Math.max(1, Math.floor((Date.now() - at) / 86400000) + 1);
  return {
    lettersSent: t.reduce((s, x) => s + x.mine, 0),
    reached: t.length,
    gotReply: t.some((x) => !x.lastSenderMe),
    deepest: t.reduce((m, x) => Math.max(m, x.mine), 0),
    kindreds: t.filter((x) => x.revealed).length,
    keptN: kept.length,
    journalN: journal.length,
    driftN: journal.filter((e) => !!e.driftedLine).length,
    voiceSent: !!flags.voiceSent,
    day,
  };
}

export const EMPTY_STATS: GrowthStats = {
  lettersSent: 0,
  reached: 0,
  gotReply: false,
  deepest: 0,
  kindreds: 0,
  keptN: 0,
  journalN: 0,
  driftN: 0,
  voiceSent: false,
  day: 1,
};
