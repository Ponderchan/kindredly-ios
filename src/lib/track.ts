import { supabase, supabaseReady } from "./supabase";

/* COUNTING OUR OWN PRODUCT.
   ────────────────────────────────────────────────────────────────────────
   No third-party analytics SDK, deliberately: this app's floor is that a
   stranger learns nothing about you but how you write, and an analytics
   vendor would hold that floor instead of us — plus a privacy-label
   disclosure, plus an SDK that reads more than we would ask it to. Events
   land in our own table (0014), insert-only, unreadable by any client.

   THE ONE RULE: never log what someone wrote. No letter text, no journal
   text, no pen names, no correspondent ids. Props carry counts, short
   enum-ish strings and prices — things that answer "is the product
   working" without ever answering "what did this person say".

   Fire-and-forget by construction: track() is never awaited at a call
   site, never blocks a screen, and swallows every failure. A missing
   event is a missing row; a slow event would be a slow product. */

export type EventName =
  // the funnel that decides whether this product works at all
  | "onboard_step"
  | "onboard_done"
  /* the new onboarding (screens/onboarding, identity switch on): every screen
     arrived at ({ step, i }), and the first letter posted — counted apart from
     the old run's, so the two funnels can be compared */
  | "ob2_step"
  | "ob2_done"
  | "letter_sent"
  | "reply_sent"
  | "reply_received"
  | "kindred_made"
  // the money
  | "paywall_shown"
  | "paywall_dismissed"
  | "fare_selected"
  | "purchase_started"
  | "purchase_done"
  | "purchase_failed"
  // the walls, counted separately from the paywall they open
  | "gate_hit";

/** where a paywall was opened FROM — every entry point, named once */
export type PaywallSource =
  | "kindred_gate"
  | "rekindle"
  | "closing"
  | "voice_lock"
  | "daily_cap"
  | "report_lock"
  | "wardrobe_lock"
  | "onboarding_dress"
  | "journey_archive"
  | "me_row"
  | "settings_row"
  | "unknown";

export function track(name: EventName, props: Record<string, string | number | boolean> = {}): void {
  if (!supabaseReady) return;
  void (async () => {
    try {
      const { data } = await supabase!.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return; // a ghost's events belong to nobody; drop them
      await supabase!.from("events").insert({ user_id: uid, name, props });
    } catch {
      /* an event is never worth a visible failure */
    }
  })();
}
