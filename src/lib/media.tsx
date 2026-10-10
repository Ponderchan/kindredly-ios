/* An uploaded photo or voice letter, from a signed link (db.ts
   signedMediaUrl) rather than the bucket's public address — the buckets are
   on their way to private (security review, 2026-10-09). A cached link is
   there on the first frame; otherwise the element appears when it's back. */
import { useEffect, useState } from "react";
import { AppState, Image, type ImageStyle, type StyleProp } from "react-native";
import { cachedSignedUrl, signedMediaUrl } from "./db";

/* A screen can outlive the hour a link lasts — a voice letter on the desk
   sits under a tab that never closes, and its player was built from the
   first link (2026-10-10 review: back after an hour, play did nothing). So
   the link is signed again when the cached one has lapsed: on coming back
   to the app, and every ten minutes while the screen stays up. */
const RECHECK_MS = 10 * 60_000;

export function useMediaUrl(bucket: "moments" | "voice-letters", path?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => cachedSignedUrl(bucket, path));
  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    const sign = () => signedMediaUrl(bucket, path).then((u) => { if (live && u) setUrl(u); });
    const lapsed = () => !cachedSignedUrl(bucket, path);
    void sign();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active" && lapsed()) void sign(); });
    const timer = setInterval(() => { if (AppState.currentState === "active" && lapsed()) void sign(); }, RECHECK_MS);
    return () => {
      live = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [bucket, path]);
  return url;
}

/** a photo: from the moments bucket when it has a path, else a plain address (a song's art, an older message) */
export function MediaImage({ path, uri, style, resizeMode = "cover" }: { path?: string | null; uri?: string | null; style?: StyleProp<ImageStyle>; resizeMode?: "cover" | "contain" }) {
  const signed = useMediaUrl("moments", path);
  const src = path ? signed : uri;
  return <Image source={src ? { uri: src } : undefined} style={style} resizeMode={resizeMode} />;
}
