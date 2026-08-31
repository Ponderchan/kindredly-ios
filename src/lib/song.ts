/* LEAVE A SONG — a link, dressed as what it is.
   No SDKs, no players: the writer pastes a link, we recognise the service,
   fetch a title via public oEmbed when one exists, and the room renders a
   small record sleeve that opens the link. The message body carries
   "title — url" so the web app and old clients read it as plain text. */

export interface SongCard {
  url: string;
  host: "spotify" | "apple" | "youtube" | "other";
  title: string | null;
}

const HOSTS: [SongCard["host"], RegExp][] = [
  ["spotify", /open\.spotify\.com\/(track|album|playlist|episode)/i],
  ["apple", /music\.apple\.com\//i],
  ["youtube", /(youtube\.com\/watch|youtu\.be\/|music\.youtube\.com)/i],
];

export function parseSongUrl(raw: string): SongCard | null {
  const m = raw.match(/https?:\/\/\S+/);
  if (!m) return null;
  const url = m[0].replace(/[)\]}>.,]+$/, "");
  for (const [host, re] of HOSTS) if (re.test(url)) return { url, host, title: null };
  return null;
}

/** best-effort title — a card with just the host name is still honest */
export async function fetchSongTitle(card: SongCard): Promise<string | null> {
  try {
    const ep =
      card.host === "spotify"
        ? `https://open.spotify.com/oembed?url=${encodeURIComponent(card.url)}`
        : card.host === "youtube"
          ? `https://www.youtube.com/oembed?url=${encodeURIComponent(card.url)}&format=json`
          : null;
    if (!ep) return null;
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(ep, { signal: ctl.signal });
    clearTimeout(tm);
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j?.title === "string" ? (j.title as string) : null;
  } catch {
    return null;
  }
}
