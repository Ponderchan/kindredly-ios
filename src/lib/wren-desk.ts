import AsyncStorage from "@react-native-async-storage/async-storage";
import { scoped } from "./scoped-store";
import { supabase, supabaseReady } from "./supabase";
import { getLang } from "./i18n";
import { DEFAULT_WREN } from "./wren-name";
import type { Answer } from "./wren-answers";

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
export type WrenMailKind = "note" | "bug" | "idea" | "photo";
export type WrenMail = { id: number; kind: WrenMailKind; body: string; mediaPath: string | null; at: string; reply: string | null; repliedAt: string | null };
/** a question she answered herself, kept on this phone so the room
    reads as one transcript; `q` is null when a guide was opened from a chip */
export type WrenLocal = { id: number; q: string | null; answer: Answer; at: string };

const POSTS_KEY = "kindredly_wren_posts"; // one desk for everyone — unscoped
const MAIL_KEY = "kindredly_wren_mail"; // yours — scoped to the account

/** the post in the reader's language, English when it has no other */
export const postText = (p: WrenPost): string => p.i18n?.[getLang()] || p.body;

const toPost = (r: any): WrenPost => ({
  id: Number(r.id),
  kind: (["update", "event", "note"].includes(r.kind) ? r.kind : "update") as WrenPostKind,
  body: String(r.body || ""),
  i18n: r.body_i18n && typeof r.body_i18n === "object" ? r.body_i18n : null,
  /* a web page, or a place in the app: a guide (kindredly:///guide/<id>) or
     a release's reel played under the post (kindredly:///news/<version>).
     Until 1.0.5 only http links got through, so the in-app ones were dropped. */
  link: typeof r.link === "string" && (/^https?:\/\//.test(r.link) || /^kindredly:\/\/\/?(guide\/[a-z]+|news\/[0-9][0-9.]*)$/.test(r.link)) ? r.link : null,
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
    table not there yet) so the caller keeps what it has. Asked at most
    once a minute: the row on Kindreds, the strip on Today and the tab's
    number all call this on every focus, and her desk does not change
    that often. */
let postsMem: WrenPost[] | null = null;
let postsAt = 0;
export async function fetchWrenPosts(): Promise<WrenPost[] | null> {
  if (!supabaseReady) return null;
  if (postsMem && Date.now() - postsAt < 60_000) return postsMem;
  try {
    const { data, error } = await supabase!
      .from("wren_posts")
      .select("id,kind,body,body_i18n,link,published_at")
      .order("published_at", { ascending: true })
      .limit(200);
    if (error || !data) return null;
    const posts = data.map(toPost);
    postsMem = posts;
    postsAt = Date.now();
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
    const { data, error } = await supabase!.from("wren_mail").select("id,kind,body,media_path,created_at,reply,replied_at").order("created_at", { ascending: true }).limit(200);
    if (error || !data) return null;
    const mail = data.map(
      (r: any): WrenMail => ({
        id: Number(r.id),
        kind: (["note", "bug", "idea", "photo"].includes(r.kind) ? r.kind : "note") as WrenMailKind,
        body: String(r.body),
        mediaPath: typeof r.media_path === "string" ? r.media_path : null,
        at: String(r.created_at),
        reply: typeof r.reply === "string" && r.reply ? r.reply : null,
        repliedAt: typeof r.replied_at === "string" ? r.replied_at : null,
      }),
    );
    void scoped.setItem(MAIL_KEY, JSON.stringify(mail)).catch(() => {});
    return mail;
  } catch {
    return null;
  }
}

/** true when it landed; "unauthorized" when there is no account to write from.
    A picture rides in the moments bucket (uploadMoment) and its path comes
    along here. */
export async function sendWrenMail(body: string, kind: WrenMailKind = "note", mediaPath: string | null = null): Promise<true | "unauthorized" | "failed"> {
  if (!supabaseReady) return "failed";
  try {
    const { data } = await supabase!.auth.getUser();
    const me = data.user?.id;
    if (!me) return "unauthorized";
    const { error } = await supabase!.from("wren_mail").insert({ user_id: me, kind, body: body.trim().slice(0, 2000), media_path: mediaPath, lang: getLang() });
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

/* ── what she answered on this phone ─────────────────────────────── */
const LOCAL_KEY = "kindredly_wren_local";

export async function readLocal(): Promise<WrenLocal[]> {
  try {
    const raw = await scoped.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as WrenLocal[]) : [];
  } catch {
    return [];
  }
}

export async function keepLocal(item: WrenLocal): Promise<void> {
  try {
    const cur = await readLocal();
    await scoped.setItem(LOCAL_KEY, JSON.stringify([...cur, item].slice(-60)));
  } catch {
    /* the answer was shown; losing its trace is the smaller loss */
  }
}
