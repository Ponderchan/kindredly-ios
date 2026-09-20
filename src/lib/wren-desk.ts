import AsyncStorage from "@react-native-async-storage/async-storage";
import { scoped } from "./scoped-store";
import { supabase, supabaseReady } from "./supabase";
import { getLang } from "./i18n";
import { DEFAULT_WREN } from "./wren-name";

/* WREN'S DESK — the courier's own account, at the top of everyone's
   Kindreds from the first launch, guest or signed in.
   ────────────────────────────────────────────────────────────────────────
   Not a thread. A post is written once (0023 wren_posts) and read by
   everyone, so there is no row per person, no reveal, no aura read, and
   nothing she "noticed". What you write back (wren_mail) is read by the
   people who make Kindredly; the transcript shows it under YOU so the
   room reads as one conversation, but nothing answers from there.

   The official bird is the courier as she is drawn on the box — the
   default look, not the coat you gave yours. Your Wren wears your colours;
   this one is the one everybody has. Her name is not localised and not
   renameable: it is the one name the naming screen refuses. */

export const WREN_ROOM = "wren";
export const OFFICIAL_NAME = DEFAULT_WREN;

export type WrenPostKind = "update" | "event" | "note";
export type WrenPost = { id: number; kind: WrenPostKind; body: string; i18n: Record<string, string> | null; link: string | null; at: string };
export type WrenMail = { id: number; body: string; at: string };

const POSTS_KEY = "kindredly_wren_posts"; // one desk for everyone — unscoped
const MAIL_KEY = "kindredly_wren_mail"; // yours — scoped to the account

/** the post in the reader's language, English when it has no other */
export const postText = (p: WrenPost): string => p.i18n?.[getLang()] || p.body;

const toPost = (r: any): WrenPost => ({
  id: Number(r.id),
  kind: (["update", "event", "note"].includes(r.kind) ? r.kind : "update") as WrenPostKind,
  body: String(r.body || ""),
  i18n: r.body_i18n && typeof r.body_i18n === "object" ? r.body_i18n : null,
  link: typeof r.link === "string" && /^https?:\/\//.test(r.link) ? r.link : null,
  at: String(r.published_at || r.at || ""),
});

export async function readPostsCache(): Promise<WrenPost[]> {
  try {
    const raw = await AsyncStorage.getItem(POSTS_KEY);
    return raw ? (JSON.parse(raw) as WrenPost[]) : [];
  } catch {
    return [];
  }
}

/** newest last, the way a transcript reads. null = could not ask (offline,
    table not there yet) so the caller keeps what it has. */
export async function fetchWrenPosts(): Promise<WrenPost[] | null> {
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase!
      .from("wren_posts")
      .select("id,kind,body,body_i18n,link,published_at")
      .order("published_at", { ascending: true })
      .limit(200);
    if (error || !data) return null;
    const posts = data.map(toPost);
    void AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts)).catch(() => {});
    return posts;
  } catch {
    return null;
  }
}

export async function readMailCache(): Promise<WrenMail[]> {
  try {
    const raw = await scoped.getItem(MAIL_KEY);
    return raw ? (JSON.parse(raw) as WrenMail[]) : [];
  } catch {
    return [];
  }
}

export async function fetchWrenMail(): Promise<WrenMail[] | null> {
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase!.from("wren_mail").select("id,body,created_at").order("created_at", { ascending: true }).limit(200);
    if (error || !data) return null;
    const mail = data.map((r: any) => ({ id: Number(r.id), body: String(r.body), at: String(r.created_at) }));
    void scoped.setItem(MAIL_KEY, JSON.stringify(mail)).catch(() => {});
    return mail;
  } catch {
    return null;
  }
}

/** true when it landed; "unauthorized" when there is no account to write from */
export async function sendWrenMail(body: string): Promise<true | "unauthorized" | "failed"> {
  if (!supabaseReady) return "failed";
  try {
    const { data } = await supabase!.auth.getUser();
    const me = data.user?.id;
    if (!me) return "unauthorized";
    const { error } = await supabase!.from("wren_mail").insert({ user_id: me, body: body.trim().slice(0, 2000), lang: getLang() });
    if (error) return /42501|401|403|JWT/.test(String(error.code || error.message)) ? "unauthorized" : "failed";
    return true;
  } catch {
    return "failed";
  }
}

/* UNREAD. The room-seen ledger stores the count last seen in a room; for
   a correspondent a room never opened counts as caught up (nothing is
   claimed for a number nobody has seen). Her desk is the one exception:
   a first post to someone who has never opened it IS unread — it is the
   reason to open it. */
export const wrenUnread = (ledger: Record<string, number>, posts: number): number =>
  WREN_ROOM in ledger ? Math.max(0, posts - ledger[WREN_ROOM]) : posts;
