/* An uploaded photo or voice letter, from a signed link (db.ts
   signedMediaUrl) rather than the bucket's public address — the buckets are
   on their way to private (security review, 2026-10-09). A cached link is
   there on the first frame; otherwise the element appears when it's back. */
import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { cachedSignedUrl, signedMediaUrl } from "./db";

export function useMediaUrl(bucket: "moments" | "voice-letters", path?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => cachedSignedUrl(bucket, path));
  useEffect(() => {
    let live = true;
    if (path) signedMediaUrl(bucket, path).then((u) => { if (live) setUrl(u); });
    else setUrl(null);
    return () => { live = false; };
  }, [bucket, path]);
  return url;
}

/** a photo: from the moments bucket when it has a path, else a plain address (a song's art, an older message) */
export function MediaImage({ path, uri, style, resizeMode = "cover" }: { path?: string | null; uri?: string | null; style?: StyleProp<ImageStyle>; resizeMode?: "cover" | "contain" }) {
  const signed = useMediaUrl("moments", path);
  const src = path ? signed : uri;
  return <Image source={src ? { uri: src } : undefined} style={style} resizeMode={resizeMode} />;
}
