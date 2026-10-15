import AsyncStorage from "@react-native-async-storage/async-storage";

/* DEVICE STATE FINALLY KNOWS WHOSE IT IS.
   ────────────────────────────────────────────────────────────────────────
   Every kindredly_* key used to be bare — the journal, the courier's name
   and shape, the drafts, the local profile — so the phone's written life
   belonged to whichever account happened to be signed in. Sign in as
   someone new and you inherited the previous account's bird, its sealed
   pages, an aura computed from another person's writing.

   This is the one interception point: an AsyncStorage-shaped wrapper that
   suffixes each key with the owning account (`::<uid>`), guests pooled
   under `::anon`. Modules keep their key strings and call sites; only the
   import changes. Device-level state (language, launch-seen) deliberately
   stays on raw AsyncStorage.

   Reads and writes GATE on the namespace being known — auth sets it the
   moment the session resolves (including "no session" → anon), so nothing
   can read another account's bucket during boot. */

let ns: string | null = null;
let releaseGate: (() => void) | null = null;
let gate: Promise<void> = new Promise((r) => {
  releaseGate = r;
});

/** the account reads and writes go to, once auth has said which (waiting
    as they do) */
export async function storageOwner(): Promise<string> {
  if (ns === null) await gate;
  return ns as string;
}

/** an AsyncStorage-shaped store pinned to one account, for a read and the
    write that follows it: a scoped key is fixed when its call is made, but
    the account can change before the answer comes back */
export function scopedTo(owner: string) {
  return {
    getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(`${key}::${owner}`),
    setItem: (key: string, value: string): Promise<void> => AsyncStorage.setItem(`${key}::${owner}`, value),
  };
}

export function setStorageUser(uid: string | null): void {
  ns = uid || "anon";
  releaseGate?.();
  releaseGate = null;
}

const scopedKey = async (key: string): Promise<string> => {
  if (ns === null) await gate;
  return `${key}::${ns}`;
};

export const scoped = {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(await scopedKey(key));
  },
  async setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(await scopedKey(key), value);
  },
  async removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(await scopedKey(key));
  },
};

/* every account-owned key. Additions belong here AND in their module. */
const OWNED_KEYS = [
  "kindredly_journal",
  "kindredly_journal_rescue",
  "kindredly_journal_n",
  "kindredly_free_flight_best",
  "kindredly_profile_local",
  "kindredly_wren_name",
  "kindredly_wren_pronoun",
  "kindredly_wren_egg",
  "kindredly_wren_skin",
  "kindredly_wren_accessory",
  "kindredly_wren_stage_floor",
  "kindredly_wren_stage_dates",
  "kindredly_wren_souvenirs",
  "kindredly_wren_lastvisit",
  "kindredly_wren_type",
  "kindredly_hatchling_form",
  "kindredly_hatch_archetype",
  "kindredly_you_pronoun",
  "kindredly_aura_history",
  "kindredly_drafts",
  "kindredly_flags",
  "kindredly_kept",
  "kindredly_keepsakes",
  "kindredly_keepsakes_seen",
  "kindredly_seen_replies",
  "kindredly_room_seen",
  "kindredly_wren_mail",
  "kindredly_wren_local",
  "kindredly_notice_seen",
  "kindredly_thread_detail",
  "kindredly_recent_stamps",
  "kindredly_introductions",
  "kindredly_voice_report",
  "kindredly_voice_ai",
  "kindredly_spark_n",
  "kindredly_hidden_demo",
  "kindredly_avatar_photo",
  "kindredly_lore",
  "kindredly_usage_counters",
  "kindredly_aura_facts",
  "kindredly_aura_cache",
  "kindredly_threads_cache",
  "kindredly_moment_day",
];

const MIGRATED = "kindredly_ns_claimed"; // bare, device-level marker

/* ONE-TIME: the pre-namespacing install's bare keys belong to the account
   that lived on this device. We cannot know which one that was, so the
   FIRST real account to sign in after the upgrade claims them — the owner
   is told to make that the right account. Runs once, ever. */
export async function claimLegacyKeys(uid: string): Promise<void> {
  try {
    if (await AsyncStorage.getItem(MIGRATED)) return;
    for (const k of OWNED_KEYS) {
      const bare = await AsyncStorage.getItem(k);
      if (bare === null) continue;
      if ((await AsyncStorage.getItem(`${k}::${uid}`)) === null) {
        await AsyncStorage.setItem(`${k}::${uid}`, bare);
      }
      await AsyncStorage.removeItem(k);
    }
    await AsyncStorage.setItem(MIGRATED, "1");
  } catch {
    /* claimed next launch instead */
  }
}

/* ADOPTION, WIDENED. A guest walks onboarding, hatches a bird, seals pages
   — all of it in the anon bucket. When a real identity arrives and the
   account hasn't been through onboarding anywhere, the guest's whole local
   life moves into the account's bucket. An account that already exists
   (onboarded on web, or on another phone) adopts nothing: it starts clean
   here, and the anon bucket waits for an owner it actually belongs to. */
export async function adoptGuestBucket(uid: string): Promise<void> {
  try {
    for (const k of OWNED_KEYS) {
      const anon = await AsyncStorage.getItem(`${k}::anon`);
      if (anon === null) continue;
      if ((await AsyncStorage.getItem(`${k}::${uid}`)) === null) {
        await AsyncStorage.setItem(`${k}::${uid}`, anon);
      }
      await AsyncStorage.removeItem(`${k}::anon`);
    }
  } catch {
    /* best-effort */
  }
}
