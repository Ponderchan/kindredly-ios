import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P, PF, rule, solidBtn } from "../theme/post";
import { AvatarImage } from "./AvatarImage";
import { IntroductionRitual, T_RITUAL_DONE } from "./IntroductionRitual";
import Animated, { FadeIn } from "react-native-reanimated";
import { stickerName } from "../lib/sticker-copy";
import type { ThreadMessage } from "../lib/db";
import { roadFact, type KindredNotice } from "../lib/kindred-read";
import { t, useLang } from "../lib/i18n";
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
  road = [],
  mySeed = "me",
  myFace = null,
  notice = null,
  since = new Date().toISOString(),
  stamp = null,
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
  /** the letters that bought this, oldest first — five each way */
  road?: ThreadMessage[];
  mySeed?: string;
  myFace?: string | null;
  /** what Wren noticed about the two of you — counted from their letters */
  notice?: KindredNotice | null;
  /** the day the names met */
  since?: string;
  /** the stamp the correspondence opened under */
  stamp?: string | null;
  onClose: () => void;
  /** the exit isn't "dismiss" — it's the door into the room */
  onTalk: () => void;
}) {
  useLang(); // repaint when the reader changes language
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12, ...rule }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>
            {t("intro.carriedBy", { name: wren.toUpperCase() })}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 30, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <WrenBird size={44} mood="content" stage="wren" />

          <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 18 }}>
            {t("intro.body")}
          </Text>

          {/* THE RITUAL — four beats: the ten letters stamped in order, the
              mosaic flying into a postmark, the name typed into it by •>,
              and both faces resolving side by side. */}
          <View style={{ marginTop: 22, marginBottom: 4 }}>
            <IntroductionRitual road={road} otherSeed={otherSeed} otherFace={otherFace} otherName={otherName} mySeed={mySeed} myFace={myFace} myName={myName} since={since} stamp={stamp} notice={notice} />
          </View>

          {/* what she noticed — a label you both wear, or their strongest;
              and when five letters were too few for any label, what the
              road itself says. Counted, never generated. */}
          {(() => {
            const fact = notice ? null : roadFact(road);
            if (!notice && !fact) return null;
            const line = notice
              ? notice.shared
                ? t("in.both", { label: stickerName(notice.stickerId), n: notice.supporting, m: notice.eligible })
                : t("in.theirs", { name: otherName, label: stickerName(notice.stickerId), n: notice.supporting, m: notice.eligible })
              : fact!.nightTheirs > 0
                ? t("in.roadNight", { n: fact!.letters, d: fact!.days, k: fact!.nightTheirs })
                : t("in.roadWait", { n: fact!.letters, d: fact!.days, g: fact!.longestWaitDays });
            return (
              <Animated.View entering={FadeIn.duration(500).delay(T_RITUAL_DONE)} style={{ marginTop: 10, alignItems: "center", paddingHorizontal: 8 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.pen }}>{t("in.noticed", { wren: wren.toUpperCase() })}</Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 20, color: P.ink60, marginTop: 6, textAlign: "center" }}>{line}</Text>
              </Animated.View>
            );
          })()}

          <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 26 }}>
            {t("in.knowYou", { name: myName })}
          </Text>
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <Pressable onPress={onTalk} style={({ pressed }) => ({ ...solidBtn, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>
{t("in.talkTo", { name: otherName.toUpperCase() })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
