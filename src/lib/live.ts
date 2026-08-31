import { useEffect, useRef } from "react";
import { supabase, supabaseReady } from "./supabase";

/* THE PIPE THE PRODUCT NEVER PLUGGED IN.
   ────────────────────────────────────────────────────────────────────────
   Migration 0003 put `threads` and `messages` on the realtime publication
   the week the tables were born — and for two hundred slices nothing ever
   subscribed. Two people sitting in the same room could not see each
   other's words until one of them left and came back.

   These hooks are deliberately dumb: they never carry data, they only
   POKE. The payload of a postgres_changes event is untrusted shape-wise
   and skips RLS-joined context anyway; the loaders the screens already
   own (fetchThreadMessages, fetchThreads) are the single source of truth.
   A poke is debounced — one send lands as messages INSERT + threads
   UPDATE back-to-back, and that should be one reload, not two.

   Still deliberately absent, per the room's own charter: presence, typing
   indicators, read receipts. The pipe carries LETTERS, not attention. */

/* supabase reuses a channel for a repeated topic, and adding callbacks to
   an already-subscribed channel throws. Two of our screens can legally
   watch the same thing at once (the layout + the tab; chat stacked under
   room), so every subscriber gets its own topic. */
let seq = 0;

/** call onChange when anything about this one thread changes on the server:
    a message arrives (theirs or our own echo), a signature lands, the
    reveal flips, a reaction is set. */
export function useThreadLive(threadId: string | undefined, onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!supabaseReady || !threadId || threadId.startsWith("demo-")) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poke = (ev: { eventType?: string; table?: string }) => {
      if (__DEV__) console.log(`[live] poke thread-ch ${ev.table}:${ev.eventType}`);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 350);
    };

    const ch = supabase!
      .channel(`thread:${threadId}#${++seq}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        poke,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "folds", filter: `thread_id=eq.${threadId}` },
        poke,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "threads", filter: `id=eq.${threadId}` },
        poke,
      );

    // RLS'd change streams need the user's token on the socket. supabase-js
    // propagates it on auth events, but a cold-started screen can subscribe
    // before any event has fired — set it explicitly, then join.
    void supabase!.auth.getSession().then(({ data }) => {
      if (data.session) supabase!.realtime.setAuth(data.session.access_token);
      ch.subscribe((status, err) => {
        if (__DEV__) console.log(`[live] thread:${threadId} → ${status}`, err?.message ?? "");
      });
    });

    return () => {
      if (timer) clearTimeout(timer);
      void supabase!.removeChannel(ch);
    };
  }, [threadId]);
}

/** call onChange when any thread of MINE moves — a reply from a stranger,
    a signature, a reaction. Feeds the Kindreds list and the tab-bar
    square without anyone visiting the tab. One subscriber at a time is
    plenty (the tab layout); filters are single-column, so me-as-a and
    me-as-b are two subscriptions on one channel. */
export function useMyThreadsLive(me: string | null | undefined, onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!supabaseReady || !me) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poke = (ev: { eventType?: string; table?: string }) => {
      if (__DEV__) console.log(`[live] poke my-threads ${ev.table}:${ev.eventType}`);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 600);
    };

    const ch = supabase!.channel(`my-threads:${me}#${++seq}`);
    for (const side of ["a", "b"] as const) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "threads", filter: `${side}=eq.${me}` },
        poke,
      );
    }
    void supabase!.auth.getSession().then(({ data }) => {
      if (data.session) supabase!.realtime.setAuth(data.session.access_token);
      ch.subscribe((status, err) => {
        if (__DEV__) console.log(`[live] my-threads → ${status}`, err?.message ?? "");
      });
    });

    return () => {
      if (timer) clearTimeout(timer);
      void supabase!.removeChannel(ch);
    };
  }, [me]);
}
