import { useWrenName } from "../../lib/wren-name";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, skinUnlocked, stageIndex, wrenStage } from "../../lib/wren-style";
import { useWrenSkinControl } from "../../lib/wren-skin";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { myAura, recordAuraSnapshot, type Aura } from "../../lib/aura";
import { fetchThreads, type ThreadSummary } from "../../lib/db";
import { WHEREABOUTS_META, recordStageDate, whereabouts } from "../../lib/whereabouts";
import { AuraCard, W14 } from "../../components/AuraCard";
import { WrenBird } from "../../components/WrenBird";
import { CofounderMark } from "../../components/CofounderMark";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { DEMO_JOURNAL } from "../../data/demo";
import { FirstClassStub } from "../../components/FirstClassStub";

/* Me — a mirror, not a profile: who you are here (pen name + day), how you
   sound (the aura — the hero), and who's growing beside you (Wren).

   The SHELL speaks the postal system: paper, the same header rule as Today and
   Sealed, mono for everything the system files about you, your pen name in
   your own register. WrenHome is deliberately untouched — the
   owner ruled those two stay as designed, and this pass was only ever about
   the frame around them. */

function Gear() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Path
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        fill="none"
        stroke={P.ink}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function MeTab() {
  useLang();
  const auth = useAuth();
  const { user, handle, profile } = auth;
  const { premium, settled, cofounderNo } = useEntitlement();
  const { skin, pick } = useWrenSkinControl();
  const router = useRouter();
  const name = handle || "You";

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [statsIn, setStatsIn] = useState(false);
  const [aura, setAura] = useState<Aura | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [stageFloor, setStageFloor] = useState<WrenStage>("egg");
  const wren = useWrenName();

  /* THE WARDROBE IS ON THE DEVICE; WHAT UNLOCKS IT IS ON THE ACCOUNT. The
     gate was only ever checked at the moment of picking, so a look outlived
     the thing that earned it: sign out, sign in as someone new, and the
     previous reader's Plush is still on a chick who has never had a kindred.
     The same hole let a lapsed subscriber keep Ink forever. Check it where
     it's worn, not only where it's chosen — and only once both answers are
     actually in, or a mid-load `false` undresses a paying reader. */
  useEffect(() => {
    if (!statsIn || !settled) return;
    if (!skinUnlocked(skin, stats, premium)) pick("sticker");
  }, [statsIn, settled, skin, stats, premium, pick]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()]).then(([s, floor]) => {
        if (!alive) return;
        setStats(s);
        setStatsIn(true);
        const live = wrenStage(s);
        // stage only ever moves forward; remember the highest ever reached,
        // and the DAY it turned — the journey strip prints it
        setStageFloor(stageIndex(live) >= stageIndex(floor) ? live : floor);
        if (stageIndex(live) > stageIndex(floor)) {
          void bumpStageFloor(live);
          void recordStageDate(live);
        }
      });
      fetchThreads().then((t) => alive && setThreads(t || []));
      getAvatarPhoto().then((p) => alive && setPhoto(p));

      // Your aura — one engine (hatch), every piece of your real writing:
      // the hatch line, the sealed pages, and now your letters too
      (async () => {
        const a = await myAura((profile?.firstLine as string) || null);
        if (!alive) return;
        setAura(a);
        void recordAuraSnapshot(a);
      })();

      return () => {
        alive = false;
      };
    }, [user?.created_at, profile?.firstLine]),
  );

  /* her status rides the switch itself — you see she moved before you
     even open her room */
  const where = whereabouts(threads, statsIn ? stats.lettersSent : null);

  const avatarId = (profile?.avatarId as string) || null;
  const seed = user?.id || "you";

  const saveProfileEdits = async (newName: string, newAvatarId: string | null, newPhotoUri: string | null) => {
    setEditing(false);
    if (newPhotoUri) {
      if (newPhotoUri !== photo) {
        const persisted = await setAvatarPhoto(newPhotoUri);
        setPhoto(persisted);
      }
    } else {
      await clearAvatarPhoto();
      setPhoto(null);
    }
    await auth.saveProfile({ handle: newName, avatarId: newAvatarId });
  };

  const stageKey = `me.stage.${stageFloor}`;

  return (
    /* W14 · Me tab final: name, the courier's card, the writing aura, the
       fare. White cards on the lavender ground; tapping the courier opens
       her room in place. */
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 2.6, color: W14.ink }}>{t("me.header")}</Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <Gear />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* who you are here */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setEditing(true)} hitSlop={6}>
            <AvatarImage id={avatarId} photoUri={photo} seed={seed} size={52} />
          </Pressable>
          <Pressable onPress={() => setEditing(true)} style={{ flex: 1 }} hitSlop={6}>
            <Text style={{ fontFamily: PF.letter, fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: W14.ink }}>{name}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.2, color: "rgba(30,27,53,0.5)", marginTop: 6 }}>
              {stats.kindreds === 1
                ? t("me.statsOne", { day: stats.day, letters: stats.lettersSent, sealed: stats.journalN })
                : t("me.statsMany", { day: stats.day, letters: stats.lettersSent, sealed: stats.journalN, kindreds: stats.kindreds })}
            </Text>
            {cofounderNo != null && (
              <View style={{ marginTop: 8 }}>
                <CofounderMark no={cofounderNo} />
              </View>
            )}
          </Pressable>
        </View>

        {/* the courier's card — tap to open her room */}
        <Pressable
          onPress={() => router.push("/courier")}
          style={({ pressed }) => ({ marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 16, flexDirection: "row", alignItems: "stretch", overflow: "hidden", shadowColor: "#1E1B35", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, opacity: pressed ? 0.92 : 1 })}
        >
          <View style={{ width: 104, backgroundColor: where.state === "unsent" ? "#FFF3DC" : "#E4E1FA", overflow: "hidden" }}>
            {/* the route: two posts and a dashed line, the courier above it */}
            <View style={{ position: "absolute", left: 10, right: 10, top: 50, borderTopWidth: 2, borderStyle: "dashed", borderColor: "rgba(91,85,255,0.35)" }} />
            <View style={{ position: "absolute", left: 8, top: 44, width: 12, height: 12, borderRadius: 3, backgroundColor: P.pen }} />
            <View style={{ position: "absolute", right: 8, top: 42, width: 14, height: 16, borderWidth: 2, borderColor: P.pen, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
            <View style={{ position: "absolute", left: 30, top: 8, transform: [{ rotate: where.state === "unsent" ? "0deg" : "-12deg" }] }}>
              <WrenBird size={46} mood={WHEREABOUTS_META[where.state].mood} />
            </View>
            {where.state !== "unsent" && where.state !== "home" && (
              <View style={{ position: "absolute", left: 66, top: 46, width: 16, height: 11, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#DAD6EE", transform: [{ rotate: "-12deg" }] }}>
                <View style={{ height: 3, backgroundColor: P.post }} />
              </View>
            )}
            <Text style={{ position: "absolute", left: 0, right: 0, bottom: 6, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: "rgba(30,27,53,0.45)" }}>
              {t("me.dayN", { n: stats.day })}
            </Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, justifyContent: "center", gap: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 15, color: W14.ink }}>{wren}</Text>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: where.state === "unsent" ? "#FFF3DC" : P.penWash }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: where.state === "unsent" ? W14.goldInk : P.pen }}>{t(stageKey)}</Text>
              </View>
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 13, color: W14.ink }}>{where.line}</Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 11, color: "rgba(30,27,53,0.5)" }} numberOfLines={1}>{where.bubble}</Text>
          </View>
          <View style={{ width: 34, alignItems: "center", justifyContent: "center", paddingRight: 6 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 18, color: "rgba(30,27,53,0.35)" }}>›</Text>
          </View>
        </Pressable>

        <View style={{ marginTop: 12 }}>
          {aura && (
            <AuraCard
              aura={aura}
              seed={seed}
              avatarId={avatarId}
              onOpen={() => router.push("/aura")}
              onShare={() => router.push("/aura-card")}
              onWrite={() => router.push("/compose")}
            />
          )}
        </View>

        <FirstClassStub
          premium={premium}
          cofounderNo={cofounderNo}
          onPress={() => router.push("/paywall?src=me_row")}
        />
      </ScrollView>

      <EditProfileSheet
        visible={editing}
        initialName={handle}
        initialAvatarId={avatarId}
        initialPhotoUri={photo}
        seed={seed}
        onSave={saveProfileEdits}
        onClose={() => setEditing(false)}
      />
      <PlushCelebration kindreds={stats.kindreds} />
    </SafeAreaView>
  );
}
