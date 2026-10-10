import { Share } from "react-native";
import { requireOptionalNativeModule } from "expo";

/* COPY A LINE (owner, 2026-10-10: long-press → Copy). expo-clipboard is a
   native module, so a dev client built before it was added doesn't have it;
   there the share sheet stands in (it has its own Copy) instead of the app
   throwing. Every build made after it was added copies directly. */
export async function copyText(text: string): Promise<void> {
  if (requireOptionalNativeModule("ExpoClipboard")) {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    return;
  }
  await Share.share({ message: text }).catch(() => {});
}
