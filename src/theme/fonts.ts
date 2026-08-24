import { useFonts } from "expo-font";
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_400Regular_Italic,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import { Caveat_400Regular, Caveat_600SemiBold } from "@expo-google-fonts/caveat";

/* v20 typography — Fraunces (serif) + Inter (sans), on the blue-white palette.
   IBM Plex Mono carries the postal system's own voice: counters, dockets,
   dates, numbers. It's the machine talking; the letter itself stays serif. */
export function useAppFonts() {
  return useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    // Wren's hand — what she writes ON PAPER (the letter about you). Her
    // spoken voice stays serif italic; this face exists for ink she leaves.
    Caveat_400Regular,
    Caveat_600SemiBold,
  });
}
