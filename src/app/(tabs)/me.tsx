import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { C, F, cardStyle, shadow } from "../../theme/tokens";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { VoiceCard } from "../../components/VoiceCard";
import { WrenHome } from "../../components/WrenHome";
import type { WrenAccessory } from "../../components/WrenBird";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, getWrenAccessory, setWrenAccessory, stageIndex, wrenStage } from "../../lib/wren-style";
import { getWrenType, type WrenType } from "../../lib/wren-type";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { fingerprint } from "../../lib/signature";
import { analyzeVoice, gatherWriting, type VoiceRead } from "../../lib/voice";
import { portrait } from "../../lib/wren";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { DEMO_JOURNAL } from "../../data/demo";

/* Me — a mirror, not a profile: who you are here (pen name + day), how you
   sound (Your Voice — the hero), what you've kept (stats), and who's growing
   beside you (Wren). Settings behind the gear. */

export default function MeTab() {
  const auth = useAuth();
  const { user, handle, profile } = auth;
  const { premium } = useEntitlement();
  const router = useRouter();
  const name = handle || "You";

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [voice, setVoice] = useState<VoiceRead | null>(null);
  const [units, setUnits] = useState<number[]>([]);
  const [wrenLine, setWrenLine] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [accessory, setAccessory] = useState<WrenAccessory>("none");
  const [stageFloor, setStageFloor] = useState<WrenStage>("egg");
  const [wrenType, setWrenType] = useState<WrenType | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()]).then(([s, floor]) => {
        if (!alive) return;
        setStats(s);
        const live = wrenStage(s);
        // stage only ever moves forward; remember the highest ever reached
        setStageFloor(stageIndex(live) >= stageIndex(floor) ? live : floor);
        if (stageIndex(live) > stageIndex(floor)) void bumpStageFloor(live);
      });
      getAvatarPhoto().then((p) => alive && setPhoto(p));
      getWrenAccessory().then((a) => alive && setAccessory(a));
      getWrenType().then((t) => alive && setWrenType(t));

      // Your Voice — read every piece of real writing on this device
      (async () => {
        let texts = await gatherWriting((profile?.firstLine as string) || null);
        // dev preview: borrow the sample pages so the card has a shape
        if (__DEV__ && texts.length === 0) texts = DEMO_JOURNAL.map((e) => e.body).filter((b) => b.trim().length >= 3);
        if (!alive) return;
        setVoice(analyzeVoice(texts));
        setUnits(fingerprint(texts.join(" ")).units.slice(0, 24));
        if (texts.length) {
          const l = await portrait(texts.join("\n\n").slice(0, 2000), "en");
          if (alive && l) setWrenLine(l);
        }
      })();

      return () => {
        alive = false;
      };
    }, [user?.created_at, profile?.firstLine]),
  );

  const equipWren = (a: WrenAccessory) => {
    setAccessory(a);
    void setWrenAccessory(a);
  };

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

  const StatCard = ({ n, label, sub, on }: { n: number; label: string; sub: string; on?: boolean }) => (
    <View
      style={[
        cardStyle,
        { flex: 1, alignItems: "center", paddingVertical: 18, backgroundColor: on ? C.purpleLt : C.card, borderWidth: on ? 1.5 : 0, borderColor: C.purple },
      ]}
    >
      <Text style={{ fontFamily: F.serif, fontSize: 28, color: C.ink }}>{n}</Text>
      <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1.2, color: on ? C.purple : C.faint, marginTop: 5 }}>{label}</Text>
      <Text style={{ fontFamily: F.sans, fontSize: 9.5, color: C.faint, marginTop: 3 }}>{sub}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* header — avatar left, name + day/kindreds, gear right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setEditing(true)} hitSlop={6}>
            <View style={[{ borderRadius: 34, backgroundColor: C.card, padding: 4 }, shadow.card]}>
              <AvatarImage id={avatarId} photoUri={photo} seed={seed} size={60} round />
            </View>
          </Pressable>
          <Pressable onPress={() => setEditing(true)} style={{ flex: 1 }} hitSlop={6}>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 30, color: C.ink }}>{name}</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.2, color: C.muted, marginTop: 3 }}>
              DAY {stats.day} · {stats.kindreds} {stats.kindreds === 1 ? "KINDRED" : "KINDREDS"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={8}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: "center", justifyContent: "center", ...shadow.card }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                fill="none"
                stroke={C.muted}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Your Voice — the hero */}
        {voice && (
          <View style={{ marginTop: 18 }}>
            <VoiceCard
              read={voice}
              quote={wrenLine || voice.quote}
              units={units}
              lettersSent={stats.lettersSent}
              onOpen={() => router.push("/voice")}
            />
          </View>
        )}

        {/* stat cards */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <StatCard n={stats.lettersSent} label="LETTERS" sub="Sent so far" />
          <StatCard n={stats.journalN} label="SEALED" sub="Saved moments" on />
          <StatCard n={stats.kindreds} label="KINDREDS" sub="Names revealed" />
        </View>

        {/* Wren — companion card */}
        <View style={{ marginTop: 16 }}>
          <WrenHome
            stats={stats}
            accessory={accessory}
            premium={premium}
            stageFloor={stageFloor}
            typeName={wrenType?.name}
            bornWith={wrenType?.accessory}
            onEquip={equipWren}
            onLocked={() => router.push("/paywall")}
          />
        </View>

        {/* Kindredly+ */}
        <Pressable
          onPress={() => router.push("/paywall")}
          style={({ pressed }) => [
            cardStyle,
            { marginTop: 16, padding: 18, backgroundColor: premium ? "#FBE7EE" : C.goldLt, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={{ fontSize: 22 }}>👑</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 15.5, color: C.ink }}>
              {premium ? "Kindredly+ · active" : "Kindredly+"}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {premium ? "Manage your subscription" : "Unlimited letters & a closer read from Wren"}
            </Text>
          </View>
          <Text style={{ fontSize: 16, color: C.faint }}>›</Text>
        </Pressable>
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
