import { useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../lib/theme";
import { originalFor } from "../lib/stamp-press";
import { StampEditorSlot } from "../screens/stamp-press/StampEditorSlot";

/* CHANGE AN APPROVED STAMP (First Class / Cofounder may edit the filter, the #topic and the colour
   later; owner, 2026-10-19). The same Swift edit page as a new stamp (StampEditorSlot, build
   agent B), started from the stamp as it is:

     /stamp-edit?id=<uuid>&topic=<text>&category=<id>&filter=<id>&image=<file:// or signed https>

   The filter can change only when the unfiltered original is still on this phone (lib/stamp-press
   originalFor, kept when it was made here); otherwise the page starts from `image` and offers the
   name and the colour alone. A colour-only change goes through recolour_custom_stamp; a new name
   or filter through stamp-check with replace (Free gets the First Class door: 402 "edit"). */
export default function StampEdit() {
  const router = useRouter();
  const { t: tk } = useTheme();
  const p = useLocalSearchParams<{ id?: string; topic?: string; category?: string; filter?: string; image?: string }>();
  const id = typeof p.id === "string" ? p.id.toLowerCase() : "";

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const editing = useMemo(
    () =>
      id
        ? {
            id,
            topic: typeof p.topic === "string" ? p.topic : "",
            category: typeof p.category === "string" ? p.category : "small",
            filter: typeof p.filter === "string" ? p.filter : "original",
            original: originalFor(id),
            image: typeof p.image === "string" && p.image ? p.image : null,
          }
        : null,
    [id, p.topic, p.category, p.filter, p.image],
  );

  useEffect(() => {
    if (editing) return;
    console.log("[stamp-edit] opened without a stamp id; leaving");
    close();
  }, [editing, close]);

  if (!editing) return <View style={{ flex: 1, backgroundColor: tk.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <StampEditorSlot photo={{ uri: "", width: 0, height: 0, source: "library" }} from="album" editing={editing} onRetake={close} onClose={close} />
    </View>
  );
}
