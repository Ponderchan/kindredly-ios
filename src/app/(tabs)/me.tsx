import { useWrenName } from "../../lib/wren-name";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { C, F, cardStyle, shadow } from "../../theme/tokens";
import { P, PF, rule } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenHome } from "../../components/WrenHome";
import type { WrenAccessory } from "../../components/WrenBird";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, getWrenAccessory, setWrenAccessory, stageIndex, wrenStage } from "../../lib/wren-style";
import { getWrenType, type WrenType } from "../../lib/wren-type";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { myAura, recordAuraSnapshot, type Aura } from "../../lib/aura";
import { VoiceCard } from "../../components/VoiceCard";
import { analyzeVoice, type VoiceRead } from "../../lib/voice";
import { fingerprint } from "../../lib/signature";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { DEMO_JOURNAL } from "../../data/demo";

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
  const auth = useAuth();
  const { user, handle, profile } = auth;
  const { premium } = useEntitlement();
  const router = useRouter();
  const name = handle || "You";

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [room, setRoom] = useState<"you" | "wren">("you");
  const [aura, setAura] = useState<Aura | null>(null);
  const [voice, setVoice] = useState<VoiceRead | null>(null);
  const [units, setUnits] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [accessory, setAccessory] = useState<WrenAccessory>("none");
  const [stageFloor, setStageFloor] = useState<WrenStage>("egg");
  const [wrenType, setWrenType] = useState<WrenType | null>(null);
  const wren = useWrenName();

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

      // Your aura — one engine (hatch), every piece of your real writing:
      // the hatch line, the sealed pages, and now your letters too
      (async () => {
        const a = await myAura((profile?.firstLine as string) || null);
        if (!alive) return;
        setAura(a);
        /* THE OWNER'S CARD, THE NEW RULES. The original VoiceCard is the
           design the owner ruled stays — the orb, the constellation, the
           trait pills. It renders voice.ts's warm copy over the merged
           corpus (letters finally included), while the LADDER decides what
           it may claim: tier and the name slot come from lib/aura, and the
           archetype only lands at FORMED. */
        const v = analyzeVoice(a.texts);
        setVoice({
          ...v,
          tier: a.phase === "empty" ? "empty" : a.phase === "formed" ? "formed" : "evolving",
        });
        setUnits(fingerprint(a.texts.join(" ")).units.slice(0, 24));
        void recordAuraSnapshot(a);
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

  return (
    /* Readings, counts and growth — the system talking about you rather than
       anything you wrote — so this is desk, not paper. */
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      {/* the same plate Today and Sealed carry */}
      <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 9, marginHorizontal: 16 }, rule]}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>ME</Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={{ width: 26, height: 26, alignItems: "center", justifyContent: "center" }}>
          <Gear />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* who you are here — your name in your own register, the numbers filed
            in the machine's */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setEditing(true)} hitSlop={6}>
            <AvatarImage id={avatarId} photoUri={photo} seed={seed} size={58} />
          </Pressable>
          <Pressable onPress={() => setEditing(true)} style={{ flex: 1 }} hitSlop={6}>
            <Text style={{ fontFamily: PF.letter, fontSize: 27, fontWeight: "600", color: P.ink }}>{name}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 5 }}>
              DAY {stats.day} · {stats.lettersSent} LETTERS · {stats.journalN} SEALED · {stats.kindreds}{" "}
              {stats.kindreds === 1 ? "KINDRED" : "KINDREDS"}
            </Text>
          </Pressable>
        </View>

        {/* two rooms: You (your voice) · Wren (your companion) */}
        <View style={{ flexDirection: "row", marginTop: 20, borderWidth: 1, borderColor: P.ink }}>
          {(
            [
              ["you", "You"],
              ["wren", wren],
            ] as const
          ).map(([id, label]) => {
            const on = room === id;
            return (
              <Pressable
                key={id}
                onPress={() => setRoom(id)}
                style={{ flex: 1, alignItems: "center", paddingVertical: 11, backgroundColor: on ? P.ink : "transparent" }}
              >
                <Text style={{ fontFamily: PF.monoMed, fontSize: 12.5, letterSpacing: 1.4, color: on ? P.paper : P.ink60 }}>
                  {label.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {room === "you" ? (
          <>
            {/* the aura — the owner's hero card, gated by the ladder */}
            {aura && voice && (
              <View style={{ marginTop: 14 }}>
                <VoiceCard
                  read={voice}
                  quote={voice.discovery}
                  units={units}
                  auraName={
                    aura.phase === "formed"
                      ? aura.archetype?.name || voice.stage.name
                      : aura.phase === "forming"
                        ? "Still forming"
                        : aura.phase === "shaping"
                          ? "Taking shape"
                          : "Coming clear"
                  }
                  lettersSent={stats.lettersSent}
                  onOpen={() => router.push("/aura")}
                  onShare={() => router.push("/aura-card")}
                  shareReady={aura.phase === "formed"}
                />
              </View>
            )}

            {/* one quiet row — Kindredly+ */}
            <Pressable onPress={() => router.push("/paywall")} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: P.ink, paddingHorizontal: 15, paddingVertical: 14 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1, color: P.ink }}>KINDREDLY+</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>
                {premium ? "ACTIVE" : "UNLIMITED"} →
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ marginTop: 14 }}>
              <WrenHome
                stats={stats}
                pieces={aura?.pieces ?? 0}
                accessory={accessory}
                premium={premium}
                stageFloor={stageFloor}
                typeName={wrenType?.name}
                bornWith={wrenType?.accessory}
                onEquip={equipWren}
                onLocked={() => router.push("/paywall")}
              />
            </View>
            <Pressable onPress={() => router.push("/paywall")} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: P.ink, paddingHorizontal: 15, paddingVertical: 14 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1, color: P.ink }}>KINDREDLY+</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>
                {premium ? "ACTIVE" : "UNLIMITED"} →
              </Text>
            </Pressable>
          </>
        )}
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
