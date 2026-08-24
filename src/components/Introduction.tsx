import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P, PF, rule, solidBtn } from "../theme/post";
import { AvatarImage } from "./AvatarImage";
import { MosaicId } from "./MosaicId";
import { WrenBird } from "./WrenBird";

/* Wren's introduction — the ceremony that replaces the reveal toast.
   ────────────────────────────────────────────────────────────────────────
   Two signatures met, and the biggest moment in the product used to be a
   toast: "you're no longer strangers." A toast is how a system reports;
   this is a thing that happened between three parties — two people and
   the bird who carried every letter — so it arrives as what it is: a
   letter from her.

   She's the one character who has known you both all along, so she does
   the introducing. Her voice is the serif italic she always speaks in;
   the NAME is set in the letter face, because a name is a thing a person
   gave. The face above it is the same mosaic you watched come into view,
   finally next to what it was becoming. */
export function Introduction({
  open,
  wren,
  otherSeed,
  otherFace,
  otherName,
  myName,
  onClose,
}: {
  open: boolean;
  wren: string;
  otherSeed: string;
  otherFace?: string | null;
  otherName: string;
  myName: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12, ...rule }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>
            CARRIED BY {wren.toUpperCase()}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 30, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <WrenBird size={44} mood="content" />

          <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 18 }}>
            You both enclosed your names, so I carried them across — the way I was always going to.{"\n\n"}The one whose
            letters you've been reading is called
          </Text>

          {/* the face you watched come into view — and, if they gave one,
              the face they chose. The mosaic was assigned; this was picked
              for you. Both on the table: the one you knew, the one they are. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 }}>
            <MosaicId seed={otherSeed} cell={7} gap={2} />
            {otherFace ? (
              <>
                <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink40 }}>→</Text>
                <AvatarImage id={otherFace} seed={otherSeed} size={46} />
              </>
            ) : null}
            <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 32, fontWeight: "600", color: P.ink }}>{otherName}</Text>
          </View>

          <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 22 }}>
            — and they know you now as {myName}.{"\n\n"}Nothing else changes. Same letters, same pace. Only now they're
            signed.
          </Text>
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <Pressable onPress={onClose} style={({ pressed }) => ({ ...solidBtn, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>
              WRITE TO {otherName.toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
