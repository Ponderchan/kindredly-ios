import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../lib/theme";
import { StampPressNative, stampPressAvailable, type KPressedPhoto } from "../screens/stamp-press/StampPressNative";
import { StampEditorSlot } from "../screens/stamp-press/StampEditorSlot";
import { SignUpSheet } from "../components/SignUpSheet";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";
import "../data/strings-stamps2";

/* STAMP PRESS — make a stamp from a photo (custom stamps, the owner's final design, 2026-10-19).
   A full-screen modal over everything (the tab bar hidden): the Swift camera first
   (KStampPressView: permission card, live viewfinder, UPLOAD + crop, the press), then, in the
   same route, the edit page (StampEditorSlot, build agent B's). Retake goes back to the camera
   by state alone. Swift only: a binary without KStampPressView goes straight back (the entry
   points hide themselves with stampPressAvailable()).

   Params: from = "me" | "compose" | "album" (where the finished stamp flies to, Prompt 6).

   ONLY ACCOUNTS MAKE STAMPS (owner, 2026-10-20): a guest who opens the press gets the sign-up
   sheet first (every door leads here, so this is the one gate); signing up opens the camera,
   closing the sheet goes back. The server refuses a guest too (0038 stamp_quota: 'account'). */
export default function StampPress() {
  const router = useRouter();
  const { t: tk } = useTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [photo, setPhoto] = useState<KPressedPhoto | null>(null);
  const available = stampPressAvailable();
  const { isGuest } = useAuth();

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  useEffect(() => {
    if (!available) {
      console.log("[stamp-press] this binary has no KStampPressView; leaving");
      close();
    }
  }, [available, close]);

  if (!available) return <View style={{ flex: 1, backgroundColor: tk.bg }} />;
  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: tk.bg }}>
        <SignUpSheet open reason={t("cs2.guest.reason")} onClose={close} onSignedIn={() => {}} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: photo ? tk.bg : "#14122A" }}>
      {photo ? (
        <StampEditorSlot photo={photo} from={typeof from === "string" ? from : ""} onRetake={() => setPhoto(null)} onClose={close} />
      ) : (
        <StampPressNative onClose={close} onPressed={setPhoto} />
      )}
    </View>
  );
}
