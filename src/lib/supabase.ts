import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { UPLOAD_MS, WRITE_MS, fetchWithin } from "./net";

/* Null-safe Supabase client (peekabug pattern). Keys are EXPO_PUBLIC_* baked
   into the bundle; the anon/publishable key is protected by RLS. When keys are
   absent the client is null and the whole app degrades gracefully. */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = !!(url && anon);

/* NOTHING WAITS FOREVER. supabase-js uses whatever fetch it is handed, and
   RN's has no timeout — so a request made as the signal dropped stayed
   pending until the OS gave up, with the app showing an in-flight spinner
   the whole time. A write gets twenty seconds; an upload moves real bytes
   over a real connection, so it gets a minute before we call it stuck. */
const timedFetch: typeof fetch = (input, init) => {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const upload = href.includes("/storage/v1/object");
  return fetchWithin(input, init, upload ? UPLOAD_MS : WRITE_MS);
};

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url!, anon!, {
      global: { fetch: timedFetch },
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // RN: no URL callback in the client itself
        flowType: "pkce", // OAuth + magic-link code exchange
      },
    })
  : null;

/* Cloudflare Pages Functions base (hosts /api/wren, /api/entitlement,
   /api/bump-letters). Trailing slash stripped. */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE || "https://kindredly.io"
).replace(/\/$/, "");
