import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P, PF, rule, solidBtn } from "../theme/post";
import { AvatarImage } from "./AvatarImage";
import { TheirMark } from "./TheirMark";
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
  otherArchetype,
  myName,
  onClose,
  onTalk,
}: {
  open: boolean;
  wren: string;
  otherSeed: string;
  otherFace?: string | null;
  otherName: string;
  /** the read of their writing — the part a name could never have said */
  otherArchetype?: string | null;
  myName: string;
  onClose: () => void;
  /** the exit isn't "dismiss" — it's the door into the room */
  onTalk: () => void;
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
            You both went first, in the end. So I carried the names across — the way I was always going to.
          </Text>

          {/* THE RITUAL. Not "here is their name": the face they watched
              arrive over ten letters comes apart, and the same squares fly
              into a postmark. Everything in this world gets stamped, and a
              kindred is someone whose own stamp you now carry. The name
              lands inside it, under the read of their writing — because
              what you actually came to know is how they write, and this
              was never a real-name product. */}
          <View style={{ alignItems: "center", marginTop: 26, marginBottom: 8 }}>
            <TheirMark seed={otherSeed} name={otherName} archetype={otherArchetype} />
          </View>

          {/* the face they chose to give, small, under their mark */}
          {otherFace ? (
            <View style={{ alignItems: "center", marginTop: 4 }}>
              <AvatarImage id={otherFace} seed={otherSeed} size={40} />
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.2, color: P.ink40, marginTop: 7 }}>
                THE FACE THEY CHOSE TO GIVE YOU
              </Text>
            </View>
          ) : null}

          <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 26 }}>
            They know you now as {myName}.{"\n\n"}Nothing else changes. Same letters, same pace. Only now they're
            signed.
          </Text>
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <Pressable onPress={onTalk} style={({ pressed }) => ({ ...solidBtn, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>
TALK TO {otherName.toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
