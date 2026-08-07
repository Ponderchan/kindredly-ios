import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Null-safe Supabase client (peekabug pattern). Keys are EXPO_PUBLIC_* baked
   into the bundle; the anon/publishable key is protected by RLS. When keys are
   absent the client is null and the whole app degrades gracefully. */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = !!(url && anon);

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url!, anon!, {
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
