import { useWrenName } from "../../lib/wren-name";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, InteractionManager, Pressable, ScrollView, Text, View } from "react-native";
import { markWork } from "../../lib/stall-probe";
import { storeAura, storeMode } from "../../lib/dev-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../../lib/i18n";
import { P, PF, rule } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, skinUnlocked, stageIndex, wrenStage } from "../../lib/wren-style";
import { useWrenSkinControl } from "../../lib/wren-skin";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { myAura, readAuraCache, recordAuraSnapshot, type Aura } from "../../lib/aura";
import { fetchThreads, readThreadsCache, threadsAge, type ThreadSummary } from "../../lib/db";
import { recordStageDate, whereabouts } from "../../lib/whereabouts";
import { AuraCard, W14, cardShadow } from "../../components/AuraCard";
import { Envelope, Kindreds } from "../../components/PostTabBar";
import { dShort } from "../../lib/format";
import { CofounderMark } from "../../components/CofounderMark";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { DEMO_JOURNAL } from "../../data/demo";
import { FirstClassStub } from "../../components/FirstClassStub";
import { CourierCard } from "../../components/CourierCard";
import { getCounters, seenToday } from "../../lib/usage-counters";

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

/* the two count cells: the number bold, the label in the plate's mono */
const KIN_GREEN = "#2E7D4F";
const countNum = { fontFamily: PF.letter, fontWeight: "700" as const, fontSize: 18, letterSpacing: -0.3, color: W14.ink };
const countLabel = { fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: "rgba(30,27,53,0.55)" };

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
  const [seenTodayN, setSeenTodayN] = useState(0);
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

  /* THE PAGE PAINTS BEFORE IT READS. Everything below used to start the
     instant the tab was chosen — two network reads and the whole aura (every
     sticker over every piece of writing, then the hatch) on the JS thread,
     which is the thread that also has to draw the page. On a phone with a
     year of letters that was a visible pause on a blank wash, and a second
     visit did it all again. Now the work waits for the tab's own transition
     to finish, and a visit within half a minute of the last one changes
     nothing — the page is what it was. */
  const lastRead = useRef(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (Date.now() - lastRead.current < 30_000) return;
      const read = () => {
        markWork("me:stats");
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
        readThreadsCache().then((c) => alive && c && setThreads(c)); // the last list, at once
        if (threadsAge() > 15) fetchThreads().then((t) => alive && t && setThreads(t));
        getCounters().then((c) => alive && setSeenTodayN(seenToday(c)));
        getAvatarPhoto().then((p) => alive && setPhoto(p));

        // Your aura — one engine (hatch), every piece of your real writing:
        // the hatch line, the sealed pages, and now your letters too
        (async () => {
          if (__DEV__ && storeMode) {
            setAura(storeAura());
            return;
          }
          // the last read first, so the card is there when the tab is; the
          // fresh read replaces it when the letters come back
          const cached = await readAuraCache();
          if (alive && cached) setAura((cur) => cur ?? cached);
          /* the fresh read is the heaviest thing this tab does (the hatch
             over every page and letter): let the page paint and the
             transition end first, then run it */
          await new Promise<void>((r) => InteractionManager.runAfterInteractions(() => setTimeout(r, 250)));
          if (!alive) return;
          markWork("me:aura");
          const a = await myAura((profile?.firstLine as string) || null);
          if (!alive) return;
          setAura(a);
          void recordAuraSnapshot(a);
        })();
      };
      /* a plain timer, not InteractionManager: the courier card's ambient
         loops kept the interaction queue busy and the read waited on a gap
         that rarely came. The tab's own transition is ~300ms. */
      const timer = setTimeout(() => {
        if (!alive) return;
        lastRead.current = Date.now();
        read();
      }, 320);

      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, [user?.created_at, profile?.firstLine]),
  );

  /* her status rides the switch itself — you see she moved before you
     even open her room */
  const where = whereabouts(threads, statsIn ? stats.lettersSent : null);
  /* the plate's LETTERS is what the My letters page lists: letters you sent
     into the pool. Replies live in Kindreds; the aura card says "letters &
     replies" for what it read. GrowthStats keeps counting replies alone (the
     stamps and the courier's route rest on it). */
  const lettersWritten = aura ? aura.sources.letters : 0;

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
    /* W14 · Me tab final: name, the courier's card, the writing aura, the
       fare. White cards on the lavender ground; tapping the courier opens
       her room in place. */
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      {/* the same plate Today, Sealed and Kindreds carry — one rule, one system */}
      <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 9, marginHorizontal: 16 }, rule]}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>{t("me.header")}</Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={{ width: 26, height: 26, alignItems: "center", justifyContent: "center" }}>
          <Gear />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* who you are here — the owner's plate: one white card, the pencil
            edits, and the two counts are cells you can press */}
        <View style={[{ backgroundColor: W14.card, borderRadius: 18, overflow: "hidden" }, cardShadow, { shadowOpacity: 0.05 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ width: 60, height: 60 }}>
              <AvatarImage id={avatarId} photoUri={photo} seed={seed} size={56} />
              <Pressable
                onPress={() => setEditing(true)}
                hitSlop={8}
                accessibilityLabel={t("me.edit")}
                style={({ pressed }) => ({ position: "absolute", right: -4, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCD9F0", alignItems: "center", justifyContent: "center", shadowColor: "#1E1B35", shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, opacity: pressed ? 0.7 : 1 })}
              >
                <Svg width={12} height={12} viewBox="0 0 24 24">
                  <Path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z M13.5 7.5l3 3" fill="none" stroke={KIN_GREEN} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: W14.ink }}>{name}</Text>
              {!!user?.created_at && (
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.2, color: "rgba(30,27,53,0.5)", marginTop: 5 }}>
                  {t("me.joined", { date: dShort(user.created_at).toUpperCase() })}
                </Text>
              )}
              {cofounderNo != null && (
                <View style={{ marginTop: 8 }}>
                  <CofounderMark no={cofounderNo} />
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: W14.hair }}>
            <Pressable onPress={() => router.push("/my-letters")} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRightWidth: 1, borderRightColor: W14.hair, backgroundColor: pressed ? "#F6F5FD" : "transparent" })}>
              <Envelope color={P.pen} />
              <Text style={countNum}>{lettersWritten}</Text>
              <Text style={countLabel}>{t("me.lettersLabel")}</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/my-kindreds")} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, backgroundColor: pressed ? "#F6F5FD" : "transparent" })}>
              <Kindreds color={KIN_GREEN} />
              <Text style={countNum}>{stats.kindreds}</Text>
              <Text style={countLabel}>{stats.kindreds === 1 ? t("me.kindredLabelOne") : t("me.kindredLabel")}</Text>
            </Pressable>
          </View>
        </View>

        {/* the courier's card — the delivery as a scene; tap to open her room */}
        <View style={{ marginTop: 14 }}>
          <CourierCard
            wren={wren}
            where={where}
            threads={threads}
            lastWrittenAt={aura?.lastWrittenAt ?? null}
            seenToday={seenTodayN}
            stage={stageFloor}
            onPress={() => router.push("/courier")}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          {/* before the first read ever lands (no cache yet): the card's
              own silhouette, so the page does not grow under the thumb */}
          {!aura && (
            <View style={[{ backgroundColor: "#FFFFFF", borderRadius: 22, overflow: "hidden", height: 372 }, cardShadow, { shadowOpacity: 0.12 }]}>
              <View style={{ height: Math.round((Dimensions.get("window").width - 32) * 0.32), backgroundColor: "#F6F5FD" }} />
            </View>
          )}
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
